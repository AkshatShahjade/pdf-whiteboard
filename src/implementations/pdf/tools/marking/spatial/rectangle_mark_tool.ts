import { ToolType } from "../../../../../domain_models/tool_models"
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

    onActivate({ actions }) {
        resetDrawableToolState(actions)
    },

    onPointerDown({ e, coords, actions }) {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        actions.setCurrentSelection(rectangleMark.initiateShape(coords))
        return true
    },

    onPointerMove({ coords, state, actions }) {
        if (!state.currentSelection || state.currentSelection.type !== 'rect') return false
        actions.setCurrentSelection(
            rectangleMark.updateSelection?.(state.currentSelection, coords) ?? state.currentSelection
        )
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

    onKeyDown({ e, state, actions }) {
        if (e.key === 'Enter') {
            if (state.editingShapeId) {
                e.preventDefault()
                actions.setEditingShapeId(null)
                actions.setShapeBackup(null)
                actions.setTool('select')
                return true
            }
            return false
        }

        if (e.key === 'Escape' && state.editingShapeId) {
            e.preventDefault()
            actions.setMarksWithSectionWidths((prev: any[]) => prev.map((r) => (
                r.id === state.shapeBackup?.id ? state.shapeBackup : r
            )))
            actions.setEditingShapeId(null)
            actions.setShapeBackup(null)
            actions.setTool('select')
            return true
        }

        return false
    },

    renderToolbarExtras: renderDrawableToolbarExtras,
}
