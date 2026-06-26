import React, { useState, useEffect } from 'react';
import { ContentRendererType, ContentRendererProps } from '../../renderer_registry/content_renderer_registry';
import { RecentCard } from '../../../roopa/elements/RecentCard';
import { LibrarySearch } from '../../../roopa/elements/LibrarySearch';
import { queryAPI, inputAPI } from '../../../atma/singletons';
import { ContentRepository } from '../../../atma/storage/repositories/ContentRepository';

function ContentSelectorComponent({
  slotId,
  uiState,
  uiController
}: ContentRendererProps) {
  const [recents, setRecents] = useState<any[]>([]);
  const libraryPath = uiState?.libraryPath;

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

  const handleSelectFile = async (filePath: string, name: string) => {
    const isPdf = filePath.toLowerCase().endsWith('.pdf');
    const contentType = isPdf ? 'pdf' : 'whiteboard';

    // Push selected path to recents list
    const currentRecents = await queryAPI.getRecents() || [];
    const nextRecents = currentRecents.filter((r: any) => r.path !== filePath).slice(0, 7);
    nextRecents.unshift({ path: filePath, name, openedAt: Date.now(), isLocal: true });
    await inputAPI.saveRecents(nextRecents);
    loadRecents();

    if (isPdf) {
      // Load PDF session variables in the current slot
      await inputAPI.loadSession(filePath, slotId);
    } else {
      // Ensure whiteboard content exists in DB
      const id = name.replace(/\.tldr$/i, '');
      await ContentRepository.ensureContentExists(id, 'core.whiteboard', filePath);
      
      // Update slot state to render the whiteboard in the current slot
      uiController.setSlotStates(slotId, {
        contentId: id,
        contentType: 'whiteboard',
        slotType: 'verticalPane'
      });
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
    await inputAPI.saveRecents(nextRecents);
    loadRecents();
  };

  const handleClose = () => {
    uiController.setSlotStates(slotId, {
      contentId: '',
      contentType: 'content_selector',
      slotType: 'verticalPane'
    });
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
          <span style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.05em', color: '#f3f4f6' }}>SEARCH LIBRARY</span>
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
        <LibrarySearch libraryPath={libraryPath} onSelectFile={handleSelectFile} />
      </div>

      {/* Recents list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
    </div>
  );
}

export const contentSelectorContentRenderer: ContentRendererType = {
  id: 'content_selector',
  Component: ContentSelectorComponent,
};
