import React, { useState, useEffect } from 'react';
import { sqlStorage } from '../storage_adapter/switch';
import { open } from '@tauri-apps/plugin-dialog';

export default function HomeWindow({ onSelectWindow }) {
  const [recentWindows, setRecentWindows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWindows();
  }, []);

  async function loadWindows() {
    setLoading(true);
    const windows = await sqlStorage.listWindows();
    setRecentWindows(windows);
    setLoading(false);
  }

  async function handleCreateNew() {
    const newWindow = {
      id: `win_${Date.now()}`,
      slots: [
        {
          id: `slot_${Date.now()}`,
          is_core: true,
          loaded_pane: null,
          back_navigation_stack: [],
          roopa_slot_config: null
        }
      ],
      roopa_window_config: null,
      multipane_preset: { type: 'NoneSpecial' }
    };
    await sqlStorage.saveWindow(newWindow);
    onSelectWindow(newWindow);
  }

  async function handleOpenPDF() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (selected) {
      // Create a new window with 2 slots: PDF and Whiteboard (Legacy behavior)
      const pdfPaneId = `pane_${Date.now()}_pdf`;
      const pdfPane = {
        id: pdfPaneId,
        content_type: 'source',
        file_name: selected.split('/').pop() || 'Untitled',
        blob_storage_path: selected,
        parent_content: null
      };

      const wbPaneId = `pane_${Date.now()}_wb`;
      const wbPane = {
        id: wbPaneId,
        content_type: 'derived',
        file_name: 'Whiteboard',
        blob_storage_path: `wb_${Date.now()}.whiteboard.json`,
        parent_content: pdfPane
      };

      await sqlStorage.saveContentPane(pdfPane);
      await sqlStorage.saveContentPane(wbPane);

      const newWindow = {
        id: `win_${Date.now()}`,
        slots: [
          {
            id: `slot_${Date.now()}_1`,
            is_core: true,
            loaded_pane: pdfPane,
            back_navigation_stack: [],
            roopa_slot_config: null
          },
          {
            id: `slot_${Date.now()}_2`,
            is_core: false,
            loaded_pane: wbPane,
            back_navigation_stack: [],
            roopa_slot_config: null
          }
        ],
        roopa_window_config: null,
        multipane_preset: { type: 'NoneSpecial' }
      };

      await sqlStorage.saveWindow(newWindow);
      onSelectWindow(newWindow);
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#111827',
      color: '#f3f4f6',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '2rem', fontWeight: '800', letterSpacing: '-0.025em' }}>
        PDF Board <span style={{ color: '#3B82F6' }}>v2</span>
      </h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
        <button
          onClick={handleCreateNew}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          New Workspace
        </button>
        <button
          onClick={handleOpenPDF}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            background: '#374151',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Open PDF
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#9CA3AF' }}>Recent Workspaces</h2>
        {loading ? (
          <p>Loading...</p>
        ) : recentWindows.length === 0 ? (
          <p style={{ color: '#6B7280' }}>No recent workspaces found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentWindows.map(win => (
              <div
                key={win.id}
                onClick={() => onSelectWindow(win)}
                style={{
                  padding: '1rem',
                  background: '#1F2937',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#374151'}
                onMouseLeave={e => e.currentTarget.style.background = '#1F2937'}
              >
                <span>{win.id}</span>
                <span style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
                  {win.slots.length} slot(s)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
