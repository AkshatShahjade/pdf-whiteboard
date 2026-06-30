import React, { useState, useEffect } from 'react';
import { TextInput } from '../primitives/TextInput';
import { ButtonSquare } from './ButtonSquare';
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
        await uiController.onContentChange(slotId, trimmed, 'pdf');
      } else {
        const id = trimmed.split(/[/\\]/).pop()?.replace(/\.tldr$/i, '') || trimmed;
        await uiController.onContentChange(slotId, id, 'whiteboard');
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
          <div style={{ flex: 1 }} onBlur={handleSave}>
            <TextInput
              autoFocus
              value={editValue}
              onChange={setEditValue}
              onSubmit={handleSave}
            />
          </div>
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
      <ButtonSquare
        icon="✕"
        tooltip="Close slot"
        variant="danger"
        onClick={() => uiController.closeSlot(slotId)}
      />
    </div>
  );
}
