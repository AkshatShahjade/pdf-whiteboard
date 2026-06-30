import React, { useState, useEffect } from 'react';
import { CenterScreenPanel } from './CenterScreenPanel';
import { RecentCard } from '../primitives/RecentCard';
import { LibrarySearch } from './LibrarySearch';
import { DropZone } from './DropZone';
import { LibraryExplorer } from './LibraryExplorer';
import { queryAPI } from '../../atma/singletons';
import { basename, joinPath, pickFiles } from '../../atma/platform_adapter/switch';
import { copyFile, exists, writeFile } from '../../atma/storage/storage_adapter/switch';
import { UIState } from '../../ui/ui_state_store';
import { UIController } from '../../ui/ui_controller';

export interface ContentSelectorProps {
  uiState: UIState;
  uiController: UIController;
}

export function ContentSelector({ uiState, uiController }: ContentSelectorProps) {
  const [recents, setRecents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const libraryPath = uiState?.libraryPath;
  const [currentDir, setCurrentDir] = useState<string | null>(null);
  const [explorerTrigger, setExplorerTrigger] = useState(0);

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
    
    // Find which slots have content
    const activeSlots = Object.entries(uiState?.slots || {}).filter(
      ([_id, slot]: any) => slot && slot.contentId
    );
    const activeSlotId = uiState?.activeSlot || 'left';
    const otherSlotId = activeSlotId === 'left' ? 'right' : 'left';
    
    let targetSlotId;
    if (activeSlots.length === 1) {
      // Only one slot active: use the other slot
      targetSlotId = otherSlotId;
    } else {
      // Both slots active: use the inactive slot
      targetSlotId = activeSlots.find(([id, _]) => id !== activeSlotId)?.[0] || activeSlotId;
    }

    // Push selected path to recents list
    const currentRecents = await queryAPI.getRecents() || [];
    const nextRecents = currentRecents.filter((r: any) => r.path !== filePath).slice(0, 7);
    nextRecents.unshift({ path: filePath, name, openedAt: Date.now(), isLocal: true });
    await uiController.saveRecents(nextRecents);

    if (isPdf) {
      await uiController.onContentChange(targetSlotId, filePath, 'pdf');
    } else {
      const id = name.replace(/\.tldr$/i, '');
      await uiController.onContentChange(targetSlotId, id, 'whiteboard');
    }
    uiController.setContentSelectorOpen(false);
  };

  const handleRecentOpen = async (entry: any) => {
    const isWb = entry.path.startsWith('whiteboard:');
    const path = isWb ? entry.path.replace('whiteboard:', '') : entry.path;
    const name = entry.name || path.split('/').pop() || 'Untitled';
    
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

  const handleCancel = () => {
    uiController.setContentSelectorOpen(false);
  };

  return (
    <CenterScreenPanel
      title="Open Content"
      onCancel={handleCancel}
      onConfirm={handleCancel}
      confirmLabel="Close"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '400px' }}>
        <LibrarySearch
          libraryPath={libraryPath}
          onSelectFile={handleSelectFile}
          query={searchQuery}
          setQuery={setSearchQuery}
        />

        {!searchQuery.trim() ? (
          <>
            <LibraryExplorer
              key={explorerTrigger}
              libraryPath={libraryPath}
              currentDir={currentDir}
              setCurrentDir={setCurrentDir}
              onEntryClick={handleEntryClick}
              showToast={showToast}
            />

            <DropZone
              onBrowseClick={handleImportBrowse}
              onFileDrop={handleImportDrop}
              disabled={!libraryPath}
              showToast={showToast}
            />

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
    </CenterScreenPanel>
  );
}
