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
                        return [
                            { type: 'clearSelection', payload: { slotId } },
                            { type: 'popHistory', payload: { slotId: otherSlotId } }
                        ];
                    }
                    return null;
                }

                // Case B: Activated a mark
                // Find the mark object
                let mark: any = null;
                if (slotState.marks instanceof Map) {
                    mark = slotState.marks.get(markId);
                } else if (Array.isArray(slotState.marks)) {
                    mark = slotState.marks.find((m: any) => m.id === markId);
                }

                if (mark && mark.type === 'whiteboard_link') {
                    return [
                        { type: 'openContentInSlot', payload: { slotId: otherSlotId, contentType: 'whiteboard', contentId: markId } }
                    ];
                }
                return null;
            }

            case 'onCloseSlot': {
                const actions: KramAction[] = [];
                const slotState = slotsState[slotId];
                if (!slotState) return null;

                // 1. Clear selection on the opposite slot if it pointed to this closed content
                const otherSlot = slotsState[otherSlotId];
                if (slotState.contentType === 'whiteboard' && otherSlot?.selectedMarkId === slotState.contentId) {
                    actions.push({ type: 'clearSelection', payload: { slotId: otherSlotId } });
                }

                // 2. Resolve what content to transition to based on history stack
                const stack = history[slotId] || [];
                let restoredEntry: SlotHistoryEntry | null = null;
                
                // Traverse stack backward to find the first non-system content
                for (let i = stack.length - 1; i >= 0; i--) {
                    const entry = stack[i];
                    if (entry.contentType !== 'content_selector') {
                        restoredEntry = entry;
                        // Truncate history to this point
                        break;
                    }
                }

                if (restoredEntry) {
                    actions.push({
                        type: 'openContentInSlot',
                        payload: {
                            slotId,
                            contentType: restoredEntry.contentType,
                            contentId: restoredEntry.contentId
                        }
                    });
                    // Restore saveable attributes
                    if (restoredEntry.tool) {
                        actions.push({ type: 'setTool', payload: { slotId, tool: restoredEntry.tool } });
                    }
                } else {
                    actions.push({ type: 'clearContent', payload: { slotId } });
                }

                // 3. If this was the last active slot, returning home is required
                const isLeftOpening = actions.some(a => a.type === 'openContentInSlot' && a.payload.slotId === 'left');
                const isRightOpening = actions.some(a => a.type === 'openContentInSlot' && a.payload.slotId === 'right');
                
                const nextLeftActive = slotId === 'left' ? isLeftOpening : (slotsState.left?.contentId && slotsState.left?.contentType);
                const nextRightActive = slotId === 'right' ? isRightOpening : (slotsState.right?.contentId && slotsState.right?.contentType);

                if (!nextLeftActive && !nextRightActive) {
                    actions.push({ type: 'showHomescreen' });
                }

                return actions;
            }

            case 'onSlotOpen': {
                // When we open content selector or other tools on slot, we don't block
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
