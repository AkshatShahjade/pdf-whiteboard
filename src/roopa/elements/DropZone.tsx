import React, { useState, useCallback } from 'react';

// --- Capability Hook ---
export function useDropZone(
  onFileDrop?: (file: File) => void,
  disabled?: boolean,
  showToast?: (msg: string, type?: 'info' | 'success' | 'error') => void
) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) {
      showToast?.("Please set a Library Folder first!", "error");
      return;
    }
    const file = Array.from(e.dataTransfer.files).find(f => f.type === 'application/pdf');
    if (file && onFileDrop) {
      onFileDrop(file);
    }
  }, [onFileDrop, disabled, showToast]);

  return {
    dragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}

// --- Renderer Component ---
interface DropZoneProps {
  onBrowseClick: () => void;
  onFileDrop?: (file: File) => void;
  disabled?: boolean;
  showToast?: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export function DropZone({ onBrowseClick, onFileDrop, disabled, showToast }: DropZoneProps) {
  const { dragging, handleDragOver, handleDragLeave, handleDrop } = useDropZone(onFileDrop, disabled, showToast);

  const handleClick = () => {
    if (disabled) {
      showToast?.("Please set a Library Folder first!", "error");
    } else {
      onBrowseClick();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        position: 'relative',
        border: `1.5px ${dragging ? 'solid' : 'dashed'} ${dragging ? '#3B82F6' : '#374151'}`,
        borderRadius: '10px',
        padding: '48px 32px',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragging ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s',
        backdropFilter: 'blur(4px)',
        opacity: disabled ? 0.4 : 1
      }}
    >
      {dragging && (
        <div style={{
          position: 'absolute',
          inset: -1,
          borderRadius: '10px',
          border: '1.5px solid #3B82F6',
          animation: 'pulse-ring 1s ease-out infinite',
          pointerEvents: 'none'
        }} />
      )}
      <div style={{ fontSize: '32px', marginBottom: '14px', opacity: dragging ? 1 : 0.6 }}>
        {dragging ? '⬇' : '📄'}
      </div>
      <div style={{
        fontSize: '13px',
        fontWeight: '600',
        letterSpacing: '0.08em',
        color: dragging ? '#60A5FA' : '#d1d5db',
        textTransform: 'uppercase',
        marginBottom: '6px'
      }}>
        {dragging ? 'Drop to copy to library' : 'Import New PDF'}
      </div>
      <div style={{ fontSize: '11px', color: '#9ca3af' }}>drag & drop · or click to browse</div>
    </div>
  );
}
