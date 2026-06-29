import React from 'react';
import { UIElement, useUIElement } from '../../ui/mode_system';
import { UIStateStore } from '../../ui/ui_state_store';

export interface SliderProps {
    min: number;
    max: number;
    step?: number;
    value: number;
    permissionId?: UIElement;
    uiStore?: UIStateStore;
    onChange: (val: number) => void;
}

export function Slider({
    min,
    max,
    step = 1,
    value,
    permissionId,
    uiStore,
    onChange
}: SliderProps) {
    const isAllowed = permissionId && uiStore ? useUIElement(uiStore, permissionId) : true;

    return (
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={!isAllowed}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{
                width: '100%',
                cursor: isAllowed ? 'pointer' : 'not-allowed',
                opacity: isAllowed ? 1 : 0.5,
                accentColor: '#3B82F6' // Standardized primary color for track fill
            }}
        />
    );
}
