import type { PDFToolRendererType } from "../../../../renderer_registry/pdf/tool_renderer_registry"

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
        const otherSlotId = (ctx as any).state?.slotId === 'left' ? 'right' : 'left';
        ctx.actions.setSlotStates(otherSlotId, {
            contentId: 'content_selector_global',
            contentType: 'content_selector',
            slotType: 'verticalPane'
        });
        ctx.actions.setTool('select');
    }
}
