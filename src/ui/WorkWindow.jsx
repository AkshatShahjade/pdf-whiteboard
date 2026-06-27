import { useState, useEffect, useCallback, useMemo } from 'react';
import { pdfjs } from 'react-pdf';
import HomeScreen from './HomeScreen.jsx';
import { createUIStateStore } from './ui_state_store';
import { createUIController } from './ui_controller';
import { useUIState } from './useUIState';
import { queryAPI } from '../atma/singletons';
import { DEFAULT_APP_STATE } from '../atma/app_state_store';
import { getContentRendererType } from './renderer_registry/content_renderer_registry';
import { setupAllRegistries } from './renderer_registry/setup';
import Screen from '../roopa/Screen';
import { WorkspaceHeader } from '../roopa/elements/WorkspaceHeader';

setupAllRegistries(); //TODO, find proper place



pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

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
      uiController.onContentChange('left', pdfPath, 'pdf');
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
