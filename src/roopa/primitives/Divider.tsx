import React from 'react';

export interface DividerProps {
    orientation?: 'horizontal' | 'vertical';
    color?: string;
    thickness?: number;
    margin?: string;
}

export function Divider({
    orientation = 'horizontal',
    color = 'rgba(255, 255, 255, 0.1)',
    thickness = 1,
    margin = '8px'
}: DividerProps) {
    const isHorizontal = orientation === 'horizontal';

    return (
        <div
            style={{
                width: isHorizontal ? '100%' : `${thickness}px`,
                height: isHorizontal ? `${thickness}px` : '100%',
                backgroundColor: color,
                marginTop: isHorizontal ? margin : '0',
                marginBottom: isHorizontal ? margin : '0',
                marginLeft: !isHorizontal ? margin : '0',
                marginRight: !isHorizontal ? margin : '0',
                flexShrink: 0
            }}
        />
    );
}
