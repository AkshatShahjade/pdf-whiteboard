import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Tldraw, useEditor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  saveSession, loadSession,
  saveWhiteboard, loadWhiteboard, deleteWhiteboard,
  debounce,
} from './storage.js';
import HomeScreen, { loadSettings } from './HomeScreen.jsx';
import { confirm } from '@tauri-apps/plugin-dialog';

// Change to this:
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_PANE_PCT     = 15;
const MAX_PANE_PCT     = 85;
const STROKE_HIT_WIDTH = 12;

// ─── Geometry helpers ─────────────────────────────────────────────────────────
const getLocalCoords = (e, ref) => {
  if (!ref.current) return { x: 0, y: 0 };
  const rect = ref.current.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

const rectFromDrag = (drag) => ({
  x: Math.min(drag.startX, drag.currentX),
  y: Math.min(drag.startY, drag.currentY),
  w: Math.abs(drag.startX - drag.currentX),
  h: Math.abs(drag.startY - drag.currentY),
});

const isNearBorder = (coords, r, threshold = STROKE_HIT_WIDTH / 2) => {
  const { x, y } = coords;
  const inX = x >= r.x - threshold && x <= r.x + r.w + threshold;
  const inY = y >= r.y - threshold && y <= r.y + r.h + threshold;
  return (
    (Math.abs(x - r.x)         < threshold && inY) ||
    (Math.abs(x - (r.x + r.w)) < threshold && inY) ||
    (Math.abs(y - r.y)         < threshold && inX) ||
    (Math.abs(y - (r.y + r.h)) < threshold && inX)
  );
};

const isInsideRect = (coords, r, margin = STROKE_HIT_WIDTH / 2) =>
  coords.x > r.x + margin && coords.x < r.x + r.w - margin &&
  coords.y > r.y + margin && coords.y < r.y + r.h - margin;

// ─── Region colour palette ────────────────────────────────────────────────────
const REGION_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];
const regionColor = (id) =>
  REGION_COLORS[parseInt(id.replace('reg_', ''), 10) % REGION_COLORS.length];

// ─── LazyPage Component ────────────────────────────────────────────────────────
// Only renders the heavy PDF canvas when it scrolls near the viewport.
// ─── LazyPage Component ────────────────────────────────────────────────────────
// Only renders the heavy PDF canvas when it scrolls near the viewport.
function LazyPage({ pageNumber, width, scale }) {
  // Eagerly load the first 2 pages instantly. Lazy load the rest.
  const [isVisible, setIsVisible] = useState(pageNumber <= 2);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { rootMargin: '800px 0px' } 
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const placeholderHeight = width * scale * 1.414;

  return (
    <div ref={ref} style={{ 
      minHeight: placeholderHeight, 
      position: 'relative',
      borderBottom: '2px solid rgba(0, 0, 0, 0.92)', // Faint divider line
    }}>
      {isVisible && (
        <Page
          pageNumber={pageNumber}
          width={width}
          scale={scale}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      )}
    </div>
  );
}

// ─── SaveIndicator ────────────────────────────────────────────────────────────
// Small transient badge that appears whenever a save fires.
function SaveIndicator({ savedAt }) {
  const [visible, setVisible] = useState(false);
  const prev = useRef(null);

  useEffect(() => {
    if (savedAt && savedAt !== prev.current) {
      prev.current = savedAt;
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 1800);
      return () => clearTimeout(t);
    }
  }, [savedAt]);

  return (
    <span style={{
      fontSize: '10px',
      color: visible ? '#10B981' : 'transparent',
      transition: 'color 0.4s',
      fontFamily: "'IBM Plex Mono', monospace",
      letterSpacing: '0.02em',
    }}>
      ✓ saved
    </span>
  );
}

// ─── WhiteboardPane ───────────────────────────────────────────────────────────
// Isolated component so each region's Tldraw instance mounts fresh (via key),
// loads its snapshot from IndexedDB on mount, and auto-saves on every change.
function WhiteboardPane({ regionId }) {
  // Loaded snapshot from IDB — null means "not yet loaded", undefined means "no saved data"
  const [snapshot, setSnapshot] = useState(null);
  const [loaded, setLoaded]     = useState(false);

  // Load snapshot from IDB when regionId changes (i.e. on mount of this instance)
  useEffect(() => {
    let cancelled = false;
    loadWhiteboard(regionId).then((snap) => {
      if (!cancelled) {
        setSnapshot(snap ?? undefined); // undefined = no prior save, Tldraw starts blank
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [regionId]);

  if (!loaded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: '#0f1117',
        color: '#4b5563', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace",
      }}>
        loading workspace…
      </div>
    );
  }

  return <TldrawWithPersistence regionId={regionId} initialSnapshot={snapshot} />;
}

// Inner component — runs inside Tldraw's React context so it can call useEditor()
function TldrawWithPersistence({ regionId, initialSnapshot }) {
  // Debounced save function, stable for this regionId
  const debouncedSave = useMemo(
    () => debounce((snap) => saveWhiteboard(regionId, snap), 800),
    [regionId]
  );

  const handleMount = useCallback((editor) => {
    // Restore snapshot if one exists
    if (initialSnapshot) {
      try {
        editor.loadSnapshot(initialSnapshot);
      } catch (err) {
        console.warn('[LemmaMap] snapshot restore failed for', regionId, err);
      }
    }

    // Auto-save on every store change (shapes added/moved/deleted, etc.)
    const unsub = editor.store.listen(
      () => { debouncedSave(editor.getSnapshot()); },
      { source: 'user', scope: 'document' }
    );

    // Flush on unmount so no changes are lost when switching regions
    return () => {
      unsub();
      debouncedSave.flush(editor.getSnapshot());
    };
  }, [initialSnapshot, debouncedSave, regionId]);

  return <Tldraw onMount={handleMount} />;
}

// ─── Root ─────────────────────────────────────────────────────────────────────
// Simple client-side router: HomeScreen ↔ WorkspaceApp
export default function Root() {
  const [session, setSession] = useState(null); // { pdfPath, settings }

  if (!session) {
    return (
      <HomeScreen
        onOpen={(pdfPath, pdfFile, settings) =>
          setSession({ pdfPath, settings })
        }
      />
    );
  }

  return (
    <WorkspaceApp
      pdfPath={session.pdfPath}
      settings={session.settings}
      onHome={() => setSession(null)}
    />
  );
}

// ─── WorkspaceApp ─────────────────────────────────────────────────────────────
function WorkspaceApp({ pdfPath, settings, onHome }) {
  const PDF_WIDTH = 800;

  // PDF
  const [numPages, setNumPages]   = useState(null);
  const [pdfReady, setPdfReady]   = useState(false);
  const [pdfData, setPdfData]     = useState(null); // <-- Add this new state
  const pdfScrollRef = useRef(null);

  // ── Stable Reference for PDF Data ──
  // Prevents react-pdf from infinite-reloading and detaching the memory buffer
  const documentFile = useMemo(() => {
    return pdfData ? { data: pdfData } : null;
  }, [pdfData]);

  // ── Restore session synchronously from localStorage ──────────────────────
  const restoredSession = useMemo(() => loadSession(pdfPath), [pdfPath]);

  // Layout & UI State
  const [leftPct, setLeftPct]       = useState(restoredSession?.leftPct ?? settings?.defaultSplit ?? 50);
  const [isResizing, setIsResizing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef(null);


  // Tools & Regions
  const [tool, setTool]                   = useState('select');
  const [regions, setRegions]             = useState(restoredSession?.regions ?? []);
  const [selectedRegionId, setSelectedRegionId] = useState(restoredSession?.selectedRegionId ?? null);

  // Drag / move state
  const [currentDrag, setCurrentDrag]   = useState(null);
  const [movingRegion, setMovingRegion] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const pdfContentRef = useRef(null);


  // ── Auto-Scroll Refs ──
  const mousePosRef = useRef({ x: 0, y: 0 });
  const scrollAnimRef = useRef(null);
  const dragStateRef = useRef({ currentDrag: null, movingRegion: null }); // Initialize with nulls

  // Keep a stable ref of drag state for the animation frame
  useEffect(() => { 
    dragStateRef.current = { currentDrag, movingRegion }; 
  }, [currentDrag, movingRegion]);

  // ── Session persistence logic (unchanged) ───────────────────────────────
  const debouncedSaveSession = useMemo(
    () => debounce((data) => {
      saveSession(pdfPath, data);
      setLastSavedAt(Date.now());
    }, 600),
    [pdfPath]
  );

  const regionsRef          = useRef(regions);
  const selectedRegionIdRef = useRef(selectedRegionId);
  const leftPctRef          = useRef(leftPct);

  useEffect(() => { regionsRef.current = regions; }, [regions]);
  useEffect(() => { selectedRegionIdRef.current = selectedRegionId; }, [selectedRegionId]);
  useEffect(() => { leftPctRef.current = leftPct; }, [leftPct]);

  const persistSession = useCallback(() => {
    debouncedSaveSession({
      regions:          regionsRef.current,
      selectedRegionId: selectedRegionIdRef.current,
      scrollTop:        pdfScrollRef.current?.scrollTop ?? 0,
      leftPct:          leftPctRef.current,
    });
  }, [debouncedSaveSession]);

  useEffect(() => { persistSession(); }, [regions, selectedRegionId, leftPct, persistSession]);

  useEffect(() => {
    const onUnload = () => {
      debouncedSaveSession.flush({
        regions:          regionsRef.current,
        selectedRegionId: selectedRegionIdRef.current,
        scrollTop:        pdfScrollRef.current?.scrollTop ?? 0,
        leftPct:          leftPctRef.current,
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
  const handleScroll = useCallback(() => { debouncedScrollSave(); }, [debouncedScrollSave]);

  // ── Load PDF directly into Memory to bypass Tauri streaming bugs ──
  useEffect(() => {
    let active = true;
    setPdfData(null); // Reset when switching files
    
    fetch(pdfPath)
      .then(res => res.arrayBuffer())
      .then(buffer => {
        if (active) setPdfData(new Uint8Array(buffer)); // Pass raw binary to state
      })
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

  // ── Coordinate Translation for Zoom & Auto-Scroll ──────────────────────────
  const getUnscaledCoordsFromClient = useCallback((clientX, clientY) => {
    if (!pdfContentRef.current) return { x: 0, y: 0 };
    const rect = pdfContentRef.current.getBoundingClientRect();
    return { 
      x: (clientX - rect.left) / zoom, 
      y: (clientY - rect.top) / zoom 
    };
  }, [zoom]);

  const getUnscaledCoords = useCallback((e) => {
    return getUnscaledCoordsFromClient(e.clientX, e.clientY);
  }, [getUnscaledCoordsFromClient]);

  // ── PDF mouse handlers ────────────────────────────────────────────────────
  const handleDivMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const coords = getUnscaledCoords(e);
    const hitThreshold = (STROKE_HIT_WIDTH / 2) / zoom;

    if (e.ctrlKey || e.metaKey) {
      const hit = [...regions].reverse().find(
        (r) => isNearBorder(coords, r, hitThreshold) || isInsideRect(coords, r, hitThreshold)
      );
      if (hit) {
        e.preventDefault();
        setMovingRegion({ id: hit.id, offsetX: coords.x - hit.x, offsetY: coords.y - hit.y });
        setSelectedRegionId(hit.id);
      }
      return;
    }

    if (tool === 'rect') {
      setCurrentDrag({ startX: coords.x, startY: coords.y, currentX: coords.x, currentY: coords.y });
    }
  }, [tool, regions, zoom, getUnscaledCoords]);

  const handleDivMouseMove = useCallback((e) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY }; // Track for auto-scroll
    const coords = getUnscaledCoords(e);
    
    if (currentDrag) setCurrentDrag((p) => ({ ...p, currentX: coords.x, currentY: coords.y }));
    if (movingRegion) {
      setRegions((prev) =>
        prev.map((r) =>
          r.id === movingRegion.id
            ? { ...r, x: coords.x - movingRegion.offsetX, y: coords.y - movingRegion.offsetY }
            : r
        )
      );
    }
  }, [currentDrag, movingRegion, getUnscaledCoords]);

  const handleDivMouseUp = useCallback(() => {
    if (currentDrag) {
      const shape = rectFromDrag(currentDrag);
      if (shape.w > 10 / zoom && shape.h > 10 / zoom) {
        const newId = `reg_${Date.now()}`;
        setRegions((prev) => [...prev, { id: newId, ...shape }]);
        setSelectedRegionId(newId);
      }
    }
    setCurrentDrag(null);
    setMovingRegion(null);
  }, [currentDrag, zoom]);

  // ── Auto-Scroll During Drag ──
  useEffect(() => {
    const isDragging = !!currentDrag || !!movingRegion;
    
    if (!isDragging) {
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
      return;
    }

    const scrollStep = () => {
      if (pdfScrollRef.current) {
        const rect = pdfScrollRef.current.getBoundingClientRect();
        const edgeThreshold = 80; // How close to the edge to trigger scroll
        const maxSpeed = 22; // Pixels per frame max speed
        let scrolled = false;
        const { y: clientY, x: clientX } = mousePosRef.current;

        // Scroll Up
        if (clientY < rect.top + edgeThreshold) {
          const intensity = 1 - Math.max(0, clientY - rect.top) / edgeThreshold;
          pdfScrollRef.current.scrollTop -= maxSpeed * Math.pow(intensity, 1.5);
          scrolled = true;
        } 
        // Scroll Down
        else if (clientY > rect.bottom - edgeThreshold) {
          const intensity = 1 - Math.max(0, rect.bottom - clientY) / edgeThreshold;
          pdfScrollRef.current.scrollTop += maxSpeed * Math.pow(intensity, 1.5);
          scrolled = true;
        }

        // If the screen moved, we must recalculate the document coordinates
        // so the rectangle visually stretches with the scrolling document.
        if (scrolled) {
          const coords = getUnscaledCoordsFromClient(clientX, clientY);
          const state = dragStateRef.current;
          
          if (state.currentDrag) {
            setCurrentDrag(p => p ? { ...p, currentX: coords.x, currentY: coords.y } : p);
          }
          if (state.movingRegion) {
            setRegions((prev) =>
              prev.map((r) =>
                r.id === state.movingRegion.id
                  ? { ...r, x: coords.x - state.movingRegion.offsetX, y: coords.y - state.movingRegion.offsetY }
                  : r
              )
            );
          }
        }
      }
      scrollAnimRef.current = requestAnimationFrame(scrollStep);
    };

    scrollAnimRef.current = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(scrollAnimRef.current);
  }, [currentDrag, movingRegion, getUnscaledCoordsFromClient]);

  const handleBorderClick = useCallback(async (e, regionId) => {
    e.stopPropagation();
    
    if (tool === 'remove') {
      // Trigger the native OS confirmation dialog
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
      setSelectedRegionId(regionId);
    }
  }, [tool, selectedRegionId]);


  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') setSelectedRegionId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedRegionId]);

  const pdfCursor =
    movingRegion      ? 'grabbing' :
    tool === 'remove' ? 'crosshair' :
    tool === 'rect'   ? 'crosshair' :
                        'default';

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100vh', display: 'flex', overflow: 'hidden',
        background: '#111318', fontFamily: "'IBM Plex Mono', monospace",
        userSelect: isResizing ? 'none' : 'auto', maxWidth: '100vw',
        position: 'relative'
      }}
    >
      {/* ── TOP HEADER BAR (AUTO-HIDE) ── */}
      <div
        onMouseEnter={() => setHeaderVisible(true)}
        onMouseLeave={() => setHeaderVisible(false)}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: headerVisible ? '48px' : '12px', zIndex: 100,
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '48px',
          background: 'rgba(26,29,36,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: '16px',
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: headerVisible ? 1 : 0,
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <button
            onClick={onHome}
            title="Back to home"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 10px', borderRadius: '6px',
              border: '1px solid #374151', background: 'transparent',
              color: '#d1d5db', cursor: 'pointer', fontSize: '14px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.color='#d1d5db'; e.currentTarget.style.background='transparent'; }}
          >
            ⌂ Home
          </button>
          
          <span style={{
            fontSize: '13px', color: '#e5e7eb', fontWeight: 500, letterSpacing: '0.02em',
          }}>
            {decodeURIComponent(pdfPath).split(/[/\\]/).pop()}
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {regions.length > 0 && (
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                {regions.length} region{regions.length !== 1 ? 's' : ''}
                {selectedRegionId && ` · R${regions.findIndex(r => r.id === selectedRegionId) + 1} active`}
              </span>
            )}
            <SaveIndicator savedAt={lastSavedAt} />
          </div>
        </div>
      </div>

      {/* ── LEFT: PDF PANE WRAPPER ── */}
      <div style={{
        width: selectedRegionId ? `${leftPct}%` : '100%',
        height: '100%', flexShrink: 0, position: 'relative',
        transition: selectedRegionId ? 'none' : 'width 0.3s ease',
      }}>
        
        {/* Scrollable Container */}
        <div
          ref={pdfScrollRef}
          onScroll={handleScroll}
          style={{
            width: '100%', height: '100%', overflow: 'auto', 
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: '#1a1d24',
          }}
        >
          <div
            ref={pdfContentRef}
            onMouseDown={handleDivMouseDown}
            onMouseMove={handleDivMouseMove}
            onMouseUp={handleDivMouseUp}
            style={{
              position: 'relative', margin: '24px', background: 'white',
              display: 'inline-block', cursor: pdfCursor,
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
          >
            {documentFile ? (
              <Document 
                file={documentFile} 
                onLoadSuccess={({ numPages }) => {
                  setNumPages(numPages);
                  setPdfReady(true);
                }}
                onLoadError={(error) => console.error("PDF Load Error:", error)}
              >
                {Array.from({ length: numPages ?? 0 }, (_, i) => (
                  <LazyPage
                    key={`${pdfPath}-${i}`}
                    pageNumber={i + 1}
                    width={PDF_WIDTH}
                    scale={zoom}
                  />
                ))}
              </Document>
            ) : (
              <div style={{ padding: '40px', color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>
                Loading document into memory...
              </div>
            )}

            {/* Scaled SVG overlay */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 10, pointerEvents: 'none' }}>
              {regions.map((r, idx) => {
                const color      = regionColor(r.id);
                const isSelected = selectedRegionId === r.id;
                // Apply zoom to saved coordinates
                const rx = r.x * zoom, ry = r.y * zoom, rw = r.w * zoom, rh = r.h * zoom;
                
                return (
                  <g key={r.id}>
                    <g
                      style={{ pointerEvents: 'auto' }}
                      onMouseDown={(e) => {
                        if (e.ctrlKey || e.metaKey) { e.stopPropagation(); return; }
                        if (tool === 'rect') return;
                        e.stopPropagation();
                      }}
                      onClick={(e) => handleBorderClick(e, r.id)}
                    >
                      <rect
                        x={rx} y={ry} width={rw} height={rh}
                        fill="none" stroke="transparent" strokeWidth={STROKE_HIT_WIDTH}
                        style={{ pointerEvents: 'stroke', cursor: tool === 'select' ? 'pointer' : 'crosshair' }}
                      />
                    </g>
                    <rect
                      x={rx} y={ry} width={rw} height={rh}
                      fill={isSelected ? `${color}14` : 'none'}
                      stroke={color} strokeWidth={isSelected ? 2 : 1.5}
                      strokeDasharray={isSelected ? 'none' : '7 3'} rx={2}
                      style={{ pointerEvents: 'none', transition: 'fill 0.15s, stroke-width 0.1s' }}
                    />
                    <rect x={rx + 1} y={ry + 1} width={28} height={15} fill={color} rx={2} style={{ pointerEvents: 'none' }} />
                    <text
                      x={rx + 15} y={ry + 11} textAnchor="middle" fill="white" fontSize={9}
                      fontFamily="'IBM Plex Mono', monospace" fontWeight="700"
                      style={{ pointerEvents: 'none' }}
                    >{`R${idx + 1}`}</text>
                  </g>
                );
              })}

              {currentDrag && (() => {
                const { x, y, w, h } = rectFromDrag(currentDrag);
                return (
                  <rect x={x * zoom} y={y * zoom} width={w * zoom} height={h * zoom}
                    fill="rgba(59,130,246,0.07)" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 4" rx={2}
                    style={{ pointerEvents: 'none' }}
                  />
                );
              })()}
            </svg>
          </div>
        </div>

        {/* ── TOOLBOX (Vertical, Bottom Right) ── */}
        <div style={{
          position: 'absolute', bottom: '24px', right: '24px', zIndex: 50,
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          {/* Tools Group */}
          <div style={{
            background: 'rgba(26,29,36,0.95)', backdropFilter: 'blur(10px)',
            borderRadius: '8px', padding: '6px', border: '1px solid #2a2d36',
            display: 'flex', flexDirection: 'column', gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            {[
              { id: 'select', label: 'Select', key: 'S', icon: '↖' },
              { id: 'rect',   label: 'Region', key: 'R', icon: '▭' },
              { id: 'remove', label: 'Remove', key: 'X', icon: '✕' },
            ].map(({ id, label, key, icon }) => (
              <button key={id} onClick={() => setTool(id)} title={`${label} [${key}]`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px', borderRadius: '6px',
                  border: `1px solid ${tool === id ? '#3B82F6' : 'transparent'}`,
                  background: tool === id ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: tool === id ? '#60A5FA' : '#9ca3af',
                  cursor: 'pointer', fontSize: '18px', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (tool !== id) { e.currentTarget.style.color='#d1d5db'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; } }}
                onMouseLeave={e => { if (tool !== id) { e.currentTarget.style.color='#9ca3af'; e.currentTarget.style.background='transparent'; } }}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Zoom Group */}
          <div style={{
            background: 'rgba(26,29,36,0.95)', backdropFilter: 'blur(10px)',
            borderRadius: '8px', padding: '6px', border: '1px solid #2a2d36',
            display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} title="Zoom In" style={{
              width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', borderRadius: '4px'
            }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              +
            </button>
            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', margin: '2px 0' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} title="Zoom Out" style={{
              width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', borderRadius: '4px'
            }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              -
            </button>
          </div>
        </div>
      </div>

      {/* ── DIVIDER ── */}
      {selectedRegionId && (
        <div
          onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
          style={{
            width: '6px', flexShrink: 0, cursor: 'col-resize', zIndex: 20,
            background: isResizing ? '#3B82F6' : '#1e2128',
            borderLeft: '1px solid #2a2d36', borderRight: '1px solid #2a2d36',
            transition: isResizing ? 'none' : 'background 0.2s', position: 'relative',
          }}
        />
      )}

      {/* ── RIGHT: WHITEBOARD ── */}
      {selectedRegionId && (
        <div style={{ flex: 1, height: '100%', minWidth: 0, position: 'relative' }}>
          <WhiteboardPane key={selectedRegionId} regionId={selectedRegionId} />
        </div>
      )}

      {!selectedRegionId && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '0px', overflow: 'hidden' }} />
      )}
    </div>
  );
}