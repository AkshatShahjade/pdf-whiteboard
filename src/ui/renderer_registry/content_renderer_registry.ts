import { ComponentType } from 'react'
import { content_type } from "../../shared_doman_models_and_dtos/content_domain_models"
import { MarkRendererType, ToolRendererType } from "./mark_tool_renderer_types"

export interface ContentRendererProps {
    slotId: string
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

    // Optional: content types that have their own mark/tool subsystems
    // (e.g. PDF). Content types without marks/tools (e.g. whiteboard) omit these.
    markRendererRegistry?: Map<string, MarkRendererType>
    toolRendererRegistry?: Map<string, ToolRendererType>
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