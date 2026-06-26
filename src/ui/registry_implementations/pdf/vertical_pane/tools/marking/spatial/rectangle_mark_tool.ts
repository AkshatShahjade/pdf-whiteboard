import type {
    ToolActivateContext,
    ToolKeyDownContext,
    ToolPointerDownContext,
    ToolPointerMoveContext,
    ToolPointerUpContext,
    PDFToolRendererType,
} from "../../../../../../renderer_registry/pdf/vertical_pane/tool_renderer_registry"
import { getMarkRendererType } from "../../../../../../renderer_registry/pdf/vertical_pane/mark_renderer_registry"
import { rectCursor } from "../../../../tool_cursors"
import { rectangleMark } from "../../../marks/rectangle_mark"
import { renderDrawableToolbarExtras } from "../../../../tool_toolbar_extras"

function handleDrawingMove(e: React.MouseEvent, state: ToolPointerMoveContext['state'], actions: ToolPointerMoveContext['actions']) {
    const coords = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }
    const markRenderer = getMarkRendererType('rect')
    if (state.currentSelection && markRenderer.updateSelection) {
        actions.setCurrentSelection(markRenderer.updateSelection(state.currentSelection, coords, { zoom: state.zoom }))
    }
}

function handleDrawingEnd(state: ToolPointerUpContext, actions: ToolPointerUpContext['actions']) {
    actions.setCurrentSelection(null)
    actions.setEditingShapeId(null)
    actions.setShapeBackup(null)
}

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

export const rectTool: PDFToolRendererType = {
    id: {
        id: "rect",
        scope: "pdf",
        category: "mark-spatial"
    },
    isDrawable: true,
    createsSelections : true,
    label: 'Freeform',
    icon: '▭',
    order: 2,
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
        ctx.actions.setSelectedMarkId(null)
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
                const updatedMark = { id: ctx.editingShapeId, ...shape }
                const validation = rectangleMark.validate?.(updatedMark) ?? { isValid: true }
                if (validation.isValid) {
                    ctx.actions.setMarksWithSectionWidths((prev: any[]) => prev.map((r) => (
                        r.id === ctx.editingShapeId ? updatedMark : r
                    )))
                }
            } else {
                const newMark = rectangleMark.returnNewDrawableMark(ctx.currentSelection)
                if (newMark) {
                    const validation = rectangleMark.validate?.(newMark) ?? { isValid: true }
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
