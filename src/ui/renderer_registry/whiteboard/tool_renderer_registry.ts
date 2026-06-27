import { ToolDomainType } from "../../../shared_doman_models_and_dtos/tool_domain_models"
import { ToolRendererType } from "../mark_tool_renderer_types"

export type ToolCursor = string | ((ctx: any) => string)
export type ToolActivationMode = "set" | "toggle"

export interface WhiteboardToolRendererType extends ToolRendererType {
    id: ToolDomainType
    isDrawable: boolean
    createsSelections: boolean

    label?: string
    icon?: string
    order?: number
    hotkey?: string
    activationMode?: ToolActivationMode
    cursor?: ToolCursor

    createNullSelection?: () => any
    onActivate?: (ctx: any) => void
    onPointerDown?: (ctx: any) => boolean | void
    onPointerMove?: (ctx: any) => boolean | void
    onPointerUp?: (ctx: any) => boolean | void
    onKeyDown?: (ctx: any) => boolean | void
    onBorderClick?: (ctx: any) => void | Promise<void>
    renderToolbarExtras?: (ctx: any) => any
    
    // Tldraw native integration
    tldrawTool?: any // StateNode class
    tldrawShapeUtil?: any // ShapeUtil class
    tldrawUiOverrides?: any
}

export const whiteboardToolRendererRegistry = new Map<string, WhiteboardToolRendererType>()
const toolHotkeyRegistry = new Map<string, WhiteboardToolRendererType>()

export function registerWhiteboardToolRendererType(tool: WhiteboardToolRendererType): void {
    if (whiteboardToolRendererRegistry.has(tool.id.id)) {
        throw new Error(`Duplicate whiteboard tool implementation: ${tool.id.id}`)
    }
    whiteboardToolRendererRegistry.set(tool.id.id, tool)
    if (tool.hotkey) {
        toolHotkeyRegistry.set(tool.hotkey.toLowerCase(), tool)
    }
}

export function getWhiteboardToolRendererType(name: string): WhiteboardToolRendererType {
    const imp = whiteboardToolRendererRegistry.get(name)   
    if (!imp) {
        throw new Error(`No whiteboard tool implementation of name: ${name}`)  
    }
    return imp 
}

export function getWhiteboardToolRendererByHotkey(key: string): WhiteboardToolRendererType | undefined {
    return toolHotkeyRegistry.get(key.toLowerCase())
}
