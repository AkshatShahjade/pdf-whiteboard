import React, { useState, useRef, useEffect, useCallback, ReactNode } from 'react';

const MIN_SPLIT_PCT = 15;
const MAX_SPLIT_PCT = 85;

export interface DualSplitPaneProps {
    direction?: 'horizontal' | 'vertical';
    splitPct: number;
    onSplitPctChange: (pct: number) => void;
    children: [ReactNode, ReactNode]; // Exactly two children
}

/**
 * DualSplitPane
 * A reusable layout element that splits its container into two sections,
 * either horizontally or vertically, with a draggable divider.
 */
export function DualSplitPane({
    direction = 'horizontal',
    splitPct,
    onSplitPctChange,
    children
}: DualSplitPaneProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [localPct, setLocalPct] = useState(splitPct);
    const [isResizing, setIsResizing] = useState(false);

    // Keep localPct in sync when splitPct changes externally
    useEffect(() => {
        if (!isResizing) {
            setLocalPct(splitPct);
        }
    }, [splitPct, isResizing]);

    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const onMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            
            let rawPct = 50;
            if (direction === 'horizontal') {
                rawPct = ((e.clientX - rect.left) / rect.width) * 100;
            } else {
                rawPct = ((e.clientY - rect.top) / rect.height) * 100;
            }
            
            setLocalPct(Math.max(MIN_SPLIT_PCT, Math.min(MAX_SPLIT_PCT, rawPct)));
        };

        const onUp = () => {
            setIsResizing(false);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isResizing, direction]);

    // Commit change continuously while dragging
    useEffect(() => {
        if (!isResizing) return;
        onSplitPctChange(localPct);
    }, [localPct, isResizing, onSplitPctChange]);

    const leftChild = children[0];
    const rightChild = children[1];

    const hasLeft = !!leftChild;
    const hasRight = !!rightChild;

    if (!hasLeft && !hasRight) {
        return null;
    }

    const leftVal = !hasRight ? 100 : (!hasLeft ? 0 : localPct);
    const rightVal = !hasLeft ? 100 : (!hasRight ? 0 : (100 - localPct));
    const showDivider = hasLeft && hasRight;

    if (direction === 'horizontal') {
        return (
            <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', userSelect: isResizing ? 'none' : 'auto' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, width: `${leftVal}%`, height: '100%', overflow: 'hidden', display: hasLeft ? 'block' : 'none' }}>
                    {leftChild}
                </div>
                {showDivider && (
                    <div 
                        onMouseDown={startResize}
                        style={{
                            position: 'absolute',
                            left: `${localPct}%`,
                            top: 0,
                            width: '6px',
                            height: '100%',
                            cursor: 'col-resize',
                            zIndex: 20,
                            background: isResizing ? '#3B82F6' : '#262a33',
                            borderLeft: '1px solid #374151',
                            borderRight: '1px solid #374151',
                            transform: 'translateX(-50%)',
                            transition: isResizing ? 'none' : 'background 0.2s',
                        }}
                    />
                )}
                <div style={{ position: 'absolute', left: `${leftVal}%`, top: 0, width: `${rightVal}%`, height: '100%', overflow: 'hidden', display: hasRight ? 'block' : 'none' }}>
                    {rightChild}
                </div>
            </div>
        );
    } else {
        // Vertical split
        return (
            <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', userSelect: isResizing ? 'none' : 'auto' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: `${leftVal}%`, overflow: 'hidden', display: hasLeft ? 'block' : 'none' }}>
                    {leftChild}
                </div>
                {showDivider && (
                    <div 
                        onMouseDown={startResize}
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: `${localPct}%`,
                            width: '100%',
                            height: '6px',
                            cursor: 'row-resize',
                            zIndex: 20,
                            background: isResizing ? '#3B82F6' : '#262a33',
                            borderTop: '1px solid #374151',
                            borderBottom: '1px solid #374151',
                            transform: 'translateY(-50%)',
                            transition: isResizing ? 'none' : 'background 0.2s',
                        }}
                    />
                )}
                <div style={{ position: 'absolute', left: 0, top: `${leftVal}%`, width: '100%', height: `${rightVal}%`, overflow: 'hidden', display: hasRight ? 'block' : 'none' }}>
                    {rightChild}
                </div>
            </div>
        );
    }
}
