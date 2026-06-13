import { ToolType } from "../../../../../domain_models/tool_models"
import { DEFAULT_SECTION_WIDTH } from "../../../../../domain_models/mark_model"
import { getSectionCursor } from "../../../tool_cursors"
import { renderSectionToolbarExtras } from "../../../tool_toolbar_extras"

function resetSectionToolState(actions: {
    setCurrentSelection: (next: any) => void
    setSectionTarget: (next: "start" | "end") => void
    setEditingShapeId: (next: string | null) => void
    setShapeBackup: (next: any) => void
}) {
    actions.setCurrentSelection(null)
    actions.setSectionTarget('start')
    actions.setEditingShapeId(null)
    actions.setShapeBackup(null)
}

function commitSectionSelection(ctx: {
    currentSelection: any
    editingSectionId: string | null
    actions: {
        setTool: (next: string) => void
        setMarksWithSectionWidths: (next: any) => void
        setSelectedMarkId: (next: string | null) => void
        setEditingSectionId: (next: string | null) => void
    }
}) {
    if (!ctx.currentSelection || ctx.currentSelection.type !== 'section') return false
    if (ctx.currentSelection.start === null || ctx.currentSelection.end === null) return false

    const y1 = Math.min(ctx.currentSelection.start, ctx.currentSelection.end)
    const y2 = Math.max(ctx.currentSelection.start, ctx.currentSelection.end)

    if (ctx.editingSectionId) {
        ctx.actions.setMarksWithSectionWidths((prev: any[]) => prev.map((r) => (
            r.id === ctx.editingSectionId ? { ...r, y: y1, h: y2 - y1 } : r
        )))
        ctx.actions.setSelectedMarkId(ctx.editingSectionId)
        ctx.actions.setEditingSectionId(null)
    } else {
        const newId = `reg_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        ctx.actions.setMarksWithSectionWidths((prev: any[]) => [
            ...prev,
            { id: newId, type: 'section', x: 0, y: y1, w: DEFAULT_SECTION_WIDTH, h: y2 - y1 },
        ])
        ctx.actions.setSelectedMarkId(newId)
    }
    ctx.actions.setTool('select')
    return true
}

export const sectionTool: ToolType = {
    id: "section",
    content: 'pdf',
    category: 'mark-spatial',
    isDrawable: false,
    createsSelections : true,
    hotkey: 's',
    activationMode: 'toggle',
    cursor: ({ sectionTarget }) => getSectionCursor(sectionTarget ?? 'start'),

    createNullSelection() {
        return {type:"section", start: null, end: null}
    },

    onActivate({ state, actions }) {
        if (state.currentSelection?.type !== 'section') {
            actions.setCurrentSelection(sectionTool.createNullSelection?.())
        }
        actions.setEditingShapeId(null)
        actions.setShapeBackup(null)
    },

    onPointerDown({ e, coords, state, actions }) {
        if (!state.sectionTarget) return false

        e.currentTarget.setPointerCapture?.(e.pointerId)

        const nextSelection = state.currentSelection?.type === 'section'
            ? state.currentSelection
            : sectionTool.createNullSelection?.()

        const updatedSelection = {
            ...(nextSelection ?? { type: 'section', start: null, end: null }),
            [state.sectionTarget]: coords.y,
        }

        actions.setCurrentSelection(updatedSelection)

        if (state.sectionTarget === 'start' && updatedSelection.end === null) {
            actions.setSectionTarget('end')
        } else if (state.sectionTarget === 'end' && updatedSelection.start === null) {
            actions.setSectionTarget('start')
        }

        return true
    },

    onKeyDown({ e, state, actions }) {
        if (e.key === 'Enter') {
            if (commitSectionSelection({
                currentSelection: state.currentSelection,
                editingSectionId: state.editingSectionId,
                actions: {
                    setTool: actions.setTool,
                    setMarksWithSectionWidths: actions.setMarksWithSectionWidths,
                    setSelectedMarkId: actions.setSelectedMarkId,
                    setEditingSectionId: actions.setEditingSectionId,
                },
            })) {
                e.preventDefault()
                return true
            }
            return false
        }

        if (e.key === 'Escape' && (state.editingSectionId || state.currentSelection?.type === 'section')) {
            e.preventDefault()
            resetSectionToolState(actions)
            actions.setEditingSectionId(null)
            actions.setTool('select')
            return true
        }

        return false
    },

    renderToolbarExtras: renderSectionToolbarExtras,
}
