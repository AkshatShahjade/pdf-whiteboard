import React from 'react';
import { UIElement, useUIElement } from '../../ui/mode_system';
import { UIStateStore } from '../../ui/ui_state_store';

export interface TextInputProps {
    placeholder?: string;
    value: string;
    autoFocus?: boolean;
    permissionId?: UIElement;
    uiStore?: UIStateStore;
    onChange: (val: string) => void;
    onSubmit?: (val: string) => void;
}

export function TextInput({
    placeholder,
    value,
    autoFocus = false,
    permissionId,
    uiStore,
    onChange,
    onSubmit
}: TextInputProps) {
    const isAllowed = permissionId && uiStore ? useUIElement(uiStore, permissionId) : true;

    return (
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            disabled={!isAllowed}
            autoFocus={autoFocus}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && onSubmit) {
                    onSubmit(value);
                }
            }}
            style={{
                width: '100%',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: isAllowed ? '#fff' : '#666',
                padding: '6px 10px',
                borderRadius: '6px',
                fontFamily: 'inherit',
                fontSize: '13px',
                outline: 'none',
                opacity: isAllowed ? 1 : 0.6,
                cursor: isAllowed ? 'text' : 'not-allowed'
            }}
        />
    );
}
