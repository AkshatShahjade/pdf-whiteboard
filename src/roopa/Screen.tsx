import React, { useState, useRef, useEffect, useCallback } from 'react'
import { UIState } from '../ui/ui_state_store'
import { UIController } from '../ui/ui_controller'
import { getSlotRendererType } from './renderer_registry/slot_renderer_registry'
import {
    SlotConfig,
    ScreenArrangementFn,
    LayoutState,
    reactGridArrangement,
} from './screen_arrangement'

const MIN_SPLIT_PCT = 15
const MAX_SPLIT_PCT = 85

export interface ScreenProps {
    slots: SlotConfig[]
    uiState: UIState
    uiController: UIController
    settings?: any
    onHome?: () => void
    arrangement?: ScreenArrangementFn
    initialSplitPct?: number
}

/**
 * Screen — the top-level workspace layout component.
 *
 * It holds resize state internally (Option B) and delegates the layout
 * calculation to the injected arrangement function (defaulting to
 * reactGridArrangement). It is otherwise fully content-agnostic: it maps
 * each SlotConfig to a SlotRenderer from the slot registry and positions it
 * according to the layout.
 *
 * Screen knows nothing about PDF, whiteboards, marks, or tools.
 */
export default function Screen({
    slots,
    uiState,
    uiController,
    settings,
    onHome,
    arrangement = reactGridArrangement,
    initialSplitPct = 50,
}: ScreenProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [splitPct, setSplitPct] = useState(initialSplitPct)
    const [isResizing, setIsResizing] = useState(false)

    const layoutState: LayoutState = { splitPct }
    const layout = arrangement(slots, layoutState)

    // Drag-to-resize divider logic
    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        setIsResizing(true)
    }, [])

    useEffect(() => {
        if (!isResizing) return

        const onMove = (e: MouseEvent) => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const rawPct = ((e.clientX - rect.left) / rect.width) * 100
            setSplitPct(Math.max(MIN_SPLIT_PCT, Math.min(MAX_SPLIT_PCT, rawPct)))
        }

        const onUp = () => setIsResizing(false)

        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [isResizing])

    // Sync splitPct back to the uiController so it can be persisted if needed
    useEffect(() => {
        if (!isResizing) return
        uiController.setLeftPct(splitPct)
    }, [splitPct, isResizing, uiController])

    // Keep splitPct in sync when uiState.leftPct changes externally (e.g. SESSION_LOADED)
    useEffect(() => {
        if (uiState.leftPct !== undefined && !isResizing) {
            setSplitPct(uiState.leftPct)
        }
    }, [uiState.leftPct]) // intentionally omit isResizing — only sync on external changes

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                userSelect: isResizing ? 'none' : 'auto',
            }}
        >
            {slots.map((slot, idx) => {
                const position = layout.positions[slot.id]
                if (!position) return null

                const SlotComponent = getSlotRendererType(slot.slotType).Component
                const isNotLast = idx < slots.length - 1

                return (
                    <React.Fragment key={slot.id}>
                        <div
                            onMouseEnter={() => uiController.setActiveSlot(slot.id)}
                            style={{
                                position: 'absolute',
                                left: position.left,
                                top: position.top,
                                width: position.width,
                                height: position.height,
                                transition: isResizing ? 'none' : 'left 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)',
                                overflow: 'hidden',
                            }}
                        >
                            <SlotComponent
                                slotId={slot.id}
                                uiState={uiState}
                                uiController={uiController}
                                settings={settings}
                                onHome={onHome}
                            />
                        </div>

                        {/* Drag-to-resize divider between adjacent slots */}
                        {slots.length > 1 && isNotLast && (
                            <div
                                onMouseDown={startResize}
                                style={{
                                    position: 'absolute',
                                    left: position.width,  // right edge of this slot
                                    top: 0,
                                    width: '6px',
                                    height: '100%',
                                    cursor: 'col-resize',
                                    zIndex: 20,
                                    background: isResizing ? '#3B82F6' : '#262a33',
                                    borderLeft: '1px solid #374151',
                                    borderRight: '1px solid #374151',
                                    transition: isResizing ? 'none' : 'background 0.2s',
                                    transform: 'translateX(-50%)',
                                }}
                            />
                        )}
                    </React.Fragment>
                )
            })}
        </div>
    )
}
