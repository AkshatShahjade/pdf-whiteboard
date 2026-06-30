import React from 'react';
import { RoopaElement, useRoopaElement } from '../mode_system';
import { UIStateStore } from '../../ui/ui_state_store';

export interface ButtonFlatProps {
    label: string;
    icon?: string;
    disabled?: boolean;
    active?: boolean;
    permissionId?: RoopaElement;
    uiStore?: UIStateStore;
    onClick: () => void;
}

export function ButtonFlat({
    label,
    icon,
    disabled = false,
    active = false,
    permissionId,
    uiStore,
    onClick
}: ButtonFlatProps) {
    const isAllowed = permissionId && uiStore ? useRoopaElement(uiStore, permissionId) : true;
    const effectivelyDisabled = disabled || !isAllowed;

    return (
        <button
            onClick={onClick}
            disabled={effectivelyDisabled}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: active ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: effectivelyDisabled ? '#666' : (active ? '#60A5FA' : '#fff'),
                border: active ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: effectivelyDisabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                fontSize: '13px',
                transition: 'all 0.2s',
                opacity: effectivelyDisabled ? 0.6 : 1
            }}
            onMouseOver={(e) => {
                if (!effectivelyDisabled) e.currentTarget.style.background = active ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseOut={(e) => {
                if (!effectivelyDisabled) e.currentTarget.style.background = active ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)';
            }}
        >
            {icon && <span>{icon}</span>}
            <span>{label}</span>
        </button>
    );
}
