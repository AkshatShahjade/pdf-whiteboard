// export interface ToolType{
//     id: string
// }

import { Content, content_id } from "./content_models"
import { Selection } from "./mark_model"

export type ToolCategory = "mark-spatial" | "edit" | "link" | "layer" | "system"
export type ToolActivationMode = "set" | "toggle"
export type ToolCursor = string | ((ctx: ToolCursorContext) => string)

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

export interface ToolBorderClickContext {
    regionId: string
    selectedRegionId: string | null
    actions: {
        confirmDelete: () => Promise<boolean>
        deleteRegion: (regionId: string) => void
        selectRegion: (regionId: string | null) => void
        clearGlobalToolUi: () => void
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
        setSelectedGlobalToolIdx: (next: number | null) => void
        setShapeBackup: (next: any) => void
        setEditingShapeId: (next: string | null) => void
        setSelectPanelToolIdx: (next: number | null) => void
    }
}

export interface ToolType {
    id: string
    content: content_id
    category: ToolCategory
    isDrawable: boolean
    createsSelections: boolean

    hotkey?: string
    activationMode?: ToolActivationMode
    cursor?: ToolCursor

    createNullSelection?: ()=> Selection
    onPointerDown?: (ctx: ToolPointerDownContext) => boolean | void
    onPointerUp?: (ctx: ToolPointerUpContext) => boolean | void
    onBorderClick?: (ctx: ToolBorderClickContext) => void | Promise<void>
    renderToolbarExtras?: (ctx: ToolToolbarExtrasContext) => any
}

export interface Tool {
    id: string
    name: string
    config: RoopaTool
}

export interface RoopaTool{} // TODO: maybe this isn't the way? or it is?
