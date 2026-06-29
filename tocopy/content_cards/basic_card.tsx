import React from 'react';

export interface BasicCardProps {
    title: string;
    icon?: string;
    onClick: () => void;
    onDelete?: () => void;
}

export function BasicCard({ title, icon, onClick, onDelete }: BasicCardProps) {
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
            {onDelete && (
                <button
                    title="Delete"
                    onClick={onDelete}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '6px',
                      border: '1px solid rgba(248,113,113,0.4)',
                      background: 'rgba(248,113,113,0.08)',
                      color: '#F87171',
                      cursor: 'pointer'
                    }}
                >
                    ✕
                </button>
            )}
        </div>
    );
}
