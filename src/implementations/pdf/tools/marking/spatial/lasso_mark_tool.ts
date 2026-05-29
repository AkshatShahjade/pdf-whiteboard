import { ToolType } from "../../../../../domain_models/tool_models"
import { lassoMark } from "../../../marks/lasso_mark"
import { lassoCursor } from "../../../tool_cursors"
import { renderDrawableToolbarExtras } from "../../../tool_toolbar_extras"

// Do I like the direct call to lassoMark? or do I want it to pss through getMarkType("lasso")

export const lassoTool: ToolType = {
    id: "lasso",
    content: 'pdf',
    category: 'mark-spatial',
    isDrawable: true,
    createsSelections : true,
    hotkey: 'c',
    activationMode: 'toggle',
    cursor: lassoCursor,

    createNullSelection() {
        return {type:"lasso", points: null}
    },

    onPointerDown({ e, coords, actions }) {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        actions.setCurrentSelection(lassoMark.initiateShape(coords))
        return true
    },

    onPointerUp({ currentSelection, editingShapeId, tool, zoom, actions }) {
        if (!currentSelection || currentSelection.type !== 'lasso') return false

        const shape = lassoMark.returnDrawableMarkWithoutId(currentSelection)
        if (shape && shape.w > 10 / zoom && shape.h > 10 / zoom) {
            if (editingShapeId && tool === currentSelection.type) {
                actions.setMarksWithSectionWidths((prev: any[]) => prev.map((r) => (
                    r.id === editingShapeId ? { ...r, ...shape } : r
                )))
            } else {
                const newMark = lassoMark.returnNewDrawableMark(currentSelection)
                if (newMark) {
                    actions.setMarksWithSectionWidths((prev: any[]) => [...prev, newMark])
                    actions.setSelectedMarkId(newMark.id)
                }
            }
        }

        actions.setCurrentSelection(null)
        return true
    },

    renderToolbarExtras: renderDrawableToolbarExtras,
}
