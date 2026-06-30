import React, { useState, useEffect } from 'react';
import { ContentRendererType, ContentRendererProps } from '../../renderer_registry/content_renderer_registry';
import { RecentCard } from '../../../roopa/primitives/RecentCard';
import { LibrarySearch } from '../../../roopa/elements/LibrarySearch';
import { DropZone } from '../../../roopa/elements/DropZone';
import { LibraryExplorer } from '../../../roopa/elements/LibraryExplorer';
import { queryAPI } from '../../../atma/singletons';
import { basename, joinPath, pickFiles } from '../../../atma/platform_adapter/switch';
import { copyFile, exists, writeFile } from '../../../atma/storage/storage_adapter/switch';

function ContentSelectorComponent({
  slotId,
  uiState,
  uiController
}: ContentRendererProps) {
  const [recents, setRecents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const libraryPath = uiState?.libraryPath;
  const [currentDir, setCurrentDir] = useState<string | null>(null);
  const [explorerTrigger, setExplorerTrigger] = useState(0);

  // Sync currentDir with libraryPath on load / change
  useEffect(() => {
    if (libraryPath) {
      setCurrentDir(libraryPath);
    } else {
      setCurrentDir(null);
    }
  }, [libraryPath]);

  const loadRecents = async () => {
    try {
      const res = await queryAPI.getRecents();
      setRecents(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRecents();
  }, []);

  const showToast = (msg: string, type?: 'info' | 'success' | 'error') => {
    uiController?.showToast?.(msg, type);
  };

  const handleSelectFile = async (filePath: string, name: string) => {
    const isPdf = filePath.toLowerCase().endsWith('.pdf');
    const contentType = isPdf ? 'pdf' : 'whiteboard';

    // Push selected path to recents list
    const currentRecents = await queryAPI.getRecents() || [];
    const nextRecents = currentRecents.filter((r: any) => r.path !== filePath).slice(0, 7);
    nextRecents.unshift({ path: filePath, name, openedAt: Date.now(), isLocal: true });
    await uiController.saveRecents(nextRecents);
    loadRecents();

    if (isPdf) {
      await uiController.onContentChange(slotId, filePath, 'pdf');
    } else {
      const id = name.replace(/\.tldr$/i, '');
      await uiController.onContentChange(slotId, id, 'whiteboard');
    }
  };

  const handleRecentOpen = async (entry: any) => {
    const isWb = entry.path.startsWith('whiteboard:');
    const path = isWb ? entry.path.replace('whiteboard:', '') : entry.path;
    const name = entry.name || path.split('/').pop() || 'Untitled';
    
    // Convert whiteboard path to its physical tldr path for the selection loader
    let physicalPath = path;
    if (isWb && entry.sourcePath) {
      physicalPath = entry.sourcePath;
    } else if (isWb) {
      physicalPath = `${path}.tldr`;
    }
    
    await handleSelectFile(physicalPath, name);
  };

  const handleRecentRemove = async (path: string) => {
    const currentRecents = await queryAPI.getRecents() || [];
    const nextRecents = currentRecents.filter((r: any) => r.path !== path);
    await uiController.saveRecents(nextRecents);
    loadRecents();
  };

  const handleImportBrowse = async () => {
    try {
      const file = await pickFiles('PDF', ['pdf'], true);
      if (file && currentDir) {
        const name = await basename(file);
        const dest = await joinPath(currentDir, name);
        if (await exists(dest)) {
          return showToast("File already exists in this folder.", "error");
        }
        await copyFile(file, dest);
        showToast("File imported successfully.", "success");
        setExplorerTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportDrop = async (file: File) => {
    try {
      if (!currentDir) return;
      const dest = await joinPath(currentDir, file.name);
      if (await exists(dest)) {
        return showToast("File already exists in this folder.", "error");
      }
      const buffer = await file.arrayBuffer();
      await writeFile(dest, new Uint8Array(buffer));
      showToast("File imported successfully.", "success");
      setExplorerTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEntryClick = async (entry: any) => {
    try {
      if (!currentDir) return;
      if (entry.isDirectory) {
        const nextDir = await joinPath(currentDir, entry.name);
        setCurrentDir(nextDir);
      } else {
        const fullPath = await joinPath(currentDir, entry.name);
        await handleSelectFile(fullPath, entry.name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    uiController.closeSlot(slotId);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'rgba(28, 31, 38, 0.85)',
      backdropFilter: 'blur(16px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      boxSizing: 'border-box',
      fontFamily: "'IBM Plex Mono', monospace",
      color: '#e5e7eb',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🔍</span>
          <span style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.05em', color: '#f3f4f6' }}>OPEN CONTENT</span>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '4px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)';
            e.currentTarget.style.borderColor = '#F87171';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#9ca3af';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          ✕
        </button>
      </div>

      {/* Library Search */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <LibrarySearch
          libraryPath={libraryPath}
          onSelectFile={handleSelectFile}
          query={searchQuery}
          setQuery={setSearchQuery}
        />
      </div>

      {/* Scrolling Content Container */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
        {!searchQuery.trim() ? (
          <>
            {/* Explorer */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #374151', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <LibraryExplorer
                key={explorerTrigger}
                libraryPath={libraryPath}
                currentDir={currentDir}
                setCurrentDir={setCurrentDir}
                onEntryClick={handleEntryClick}
                showToast={showToast}
              />
            </div>

            {/* Drop Zone */}
            <div style={{ transform: 'scale(0.95)', transformOrigin: 'top center' }}>
              <DropZone
                onBrowseClick={handleImportBrowse}
                onFileDrop={handleImportDrop}
                disabled={!libraryPath}
                showToast={showToast}
              />
            </div>

            {/* Recents list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Recent Documents
              </div>
              {recents.length === 0 ? (
                <span style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', padding: '16px' }}>
                  No recent items.
                </span>
              ) : (
                recents.map(entry => (
                  <RecentCard
                    key={entry.path}
                    entry={entry}
                    onOpen={handleRecentOpen}
                    onRemove={handleRecentRemove}
                  />
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export const markSelectorContentRenderer: ContentRendererType = {
  id: 'mark_selector',
  Component: ContentSelectorComponent,
};
