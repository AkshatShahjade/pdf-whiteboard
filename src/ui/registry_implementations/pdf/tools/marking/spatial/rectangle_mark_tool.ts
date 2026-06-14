import type {
    ToolActivateContext,
    ToolKeyDownContext,
    ToolPointerDownContext,
    ToolPointerMoveContext,
    ToolPointerUpContext,
    ToolType,
} from "../../../../../../shared_doman_models_and_dtos/tool_models"
import { rectangleMark } from "../../../marks/rectangle_mark"
import { renderDrawableToolbarExtras } from "../../../tool_toolbar_extras"

function resetDrawableToolState(actions: {
    setCurrentSelection: (next: any) => void
    setSectionTarget: (next: "start" | "end") => void
    setEditingSectionId: (next: string | null) => void
    setEditingShapeId: (next: string | null) => void
    setShapeBackup: (next: any) => void
}) {
    actions.setCurrentSelection(null)
    actions.setSectionTarget('start')
    actions.setEditingSectionId(null)
    actions.setEditingShapeId(null)
    actions.setShapeBackup(null)
}

export const rectTool: ToolType = {
    id: "rect",
    content: 'pdf',
    category: 'mark-spatial',
    isDrawable: true,
    createsSelections : true,
    hotkey: 'r',
    activationMode: 'toggle',
    cursor: 'crosshair',

    createNullSelection() {
        return {type:"rect", startX: null, startY: null, currentX: null, currentY: null}
    },

    onActivate(ctx: ToolActivateContext) {
        resetDrawableToolState(ctx.actions)
    },

    onPointerDown(ctx: ToolPointerDownContext) {
        ctx.e.currentTarget.setPointerCapture?.(ctx.e.pointerId)
        ctx.actions.setCurrentSelection(rectangleMark.initiateShape(ctx.coords))
        return true
    },

    onPointerMove(ctx: ToolPointerMoveContext) {
        if (!ctx.state.currentSelection || ctx.state.currentSelection.type !== 'rect') return false
        ctx.actions.setCurrentSelection(
            rectangleMark.updateSelection?.(ctx.state.currentSelection, ctx.coords) ?? ctx.state.currentSelection
        )
        return true
    },

    onPointerUp(ctx: ToolPointerUpContext) {
        if (!ctx.currentSelection || ctx.currentSelection.type !== 'rect') return false

        const shape = rectangleMark.returnDrawableMarkWithoutId(ctx.currentSelection)
        if (shape && shape.w > 10 / ctx.zoom && shape.h > 10 / ctx.zoom) {
            if (ctx.editingShapeId && ctx.tool === ctx.currentSelection.type) {
                ctx.actions.setMarksWithSectionWidths((prev: any[]) => prev.map((r) => (
                    r.id === ctx.editingShapeId ? { ...r, ...shape } : r
                )))
            } else {
                const newMark = rectangleMark.returnNewDrawableMark(ctx.currentSelection)
                if (newMark) {
                    ctx.actions.setMarksWithSectionWidths((prev: any[]) => [...prev, newMark])
                    ctx.actions.setSelectedMarkId(newMark.id)
                }
            }
        }

        ctx.actions.setCurrentSelection(null)
        return true
    },

    onKeyDown(ctx: ToolKeyDownContext) {
        if (ctx.e.key === 'Enter') {
            if (ctx.state.editingShapeId) {
                ctx.e.preventDefault()
                ctx.actions.setEditingShapeId(null)
                ctx.actions.setShapeBackup(null)
                ctx.actions.setTool('select')
                return true
            }
            return false
        }

        if (ctx.e.key === 'Escape' && ctx.state.editingShapeId) {
            ctx.e.preventDefault()
            ctx.actions.setMarksWithSectionWidths((prev: any[]) => prev.map((r) => (
                r.id === ctx.state.shapeBackup?.id ? ctx.state.shapeBackup : r
            )))
            ctx.actions.setEditingShapeId(null)
            ctx.actions.setShapeBackup(null)
            ctx.actions.setTool('select')
            return true
        }

        return false
    },

    renderToolbarExtras: renderDrawableToolbarExtras,
}
