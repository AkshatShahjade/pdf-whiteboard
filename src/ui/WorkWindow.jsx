import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { debounce } from '../atma/services/state_sync_service';
import HomeScreen from './HomeScreen.jsx';
import { createUIStateStore } from './ui_state_store';
import { createUIController } from './ui_controller';
import { useUIState } from './useUIState';
import { inputAPI, outputAPI, queryAPI } from '../atma/singletons';
import { DEFAULT_APP_STATE } from '../atma/app_state_store';
import { whiteboardContentRenderer } from './registry_implementations/whiteboard/whiteboard_content_renderer';
import { pdfContentRenderer } from './registry_implementations/pdf/pdf_content_renderer';
import { confirmDialog, convertFileSrc, joinPath } from '../atma/platform_adapter/switch.ts';
import { WhiteboardRepository } from '../atma/storage/repositories/WhiteboardRepository';
import { ContentRepository } from '../atma/storage/repositories/ContentRepository';
import { useShortcutToolState } from './window/useShortcutToolState.ts';
import { getMarkDomainType } from '../atma/capabilities_registry/pdf/mark_domain_registry';
import { getMarkRendererType } from './renderer_registry/pdf/vertical_pane/mark_renderer_registry';
import { setupAllRegistries } from './renderer_registry/setup';
import { toRoman } from './helper.ts';

import { DEFAULT_SECTION_WIDTH, SECTION_BASE_WIDTH, SECTION_WIDTH_STEP } from '../shared_doman_models_and_dtos/mark_domain_model.ts';
import { getToolRendererByHotkey as getToolByHotkey, getToolRendererType as getToolType } from './renderer_registry/pdf/vertical_pane/tool_renderer_registry';
setupAllRegistries(); //TODO, find proper place



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
const markColor = (id) => MARK_COLORS[parseInt(id.replace('reg_', '').replace('mark_', ''), 10) % MARK_COLORS.length];

function updateSectionWidths(marks) {
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

// LazyPage moved to pdf_content_renderer.tsx

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

// WhiteboardPane is now imported from './renderer_registry/content/whiteboard_content_renderer'

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Root() {
  const [session, setSession] = useState(null);

  if (!session) {
    return (
      <HomeScreen
        onOpen={(pdfPath, whiteboard, settings) => {
          if (whiteboard?.id) {
            setSession({ mode: 'whiteboard', whiteboardId: whiteboard.id, whiteboardName: whiteboard.name, settings });
            return;
          }
          setSession({ mode: 'pdf', pdfPath, settings });
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
  return <WorkspaceContainer pdfPath={session.pdfPath} settings={session.settings} onHome={() => setSession(null)} />;
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
    showToast(`Backup migrating to new SQLite architecture!`, 'success');
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
        {whiteboardContentRenderer.Component({
          contentId: whiteboardId,
          settings
        })}
      </div>
    </div>
  );
}

// ─── WorkspaceContainer ─────────────────────────────────────────────────────────────
function WorkspaceContainer({ pdfPath, settings, onHome }) {
  const PDF_WIDTH = 800;

  // PDF visual state and refs have been moved to pdf_content_renderer
  // UI Decoupled Store & Controller
  const uiStore = useMemo(() => createUIStateStore({
    ...DEFAULT_APP_STATE,
    leftPct: settings?.defaultSplit ?? DEFAULT_APP_STATE.leftPct,
    marks: [],
    pdfPath: pdfPath,
  }), [pdfPath, settings]);

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
    restoredSession: null,
    externalActions: { 
      setTool: uiController.setTool, 
      setSelectedMarkId: uiController.setSelectedMarkId 
    },
  });

  const pdfDirectoryPath = useMemo(() => {
    if (!pdfPath) return null;
    const slash = Math.max(pdfPath.lastIndexOf('/'), pdfPath.lastIndexOf('\\'));
    if (slash < 0) return null;
    return pdfPath.slice(0, slash);
  }, [pdfPath]);

  // Rect, Lasso and Section Selections Common (High Frequency State)
  const [currentSelection, setCurrentSelection]  = useState(null);
  const [movingMark, setMovingMark] = useState(null);

  const [lastSavedAt, setLastSavedAt] = useState(null);
  // PDF pointer refs moved to pdf_content_renderer
  const dragStateRef = useRef({ currentSelection, movingMark });
  const pendingToolActivationReasonRef = useRef('normal');

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
    const uniqueNextMarks = Array.from(
      new Map(nextMarks.map(u => [u.id, u])).values()
    );

    for (const m of  uniqueNextMarks) {
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

  // Native Ctrl+Scroll and panning moved to pdf_content_renderer

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
          hotkeyTool.activationMode === 'toggle' && uiState.tool === hotkeyTool.id.id
            ? 'select'
            : hotkeyTool.id.id
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

  // Scroll restoration moved to pdf_content_renderer

  const handlePageSubmit = (e) => {
    if (e.key === 'Enter') {
      const target = parseInt(uiState.pageInput);
      if (!isNaN(target) && target > 0) {
        // Scroll is now handled via state updates, though direct DOM manipulation 
        // in WorkWindow is removed. We'll leave the pageInput update.
      } else {
        uiController.setPageInput(String(uiState.currentPage));
      }
      document.activeElement?.blur();
    }
  };

  // PDF Data Fetching moved to pdf_content_renderer

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

  // PDF Pointer Events, Coordinates, and Scroll Anim moved to pdf_content_renderer

  // handleBorderClick moved to pdf_content_renderer

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
      const id = `wb_${Date.now()}`;
      await WhiteboardRepository.saveWhiteboard(id, { name: trimmed }, undefined, pdfDirectoryPath);
      await ContentRepository.ensureContentExists(id, 'core.whiteboard', await joinPath(pdfDirectoryPath, `${id}.tldr`));
      
      const wb = { id, name: trimmed };

      shortcutManager.setNewWhiteboardName('');
      await refreshAvailableWhiteboards();
      shortcutManager.applySelection(selectPanelIdx, wb.id, wb.name, uiStore.getState().selectedMarkId);
    } catch (err) {
      showToast(err.message || 'Could not create whiteboard.', 'error');
    }
  }, [pdfDirectoryPath, refreshAvailableWhiteboards, showToast, shortcutManager, uiStore]);

  // dynamic pdf cursor moved to pdf_content_renderer

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
        {pdfContentRenderer.Component({
          contentId: pdfPath,
          path: pdfPath,
          settings,
          uiState,
          uiController,
          marks,
          currentSelection,
          movingMark,
          setCurrentSelection,
          setMovingMark,
          setMarksWithSectionWidths,
          selectMark,
          dragStateRef,
          pendingToolActivationReasonRef,
        })}

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
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>/ -</span>
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
          {whiteboardContentRenderer.Component({
            contentId: activeWhiteboardId,
            settings
          })}
        </div>
      )}

      {!activeWhiteboardId && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '0px', overflow: 'hidden' }} />
      )}
    </div>
  );
}
