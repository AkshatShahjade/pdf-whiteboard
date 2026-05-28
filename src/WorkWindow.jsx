import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Tldraw, DefaultToolbar, DefaultToolbarContent, TldrawUiMenuItem, useTools, useIsToolSelected } from 'tldraw';
import 'tldraw/tldraw.css';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  saveSession, loadSession,
  saveWhiteboard, loadWhiteboard, deleteWhiteboard,
  debounce, performRollingBackup,
  createWhiteboard, pruneWhiteboards
} from './storage.js';
import HomeScreen, { loadSettings } from './HomeScreen.jsx';


import { HandwritingShapeUtil, HandwritingTool, handwritingToolUiOverrides } from './implementations/whiteboard/tools/editing/handwriting_whiteboard_editing_tool.jsx';
import { confirmErrorDialog, jjoin, rdTextFile, readDirAKS } from './platform_adapter/switch.ts';
import { getMarkType } from './capabilty_registry/pdf/mark_registry.ts';
import { setupAllRegistries } from './capabilty_registry/setup_all.ts';
import { dist2, distToSegmentSquared } from './helper.ts';

setupAllRegistries(); //TODO, find proper place


const handwritingAssetUrls = {
  icons: {
    'tool-handwriting': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zIDEyYzMtMyAzIDMgNiAwczMtMyA2IDAgMyAzIDYgMCIvPjwvc3ZnPg==',
  },
};

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_PANE_PCT     = 15;
const MAX_PANE_PCT     = 85;
const STROKE_HIT_WIDTH = 12;

// ─── Region colour palette ────────────────────────────────────────────────────
const REGION_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];
const regionColor = (id) => REGION_COLORS[parseInt(id.replace('reg_', ''), 10) % REGION_COLORS.length];

function toRoman(n) {
  const numerals = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let num = n;
  let out = '';
  for (const [value, symbol] of numerals) {
    while (num >= value) {
      out += symbol;
      num -= value;
    }
  }
  return out || 'I';
}

// ─── LazyPage Component ────────────────────────────────────────────────────────
function LazyPage({ pageNumber, width, scale }) {
  const [isVisible, setIsVisible] = useState(pageNumber <= 2);
  const ref = useRef(null);

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

// OOGA BOOGA
// ─── SaveIndicator ────────────────────────────────────────────────────────────
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
    <span style={{ fontSize: '10px', color: visible ? '#34D399' : 'transparent', transition: 'color 0.4s', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      ✓ saved
    </span>
  );
}

// ─── WhiteboardPane ───────────────────────────────────────────────────────────
function WhiteboardPane({ regionId, settings }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadWhiteboard(regionId).then((snap) => {
      if (!cancelled) {
        setSnapshot(snap ?? undefined);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [regionId]);

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1c1f26', color: '#9ca3af', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace" }}>
        loading workspace…
      </div>
    );
  }

  return <TldrawWithPersistence regionId={regionId} initialSnapshot={snapshot} settings={settings} />;
}

function TldrawWithPersistence({ regionId, initialSnapshot, settings }) {
  const debouncedSave = useMemo(() => debounce((snap) => saveWhiteboard(regionId, snap), 800), [regionId]);

  const handleMount = useCallback((editor) => {
    if (initialSnapshot) {
      try { editor.loadSnapshot(initialSnapshot); } catch (err) { console.warn(err); }
    }
    editor.setCurrentTool(settings?.defaultTool || 'draw');
    editor.updateInstanceState({ exportBackground: false });

    // (The invalid updateUserPreferences call that caused the crash was removed from here)

    const unsub = editor.store.listen(
      () => { debouncedSave(editor.getSnapshot()); },
      { source: 'user', scope: 'document' }
    );
    return () => { unsub(); debouncedSave.flush(editor.getSnapshot()); };
  }, [initialSnapshot, debouncedSave, regionId]);

  const handwritingComponents = {
    Toolbar: (props) => {
      const tools = useTools();
      const isSelected = useIsToolSelected(tools['handwriting']);
      return (
        <DefaultToolbar {...props}>
          <TldrawUiMenuItem {...tools['handwriting']} isSelected={isSelected} />
          <DefaultToolbarContent />
        </DefaultToolbar>
      );
    },
  };

  return (
    <>
      <style>{`
        /* Overrides tldraw's default internal font variables */
        .tl-container {
          --tl-font-draw: 'Helvetica', Arial, sans-serif;
          --tl-font-sans: 'Helvetica', Arial, sans-serif;
          --tl-font-serif: 'Helvetica', Arial, sans-serif;
          --tl-font-mono: 'Helvetica', Arial, sans-serif;
        }
      `}</style>
      <Tldraw
        onMount={handleMount}
        tools={[HandwritingTool]}
        shapeUtils={[HandwritingShapeUtil]}
        overrides={handwritingToolUiOverrides}
        assetUrls={handwritingAssetUrls}
        components={handwritingComponents}
      />
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Root() {
  const [session, setSession] = useState(null);

  if (!session) {
    return (
      <HomeScreen
        onOpen={(pdfPath, whiteboard, settings, pdfLocalPath) => {
          if (whiteboard?.id) {
            setSession({ mode: 'whiteboard', whiteboardId: whiteboard.id, whiteboardName: whiteboard.name, settings });
            return;
          }
          setSession({ mode: 'pdf', pdfPath, pdfLocalPath, settings });
        }}
      />
    );
  }
  if (session.mode === 'whiteboard') {
    return (
      <WhiteboardOnlyApp
        whiteboardId={session.whiteboardId}
        whiteboardName={session.whiteboardName}
        settings={session.settings}
        onHome={() => setSession(null)}
      />
    );
  }
  return <WorkspaceApp pdfPath={session.pdfPath} pdfLocalPath={session.pdfLocalPath} settings={session.settings} onHome={() => setSession(null)} />;
}

function WorkspaceHeader({ title, onHome, onBackup, savedAt, headerVisible, setHeaderVisible }) {
  return (
    <div
      onMouseEnter={() => setHeaderVisible(true)}
      onMouseLeave={() => setHeaderVisible(false)}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: headerVisible ? '48px' : '16px', zIndex: 10000, pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'auto' }} />
      <div style={{ position: 'relative', zIndex: 10001, display: 'flex', alignItems: 'center', gap: '16px', padding: '0 24px', height: '48px', background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '0 0 12px 12px', border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none', pointerEvents: 'auto', transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)', opacity: headerVisible ? 1 : 0, transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <button
          onClick={onHome}
          title="Back to home"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #4b5563', background: 'transparent', color: '#e5e7eb', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#e5e7eb'; e.currentTarget.style.background = 'transparent'; }}
        >
          ⌂ Home
        </button>
        <span style={{ fontSize: '13px', color: '#f3f4f6', fontWeight: 500, letterSpacing: '0.02em', padding: '0 8px' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={onBackup}
            title="Rolling Backup"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #4b5563', background: 'transparent', color: '#d1d5db', cursor: 'pointer', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace", transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#93C5FD'; e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.borderColor = '#4b5563'; e.currentTarget.style.background = 'transparent'; }}
          >
            💾 Backup
          </button>
          <div style={{ minWidth: '55px' }}>
            <SaveIndicator savedAt={savedAt} />
          </div>
        </div>
      </div>
    </div>
  );
}

function WhiteboardOnlyApp({ whiteboardId, whiteboardName, settings, onHome }) {
  const [headerVisible, setHeaderVisible] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  const handleBackup = async () => {
    try {
      const idx = await performRollingBackup();
      setLastSavedAt(Date.now());
      showToast(`Workspace backed up! (backup_${idx}.json)`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: '#1c1f26', position: 'relative', overflow: 'hidden', fontFamily: "'IBM Plex Mono', monospace" }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)', backdropFilter: 'blur(8px)', border: `1px solid ${toast.type === 'error' ? '#F87171' : '#34D399'}`, color: '#fff', padding: '10px 20px', borderRadius: '8px', zIndex: 9999, fontSize: '12px', fontWeight: '500', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {toast.type === 'error' ? '⚠' : '✓'} {toast.msg}
        </div>
      )}
      <WorkspaceHeader title={`Whiteboard: ${whiteboardName || 'Untitled'}`} onHome={onHome} onBackup={handleBackup} savedAt={lastSavedAt} headerVisible={headerVisible} setHeaderVisible={setHeaderVisible} />
      <div style={{ width: '100%', height: '100%' }}>
        <WhiteboardPane regionId={whiteboardId} settings={settings} />
      </div>
    </div>
  );
}

// ─── WorkspaceApp ─────────────────────────────────────────────────────────────
function WorkspaceApp({ pdfPath, pdfLocalPath, settings, onHome }) {
  const PDF_WIDTH = 800;

  // PDF
  const [numPages, setNumPages]   = useState(null);
  const [pdfReady, setPdfReady]   = useState(false);
  const [pdfData, setPdfData]     = useState(null);
  const pdfScrollRef = useRef(null);
  const documentFile = useMemo(() => pdfData ? { data: pdfData } : null, [pdfData]);
  const restoredSession = useMemo(() => loadSession(pdfPath), [pdfPath]);

  // Layout & UI State
  const [leftPct, setLeftPct]       = useState(restoredSession?.leftPct ?? settings?.defaultSplit ?? 50);
  const [isResizing, setIsResizing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput]     = useState('1');
  const containerRef = useRef(null);

  // Focus State: determines which shortcuts fire (updated on hover)
  const [activePane, setActivePane] = useState('pdf');

  // Tools & Regions
  const [tool, setTool]                   = useState('select');
  const [regions, setMarks]             = useState(restoredSession?.regions ?? []);
  const [selectedRegionId, setSelectedMarkId] = useState(restoredSession?.selectedRegionId ?? null);
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

  // Tools Specific State
  const [sectionY, setSectionY] = useState({ start: null, end: null });
  const [sectionTarget, setSectionTarget] = useState('start');
  const [editingSectionId, setEditingSectionId] = useState(null);

  // Edit mode for Rect and Lasso
  const [editingShapeId, setEditingShapeId] = useState(null);
  const [shapeBackup, setShapeBackup]       = useState(null);
  const [lassoPoints, setLassoPoints] = useState(null);

  // Drag / move state
  const [currentDrag, setCurrentDrag]   = useState(null);
  const [currentSelection, setCurrentSelection]  = useState(null);

  const [movingRegion, setMovingRegion] = useState(null);

  const [lastSavedAt, setLastSavedAt] = useState(null);
  const pdfContentRef = useRef(null);

  const mousePosRef = useRef({ x: 0, y: 0 });
  const scrollAnimRef = useRef(null);
  const dragStateRef = useRef({ currentSelection, currentDrag, movingRegion, lassoPoints });

  const zoomTimeoutRef = useRef(null);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => { dragStateRef.current = { currentSelection, currentDrag, movingRegion, lassoPoints }; }, [currentSelection, currentDrag, movingRegion, lassoPoints]);

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
             setMarks(prev => prev.map(r => r.id === editingSectionId ? { ...r, y: y1, h: y2 - y1 } : r));
             setSelectedMarkId(editingSectionId);
             setEditingSectionId(null);
         } else {
             const newId = `reg_${Date.now()}`;
             setMarks(prev => [...prev, { id: newId, type: 'section', x: 0, y: y1, w: 16, h: y2 - y1 }]);
             setSelectedMarkId(newId);
         }
         setTool('select');
      }
      return;
    }

    if (e.key === 'Escape') {
      if (editingShapeId) {
         setMarks(prev => prev.map(r => r.id === shapeBackup?.id ? shapeBackup : r));
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
             setSelectedMarkId(null);
             setSelectedGlobalToolIdx(prevView.idx);
             setActiveGlobalToolControlsIdx(prevView.idx);
           } else if (prevView.type === 'region') {
             setSelectedGlobalToolIdx(null);
             setActiveGlobalToolControlsIdx(null);
             setSelectedMarkId(prevView.id);
           }
         } else {
           setSelectedGlobalToolIdx(null);
           setActiveGlobalToolControlsIdx(null);
         }
      } else {
         setSelectedMarkId(null);
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
  const selectedGlobalToolIdxRef = useRef(selectedGlobalToolIdx);
  const globalToolCountRef = useRef(globalToolCount);
  const globalToolLinksRef = useRef(globalToolLinks);

  useEffect(() => { regionsRef.current = regions; }, [regions]);
  useEffect(() => { selectedRegionIdRef.current = selectedRegionId; }, [selectedRegionId]);
  useEffect(() => { leftPctRef.current = leftPct; }, [leftPct]);
  useEffect(() => { selectedGlobalToolIdxRef.current = selectedGlobalToolIdx; }, [selectedGlobalToolIdx]);
  useEffect(() => { globalToolCountRef.current = globalToolCount; }, [globalToolCount]);
  useEffect(() => { globalToolLinksRef.current = globalToolLinks; }, [globalToolLinks]);

  const persistSession = useCallback(() => {
    debouncedSaveSession({
      regions:          regionsRef.current,
      selectedRegionId: selectedRegionIdRef.current,
      selectedGlobalToolIdx: selectedGlobalToolIdxRef.current,
      scrollTop:        pdfScrollRef.current?.scrollTop ?? 0,
      leftPct:          leftPctRef.current,
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
        leftPct:          leftPctRef.current,
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
      // TODO add support for custom sized pages not only A4
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

  const handleDivPointerDown = useCallback((e) => {
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
          return getMarkType(r.type).hasSelectedBorder(coords, r, hitThreshold);
          // return isNearLassoBorder(coords, r, hitThreshold);
        }
        if(r.type === 'rect') {
          return getMarkType(r.type).hasSelectedBorder(coords, r, hitThreshold);
        }
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
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setSectionY(prev => ({ ...prev, [sectionTarget]: coords.y }));
      if (sectionTarget === 'start' && sectionY.end === null) setSectionTarget('end');
      else if (sectionTarget === 'end' && sectionY.start === null) setSectionTarget('start');
      return;
    }

    if (tool === 'lasso') {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      // setLassoPoints({type: 'lasso',  points:[{ x: coords.x, y: coords.y }]});
      setCurrentSelection(getMarkType(tool).initiateShape(coords))
      return;
    }

    if (tool === 'rect') {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      // setCurrentDrag({ type:'rect', startX: coords.x, startY: coords.y, currentX: coords.x, currentY: coords.y });
      setCurrentSelection(getMarkType(tool).initiateShape(coords))
    }

  }, [tool, regions, zoom, getUnscaledCoords, sectionTarget, sectionY, sectionWidths, editingShapeId]);

  const handleDivPointerMove = useCallback((e) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    const coords = getUnscaledCoords(e);

    if(currentSelection) {
      setCurrentSelection((prev) =>
        prev ? getMarkType(prev.type).updateSelection(prev, coords, {
          minPointDistance: 2 / zoom, // TODO: remove hardcoding 2, create variable
        }) : prev
      );    
    }
    
    // if (currentDrag) setCurrentDrag((p) => ({ ...p, currentX: coords.x, currentY: coords.y }));

    // if (lassoPoints) {
    //   setLassoPoints((prev) => {
    //     if (!prev || prev.points.length === 0) {
    //       return prev;
    //     }
    //     const last = prev.points[prev.points.length - 1];
    //     if (Math.abs(last.x - coords.x) > 2 / zoom || Math.abs(last.y - coords.y) > 2 / zoom) {
    //       return {...prev, points: [...prev.points, { x: coords.x, y: coords.y }]};
    //     }
    //     return prev;
    //   });
    // }

    if (movingRegion) {
      setMarks((prev) =>
        prev.map((r) => {
          if (r.id === movingRegion.id) {
            if (r.type === 'section') return { ...r, y: coords.y - movingRegion.offsetY };
            return { ...r, x: coords.x - movingRegion.offsetX, y: coords.y - movingRegion.offsetY };
          }
          return r;
        })
      );
    }
  }, [currentSelection, currentDrag, movingRegion, lassoPoints, zoom, getUnscaledCoords]);

  const handleDivPointerUp = useCallback((e) => {
    if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if(currentSelection){
      const shape = getMarkType(currentSelection.type).createFinalizedShape(currentSelection)
      if (shape && shape.w > 10 / zoom && shape.h > 10 / zoom) {
        if(editingShapeId && tool === currentSelection.type) {
          setMarks(prev => prev.map(r => r.id === editingShapeId ? { ...r, ...shape } : r));
        } else {
          const newId = `reg_${Date.now()}`; // TODO: create proper ID creation place....
          setMarks((prev) => [...prev, { id: newId, type: currentSelection.type, ...shape }]);
          setSelectedMarkId(newId);
        }
      }
      setCurrentSelection(null);
    }
    
    // if (currentDrag) {
    //   const shape = getMarkType('rect').createFinalizedShape(currentDrag)
    //   if (!shape) {
    //     setCurrentDrag(null);
    //     return;
    //   }
    //   if (shape.w > 10 / zoom && shape.h > 10 / zoom) {
    //     if (editingShapeId && tool === 'rect') {
    //        setMarks(prev => prev.map(r => r.id === editingShapeId ? { ...r, ...shape } : r));
    //     } else {
    //        const newId = `reg_${Date.now()}`;
    //        setMarks((prev) => [...prev, { id: newId, type: 'rect', ...shape }]);
    //        setSelectedMarkId(newId);
    //     }
    //   }
    //   setCurrentDrag(null);
    // }

    // if (lassoPoints) {
    //     const shape = getMarkType('lasso').createFinalizedShape(lassoPoints)
    //     if (shape && shape.w > 10 / zoom && shape.h > 10 / zoom) {
    //       if (editingShapeId && tool === 'lasso') {
    //          setMarks(prev => prev.map(r => r.id === editingShapeId ? { ...r, ...shape } : r));
    //       } else {
    //          const newId = `reg_${Date.now()}`;
    //          setMarks(prev => [...prev, { id: newId, type: 'lasso', ...shape }]);
    //          setSelectedMarkId(newId);
    //       }
    //     }
    //     setLassoPoints(null);
    //   }

    setMovingRegion(null);
  }, [currentSelection, currentDrag, lassoPoints, zoom, editingShapeId, tool]);

  useEffect(() => {
    const isDragging = !!currentSelection || !!currentDrag || !!movingRegion || !!lassoPoints;

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

          if(currentSelection) {
            setCurrentSelection((prev) =>
              prev ? getMarkType(prev.type).updateSelection(prev, coords, {
                minPointDistance: 2 / zoom, // TODO: remove hardcoding 2, create variable
              }) : prev
            );    
          }

          // if (currentDrag) setCurrentDrag((p) => ({ ...p, currentX: coords.x, currentY: coords.y }));

          // if (lassoPoints) {
          //   setLassoPoints((prev) => {
          //     if (!prev || prev.points.length === 0) {
          //       return prev;
          //     }
          //     const last = prev.points[prev.points.length - 1];
          //     if (Math.abs(last.x - coords.x) > 2 / zoom || Math.abs(last.y - coords.y) > 2 / zoom) {
          //       return { ...prev, points: [...prev.points, { x: coords.x, y: coords.y }] };
          //     }
          //     return prev;
          //   });
          // }
          
          if (state.movingRegion) {
            setMarks((prev) =>
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
  }, [currentSelection, currentDrag, movingRegion, lassoPoints, zoom, getUnscaledCoordsFromClient]);

  const handleBorderClick = useCallback(async (e, regionId) => {
    e.stopPropagation();

    if (tool === 'remove') {
      const isConfirmed = await confirmErrorDialog(
        'Are you sure you want to delete this region? Its whiteboard data will be permanently lost.',
        'Delete Whiteboard'
      );

      if (isConfirmed) {
        setMarks((prev) => prev.filter((r) => r.id !== regionId));
        deleteWhiteboard(regionId);
        if (selectedRegionId === regionId) setSelectedMarkId(null);
      }
    } else if (tool === 'select') {
      setSelectedGlobalToolIdx(null);
      setActiveGlobalToolControlsIdx(null);
      setSelectPanelToolIdx(null);
      setViewStack([]);
      setSelectedMarkId(regionId);
    }
  }, [tool, selectedRegionId]);

  const handleBackup = async () => {
    try {
      const idx = await performRollingBackup();
      showToast(`Workspace backed up! (backup_${idx}.json)`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const refreshAvailableWhiteboards = useCallback(async () => {
    const libraryPath = localStorage.getItem('lemmamap:library');
    if (!libraryPath) {
      setAvailableWhiteboards([]);
      return;
    }

    const collected = [];
    const walk = async (dir) => {
      const items = await readDirAKS(dir);
      for (const item of items) {
        const fullPath = await jjoin(dir, item.name);
        if (item.isDirectory) {
          await walk(fullPath);
          continue;
        }
        if (!item.isFile || !item.name.toLowerCase().endsWith('.whiteboard.json')) continue;
        try {
          const raw = await rdTextFile(fullPath);
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
    setSelectedMarkId(null);
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
    setSelectedMarkId(null);
    setSelectedGlobalToolIdx(idx);
    setActiveGlobalToolControlsIdx(idx);
    setSelectPanelToolIdx(null);
    setGlobalToolDraftId(whiteboardId);
    if (whiteboardName) setGlobalToolDraftName(whiteboardName);
  }, [pushCurrentViewToStack]);

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

  const activeWhiteboardId = selectedRegionId ?? (selectedGlobalToolIdx !== null ? globalToolLinks[selectedGlobalToolIdx] : null);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh', display: 'flex', overflow: 'hidden', background: '#1c1f26', fontFamily: "'IBM Plex Mono', monospace", userSelect: isResizing ? 'none' : 'auto', maxWidth: '100vw', position: 'relative' }}
    >
      <style>{`
        ::-webkit-scrollbar { width: 14px; height: 14px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.5); border-radius: 7px; border: 4px solid transparent; background-clip: padding-box; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.7); }
      `}</style>

      {/* Global Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
          backdropFilter: 'blur(8px)', border: `1px solid ${toast.type === 'error' ? '#F87171' : '#34D399'}`,
          color: '#fff', padding: '10px 20px', borderRadius: '8px', zIndex: 9999,
          fontSize: '12px', fontWeight: '500', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeInUp 0.3s ease-out forwards'
        }}>
          {toast.type === 'error' ? '⚠' : '✓'} {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>

      <WorkspaceHeader
        title={decodeURIComponent(pdfPath).split(/[/\\]/).pop()}
        onHome={onHome}
        onBackup={handleBackup}
        savedAt={lastSavedAt}
        headerVisible={headerVisible}
        setHeaderVisible={setHeaderVisible}
      />

      {/* ── LEFT: PDF PANE WRAPPER ── */}
      <div
        onMouseEnter={() => setActivePane('pdf')}
        style={{ width: activeWhiteboardId ? `${leftPct}%` : '100%', height: '100%', flexShrink: 0, position: 'relative', transition: activeWhiteboardId ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.3s ease' }}
      >
        <div ref={pdfScrollRef} onScroll={handleScroll} style={{ width: '100%', height: '100%', overflow: 'auto', textAlign: 'center', background: '#262a33', position: 'relative' }}>
          <div ref={pdfContentRef} onPointerDown={handleDivPointerDown} onPointerMove={handleDivPointerMove} onPointerUp={handleDivPointerUp} style={{ position: 'relative', margin: '24px', background: 'white', display: 'inline-block', textAlign: 'left', cursor: pdfCursor, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
            {documentFile ? (
              <Document file={documentFile} onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPdfReady(true); }} onLoadError={(error) => console.error("PDF Load Error:", error)}>
                {Array.from({ length: numPages ?? 0 }, (_, i) => (
                  <LazyPage key={`${pdfPath}-${i}`} pageNumber={i + 1} width={PDF_WIDTH} scale={zoom} />
                ))}
              </Document>
            ) : (
              <div style={{ padding: '40px', color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>Loading document into memory...</div>
            )}

            {/* Scaled SVG overlay */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 10, pointerEvents: 'none' }}>

              {tool === 'section' && sectionY.start !== null && <line x1={0} x2={PDF_WIDTH * zoom} y1={sectionY.start * zoom} y2={sectionY.start * zoom} stroke="#10B981" strokeWidth={1.5} strokeDasharray="6 4" />}
              {tool === 'section' && sectionY.end !== null && <line x1={0} x2={PDF_WIDTH * zoom} y1={sectionY.end * zoom} y2={sectionY.end * zoom} stroke="#10B981" strokeWidth={1.5} strokeDasharray="6 4" />}

              {regions.map((r, idx) => {
                const color      = regionColor(r.id);
                const isSelected = selectedRegionId === r.id;
                const rx = r.x * zoom, ry = r.y * zoom, rw = r.w * zoom, rh = r.h * zoom;

                if (r.type === 'section') {
                  const sw = sectionWidths[r.id];
                  const leftW = sw * zoom;
                  const rightX = PDF_WIDTH * zoom - leftW;
                  return (
                    <g key={r.id}>
                      <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (tool === 'section' || tool === 'rect' || tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; handleBorderClick(e, r.id); }}>
                        <rect x={0} y={ry} width={Math.max(leftW, 24 * zoom)} height={rh} fill="transparent" style={{ cursor: tool === 'select' ? 'pointer' : 'crosshair' }} />
                      </g>
                      <rect x={0} y={ry} width={leftW} height={rh} fill={color} opacity={isSelected ? 0.66 : 0.33} style={{ transition: 'opacity 0.15s', pointerEvents: 'none' }} />
                      <rect x={leftW + 2} y={ry + 4} width={28} height={15} fill={color} rx={2} style={{ pointerEvents: 'none' }} />
                      <text x={leftW + 16} y={ry + 14} textAnchor="middle" fill="white" fontSize={9} fontWeight="700" style={{ pointerEvents: 'none' }}>{`S${idx + 1}`}</text>

                      <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (tool === 'section' || tool === 'rect' || tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; handleBorderClick(e, r.id); }}>
                        <rect x={rightX} y={ry} width={Math.max(leftW, 24 * zoom)} height={rh} fill="transparent" style={{ cursor: tool === 'select' ? 'pointer' : 'crosshair' }} />
                      </g>
                      <rect x={rightX} y={ry} width={leftW} height={rh} fill={color} opacity={isSelected ? 0.66 : 0.33} style={{ transition: 'opacity 0.15s', pointerEvents: 'none' }} />
                      <rect x={rightX - 30} y={ry + 4} width={28} height={15} fill={color} rx={2} style={{ pointerEvents: 'none' }} />
                      <text x={rightX - 16} y={ry + 14} textAnchor="middle" fill="white" fontSize={9} fontWeight="700" style={{ pointerEvents: 'none' }}>{`S${idx + 1}`}</text>
                    </g>
                  );
                }

                if (r.type === 'lasso') {
                  const pointsStr = r.points.map(p => `${rx + (p.x * zoom)},${ry + (p.y * zoom)}`).join(' ');
                  return (
                    <g key={r.id}>
                      <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (tool === 'rect' || tool === 'section' || tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; handleBorderClick(e, r.id); }}>
                        <polygon points={pointsStr} fill="transparent" stroke="transparent" strokeWidth={STROKE_HIT_WIDTH} style={{ pointerEvents: 'stroke', cursor: tool === 'select' ? 'pointer' : 'crosshair' }} />
                      </g>
                      <polygon points={pointsStr} fill={isSelected ? `${color}1A` : 'none'} stroke={color} strokeWidth={isSelected ? 2 : 1.5} strokeDasharray={isSelected ? 'none' : '7 3'} style={{ pointerEvents: 'none', transition: 'fill 0.15s, stroke-width 0.1s' }} />
                      <rect x={rx + 1} y={ry + 1} width={28} height={15} fill={color} rx={2} style={{ pointerEvents: 'none' }} />
                      <text x={rx + 15} y={ry + 11} textAnchor="middle" fill="white" fontSize={9} fontFamily="'IBM Plex Mono', monospace" fontWeight="700" style={{ pointerEvents: 'none' }}>{`R${idx + 1}`}</text>
                    </g>
                  );
                }

                return (
                  <g key={r.id}>
                    <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (tool === 'rect' || tool === 'section' || tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; handleBorderClick(e, r.id); }}>
                      <rect x={rx} y={ry} width={rw} height={rh} fill="none" stroke="transparent" strokeWidth={STROKE_HIT_WIDTH} style={{ pointerEvents: 'stroke', cursor: tool === 'select' ? 'pointer' : 'crosshair' }} />
                    </g>
                    <rect x={rx} y={ry} width={rw} height={rh} fill={isSelected ? `${color}1A` : 'none'} stroke={color} strokeWidth={isSelected ? 2 : 1.5} strokeDasharray={isSelected ? 'none' : '7 3'} rx={2} style={{ pointerEvents: 'none', transition: 'fill 0.15s, stroke-width 0.1s' }} />
                    <rect x={rx + 1} y={ry + 1} width={28} height={15} fill={color} rx={2} style={{ pointerEvents: 'none' }} />
                    <text x={rx + 15} y={ry + 11} textAnchor="middle" fill="white" fontSize={9} fontFamily="'IBM Plex Mono', monospace" fontWeight="700" style={{ pointerEvents: 'none' }}>{`R${idx + 1}`}</text>
                  </g>
                );
              })}

              {currentSelection && 
                getMarkType(currentSelection.type).renderSelectionPreview(currentSelection, {zoom: zoom})
              } 
              
              {/* } {currentDrag && (() => {
                const { x, y, w, h } = rectFromDrag(currentDrag);
                return (
                  <rect x={x * zoom} y={y * zoom} width={w * zoom} height={h * zoom} fill="rgba(59,130,246,0.1)" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 4" rx={2} style={{ pointerEvents: 'none' }} />
                );
              })()}

              {lassoPoints && lassoPoints.points.length > 0 && (
                <polyline points={lassoPoints.points.map(p => `${p.x * zoom},${p.y * zoom}`).join(' ')} fill="rgba(59,130,246,0.1)" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 4" style={{ pointerEvents: 'none' }} />
              )}
              */}
            </svg>
          </div>
        </div>

        {/* ── BOTTOM NAV: Page Control ── */}
        <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Page</span>
          <input
            id="page-input" type="text" value={pageInput}
            onChange={e => setPageInput(e.target.value)}
            onKeyDown={handlePageSubmit}
            onBlur={() => setPageInput(String(currentPage))}
            style={{ width: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid #4b5563', color: '#fff', textAlign: 'center', borderRadius: '4px', fontSize: '11px', padding: '2px 0', outline: 'none' }}
          />
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>/ {numPages || '-'}</span>
        </div>

        {/* ── TOOLBOX (Vertical, Bottom Right) ── */}
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
                <button onClick={() => { setSelectedGlobalToolIdx(null); setActiveGlobalToolControlsIdx(null); setSelectPanelToolIdx(null); if (tool === 'section' && id === 'section') setTool('select'); else setTool(id); }} title={`${label} [${key}]`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${tool === id ? '#3B82F6' : 'transparent'}`, background: tool === id ? 'rgba(59,130,246,0.2)' : 'transparent', color: tool === id ? '#93C5FD' : '#d1d5db', cursor: 'pointer', fontSize: '18px', transition: 'all 0.15s' }} onMouseEnter={e => { if (tool !== id) { e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.1)'; } }} onMouseLeave={e => { if (tool !== id) { e.currentTarget.style.color='#d1d5db'; e.currentTarget.style.background='transparent'; } }}>
                  {icon}
                </button>

                {/* ── SECTION MINI MENU ── */}
                {tool === 'section' && id === 'section' && (
                  <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(38,42,51,0.85)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', alignItems: 'center' }}>
                    {(() => {
                      const color = sectionY.start !== null ? '#10B981' : '#F87171';
                      const isActive = sectionTarget === 'start';
                      return (<button onClick={() => setSectionTarget('start')} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${color}`, background: isActive ? `${color}40` : 'transparent', color: color, transition: 'all 0.15s' }}>Start</button>);
                    })()}
                    {(() => {
                      const color = sectionY.end !== null ? '#10B981' : '#F87171';
                      const isActive = sectionTarget === 'end';
                      return (<button onClick={() => setSectionTarget('end')} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${color}`, background: isActive ? `${color}40` : 'transparent', color: color, transition: 'all 0.15s' }}>End</button>);
                    })()}
                    {(() => {
                      const canConfirm = sectionY.start !== null && sectionY.end !== null;
                      return (
                        <>
                          <button disabled={!canConfirm} onClick={() => {
                              const y1 = Math.min(sectionY.start, sectionY.end);
                              const y2 = Math.max(sectionY.start, sectionY.end);
                              if (editingSectionId) {
                                setMarks(prev => prev.map(r => r.id === editingSectionId ? { ...r, y: y1, h: y2 - y1 } : r));
                                setSelectedMarkId(editingSectionId);
                                setSelectedGlobalToolIdx(null);
                                setEditingSectionId(null);
                              } else {
                                const newId = `reg_${Date.now()}`;
                                setMarks(prev => [...prev, { id: newId, type: 'section', x: 0, y: y1, w: 16, h: y2 - y1 }]);
                                setSelectedMarkId(newId);
                                setSelectedGlobalToolIdx(null);
                              }
                              setTool('select');
                            }}
                            style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: canConfirm ? 'pointer' : 'not-allowed', border: `1px solid ${canConfirm ? '#3B82F6' : '#4b5563'}`, background: canConfirm ? 'rgba(59,130,246,0.2)' : 'transparent', color: canConfirm ? '#93C5FD' : '#6b7280', transition: 'all 0.15s' }}
                          >
                            {editingSectionId ? 'Update' : 'Confirm'}
                          </button>

                          <button onClick={() => { setEditingSectionId(null); setSectionY({ start: null, end: null }); setSectionTarget('start'); setTool('select'); }}
                            style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid #F87171`, background: 'transparent', color: '#F87171', transition: 'all 0.15s' }}
                          >
                            Cancel
                          </button>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* ── SHAPE EDIT MINI MENU (Rect/Lasso) ── */}
                {editingShapeId && tool === id && (id === 'rect' || id === 'lasso') && (
                  <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(38,42,51,0.85)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', alignItems: 'center' }}>
                    <button onClick={() => { setMarks(prev => prev.map(r => r.id === shapeBackup?.id ? shapeBackup : r)); setEditingShapeId(null); setShapeBackup(null); setTool('select'); }} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid #F87171`, background: 'transparent', color: '#F87171', transition: 'all 0.15s' }}>Cancel</button>
                    <button onClick={() => { setEditingShapeId(null); setShapeBackup(null); setTool('select'); }} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid #3B82F6`, background: 'rgba(59,130,246,0.2)', color: '#93C5FD', transition: 'all 0.15s' }}>Update</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            {Array.from({ length: globalToolCount }, (_, idx) => {
              const linkedId = globalToolLinks[idx];
              const isActive = selectedGlobalToolIdx === idx;
              const showControls = activeGlobalToolControlsIdx === idx && !!linkedId;
              const showSelectPanel = selectPanelToolIdx === idx;
              return (
                <div key={`gtool-${idx}`} style={{ position: 'relative' }}>
                  <button
                    onClick={() => handleOpenGlobalTool(idx)}
                    title={`Global Whiteboard Tool ${idx + 1}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${isActive ? '#3B82F6' : 'transparent'}`, background: isActive ? 'rgba(59,130,246,0.2)' : 'transparent', color: isActive ? '#93C5FD' : '#d1d5db', cursor: 'pointer', fontSize: '16px' }}
                  >
                    {toRoman(idx + 1)}
                  </button>
                  {showControls && (
                    <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(38,42,51,0.9)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                      <button onClick={() => {
                        setSelectPanelToolIdx(idx);
                        setActiveGlobalToolControlsIdx(null);
                        const found = allWhiteboards.find((wb) => wb.id === linkedId);
                        setGlobalToolDraftId(linkedId);
                        setGlobalToolDraftName(found?.name || 'Whiteboard');
                      }} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #3B82F6', background: 'rgba(59,130,246,0.2)', color: '#93C5FD', cursor: 'pointer' }}>Update</button>
                      <button onClick={() => {
                        setSelectedGlobalToolIdx(null);
                        setSelectedMarkId(null);
                        setActiveGlobalToolControlsIdx(null);
                        setSelectPanelToolIdx(null);
                        setViewStack([]);
                      }} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #4b5563', background: 'transparent', color: '#d1d5db', cursor: 'pointer' }}>Close</button>
                      {globalToolCount > 1 && (
                        <button onClick={async () => {
                          const yes = await confirmErrorDialog('Delete this global whiteboard tool?','Delete Tool');
                          if (!yes) return;
                          setGlobalToolLinks((prev) => prev.filter((_, i) => i !== idx));
                          setGlobalToolCount((c) => Math.max(1, c - 1));
                          setActiveGlobalToolControlsIdx(null);
                          setSelectPanelToolIdx(null);
                          setViewStack([]);
                          if (selectedGlobalToolIdx === idx) setSelectedGlobalToolIdx(null);
                          else if (selectedGlobalToolIdx > idx) setSelectedGlobalToolIdx((prev) => (prev === null ? null : prev - 1));
                        }} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer' }}>Delete Tool</button>
                      )}
                    </div>
                  )}

                  {showSelectPanel && (
                    <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', zIndex: 80, width: '320px', background: 'rgba(28,31,38,0.96)', border: '1px solid #374151', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tool {toRoman(idx + 1)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button onClick={handleCreateFromPanel} style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #3B82F6', background: 'rgba(59,130,246,0.2)', color: '#93C5FD', cursor: 'pointer', fontSize: '11px' }}>Create</button>
                          <button onClick={() => { setSelectPanelToolIdx(null); setNewGlobalWhiteboardName(''); }} style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                          {globalToolCount > 1 && (
                            <button
                              onClick={async () => {
                                const yes = await confirmErrorDialog('Delete this global whiteboard tool?', 'Delete Tool');
                                if (!yes) return;
                                setGlobalToolLinks((prev) => prev.filter((_, i) => i !== idx));
                                setGlobalToolCount((c) => Math.max(1, c - 1));
                                setSelectPanelToolIdx(null);
                                setViewStack([]);
                                if (selectedGlobalToolIdx === idx) setSelectedGlobalToolIdx(null);
                                else if (selectedGlobalToolIdx > idx) setSelectedGlobalToolIdx((prev) => (prev === null ? null : prev - 1));
                              }}
                              style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer', fontSize: '11px' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ maxHeight: '182px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {allWhiteboards.map((wb) => (
                          <button
                            key={wb.id}
                            onClick={() => handleApplyGlobalToolSelection(idx, wb.id, wb.name)}
                            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${globalToolDraftId === wb.id ? '#3B82F6' : '#374151'}`, background: globalToolDraftId === wb.id ? 'rgba(59,130,246,0.18)' : '#262a33', color: '#e5e7eb', cursor: 'pointer', fontSize: '12px', minHeight: '30px' }}
                          >
                            {wb.name}
                          </button>
                        ))}
                        {allWhiteboards.length === 0 && <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>No whiteboards yet.</span>}
                      </div>
                      <input value={newGlobalWhiteboardName} onChange={(e) => setNewGlobalWhiteboardName(e.target.value)} placeholder="New whiteboard name..." style={{ width: '100%', background: '#1c1f26', border: '1px solid #4b5563', color: '#e5e7eb', borderRadius: '6px', padding: '6px 8px', fontSize: '11px', outline: 'none' }} />
                    </div>
                  )}
                </div>
              );
            })}
            {globalToolCount < (settings?.maxGlobalPdfTools ?? 8) && (
              <button onClick={() => setGlobalToolCount((c) => c + 1)} title="Add global whiteboard tool" style={{ width: '36px', height: '32px', borderRadius: '6px', border: '1px dashed #4b5563', background: 'transparent', color: '#d1d5db', cursor: 'pointer', fontSize: '16px' }}>+</button>
            )}
          </div>

          <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <button onClick={() => setZoom(z => Math.min(z + 0.25, 3.0))} title="Zoom In" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '18px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>+</button>
            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', margin: '2px 0' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} title="Zoom Out" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '18px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>-</button>
          </div>
        </div>
      </div>

      {activeWhiteboardId && (
        <div onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }} style={{ width: '6px', flexShrink: 0, cursor: 'col-resize', zIndex: 20, background: isResizing ? '#3B82F6' : '#262a33', borderLeft: '1px solid #374151', borderRight: '1px solid #374151', transition: isResizing ? 'none' : 'background 0.2s', position: 'relative' }} />
      )}

      {activeWhiteboardId && (
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
      )}

      {!activeWhiteboardId && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '0px', overflow: 'hidden' }} />
      )}
    </div>
  );
}
