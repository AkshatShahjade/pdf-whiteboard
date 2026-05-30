import { ToolType } from "../../../../domain_models/tool_models"

export const shortcutTool: ToolType = {
    id: "shortcut",
    content: 'pdf',
    category: 'system',
    isDrawable: false,
    createsSelections : false,
    hotkey: "",
    activationMode: 'set',

    onActivate({ actions }) {
        actions.setCurrentSelection(null)
        actions.setSectionTarget('start')
        actions.setEditingSectionId(null)
        actions.setEditingShapeId(null)
        actions.setShapeBackup(null)
    },



}