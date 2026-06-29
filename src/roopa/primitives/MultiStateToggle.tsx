import React from 'react';
import { UIElement, useUIElement } from '../../ui/mode_system';
import { UIStateStore } from '../../ui/ui_state_store';

export interface MultiStateToggleProps {
    states: string[];
    currentState: string;
    variant?: 'expanded' | 'compact';
    permissionId?: UIElement;
    uiStore?: UIStateStore;
    onToggle: (newState: string) => void;
}

export function MultiStateToggle({
    states,
    currentState,
    variant = 'expanded',
    permissionId,
    uiStore,
    onToggle
}: MultiStateToggleProps) {
    const isAllowed = permissionId && uiStore ? useUIElement(uiStore, permissionId) : true;

    const handleCycle = () => {
        if (!isAllowed) return;
        const currentIndex = states.indexOf(currentState);
        const nextIndex = (currentIndex + 1) % states.length;
        onToggle(states[nextIndex]);
    };

    return (
        <button
            onClick={handleCycle}
            disabled={!isAllowed}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: isAllowed ? '#fff' : '#666',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: isAllowed ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                fontSize: '12px',
                transition: 'all 0.2s',
                opacity: isAllowed ? 1 : 0.6
            }}
            onMouseOver={(e) => {
                if (isAllowed) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseOut={(e) => {
                if (isAllowed) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
        >
            {variant === 'expanded' ? (
                <>
                    <span style={{ color: '#888' }}>[</span>
                    {states.map((s) => (
                        <span
                            key={s}
                            style={{
                                fontWeight: s === currentState ? 'bold' : 'normal',
                                color: s === currentState ? (isAllowed ? '#3B82F6' : '#666') : (isAllowed ? '#ccc' : '#444')
                            }}
                        >
                            {s}
                        </span>
                    )).reduce((prev, curr) => [prev, <span key={`sep-${Math.random()}`} style={{ color: '#444' }}>|</span>, curr] as any)}
                    <span style={{ color: '#888' }}>]</span>
                </>
            ) : (
                <div style={{ display: 'grid' }}>
                    {states.map((s) => (
                        <span
                            key={s}
                            style={{
                                gridArea: '1 / 1',
                                visibility: s === currentState ? 'visible' : 'hidden',
                                fontWeight: 'bold',
                                color: isAllowed ? '#3B82F6' : '#666'
                            }}
                        >
                            {s}
                        </span>
                    ))}
                </div>
            )}
        </button>
    );
}
