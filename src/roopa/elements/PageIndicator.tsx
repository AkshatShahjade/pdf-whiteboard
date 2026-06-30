import React from 'react';
import { TextInput } from '../primitives/TextInput';

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
      <div style={{ width: '36px' }}>
        <TextInput
          value={pageInput || ''}
          onChange={onPageInputChange}
          onSubmit={(val) => {
            onPageSubmit({ key: 'Enter', preventDefault: () => {} } as any);
          }}
        />
      </div>
      <span style={{ fontSize: '11px', color: '#9ca3af' }}>/ {numPages || '-'}</span>
    </div>
  );
}
