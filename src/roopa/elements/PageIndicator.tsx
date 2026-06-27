import React from 'react';

interface PageIndicatorProps {
  slotId: string;
  pageInput: string;
  currentPage?: number | null;
  numPages?: number | null;
  onPageInputChange: (value: string) => void;
  onPageSubmit: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function PageIndicator({
  slotId,
  pageInput,
  currentPage,
  numPages,
  onPageInputChange,
  onPageSubmit,
}: PageIndicatorProps) {
  return (
    <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}>
      <span style={{ fontSize: '11px', color: '#9ca3af' }}>Page</span>
      <input
        id={`${slotId}-page-input`}
        type="text"
        value={pageInput || ''}
        onChange={e => onPageInputChange(e.target.value)}
        onKeyDown={onPageSubmit}
        onBlur={() => onPageInputChange(String(currentPage ?? ''))}
        style={{ width: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid #4b5563', color: '#fff', textAlign: 'center', borderRadius: '4px', fontSize: '11px', padding: '2px 0', outline: 'none' }}
      />
      <span style={{ fontSize: '11px', color: '#9ca3af' }}>/ {numPages || '-'}</span>
    </div>
  );
}
