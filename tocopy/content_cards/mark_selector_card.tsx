import React from 'react';

export interface MarkSelectorCardProps {
    title: string;
    icon?: string;
    onClick: () => void;
    onSelectContent: () => void;
}

export function MarkSelectorCard({ title, icon, onClick, onSelectContent }: MarkSelectorCardProps) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
                onClick={onClick}
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
                {icon && <span style={{ fontSize: '16px', opacity: 0.9 }}>{icon}</span>}
                <span>{title}</span>
            </button>
            <button
                title="Select Content"
                onClick={onSelectContent}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  height: '34px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: '1px solid #10B981',
                  background: 'rgba(16,185,129,0.1)',
                  color: '#10B981',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}
            >
                <span>🔗</span>
                <span>Select</span>
            </button>
        </div>
    );
}
