import type {
    ToolActivateContext,
    ToolBorderClickContext,
    ToolType,
} from "../../../../../shared_doman_models_and_dtos/tool_models"
import { deleteCursor } from "../../tool_cursors"

export const removeTool: ToolType = {
    id: "remove",
    content: 'pdf',
    category: 'system',
    isDrawable: false,
    createsSelections : false,
    hotkey: 'x',
    activationMode: 'toggle',
    cursor: deleteCursor,

    onActivate(ctx: ToolActivateContext) {
        ctx.actions.setCurrentSelection(null)
        ctx.actions.setSectionTarget('start')
        ctx.actions.setEditingSectionId(null)
        ctx.actions.setEditingShapeId(null)
        ctx.actions.setShapeBackup(null)
    },

    async onBorderClick(ctx: ToolBorderClickContext) {
        const isConfirmed = await ctx.actions.confirmDelete()
        if (!isConfirmed) return

        ctx.actions.deleteRegion(ctx.regionId)
        if (ctx.selectedRegionId === ctx.regionId) {
            ctx.actions.selectRegion(null)
        }
    },

}
