import { slot_id } from "../../../shared_doman_models_and_dtos/slot_domain_models"
import { MarkRendererType } from "./vertical_pane/mark_registry"
import { ToolRendererType } from "./vertical_pane/tool_registry"

export const slotRegistry = new Map<string, SlotRendererType>


export interface SlotRendererType {
    id: slot_id
    markRegistry: Map<string, MarkRendererType>
    toolRegistry: Map<string, ToolRendererType>
    render: any
}

export function registerSlotRendererType(impl: SlotRendererType): void {
    if (slotRegistry.has(impl.id)) {
        throw new Error(`Duplicate slot implementation: ${impl.id}`)
    }
    slotRegistry.set(impl.id, impl)
}

export function getSlotRendererType (id: string): SlotRendererType {
    const imp = slotRegistry.get(id)

    if(!imp){
        throw new Error(`No slot implementation of id: ${id}`)
    }
    return imp 
}