import { ToolType } from "../../../../domain_models/tool_models"

export const selectionTool: ToolType = {
    id: "select",
    content: 'pdf',
    category: 'system',
    isDrawable: false,
    createsSelections : false,
    hotkey: 'v',
    activationMode: 'set',

    onActivate({ actions }) {
        actions.setCurrentSelection(null)
        actions.setSectionTarget('start')
        actions.setEditingSectionId(null)
        actions.setEditingShapeId(null)
        actions.setShapeBackup(null)
    },

    onBorderClick({ regionId, actions }) {
        actions.clearShortcutUi()
        actions.selectRegion(regionId)
    },

}
