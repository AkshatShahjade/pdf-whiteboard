import React, { useState, useEffect } from 'react';
import { ContentRepository } from '../../atma/storage/repositories/ContentRepository';

interface FilePathViewerProps {
  slotId: string;
  uiState: any;
  uiController: any;
}

export function FilePathViewer({ slotId, uiState, uiController }: FilePathViewerProps) {
  const slotState = uiState?.slots?.[slotId];
  const currentPath = slotState?.contentId || '';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentPath);

  useEffect(() => {
    setEditValue(currentPath);
  }, [currentPath]);

  const handleSave = async () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === currentPath) return;

    try {
      const isPdf = trimmed.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        await uiController.loadSession(trimmed, slotId);
      } else {
        const id = trimmed.split(/[/\\]/).pop()?.replace(/\.tldr$/i, '') || trimmed;
        await ContentRepository.ensureContentExists(id, 'core.whiteboard', trimmed);
        uiController.setSlotStates(slotId, {
          contentId: id,
          contentType: 'whiteboard',
          slotType: 'verticalPane'
        });
      }
    } catch (err) {
      console.error("Failed to load path:", err);
      uiController.showToast?.(`Failed to load path: ${editValue}`, 'error');
    }
  };

  return (
    <div style={{
      background: '#1f232b',
      borderBottom: '1px solid #2e3440',
      padding: '6px 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      fontSize: '11px',
      fontFamily: "'IBM Plex Mono', monospace"
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
        <span style={{ color: '#6b7280', userSelect: 'none' }}>PATH:</span>
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            style={{
              flex: 1,
              background: '#181b21',
              border: '1px solid #3b82f6',
              color: '#e5e7eb',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '11px',
              fontFamily: 'inherit',
              outline: 'none'
            }}
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            style={{
              flex: 1,
              color: currentPath ? '#d1d5db' : '#4b5563',
              cursor: 'text',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              padding: '3px 6px',
              borderRadius: '4px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {currentPath || 'click to enter path...'}
          </div>
        )}
      </div>
      <button
        onClick={() => uiController.closeSlot(slotId)}
        title="Close slot"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize: '11px',
          padding: '2px 6px',
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)';
          e.currentTarget.style.color = '#F87171';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#9ca3af';
        }}
      >
        ✕
      </button>
    </div>
  );
}
