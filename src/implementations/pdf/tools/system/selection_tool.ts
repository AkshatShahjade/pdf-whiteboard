import { ToolType } from "../../../../domain_models/tool_models"

export const selectionTool: ToolType = {
    id: "select",
    content: 'pdf',
    category: 'system',
    isDrawable: false,
    createsSelections : false,
    hotkey: 'v',
    activationMode: 'set',

    onBorderClick({ regionId, actions }) {
        actions.clearGlobalToolUi()
        actions.selectRegion(regionId)
    },

}
