import { slot_id } from "../../../shared_doman_models_and_dtos/slot_domain_models"
import { MarkRendererType } from "./vertical_pane/mark_renderer_registry"
import { ToolRendererType } from "./vertical_pane/tool_renderer_registry"

export const slotRendererRegistry = new Map<string, SlotRendererType>


export interface SlotRendererType {
    id: slot_id
    markRendererRegistry: Map<string, MarkRendererType>
    toolRendererRegistry: Map<string, ToolRendererType>
    render: any
}

export function registerSlotRendererType(impl: SlotRendererType): void {
    if (slotRendererRegistry.has(impl.id)) {
        throw new Error(`Duplicate slot implementation: ${impl.id}`)
    }
    slotRendererRegistry.set(impl.id, impl)
}

export function getSlotRendererType (id: string): SlotRendererType {
    const imp = slotRendererRegistry.get(id)

    if(!imp){
        throw new Error(`No slot implementation of id: ${id}`)
    }
    return imp 
}