import { ToolType } from "../../../../../domain_models/tool_models"
import { lassoMark } from "../../../marks/lasso_mark"
import { lassoCursor } from "../../../tool_cursors"
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

    onActivate({ actions }) {
        resetDrawableToolState(actions)
    },

    onPointerDown({ e, coords, actions }) {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        actions.setCurrentSelection(lassoMark.initiateShape(coords))
        return true
    },

    onPointerMove({ coords, state, actions }) {
        if (!state.currentSelection || state.currentSelection.type !== 'lasso') return false
        actions.setCurrentSelection(
            lassoMark.updateSelection?.(state.currentSelection, coords, {
                minPointDistance: 2 / state.zoom,
            }) ?? state.currentSelection
        )
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
