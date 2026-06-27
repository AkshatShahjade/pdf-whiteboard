import type {
    ToolActivateContext,
    PDFToolRendererType,
} from "../../../../renderer_registry/pdf/tool_renderer_registry"
import { shortcutCursor } from "../../tool_cursors"

export const shortcutTool: PDFToolRendererType = {
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
