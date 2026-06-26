/**
 * screen_arrangement.ts — Defines the ScreenArrangementFn contract and provides
 * the default arrangement algorithms.
 *
 * A ScreenArrangementFn is a pure function: given the list of slots and the
 * current layout state (e.g. resize percentages), it produces a ScreenLayout
 * that maps each slotId to absolute CSS values.
 *
 * Keeping this logic separate means swapping layout algorithms (grid, mosaic,
 * fullscreen, etc.) never touches the Screen component or any slot/content code.
 */

export interface SlotConfig {
    id: string       // slotId (e.g. 'main', 'side')
    slotType: string // 'verticalPane', etc.
}

/** Pixel/percentage bounds for one slot in the screen. */
export interface SlotPosition {
    left: string
    top: string
    width: string
    height: string
}

export interface ScreenLayout {
    positions: Record<string, SlotPosition>
}

/** State that the arrangement function may need (e.g. drag-resize position). */
export interface LayoutState {
    splitPct: number  // percentage of screen width given to the first slot (0-100)
}

export type ScreenArrangementFn = (slots: SlotConfig[], layoutState: LayoutState) => ScreenLayout

/**
 * reactGridArrangement — the default simple left/right split.
 *
 * - 1 slot  → full width
 * - 2 slots → left column at splitPct%, right column takes the rest
 * - 3+ slots → equal columns (extensible later)
 */
export function reactGridArrangement(slots: SlotConfig[], layoutState: LayoutState): ScreenLayout {
    const positions: Record<string, SlotPosition> = {}

    if (slots.length === 0) return { positions }

    if (slots.length === 1) {
        positions[slots[0].id] = { left: '0', top: '0', width: '100%', height: '100%' }
        return { positions }
    }

    if (slots.length === 2) {
        const leftPct = layoutState.splitPct
        const rightPct = 100 - leftPct
        positions[slots[0].id] = { left: '0', top: '0', width: `${leftPct}%`, height: '100%' }
        positions[slots[1].id] = { left: `${leftPct}%`, top: '0', width: `${rightPct}%`, height: '100%' }
        return { positions }
    }

    // Equal columns for 3+ slots
    const colPct = 100 / slots.length
    slots.forEach((slot, i) => {
        positions[slot.id] = {
            left: `${i * colPct}%`,
            top: '0',
            width: `${colPct}%`,
            height: '100%',
        }
    })
    return { positions }
}
