import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Tldraw, DefaultToolbar, DefaultToolbarContent, TldrawUiMenuItem, useTools, useIsToolSelected } from 'tldraw';
import 'tldraw/tldraw.css';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  loadSession, normalizeMarkCollection,
  debounce, performRollingBackup,
  createWhiteboard
} from './storage.js';
import HomeScreen, { loadSettings } from './HomeScreen.jsx';
import { createUIStateStore } from './ui/ui_state_store';
import { createUIController } from './ui/ui_controller';
import { useUIState } from './ui/useUIState';
import { inputAPI, outputAPI, queryAPI } from './atma/singletons';


import { HandwritingShapeUtil, HandwritingTool, handwritingToolUiOverrides } from './implementations/whiteboard/tools/editing/handwriting_whiteboard_editing_tool.jsx';
import { confirmErrorDialog } from './platform_adapter/switch.ts';
import { useShortcutToolState } from './window/useShortcutToolState.ts';
import { getMarkType } from './capabilty_registry/pdf/mark_registry.ts';
import { setupAllRegistries } from './capabilty_registry/setup_all.ts';
import { toRoman } from './helper.ts';

import { DEFAULT_SECTION_WIDTH, SECTION_BASE_WIDTH, SECTION_WIDTH_STEP } from './domain_models/mark_model.ts';
import { getToolByHotkey, getToolType } from './capabilty_registry/pdf/tool_registry.ts';
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

// ─── Mark colour palette ────────────────────────────────────────────────────
const MARK_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];
const markColor = (id) => MARK_COLORS[parseInt(id.replace('reg_', ''), 10) % MARK_COLORS.length];

function updateSectionWidths(marks) {
  const normalizedMarks = normalizeMarkCollection(marks);
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
function WhiteboardPane({ markId, settings }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    queryAPI.getWhiteboardSnapshot(markId).then((snap) => {
      if (!cancelled) {
        setSnapshot(snap ?? undefined);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [markId]);

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1c1f26', color: '#9ca3af', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace" }}>
        loading workspace…
      </div>
    );
  }

  return <TldrawWithPersistence markId={markId} initialSnapshot={snapshot} settings={settings} />;
}

function TldrawWithPersistence({ markId, initialSnapshot, settings }) {
  const debouncedSave = useMemo(() => debounce((snap) => inputAPI.saveWhiteboardSnapshot(markId, snap), 800), [markId]);

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
  }, [initialSnapshot, debouncedSave, markId]);

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
        <WhiteboardPane markId={whiteboardId} settings={settings} />
      </div>
    </div>
  );
}

// ─── WorkspaceApp ─────────────────────────────────────────────────────────────
function WorkspaceApp({ pdfPath, pdfLocalPath, settings, onHome }) {
  const PDF_WIDTH = 800;

  // PDF - not UI or app state
  const [numPages, setNumPages]   = useState(null);
  const [pdfReady, setPdfReady]   = useState(false);
  const [pdfData, setPdfData]     = useState(null);
  const pdfScrollRef = useRef(null);
  const documentFile = useMemo(() => pdfData ? { data: pdfData } : null, [pdfData]);
  const syncSession = useMemo(() => {
    try {
      return loadSession(pdfPath);
    } catch {
      return null;
    }
  }, [pdfPath]);

  // UI Decoupled Store & Controller
  const uiStore = useMemo(() => createUIStateStore({
    leftPct: syncSession?.leftPct ?? settings?.defaultSplit ?? 50,
    selectedMarkId: syncSession?.selectedMarkId ?? null,
    tool: 'select',
    marks: syncSession?.marks ?? [],
    pdfPath: pdfPath,
    scrollTop: syncSession?.scrollTop ?? 0,
  }), [syncSession, pdfPath, settings]);

  const uiController = useMemo(() => createUIController(uiStore), [uiStore]);
  useEffect(() => {
    return uiController.connect();
  }, [uiController]);
  const uiState = useUIState(uiStore);

  // Layout & UI State (High Frequency / Visual only)
  const [isResizing, setIsResizing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const containerRef = useRef(null);

  // AppState (Derived synchronously from UI State Cache)
  const marks = useMemo(() => updateSectionWidths(uiState.marks), [uiState.marks]);

  // Shortcut Tool state adapter
  const { manager: shortcutManager, state: shortcutState, refreshAvailableWhiteboards } = useShortcutToolState({
    settings,
    restoredSession: syncSession,
    externalActions: { 
      setTool: uiController.setTool, 
      setSelectedMarkId: uiController.setSelectedMarkId 
    },
  });

  const pdfDirectoryPath = useMemo(() => {
    if (!pdfLocalPath) return null;
    const slash = Math.max(pdfLocalPath.lastIndexOf('/'), pdfLocalPath.lastIndexOf('\\'));
    if (slash < 0) return null;
    return pdfLocalPath.slice(0, slash);
  }, [pdfLocalPath]);

  // Rect, Lasso and Section Selections Common (High Frequency State)
  const [currentSelection, setCurrentSelection]  = useState(null);
  const [movingMark, setMovingMark] = useState(null);

  const [lastSavedAt, setLastSavedAt] = useState(null);
  const pdfContentRef = useRef(null);

  const mousePosRef = useRef({ x: 0, y: 0 });
  const scrollAnimRef = useRef(null);
  const dragStateRef = useRef({ currentSelection, movingMark });
  const pendingToolActivationReasonRef = useRef('normal');

  const zoomTimeoutRef = useRef(null);

  // Toast Helper utilizing decoupled controller
  const showToast = useCallback((msg, type = 'info') => {
    uiController.showToast(msg, type);
    setTimeout(() => uiController.clearToast(), 3000);
  }, [uiController]);

  const selectMark = useCallback((markId) => {
    shortcutManager.clearUi();
    uiController.setSelectedMarkId(markId);
  }, [uiController, shortcutManager]);

  const setMarksWithSectionWidths = useCallback((updater) => {
    const prevMarks = uiState.marks;
    const nextMarks = typeof updater === 'function' ? updater(prevMarks) : updater;
    if (nextMarks == null || nextMarks === prevMarks) return;

    const prevMap = new Map(prevMarks.map(m => [m.id, m]));
    const nextMap = new Map(nextMarks.map(m => [m.id, m]));

    // 1. Detect deletions
    for (const m of prevMarks) {
      if (!nextMap.has(m.id)) {
        inputAPI.deleteMark(m.id);
      }
    }

    // 2. Detect additions & updates
    for (const m of nextMarks) {
      const prev = prevMap.get(m.id);
      if (!prev) {
        inputAPI.addMark(m);
      } else if (JSON.stringify(prev) !== JSON.stringify(m)) {
        inputAPI.updateMark(m);
      }
    }
  }, [uiState.marks]);

  useEffect(() => { dragStateRef.current = { currentSelection, movingMark }; }, [currentSelection, movingMark]);

  useEffect(() => {
    const activationReason = pendingToolActivationReasonRef.current;
    pendingToolActivationReasonRef.current = 'normal';
    if (activationReason === 'border-edit') return;

    getToolType(uiState.tool).onActivate?.({
      state: {
        currentSelection,
        editingShapeId: uiState.editingShapeId,
        editingSectionId: uiState.editingSectionId,
        sectionTarget: uiState.sectionTarget,
        tool: uiState.tool,
      },
      actions: {
        setCurrentSelection,
        setSectionTarget: uiController.setSectionTarget,
        setEditingSectionId: uiController.setEditingSectionId,
        setEditingShapeId: uiController.setEditingShapeId,
        setShapeBackup: uiController.setShapeBackup,
      },
    });
  }, [uiState.tool]);

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
  }, [uiState.zoom, uiController]);

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
      if (!uiState.selectedMarkId && shortcutState.selectedIdx === null) return;
      uiController.setLeftPct(55);
      return;
    }

    if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      uiController.setZoom(1);
      return;
    }

    // Shortcut tool shortcuts: I->1, II->2, III->3, ...
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const n = Number.parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= shortcutState.slotCount) {
        e.preventDefault();
        const btn = document.querySelector(`button[title="Shortcut Tool ${n}"]`);
        if (btn) btn.click();
        return;
      }
    }
    const toolType = getToolType(uiState.tool);
    const toolHandledKey = toolType.onKeyDown?.({
      e,
      state: {
        currentSelection,
        editingShapeId: uiState.editingShapeId,
        editingSectionId: uiState.editingSectionId,
        sectionTarget: uiState.sectionTarget,
        tool: uiState.tool,
        zoom: uiState.zoom,
        shapeBackup: uiState.shapeBackup,
      },
      actions: {
        setTool: uiController.setTool,
        setCurrentSelection,
        setSectionTarget: uiController.setSectionTarget,
        setEditingSectionId: uiController.setEditingSectionId,
        setEditingShapeId: uiController.setEditingShapeId,
        setShapeBackup: uiController.setShapeBackup,
        setMarksWithSectionWidths,
        setSelectedMarkId: uiController.setSelectedMarkId,
      },
    });
    if (toolHandledKey) {
      e.stopPropagation();
      return;
    }

    if (e.key === 'Escape') {
      if (shortcutManager.handleEscape()) return;
      uiController.setSelectedMarkId(null);
      return;
    }

    if (uiState.activePane === 'pdf') {
      const hotkeyTool = getToolByHotkey(e.key);
      if (hotkeyTool) {
        e.preventDefault();
        shortcutManager.setSelectedIdx(null);
        shortcutManager.setSelectPanelIdx(null);
        uiController.setTool(
          hotkeyTool.activationMode === 'toggle' && uiState.tool === hotkeyTool.id
            ? 'select'
            : hotkeyTool.id
        );
        e.stopPropagation();
      }
    }
  }, [uiState, uiController, currentSelection, shortcutState.slotCount, shortcutManager]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  // Shortcut tool effects (clamp, sync, clear) are now handled by useShortcutToolState hook.

  // Core Session Loading Effect
  useEffect(() => {
    if (pdfPath) {
      inputAPI.loadSession(pdfPath);
    }
  }, [pdfPath]);

  // Unload handler: Flush any pending saves to local storage
  useEffect(() => {
    const onUnload = () => {
      inputAPI.flushSession();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const scrollRestored = useRef(false);
  useEffect(() => {
    if (pdfReady && !scrollRestored.current && pdfScrollRef.current && syncSession?.scrollTop) {
      pdfScrollRef.current.scrollTop = syncSession.scrollTop;
      scrollRestored.current = true;
    }
  }, [pdfReady, syncSession]);

  const handleScroll = useCallback(() => {
    if (pdfScrollRef.current) {
      inputAPI.updateScrollTop(pdfPath, pdfScrollRef.current.scrollTop);
      // TODO add support for custom sized pages not only A4
      const pageHeight = PDF_WIDTH * uiState.zoom * 1.414;
      const newPage = Math.floor(pdfScrollRef.current.scrollTop / pageHeight) + 1;
      uiController.setCurrentPage(newPage);
      if (document.activeElement?.id !== 'page-input') {
        uiController.setPageInput(String(newPage));
      }
    }
  }, [pdfPath, uiState.zoom, uiController]);

  const handlePageSubmit = (e) => {
    if (e.key === 'Enter') {
      const target = parseInt(uiState.pageInput);
      if (!isNaN(target) && target > 0 && target <= (numPages || 1)) {
        if (pdfScrollRef.current) {
          const pageHeight = PDF_WIDTH * uiState.zoom * 1.414;
          pdfScrollRef.current.scrollTop = (target - 1) * pageHeight;
        }
      } else {
        uiController.setPageInput(String(uiState.currentPage));
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
      uiController.setLeftPct(Math.max(MIN_PANE_PCT, Math.min(MAX_PANE_PCT, rawPct)));
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isResizing, uiController]);

  const getUnscaledCoordsFromClient = useCallback((clientX, clientY) => {
    if (!pdfContentRef.current) return { x: 0, y: 0 };
    const rect = pdfContentRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left) / uiState.zoom, y: (clientY - rect.top) / uiState.zoom };
  }, [uiState.zoom]);

  const getUnscaledCoords = useCallback((e) => {
    return getUnscaledCoordsFromClient(e.clientX, e.clientY);
  }, [getUnscaledCoordsFromClient]);

  const handleDivPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const coords = getUnscaledCoords(e);

    if (e.ctrlKey || e.metaKey) {
      const hit = [...marks].reverse().find((r) => {
        const selectionContext = {PDFWIDTH: PDF_WIDTH, zoom: uiState.zoom};
        
        return getMarkType(r.type).hasSelectedBorder(coords, r, selectionContext);
      });

      if (hit) {
        e.preventDefault();
        pendingToolActivationReasonRef.current = 'border-edit';
        getMarkType(hit.type).onBorderEditStart?.({
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

  }, [uiState, uiController, marks, getUnscaledCoords, currentSelection, setMarksWithSectionWidths]);

  const handleDivPointerMove = useCallback((e) => {
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

    if (movingMark) {
      setMarksWithSectionWidths((prev) =>
        prev.map((r) => {
          if (r.id === movingMark.id) {
            if (r.type === 'section') return { ...r, y: coords.y - movingMark.offsetY };
            return { ...r, x: coords.x - movingMark.offsetX, y: coords.y - movingMark.offsetY };
          }
          return r;
        })
      );
    }
  }, [currentSelection, movingMark, getUnscaledCoords, uiState, setMarksWithSectionWidths]);

  const handleDivPointerUp = useCallback((e) => {
    if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if(currentSelection && getMarkType(currentSelection.type).isDrawable){
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
  }, [currentSelection, uiState, uiController, setMarksWithSectionWidths]);

  useEffect(() => {
    const isDragging = !!currentSelection || !!movingMark 

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
            setMarksWithSectionWidths((prev) =>
              prev.map((r) => {
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
    return () => cancelAnimationFrame(scrollAnimRef.current);
  }, [currentSelection, movingMark, uiState.zoom, getUnscaledCoordsFromClient, uiState.tool, uiState.editingShapeId]);

  const handleBorderClick = useCallback(async (e, markId) => {
    e.stopPropagation();

    const toolType = getToolType(uiState.tool);
    await toolType.onBorderClick?.({
      regionId: markId,
      selectedRegionId: uiState.selectedMarkId,
      actions: {
        confirmDelete: () => confirmErrorDialog(
          'Are you sure you want to delete this region? Its whiteboard data will be permanently lost.',
          'Delete Whiteboard'
        ),
        deleteRegion: (id) => {
          setMarksWithSectionWidths((prev) => prev.filter((r) => r.id !== id));
        },
        selectRegion: selectMark,
        clearShortcutUi: () => shortcutManager.clearUi(),
      },
    });
  }, [uiState.tool, uiState.selectedMarkId, selectMark, shortcutManager]);

  const handleBackup = async () => {
    try {
      const idx = await performRollingBackup();
      showToast(`Workspace backed up! (backup_${idx}.json)`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleCreateFromPanel = useCallback(async () => {
    const { selectPanelIdx, newWhiteboardName } = shortcutManager.state;
    if (selectPanelIdx === null) return;
    const trimmed = newWhiteboardName.trim();
    if (!trimmed) return;
    try {
      const wb = await createWhiteboard(trimmed, pdfDirectoryPath);
      shortcutManager.setNewWhiteboardName('');
      await refreshAvailableWhiteboards();
      shortcutManager.applySelection(selectPanelIdx, wb.id, wb.name, uiStore.getState().selectedMarkId);
    } catch (err) {
      showToast(err.message || 'Could not create whiteboard.', 'error');
    }
  }, [pdfDirectoryPath, refreshAvailableWhiteboards, showToast, shortcutManager, uiStore]);

  // --- Dynamic Cursors ---
  const toolType = getToolType(uiState.tool);
  const pdfCursor = movingMark
    ? 'grabbing'
    : (typeof toolType.cursor === 'function'
        ? toolType.cursor({ sectionTarget: uiState.sectionTarget })
        : toolType.cursor) || 'default';

  const activeWhiteboardId = uiState.selectedMarkId ?? shortcutManager.getLinkedWhiteboardId();
  const sectionSelection = currentSelection?.type === 'section'
    ? currentSelection
    : { start: null, end: null };

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
      {uiState.toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: uiState.toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
          backdropFilter: 'blur(8px)', border: `1px solid ${uiState.toast.type === 'error' ? '#F87171' : '#34D399'}`,
          color: '#fff', padding: '10px 20px', borderRadius: '8px', zIndex: 9999,
          fontSize: '12px', fontWeight: '500', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeInUp 0.3s ease-out forwards'
        }}>
          {uiState.toast.type === 'error' ? '⚠' : '✓'} {uiState.toast.msg}
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
        onMouseEnter={() => uiController.setActivePane('pdf')}
        style={{ width: activeWhiteboardId ? `${uiState.leftPct}%` : '100%', height: '100%', flexShrink: 0, position: 'relative', transition: activeWhiteboardId ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.3s ease' }}
      >
        <div ref={pdfScrollRef} onScroll={handleScroll} style={{ width: '100%', height: '100%', overflow: 'auto', textAlign: 'center', background: '#262a33', position: 'relative' }}>
          <div ref={pdfContentRef} onPointerDown={handleDivPointerDown} onPointerMove={handleDivPointerMove} onPointerUp={handleDivPointerUp} style={{ position: 'relative', margin: '24px', background: 'white', display: 'inline-block', textAlign: 'left', cursor: pdfCursor, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
            {documentFile ? (
              <Document file={documentFile} onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPdfReady(true); }} onLoadError={(error) => console.error("PDF Load Error:", error)}>
                {Array.from({ length: numPages ?? 0 }, (_, i) => (
                  <LazyPage key={`${pdfPath}-${i}`} pageNumber={i + 1} width={PDF_WIDTH} scale={uiState.zoom} />
                ))}
              </Document>
            ) : (
              <div style={{ padding: '40px', color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>Loading document into memory...</div>
            )}

            {/* Scaled SVG overlay */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 10, pointerEvents: 'none' }}>
              {/* BOZOZO */}
              {marks.map((r, idx) => {
                const color      = markColor(r.id);
                const isSelected = uiState.selectedMarkId === r.id;
                let renderCtx = {zoom:uiState.zoom, PDFWIDTH: PDF_WIDTH, tool:uiState.tool, color: color, idx:idx, onClick: handleBorderClick, isSelected:isSelected, };
                
                return getMarkType(r.type).render(r, renderCtx);
              })}

              {currentSelection && 
                getMarkType(currentSelection.type).renderSelectionPreview(currentSelection, {zoom: uiState.zoom, PDFWIDTH: PDF_WIDTH})
              } 
             
            </svg>
          </div>
        </div>

        {/* ── BOTTOM NAV: Page Control ── */}
        <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Page</span>
          <input
            id="page-input" type="text" value={uiState.pageInput}
            onChange={e => uiController.setPageInput(e.target.value)}
            onKeyDown={handlePageSubmit}
            onBlur={() => uiController.setPageInput(String(uiState.currentPage))}
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
                <button
                  onClick={() => {
                    shortcutManager.clearUi();
                    const buttonToolType = getToolType(id);
                    const nextTool = buttonToolType.activationMode === 'toggle' && uiState.tool === id ? 'select' : id;
                    uiController.setTool(nextTool);
                  }}
                  title={`${label} [${key}]`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${uiState.tool === id ? '#3B82F6' : 'transparent'}`, background: uiState.tool === id ? 'rgba(59,130,246,0.2)' : 'transparent', color: uiState.tool === id ? '#93C5FD' : '#d1d5db', cursor: 'pointer', fontSize: '18px', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (uiState.tool !== id) { e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.1)'; } }}
                  onMouseLeave={e => { if (uiState.tool !== id) { e.currentTarget.style.color='#d1d5db'; e.currentTarget.style.background='transparent'; } }}
                >
                  {icon}
                </button>
                {getToolType(id).renderToolbarExtras?.({
                  toolId: id,
                  tool: uiState.tool,
                  sectionTarget: uiState.sectionTarget,
                  sectionSelection,
                  editingShapeId: uiState.editingShapeId,
                  editingSectionId: uiState.editingSectionId,
                  shapeBackup: uiState.shapeBackup,
                  actions: {
                    setTool: uiController.setTool,
                    setSectionTarget: uiController.setSectionTarget,
                    setEditingSectionId: uiController.setEditingSectionId,
                    setCurrentSelection,
                    setMarksWithSectionWidths,
                    setSelectedMarkId: uiController.setSelectedMarkId,
                    setSelectedShortcutIdx: (idx) => shortcutManager.setSelectedIdx(idx),
                    setShapeBackup: uiController.setShapeBackup,
                    setEditingShapeId: uiController.setEditingShapeId,
                    setSelectPanelIdx: (idx) => shortcutManager.setSelectPanelIdx(idx),
                  },
                })}
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            {Array.from({ length: shortcutState.slotCount }, (_, idx) => {
              const linkedId = shortcutState.slotLinks[idx];
              const isActive = shortcutState.selectedIdx === idx;
              const showControls = shortcutState.activeControlsIdx === idx && !!linkedId;
              const showSelectPanel = shortcutState.selectPanelIdx === idx;
              return (
                <div key={`gtool-${idx}`} style={{ position: 'relative' }}>
                  <button
                    onClick={() => shortcutManager.openSlot(idx, uiState.selectedMarkId)}
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
                          const yes = await confirmErrorDialog('Delete this shortcut tool?','Delete Tool');
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
                                const yes = await confirmErrorDialog('Delete this shortcut tool?', 'Delete Tool');
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
                        {shortcutState.availableWhiteboards.map((wb) => (
                          <button
                            key={wb.id}
                            onClick={() => shortcutManager.applySelection(idx, wb.id, wb.name, uiState.selectedMarkId)}
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

          <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <button onClick={() => uiController.setZoom(Math.min(uiState.zoom + 0.25, 3.0))} title="Zoom In" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '18px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>+</button>
            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', margin: '2px 0' }}>{Math.round(uiState.zoom * 100)}%</span>
            <button onClick={() => uiController.setZoom(Math.max(uiState.zoom - 0.25, 0.5))} title="Zoom Out" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '18px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>-</button>
          </div>
        </div>
      </div>

      {activeWhiteboardId && (
        <div onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }} style={{ width: '6px', flexShrink: 0, cursor: 'col-resize', zIndex: 20, background: isResizing ? '#3B82F6' : '#262a33', borderLeft: '1px solid #374151', borderRight: '1px solid #374151', transition: isResizing ? 'none' : 'background 0.2s', position: 'relative' }} />
      )}

      {activeWhiteboardId && (
        <div
          onMouseEnter={() => uiController.setActivePane('whiteboard')}
          onWheelCapture={(e) => {
            if (e.nativeEvent.isTrusted && e.shiftKey && e.deltaY !== 0 && e.deltaX === 0) {
              e.stopPropagation(); e.preventDefault();
              const clone = new WheelEvent('wheel', { clientX: e.clientX, clientY: e.clientY, deltaX: e.deltaY, deltaY: 0, deltaMode: e.deltaMode, shiftKey: true, ctrlKey: e.ctrlKey, metaKey: e.metaKey, bubbles: true, cancelable: true });
              e.target.dispatchEvent(clone);
            }
          }}
          style={{ flex: 1, height: '100%', minWidth: 0, position: 'relative' }}
        >
          <WhiteboardPane key={activeWhiteboardId} markId={activeWhiteboardId} settings={settings} />
        </div>
      )}

      {!activeWhiteboardId && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '0px', overflow: 'hidden' }} />
      )}
    </div>
  );
}
