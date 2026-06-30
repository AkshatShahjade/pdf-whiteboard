import React, { useEffect, useRef } from 'react';

export interface PopoverProps {
    isOpen: boolean;
    onClose: () => void;
    anchorEl: HTMLElement | null;
    children: React.ReactNode;
    width?: string | number;
}

export function Popover({ isOpen, onClose, anchorEl, children, width = 300 }: PopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
                anchorEl && !anchorEl.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose, anchorEl]);

    if (!isOpen || !anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();
    
    // Ensure it doesn't go off bottom of screen
    const top = rect.bottom + 8;
    const isOverflowing = top + 400 > window.innerHeight;
    const finalTop = isOverflowing ? rect.top - 408 : top;

    return (
        <div
            ref={popoverRef}
            style={{
                position: 'fixed',
                top: finalTop,
                left: rect.left,
                width: width,
                maxHeight: '400px',
                overflowY: 'auto',
                background: 'rgba(25, 28, 35, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}
        >
            {children}
        </div>
    );
}
