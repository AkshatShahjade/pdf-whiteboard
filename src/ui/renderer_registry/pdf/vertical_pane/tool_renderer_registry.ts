import { ToolDomainType } from "../../../../shared_doman_models_and_dtos/tool_domain_models"
import { ToolRendererType } from "../../mark_tool_renderer_types"

export type ToolCursor = string | ((ctx: ToolCursorContext) => string)
export type ToolActivationMode = "set" | "toggle"

export interface ToolCursorContext {
    sectionTarget?: "start" | "end"
}

export interface ToolPointerDownContext {
    e: any
    coords: { x: number; y: number }
    state: {
        currentSelection: Selection | null
        editingShapeId: string | null
        sectionTarget: "start" | "end"
        tool: string
        zoom: number
    }
    actions: {
        setCurrentSelection: (next: any) => void
        setEditingShapeId: (next: string | null) => void
        setShapeBackup: (next: any) => void
        setSectionTarget: (next: "start" | "end") => void
        setMovingRegion: (next: any) => void
        setTool: (next: string) => void
        setMarksWithSectionWidths: (next: any) => void
        setSelectedMarkId: (next: string | null) => void
    }
}

export interface ToolPointerMoveContext {
    coords: { x: number; y: number }
    state: {
        currentSelection: Selection | null
        editingShapeId: string | null
        tool: string
        zoom: number
    }
    actions: {
        setCurrentSelection: (next: any) => void
    }
}

export interface ToolPointerUpContext {
    currentSelection: Selection | null
    editingShapeId: string | null
    tool: string
    zoom: number
    actions: {
        setCurrentSelection: (next: Selection | null) => void
        setMarksWithSectionWidths: (next: any) => void
        setSelectedMarkId: (next: string | null) => void
    }
}

export interface ToolKeyDownContext {
    e: any
    state: {
        currentSelection: Selection | null
        editingShapeId: string | null
        editingSectionId: string | null
        sectionTarget: "start" | "end"
        tool: string
        zoom: number
        shapeBackup: any
    }
    actions: {
        setTool: (next: string) => void
        setCurrentSelection: (next: any) => void
        setSectionTarget: (next: "start" | "end") => void
        setEditingSectionId: (next: string | null) => void
        setEditingShapeId: (next: string | null) => void
        setShapeBackup: (next: any) => void
        setMarksWithSectionWidths: (next: any) => void
        setSelectedMarkId: (next: string | null) => void
    }
}

export interface ToolActivateContext {
    state: {
        currentSelection: Selection | null
        editingShapeId: string | null
        editingSectionId: string | null
        sectionTarget: "start" | "end"
        tool: string
    }
    actions: {
        setCurrentSelection: (next: any) => void
        setSectionTarget: (next: "start" | "end") => void
        setEditingSectionId: (next: string | null) => void
        setEditingShapeId: (next: string | null) => void
        setShapeBackup: (next: any) => void
        setTool: (next: string) => void
        setSlotStates: (slotId: string, patch: Record<string, any>) => void
    }
}

export interface ToolBorderClickContext {
    regionId: string
    selectedRegionId: string | null
    actions: {
        confirmDelete: () => Promise<boolean>
        deleteRegion: (regionId: string) => void
        selectRegion: (regionId: string | null) => void
        clearShortcutUi: () => void
    }
}


export interface ToolToolbarExtrasContext {
    toolId: string
    tool: string
    sectionTarget: "start" | "end"
    sectionSelection: { start: number | null; end: number | null }
    editingShapeId: string | null
    editingSectionId: string | null
    shapeBackup: any
    actions: {
        setTool: (next: string) => void
        setSectionTarget: (next: "start" | "end") => void
        setEditingSectionId: (next: string | null) => void
        setCurrentSelection: (next: any) => void
        setMarksWithSectionWidths: (next: any) => void
        setSelectedMarkId: (next: string | null) => void
        setSelectedShortcutIdx: (next: number | null) => void
        setShapeBackup: (next: any) => void
        setEditingShapeId: (next: string | null) => void
        setSelectPanelIdx: (next: number | null) => void
    }
}

export interface PDFToolRendererType extends ToolRendererType {
    id: ToolDomainType
    isDrawable: boolean
    createsSelections: boolean

    label?: string
    icon?: string
    order?: number
    hotkey?: string
    activationMode?: ToolActivationMode
    cursor?: ToolCursor

    createNullSelection?: ()=> Selection
    onActivate?: (ctx: ToolActivateContext) => void
    onPointerDown?: (ctx: ToolPointerDownContext) => boolean | void
    onPointerMove?: (ctx: ToolPointerMoveContext) => boolean | void
    onPointerUp?: (ctx: ToolPointerUpContext) => boolean | void
    onKeyDown?: (ctx: ToolKeyDownContext) => boolean | void
    onBorderClick?: (ctx: ToolBorderClickContext) => void | Promise<void>
    renderToolbarExtras?: (ctx: ToolToolbarExtrasContext) => any
}


export const toolRendererRegistry = new Map<string, PDFToolRendererType>()

export function registerToolRendererType(tool: PDFToolRendererType): void {
    if (toolRendererRegistry.has(tool.id.id)) {
        throw new Error(`Duplicate tool implementation: ${tool.id}`)
    }
    toolRendererRegistry.set(tool.id.id, tool)
    if (tool.hotkey) {
        toolHotkeyRegistry.set(tool.hotkey.toLowerCase(), tool)
    }
}

export function getToolRendererType (name: string): PDFToolRendererType {
    const imp = toolRendererRegistry.get(name)   
    
    if(!imp){
        throw new Error(`No tool implementation of name: ${name}`)  
    }
    return imp 
}


const toolHotkeyRegistry = new Map<string, PDFToolRendererType>()

export function getToolRendererByHotkey(key: string): PDFToolRendererType | undefined {
    return toolHotkeyRegistry.get(key.toLowerCase())
}
