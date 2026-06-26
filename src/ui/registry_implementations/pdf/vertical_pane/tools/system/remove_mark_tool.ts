import type {
    ToolActivateContext,
    ToolBorderClickContext,
    PDFToolRendererType,
} from "../../../../../renderer_registry/pdf/vertical_pane/tool_renderer_registry"
import { deleteCursor } from "../../../tool_cursors"

export const removeTool: PDFToolRendererType = {
    id: {
        id: "remove",
        scope: "pdf",
        category: "system"
    },
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
