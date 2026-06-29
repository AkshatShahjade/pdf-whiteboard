/**
 * HomeScreen.jsx — LemmaMap launch screen
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { RecentCard } from '../roopa/elements/RecentCard';
import { DropZone } from '../roopa/elements/DropZone';
import { LibraryExplorer } from '../roopa/elements/LibraryExplorer';
import { SettingsPane } from '../roopa/elements/SettingsPane';
import { LastUIStateRepository } from '../atma/storage/repositories/LastUIStateRepository.ts';
import { MarkRepository } from '../atma/storage/repositories/MarkRepository';
import { WhiteboardRepository } from '../atma/storage/repositories/WhiteboardRepository';
import { ContentRepository } from '../atma/storage/repositories/ContentRepository';
import { queryAPI } from '../atma/singletons';
import {
  basename,
  dirname,
  joinPath,
  pickFiles,
  pickFolder,
  saveFilePicker,
} from '../atma/platform_adapter/switch.ts';
import {
  copyFile,
  exists,
  makeDirectory,
  readDir,
  readTextFile,
  remove,
  writeFile,
  writeTextFile,
} from '../atma/storage/storage_adapter/switch.ts';

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

function timeAgo(ts) {
  if (!ts) return '';
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60)   return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function markCount(path) {
  return 0; // Deprecated synchronous markCount
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

export default function HomeScreen({ onOpen, uiController }) {
  const [recents, setRecents]         = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen]     = useState(false);
  const [settings, setSettings]       = useState({
    defaultSplit: 50,
    theme:        'dark',
    autosaveMs:   800,
    maxGlobalPdfTools: 8,
    defaultTool: 'draw',
  });
  const [mounted, setMounted]         = useState(false);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName]     = useState('');
  const [isWhiteboardModalOpen, setIsWhiteboardModalOpen] = useState(false);
  const [newWhiteboardName, setNewWhiteboardName] = useState('');

  const [libraryPath, setLibraryPath] = useState(null);
  const [backupPath, setBackupPath]   = useState(null);
  const [currentDir, setCurrentDir]   = useState(null);
  const [entries, setEntries]         = useState([]);
  const [loading, setLoading]         = useState(true);

  // Load configuration from SQLite on mount
  useEffect(() => {
    let active = true;
    async function loadConfig() {
      try {
        const [dbSettings, dbRecents, dbLibraryPath, dbBackupPath] = await Promise.all([
          queryAPI.getSettings(),
          queryAPI.getRecents(),
          queryAPI.getLibraryPath(),
          queryAPI.getBackupPath()
        ]);
        if (active) {
          setSettings(dbSettings);
          setRecents(dbRecents);
          setLibraryPath(dbLibraryPath);
          setBackupPath(dbBackupPath);
          setCurrentDir(dbLibraryPath);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load configuration from SQLite:", err);
        if (active) setLoading(false);
      }
    }
    loadConfig();
    return () => { active = false; };
  }, []);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => { setTimeout(() => setMounted(true), 30); }, []);

  const handleSettingsChange = useCallback((s) => {
    setSettings(s);
    uiController?.saveSettings(s);
  }, [uiController]);

  const clearRecents = useCallback(() => {
    setRecents([]);
    uiController?.saveRecents([]);
  }, [uiController]);

  const pushRecent = useCallback(async (entry) => {
    const nextRecents = recents.filter(r => r.path !== entry.path).slice(0, 7);
    nextRecents.unshift({ ...entry, openedAt: Date.now() });
    setRecents(nextRecents);
    await uiController?.saveRecents(nextRecents);
  }, [recents, uiController]);

  const handleRemoveRecent = useCallback(async (path) => {
    const nextRecents = recents.filter(r => r.path !== path);
    setRecents(nextRecents);
    await uiController?.saveRecents(nextRecents);
  }, [recents, uiController]);

  const refreshDir = useCallback(async (dir) => {
    if (!dir) return;
    try {
      const items = await readDir(dir);
      const fsEntries = items
        .filter(i => i.isDirectory || (i.isFile && (i.name.toLowerCase().endsWith('.pdf') || i.name.toLowerCase().endsWith('.tldr'))))
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
      const selected = await pickFolder(true)
      
      if (selected) {
        const nextLibraryPath = selected;
        if (nextLibraryPath !== libraryPath) {
          clearRecents();
        }
        setLibraryPath(nextLibraryPath); setCurrentDir(nextLibraryPath);
        await uiController?.saveLibraryPath(nextLibraryPath);
      }
    } catch (err) { console.error(err); }
  };

  const handleSetBackupPath = async () => {
    try {
      const selected = await pickFolder(true);
      if (selected) {
        setBackupPath(selected);
        await uiController?.saveBackupPath(selected);
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
      const newPath = await joinPath(currentDir, newFolderName.trim());
      if (!(await exists(newPath))) {
        await makeDirectory(newPath); refreshDir(currentDir); setIsFolderModalOpen(false);
      } else { showToast("A folder with that name already exists.", "error"); }
    } catch (err) { console.error(err); }
  };

  const handleImportBrowse = async () => {
    try {
      const file = await pickFiles('PDF', ['pdf'], true);
      if (file && currentDir) {
        const name = await basename(file);
        const dest = await joinPath(currentDir, name);
        if (await exists(dest)) return showToast("File already exists in this folder.", "error");
        await copyFile(file, dest);
        refreshDir(currentDir);
      }
    } catch (err) { console.error(err); }
  };

  const handleImportDrop = async (file) => {
    try {
      const dest = await joinPath(currentDir, file.name);
      if (await exists(dest)) return showToast("File already exists in this folder.", "error");
      const buffer = await file.arrayBuffer();
      await writeFile(dest, new Uint8Array(buffer));
      refreshDir(currentDir);
    } catch (err) { console.error(err); }
  };

  const handleEntryClick = async (entry) => {
    try {
      if (entry.isDirectory) {
        const nextDir = await joinPath(currentDir, entry.name);
        setCurrentDir(nextDir);
      } else {
        const fullPath = await joinPath(currentDir, entry.name);
        if (entry.name.toLowerCase().endsWith('.tldr')) {
          const id = entry.name.replace(/\.tldr$/i, '');
          const wbPath = `whiteboard:${id}`;
          const recentEntry = { path: wbPath, name: id, openedAt: Date.now(), isWhiteboard: true, sourcePath: fullPath };
          await pushRecent(recentEntry);
          onOpen({ contentId: id, contentType: 'whiteboard', contentName: id, settings });
          return;
        }
        const recentEntry = { path: fullPath, name: entry.name, openedAt: Date.now(), isLocal: true };
        await pushRecent(recentEntry);
        onOpen({ contentId: fullPath, contentType: 'pdf', contentName: entry.name, settings });
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

  const handleRecentOpen = useCallback(async (entry) => {
    await pushRecent({ ...entry, openedAt: Date.now() });
    if (entry.path.startsWith('whiteboard:')) {
      const id = entry.path.replace('whiteboard:', '');
      onOpen({ contentId: id, contentType: 'whiteboard', contentName: entry.name || 'Whiteboard', settings });
      return;
    }
    onOpen({ contentId: entry.sourcePath || entry.path, contentType: 'pdf', contentName: entry.name, settings });
  }, [onOpen, settings, pushRecent]);

  const confirmNewWhiteboard = async () => {
    const trimmed = newWhiteboardName.trim();
    if (!trimmed) return;
    try {
      const id = `wb_${Date.now()}`;
      await WhiteboardRepository.saveWhiteboard(id, { name: trimmed }, undefined, currentDir);
      await ContentRepository.ensureContentExists(id, 'core.whiteboard', await joinPath(currentDir, `${id}.tldr`));
      setIsWhiteboardModalOpen(false);
      refreshDir(currentDir);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to create whiteboard.', 'error');
    }
  };

  const triggerBackup = async () => {
    showToast('Backup migrating to new SQLite DB', 'info');
  };

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: `opacity 0.5s ${delay}s ease, transform 0.5s ${delay}s ease`,
  });

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100vh', background: '#1c1f26', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px' }}>
        loading workspace configuration…
      </div>
    );
  }

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
                  <button onClick={clearRecents} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit' }}>clear all</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recents.map(entry => <RecentCard key={entry.path} entry={entry} onOpen={handleRecentOpen} onRemove={handleRemoveRecent} />)}
                </div>
              </div>
            )}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #374151', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <LibraryExplorer
              libraryPath={libraryPath}
              currentDir={currentDir}
              setCurrentDir={setCurrentDir}
              onEntryClick={handleEntryClick}
              showToast={showToast}
            />
          </div>
        </div>
      </div>

      <SettingsPane open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onChange={handleSettingsChange} backupPath={backupPath} onSetBackupPath={handleSetBackupPath} showToast={showToast} onClearRecents={clearRecents} />
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
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
