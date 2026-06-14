import type {
    ToolActivateContext,
    ToolBorderClickContext,
    ToolType,
} from "../../../../../shared_doman_models_and_dtos/tool_models"

export const selectionTool: ToolType = {
    id: "select",
    content: 'pdf',
    category: 'system',
    isDrawable: false,
    createsSelections : false,
    hotkey: 'v',
    activationMode: 'set',

    onActivate(ctx: ToolActivateContext) {
        ctx.actions.setCurrentSelection(null)
        ctx.actions.setSectionTarget('start')
        ctx.actions.setEditingSectionId(null)
        ctx.actions.setEditingShapeId(null)
        ctx.actions.setShapeBackup(null)
    },

    onBorderClick(ctx: ToolBorderClickContext) {
        ctx.actions.clearShortcutUi()
        ctx.actions.selectRegion(ctx.regionId)
    },

}
