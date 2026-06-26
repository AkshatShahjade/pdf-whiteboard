import { slotRendererRegistry, registerSlotRendererType } from './slot_renderer_registry'
import { verticalPaneSlot } from '../registry_implementations/vertical_pane_slot'

export function setupSlotRegistry(): void {
    if (!slotRendererRegistry.has(verticalPaneSlot.id)) {
        registerSlotRendererType(verticalPaneSlot)
    }
}
