import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ContentRendererType, ContentRendererProps } from '../../renderer_registry/content_renderer_registry';
import { slotRendererRegistry } from '../../renderer_registry/pdf/slot_renderer_registry';
import { getMarkDomainType } from '../../../atma/capabilities_registry/pdf/mark_domain_registry';
import { getMarkRendererType } from '../../renderer_registry/pdf/vertical_pane/mark_renderer_registry';
import { getToolRendererType as getToolType } from '../../renderer_registry/pdf/vertical_pane/tool_renderer_registry';
import { convertFileSrc } from '../../../atma/platform_adapter/switch';
import { inputAPI } from '../../../atma/singletons';

// Re-use mark color palette from WorkWindow
const MARK_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];
const markColor = (id: string) => MARK_COLORS[parseInt(id.replace('reg_', '').replace('mark_', ''), 10) % MARK_COLORS.length];

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
  marks = [],
  currentSelection,
  movingMark,
  setCurrentSelection,
  setMovingMark,
  setMarksWithSectionWidths,
  selectMark,
  dragStateRef,
  pendingToolActivationReasonRef,
}: ContentRendererProps & any) {
  const PDF_WIDTH = 800;

  const slotState = uiState?.slots[slotId];

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

    if (!slotState?.tool) return;
    if (!slotState?.tool) return;
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
    if (!slotState?.tool) return;
    if (!slotState?.tool) return;
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

  // Determine cursor
  const toolType = slotState?.tool ? getToolType(slotState.tool) : null;
  const pdfCursor = movingMark
    ? 'grabbing'
    : (toolType && typeof toolType.cursor === 'function'
        ? toolType.cursor({ sectionTarget: slotState?.sectionTarget })
        : toolType?.cursor) || 'default';

  return (
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
  );
}

export const pdfContentRenderer: ContentRendererType = {
  id: 'pdf',
  Component: PDFContentComponent,
  slotRendererRegistry: slotRendererRegistry,
}
