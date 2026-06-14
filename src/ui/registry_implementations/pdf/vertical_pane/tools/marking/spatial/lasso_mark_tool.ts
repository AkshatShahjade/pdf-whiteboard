import type {
    ToolActivateContext,
    ToolKeyDownContext,
    ToolPointerDownContext,
    ToolPointerMoveContext,
    ToolPointerUpContext,
    ToolRendererType,
} from "../../../../../../renderer_registry/pdf/vertical_pane/tool_registry"
import { lassoMark } from "../../../marks/lasso_mark"
import { lassoCursor } from "../../../../tool_cursors"
import { renderDrawableToolbarExtras } from "../../../../tool_toolbar_extras"

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

export const lassoTool: ToolRendererType = {
    id: {
        id: "lasso",
        scope: "pdf",
        category: "mark-spatial"
    },
    isDrawable: true,
    createsSelections : true,
    hotkey: 'c',
    activationMode: 'toggle',
    cursor: lassoCursor,

    createNullSelection() {
        return {type:"lasso", points: null}
    },

    onActivate(ctx: ToolActivateContext) {
        resetDrawableToolState(ctx.actions)
    },

    onPointerDown(ctx: ToolPointerDownContext) {
        ctx.e.currentTarget.setPointerCapture?.(ctx.e.pointerId)
        ctx.actions.setSelectedMarkId(null)
        ctx.actions.setCurrentSelection(lassoMark.initiateShape(ctx.coords))
        return true
    },

    onPointerMove(ctx: ToolPointerMoveContext) {
        if (!ctx.state.currentSelection || ctx.state.currentSelection.type !== 'lasso') return false
        ctx.actions.setCurrentSelection(
            lassoMark.updateSelection?.(ctx.state.currentSelection, ctx.coords, {
                minPointDistance: 2 / ctx.state.zoom,
            }) ?? ctx.state.currentSelection
        )
        return true
    },

    onPointerUp(ctx: ToolPointerUpContext) {
        if (!ctx.currentSelection || ctx.currentSelection.type !== 'lasso') return false

        const shape = lassoMark.returnDrawableMarkWithoutId(ctx.currentSelection)
        if (shape && shape.w > 10 / ctx.zoom && shape.h > 10 / ctx.zoom) {
            if (ctx.editingShapeId && ctx.tool === ctx.currentSelection.type) {
                const updatedMark = { id: ctx.editingShapeId, ...shape }
                const validation = lassoMark.validate?.(updatedMark) ?? { isValid: true }
                if (validation.isValid) {
                    ctx.actions.setMarksWithSectionWidths((prev: any[]) => prev.map((r) => (
                        r.id === ctx.editingShapeId ? updatedMark : r
                    )))
                }
            } else {
                const newMark = lassoMark.returnNewDrawableMark(ctx.currentSelection)
                if (newMark) {
                    const validation = lassoMark.validate?.(newMark) ?? { isValid: true }
                    if (validation.isValid) {
                        ctx.actions.setMarksWithSectionWidths((prev: any[]) => [...prev, newMark])
                        ctx.actions.setSelectedMarkId(newMark.id)
                    }
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
