import type {
    ToolActivateContext,
    ToolBorderClickContext,
    ToolRendererType,
    ToolPointerDownContext,
} from "../../../../capabilty_registry/pdf/tool_pdf_registry"

export const selectionTool: ToolRendererType = {
    id: {
        id: "select",
        scope: "pdf",
        category: "system"
    },
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

    onPointerDown(ctx: ToolPointerDownContext) {
        ctx.actions.setSelectedMarkId(null)
    },

    onBorderClick(ctx: ToolBorderClickContext) {
        ctx.actions.clearShortcutUi()
        ctx.actions.selectRegion(ctx.regionId)
    },

}
