/**
 * HomeScreen.jsx — LemmaMap launch screen
 *
 * Sections:
 *  - PDF file picker (drag-and-drop or click)
 *  - Recent sessions (read from localStorage)
 *  - Settings panel (slide-in drawer)
 *  - About section (mini-bio)
 *
 * Wires up to App.jsx via the `onOpen(pdfPath, pdfFile)` prop.
 * Pass a File object for local files, or a path string for /public assets.
 */
/**
 * HomeScreen.jsx — LemmaMap launch screen
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { loadSession } from './storage.js';

// ─── Tauri Imports ────────────────────────────────────────────────────────────
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { readDir, mkdir, copyFile, exists, writeFile } from '@tauri-apps/plugin-fs';
import { join, basename, dirname } from '@tauri-apps/api/path';

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

// Default demo sessions stored as well-known localStorage keys
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

// ─── small helpers ────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return '';
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60)   return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function regionCount(path) {
  const s = loadSession(path);
  return s?.regions?.length ?? 0;
}

// ─── Settings store (localStorage) ───────────────────────────────────────────

const SETTINGS_KEY = 'lemmamap:settings';
const DEFAULT_SETTINGS = {
  defaultSplit: 50,
  theme:        'dark',
  autosaveMs:   800,
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
    <svg style={{
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0, opacity: 0.035,
    }}>
      <defs>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#a0aec0" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

function CornerMark({ pos }) {
  const style = {
    position: 'fixed', zIndex: 1, opacity: 0.18,
    ...(pos === 'tl' ? { top: 24, left: 24 } :
        pos === 'tr' ? { top: 24, right: 24 } :
        pos === 'bl' ? { bottom: 24, left: 24 } :
                       { bottom: 24, right: 24 }),
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

// ── Drop Zone ─────────────────────────────────────────────────────────────────
function DropZone({ onBrowseClick, onFileDrop, disabled }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    if (disabled) return alert("Please set a Library Folder first!");
    const file = [...e.dataTransfer.files].find(f => f.type === 'application/pdf');
    if (file && onFileDrop) onFileDrop(file);
  }, [onFileDrop, disabled]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={disabled ? () => alert("Please set a Library Folder first!") : onBrowseClick}
      style={{
        position: 'relative',
        border: `1.5px ${dragging ? 'solid' : 'dashed'} ${dragging ? '#3B82F6' : '#2a2d36'}`,
        borderRadius: '10px', padding: '48px 32px', textAlign: 'center', cursor: 'pointer',
        background: dragging ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.015)',
        transition: 'all 0.2s', backdropFilter: 'blur(4px)', opacity: disabled ? 0.4 : 1
      }}
    >
      {dragging && (
        <div style={{ position: 'absolute', inset: -1, borderRadius: '10px', border: '1.5px solid #3B82F6', animation: 'pulse-ring 1s ease-out infinite', pointerEvents: 'none' }} />
      )}
      <div style={{ fontSize: '32px', marginBottom: '14px', opacity: dragging ? 1 : 0.4 }}>
        {dragging ? '⬇' : '📄'}
      </div>
      <div style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.08em', color: dragging ? '#60A5FA' : '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>
        {dragging ? 'Drop to copy to library' : 'Import New PDF'}
      </div>
      <div style={{ fontSize: '11px', color: '#4b5563' }}>
        drag & drop · or click to browse
      </div>
    </div>
  );
}

// ── Recent Card ───────────────────────────────────────────────────────────────
function RecentCard({ entry, onOpen, onRemove }) {
  const [hovered, setHovered] = useState(false);
  const regions = regionCount(entry.path);
  const name = entry.name || entry.path.split('/').pop();
  const session = loadSession(entry.path);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        border: `1px solid ${hovered ? '#3B82F6' : '#1e2128'}`,
        borderRadius: '8px',
        padding: '16px 18px',
        cursor: 'pointer',
        background: hovered ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)',
        transition: 'all 0.15s',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}
      onClick={() => onOpen(entry)}
    >
      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(entry.path); }}
        style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#374151', fontSize: '13px', padding: '2px 5px',
          opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
          borderRadius: '4px',
        }}
        title="Remove from recents"
      >✕</button>

      {/* File icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px', opacity: 0.6 }}>📄</span>
        <span style={{
          fontSize: '12px', fontWeight: '600', color: '#e2e8f0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '200px',
        }}>{name}</span>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#4b5563' }}>
          {timeAgo(entry.openedAt)}
        </span>
        {regions > 0 && (
          <span style={{
            fontSize: '9px', padding: '1px 6px', borderRadius: '10px',
            background: 'rgba(59,130,246,0.12)', color: '#60A5FA',
            border: '1px solid rgba(59,130,246,0.2)',
          }}>
            {regions} region{regions !== 1 ? 's' : ''}
          </span>
        )}
        {session?.scrollTop > 0 && (
          <span style={{ fontSize: '9px', color: '#374151' }}>
            p.{Math.ceil(session.scrollTop / 1100) + 1}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Settings Drawer ───────────────────────────────────────────────────────────
function SettingsDrawer({ open, onClose, settings, onChange }) {
  const Field = ({ label, hint, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        {hint && <span style={{ fontSize: '10px', color: '#374151' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );

  const inputStyle = {
    background: '#0f1117', border: '1px solid #2a2d36', borderRadius: '6px',
    color: '#e2e8f0', padding: '7px 10px', fontSize: '12px',
    fontFamily: "'IBM Plex Mono', monospace", width: '100%', boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 90, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '320px',
        background: '#13161c',
        borderLeft: '1px solid #1e2128',
        zIndex: 100,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #1e2128',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', letterSpacing: '0.05em' }}>
            SETTINGS
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '16px',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <Field label="Default split" hint={`${settings.defaultSplit}%`}>
            <input
              type="range" min="20" max="80" step="5"
              value={settings.defaultSplit}
              onChange={(e) => onChange({ ...settings, defaultSplit: +e.target.value })}
              style={{ width: '100%', accentColor: '#3B82F6' }}
            />
          </Field>

          <Field label="Autosave delay" hint={`${settings.autosaveMs}ms`}>
            <input
              type="range" min="200" max="2000" step="100"
              value={settings.autosaveMs}
              onChange={(e) => onChange({ ...settings, autosaveMs: +e.target.value })}
              style={{ width: '100%', accentColor: '#3B82F6' }}
            />
          </Field>

          <div style={{ borderTop: '1px solid #1e2128', paddingTop: '20px' }}>
            <button
              onClick={() => {
                if (confirm('Clear all session data and recents? Whiteboard data in IndexedDB is preserved.')) {
                  Object.keys(localStorage)
                    .filter(k => k.startsWith('lemmamap:'))
                    .forEach(k => localStorage.removeItem(k));
                  window.location.reload();
                }
              }}
              style={{
                width: '100%', padding: '8px', borderRadius: '6px',
                border: '1px solid #2a2d36', background: 'transparent',
                color: '#EF4444', fontSize: '11px', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Clear session data
            </button>
          </div>
        </div>

        {/* Footer version */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #1e2128' }}>
          <span style={{ fontSize: '10px', color: '#2a2d36' }}>LemmaMap · local build</span>
        </div>
      </div>
    </>
  );
}

// ── About Panel ───────────────────────────────────────────────────────────────
function AboutPanel({ open, onClose }) {
  return (
    <>
      {open && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 90, backdropFilter: 'blur(2px)',
        }} />
      )}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: '300px',
        background: '#13161c',
        borderRight: '1px solid #1e2128',
        zIndex: 100,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #1e2128',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            About the Author
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Identity block */}
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.01em', marginBottom: '4px' }}>
              {ABOUT.name}
            </div>
            <div style={{ fontSize: '11px', color: '#3B82F6', letterSpacing: '0.04em', marginBottom: '2px' }}>
              {ABOUT.role}
            </div>
            <div style={{ fontSize: '11px', color: '#4b5563' }}>{ABOUT.org}</div>
          </div>

          {/* Highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ABOUT.bio.map((line, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3B82F6', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>{line}</span>
              </div>
            ))}
          </div>

          {/* Skills */}
          <div>
            <div style={{ fontSize: '10px', color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Stack
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {ABOUT.skills.map(s => (
                <span key={s} style={{
                  fontSize: '10px', padding: '3px 8px', borderRadius: '4px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2128',
                  color: '#6b7280',
                }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '10px', color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
              Contact
            </div>
            {[
              { icon: '✉', label: ABOUT.email,    href: `mailto:${ABOUT.email}` },
              { icon: '☎', label: ABOUT.phone,    href: `tel:${ABOUT.phone.replace(/\s/g,'')}` },
              { icon: '⌥', label: `gh/${ABOUT.github}`, href: `https://github.com/${ABOUT.github}` },
              { icon: '⬡', label: 'LinkedIn',     href: `https://linkedin.com/in/akshat-shahjade` },
            ].map(({ icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  textDecoration: 'none', color: '#6b7280',
                  fontSize: '11px', transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#60A5FA'}
                onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
              >
                <span style={{ fontSize: '13px', width: '16px', textAlign: 'center', opacity: 0.6 }}>{icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Built with */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #1e2128' }}>
          <span style={{ fontSize: '10px', color: '#1e2128' }}>
            built with LemmaMap
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────

export default function HomeScreen({ onOpen }) {
  const [recents, setRecents]         = useState(getRecents);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen]     = useState(false);
  const [settings, setSettings]       = useState(loadSettings);
  const [mounted, setMounted]         = useState(false);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName]     = useState('');

  // -- Library State
  const [libraryPath, setLibraryPath] = useState(localStorage.getItem('lemmamap:library') || null);
  const [currentDir, setCurrentDir]   = useState(localStorage.getItem('lemmamap:library') || null);
  const [entries, setEntries]         = useState([]);

  useEffect(() => { setTimeout(() => setMounted(true), 30); }, []);

  const handleSettingsChange = useCallback((s) => {
    setSettings(s); saveSettings(s);
  }, []);

  // -- Directory Reading
  const refreshDir = useCallback(async (dir) => {
    if (!dir) return;
    try {
      const items = await readDir(dir);
      const sorted = items
        .filter(i => i.isDirectory || (i.isFile && i.name.toLowerCase().endsWith('.pdf')))
        .sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
      setEntries(sorted);
    } catch (e) { console.error("Failed to read directory:", e); }
  }, []);

  useEffect(() => {
    if (currentDir) refreshDir(currentDir);
  }, [currentDir, refreshDir]);

  // -- Handlers
  const handleSetLibrary = async () => {
    try {
      const selected = await open({ directory: true });
      if (selected) {
        setLibraryPath(selected); setCurrentDir(selected);
        localStorage.setItem('lemmamap:library', selected);
      }
    } catch (err) { console.error(err); }
  };

  const handleNewFolder = () => {
    if (!currentDir) return;
    setNewFolderName('');
    setIsFolderModalOpen(true);
  };

  const confirmNewFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const newPath = await join(currentDir, newFolderName.trim());
      if (!(await exists(newPath))) {
        await mkdir(newPath);
        refreshDir(currentDir);
        setIsFolderModalOpen(false);
      } else {
        alert("A folder with that name already exists.");
      }
    } catch (err) { console.error(err); }
  };

  const handleImportBrowse = async () => {
    try {
      const file = await open({ multiple: false, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
      if (file && currentDir) {
        const name = await basename(file);
        const dest = await join(currentDir, name);
        if (await exists(dest)) return alert("File already exists in this folder.");
        await copyFile(file, dest);
        refreshDir(currentDir);
      }
    } catch (err) { console.error(err); }
  };

  const handleImportDrop = async (file) => {
    try {
      const dest = await join(currentDir, file.name);
      if (await exists(dest)) return alert("File already exists in this folder.");
      const buffer = await file.arrayBuffer();
      await writeFile(dest, new Uint8Array(buffer)); // Write web file directly to disk natively
      refreshDir(currentDir);
    } catch (err) { console.error(err); }
  };

  const handleEntryClick = async (entry) => {
    try {
      if (entry.isDirectory) {
        const nextDir = await join(currentDir, entry.name);
        setCurrentDir(nextDir);
      } else {
        const fullPath = await join(currentDir, entry.name);
        const safeUrl = convertFileSrc(fullPath);
        const recentEntry = { path: safeUrl, name: entry.name, openedAt: Date.now(), isLocal: true };
        pushRecent(recentEntry);
        onOpen(safeUrl, null, settings);
      }
    } catch (err) { console.error(err); }
  };

  const handleUpDir = async () => {
    if (currentDir === libraryPath) return;
    try {
      const parent = await dirname(currentDir);
      setCurrentDir(parent);
    } catch (err) { console.error(err); }
  };

  const handleRecentOpen = useCallback((entry) => {
    pushRecent({ ...entry, openedAt: Date.now() });
    onOpen(entry.path, null, settings);
  }, [onOpen, settings]);

  const handleRemoveRecent = useCallback((path) => {
    removeRecent(path); setRecents(getRecents());
  }, []);

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
    transition: `opacity 0.5s ${delay}s ease, transform 0.5s ${delay}s ease`,
  });

  return (
    <div style={{
      width: '100%', height: '100vh',
      background: '#0d0f13',
      color: '#e2e8f0',
      fontFamily: "'IBM Plex Mono', monospace",
      overflow: 'auto',
      position: 'relative',
    }}>
      <style>{`
        body { margin: 0; padding: 0; } /* <-- Add this line */
        @keyframes pulse-ring {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.03); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2128; border-radius: 2px; }
      `}</style>

      <GridLines />
      <CornerMark pos="tl" />
      <CornerMark pos="tr" />
      <CornerMark pos="bl" />
      <CornerMark pos="br" />

      {/* ── Top bar ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '0 32px', height: '52px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(13,15,19,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1e2128',
      }}>
        {/* Logo */}
        <button
          onClick={() => setAboutOpen(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'baseline', gap: '8px', padding: 0,
          }}
        >
          <span style={{
            fontSize: '15px', fontWeight: '700', color: '#f1f5f9',
            letterSpacing: '-0.02em',
          }}>LemmaMap</span>
          <span style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.1em' }}>
            {ABOUT.name.split(' ')[0].toUpperCase()}
          </span>
        </button>

        {/* Nav buttons */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <NavBtn onClick={() => setAboutOpen(true)}  label="About"    icon="◉" />
          <NavBtn onClick={() => setSettingsOpen(true)} label="Settings" icon="⚙" />
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{
        maxWidth: '1920px', margin: '0 auto',
        padding: '100px 32px 60px',
        display: 'flex', flexDirection: 'column', gap: '48px',
        position: 'relative', zIndex: 1,
      }}>

        {/* Hero */}
        <div style={{ ...fadeIn(0.05), textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            fontSize: '10px', color: '#374151', letterSpacing: '0.15em',
            textTransform: 'uppercase', marginBottom: '16px',
            padding: '4px 12px', border: '1px solid #1e2128', borderRadius: '20px',
          }}>
            Spatial workspace for mathematics
          </div>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: '700', color: '#f1f5f9',
            letterSpacing: '-0.03em', lineHeight: 1.1,
            margin: '0 0 12px',
          }}>
            Open a document<br />
            <span style={{ color: '#3B82F6' }}>begin mapping.</span>
          </h1>
          <p style={{ fontSize: '12px', color: '#4b5563', maxWidth: '380px', margin: '0 auto', lineHeight: 1.7 }}>
            Annotate theorems · anchor whiteboards · never lose context
          </p>
        </div>

        {/* ── Dashboard Grid ── */}
        <div style={{ ...fadeIn(0.12), display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          
          {/* Left Col: Actions & Recents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Library Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={handleSetLibrary} style={{
                padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', background: '#1a1d24', border: '1px solid #2a2d36',
                color: '#d1d5db', fontSize: '14px', fontFamily: "'IBM Plex Mono', monospace", transition: 'all 0.2s', textAlign: 'left'
              }}>
                📁 {libraryPath ? 'Change Library Folder' : 'Setup Library Folder'}
              </button>
            </div>

            <DropZone 
              onBrowseClick={handleImportBrowse} 
              onFileDrop={handleImportDrop} 
              disabled={!libraryPath} 
            />

            {/* Recents */}
            {recents.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '10px', color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Recent</span>
                  <button onClick={() => { localStorage.removeItem('lemmamap:recents'); setRecents([]); }} style={{ background: 'none', border: 'none', color: '#2a2d36', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit' }}>clear all</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recents.map(entry => <RecentCard key={entry.path} entry={entry} onOpen={handleRecentOpen} onRemove={handleRemoveRecent} />)}
                </div>
              </div>
            )}
          </div>

          {/* Right Col: Interactive Library Viewer */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid #1e2128', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            {!libraryPath ? (
               <div style={{ margin: 'auto', textAlign: 'center', color: '#4b5563', fontSize: '12px' }}>
                 No Library Folder selected.<br/>Setup a library to organize PDFs.
               </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '10px', color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Library Explorer</span>
                  <button onClick={handleNewFolder} style={{ background: 'none', border: '1px solid #2a2d36', borderRadius: '4px', color: '#9ca3af', cursor: 'pointer', fontSize: '10px', padding: '4px 8px' }}>+ New Folder</button>
                </div>
                
                {/* Breadcrumbs */}
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px', background: '#13161c', padding: '6px 10px', borderRadius: '6px', border: '1px solid #1e2128', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {currentDir !== libraryPath && <button onClick={handleUpDir} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', padding: 0 }}>↑ Back</button>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentDir.replace(libraryPath, 'Library')}
                  </span>
                </div>

                {/* File List */}
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px' }}>
                  {entries.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '20px' }}>Folder is empty.</span>
                  ) : (
                    entries.map(entry => (
                      <button key={entry.name} onClick={() => handleEntryClick(entry)} style={{
                        textAlign: 'left', padding: '12px', borderRadius: '6px', background: '#1a1d24', border: '1px solid #2a2d36',
                        color: '#d1d5db', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2d36'; e.currentTarget.style.color = '#d1d5db'; }}
                      >
                        <span style={{ fontSize: '16px', opacity: 0.8 }}>{entry.isDirectory ? '📁' : '📄'}</span>
                        <span>{entry.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Keyboard hint strip
        <div style={{
          ...fadeIn(0.26),
          display: 'flex', gap: '20px', justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {[
            ['S', 'Select mode'],
            ['R', 'Draw region'],
            ['X', 'Remove region'],
            ['⌫', 'Delete selected'],
            ['Esc', 'Deselect'],
          ].map(([key, hint]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={{
                background: '#1a1d24', border: '1px solid #2a2d36',
                borderRadius: '4px', padding: '2px 7px',
                fontSize: '10px', color: '#6b7280',
                fontFamily: "'IBM Plex Mono', monospace",
              }}>{key}</kbd>
              <span style={{ fontSize: '10px', color: '#2a2d36' }}>{hint}</span>
            </div>
          ))}
        </div> */}

      </div>

      {/* Panels */}
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={handleSettingsChange}
      />
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />

      {/* ── New Folder Modal ── */}
      {isFolderModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#1a1d24', border: '1px solid #2a2d36', borderRadius: '8px',
            padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontFamily: "'IBM Plex Mono', monospace"
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#e2e8f0' }}>Create New Folder</h3>
            <input
              autoFocus
              type="text"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmNewFolder()}
              style={{
                background: '#0f1117', border: '1px solid #2a2d36', color: '#e2e8f0',
                padding: '10px 12px', borderRadius: '6px', outline: 'none',
                fontFamily: 'inherit', fontSize: '13px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button 
                onClick={() => setIsFolderModalOpen(false)} 
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '6px 12px', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmNewFolder} 
                style={{ background: '#3B82F6', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Tiny nav button ──────────────────────────────────────────────────────────
function NavBtn({ onClick, label, icon }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '5px 10px', borderRadius: '6px',
        border: `1px solid ${h ? '#2a2d36' : 'transparent'}`,
        background: h ? 'rgba(255,255,255,0.03)' : 'transparent',
        color: h ? '#9ca3af' : '#4b5563',
        cursor: 'pointer', fontSize: '11px',
        fontFamily: "'IBM Plex Mono', monospace",
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: '12px' }}>{icon}</span>
      {label}
    </button>
  );
}
