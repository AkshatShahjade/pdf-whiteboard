import { ComponentType } from 'react'
import { slot_id } from '../../shared_doman_models_and_dtos/slot_domain_models'
import { UIState } from '../../ui/ui_state_store'
import { UIController } from '../../ui/ui_controller'

/**
 * Props passed to every Slot component regardless of slot type.
 * The Slot component is responsible for reading its content from uiState.slots[slotId]
 * and delegating to the appropriate ContentRenderer via contentRendererRegistry.
 */
export interface SlotProps {
    slotId: string
    uiState: UIState
    uiController: UIController
    settings?: any
    onHome?: () => void
}

/**
 * SlotRendererType — the registry entry for a Roopa slot type.
 * Each slot type knows its identity, how many contents it holds, and
 * provides a content-agnostic React component that renders those contents.
 */
export interface SlotRendererType {
    id: slot_id
    contentCapacity: 1 | 'many'   // 1 = single content (VerticalPane); 'many' = multi-tab (future)
    Component: ComponentType<SlotProps>
}

export const slotRendererRegistry = new Map<string, SlotRendererType>()

export function registerSlotRendererType(impl: SlotRendererType): void {
    if (slotRendererRegistry.has(impl.id)) {
        throw new Error(`Duplicate slot renderer type: ${impl.id}`)
    }
    slotRendererRegistry.set(impl.id, impl)
}

export function getSlotRendererType(id: string): SlotRendererType {
    const impl = slotRendererRegistry.get(id)
    if (!impl) {
        throw new Error(`No slot renderer type registered for id: ${id}`)
    }
    return impl
}
