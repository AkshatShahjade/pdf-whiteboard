import { KramTrigger, KramAction, SlotHistoryEntry } from './kram_types';

export interface KramRuleContext {
    slotId: string;
    args: any[];
    slotsState: Record<string, {
        contentId: string;
        contentType: string;
        selectedMarkId: string | null;
        marks: Map<string, any> | any;
    }>;
    history: Record<string, SlotHistoryEntry[]>;
}

export const kramRules = {
    evaluate(trigger: KramTrigger, ctx: KramRuleContext): KramAction[] | null {
        const { slotId, args, slotsState, history } = ctx;
        const otherSlotId = slotId === 'left' ? 'right' : 'left';

        switch (trigger) {
            case 'onMarkActivate': {
                const markId = args[0] as string | null;
                const slotState = slotsState[slotId];
                if (!slotState) return null;

                // Case A: Cleared selection
                if (!markId) {
                    const otherSlot = slotsState[otherSlotId];
                    // If other slot is showing a whiteboard that matches the mark we just deselected, close/clear it
                    if (otherSlot?.contentType === 'whiteboard' && slotState.selectedMarkId === otherSlot.contentId) {
                        const closeActions = kramRules.evaluate('onCloseSlot', {
                            slotId: otherSlotId,
                            args: [],
                            slotsState,
                            history
                        });
                        return [
                            { type: 'clearSelection', payload: { slotId } },
                            ...(closeActions || [])
                        ];
                    }
                    return null;
                }

                // Case B: Activated a mark
                let mark: any = null;
                if (slotState.marks instanceof Map) {
                    mark = slotState.marks.get(markId);
                } else if (Array.isArray(slotState.marks)) {
                    mark = slotState.marks.find((m: any) => m.id === markId);
                }

                if (mark) {
                    return [
                        { type: 'openContentInSlot', payload: { slotId: otherSlotId, contentType: 'whiteboard', contentId: markId } }
                    ];
                }
                return null;
            }

            case 'onCloseSlot': {
                return null;
            }

            case 'onContentChange': {
                // Return null by default, as the content change triggers are handled by the controller/history layers.
                return null;
            }

            case 'onToolSelected': {
                const tool = args[0] as string;
                // If content_selector_tool is selected, open content selector in opposite slot
                if (tool === 'content_selector_tool') {
                    return [
                        { type: 'openContentInSlot', payload: { slotId: otherSlotId, contentType: 'content_selector', contentId: 'content_selector_global' } },
                        { type: 'setTool', payload: { slotId, tool: 'select' } } // Reset source tool to select
                    ];
                }
                return null;
            }

            default:
                return null;
        }
    }
};
