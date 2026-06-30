import React, { useState } from 'react';
import { RoopaElement, useRoopaElement } from '../mode_system';
import { UIStateStore } from '../../ui/ui_state_store';

export interface CardProps {
    variant: 'basic' | 'mark_selector' | 'recent';
    title: string;
    subtitle?: string;
    icon?: string;
    permissionId?: RoopaElement;
    uiStore?: UIStateStore;
    onClick: () => void;
    onDelete?: () => void;
    onContentSelect?: () => void;
}

export function Card({
    variant,
    title,
    subtitle,
    icon,
    permissionId,
    uiStore,
    onClick,
    onDelete,
    onContentSelect
}: CardProps) {
    const isAllowed = permissionId && uiStore ? useRoopaElement(uiStore, permissionId) : true;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onClick={isAllowed ? onClick : undefined}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '12px',
                cursor: isAllowed ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s',
                opacity: isAllowed ? 1 : 0.5,
                transform: isHovered && isAllowed ? 'translateY(-2px)' : 'none',
                boxShadow: isHovered && isAllowed ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                position: 'relative'
            }}
        >
            {icon && <div style={{ fontSize: '20px' }}>{icon}</div>}
            
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ 
                    color: '#fff', 
                    fontSize: '14px', 
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {title}
                </div>
                {subtitle && (
                    <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                        {subtitle}
                    </div>
                )}
            </div>

            {isHovered && isAllowed && (variant === 'basic' || variant === 'recent') && onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#EF4444',
                        border: 'none',
                        borderRadius: '4px',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                    title="Delete"
                >
                    ✕
                </button>
            )}

            {isHovered && isAllowed && variant === 'mark_selector' && onContentSelect && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onContentSelect();
                    }}
                    style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#3B82F6',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer'
                    }}
                >
                    Select
                </button>
            )}
        </div>
    );
}
