import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ContentRendererType, ContentRendererProps } from '../content_renderer_registry';
import { slotRendererRegistry } from '../pdf/slot_renderer_registry';
import { getMarkDomainType } from '../../../atma/capabilities_registry/pdf/mark_domain_registry';
import { getMarkRendererType } from '../pdf/vertical_pane/mark_renderer_registry';
import { getToolRendererType as getToolType } from '../pdf/vertical_pane/tool_renderer_registry';
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
            uiController.setZoom(Math.max(0.5, uiState.zoom - 0.25));
          } else {
            uiController.setZoom(Math.min(3.0, uiState.zoom + 0.25));
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
  }, [uiState?.zoom, uiController]);

  // Scroll Restoration
  const scrollRestored = useRef(false);
  useEffect(() => {
    scrollRestored.current = false;
  }, [pdfPath]);

  useEffect(() => {
    if (pdfReady && !scrollRestored.current && pdfScrollRef.current && uiState?.scrollTop) {
      pdfScrollRef.current.scrollTop = uiState.scrollTop;
      scrollRestored.current = true;
    }
  }, [pdfReady, uiState?.scrollTop]);

  const handleScroll = useCallback(() => {
    if (pdfScrollRef.current && pdfPath && uiState && uiController) {
      inputAPI.updateScrollTop(pdfPath, pdfScrollRef.current.scrollTop);
      const pageHeight = PDF_WIDTH * uiState.zoom * 1.414;
      const newPage = Math.floor(pdfScrollRef.current.scrollTop / pageHeight) + 1;
      uiController.setCurrentPage(newPage);
      if (document.activeElement?.id !== 'page-input') {
        uiController.setPageInput(String(newPage));
      }
    }
  }, [pdfPath, uiState?.zoom, uiController]);

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
          const coords = { x: (clientX - contentRect.left) / uiState.zoom, y: (clientY - contentRect.top) / uiState.zoom };
          const state = dragStateRef.current;
          getToolType(uiState.tool).onPointerMove?.({
            coords,
            state: {
              currentSelection: state.currentSelection,
              editingShapeId: uiState.editingShapeId,
              tool: uiState.tool,
              zoom: uiState.zoom,
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
  }, [currentSelection, movingMark, uiState?.zoom, uiState?.tool, uiState?.editingShapeId, setMarksWithSectionWidths, setCurrentSelection, dragStateRef]);

  const getUnscaledCoordsFromClient = useCallback((clientX: number, clientY: number) => {
    if (!pdfContentRef.current || !uiState) return { x: 0, y: 0 };
    const rect = pdfContentRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left) / uiState.zoom, y: (clientY - rect.top) / uiState.zoom };
  }, [uiState?.zoom]);

  const getUnscaledCoords = useCallback((e: React.PointerEvent) => {
    return getUnscaledCoordsFromClient(e.clientX, e.clientY);
  }, [getUnscaledCoordsFromClient]);

  const handleDivPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || !uiState) return;
    const coords = getUnscaledCoords(e);

    if (e.ctrlKey || e.metaKey) {
      const hit = [...marks].reverse().find((r) => {
        const selectionContext = {PDFWIDTH: PDF_WIDTH, zoom: uiState.zoom};
        return getMarkDomainType(r.type).hasSelectedBorder(coords, r, selectionContext);
      });

      if (hit && pendingToolActivationReasonRef) {
        e.preventDefault();
        pendingToolActivationReasonRef.current = 'border-edit';
        getMarkRendererType(hit.type).onBorderEditStart?.({
          hit,
          coords,
          actions: {
            setTool: uiController.setTool,
            setCurrentSelection,
            setEditingSectionId: uiController.setEditingSectionId,
            setEditingShapeId: uiController.setEditingShapeId,
            setShapeBackup: uiController.setShapeBackup,
            setMovingRegion: setMovingMark,
            setSectionTarget: uiController.setSectionTarget,
          },
        });
      }
      return;
    }

    const toolType = getToolType(uiState.tool);
    const handled = toolType.onPointerDown?.({
      e,
      coords,
      state: {
        currentSelection,
        editingShapeId: uiState.editingShapeId,
        sectionTarget: uiState.sectionTarget,
        tool: uiState.tool,
        zoom: uiState.zoom,
      },
      actions: {
        setCurrentSelection,
        setEditingShapeId: uiController.setEditingShapeId,
        setShapeBackup: uiController.setShapeBackup,
        setSectionTarget: uiController.setSectionTarget,
        setMovingRegion: setMovingMark,
        setTool: uiController.setTool,
        setMarksWithSectionWidths,
        setSelectedMarkId: uiController.setSelectedMarkId,
      },
    });

    if (handled) return;
  }, [uiState, uiController, marks, getUnscaledCoords, currentSelection, setMarksWithSectionWidths, setCurrentSelection, setMovingMark, pendingToolActivationReasonRef]);

  const handleDivPointerMove = useCallback((e: React.PointerEvent) => {
    if (!uiState) return;
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    const coords = getUnscaledCoords(e);
    getToolType(uiState.tool).onPointerMove?.({
      coords,
      state: {
        currentSelection,
        editingShapeId: uiState.editingShapeId,
        tool: uiState.tool,
        zoom: uiState.zoom,
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
    if (!uiState) return;
    if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if(currentSelection && getMarkRendererType(currentSelection.type).isDrawable){
      getToolType(currentSelection.type).onPointerUp?.({
        currentSelection,
        editingShapeId: uiState.editingShapeId,
        tool: uiState.tool,
        zoom: uiState.zoom,
        actions: {
          setCurrentSelection,
          setMarksWithSectionWidths,
          setSelectedMarkId: uiController.setSelectedMarkId,
        },
      });
    }
    setMovingMark(null);
  }, [currentSelection, uiState, uiController, setMarksWithSectionWidths, setCurrentSelection, setMovingMark]);

  const handleBorderClick = useCallback(async (e: any, markId: string) => {
    e.stopPropagation();
    if (!uiState) return;
    const toolType = getToolType(uiState.tool);
    await toolType.onBorderClick?.({
      regionId: markId,
      selectedRegionId: uiState.selectedMarkId,
      actions: {
        confirmDelete: async () => true, // Extracted simplified
        deleteRegion: (id) => {
          setMarksWithSectionWidths?.((prev: any) => prev.filter((r: any) => r.id !== id));
        },
        selectRegion: selectMark,
        clearShortcutUi: () => {}, // Handled by shortcutManager in WorkspaceContainer
      },
    });
  }, [uiState, selectMark, setMarksWithSectionWidths]);

  // Determine cursor
  const toolType = uiState ? getToolType(uiState.tool) : null;
  const pdfCursor = movingMark
    ? 'grabbing'
    : (toolType && typeof toolType.cursor === 'function'
        ? toolType.cursor({ sectionTarget: uiState?.sectionTarget })
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
              <LazyPage key={`${pdfPath}-${i}`} pageNumber={i + 1} width={PDF_WIDTH} scale={uiState?.zoom || 1} />
            ))}
          </Document>
        ) : (
          <div style={{ padding: '40px', color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>Loading document into memory...</div>
        )}

        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 10, pointerEvents: 'none' }}>
          {marks.map((r: any, idx: number) => {
            const color = markColor(r.id);
            const isSelected = uiState?.selectedMarkId === r.id;
            let renderCtx = { zoom: uiState?.zoom || 1, PDFWIDTH: PDF_WIDTH, tool: uiState?.tool, color, idx, onClick: handleBorderClick, isSelected };
            return getMarkRendererType(r.type).render(r, renderCtx);
          })}
          {currentSelection && 
            getMarkRendererType(currentSelection.type).renderSelectionPreview(currentSelection, { zoom: uiState?.zoom || 1, PDFWIDTH: PDF_WIDTH })
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
