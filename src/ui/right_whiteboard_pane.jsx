export function right_whiteboard_pane(){

  const PDF_WIDTH = 800;

  // PDF
  const [numPages, setNumPages]   = useState(null);
  const [pdfReady, setPdfReady]   = useState(false);
  const [pdfData, setPdfData]     = useState(null);
  const pdfScrollRef = useRef(null);
  const documentFile = useMemo(() => pdfData ? { data: pdfData } : null, [pdfData]);
  const restoredSession = useMemo(() => loadSession(pdfPath), [pdfPath]);

  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  
  // Drag / move state
  const [currentDrag, setCurrentDrag]   = useState(null);
  const [movingRegion, setMovingRegion] = useState(null);

  const [lastSavedAt, setLastSavedAt] = useState(null);
  const pdfContentRef = useRef(null);

  const mousePosRef = useRef({ x: 0, y: 0 });
  const scrollAnimRef = useRef(null);
  const dragStateRef = useRef({ currentDrag, movingRegion, lassoPoints });
  const zoomTimeoutRef = useRef(null);

  useEffect(() => { dragStateRef.current = { currentDrag, movingRegion, lassoPoints }; }, [currentDrag, movingRegion, lassoPoints]);

  // Native Ctrl+Scroll for zooming / Shift+Scroll for horizontal pan
  useEffect(() => {
    const pdfWrapper = pdfScrollRef.current;
    if (!pdfWrapper) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        if (!zoomTimeoutRef.current) {
          zoomTimeoutRef.current = setTimeout(() => {
            zoomTimeoutRef.current = null;
          }, 250);
          if (e.deltaY > 0) {
            setZoom(z => Math.max(0.5, z - 0.25));
          } else {
            setZoom(z => Math.min(3.0, z + 0.25));
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
  }, []);

  // Tools Specific State
  const [sectionY, setSectionY] = useState({ start: null, end: null });
  const [sectionTarget, setSectionTarget] = useState('start');
  const [editingSectionId, setEditingSectionId] = useState(null);

  // Edit mode for Rect and Lasso
  const [editingShapeId, setEditingShapeId] = useState(null);
  const [shapeBackup, setShapeBackup]       = useState(null);
  const [lassoPoints, setLassoPoints] = useState(null);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  const sectionWidths = useMemo(() => {
    const widths = {};
    const sections = regions.filter(r => r.type === 'section');
    const sorted = [...sections].sort((a, b) => b.h - a.h);

    sorted.forEach(s => {
      let maxParentWidth = 16;
      sorted.forEach(other => {
        if (s.id !== other.id && other.y <= s.y + 1 && (other.y + other.h) >= (s.y + s.h) - 1) {
          if (widths[other.id] > maxParentWidth) maxParentWidth = widths[other.id];
        }
      });
      widths[s.id] = maxParentWidth + 8;
    });
    return widths;
  }, [regions]);

  useEffect(() => {
    if (tool !== 'section') {
      setSectionY({ start: null, end: null });
      setSectionTarget('start');
      setEditingSectionId(null);
    }
    if (tool !== 'lasso') setLassoPoints(null);
    if (tool !== 'rect' && tool !== 'lasso') {
      setEditingShapeId(null);
      setShapeBackup(null);
    }
  }, [tool]);

  useEffect(() => {
    const maxTools = Math.max(1, settings?.maxGlobalPdfTools ?? 8);
    setGlobalToolCount((prev) => Math.min(prev, maxTools));
  }, [settings?.maxGlobalPdfTools]);

  useEffect(() => {
    setGlobalToolLinks((prev) => {
      const next = prev.slice(0, globalToolCount);
      while (next.length < globalToolCount) next.push(null);
      return next;
    });
  }, [globalToolCount]);

  useEffect(() => {
    if (selectedGlobalToolIdx === null) {
      setActiveGlobalToolControlsIdx(null);
    }
  }, [selectedGlobalToolIdx]);


  const regionsRef          = useRef(regions);
  const selectedRegionIdRef = useRef(selectedRegionId);
  const selectedGlobalToolIdxRef = useRef(selectedGlobalToolIdx);
  const globalToolCountRef = useRef(globalToolCount);
  const globalToolLinksRef = useRef(globalToolLinks);

useEffect(() => { regionsRef.current = regions; }, [regions]);
  useEffect(() => { selectedRegionIdRef.current = selectedRegionId; }, [selectedRegionId]);
  useEffect(() => { selectedGlobalToolIdxRef.current = selectedGlobalToolIdx; }, [selectedGlobalToolIdx]);
  useEffect(() => { globalToolCountRef.current = globalToolCount; }, [globalToolCount]);
  useEffect(() => { globalToolLinksRef.current = globalToolLinks; }, [globalToolLinks]);

    const persistSession = useCallback(() => {
    debouncedSaveSession({
      regions:          regionsRef.current,
      selectedRegionId: selectedRegionIdRef.current,
      selectedGlobalToolIdx: selectedGlobalToolIdxRef.current,
      scrollTop:        pdfScrollRef.current?.scrollTop ?? 0,
      globalToolCount: globalToolCountRef.current,
      globalToolLinks: globalToolLinksRef.current,
    });
  }, [debouncedSaveSession]);

  useEffect(() => { persistSession(); }, [regions, selectedRegionId, leftPct, persistSession]);


  useEffect(() => {
    const onUnload = () => {
      debouncedSaveSession.flush({
        regions:          regionsRef.current,
        selectedRegionId: selectedRegionIdRef.current,
        selectedGlobalToolIdx: selectedGlobalToolIdxRef.current,
        scrollTop:        pdfScrollRef.current?.scrollTop ?? 0,
        globalToolCount: globalToolCountRef.current,
        globalToolLinks: globalToolLinksRef.current,
      });
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [debouncedSaveSession]);

  const scrollRestored = useRef(false);
  useEffect(() => {
    if (pdfReady && !scrollRestored.current && pdfScrollRef.current && restoredSession?.scrollTop) {
      pdfScrollRef.current.scrollTop = restoredSession.scrollTop;
      scrollRestored.current = true;
    }
  }, [pdfReady, restoredSession]);


  const debouncedScrollSave = useMemo(() => debounce(persistSession, 400), [persistSession]);
  const handleScroll = useCallback(() => {
    debouncedScrollSave();
    if (pdfScrollRef.current) {
      const pageHeight = PDF_WIDTH * zoom * 1.414;
      const newPage = Math.floor(pdfScrollRef.current.scrollTop / pageHeight) + 1;
      setCurrentPage(newPage);
      if (document.activeElement?.id !== 'page-input') {
        setPageInput(String(newPage));
      }
    }
  }, [debouncedScrollSave, zoom]);

  const handlePageSubmit = (e) => {
    if (e.key === 'Enter') {
      const target = parseInt(pageInput);
      if (!isNaN(target) && target > 0 && target <= (numPages || 1)) {
        if (pdfScrollRef.current) {
          const pageHeight = PDF_WIDTH * zoom * 1.414;
          pdfScrollRef.current.scrollTop = (target - 1) * pageHeight;
        }
      } else {
        setPageInput(String(currentPage));
      }
      document.activeElement?.blur();
    }
  };

  useEffect(() => {
    let active = true;
    setPdfData(null);
    fetch(pdfPath)
      .then(res => res.arrayBuffer())
      .then(buffer => { if (active) setPdfData(new Uint8Array(buffer)); })
      .catch(err => console.error("Failed to load PDF to memory:", err));
    return () => { active = false; };
  }, [pdfPath]);

  useEffect(() => {
    const onMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      const cr = containerRef.current.getBoundingClientRect();
      const rawPct = ((e.clientX - cr.left) / cr.width) * 100;
      setLeftPct(Math.max(MIN_PANE_PCT, Math.min(MAX_PANE_PCT, rawPct)));
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

  const getUnscaledCoordsFromClient = useCallback((clientX, clientY) => {
    if (!pdfContentRef.current) return { x: 0, y: 0 };
    const rect = pdfContentRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  }, [zoom]);

  const getUnscaledCoords = useCallback((e) => {
    return getUnscaledCoordsFromClient(e.clientX, e.clientY);
  }, [getUnscaledCoordsFromClient]);

  const handleDivMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const coords = getUnscaledCoords(e);
    const hitThreshold = (STROKE_HIT_WIDTH / 2) / zoom;

    if (e.ctrlKey || e.metaKey) {
      const hit = [...regions].reverse().find((r) => {
        if (r.type === 'section') {
          const sw = sectionWidths[r.id] || 24;
          const inY = coords.y >= r.y && coords.y <= r.y + r.h;
          const inLeft = coords.x >= 0 && coords.x <= sw;
          const inRight = coords.x >= (PDF_WIDTH - sw) && coords.x <= PDF_WIDTH;
          return inY && (inLeft || inRight);
        }
        if (r.type === 'lasso') {
          return isNearLassoBorder(coords, r, hitThreshold);
        }
        return isNearBorder(coords, r, hitThreshold);
      });

      if (hit) {
        e.preventDefault();
        if (hit.type === 'section') {
          setTool('section');
          setSectionY({ start: hit.y, end: hit.y + hit.h });
          setEditingSectionId(hit.id);
          setSectionTarget('start');
        } else {
          if (editingShapeId !== hit.id) {
            setEditingShapeId(hit.id);
            setShapeBackup({...hit});
            setTool(hit.type);
          }
          setMovingRegion({ id: hit.id, offsetX: coords.x - hit.x, offsetY: coords.y - hit.y });
        }
      }
      return;
    }

    if (tool === 'section' && sectionTarget) {
      setSectionY(prev => ({ ...prev, [sectionTarget]: coords.y }));
      if (sectionTarget === 'start' && sectionY.end === null) setSectionTarget('end');
      else if (sectionTarget === 'end' && sectionY.start === null) setSectionTarget('start');
      return;
    }

    if (tool === 'lasso') {
      setLassoPoints([{ x: coords.x, y: coords.y }]);
      return;
    }

    if (tool === 'rect') {
      setCurrentDrag({ startX: coords.x, startY: coords.y, currentX: coords.x, currentY: coords.y });
    }
  }, [tool, regions, zoom, getUnscaledCoords, sectionTarget, sectionY, sectionWidths, editingShapeId]);

  const handleDivMouseMove = useCallback((e) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    const coords = getUnscaledCoords(e);

    if (currentDrag) setCurrentDrag((p) => ({ ...p, currentX: coords.x, currentY: coords.y }));

    if (lassoPoints) {
      setLassoPoints((prev) => {
        const last = prev[prev.length - 1];
        if (Math.abs(last.x - coords.x) > 2 / zoom || Math.abs(last.y - coords.y) > 2 / zoom) {
          return [...prev, { x: coords.x, y: coords.y }];
        }
        return prev;
      });
    }

    if (movingRegion) {
      setRegions((prev) =>
        prev.map((r) => {
          if (r.id === movingRegion.id) {
            if (r.type === 'section') return { ...r, y: coords.y - movingRegion.offsetY };
            return { ...r, x: coords.x - movingRegion.offsetX, y: coords.y - movingRegion.offsetY };
          }
          return r;
        })
      );
    }
  }, [currentDrag, movingRegion, lassoPoints, zoom, getUnscaledCoords]);

  const handleDivMouseUp = useCallback(() => {
    if (currentDrag) {
      const shape = rectFromDrag(currentDrag);
      if (shape.w > 10 / zoom && shape.h > 10 / zoom) {
        if (editingShapeId && tool === 'rect') {
           setRegions(prev => prev.map(r => r.id === editingShapeId ? { ...r, ...shape } : r));
        } else {
           const newId = `reg_${Date.now()}`;
           setRegions((prev) => [...prev, { id: newId, type: 'rect', ...shape }]);
           setSelectedRegionId(newId);
        }
      }
      setCurrentDrag(null);
    }

    if (lassoPoints) {
      if (lassoPoints.length > 5) {
        const xs = lassoPoints.map(p => p.x);
        const ys = lassoPoints.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const w = maxX - minX;
        const h = maxY - minY;

        if (w > 10 / zoom && h > 10 / zoom) {
          const relativePoints = lassoPoints.map(p => ({ x: p.x - minX, y: p.y - minY }));
          const shape = { x: minX, y: minY, w, h, points: relativePoints };
          if (editingShapeId && tool === 'lasso') {
             setRegions(prev => prev.map(r => r.id === editingShapeId ? { ...r, ...shape } : r));
          } else {
             const newId = `reg_${Date.now()}`;
             setRegions(prev => [...prev, { id: newId, type: 'lasso', ...shape }]);
             setSelectedRegionId(newId);
          }
        }
      }
      setLassoPoints(null);
    }

    setMovingRegion(null);
  }, [currentDrag, lassoPoints, zoom, editingShapeId, tool]);

  useEffect(() => {
    const isDragging = !!currentDrag || !!movingRegion || !!lassoPoints;

    if (!isDragging) {
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
      return;
    }

    const scrollStep = () => {
      if (pdfScrollRef.current) {
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

        if (scrolled) {
          const coords = getUnscaledCoordsFromClient(clientX, clientY);
          const state = dragStateRef.current;

          if (state.currentDrag) {
            setCurrentDrag(p => p ? { ...p, currentX: coords.x, currentY: coords.y } : p);
          }
          if (state.lassoPoints) {
            setLassoPoints((prev) => {
              const last = prev[prev.length - 1];
              if (Math.abs(last.x - coords.x) > 2 / zoom || Math.abs(last.y - coords.y) > 2 / zoom) {
                return [...prev, { x: coords.x, y: coords.y }];
              }
              return prev;
            });
          }
          if (state.movingRegion) {
            setRegions((prev) =>
              prev.map((r) => {
                if (r.id === state.movingRegion.id) {
                  if (r.type === 'section') return { ...r, y: coords.y - state.movingRegion.offsetY };
                  return { ...r, x: coords.x - state.movingRegion.offsetX, y: coords.y - state.movingRegion.offsetY };
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
    return () => cancelAnimationFrame(scrollAnimRef.current);
  }, [currentDrag, movingRegion, lassoPoints, zoom, getUnscaledCoordsFromClient]);

  const handleBorderClick = useCallback(async (e, regionId) => {
    e.stopPropagation();

    if (tool === 'remove') {
      const isConfirmed = await confirm(
        'Are you sure you want to delete this region? Its whiteboard data will be permanently lost.',
        { title: 'Delete Whiteboard', kind: 'warning' }
      );

      if (isConfirmed) {
        setRegions((prev) => prev.filter((r) => r.id !== regionId));
        deleteWhiteboard(regionId);
        if (selectedRegionId === regionId) setSelectedRegionId(null);
      }
    } else if (tool === 'select') {
      setSelectedGlobalToolIdx(null);
      setActiveGlobalToolControlsIdx(null);
      setSelectPanelToolIdx(null);
      setViewStack([]);
      setSelectedRegionId(regionId);
    }
  }, [tool, selectedRegionId]);

  const pushCurrentViewToStack = useCallback((nextView) => {
    const currentView = selectedGlobalToolIdx !== null
      ? { type: 'global', idx: selectedGlobalToolIdx }
      : (selectedRegionId ? { type: 'region', id: selectedRegionId } : null);
    if (!currentView) return;
    const isSame = currentView.type === nextView.type && (currentView.type === 'global' ? currentView.idx === nextView.idx : currentView.id === nextView.id);
    if (!isSame) {
      setViewStack((prev) => {
        const filtered = prev.filter((v) => !(v.type === currentView.type && (v.type === 'global' ? v.idx === currentView.idx : v.id === currentView.id)));
        return [...filtered, currentView];
      });
    }
  }, [selectedGlobalToolIdx, selectedRegionId]);

  const handleOpenGlobalTool = useCallback((idx) => {
    setTool('select');
    const linked = globalToolLinks[idx];
    if (!linked) {
      setSelectPanelToolIdx(idx);
      setActiveGlobalToolControlsIdx(null);
      setNewGlobalWhiteboardName('');
      setGlobalToolDraftId(null);
      setGlobalToolDraftName('');
      return;
    }

    pushCurrentViewToStack({ type: 'global', idx });
    setSelectPanelToolIdx(null);
    setSelectedRegionId(null);
    setSelectedGlobalToolIdx(idx);
    setActiveGlobalToolControlsIdx(idx);
    const found = allWhiteboards.find((wb) => wb.id === linked);
    setGlobalToolDraftId(linked);
    setGlobalToolDraftName(found?.name || 'Whiteboard');
  }, [globalToolLinks, allWhiteboards, pushCurrentViewToStack]);

  const handleApplyGlobalToolSelection = useCallback((idx, whiteboardId, whiteboardName = null) => {
    if (!whiteboardId) return;
    setGlobalToolLinks((prev) => prev.map((id, i) => (i === idx ? whiteboardId : id)));
    pushCurrentViewToStack({ type: 'global', idx });
    setSelectedRegionId(null);
    setSelectedGlobalToolIdx(idx);
    setActiveGlobalToolControlsIdx(idx);
    setSelectPanelToolIdx(null);
    setGlobalToolDraftId(whiteboardId);
    if (whiteboardName) setGlobalToolDraftName(whiteboardName);
  }, [pushCurrentViewToStack]);

  const refreshAvailableWhiteboards = useCallback(async () => {
    const libraryPath = localStorage.getItem('lemmamap:library');
    if (!libraryPath) {
      setAvailableWhiteboards([]);
      return;
    }

    const collected = [];
    const walk = async (dir) => {
      const items = await readDir(dir);
      for (const item of items) {
        const fullPath = await join(dir, item.name);
        if (item.isDirectory) {
          await walk(fullPath);
          continue;
        }
        if (!item.isFile || !item.name.toLowerCase().endsWith('.whiteboard.json')) continue;
        try {
          const raw = await readTextFile(fullPath);
          const meta = JSON.parse(raw);
          if (meta?.id && meta?.name) collected.push({ id: meta.id, name: meta.name, path: fullPath });
        } catch {
          // Ignore malformed whiteboard files.
        }
      }
    };

    try {
      await walk(libraryPath);
      const byId = new Map();
      for (const wb of collected) if (!byId.has(wb.id)) byId.set(wb.id, wb);
      const deduped = [...byId.values()];
      pruneWhiteboards(deduped.map((wb) => wb.id));
      setAvailableWhiteboards(deduped);
    } catch (err) {
      console.warn('Failed to scan whiteboard files:', err);
      setAvailableWhiteboards([]);
    }
  }, []);

  useEffect(() => {
    refreshAvailableWhiteboards();
  }, [refreshAvailableWhiteboards]);

  const allWhiteboards = availableWhiteboards;  

  const handleCreateFromPanel = useCallback(async () => {
    if (selectPanelToolIdx === null) return;
    const trimmed = newGlobalWhiteboardName.trim();
    if (!trimmed) return;
    try {
      const wb = await createWhiteboard(trimmed, pdfDirectoryPath);
      setNewGlobalWhiteboardName('');
      await refreshAvailableWhiteboards();
      handleApplyGlobalToolSelection(selectPanelToolIdx, wb.id, wb.name);
    } catch (err) {
      showToast(err.message || 'Could not create whiteboard.', 'error');
    }
  }, [selectPanelToolIdx, newGlobalWhiteboardName, pdfDirectoryPath, handleApplyGlobalToolSelection, refreshAvailableWhiteboards, showToast]);

  // --- Dynamic Cursors ---
  const deleteCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23EF4444'><path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z'/></svg>") 12 12, auto`;
  const lassoCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233B82F6' stroke-width='2'><path d='M8 8c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6M4 20l5-5'/></svg>") 4 20, auto`;

  // Swapped Start/End logic as requested.
  const sectionStartCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23EF4444' stroke-width='3'><path d='M6 20v-8h12v8' /></svg>") 12 16, auto`;
  const sectionEndCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2310B981' stroke-width='3'><path d='M6 4v8h12V4' /></svg>") 12 8, auto`;

  let pdfCursor = 'default';
  if (movingRegion) pdfCursor = 'grabbing';
  else if (tool === 'remove') pdfCursor = deleteCursor;
  else if (tool === 'lasso') pdfCursor = lassoCursor;
  else if (tool === 'section') pdfCursor = sectionTarget === 'start' ? sectionStartCursor : sectionEndCursor;
  else if (tool === 'rect') pdfCursor = 'crosshair';

  // Layout & UI State
  const [leftPct, setLeftPct]       = useState(restoredSession?.leftPct ?? settings?.defaultSplit ?? 50);
  const [isResizing, setIsResizing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const containerRef = useRef(null);

  // Focus State: determines which shortcuts fire (updated on hover)
  const [activePane, setActivePane] = useState('pdf');

  // Tools & Regions
  const [tool, setTool]                   = useState('select');
  const [regions, setRegions]             = useState(restoredSession?.regions ?? []);
  const [selectedRegionId, setSelectedRegionId] = useState(restoredSession?.selectedRegionId ?? null);
  const [selectedGlobalToolIdx, setSelectedGlobalToolIdx] = useState(restoredSession?.selectedGlobalToolIdx ?? null);
  const [globalToolCount, setGlobalToolCount] = useState(
    Math.max(1, Math.min(restoredSession?.globalToolCount ?? 1, settings?.maxGlobalPdfTools ?? 8))
  );
  const [globalToolLinks, setGlobalToolLinks] = useState(() => {
    const max = settings?.maxGlobalPdfTools ?? 8;
    const count = Math.max(1, Math.min(restoredSession?.globalToolCount ?? 1, max));
    const restored = Array.isArray(restoredSession?.globalToolLinks) ? restoredSession.globalToolLinks : [];
    return Array.from({ length: count }, (_, i) => restored[i] ?? null);
  });
  const [selectPanelToolIdx, setSelectPanelToolIdx] = useState(null);
  const [activeGlobalToolControlsIdx, setActiveGlobalToolControlsIdx] = useState(null);
  const [globalToolDraftId, setGlobalToolDraftId] = useState(null);
  const [globalToolDraftName, setGlobalToolDraftName] = useState('');
  const [newGlobalWhiteboardName, setNewGlobalWhiteboardName] = useState('');
  const [viewStack, setViewStack] = useState([]);
  const [availableWhiteboards, setAvailableWhiteboards] = useState([]);
  const pdfDirectoryPath = useMemo(() => {
    if (!pdfLocalPath) return null;
    const slash = Math.max(pdfLocalPath.lastIndexOf('/'), pdfLocalPath.lastIndexOf('\\'));
    if (slash < 0) return null;
    return pdfLocalPath.slice(0, slash);
  }, [pdfLocalPath]);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => { dragStateRef.current = { currentDrag, movingRegion, lassoPoints }; }, [currentDrag, movingRegion, lassoPoints]);


  // Keyboard Shortcuts (Capture Phase)
  const handleKeyDown = useCallback((e) => {
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

    if (e.key === '\\' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!selectedRegionId && selectedGlobalToolIdx === null) return;
      setLeftPct(55);
      return;
    }

    if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setZoom(1);
      return;
    }

    // Global tool shortcuts: I->1, II->2, III->3, ...
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const n = Number.parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= globalToolCount) {
        e.preventDefault();
        const btn = document.querySelector(`button[title="Global Whiteboard Tool ${n}"]`);
        if (btn) btn.click();
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingShapeId) {
         setEditingShapeId(null);
         setShapeBackup(null);
         setTool('select');
      } else if (tool === 'section' && sectionY.start !== null && sectionY.end !== null) {
         const y1 = Math.min(sectionY.start, sectionY.end);
         const y2 = Math.max(sectionY.start, sectionY.end);
         if (editingSectionId) {
             setRegions(prev => prev.map(r => r.id === editingSectionId ? { ...r, y: y1, h: y2 - y1 } : r));
             setSelectedRegionId(editingSectionId);
             setEditingSectionId(null);
         } else {
             const newId = `reg_${Date.now()}`;
             setRegions(prev => [...prev, { id: newId, type: 'section', x: 0, y: y1, w: 16, h: y2 - y1 }]);
             setSelectedRegionId(newId);
         }
         setTool('select');
      }
      return;
    }

    if (e.key === 'Escape') {
      if (editingShapeId) {
         setRegions(prev => prev.map(r => r.id === shapeBackup?.id ? shapeBackup : r));
         setEditingShapeId(null);
         setShapeBackup(null);
         setTool('select');
      } else if (tool === 'section' && (editingSectionId || sectionY.start !== null || sectionY.end !== null)) {
         setEditingSectionId(null);
         setSectionY({ start: null, end: null });
         setSectionTarget('start');
         setTool('select');
      } else if (editingSectionId) {
         setEditingSectionId(null);
         setTool('select');
      } else if (selectPanelToolIdx !== null) {
         setSelectPanelToolIdx(null);
      } else if (selectedGlobalToolIdx !== null) {
         const prevView = viewStack[viewStack.length - 1];
         if (prevView) {
           setViewStack(prev => prev.slice(0, -1));
           if (prevView.type === 'global') {
             setSelectedRegionId(null);
             setSelectedGlobalToolIdx(prevView.idx);
             setActiveGlobalToolControlsIdx(prevView.idx);
           } else if (prevView.type === 'region') {
             setSelectedGlobalToolIdx(null);
             setActiveGlobalToolControlsIdx(null);
             setSelectedRegionId(prevView.id);
           }
         } else {
           setSelectedGlobalToolIdx(null);
           setActiveGlobalToolControlsIdx(null);
         }
      } else {
         setSelectedRegionId(null);
      }
      return;
    }

    if (activePane === 'pdf') {
      const k = e.key.toLowerCase();
      if (k === 'v') setTool('select');
      else if (k === 'r') setTool('rect');
      else if (k === 'c') setTool('lasso');
      else if (k === 's') setTool(t => t === 'section' ? 'select' : 'section');
      else if (k === 'x') setTool('remove');
      e.stopPropagation();
    }
  }, [activePane, selectedRegionId, selectedGlobalToolIdx, editingShapeId, shapeBackup, editingSectionId, sectionY, tool, selectPanelToolIdx, viewStack, globalToolCount]);

  

  const debouncedSaveSession = useMemo(
    () => debounce((data) => {
      saveSession(pdfPath, data);
      setLastSavedAt(Date.now());
    }, 600),
    [pdfPath]
  );

  const leftPctRef          = useRef(leftPct);
  useEffect(() => { leftPctRef.current = leftPct; }, [leftPct]);
  
  const persistSession = useCallback(() => {
    debouncedSaveSession({
      leftPct:          leftPctRef.current,
    })
  });

  useEffect(() => { persistSession(); }, [regions, selectedRegionId, leftPct, persistSession]);

  useEffect(() => {
    const onUnload = () => {
      debouncedSaveSession.flush({
        leftPct:          leftPctRef.current,
      });
    };
  window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [debouncedSaveSession]);
  

  const handleBackup = async () => {
    try {
      const idx = await performRollingBackup();
      showToast(`Workspace backed up! (backup_${idx}.json)`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  
  const activeWhiteboardId = selectedRegionId ?? (selectedGlobalToolIdx !== null ? globalToolLinks[selectedGlobalToolIdx] : null);

  return (
    <div
      onMouseEnter={() => setActivePane('whiteboard')}
      onWheelCapture={(e) => {
        if (e.nativeEvent.isTrusted && e.shiftKey && e.deltaY !== 0 && e.deltaX === 0) {
          e.stopPropagation(); e.preventDefault();
          const clone = new WheelEvent('wheel', { clientX: e.clientX, clientY: e.clientY, deltaX: e.deltaY, deltaY: 0, deltaMode: e.deltaMode, shiftKey: true, ctrlKey: e.ctrlKey, metaKey: e.metaKey, bubbles: true, cancelable: true });
          e.target.dispatchEvent(clone);
        }
      }}
      style={{ flex: 1, height: '100%', minWidth: 0, position: 'relative' }}
    >
      <WhiteboardPane key={activeWhiteboardId} regionId={activeWhiteboardId} settings={settings} />
    </div>
  );
}
