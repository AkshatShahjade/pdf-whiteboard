import React, { useState, useEffect, useCallback } from 'react';
import { readDir, makeDirectory, exists, remove } from '../../atma/storage/storage_adapter/switch';
import { joinPath, confirmDialog, dirname } from '../../atma/platform_adapter/switch';
import { WhiteboardRepository } from '../../atma/storage/repositories/WhiteboardRepository';
import { ContentRepository } from '../../atma/storage/repositories/ContentRepository';

// --- Capability Hook ---
export function useLibraryExplorer(
  libraryPath: string | null,
  currentDir: string | null,
  setCurrentDir: (dir: string | null) => void,
  showToast?: (msg: string, type?: 'info' | 'success' | 'error') => void
) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isWhiteboardModalOpen, setIsWhiteboardModalOpen] = useState(false);
  const [newWhiteboardName, setNewWhiteboardName] = useState('');

  const refreshDir = useCallback(async (dir: string | null) => {
    if (!dir) return;
    setLoading(true);
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
    } catch (e) {
      console.error("Failed to read directory:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentDir) refreshDir(currentDir);
  }, [currentDir, refreshDir]);

  const handleUpDir = async () => {
    if (!currentDir || currentDir === libraryPath) return;
    try {
      const parent = await dirname(currentDir);
      setCurrentDir(parent);
    } catch (err) {
      console.error(err);
    }
  };

  const createFolder = async (folderName: string) => {
    if (!currentDir || !folderName.trim()) return;
    try {
      const newPath = await joinPath(currentDir, folderName.trim());
      if (!(await exists(newPath))) {
        await makeDirectory(newPath);
        refreshDir(currentDir);
        setIsFolderModalOpen(false);
        showToast?.("Folder created successfully", "success");
      } else {
        showToast?.("A folder with that name already exists.", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast?.(err.message || "Failed to create folder", "error");
    }
  };

  const createWhiteboard = async (whiteboardName: string) => {
    if (!currentDir || !whiteboardName.trim()) return;
    try {
      const id = whiteboardName.trim();
      await WhiteboardRepository.saveWhiteboard(id, { name: id }, undefined, currentDir);
      await ContentRepository.ensureContentExists(id, 'core.whiteboard', await joinPath(currentDir, `${id}.tldr`));
      setIsWhiteboardModalOpen(false);
      refreshDir(currentDir);
      showToast?.("Whiteboard created successfully", "success");
    } catch (err: any) {
      console.error(err);
      showToast?.(err.message || 'Failed to create whiteboard.', 'error');
    }
  };

  const deleteEntry = async (name: string, isDirectory: boolean) => {
    if (!currentDir) return;
    try {
      const fullPath = await joinPath(currentDir, name);
      const yes = await confirmDialog(`Delete ${isDirectory ? 'folder' : 'file'} "${name}"?`, 'Confirm Delete');
      if (!yes) return;
      await remove(fullPath, isDirectory ? { recursive: true } : undefined);
      refreshDir(currentDir);
      showToast?.("Item deleted successfully", "success");
    } catch (err: any) {
      console.error(err);
      showToast?.(err.message || 'Failed to delete item.', 'error');
    }
  };

  return {
    entries,
    loading,
    refreshDir: () => refreshDir(currentDir),
    handleUpDir,
    createFolder,
    createWhiteboard,
    deleteEntry,
    isFolderModalOpen,
    setIsFolderModalOpen,
    newFolderName,
    setNewFolderName,
    isWhiteboardModalOpen,
    setIsWhiteboardModalOpen,
    newWhiteboardName,
    setNewWhiteboardName,
  };
}

// --- Renderer Component ---
interface LibraryExplorerProps {
  libraryPath: string | null;
  currentDir: string | null;
  setCurrentDir: (dir: string | null) => void;
  onEntryClick: (entry: any) => void;
  showToast?: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export function LibraryExplorer({
  libraryPath,
  currentDir,
  setCurrentDir,
  onEntryClick,
  showToast
}: LibraryExplorerProps) {
  const {
    entries,
    loading,
    refreshDir,
    handleUpDir,
    createFolder,
    createWhiteboard,
    deleteEntry,
    isFolderModalOpen,
    setIsFolderModalOpen,
    newFolderName,
    setNewFolderName,
    isWhiteboardModalOpen,
    setIsWhiteboardModalOpen,
    newWhiteboardName,
    setNewWhiteboardName
  } = useLibraryExplorer(libraryPath, currentDir, setCurrentDir, showToast);

  if (!libraryPath || !currentDir) {
    return (
      <div style={{ margin: 'auto', textAlign: 'center', color: '#9ca3af', fontSize: '12px', padding: '24px' }}>
        No Library Folder selected.<br/>Setup a library to organize PDFs.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Library Explorer</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={refreshDir} title="Refresh folder" style={{ background: 'none', border: '1px solid #4b5563', borderRadius: '4px', color: '#d1d5db', cursor: 'pointer', fontSize: '12px', padding: '4px 8px', lineHeight: 1 }}>↻</button>
          <button onClick={() => { setNewFolderName(''); setIsFolderModalOpen(true); }} style={{ background: 'none', border: '1px solid #4b5563', borderRadius: '4px', color: '#d1d5db', cursor: 'pointer', fontSize: '10px', padding: '4px 8px' }}>+ New Folder</button>
          <button onClick={() => { setNewWhiteboardName(''); setIsWhiteboardModalOpen(true); }} style={{ background: 'none', border: '1px solid #3B82F6', borderRadius: '4px', color: '#93C5FD', cursor: 'pointer', fontSize: '10px', padding: '4px 8px' }}>+ Whiteboard</button>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: '#d1d5db', marginBottom: '12px', background: '#252932', padding: '6px 10px', borderRadius: '6px', border: '1px solid #374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {currentDir !== libraryPath && (
          <button onClick={handleUpDir} style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: 0 }}>↑ Back</button>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentDir.replace(libraryPath, 'Library')}
        </span>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading && entries.length === 0 ? (
          <span style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Loading...</span>
        ) : entries.length === 0 ? (
          <span style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Folder is empty.</span>
        ) : (
          entries.map(entry => (
            <div key={`${entry.name}-fs`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => onEntryClick(entry)}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  padding: '12px',
                  borderRadius: '6px',
                  background: '#262a33',
                  border: '1px solid #374151',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.background = 'rgba(59,130,246,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#374151';
                  e.currentTarget.style.background = '#262a33';
                }}
              >
                <span style={{ fontSize: '16px', opacity: 0.9 }}>
                  {entry.isDirectory ? '📁' : entry.name.toLowerCase().endsWith('.tldr') ? '🧠' : '📄'}
                </span>
                <span>
                  {entry.name.toLowerCase().endsWith('.tldr') ? entry.name.replace(/\.tldr$/i, '') : entry.name}
                </span>
              </button>
              <button
                title="Delete"
                onClick={() => deleteEntry(entry.name, entry.isDirectory)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '6px',
                  border: '1px solid rgba(248,113,113,0.4)',
                  background: 'rgba(248,113,113,0.08)',
                  color: '#F87171',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {isFolderModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#262a33', border: '1px solid #374151', borderRadius: '8px', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontFamily: "'IBM Plex Mono', monospace" }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#f3f4f6' }}>Create New Folder</h3>
            <input
              autoFocus
              type="text"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFolder(newFolderName)}
              style={{ background: '#1c1f26', border: '1px solid #4b5563', color: '#e5e7eb', padding: '10px 12px', borderRadius: '6px', outline: 'none', fontFamily: 'inherit', fontSize: '13px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button onClick={() => setIsFolderModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#d1d5db', cursor: 'pointer', padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
              <button onClick={() => createFolder(newFolderName)} style={{ background: '#3B82F6', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {isWhiteboardModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#262a33', border: '1px solid #374151', borderRadius: '8px', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontFamily: "'IBM Plex Mono', monospace" }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#f3f4f6' }}>Create Whiteboard</h3>
            <input
              autoFocus
              type="text"
              placeholder="Whiteboard name..."
              value={newWhiteboardName}
              onChange={(e) => setNewWhiteboardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createWhiteboard(newWhiteboardName)}
              style={{ background: '#1c1f26', border: '1px solid #4b5563', color: '#e5e7eb', padding: '10px 12px', borderRadius: '6px', outline: 'none', fontFamily: 'inherit', fontSize: '13px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button onClick={() => setIsWhiteboardModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#d1d5db', cursor: 'pointer', padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
              <button onClick={() => createWhiteboard(newWhiteboardName)} style={{ background: '#3B82F6', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
