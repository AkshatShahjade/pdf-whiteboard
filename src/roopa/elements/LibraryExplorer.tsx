import React, { useState, useEffect, useCallback } from 'react';
import { readDir, makeDirectory, exists, remove } from '../../atma/storage/storage_adapter/switch';
import { joinPath, confirmDialog, dirname } from '../../atma/platform_adapter/switch';
import { WhiteboardRepository } from '../../atma/storage/repositories/WhiteboardRepository';
import { ContentRepository } from '../../atma/storage/repositories/ContentRepository';
import { ButtonFlat } from '../primitives/ButtonFlat';
import { ButtonSquare } from '../primitives/ButtonSquare';
import { TextInput } from '../primitives/TextInput';

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
          <ButtonSquare icon="↻" tooltip="Refresh folder" onClick={refreshDir} />
          <ButtonFlat label="New Folder" icon="+" onClick={() => { setNewFolderName(''); setIsFolderModalOpen(true); }} />
          <ButtonFlat label="Whiteboard" icon="+" onClick={() => { setNewWhiteboardName(''); setIsWhiteboardModalOpen(true); }} />
        </div>
      </div>

      <div style={{ fontSize: '11px', color: '#d1d5db', marginBottom: '12px', background: '#252932', padding: '6px 10px', borderRadius: '6px', border: '1px solid #374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {currentDir !== libraryPath && (
          <ButtonFlat label="Back" icon="↑" onClick={handleUpDir} />
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
            <div key={`${entry.name}-fs`} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <ButtonFlat
                  label={entry.name.toLowerCase().endsWith('.tldr') ? entry.name.replace(/\.tldr$/i, '') : entry.name}
                  icon={entry.isDirectory ? '📁' : entry.name.toLowerCase().endsWith('.tldr') ? '🧠' : '📄'}
                  onClick={() => onEntryClick(entry)}
                />
              </div>
              <ButtonSquare
                icon="✕"
                tooltip="Delete"
                variant="danger"
                onClick={() => deleteEntry(entry.name, entry.isDirectory)}
              />
            </div>
          ))
        )}
      </div>

      {isFolderModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#262a33', border: '1px solid #374151', borderRadius: '8px', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontFamily: "'IBM Plex Mono', monospace" }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#f3f4f6' }}>Create New Folder</h3>
            <TextInput
              autoFocus
              placeholder="Folder name..."
              value={newFolderName}
              onChange={setNewFolderName}
              onSubmit={() => createFolder(newFolderName)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <ButtonFlat label="Cancel" onClick={() => setIsFolderModalOpen(false)} />
              <ButtonFlat label="Create" onClick={() => createFolder(newFolderName)} active />
            </div>
          </div>
        </div>
      )}

      {isWhiteboardModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#262a33', border: '1px solid #374151', borderRadius: '8px', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontFamily: "'IBM Plex Mono', monospace" }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#f3f4f6' }}>Create Whiteboard</h3>
            <TextInput
              autoFocus
              placeholder="Whiteboard name..."
              value={newWhiteboardName}
              onChange={setNewWhiteboardName}
              onSubmit={() => createWhiteboard(newWhiteboardName)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <ButtonFlat label="Cancel" onClick={() => setIsWhiteboardModalOpen(false)} />
              <ButtonFlat label="Create" onClick={() => createWhiteboard(newWhiteboardName)} active />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
