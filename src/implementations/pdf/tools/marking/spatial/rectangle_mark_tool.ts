import { ToolType } from "../../../../../domain_models/tool_models"
import { rectangleMark } from "../../../marks/rectangle_mark"
import { renderDrawableToolbarExtras } from "../../../tool_toolbar_extras"

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

    onPointerDown({ e, coords, actions }) {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        actions.setCurrentSelection(rectangleMark.initiateShape(coords))
        return true
    },

    onPointerUp({ currentSelection, editingShapeId, tool, zoom, actions }) {
        if (!currentSelection || currentSelection.type !== 'rect') return false

        const shape = rectangleMark.returnDrawableMarkWithoutId(currentSelection)
        if (shape && shape.w > 10 / zoom && shape.h > 10 / zoom) {
            if (editingShapeId && tool === currentSelection.type) {
                actions.setMarksWithSectionWidths((prev: any[]) => prev.map((r) => (
                    r.id === editingShapeId ? { ...r, ...shape } : r
                )))
            } else {
                const newMark = rectangleMark.returnNewDrawableMark(currentSelection)
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
