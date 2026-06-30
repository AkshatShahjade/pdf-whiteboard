import { useState, useEffect } from 'react';
import { confirmDialog } from '../../atma/platform_adapter/switch.ts';
import { SettingsCard } from '../primitives/SettingsCard';
import { ButtonFlat } from '../primitives/ButtonFlat';

function HelpModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#262a33', border: '1px solid #374151', borderRadius: '12px', width: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', fontFamily: "'IBM Plex Mono', monospace" }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '15px', color: '#f3f4f6', letterSpacing: '0.05em' }}>📘 LemmaMap Mechanics & Guide</h2>
          <ButtonFlat label="✕" onClick={onClose} />
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
          <ButtonFlat label="Understood" onClick={onClose} />
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

// --- Capability Hook ---
export function useSettingsPane(showToast, onClearRecents) {
  const [helpOpen, setHelpOpen] = useState(false);

  const openHelp = () => setHelpOpen(true);
  const closeHelp = () => setHelpOpen(false);

  const handleExport = async () => { showToast('JSON Export is migrating to new DB architecture.', 'info'); };
  const handleImport = async () => { showToast('JSON Import is migrating to new DB architecture.', 'info'); };
  const handleRollingBackup = async () => { showToast('Rolling backup is migrating to new DB architecture.', 'info'); };

  const handleClearRecents = async () => {
    const yes = await confirmDialog('Clear all recent files? Whiteboard and session settings will be preserved.', 'Clear Recents');
    if (yes) {
      await onClearRecents();
    }
  };

  return {
    helpOpen,
    openHelp,
    closeHelp,
    handleExport,
    handleImport,
    handleRollingBackup,
    handleClearRecents,
  };
}

export function SettingsPane({ open: isOpen, onClose, settings, onChange, backupPath, onSetBackupPath, showToast, onClearRecents, uiController }) {
  const {
    helpOpen,
    openHelp,
    closeHelp,
    handleExport,
    handleImport,
    handleRollingBackup,
    handleClearRecents,
  } = useSettingsPane(showToast, onClearRecents);

  const [dbDefaults, setDbDefaults] = useState({});
  const [schemaArray, setSchemaArray] = useState([]);
  const [originalDbDefaults, setOriginalDbDefaults] = useState({});
  const [originalSchemaArray, setOriginalSchemaArray] = useState([]);
  const [errors, setErrors] = useState({});
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
     async function loadDefaults() {
         try {
             const { stateSchemaRegistry } = await import('../../atma/storage/state_schema_registry');
             const schemas = Object.values(stateSchemaRegistry).filter(s => s.classification !== 'volatile' && s.userModifyable === true);
             
             const { queryAPI } = await import('../../atma/singletons');
             const rows = await queryAPI.getAllStateDefaults();
             const ws = await queryAPI.getAllWorkspaces();
             setWorkspaces(ws);
             
             const classOverridesRow = rows.find(r => r.key === '_classification_overrides' && r.scope === 'global');
             const classOverrides = classOverridesRow ? classOverridesRow.value : {};

             const defaultsMap = {};
             for (const row of rows) {
                 if (row.key === '_classification_overrides') continue;
                 if (!defaultsMap[row.key]) defaultsMap[row.key] = [];
                 defaultsMap[row.key].push({ scope: row.scope, value: row.value, hash: row.hash });
             }
             
             // Attach classification overrides
             const enrichedSchemas = schemas.map(schema => ({
                 ...schema,
                 classification: classOverrides[schema.key] || schema.classification
             }));

             setSchemaArray(enrichedSchemas);
             setDbDefaults(defaultsMap);
             setOriginalSchemaArray(JSON.parse(JSON.stringify(enrichedSchemas)));
             setOriginalDbDefaults(JSON.parse(JSON.stringify(defaultsMap)));
             setErrors({});
         } catch (err) {
             console.error("Failed to load DB defaults:", err);
         }
     }
     if (isOpen) {
         loadDefaults();
     }
  }, [isOpen]);

  const handleUpdateDefault = (key, scope, val) => {
      setDbDefaults(prev => {
          const next = { ...prev };
          if (!next[key]) next[key] = [];
          const idx = next[key].findIndex(d => d.scope === scope);
          if (idx >= 0) {
              next[key][idx] = { ...next[key][idx], value: val };
          } else {
              next[key].push({ scope, value: val, hash: '' });
          }
          return next;
      });
  };

  const handleDeleteDefault = (key, scope) => {
      setDbDefaults(prev => {
          const next = { ...prev };
          if (next[key]) {
              next[key] = next[key].filter(d => d.scope !== scope);
          }
          return next;
      });
  };

  const handleUpdateClassification = (key, cls) => {
      setSchemaArray(prev => prev.map(s => s.key === key ? { ...s, classification: cls } : s));
  };

  const handleValidationError = (key, scope, err) => {
      setErrors(prev => {
          const id = `${key}-${scope}`;
          if (err) {
              if (prev[id] === err) return prev;
              const next = { ...prev };
              next[id] = err;
              return next;
          } else {
              if (!(id in prev)) return prev;
              const next = { ...prev };
              delete next[id];
              return next;
          }
      });
  };

  const handleSave = async () => {
      if (Object.keys(errors).length > 0) return;

      if (uiController) {
          try {
              // 1. Commit classification overrides
              for (const s of schemaArray) {
                  const orig = originalSchemaArray.find(o => o.key === s.key);
                  if (orig && orig.classification !== s.classification) {
                      await uiController.updateClassification(s.key, s.classification);
                  }
              }

              // 2. Commit default updates & deletions
              const allKeys = new Set([...Object.keys(originalDbDefaults), ...Object.keys(dbDefaults)]);
              for (const key of allKeys) {
                  const origList = originalDbDefaults[key] || [];
                  const currList = dbDefaults[key] || [];

                  // Compare and update/insert
                  for (const curr of currList) {
                      const orig = origList.find(o => o.scope === curr.scope);

                      let parsedValue = curr.value;
                      if (typeof curr.value === 'string') {
                          try {
                              parsedValue = JSON.parse(curr.value);
                          } catch (e) {
                              parsedValue = curr.value;
                          }
                      }

                      if (!orig || JSON.stringify(orig.value) !== JSON.stringify(parsedValue)) {
                          await uiController.updateDefaultValue(key, curr.scope, parsedValue);
                      }
                  }

                  // Delete removed scopes
                  for (const orig of origList) {
                      const curr = currList.find(c => c.scope === orig.scope);
                      if (!curr) {
                          await uiController.deleteDefaultValue(key, orig.scope);
                      }
                  }
              }

              showToast('Settings saved successfully', 'success');
              onClose();
          } catch (err) {
              console.error("Failed to save settings:", err);
              showToast('Failed to save settings', 'error');
          }
      }
  };

  const handleCancel = () => {
      // Revert states and close
      setSchemaArray(JSON.parse(JSON.stringify(originalSchemaArray)));
      setDbDefaults(JSON.parse(JSON.stringify(originalDbDefaults)));
      setErrors({});
      onClose();
  };

  return (
    <>
      {isOpen && <div onClick={handleCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90, backdropFilter: 'blur(4px)' }} />}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: '#252932', borderLeft: '1px solid #374151', zIndex: 100, transform: isOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', fontFamily: "'IBM Plex Mono', monospace", boxShadow: '-10px 0 30px rgba(0,0,0,0.3)' }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#f3f4f6', letterSpacing: '0.05em' }}>SETTINGS</span>
          <ButtonFlat label="✕" onClick={handleCancel} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>State Variables (Layer 2)</span>
              {schemaArray.map(schema => (
                  <SettingsCard 
                      key={schema.key}
                      schema={schema}
                      currentClassification={schema.classification}
                      scopedDefaults={dbDefaults[schema.key] || []}
                      onUpdateDefault={handleUpdateDefault}
                      onUpdateClassification={handleUpdateClassification}
                      onDeleteDefault={handleDeleteDefault}
                      onValidationError={handleValidationError}
                      libraryPath={settings?.libraryPath}
                  />
              ))}
          </div>

          <div style={{ borderTop: '1px solid #374151', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Auto Backup</span>
            <ButtonFlat label={backupPath ? 'Change Backup Folder' : 'Set Backup Folder'} icon="📁" onClick={onSetBackupPath} />
            {backupPath && (
              <span style={{ fontSize: '10px', color: '#9ca3af', wordBreak: 'break-all' }}>{backupPath}</span>
            )}
            <ButtonFlat label="Create Rolling Backup Now" onClick={handleRollingBackup} />
          </div>

          <div style={{ borderTop: '1px solid #374151', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Data Export/Import</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <ButtonFlat label="Export JSON" onClick={handleExport} />
              <ButtonFlat label="Import JSON" onClick={handleImport} />
            </div>
            <ButtonFlat label="Clear Recent Files" onClick={handleClearRecents} />
          </div>

          <div style={{ borderTop: '1px solid #374151', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Workspace Selector</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {workspaces.map(ws => (
                  <ButtonFlat 
                      key={ws.id} 
                      label={ws.name} 
                      icon={settings?.activeWorkspaceId === ws.id ? '✓' : '◦'} 
                      onClick={() => {
                          if (uiController) {
                              uiController.updateDefaultValue('activeWorkspaceId', 'global', ws.id);
                          }
                          if (onChange) {
                              onChange({ ...settings, activeWorkspaceId: ws.id });
                          }
                      }} 
                  />
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #374151', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Help & Guide</span>
            <ButtonFlat label="View Mechanics & Shortcuts" icon="📖" onClick={openHelp} />
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '12px', background: '#1c1f26' }}>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <ButtonFlat label="Cancel" onClick={handleCancel} />
            <ButtonFlat 
              label="Save" 
              disabled={Object.keys(errors).length > 0} 
              onClick={handleSave} 
            />
          </div>
          <span style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>LemmaMap · local build</span>
        </div>
      </div>
      <HelpModal open={helpOpen} onClose={closeHelp} />
    </>
  );
}
