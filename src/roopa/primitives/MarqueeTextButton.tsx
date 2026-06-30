import React, { useState, useEffect, useRef } from 'react';
import { RoopaElement, useRoopaElement } from '../mode_system';
import { UIStateStore } from '../../ui/ui_state_store';

export interface MarqueeTextButtonProps {
    value: string;
    placeholder?: string;
    onClick?: () => void;
    permissionId?: RoopaElement;
    uiStore?: UIStateStore;
    title?: string;
}

export function MarqueeTextButton({
    value,
    placeholder = 'Click to select...',
    onClick,
    permissionId,
    uiStore,
    title
}: MarqueeTextButtonProps) {
    const isAllowed = permissionId && uiStore ? useRoopaElement(uiStore, permissionId) : true;
    
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        const measure = measureRef.current;
        if (!container || !measure) return;

        const checkOverflow = () => {
            setIsOverflowing(measure.offsetWidth > container.clientWidth);
        };

        checkOverflow();
        const observer = new ResizeObserver(checkOverflow);
        observer.observe(container);
        
        return () => observer.disconnect();
    }, [value, placeholder]);

    return (
        <div 
            onClick={isAllowed ? onClick : undefined}
            className={isAllowed ? "marquee-text-btn-container" : ""}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                padding: '4px 6px',
                minHeight: '32px',
                cursor: isAllowed ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden'
            }}
            title={title || value || placeholder}
        >
            <style>
                {`
                .marquee-text-btn-container:hover {
                    box-shadow: 0 0 8px 1px rgba(255, 255, 255, 0.15);
                    border-color: rgba(255, 255, 255, 0.3) !important;
                    background: rgba(255, 255, 255, 0.05);
                }
                @keyframes marquee-text-btn-half {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                `}
            </style>
            
            {/* Hidden span for measuring text width accurately */}
            <span 
                ref={measureRef}
                style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    whiteSpace: 'nowrap',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    pointerEvents: 'none'
                }}
            >
                {value || placeholder}
            </span>

            <div 
                ref={containerRef}
                style={{
                    flex: 1,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    paddingLeft: '6px',
                    maskImage: isOverflowing ? 'linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)' : 'none',
                    WebkitMaskImage: isOverflowing ? 'linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)' : 'none',
                }}
            >
                <div style={{
                    display: 'inline-block',
                    animation: isOverflowing ? 'marquee-text-btn-half 10s linear infinite' : 'none',
                    fontSize: '13px',
                    color: value ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontFamily: 'inherit',
                }}>
                    <span style={{ paddingRight: isOverflowing ? '32px' : '0' }}>
                        {value || placeholder}
                    </span>
                    {isOverflowing && (
                        <span style={{ paddingRight: '32px' }}>
                            {value || placeholder}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
