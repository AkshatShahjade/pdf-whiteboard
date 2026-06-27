import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { pdfjs } from 'react-pdf';
import HomeScreen from './HomeScreen.jsx';
import { createUIStateStore } from './ui_state_store';
import { createUIController } from './ui_controller';
import { useUIState } from './useUIState';
import { queryAPI } from '../atma/singletons';
import { DEFAULT_APP_STATE } from '../atma/app_state_store';
import { getContentRendererType } from './renderer_registry/content_renderer_registry';
import { setupAllRegistries } from './renderer_registry/setup';
import { createDefaultSlotState } from '../atma/capabilities_registry/content_domain_registry';
import Screen from '../roopa/Screen';

import { DEFAULT_SECTION_WIDTH, SECTION_BASE_WIDTH, SECTION_WIDTH_STEP } from '../shared_doman_models_and_dtos/mark_domain_model.ts';
setupAllRegistries(); //TODO, find proper place



pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_PANE_PCT     = 15;
const MAX_PANE_PCT     = 85;

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

  const uiStore = useMemo(() => {
    return createUIStateStore({
      ...DEFAULT_APP_STATE,
      activeSlot: 'left',
      slots: {}
    });
  }, []);

  const uiController = useMemo(() => createUIController(uiStore, () => {
    uiStore.setState({ slots: {} });
    setSession(null);
  }), [uiStore]);
  
  useEffect(() => {
    if (uiStore) {
      queryAPI.getLibraryPath().then(path => {
        uiStore.setState({ libraryPath: path });
      }).catch(console.error);
    }
  }, [uiStore]);

  useEffect(() => {
    if (uiController) {
      return uiController.connect();
    }
  }, [uiController]);

  if (!session) {
    return (
      <HomeScreen
        uiController={uiController}
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

  const handleHome = () => {
    uiStore.setState({ slots: {} });
    setSession(null);
  };

  if (session.mode === 'whiteboard') {
    return (
      <WhiteboardOnlyApp
        whiteboardId={session.whiteboardId}
        whiteboardName={session.whiteboardName}
        settings={session.settings}
        onHome={handleHome}
        uiController={uiController}
      />
    );
  }
  return <WorkspaceContainer pdfPath={session.pdfPath} settings={session.settings} onHome={handleHome} uiStore={uiStore} uiController={uiController} />;
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

function WhiteboardOnlyApp({ whiteboardId, whiteboardName, settings, onHome, uiController }) {
  const [headerVisible, setHeaderVisible] = useState(false);
  const lastSavedAt = null;
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
        {(() => {
          const Renderer = getContentRendererType('whiteboard').Component;
          return (
            <Renderer
              slotId="left"
              contentId={whiteboardId}
              settings={settings}
              uiController={uiController}
            />
          );
        })()}
      </div>
    </div>
  );
}

// ─── WorkspaceContainer ─────────────────────────────────────────────────────────────
function WorkspaceContainer({ pdfPath, settings, onHome, uiStore, uiController }) {
  const uiState = useUIState(uiStore);
  const [headerVisible, setHeaderVisible] = useState(false);
  const lastSavedAt = null;

  const showToast = useCallback((msg, type = 'info') => {
    uiController.showToast(msg, type);
    setTimeout(() => uiController.clearToast(), 3000);
  }, [uiController]);

  // Core Session Loading Effect
  useEffect(() => {
    if (pdfPath && uiController) {
      uiController.loadSession(pdfPath);
    }
  }, [pdfPath, uiController]);

  // Unload handler: Flush any pending saves
  useEffect(() => {
    const onUnload = () => uiController && uiController.flushSession();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [uiController]);

  const handleBackup = async () => {
    showToast('Backup migrating to new SQLite architecture!', 'success');
  };

  // Derive active slot configs from uiState — only slots with content are shown.
  // Order: 'left' first, then any additional slots (e.g. 'right').
  const slotConfigs = useMemo(() => {
    const activeSlots = [];
    const slotEntries = uiState.slots || {};
    // Ensure 'left' comes first, then remaining slots in insertion order
    const orderedIds = ['left', ...Object.keys(slotEntries).filter(id => id !== 'left')];
    for (const id of orderedIds) {
      const slot = slotEntries[id];
      if (slot?.contentType && slot?.slotType && slot?.contentId) {
        activeSlots.push({ id, slotType: slot.slotType });
      }
    }
    return activeSlots;
  }, [uiState.slots]);

  return (
    <div style={{ width: '100%', height: '100vh', background: '#1c1f26', fontFamily: "'IBM Plex Mono', monospace", position: 'relative', overflow: 'hidden' }}>
      <style>{`
        ::-webkit-scrollbar { width: 14px; height: 14px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.5); border-radius: 7px; border: 4px solid transparent; background-clip: padding-box; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.7); }
        @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>

      {/* Global Toast */}
      {uiState.toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: uiState.toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)',
          backdropFilter: 'blur(8px)', border: `1px solid ${uiState.toast.type === 'error' ? '#F87171' : '#34D399'}`,
          color: '#fff', padding: '10px 20px', borderRadius: '8px', zIndex: 9999,
          fontSize: '12px', fontWeight: '500', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeInUp 0.3s ease-out forwards'
        }}>
          {uiState.toast.type === 'error' ? '⚠' : '✓'} {uiState.toast.msg}
        </div>
      )}

      <WorkspaceHeader
        title={decodeURIComponent(pdfPath).split(/[/\\]/).pop()}
        onHome={onHome}
        onBackup={handleBackup}
        savedAt={lastSavedAt}
        headerVisible={headerVisible}
        setHeaderVisible={setHeaderVisible}
      />

      {/* Screen: layout and slot rendering fully delegated to roopa/Screen */}
      <Screen
        slots={slotConfigs}
        uiState={uiState}
        uiController={uiController}
        settings={settings}
        onHome={onHome}
        initialSplitPct={uiState.leftPct ?? 50}
      />
    </div>
  );
}
