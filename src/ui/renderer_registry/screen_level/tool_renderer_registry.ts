import { ToolDomainType } from "../../../shared_doman_models_and_dtos/tool_domain_models"
import { ToolRendererType } from "../mark_tool_renderer_types"

export interface ScreenToolRendererType extends ToolRendererType {
    id: ToolDomainType
    label: string
    icon: string
    onActivate?: (ctx: any) => void
}

export const screenToolRendererRegistry = new Map<string, ScreenToolRendererType>()

export function registerScreenToolRendererType(tool: ScreenToolRendererType): void {
    if (screenToolRendererRegistry.has(tool.id.id)) {
        throw new Error(`Duplicate screen tool implementation: ${tool.id.id}`)
    }
    screenToolRendererRegistry.set(tool.id.id, tool)
}

export function getScreenToolRendererType(id: string): ScreenToolRendererType {
    const impl = screenToolRendererRegistry.get(id)
    if (!impl) {
        throw new Error(`No screen tool implementation of id: ${id}`)
    }
    return impl
}
