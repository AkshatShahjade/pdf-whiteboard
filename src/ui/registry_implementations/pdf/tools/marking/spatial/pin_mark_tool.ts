import type {
    ToolActivateContext,
    ToolKeyDownContext,
    ToolPointerDownContext,
    ToolPointerMoveContext,
    ToolPointerUpContext,
    PDFToolRendererType,
} from "../../../../../renderer_registry/pdf/tool_renderer_registry"
import { getMarkRendererType } from "../../../../../renderer_registry/pdf/mark_renderer_registry"
import { pinCursor } from "../../../tool_cursors"
import { pinMark } from "../../../marks/pin_mark"
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

export const pinTool: PDFToolRendererType = {
    id: {
        id: "pin",
        scope: "pdf",
        category: "mark-spatial"
    },
    isDrawable: true,
    createsSelections: true,
    label: 'Pin',
    icon: '📍',
    order: 4,
    hotkey: 'p',
    activationMode: 'toggle',
    cursor: pinCursor,

    createNullSelection() {
        return { type: "pin", x: null, y: null }
    },

    onActivate(ctx: ToolActivateContext) {
        resetDrawableToolState(ctx.actions)
    },

    onPointerDown(ctx: ToolPointerDownContext) {
        ctx.e.currentTarget.setPointerCapture?.(ctx.e.pointerId)
        ctx.actions.setSelectedMarkId(null)
        ctx.actions.setCurrentSelection(pinMark.initiateShape!(ctx.coords))
        return true
    },

    onPointerMove(ctx: ToolPointerMoveContext) {
        if (!ctx.state.currentSelection || ctx.state.currentSelection.type !== 'pin') return false
        // Pin is just a point, it doesn't really update on move usually, but we allow dragging it while placing
        ctx.actions.setCurrentSelection(
            pinMark.updateSelection?.(ctx.state.currentSelection, ctx.coords, { zoom: ctx.state.zoom }) ?? ctx.state.currentSelection
        )
        return true
    },

    onPointerUp(ctx: ToolPointerUpContext) {
        if (!ctx.currentSelection || ctx.currentSelection.type !== 'pin') return false

        const shape = pinMark.returnDrawableMarkWithoutId!(ctx.currentSelection)
        if (shape) {
            if (ctx.editingShapeId && ctx.tool === ctx.currentSelection.type) {
                const updatedMark = { id: ctx.editingShapeId, ...shape }
                // no validate function for pin currently, assume valid
                ctx.actions.setMarksWithSectionWidths((prev: any[]) => prev.map((r) => (
                    r.id === ctx.editingShapeId ? updatedMark : r
                )))
            } else {
                const newMark = pinMark.returnNewDrawableMark!(ctx.currentSelection)
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
