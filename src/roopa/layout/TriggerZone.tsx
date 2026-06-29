import React, { useState } from 'react';

export interface TriggerZoneProps {
    position: 'top' | 'bottom' | 'left' | 'right';
    triggerThickness?: number; // The size of the hoverable area when hidden (e.g. 16px)
    glowColor?: string;
    innerElement: React.ReactNode;
    style?: React.CSSProperties; // To allow custom width/centering
}

export function TriggerZone({
    position,
    triggerThickness = 16,
    glowColor = 'rgba(59, 130, 246, 0.5)',
    innerElement,
    style = {}
}: TriggerZoneProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Determine the absolute positioning based on the edge
    const posStyle: React.CSSProperties = {
        position: 'absolute',
        zIndex: 10000,
        ...style
    };

    if (position === 'top') posStyle.top = 0;
    if (position === 'bottom') posStyle.bottom = 0;
    if (position === 'left') posStyle.left = 0;
    if (position === 'right') posStyle.right = 0;

    // Determine the translation direction for the inner element
    let transformHidden = 'translateY(0)';
    if (position === 'top') transformHidden = 'translateY(-100%)';
    if (position === 'bottom') transformHidden = 'translateY(100%)';
    if (position === 'left') transformHidden = 'translateX(-100%)';
    if (position === 'right') transformHidden = 'translateX(100%)';

    const isVertical = position === 'left' || position === 'right';

    return (
        <div
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            style={{
                ...posStyle,
                display: 'flex',
                flexDirection: position === 'bottom' ? 'column-reverse' : position === 'right' ? 'row-reverse' : (isVertical ? 'row' : 'column'),
                alignItems: 'center',
                pointerEvents: 'none' // The wrapper shouldn't block clicks, only its children
            }}
        >
            {/* The Invisible Catch Zone with the Glow */}
            <div style={{
                pointerEvents: 'auto',
                width: isVertical ? `${triggerThickness}px` : '100%',
                height: !isVertical ? `${triggerThickness}px` : '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                opacity: isVisible ? 0 : 1,
                transition: 'opacity 0.2s',
                // Draw a faint gradient dashed border based on position
                background: position === 'top' ? `linear-gradient(to bottom, ${glowColor.replace('0.5', '0.08')}, transparent)`
                    : position === 'bottom' ? `linear-gradient(to top, ${glowColor.replace('0.5', '0.08')}, transparent)`
                    : 'transparent',
                borderBottom: position === 'top' ? `1.5px dashed ${glowColor.replace('0.5', '0.35')}` : 'none',
                borderTop: position === 'bottom' ? `1.5px dashed ${glowColor.replace('0.5', '0.35')}` : 'none',
            }}>
                <div style={{
                    width: isVertical ? '4px' : '36px',
                    height: !isVertical ? '4px' : '36px',
                    background: glowColor,
                    borderRadius: '2px',
                    boxShadow: `0 0 6px ${glowColor.replace('0.5', '0.4')}`
                }} />
            </div>

            {/* The Slid-out Inner Element */}
            <div style={{
                position: 'absolute',
                pointerEvents: 'auto',
                transform: isVisible ? (isVertical ? 'translateX(0)' : 'translateY(0)') : transformHidden,
                opacity: isVisible ? 1 : 0,
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s',
                // Position the inner element tightly against the edge
                top: position === 'top' ? 0 : 'auto',
                bottom: position === 'bottom' ? 0 : 'auto',
                left: position === 'left' ? 0 : 'auto',
                right: position === 'right' ? 0 : 'auto',
            }}>
                {innerElement}
            </div>
        </div>
    );
}
