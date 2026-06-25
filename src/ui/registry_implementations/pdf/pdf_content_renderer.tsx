import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ContentRendererType, ContentRendererProps } from '../../renderer_registry/content_renderer_registry';
import { slotRendererRegistry } from '../../renderer_registry/pdf/slot_renderer_registry';
import { getMarkDomainType } from '../../../atma/capabilities_registry/pdf/mark_domain_registry';
import { getMarkRendererType } from '../../renderer_registry/pdf/vertical_pane/mark_renderer_registry';
import { getToolRendererType as getToolType, getToolRendererByHotkey as getToolByHotkey } from '../../renderer_registry/pdf/vertical_pane/tool_renderer_registry';
import { convertFileSrc, confirmDialog, joinPath } from '../../../atma/platform_adapter/switch';
import { inputAPI } from '../../../atma/singletons';
import { toRoman } from '../../helper';
import { WhiteboardRepository } from '../../../atma/storage/repositories/WhiteboardRepository';
import { ContentRepository } from '../../../atma/storage/repositories/ContentRepository';
import { useShortcutToolState } from '../../window/useShortcutToolState';
import { DEFAULT_SECTION_WIDTH, SECTION_BASE_WIDTH, SECTION_WIDTH_STEP } from '../../../shared_doman_models_and_dtos/mark_domain_model';

// Re-use mark color palette from WorkWindow
const MARK_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

const markColor = (id: string) => MARK_COLORS[parseInt(id.replace('reg_', '').replace('mark_', ''), 10) % MARK_COLORS.length];

function updateSectionWidths(marks: any[]) {
  const normalizedMarks = Array.isArray(marks) ? marks : [];
  const sections = normalizedMarks.filter((mark) => mark.type === 'section');
  if (sections.length === 0) return normalizedMarks;

  const sortedSections = [...sections].sort((a, b) => (
    b.h - a.h || a.y - b.y || a.id.localeCompare(b.id)
  ));
  const resolvedWidths = new Map();

  for (const section of sortedSections) {
    let parentWidth = SECTION_BASE_WIDTH;

    for (const candidate of sortedSections) {
      if (candidate.id === section.id) continue;
      const enclosesSection =
        candidate.y <= section.y + 1 &&
        (candidate.y + candidate.h) >= (section.y + section.h) - 1;

      if (!enclosesSection) continue;

      const candidateWidth = resolvedWidths.get(candidate.id)
        ?? candidate.resolvedWidth
        ?? candidate.w
        ?? DEFAULT_SECTION_WIDTH;

      if (candidateWidth > parentWidth) {
        parentWidth = candidateWidth;
      }
    }

    resolvedWidths.set(section.id, parentWidth + SECTION_WIDTH_STEP);
  }

  let changed = false;
  const nextMarks = normalizedMarks.map((mark) => {
    if (mark.type !== 'section') return mark;
    const nextWidth = resolvedWidths.get(mark.id) ?? DEFAULT_SECTION_WIDTH;
    if (mark.w === nextWidth && !('resolvedWidth' in mark)) return mark;
    changed = true;
    const { resolvedWidth: _legacyResolvedWidth, ...rest } = mark;
    return { ...rest, w: nextWidth };
  });

  return changed ? nextMarks : normalizedMarks;
}

function LazyPage({ pageNumber, width, scale }: { pageNumber: number, width: number, scale: number }) {
  const [isVisible, setIsVisible] = useState(pageNumber <= 2);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { rootMargin: '800px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const placeholderHeight = width * scale * 1.414;

  return (
    <div ref={ref} style={{ minHeight: placeholderHeight, position: 'relative', borderBottom: '2px solid rgba(0, 0, 0, 0.92)' }}>
      {isVisible && (
        <Page pageNumber={pageNumber} width={width} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
      )}
    </div>
  );
}

function PDFContentComponent({ 
  slotId,
  contentId: pdfPath, 
  settings,
  uiState,
  uiController,
  onHome,
}: ContentRendererProps) {
  const PDF_WIDTH = 800;

  const slotState = uiState?.slots[slotId];

  // High Frequency / Visual-only layout states (local to PDF renderer)
  const [currentSelection, setCurrentSelection]  = useState<any>(null);
  const [movingMark, setMovingMark] = useState<any>(null);
  const dragStateRef = useRef({ currentSelection, movingMark });
  const pendingToolActivationReasonRef = useRef('normal');

  useEffect(() => {
    dragStateRef.current = { currentSelection, movingMark };
  }, [currentSelection, movingMark]);

  // Derived marks from store (with section width formatting)
  const marksArr = useMemo(() => {
    const rawMap = slotState?.marks;
    if (!rawMap) return [];
    return Array.isArray(rawMap) ? rawMap : Array.from(rawMap.values());
  }, [slotState?.marks]);
  const marks = useMemo(() => updateSectionWidths(marksArr), [marksArr]);

  // Local actions coordinating with InputAPI / DB layer
  const setMarksWithSectionWidths = useCallback((updater: any) => {
    const prevMarksMap = slotState?.marks;
    const prevMarksArray = prevMarksMap ? (Array.isArray(prevMarksMap) ? prevMarksMap : Array.from(prevMarksMap.values())) : [];
    const nextMarks = typeof updater === 'function' ? updater(prevMarksArray) : updater;
    if (nextMarks == null || nextMarks === prevMarksArray) return;

    const prevMap = new Map(prevMarksArray.map(m => [m.id, m]));
    const nextMap = new Map(nextMarks.map(m => [m.id, m]));

    // 1. Detect deletions
    for (const m of prevMarksArray) {
      if (!nextMap.has(m.id)) {
        inputAPI.deleteMark(slotId, m.id);
      }
    }

    // 2. Detect additions & updates
    const uniqueNextMarks = Array.from(
      new Map(nextMarks.map(u => [u.id, u])).values()
    );

    for (const m of uniqueNextMarks) {
      const prev = prevMap.get(m.id);
      if (!prev) {
        inputAPI.addMark(slotId, m);
      } else if (JSON.stringify(prev) !== JSON.stringify(m)) {
        inputAPI.updateMark(slotId, m);
      }
    }
  }, [slotState?.marks, slotId]);

  // Shortcut tool state adapter
  const { manager: shortcutManager, state: shortcutState, refreshAvailableWhiteboards } = useShortcutToolState({
    settings,
    restoredSession: null,
    externalActions: { 
      setTool: (tool) => uiController.setSlotState(slotId, 'tool', tool), 
      setSelectedMarkId: (markId) => uiController.setSlotState(slotId, 'selectedMarkId', markId) 
    },
  });

  const selectMark = useCallback((markId: string | null) => {
    shortcutManager.clearUi();
    uiController.setSlotState(slotId, 'selectedMarkId', markId);
  }, [uiController, slotId, shortcutManager]);

  // Effect to handle tool activation
  useEffect(() => {
    if (!slotState || !slotState.tool) return;
    const activationReason = pendingToolActivationReasonRef.current;
    pendingToolActivationReasonRef.current = 'normal';
    if (activationReason === 'border-edit') return;

    getToolType(slotState.tool).onActivate?.({
      state: {
        currentSelection,
        editingShapeId: slotState.editingShapeId,
        editingSectionId: slotState.editingSectionId,
        sectionTarget: slotState.sectionTarget,
        tool: slotState.tool,
      },
      actions: {
        setCurrentSelection,
        setSectionTarget: (target) => uiController.setSlotState(slotId, 'sectionTarget', target),
        setEditingSectionId: (id) => uiController.setSlotState(slotId, 'editingSectionId', id),
        setEditingShapeId: (shapeId) => uiController.setSlotState(slotId, 'editingShapeId', shapeId),
        setShapeBackup: (backup) => uiController.setSlotState(slotId, 'shapeBackup', backup),
      },
    });
  }, [slotState?.tool]);

  const currentSideId = uiState?.slots?.['side']?.contentId || '';
  const resolvedSideId = slotState?.selectedMarkId || shortcutManager.getLinkedWhiteboardId() || '';

  // Synchronize active whiteboard id to the side slot state
  useEffect(() => {
    if (currentSideId !== resolvedSideId) {
      if (resolvedSideId) {
        uiController.setSlotStates('side', { contentId: resolvedSideId, contentType: 'whiteboard' });
      } else {
        uiController.setSlotStates('side', { contentId: '', contentType: 'whiteboard' });
      }
    }
  }, [resolvedSideId, currentSideId, uiController]);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const pdfScrollRef = useRef<HTMLDivElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const documentFile = useMemo(() => pdfData ? { data: pdfData } : null, [pdfData]);

  const mousePosRef = useRef({ x: 0, y: 0 });
  const scrollAnimRef = useRef<number | null>(null);
  const zoomTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    setPdfData(null);
    if (!pdfPath) return;
    
    fetch(convertFileSrc(pdfPath))
      .then(res => res.arrayBuffer())
      .then(buffer => { if (active) setPdfData(new Uint8Array(buffer)); })
      .catch(err => console.error("Failed to load PDF to memory:", err));
    return () => { active = false; };
  }, [pdfPath]);

  // Handle zooming / panning
  useEffect(() => {
    const pdfWrapper = pdfScrollRef.current;
    if (!pdfWrapper) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (!zoomTimeoutRef.current) {
          zoomTimeoutRef.current = setTimeout(() => {
            zoomTimeoutRef.current = null;
          }, 250);
          if (e.deltaY > 0) {
            uiController.setZoom(Math.max(0.5, (slotState?.zoom || 1) - 0.25), slotId);
          } else {
            uiController.setZoom(Math.min(3.0, (slotState?.zoom || 1) + 0.25), slotId);
          }
        }
      } else if (e.shiftKey) {
        if (e.deltaY !== 0 && e.deltaX === 0) {
          e.preventDefault();
          pdfWrapper.scrollLeft += e.deltaY;
        }
      }
    };

    pdfWrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      pdfWrapper.removeEventListener('wheel', handleWheel);
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    };
  }, [slotState?.zoom, uiController, slotId]);

  // Scroll Restoration
  const scrollRestored = useRef(false);
  useEffect(() => {
    scrollRestored.current = false;
  }, [pdfPath]);

  useEffect(() => {
    if (pdfReady && !scrollRestored.current && pdfScrollRef.current && slotState?.scrollTop) {
      pdfScrollRef.current.scrollTop = slotState.scrollTop;
      scrollRestored.current = true;
    }
  }, [pdfReady, slotState?.scrollTop]);

  const handleScroll = useCallback(() => {
    if (pdfScrollRef.current && pdfPath && slotState && uiController) {
      inputAPI.updateScrollTop(slotId, pdfScrollRef.current.scrollTop);
      const pageHeight = PDF_WIDTH * slotState.zoom * 1.414;
      const newPage = Math.floor(pdfScrollRef.current.scrollTop / pageHeight) + 1;
      uiController.setCurrentPage(newPage, slotId);
      if (document.activeElement?.id !== 'page-input') {
        uiController.setPageInput(String(newPage), slotId);
      }
    }
  }, [pdfPath, slotState?.zoom, uiController, slotId, slotState]);

  // Scrolling animation for drag
  useEffect(() => {
    const isDragging = !!currentSelection || !!movingMark;
    if (!isDragging) {
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
      return;
    }

    const scrollStep = () => {
      if (pdfScrollRef.current && uiState) {
        const rect = pdfScrollRef.current.getBoundingClientRect();
        const edgeThreshold = 80;
        const maxSpeed = 22;
        let scrolled = false;
        const { y: clientY, x: clientX } = mousePosRef.current;

        if (clientY < rect.top + edgeThreshold) {
          const intensity = 1 - Math.max(0, clientY - rect.top) / edgeThreshold;
          pdfScrollRef.current.scrollTop -= maxSpeed * Math.pow(intensity, 1.5);
          scrolled = true;
        } else if (clientY > rect.bottom - edgeThreshold) {
          const intensity = 1 - Math.max(0, rect.bottom - clientY) / edgeThreshold;
          pdfScrollRef.current.scrollTop += maxSpeed * Math.pow(intensity, 1.5);
          scrolled = true;
        }

        if (scrolled && pdfContentRef.current && dragStateRef?.current) {
          const contentRect = pdfContentRef.current.getBoundingClientRect();
          const coords = { x: (clientX - contentRect.left) / slotState.zoom, y: (clientY - contentRect.top) / slotState.zoom };
          const state = dragStateRef.current;
          if (slotState.tool) getToolType(slotState.tool).onPointerMove?.({
            coords,
            state: {
              currentSelection: state.currentSelection,
              editingShapeId: slotState.editingShapeId,
              tool: slotState.tool,
              zoom: slotState.zoom,
            },
            actions: {
              setCurrentSelection,
            },
          });
          
          if (state.movingMark) {
            setMarksWithSectionWidths?.((prev: any) =>
              prev.map((r: any) => {
                if (r.id === state.movingMark.id) {
                  if (r.type === 'section') return { ...r, y: coords.y - state.movingMark.offsetY };
                  return { ...r, x: coords.x - state.movingMark.offsetX, y: coords.y - state.movingMark.offsetY };
                }
                return r;
              })
            );
          }
        }
      }
      scrollAnimRef.current = requestAnimationFrame(scrollStep);
    };

    scrollAnimRef.current = requestAnimationFrame(scrollStep);
    return () => { if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current); }
  }, [currentSelection, movingMark, slotState?.zoom, slotState?.tool, slotState?.editingShapeId, setMarksWithSectionWidths, setCurrentSelection, dragStateRef]);

  const getUnscaledCoordsFromClient = useCallback((clientX: number, clientY: number) => {
    if (!pdfContentRef.current || !slotState) return { x: 0, y: 0 };
    const rect = pdfContentRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left) / slotState.zoom, y: (clientY - rect.top) / slotState.zoom };
  }, [slotState?.zoom]);

  const getUnscaledCoords = useCallback((e: React.PointerEvent) => {
    return getUnscaledCoordsFromClient(e.clientX, e.clientY);
  }, [getUnscaledCoordsFromClient]);

  const handleDivPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || !slotState) return;
    const coords = getUnscaledCoords(e);

    if (e.ctrlKey || e.metaKey) {
      const hit = [...marks].reverse().find((r) => {
        const selectionContext = {PDFWIDTH: PDF_WIDTH, zoom: slotState.zoom};
        return getMarkDomainType(r.type).hasSelectedBorder(coords, r, selectionContext);
      });

      if (hit && pendingToolActivationReasonRef) {
        e.preventDefault();
        pendingToolActivationReasonRef.current = 'border-edit';
        getMarkRendererType(hit.type).onBorderEditStart?.({
          hit,
          coords,
          actions: {
            setTool: (tool) => uiController.setTool(tool, slotId),
            setCurrentSelection,
            setEditingSectionId: (id) => uiController.setEditingSectionId(id, slotId),
            setEditingShapeId: (id) => uiController.setEditingShapeId(id, slotId),
            setShapeBackup: (backup) => uiController.setShapeBackup(backup, slotId),
            setMovingRegion: setMovingMark,
            setSectionTarget: (target) => uiController.setSectionTarget(target, slotId),
          },
        });
      }
      return;
    }

    const toolType = getToolType(slotState.tool);
    const handled = toolType.onPointerDown?.({
      e,
      coords,
      state: {
        currentSelection,
        editingShapeId: slotState.editingShapeId,
        sectionTarget: slotState.sectionTarget,
        tool: slotState.tool,
        zoom: slotState.zoom,
      },
      actions: {
        setCurrentSelection,
        setEditingShapeId: (id) => uiController.setEditingShapeId(id, slotId),
        setShapeBackup: (backup) => uiController.setShapeBackup(backup, slotId),
        setSectionTarget: (target) => uiController.setSectionTarget(target, slotId),
        setMovingRegion: setMovingMark,
        setTool: (tool) => uiController.setTool(tool, slotId),
        setMarksWithSectionWidths,
        setSelectedMarkId: (id) => uiController.setSelectedMarkId(id, slotId),
      },
    });

    if (handled) return;
  }, [slotState, uiController, marks, getUnscaledCoords, currentSelection, setMarksWithSectionWidths, setCurrentSelection, setMovingMark, pendingToolActivationReasonRef, slotId]);

  const handleDivPointerMove = useCallback((e: React.PointerEvent) => {
    if (!slotState) return;
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    const coords = getUnscaledCoords(e);
    if (slotState?.tool) getToolType(slotState.tool).onPointerMove?.({
      coords,
      state: {
        currentSelection,
        editingShapeId: slotState.editingShapeId,
        tool: slotState.tool,
        zoom: slotState.zoom,
      },
      actions: {
        setCurrentSelection,
      },
    });

    if (movingMark && setMarksWithSectionWidths) {
      setMarksWithSectionWidths((prev: any) =>
        prev.map((r: any) => {
          if (r.id === movingMark.id) {
            if (r.type === 'section') return { ...r, y: coords.y - movingMark.offsetY };
            return { ...r, x: coords.x - movingMark.offsetX, y: coords.y - movingMark.offsetY };
          }
          return r;
        })
      );
    }
  }, [currentSelection, movingMark, getUnscaledCoords, uiState, setMarksWithSectionWidths, setCurrentSelection]);

  const handleDivPointerUp = useCallback((e: React.PointerEvent) => {
    if (!slotState) return;
    if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if(currentSelection && getMarkRendererType(currentSelection.type).isDrawable){
      if (currentSelection?.type) getToolType(currentSelection.type).onPointerUp?.({
        currentSelection,
        editingShapeId: slotState.editingShapeId,
        tool: slotState.tool,
        zoom: slotState.zoom,
        actions: {
          setCurrentSelection,
          setMarksWithSectionWidths,
          setSelectedMarkId: (id) => uiController.setSelectedMarkId(id, slotId),
        },
      });
    }
    setMovingMark(null);
  }, [currentSelection, slotState, uiController, setMarksWithSectionWidths, setCurrentSelection, setMovingMark, slotId]);

  const handleBorderClick = useCallback(async (e: any, markId: string) => {
    e.stopPropagation();
    if (!slotState) return;
    const toolType = getToolType(slotState.tool);
    await toolType.onBorderClick?.({
      regionId: markId,
      selectedRegionId: slotState.selectedMarkId,
      actions: {
        confirmDelete: async () => true, // Extracted simplified
        deleteRegion: (id) => {
          setMarksWithSectionWidths?.((prev: any) => prev.filter((r: any) => r.id !== id));
        },
        selectRegion: selectMark,
        clearShortcutUi: () => {}, // Handled by shortcutManager in WorkspaceContainer
      },
    });
  }, [slotState, selectMark, setMarksWithSectionWidths]);

  useEffect(() => {
    if (!slotState?.tool) return;
    const activationReason = pendingToolActivationReasonRef.current;
    pendingToolActivationReasonRef.current = 'normal';
    if (activationReason === 'border-edit') return;

    getToolType(slotState.tool).onActivate?.({
      state: {
        currentSelection,
        editingShapeId: slotState.editingShapeId,
        editingSectionId: slotState.editingSectionId,
        sectionTarget: slotState.sectionTarget,
        tool: slotState.tool,
      },
      actions: {
        setCurrentSelection,
        setSectionTarget: (target) => uiController.setSlotState(slotId, 'sectionTarget', target),
        setEditingSectionId: (id) => uiController.setSlotState(slotId, 'editingSectionId', id),
        setEditingShapeId: (id) => uiController.setSlotState(slotId, 'editingShapeId', id),
        setShapeBackup: (backup) => uiController.setSlotState(slotId, 'shapeBackup', backup),
      },
    });
  }, [slotState?.tool]);

  const sectionSelection = currentSelection?.type === 'section'
    ? currentSelection
    : { start: null, end: null };

  const handlePageSubmit = (e: any) => {
    if (e.key === 'Enter') {
      const target = parseInt(slotState.pageInput);
      const pageHeight = PDF_WIDTH * (slotState.zoom || 1.0) * 1.414;
      if (!isNaN(target) && target > 0 && target <= (numPages || 1)) {
        const nextScrollTop = (target - 1) * pageHeight;
        uiController.setSlotStates(slotId, {
          currentPage: target,
          scrollTop: nextScrollTop,
          pageInput: String(target)
        });
        if (pdfScrollRef.current) {
          pdfScrollRef.current.scrollTop = nextScrollTop;
        }
      } else {
        uiController.setSlotState(slotId, 'pageInput', String(slotState.currentPage));
      }
      document.activeElement?.blur();
    }
  };

  const handleCreateFromPanel = useCallback(async () => {
    if (!shortcutManager) return;
    const { selectPanelIdx, newWhiteboardName } = shortcutManager.state;
    if (selectPanelIdx === null) return;
    const trimmed = newWhiteboardName.trim();
    if (!trimmed) return;
    try {
      const id = `wb_${Date.now()}`;
      const pdfDirectoryPath = (() => {
        if (!pdfPath) return null;
        const slash = Math.max(pdfPath.lastIndexOf('/'), pdfPath.lastIndexOf('\\'));
        if (slash < 0) return null;
        return pdfPath.slice(0, slash);
      })();
      
      await WhiteboardRepository.saveWhiteboard(id, { name: trimmed }, undefined, pdfDirectoryPath);
      await ContentRepository.ensureContentExists(id, 'core.whiteboard', await joinPath(pdfDirectoryPath, `${id}.tldr`));
      
      shortcutManager.setNewWhiteboardName('');
      if (refreshAvailableWhiteboards) await refreshAvailableWhiteboards();
      shortcutManager.applySelection(selectPanelIdx, id, trimmed, slotState.selectedMarkId);
    } catch (err: any) {
      uiController.showToast(err.message || 'Could not create whiteboard.', 'error');
    }
  }, [pdfPath, refreshAvailableWhiteboards, shortcutManager, slotState?.selectedMarkId, uiController]);

  // Keyboard Shortcuts (Capture Phase)
  const handleKeyDown = useCallback((e: any) => {
    const target = e.target;
    const activeEl = document.activeElement;
    const isTyping = (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      activeEl?.tagName === 'INPUT' ||
      activeEl?.tagName === 'TEXTAREA' ||
      activeEl?.tagName === 'SELECT' ||
      activeEl?.isContentEditable
    );
    if (isTyping) return;

    if (uiState?.activeSlot !== slotId) return;

    if (e.key === '\\' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!slotState?.selectedMarkId && (!shortcutState || shortcutState.selectedIdx === null)) return;
      uiController.setLeftPct(55);
      return;
    }

    if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      uiController.setSlotState(slotId, 'zoom', 1);
      return;
    }

    // Shortcut tool shortcuts: I->1, II->2, III->3, ...
    if (shortcutState && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const n = Number.parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= shortcutState.slotCount) {
        e.preventDefault();
        const btn = document.querySelector(`button[title="Shortcut Tool ${n}"]`) as HTMLButtonElement | null;
        if (btn) btn.click();
        return;
      }
    }

    const toolType = getToolType(slotState.tool);
    const toolHandledKey = toolType.onKeyDown?.({
      e,
      state: {
        currentSelection,
        editingShapeId: slotState.editingShapeId,
        editingSectionId: slotState.editingSectionId,
        sectionTarget: slotState.sectionTarget,
        tool: slotState.tool,
        zoom: slotState.zoom,
        shapeBackup: slotState.shapeBackup,
      },
      actions: {
        setTool: (tool) => uiController.setSlotState(slotId, 'tool', tool),
        setCurrentSelection,
        setSectionTarget: (target) => uiController.setSlotState(slotId, 'sectionTarget', target),
        setEditingSectionId: (id) => uiController.setSlotState(slotId, 'editingSectionId', id),
        setEditingShapeId: (id) => uiController.setSlotState(slotId, 'editingShapeId', id),
        setShapeBackup: (backup) => uiController.setSlotState(slotId, 'shapeBackup', backup),
        setMarksWithSectionWidths,
        setSelectedMarkId: (markId) => uiController.setSlotState(slotId, 'selectedMarkId', markId),
      },
    });
    if (toolHandledKey) {
      e.stopPropagation();
      return;
    }

    if (e.key === 'Escape') {
      if (shortcutManager?.handleEscape()) return;
      uiController.setSlotState(slotId, 'selectedMarkId', null);
      return;
    }

    const hotkeyTool = getToolByHotkey(e.key);
    if (hotkeyTool) {
      e.preventDefault();
      if (shortcutManager) {
        shortcutManager.setSelectedIdx(null);
        shortcutManager.setSelectPanelIdx(null);
      }
      uiController.setSlotState(slotId, 'tool',
        hotkeyTool.activationMode === 'toggle' && slotState.tool === hotkeyTool.id.id
          ? 'select'
          : hotkeyTool.id.id
      );
      e.stopPropagation();
    }
  }, [uiState, uiController, currentSelection, shortcutState, shortcutManager, slotId, slotState, setMarksWithSectionWidths]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  // Determine cursor
  const toolType = slotState?.tool ? getToolType(slotState.tool) : null;
  const pdfCursor = movingMark
    ? 'grabbing'
    : (toolType && typeof toolType.cursor === 'function'
        ? toolType.cursor({ sectionTarget: slotState?.sectionTarget })
        : toolType?.cursor) || 'default';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={pdfScrollRef} onScroll={handleScroll} style={{ width: '100%', height: '100%', overflow: 'auto', textAlign: 'center', background: '#262a33', position: 'relative' }}>
        <div 
          ref={pdfContentRef} 
          onPointerDown={handleDivPointerDown} 
          onPointerMove={handleDivPointerMove} 
          onPointerUp={handleDivPointerUp} 
          style={{ position: 'relative', margin: '24px', background: 'white', display: 'inline-block', textAlign: 'left', cursor: pdfCursor, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
        >
          {documentFile ? (
            <Document file={documentFile} onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPdfReady(true); }} onLoadError={(error) => console.error("PDF Load Error:", error)}>
              {Array.from({ length: numPages ?? 0 }, (_, i) => (
                <LazyPage key={`${pdfPath}-${i}`} pageNumber={i + 1} width={PDF_WIDTH} scale={slotState?.zoom || 1} />
              ))}
            </Document>
          ) : (
            <div style={{ padding: '40px', color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>Loading document into memory...</div>
          )}

          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 10, pointerEvents: 'none' }}>
            {marks.map((r: any, idx: number) => {
              const color = markColor(r.id);
              const isSelected = slotState?.selectedMarkId === r.id;
              let renderCtx = { zoom: slotState?.zoom || 1, PDFWIDTH: PDF_WIDTH, tool: slotState?.tool, color, idx, onClick: handleBorderClick, isSelected };
              return getMarkRendererType(r.type).render(r, renderCtx);
            })}
            {currentSelection && 
              getMarkRendererType(currentSelection.type).renderSelectionPreview(currentSelection, { zoom: slotState?.zoom || 1, PDFWIDTH: PDF_WIDTH })
            } 
          </svg>
        </div>
      </div>

      {/* ── BOTTOM NAV: Page Control Overlay ── */}
      <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Page</span>
        <input
          id={`${slotId}-page-input`} type="text" value={slotState?.pageInput || ''}
          onChange={e => uiController.setSlotState(slotId, 'pageInput', e.target.value)}
          onKeyDown={handlePageSubmit}
          onBlur={() => uiController.setSlotState(slotId, 'pageInput', String(slotState?.currentPage))}
          style={{ width: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid #4b5563', color: '#fff', textAlign: 'center', borderRadius: '4px', fontSize: '11px', padding: '2px 0', outline: 'none' }}
        />
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>/ {numPages || '-'}</span>
      </div>

      {/* ── TOOLBOX (Vertical, Bottom Right Overlay) ── */}
      <div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto' }}>
        <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {[
            { id: 'select', label: 'Select', key: 'V', icon: '↖' },
            { id: 'rect',   label: 'Freeform', key: 'R', icon: '▭' },
            { id: 'lasso',  label: 'Lasso', key: 'C', icon: '∿' },
            { id: 'section',label: 'Section', key: 'S', icon: '⬍' },
            { id: 'remove', label: 'Remove', key: 'X', icon: '✕' },
          ].map(({ id, label, key, icon }) => (
            <div key={id} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  if (shortcutManager) shortcutManager.clearUi();
                  const buttonToolType = getToolType(id);
                  const nextTool = buttonToolType.activationMode === 'toggle' && slotState?.tool === id ? 'select' : id;
                  uiController.setSlotState(slotId, 'tool', nextTool);
                }}
                title={`${label} [${key}]`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${slotState?.tool === id ? '#3B82F6' : 'transparent'}`, background: slotState?.tool === id ? 'rgba(59,130,246,0.2)' : 'transparent', color: slotState?.tool === id ? '#93C5FD' : '#d1d5db', cursor: 'pointer', fontSize: '18px', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (slotState?.tool !== id) { e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.1)'; } }}
                onMouseLeave={e => { if (slotState?.tool !== id) { e.currentTarget.style.color='#d1d5db'; e.currentTarget.style.background='transparent'; } }}
              >
                {icon}
              </button>
              {getToolType(id).renderToolbarExtras?.({
                toolId: id,
                tool: slotState?.tool,
                sectionTarget: slotState?.sectionTarget,
                sectionSelection,
                editingShapeId: slotState?.editingShapeId,
                editingSectionId: slotState?.editingSectionId,
                shapeBackup: slotState?.shapeBackup,
                actions: {
                  setTool: (tool) => uiController.setSlotState(slotId, 'tool', tool),
                  setSectionTarget: (target) => uiController.setSlotState(slotId, 'sectionTarget', target),
                  setEditingSectionId: (id) => uiController.setSlotState(slotId, 'editingSectionId', id),
                  setCurrentSelection,
                  setMarksWithSectionWidths,
                  setSelectedMarkId: (markId) => uiController.setSlotState(slotId, 'selectedMarkId', markId),
                  setSelectedShortcutIdx: (idx) => shortcutManager?.setSelectedIdx(idx),
                  setShapeBackup: (backup) => uiController.setSlotState(slotId, 'shapeBackup', backup),
                  setEditingShapeId: (shapeId) => uiController.setSlotState(slotId, 'editingShapeId', shapeId),
                  setSelectPanelIdx: (idx) => shortcutManager?.setSelectPanelIdx(idx),
                },
              })}
            </div>
          ))}
        </div>

        {shortcutState && shortcutManager && (
          <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            {Array.from({ length: shortcutState.slotCount }, (_, idx) => {
              const linkedId = shortcutState.slotLinks[idx];
              const isActive = shortcutState.selectedIdx === idx;
              const showControls = shortcutState.activeControlsIdx === idx && !!linkedId;
              const showSelectPanel = shortcutState.selectPanelIdx === idx;
              return (
                <div key={`gtool-${idx}`} style={{ position: 'relative' }}>
                  <button
                    onClick={() => shortcutManager.openSlot(idx, slotState?.selectedMarkId)}
                    title={`Shortcut Tool ${idx + 1}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${isActive ? '#3B82F6' : 'transparent'}`, background: isActive ? 'rgba(59,130,246,0.2)' : 'transparent', color: isActive ? '#93C5FD' : '#d1d5db', cursor: 'pointer', fontSize: '16px' }}
                  >
                    {toRoman(idx + 1)}
                  </button>
                  {showControls && (
                    <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(38,42,51,0.9)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                      <button onClick={() => shortcutManager.showUpdatePanel(idx)} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #3B82F6', background: 'rgba(59,130,246,0.2)', color: '#93C5FD', cursor: 'pointer' }}>Update</button>
                      <button onClick={() => shortcutManager.closeSlot()} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #4b5563', background: 'transparent', color: '#d1d5db', cursor: 'pointer' }}>Close</button>
                      {shortcutState.slotCount > 1 && (
                        <button onClick={async () => {
                          const yes = await confirmDialog('Delete this shortcut tool?','Delete Tool');
                          if (!yes) return;
                          shortcutManager.deleteSlot(idx);
                        }} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer' }}>Delete Tool</button>
                      )}
                    </div>
                  )}

                  {showSelectPanel && (
                    <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', zIndex: 80, width: '320px', background: 'rgba(28,31,38,0.96)', border: '1px solid #374151', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Session Tool {toRoman(idx + 1)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button onClick={handleCreateFromPanel} style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #3B82F6', background: 'rgba(59,130,246,0.2)', color: '#93C5FD', cursor: 'pointer', fontSize: '11px' }}>Create</button>
                          <button onClick={() => { shortcutManager.setSelectPanelIdx(null); shortcutManager.setNewWhiteboardName(''); }} style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                          {shortcutState.slotCount > 1 && (
                            <button
                              onClick={async () => {
                                const yes = await confirmDialog('Delete this shortcut tool?', 'Delete Tool');
                                if (!yes) return;
                                shortcutManager.deleteSlot(idx);
                              }}
                              style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer', fontSize: '11px' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ maxHeight: '182px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {shortcutState.availableWhiteboards.map((wb: any) => (
                          <button
                            key={wb.id}
                            onClick={() => shortcutManager.applySelection(idx, wb.id, wb.name, slotState?.selectedMarkId)}
                            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${shortcutState.draftId === wb.id ? '#3B82F6' : '#374151'}`, background: shortcutState.draftId === wb.id ? 'rgba(59,130,246,0.18)' : '#262a33', color: '#e5e7eb', cursor: 'pointer', fontSize: '12px', minHeight: '30px' }}
                          >
                            {wb.name}
                          </button>
                        ))}
                        {shortcutState.availableWhiteboards.length === 0 && <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>No whiteboards yet.</span>}
                      </div>
                      <input value={shortcutState.newWhiteboardName} onChange={(e) => shortcutManager.setNewWhiteboardName(e.target.value)} placeholder="New whiteboard name..." style={{ width: '100%', background: '#1c1f26', border: '1px solid #4b5563', color: '#e5e7eb', borderRadius: '6px', padding: '6px 8px', fontSize: '11px', outline: 'none' }} />
                    </div>
                  )}
                </div>
              );
            })}
            {shortcutState.slotCount < (settings?.maxGlobalPdfTools ?? 8) && (
              <button onClick={() => shortcutManager.addSlot()} title="Add shortcut tool" style={{ width: '36px', height: '32px', borderRadius: '6px', border: '1px dashed #4b5563', background: 'transparent', color: '#d1d5db', cursor: 'pointer', fontSize: '16px' }}>+</button>
            )}
          </div>
        )}

        {/* Zoom Controls */}
        <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <button onClick={() => uiController.setSlotState(slotId, 'zoom', Math.min((slotState?.zoom || 1.0) + 0.25, 3.0))} title="Zoom In" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '18px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>+</button>
          <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', margin: '2px 0' }}>{Math.round((slotState?.zoom || 1.0) * 100)}%</span>
          <button onClick={() => uiController.setSlotState(slotId, 'zoom', Math.max((slotState?.zoom || 1.0) - 0.25, 0.5))} title="Zoom Out" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '18px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>-</button>
        </div>
      </div>
    </div>
  );
}

export const pdfContentRenderer: ContentRendererType = {
  id: 'pdf',
  Component: PDFContentComponent,
  slotRendererRegistry: slotRendererRegistry,
}
