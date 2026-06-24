import { ComponentType } from 'react'
import { content_type } from "../../shared_doman_models_and_dtos/content_domain_models"
import { SlotRendererType } from "./pdf/slot_renderer_registry"

export interface ContentRendererProps {
    contentId: string
    path?: string
    settings?: any
    uiState?: any
    uiController?: any
    onHome?: () => void
}

export interface ContentRendererType {
    id: content_type
    Component: ComponentType<ContentRendererProps>
    slotRendererRegistry: Map<string, SlotRendererType>
}

export const contentRendererRegistry = new Map<string, ContentRendererType>()

export function registerContentRendererType(impl: ContentRendererType): void {
    if (contentRendererRegistry.has(impl.id)) {
        throw new Error(`Duplicate content renderer type: ${impl.id}`)
    }
    contentRendererRegistry.set(impl.id, impl)
}

export function getContentRendererType(id: string): ContentRendererType {
    const impl = contentRendererRegistry.get(id)
    if (!impl) {
        throw new Error(`No content renderer type registered for id: ${id}`)
    }
    return impl
}