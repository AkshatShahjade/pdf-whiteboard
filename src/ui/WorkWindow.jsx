import { useState, useEffect, useCallback, useMemo } from 'react';
import { pdfjs } from 'react-pdf';
import HomeScreen from './HomeScreen.jsx';
import { createUIStateStore } from './ui_state_store';
import { createUIController } from './ui_controller';
import { useUIState } from './useUIState';
import { queryAPI } from '../atma/singletons';
import { getContentRendererType } from './renderer_registry/content_renderer_registry';
import { setupAllRegistries } from './renderer_registry/setup';
import Screen from '../roopa/Screen';
import { WorkspaceHeader } from '../roopa/elements/WorkspaceHeader';
import { ScreenToolbar } from '../roopa/elements/ScreenToolbar';
import { TriggerZone } from '../roopa/screen_edge_primitives/TriggerZone';

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
        onOpen={({ contentId, contentType, contentName, settings }) => {
          setSession({ contentId, contentType, contentName, settings });
        }}
      />
    );
  }

  const handleHome = () => {
    uiStore.setState({ slots: {} });
    setSession(null);
  };

  return <WorkspaceContainer contentId={session.contentId} contentType={session.contentType} contentName={session.contentName} settings={session.settings} onHome={handleHome} uiStore={uiStore} uiController={uiController} />;
}

// ─── WorkspaceContainer ─────────────────────────────────────────────────────────────
function WorkspaceContainer({ contentId, contentType, contentName, settings, onHome, uiStore, uiController }) {
  const uiState = useUIState(uiStore);
  const lastSavedAt = null;

  const showToast = useCallback((msg, type = 'info') => {
    uiController.showToast(msg, type);
    setTimeout(() => uiController.clearToast(), 3000);
  }, [uiController]);

  // Core Session Loading Effect
  useEffect(() => {
    if (contentId && contentType && uiController) {
      uiController.onContentChange('left', contentId, contentType);
    }
  }, [contentId, contentType, uiController]);

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
  // NOTE: Screen now renders slots dynamically based on ROOPA_WORKSPACES configuration,
  // so we no longer need to pass slotConfigs here.

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

      <TriggerZone 
        position="top" 
        style={{ left: '50%', transform: 'translateX(-50%)' }}
        innerElement={
          <WorkspaceHeader
            title={contentName || decodeURIComponent(contentId).split(/[/\\]/).pop()}
            onHome={onHome}
            onBackup={handleBackup}
            savedAt={lastSavedAt}
            uiStore={uiStore}
          />
        }
      />

      {/* Screen: layout and slot rendering fully delegated to roopa/Screen */}
      <Screen
        uiState={uiState}
        uiController={uiController}
        settings={settings}
        onHome={onHome}
        workspaceId={settings?.activeWorkspaceId}
      />
      
      <TriggerZone
        position="bottom"
        style={{ left: '50%', transform: 'translateX(-50%)' }}
        innerElement={
          <ScreenToolbar uiState={uiState} uiController={uiController} uiStore={uiStore} />
        }
      />
    </div>
  );
}
