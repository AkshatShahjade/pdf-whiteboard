import React from 'react';
import { UIElement, useUIElement } from '../../ui/mode_system';
import { UIStateStore } from '../../ui/ui_state_store';

export interface DropdownSelectProps {
    options: { label: string; value: string }[];
    selectedValue: string;
    permissionId?: UIElement;
    uiStore?: UIStateStore;
    onSelect: (val: string) => void;
}

export function DropdownSelect({
    options,
    selectedValue,
    permissionId,
    uiStore,
    onSelect
}: DropdownSelectProps) {
    const isAllowed = permissionId && uiStore ? useUIElement(uiStore, permissionId) : true;

    return (
        <select
            value={selectedValue}
            disabled={!isAllowed}
            onChange={(e) => onSelect(e.target.value)}
            style={{
                background: 'rgba(0,0,0,0.3)',
                color: isAllowed ? '#fff' : '#666',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontFamily: 'inherit',
                fontSize: '13px',
                cursor: isAllowed ? 'pointer' : 'not-allowed',
                outline: 'none',
                opacity: isAllowed ? 1 : 0.6
            }}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value} style={{ background: '#1c1f26', color: '#fff' }}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}
