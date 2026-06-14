import type {
    ToolActivateContext,
    ToolType,
} from "../../../../../shared_doman_models_and_dtos/tool_models"

export const shortcutTool: ToolType = {
    id: "shortcut",
    content: 'pdf',
    category: 'system',
    isDrawable: false,
    createsSelections : false,
    hotkey: "",
    activationMode: 'set',

    onActivate(ctx: ToolActivateContext) {
        ctx.actions.setCurrentSelection(null)
        ctx.actions.setSectionTarget('start')
        ctx.actions.setEditingSectionId(null)
        ctx.actions.setEditingShapeId(null)
        ctx.actions.setShapeBackup(null)
    },



}
