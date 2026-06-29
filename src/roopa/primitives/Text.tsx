import React from 'react';

export interface TextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'mono';
    color?: 'primary' | 'secondary' | 'accent' | 'danger';
    align?: 'left' | 'center' | 'right';
    children: React.ReactNode;
}

export function Text({
    variant = 'body',
    color = 'primary',
    align = 'left',
    children
}: TextProps) {
    let fontSize = '14px';
    let fontWeight = 400;
    let fontFamily = 'inherit';

    switch (variant) {
        case 'h1':
            fontSize = '24px';
            fontWeight = 700;
            break;
        case 'h2':
            fontSize = '18px';
            fontWeight = 600;
            break;
        case 'h3':
            fontSize = '16px';
            fontWeight = 600;
            break;
        case 'caption':
            fontSize = '12px';
            fontWeight = 400;
            break;
        case 'mono':
            fontSize = '13px';
            fontFamily = "'IBM Plex Mono', monospace";
            break;
        case 'body':
        default:
            fontSize = '14px';
            fontWeight = 400;
            break;
    }

    let hexColor = '#ffffff';
    switch (color) {
        case 'secondary':
            hexColor = '#888888';
            break;
        case 'accent':
            hexColor = '#3B82F6';
            break;
        case 'danger':
            hexColor = '#EF4444';
            break;
        case 'primary':
        default:
            hexColor = '#ffffff';
            break;
    }

    return (
        <span style={{
            fontSize,
            fontWeight,
            fontFamily,
            color: hexColor,
            textAlign: align,
            margin: 0,
            padding: 0,
            display: 'inline-block'
        }}>
            {children}
        </span>
    );
}
