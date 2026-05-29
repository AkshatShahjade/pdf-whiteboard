import { ToolType } from "../../../../../domain_models/tool_models"
import { getSectionCursor } from "../../../tool_cursors"
import { renderSectionToolbarExtras } from "../../../tool_toolbar_extras"

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

    renderToolbarExtras: renderSectionToolbarExtras,
}
