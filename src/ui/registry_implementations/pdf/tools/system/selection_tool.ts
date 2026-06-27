import type {
    ToolActivateContext,
    ToolBorderClickContext,
    ToolPointerDownContext,
    PDFToolRendererType,
} from "../../../../renderer_registry/pdf/tool_renderer_registry"
import { selectCursor } from "../../tool_cursors"

export const selectionTool: PDFToolRendererType = {
    id: {
        id: "select",
        scope: "pdf",
        category: "system"
    },
    isDrawable: false,
    createsSelections : false,
    label: 'Select',
    icon: '↖',
    order: 1,
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
