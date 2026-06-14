import { content_id } from "../../shared_doman_models_and_dtos/content_domain_models"
import { SlotRendererType } from "./pdf/slot_renderer_registry"

export const contentRendererRegistry = new Map<string, ContentRendererType>

export interface ContentRendererType {
    id: content_id
    slotRendererRegistry: Map<string, SlotRendererType>
}


export function registerContentRendererType(impl: ContentRendererType): void {
    if (contentRendererRegistry.has(impl.id)) {
        throw new Error(`Duplicate content implementation: ${impl.id}`)
    }
    contentRendererRegistry.set(impl.id, impl)
}

export function getContentRendererType (id: string): ContentRendererType {
    const imp = contentRendererRegistry.get(id)

    if(!imp){
        throw new Error(`No content implementation of id: ${id}`)
    }
    return imp 
}