import type {
    ToolActivateContext,
    ToolRendererType,
} from "../../../../capabilty_registry/pdf/tool_pdf_registry"

export const shortcutTool: ToolRendererType = {
    id: {
        id: "shortcut",
        scope: "pdf",
        category: "system"
    },
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
