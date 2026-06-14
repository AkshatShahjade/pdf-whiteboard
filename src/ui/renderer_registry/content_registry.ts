import { content_id } from "../../shared_doman_models_and_dtos/content_domain_models"
import { SlotRendererType } from "./pdf/slot_registry"

export const contentRegistry = new Map<string, ContentRendererType>

export interface ContentRendererType {
    id: content_id
    slotRegistry: Map<string, SlotRendererType>
}


export function registerContentRendererType(impl: ContentRendererType): void {
    if (contentRegistry.has(impl.id)) {
        throw new Error(`Duplicate content implementation: ${impl.id}`)
    }
    contentRegistry.set(impl.id, impl)
}

export function getContentRendererType (id: string): ContentRendererType {
    const imp = contentRegistry.get(id)

    if(!imp){
        throw new Error(`No content implementation of id: ${id}`)
    }
    return imp 
}