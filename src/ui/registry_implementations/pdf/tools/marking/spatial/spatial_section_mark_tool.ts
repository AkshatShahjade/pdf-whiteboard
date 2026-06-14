import type {
    ToolActivateContext,
    ToolKeyDownContext,
    ToolPointerDownContext,
    ToolType,
} from "../../../../../../shared_doman_models_and_dtos/tool_models"
import { DEFAULT_SECTION_WIDTH } from "../../../../../../shared_doman_models_and_dtos/mark_model"
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

    onActivate(ctx: ToolActivateContext) {
        if (ctx.state.currentSelection?.type !== 'section') {
            ctx.actions.setCurrentSelection(sectionTool.createNullSelection?.())
        }
        ctx.actions.setEditingShapeId(null)
        ctx.actions.setShapeBackup(null)
    },

    onPointerDown(ctx: ToolPointerDownContext) {
        if (!ctx.state.sectionTarget) return false

        ctx.e.currentTarget.setPointerCapture?.(ctx.e.pointerId)

        const nextSelection = ctx.state.currentSelection?.type === 'section'
            ? ctx.state.currentSelection
            : sectionTool.createNullSelection?.()

        const updatedSelection = {
            ...(nextSelection ?? { type: 'section', start: null, end: null }),
            [ctx.state.sectionTarget]: ctx.coords.y,
        }

        ctx.actions.setCurrentSelection(updatedSelection)

        if (ctx.state.sectionTarget === 'start' && updatedSelection.end === null) {
            ctx.actions.setSectionTarget('end')
        } else if (ctx.state.sectionTarget === 'end' && updatedSelection.start === null) {
            ctx.actions.setSectionTarget('start')
        }

        return true
    },

    onKeyDown(ctx: ToolKeyDownContext) {
        if (ctx.e.key === 'Enter') {
            if (commitSectionSelection({
                currentSelection: ctx.state.currentSelection,
                editingSectionId: ctx.state.editingSectionId,
                actions: {
                    setTool: ctx.actions.setTool,
                    setMarksWithSectionWidths: ctx.actions.setMarksWithSectionWidths,
                    setSelectedMarkId: ctx.actions.setSelectedMarkId,
                    setEditingSectionId: ctx.actions.setEditingSectionId,
                },
            })) {
                ctx.e.preventDefault()
                return true
            }
            return false
        }

        if (ctx.e.key === 'Escape' && (ctx.state.editingSectionId || ctx.state.currentSelection?.type === 'section')) {
            ctx.e.preventDefault()
            resetSectionToolState(ctx.actions)
            ctx.actions.setEditingSectionId(null)
            ctx.actions.setTool('select')
            return true
        }

        return false
    },

    renderToolbarExtras: renderSectionToolbarExtras,
}
