import type { PDFToolRendererType } from "../../../../../renderer_registry/pdf/vertical_pane/tool_renderer_registry"

export const contentSelectorTool: PDFToolRendererType = {
    id: {
        id: "content_selector_tool",
        scope: "pdf",
        category: "system"
    },
    isDrawable: false,
    createsSelections: false,
    label: 'Search Library',
    icon: '🔍',
    order: 7,
    hotkey: "f",
    activationMode: 'set',

    onActivate(ctx) {
        ctx.actions.setSlotStates('side', {
            contentId: 'content_selector_global',
            contentType: 'content_selector',
            slotType: 'verticalPane'
        });
        ctx.actions.setTool('select');
    }
}
