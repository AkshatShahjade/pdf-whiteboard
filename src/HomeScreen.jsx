/**
 * HomeScreen.jsx — LemmaMap launch screen
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  loadSession,
  getAllData,
  restoreAllData,
  performRollingBackup,
  createWhiteboard,
} from './storage.js';
import { basenamee, confirmErrorDialog, convertFileSrcAKS, cpyFile, dirnamee, existsAKS, jjoin, makeDirectory, openFile1, openFile2, rdTextFile, readDirAKS, remmove, saveFile, wrtFile, wrtTextFile } from './platform_adapter/switch.js';

// ─── Tauri Imports ────────────────────────────────────────────────────────────
// ─── constants ────────────────────────────────────────────────────────────────

const ABOUT = {
  name:    'Akshat Shahjade',
  role:    'BS Mathematics & Scientific Computing',
  org:     'IIT Kanpur',
  email:   'ashahjade23@iitk.ac.in',
  phone:   '+91 93033 02251',
  github:  'AkshatShahjade',
  linkedin:'Akshat Shahjade',
  bio: [
    'AIR 761 · JEE Advanced 2023',
    'Full-stack · Android · ML',
    'DELF B1 · French',
  ],
  skills: ['Python', 'React', 'FastAPI', 'C++', 'Kotlin', 'SQL', 'LaTeX'],
};

const RECENTS_KEY = 'lemmamap:recents';

function getRecents() {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch { return []; }
}

function pushRecent(entry) {
  try {
    const list = getRecents().filter(r => r.path !== entry.path).slice(0, 7);
    list.unshift({ ...entry, openedAt: Date.now() });
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

function removeRecent(path) {
  try {
    const list = getRecents().filter(r => r.path !== path);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60)   return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function regionCount(path) {
  if (!path || path.startsWith('whiteboard:')) return 0;
  const s = loadSession(path);
  return s?.regions?.length ?? 0;
}

const SETTINGS_KEY = 'lemmamap:settings';
const DEFAULT_SETTINGS = {
  defaultSplit: 50,
  theme:        'dark',
  autosaveMs:   800,
  maxGlobalPdfTools: 8,
  defaultTool: 'draw',
};

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch { return DEFAULT_SETTINGS; }
}

function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GridLines() {
  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.05 }}>
      <defs>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

function CornerMark({ pos }) {
  const style = {
    position: 'fixed', zIndex: 1, opacity: 0.3,
    ...(pos === 'tl' ? { top: 24, left: 24 } : pos === 'tr' ? { top: 24, right: 24 } : pos === 'bl' ? { bottom: 24, left: 24 } : { bottom: 24, right: 24 }),
  };
  return (
    <svg width="20" height="20" style={style}>
      {pos === 'tl' && <><line x1="0" y1="0" x2="14" y2="0" stroke="#60A5FA" strokeWidth="1.5"/><line x1="0" y1="0" x2="0" y2="14" stroke="#60A5FA" strokeWidth="1.5"/></>}
      {pos === 'tr' && <><line x1="20" y1="0" x2="6"  y2="0" stroke="#60A5FA" strokeWidth="1.5"/><line x1="20" y1="0" x2="20" y2="14" stroke="#60A5FA" strokeWidth="1.5"/></>}
      {pos === 'bl' && <><line x1="0" y1="20" x2="14" y2="20" stroke="#60A5FA" strokeWidth="1.5"/><line x1="0" y1="20" x2="0" y2="6" stroke="#60A5FA" strokeWidth="1.5"/></>}
      {pos === 'br' && <><line x1="20" y1="20" x2="6"  y2="20" stroke="#60A5FA" strokeWidth="1.5"/><line x1="20" y1="20" x2="20" y2="6" stroke="#60A5FA" strokeWidth="1.5"/></>}
    </svg>
  );
}

function DropZone({ onBrowseClick, onFileDrop, disabled, showToast }) {
  const [dragging, setDragging] = useState(false);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    if (disabled) return showToast("Please set a Library Folder first!", "error");
    const file = [...e.dataTransfer.files].find(f => f.type === 'application/pdf');
    if (file && onFileDrop) onFileDrop(file);
  }, [onFileDrop, disabled, showToast]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={disabled ? () => showToast("Please set a Library Folder first!", "error") : onBrowseClick}
      style={{
        position: 'relative', border: `1.5px ${dragging ? 'solid' : 'dashed'} ${dragging ? '#3B82F6' : '#374151'}`, borderRadius: '10px', padding: '48px 32px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s', backdropFilter: 'blur(4px)', opacity: disabled ? 0.4 : 1
      }}
    >
      {dragging && <div style={{ position: 'absolute', inset: -1, borderRadius: '10px', border: '1.5px solid #3B82F6', animation: 'pulse-ring 1s ease-out infinite', pointerEvents: 'none' }} />}
      <div style={{ fontSize: '32px', marginBottom: '14px', opacity: dragging ? 1 : 0.6 }}>{dragging ? '⬇' : '📄'}</div>
      <div style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.08em', color: dragging ? '#60A5FA' : '#d1d5db', textTransform: 'uppercase', marginBottom: '6px' }}>{dragging ? 'Drop to copy to library' : 'Import New PDF'}</div>
      <div style={{ fontSize: '11px', color: '#9ca3af' }}>drag & drop · or click to browse</div>
    </div>
  );
}

function RecentCard({ entry, onOpen, onRemove }) {
  const [hovered, setHovered] = useState(false);
  const regions = regionCount(entry.path);
  const name = entry.name || entry.path.split('/').pop();
  const session = loadSession(entry.path);

  return (
    <div
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', border: `1px solid ${hovered ? '#3B82F6' : '#2a2e39'}`, borderRadius: '8px', padding: '16px 18px', cursor: 'pointer', background: hovered ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: '6px',
      }}
      onClick={() => onOpen(entry)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(entry.path); }}
        style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '13px', padding: '2px 5px', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s', borderRadius: '4px' }}
        title="Remove from recents"
      >✕</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px', opacity: 0.8 }}>📄</span>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{name}</span>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{timeAgo(entry.openedAt)}</span>
        {regions > 0 && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.3)' }}>{regions} region{regions !== 1 ? 's' : ''}</span>}
        {session?.scrollTop > 0 && <span style={{ fontSize: '9px', color: '#6b7280' }}>p.{Math.ceil(session.scrollTop / 1100) + 1}</span>}
      </div>
    </div>
  );
}

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
            <p style={{ margin: '0 0 8px 0' }}>Data persistence is optimized into two deliberate backend pipelines to maximize performance:</p>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>localStorage:</strong> Handles lightweight metadata (scroll position, pane splitter ratio, active region, and geometric bounds of drawn boxes). Ensures zero-latency layout reconstruction on startup.</li>
              <li><strong>IndexedDB:</strong> Stores the heavy Tldraw shape/asset graphs. Each region acts as an independent record mapped to a primary key.</li>
            </ul>
            <p style={{ margin: '8px 0 0 0' }}>Rolling Backups seamlessly zip both storage mediums into unified JSON payloads, maintaining version control of your work.</p>
          </section>

        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #374151', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#3B82F6', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 24px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Understood</button>
        </div>
      </div>
    </div>
  );
}


function SettingsDrawer({ open: isOpen, onClose, settings, onChange, backupPath, onSetBackupPath, showToast }) {
  const [helpOpen, setHelpOpen] = useState(false);

  const Field = ({ label, hint, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        {hint && <span style={{ fontSize: '10px', color: '#6b7280' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );

  const btnStyle = {
    flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #374151', background: 'transparent', color: '#d1d5db', fontSize: '11px', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
  };

  const handleExport = async () => {
    try {
      const data = await getAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const filePath = await saveFile('LemmaMap Backup', ['json'], 'lemmamap_backup.json'); 

      if (filePath) {
        await wrtTextFile(filePath, jsonStr);
        showToast('Export successful!', 'success');
      }
    } catch (e) { console.error(e); showToast('Export failed: ' + e.message, 'error'); }
  };

  const handleImport = async () => {
    try {
      const filePath = await openFile1('JSON Backup', ['json'], false);

      if (filePath) {
        const content = await rdTextFile(filePath);
        const data = JSON.parse(content);
        await restoreAllData(data);
        showToast('Import successful! Reloading LemmaMap...', 'success');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) { console.error(e); showToast('Import failed: ' + e.message, 'error'); }
  };

  const handleRollingBackup = async () => {
    try {
      const idx = await performRollingBackup();
      showToast(`Rolling backup successful! (Created backup_${idx}.json)`, 'success');
    } catch (e) { console.error(e); showToast('Backup failed: ' + e.message, 'error'); }
  };

  const handleClearRecents = async () => {
    const yes = await confirmErrorDialog('Clear all recent files? Whiteboard and session settings will be preserved.', 'Clear Recents');
    if (yes) {
      localStorage.removeItem('lemmamap:recents');
      window.location.reload();
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
          <Field label="Max global PDF tools" hint={`${settings.maxGlobalPdfTools}`}>
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

          {/* Backup Section */}
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

          {/* Data Management Section */}
          <div style={{ borderTop: '1px solid #374151', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Data Export/Import</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleExport} style={btnStyle}>Export JSON</button>
              <button onClick={handleImport} style={btnStyle}>Import JSON</button>
            </div>
            <button onClick={handleClearRecents} style={{ ...btnStyle, color: '#F87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}>Clear Recent Files</button>
          </div>

          {/* Help & Guide Section */}
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

function AboutPanel({ open: isOpen, onClose }) {
  return (
    <>
      {isOpen && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 90, backdropFilter: 'blur(2px)' }} />}
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '300px', background: '#252932', borderRight: '1px solid #374151', zIndex: 100, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', fontFamily: "'IBM Plex Mono', monospace", boxShadow: '10px 0 30px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase' }}>About the Author</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', letterSpacing: '-0.01em', marginBottom: '4px' }}>{ABOUT.name}</div>
            <div style={{ fontSize: '11px', color: '#60A5FA', letterSpacing: '0.04em', marginBottom: '2px' }}>{ABOUT.role}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{ABOUT.org}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ABOUT.bio.map((line, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#60A5FA', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#d1d5db' }}>{line}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Stack</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {ABOUT.skills.map(s => <span key={s} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: '1px solid #374151', color: '#d1d5db' }}>{s}</span>)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '10px', color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>Contact</div>
            {[
              { icon: '✉', label: ABOUT.email,    href: `mailto:${ABOUT.email}` },
              { icon: '☎', label: ABOUT.phone,    href: `tel:${ABOUT.phone.replace(/\s/g,'')}` },
              { icon: '⌥', label: `gh/${ABOUT.github}`, href: `https://github.com/${ABOUT.github}` },
              { icon: '⬡', label: 'LinkedIn',     href: `https://linkedin.com/in/akshat-shahjade` },
            ].map(({ icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#9ca3af', fontSize: '11px', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#93C5FD'} onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
              >
                <span style={{ fontSize: '13px', width: '16px', textAlign: 'center', opacity: 0.8 }}>{icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              </a>
            ))}
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #374151' }}><span style={{ fontSize: '10px', color: '#6b7280' }}>built with LemmaMap</span></div>
      </div>
    </>
  );
}

export default function HomeScreen({ onOpen }) {
  const [recents, setRecents]         = useState(getRecents);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen]     = useState(false);
  const [settings, setSettings]       = useState(loadSettings);
  const [mounted, setMounted]         = useState(false);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName]     = useState('');
  const [isWhiteboardModalOpen, setIsWhiteboardModalOpen] = useState(false);
  const [newWhiteboardName, setNewWhiteboardName] = useState('');

  const [libraryPath, setLibraryPath] = useState(localStorage.getItem('lemmamap:library') || null);
  const [backupPath, setBackupPath]   = useState(localStorage.getItem('lemmamap:backupPath') || null);
  const [currentDir, setCurrentDir]   = useState(localStorage.getItem('lemmamap:library') || null);
  const [entries, setEntries]         = useState([]);


  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => { setTimeout(() => setMounted(true), 30); }, []);

  const handleSettingsChange = useCallback((s) => { setSettings(s); saveSettings(s); }, []);

  const refreshDir = useCallback(async (dir) => {
    if (!dir) return;
    try {
      const items = await readDirAKS(dir);
      const fsEntries = items
        .filter(i => i.isDirectory || (i.isFile && (i.name.toLowerCase().endsWith('.pdf') || i.name.toLowerCase().endsWith('.whiteboard.json'))))
        .sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
      setEntries(fsEntries);
    } catch (e) { console.error("Failed to read directory:", e); }
  }, []);

  useEffect(() => { if (currentDir) refreshDir(currentDir); }, [currentDir, refreshDir]);

  const handleSetLibrary = async () => {
    try {
      const selected = await openFile2(true)
      
      if (selected) {
        setLibraryPath(selected); setCurrentDir(selected);
        localStorage.setItem('lemmamap:library', selected);
      }
    } catch (err) { console.error(err); }
  };

  const handleSetBackupPath = async () => {
    try {
      const selected = await openFile2(true);
      if (selected) {
        setBackupPath(selected);
        localStorage.setItem('lemmamap:backupPath', selected);
      }
    } catch (err) { console.error(err); }
  };

  const handleNewFolder = () => {
    if (!currentDir) return;
    setNewFolderName('');
    setIsFolderModalOpen(true);
  };

  const handleNewWhiteboard = () => {
    if (!currentDir) return;
    setNewWhiteboardName('');
    setIsWhiteboardModalOpen(true);
  };

  const confirmNewFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const newPath = await jjoin(currentDir, newFolderName.trim());
      if (!(await existsAKS(newPath))) {
        await makeDirectory(newPath); refreshDir(currentDir); setIsFolderModalOpen(false);
      } else { showToast("A folder with that name already exists.", "error"); }
    } catch (err) { console.error(err); }
  };

  const handleImportBrowse = async () => {
    try {
      const file = await openFile1('PDF', ['pdf'], true);
      if (file && currentDir) {
        const name = await basenamee(file);
        const dest = await jjoin(currentDir, name);
        if (await existsAKS(dest)) return showToast("File already exists in this folder.", "error");
        await cpyFile(file, dest);
        refreshDir(currentDir);
      }
    } catch (err) { console.error(err); }
  };

  const handleImportDrop = async (file) => {
    try {
      const dest = await jjoin(currentDir, file.name);
      if (await existsAKS(dest)) return showToast("File already exists in this folder.", "error");
      const buffer = await file.arrayBuffer();
      await wrtFile(dest, new Uint8Array(buffer));
      refreshDir(currentDir);
    } catch (err) { console.error(err); }
  };

  const handleEntryClick = async (entry) => {
    try {
      if (entry.isDirectory) {
        const nextDir = await jjoin(currentDir, entry.name);
        setCurrentDir(nextDir);
      } else {
        const fullPath = await jjoin(currentDir, entry.name);
        if (entry.name.toLowerCase().endsWith('.whiteboard.json')) {
          const raw = await rdTextFile(fullPath);
          const meta = JSON.parse(raw);
          if (!meta?.id) throw new Error('Invalid whiteboard file.');
          const wbPath = `whiteboard:${meta.id}`;
          const recentEntry = { path: wbPath, name: meta.name || entry.name.replace(/\.whiteboard\.json$/i, ''), openedAt: Date.now(), isWhiteboard: true, sourcePath: fullPath };
          pushRecent(recentEntry);
          onOpen(null, { id: meta.id, name: meta.name || 'Whiteboard' }, settings, null);
          return;
        }
        const safeUrl = convertFileSrcAKS(fullPath);
        const recentEntry = { path: safeUrl, name: entry.name, openedAt: Date.now(), isLocal: true, sourcePath: fullPath };
        pushRecent(recentEntry);
        onOpen(safeUrl, null, settings, fullPath);
      }
    } catch (err) { console.error(err); }
  };

  const handleUpDir = async () => {
    if (currentDir === libraryPath) return;
    try {
      const parent = await dirnamee(currentDir);
      setCurrentDir(parent);
    } catch (err) { console.error(err); }
  };

  const handleRecentOpen = useCallback((entry) => {
    pushRecent({ ...entry, openedAt: Date.now() });
    if (entry.path.startsWith('whiteboard:')) {
      const id = entry.path.replace('whiteboard:', '');
      onOpen(null, { id, name: entry.name || 'Whiteboard' }, settings, null);
      return;
    }
    onOpen(entry.path, null, settings, entry.sourcePath || null);
  }, [onOpen, settings]);

  const confirmNewWhiteboard = async () => {
    const trimmed = newWhiteboardName.trim();
    if (!trimmed) return;
    try {
      await createWhiteboard(trimmed, currentDir);
      setIsWhiteboardModalOpen(false);
      refreshDir(currentDir);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to create whiteboard.', 'error');
    }
  };

  const handleRemoveRecent = useCallback((path) => { removeRecent(path); setRecents(getRecents()); }, []);

  const triggerBackup = async () => {
    try {
      await performRollingBackup();
      showToast('Backup successful!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: `opacity 0.5s ${delay}s ease, transform 0.5s ${delay}s ease`,
  });

  return (
    <div style={{ width: '100%', height: '100vh', background: '#1c1f26', color: '#e5e7eb', fontFamily: "'IBM Plex Mono', monospace", overflow: 'auto', position: 'relative' }}>
      <style>{`
        body { margin: 0; padding: 0; }
        @keyframes pulse-ring { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.03); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 14px; height: 14px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.4); border-radius: 7px; border: 4px solid transparent; background-clip: padding-box; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(156,163,175,0.7); }
      `}</style>
      <GridLines /> <CornerMark pos="tl" /> <CornerMark pos="tr" /> <CornerMark pos="bl" /> <CornerMark pos="br" />

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

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '0 32px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(28,31,38,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #374151' }}>
        <button onClick={() => setAboutOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '8px', padding: 0 }}>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc', letterSpacing: '-0.02em' }}>LemmaMap</span>
          <span style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.1em' }}>{ABOUT.name.split(' ')[0].toUpperCase()}</span>
        </button>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <NavBtn onClick={triggerBackup} label="Backup" icon="💾" />
          <NavBtn onClick={() => setAboutOpen(true)}  label="About" icon="◉" />
          <NavBtn onClick={() => setSettingsOpen(true)} label="Settings" icon="⚙" />
        </div>
      </div>

      <div style={{ maxWidth: '1920px', margin: '0 auto', padding: '100px 32px 60px', display: 'flex', flexDirection: 'column', gap: '48px', position: 'relative', zIndex: 1 }}>
        <div style={{ ...fadeIn(0.05), textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontSize: '10px', color: '#9ca3af', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px', padding: '4px 12px', border: '1px solid #374151', borderRadius: '20px' }}>Spatial workspace for mathematics</div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: '700', color: '#f8fafc', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 12px' }}>Open a document<br /><span style={{ color: '#60A5FA' }}>begin mapping.</span></h1>
          <p style={{ fontSize: '12px', color: '#d1d5db', maxWidth: '380px', margin: '0 auto', lineHeight: 1.7 }}>Annotate theorems · anchor whiteboards · never lose context</p>
        </div>

        <div style={{ ...fadeIn(0.12), display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={handleSetLibrary} style={{ padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', background: '#262a33', border: '1px solid #374151', color: '#e5e7eb', fontSize: '14px', fontFamily: "'IBM Plex Mono', monospace", transition: 'all 0.2s', textAlign: 'left' }}>
                📁 {libraryPath ? 'Change Library Folder' : 'Setup Library Folder'}
              </button>
            </div>
            <DropZone onBrowseClick={handleImportBrowse} onFileDrop={handleImportDrop} disabled={!libraryPath} showToast={showToast} />
            {recents.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Recent</span>
                  <button onClick={() => { localStorage.removeItem('lemmamap:recents'); setRecents([]); }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit' }}>clear all</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recents.map(entry => <RecentCard key={entry.path} entry={entry} onOpen={handleRecentOpen} onRemove={handleRemoveRecent} />)}
                </div>
              </div>
            )}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #374151', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            {!libraryPath ? (
               <div style={{ margin: 'auto', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>No Library Folder selected.<br/>Setup a library to organize PDFs.</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Library Explorer</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => refreshDir(currentDir)} title="Refresh folder" style={{ background: 'none', border: '1px solid #4b5563', borderRadius: '4px', color: '#d1d5db', cursor: 'pointer', fontSize: '12px', padding: '4px 8px', lineHeight: 1 }}>↻</button>
                    <button onClick={handleNewFolder} style={{ background: 'none', border: '1px solid #4b5563', borderRadius: '4px', color: '#d1d5db', cursor: 'pointer', fontSize: '10px', padding: '4px 8px' }}>+ New Folder</button>
                    <button onClick={handleNewWhiteboard} style={{ background: 'none', border: '1px solid #3B82F6', borderRadius: '4px', color: '#93C5FD', cursor: 'pointer', fontSize: '10px', padding: '4px 8px' }}>+ Whiteboard</button>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#d1d5db', marginBottom: '12px', background: '#252932', padding: '6px 10px', borderRadius: '6px', border: '1px solid #374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {currentDir !== libraryPath && <button onClick={handleUpDir} style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: 0 }}>↑ Back</button>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentDir.replace(libraryPath, 'Library')}</span>
                </div>
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px' }}>
                  {entries.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Folder is empty.</span>
                  ) : (
                    entries.map(entry => (
                      <div key={`${entry.name}-fs`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => handleEntryClick(entry)} style={{ flex: 1, textAlign: 'left', padding: '12px', borderRadius: '6px', background: '#262a33', border: '1px solid #374151', color: '#e5e7eb', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.background = '#262a33'; }}>
                          <span style={{ fontSize: '16px', opacity: 0.9 }}>{entry.isDirectory ? '📁' : entry.name.toLowerCase().endsWith('.whiteboard.json') ? '🧠' : '📄'}</span>
                          <span>{entry.name.toLowerCase().endsWith('.whiteboard.json') ? entry.name.replace(/\.whiteboard\.json$/i, '') : entry.name}</span>
                        </button>
                        <button
                          title="Delete"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const fullPath = await jjoin(currentDir, entry.name);
                            const yes = await confirmErrorDialog(`Delete ${entry.isDirectory ? 'folder' : 'file'} "${entry.name}"?`, 'Confirm Delete');
                            if (!yes) return;
                            await remmove(fullPath, entry.isDirectory ? { recursive: true } : undefined);
                            refreshDir(currentDir);
                          }}
                          style={{ width: '34px', height: '34px', borderRadius: '6px', border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.08)', color: '#F87171', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onChange={handleSettingsChange} backupPath={backupPath} onSetBackupPath={handleSetBackupPath} showToast={showToast} />
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />

      {isFolderModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#262a33', border: '1px solid #374151', borderRadius: '8px', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontFamily: "'IBM Plex Mono', monospace" }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#f3f4f6' }}>Create New Folder</h3>
            <input autoFocus type="text" placeholder="Folder name..." value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmNewFolder()} style={{ background: '#1c1f26', border: '1px solid #4b5563', color: '#e5e7eb', padding: '10px 12px', borderRadius: '6px', outline: 'none', fontFamily: 'inherit', fontSize: '13px' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button onClick={() => setIsFolderModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#d1d5db', cursor: 'pointer', padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
              <button onClick={confirmNewFolder} style={{ background: '#3B82F6', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {isWhiteboardModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#262a33', border: '1px solid #374151', borderRadius: '8px', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontFamily: "'IBM Plex Mono', monospace" }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#f3f4f6' }}>Create Whiteboard</h3>
            <input autoFocus type="text" placeholder="Whiteboard name..." value={newWhiteboardName} onChange={(e) => setNewWhiteboardName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmNewWhiteboard()} style={{ background: '#1c1f26', border: '1px solid #4b5563', color: '#e5e7eb', padding: '10px 12px', borderRadius: '6px', outline: 'none', fontFamily: 'inherit', fontSize: '13px' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button onClick={() => setIsWhiteboardModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#d1d5db', cursor: 'pointer', padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
              <button onClick={confirmNewWhiteboard} style={{ background: '#3B82F6', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavBtn({ onClick, label, icon }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', border: `1px solid ${h ? '#4b5563' : 'transparent'}`, background: h ? 'rgba(255,255,255,0.06)' : 'transparent', color: h ? '#e5e7eb' : '#9ca3af', cursor: 'pointer', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace", transition: 'all 0.15s' }}
    >
      <span style={{ fontSize: '12px' }}>{icon}</span> {label}
    </button>
  );
}
