import React, { useEffect, useRef } from 'react';
import { ButtonFlat } from '../primitives/ButtonFlat';
import { Text } from '../primitives/Text';

export interface CenterScreenPanelProps {
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
    children: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
}

export function CenterScreenPanel({
    title,
    onConfirm,
    onCancel,
    children,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel'
}: CenterScreenPanelProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            onCancel();
        }
    };

    return (
        <div 
            ref={overlayRef}
            onClick={handleOverlayClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <div style={{
                background: 'rgba(20, 20, 20, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)'
            }}>
                <Text variant="h2">{title}</Text>
                
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {children}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <ButtonFlat label={cancelLabel} onClick={onCancel} />
                    <ButtonFlat label={confirmLabel} onClick={onConfirm} />
                </div>
            </div>
        </div>
    );
}
