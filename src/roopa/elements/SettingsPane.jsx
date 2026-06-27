import { useState } from 'react';
import { confirmDialog } from '../../atma/platform_adapter/switch.ts';

function HelpModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#262a33', border: '1px solid #374151', borderRadius: '12px', width: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', fontFamily: "'IBM Plex Mono', monospace" }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '15px', color: '#f3f4f6', letterSpacing: '0.05em' }}>📘 LemmaMap Mechanics & Guide</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px', color: '#d1d5db', fontSize: '12px', lineHeight: '1.6' }}>

          <section>
            <h3 style={{ color: '#60A5FA', margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase' }}>1. The Core Philosophy</h3>
            <p style={{ margin: 0 }}>LemmaMap bridges the gap between static PDFs and infinite whiteboards. It allows you to draw spatial bounds over theorems, proofs, or diagrams inside your PDF, and ties an infinite canvas (Tldraw) to that specific bounding box. Select a region on the left, map your derivations on the right.</p>
          </section>

          <section>
            <h3 style={{ color: '#10B981', margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase' }}>2. Tool Mechanics & Shortcuts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px' }}>
              <kbd style={{ background: '#1c1f26', border: '1px solid #374151', borderRadius: '4px', padding: '4px 8px', textAlign: 'center', height: 'fit-content' }}>V</kbd>
              <div><strong>Select Tool:</strong> Click existing regions to open their corresponding whiteboard. Ctrl/Cmd + Click to select a region for movement or resizing.</div>

              <kbd style={{ background: '#1c1f26', border: '1px solid #374151', borderRadius: '4px', padding: '4px 8px', textAlign: 'center', height: 'fit-content' }}>R</kbd>
              <div><strong>Freeform Rect:</strong> Click and drag to create rectangular bounding boxes over target concepts.</div>

              <kbd style={{ background: '#1c1f26', border: '1px solid #374151', borderRadius: '4px', padding: '4px 8px', textAlign: 'center', height: 'fit-content' }}>C</kbd>
              <div><strong>Lasso Tool:</strong> Freehand draw around irregular shapes or equations. Auto-closes when you lift the mouse.</div>

              <kbd style={{ background: '#1c1f26', border: '1px solid #374151', borderRadius: '4px', padding: '4px 8px', textAlign: 'center', height: 'fit-content' }}>S</kbd>
              <div><strong>Section Divider:</strong> Creates horizontal bounds spanning the entire width of the document. Click once for the top bound, once for the bottom bound, and hit <em>Enter</em> to confirm.</div>

              <kbd style={{ background: '#1c1f26', border: '1px solid #374151', borderRadius: '4px', padding: '4px 8px', textAlign: 'center', height: 'fit-content' }}>X</kbd>
              <div><strong>Remove Tool:</strong> Click on a region to permanently delete it and its associated whiteboard data.</div>
            </div>
          </section>

          <section>
            <h3 style={{ color: '#F59E0B', margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase' }}>3. Advanced View Controls</h3>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Ctrl + Scroll:</strong> Zoom in and out of the PDF dynamically.</li>
              <li><strong>Shift + Scroll:</strong> Pan horizontally if you are zoomed in.</li>
              <li><strong>Ctrl + \:</strong> Quickly snap the center splitter pane back to 55% width.</li>
              <li><strong>Esc:</strong> Deselect tools, cancel shape editing, or close active region.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: '#EC4899', margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase' }}>4. Technical Architecture</h3>
            <p style={{ margin: '0 0 8px 0' }}>Data persistence is optimized using a high-performance SQLite database:</p>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>SQLite Database:</strong> Replaces browser-local storage completely. Stores all workspace layouts, document-scoped UI states, global settings, drawing marks, and whiteboard snapshots.</li>
              <li><strong>Relational Integrity:</strong> Built with cascade deletes and indexed tables to guarantee lightning-fast queries and zero data loss on restart.</li>
            </ul>
            <p style={{ margin: '8px 0 0 0' }}>Rolling Backups seamlessly zip the database state into unified JSON payloads, maintaining version control of your work.</p>
          </section>

        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #374151', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#3B82F6', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 24px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Understood</button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, hint, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      {hint && <span style={{ fontSize: '10px', color: '#6b7280' }}>{hint}</span>}
    </div>
    {children}
  </div>
);

export function SettingsPane({ open: isOpen, onClose, settings, onChange, backupPath, onSetBackupPath, showToast, onClearRecents }) {
  const [helpOpen, setHelpOpen] = useState(false);

  const btnStyle = {
    flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #374151', background: 'transparent', color: '#d1d5db', fontSize: '11px', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
  };

  const handleExport = async () => { showToast('JSON Export is migrating to new DB architecture.', 'info'); };
  const handleImport = async () => { showToast('JSON Import is migrating to new DB architecture.', 'info'); };
  const handleRollingBackup = async () => { showToast('Rolling backup is migrating to new DB architecture.', 'info'); };

  const handleClearRecents = async () => {
    const yes = await confirmDialog('Clear all recent files? Whiteboard and session settings will be preserved.', 'Clear Recents');
    if (yes) {
      await onClearRecents();
    }
  };

  return (
    <>
      {isOpen && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90, backdropFilter: 'blur(4px)' }} />}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '340px', background: '#252932', borderLeft: '1px solid #374151', zIndex: 100, transform: isOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', fontFamily: "'IBM Plex Mono', monospace", boxShadow: '-10px 0 30px rgba(0,0,0,0.3)' }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#f3f4f6', letterSpacing: '0.05em' }}>SETTINGS</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Field label="Default split" hint={`${settings.defaultSplit}%`}>
            <input type="range" min="20" max="80" step="5" value={settings.defaultSplit} onChange={(e) => onChange({ ...settings, defaultSplit: +e.target.value })} style={{ width: '100%', accentColor: '#3B82F6' }} />
          </Field>
          <Field label="Autosave delay" hint={`${settings.autosaveMs}ms`}>
            <input type="range" min="200" max="2000" step="100" value={settings.autosaveMs} onChange={(e) => onChange({ ...settings, autosaveMs: +e.target.value })} style={{ width: '100%', accentColor: '#3B82F6' }} />
          </Field>
          <Field label="Max shortcut tools" hint={`${settings.maxGlobalPdfTools}`}>
            <input type="range" min="1" max="12" step="1" value={settings.maxGlobalPdfTools} onChange={(e) => onChange({ ...settings, maxGlobalPdfTools: +e.target.value })} style={{ width: '100%', accentColor: '#3B82F6' }} />
          </Field>
          <Field label="Default Tool">
            <select
              value={settings.defaultTool}
              onChange={(e) => onChange({ ...settings, defaultTool: e.target.value })}
              style={{ width: '100%', background: '#1c1f26', border: '1px solid #4b5563', color: '#e5e7eb', padding: '8px', borderRadius: '6px', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }}
            >
              <option value="select">Select</option>
              <option value="draw">Draw (Pencil)</option>
              <option value="handwriting">Handwriting</option>
              <option value="eraser">Eraser</option>
              <option value="arrow">Arrow</option>
              <option value="text">Text</option>
              <option value="note">Sticky Note</option>
            </select>
          </Field>

          <div style={{ borderTop: '1px solid #374151', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Auto Backup</span>
            <button onClick={onSetBackupPath} style={{ ...btnStyle, textAlign: 'left', borderColor: backupPath ? '#3B82F6' : '#374151' }}>
              📁 {backupPath ? 'Change Backup Folder' : 'Set Backup Folder'}
            </button>
            {backupPath && (
              <span style={{ fontSize: '10px', color: '#9ca3af', wordBreak: 'break-all' }}>{backupPath}</span>
            )}
            <button onClick={handleRollingBackup} style={{ ...btnStyle, background: 'rgba(59,130,246,0.1)', color: '#93C5FD', borderColor: '#3B82F6' }}>
              Create Rolling Backup Now
            </button>
          </div>

          <div style={{ borderTop: '1px solid #374151', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Data Export/Import</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleExport} style={btnStyle}>Export JSON</button>
              <button onClick={handleImport} style={btnStyle}>Import JSON</button>
            </div>
            <button onClick={handleClearRecents} style={{ ...btnStyle, color: '#F87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}>Clear Recent Files</button>
          </div>

          <div style={{ borderTop: '1px solid #374151', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Help & Guide</span>
            <button onClick={() => setHelpOpen(true)} style={{ ...btnStyle, background: 'rgba(16, 185, 129, 0.1)', color: '#34D399', borderColor: '#10B981' }}>
              📖 View Mechanics & Shortcuts
            </button>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #374151' }}><span style={{ fontSize: '10px', color: '#6b7280' }}>LemmaMap · local build</span></div>
      </div>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
