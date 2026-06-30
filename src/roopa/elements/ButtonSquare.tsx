import React from 'react';
import { UIElement, useUIElement } from '../../ui/mode_system';
import { UIStateStore } from '../../ui/ui_state_store';

export interface ButtonSquareProps {
    icon: string;
    tooltip?: string;
    isActive?: boolean;
    variant?: 'primary' | 'ghost' | 'danger';
    permissionId?: UIElement;
    uiStore?: UIStateStore;
    onClick: () => void;
}

export function ButtonSquare({
    icon,
    tooltip,
    isActive = false,
    variant = 'ghost',
    permissionId,
    uiStore,
    onClick
}: ButtonSquareProps) {
    const isAllowed = permissionId && uiStore ? useUIElement(uiStore, permissionId) : true;
    
    // Basic styling derived from variant & state
    let bg = 'transparent';
    let color = '#ccc';
    let hoverBg = 'rgba(255, 255, 255, 0.1)';

    if (variant === 'primary') {
        bg = isActive ? '#3B82F6' : '#2563EB';
        color = '#fff';
        hoverBg = '#3B82F6';
    } else if (variant === 'danger') {
        bg = isActive ? '#EF4444' : 'transparent';
        color = isActive ? '#fff' : '#EF4444';
        hoverBg = 'rgba(239, 68, 68, 0.1)';
    } else {
        // ghost
        bg = isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent';
        color = isActive ? '#fff' : '#ccc';
    }

    if (!isAllowed) {
        color = '#666';
        hoverBg = 'transparent';
        bg = 'transparent';
    }

    return (
        <button
            onClick={onClick}
            disabled={!isAllowed}
            title={tooltip}
            style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: bg,
                color: color,
                border: 'none',
                borderRadius: '8px',
                cursor: isAllowed ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                opacity: isAllowed ? 1 : 0.5,
                fontSize: '18px'
            }}
            onMouseOver={(e) => {
                if (isAllowed) e.currentTarget.style.background = hoverBg;
            }}
            onMouseOut={(e) => {
                if (isAllowed) e.currentTarget.style.background = bg;
            }}
        >
            {icon}
        </button>
    );
}
