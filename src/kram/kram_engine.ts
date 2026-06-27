import { UIController } from '../ui/ui_controller';
import { UIStateStore } from '../ui/ui_state_store';
import { SlotHistoryEntry, KramTrigger, KramAction } from './kram_types';
import { kramRules } from './kram_rules';

export class KramEngine {
    private history: Record<string, SlotHistoryEntry[]> = {};
    private store: UIStateStore;
    private rawController: UIController;
    private onHomeCallback?: () => void;

    constructor(controller: UIController, store: UIStateStore, onHomeCallback?: () => void) {
        this.rawController = controller;
        this.store = store;
        this.onHomeCallback = onHomeCallback;
    }

    public getHistory(slotId: string): SlotHistoryEntry[] {
        if (!this.history[slotId]) {
            this.history[slotId] = [];
        }
        return this.history[slotId];
    }

    public pushHistory(slotId: string, entry: SlotHistoryEntry) {
        const stack = this.getHistory(slotId);
        stack.push(entry);
    }

    public popHistory(slotId: string): SlotHistoryEntry | undefined {
        const stack = this.getHistory(slotId);
        return stack.pop();
    }

    public truncateHistory(slotId: string, toIndex: number) {
        const stack = this.getHistory(slotId);
        this.history[slotId] = stack.slice(0, toIndex);
    }

    public executeActions(actions: KramAction[]) {
        for (const action of actions) {
            switch (action.type) {
                case 'openContentInSlot': {
                    const { slotId, contentType, contentId, suppressHistory } = action.payload;
                    const state = this.store.getState();
                    const slot = state.slots[slotId];
                    if (!suppressHistory && slot && slot.contentId && slot.contentType) {
                        if (slot.contentId !== contentId || slot.contentType !== contentType) {
                            this.pushHistory(slotId, {
                                contentId: slot.contentId,
                                contentType: slot.contentType,
                                slotType: slot.slotType ?? 'verticalPane',
                                zoom: slot.zoom,
                                tool: slot.tool,
                                scrollTop: slot.scrollTop,
                                selectedMarkId: slot.selectedMarkId
                            });
                        }
                    }
                    this.rawController.onContentChange(slotId, contentId, contentType);
                    break;
                }
                case 'clearSelection': {
                    const { slotId } = action.payload;
                    this.rawController.setSelectedMarkId(null, slotId);
                    break;
                }
                case 'clearContent': {
                    const { slotId } = action.payload;
                    const state = this.store.getState();
                    const slot = state.slots[slotId];
                    if (slot) {
                        this.store.setState({
                            slots: {
                                ...state.slots,
                                [slotId]: {
                                    ...slot,
                                    contentId: '',
                                    contentType: '',
                                }
                            }
                        });
                    }
                    break;
                }
                case 'showHomescreen': {
                    if (this.onHomeCallback) {
                        this.onHomeCallback();
                    }
                    break;
                }
                case 'setTool': {
                    const { slotId, tool } = action.payload;
                    this.rawController.setTool(tool, slotId);
                    break;
                }
                case 'truncateHistory': {
                    const { slotId, toIndex } = action.payload;
                    this.truncateHistory(slotId, toIndex);
                    break;
                }
            }
        }
    }

    public createProxy(): UIController {
        const self = this;
        return new Proxy(this.rawController, {
            get(target, prop, receiver) {
                if (prop === 'closeSlot') {
                    return (slotId: string) => {
                        const state = self.store.getState();
                        const slotsState: any = {};
                        for (const [id, s] of Object.entries(state.slots)) {
                            slotsState[id] = {
                                contentId: s.contentId,
                                contentType: s.contentType,
                                selectedMarkId: s.selectedMarkId,
                                marks: s.marks
                            };
                        }

                        const actions = kramRules.evaluate('onCloseSlot', {
                            slotId,
                            args: [],
                            slotsState,
                            history: self.history
                        });

                        if (actions) {
                            self.executeActions(actions);
                        } else {
                            target.closeSlot(slotId);
                        }
                    };
                }

                if (prop === 'setSelectedMarkId') {
                    return (selectedMarkId: string | null, slotId?: string) => {
                        const targetSlot = slotId || self.store.getState().activeSlot;
                        const state = self.store.getState();
                        const slotsState: any = {};
                        for (const [id, s] of Object.entries(state.slots)) {
                            slotsState[id] = {
                                contentId: s.contentId,
                                contentType: s.contentType,
                                selectedMarkId: s.selectedMarkId,
                                marks: s.marks
                            };
                        }

                        const actions = kramRules.evaluate('onMarkActivate', {
                            slotId: targetSlot,
                            args: [selectedMarkId],
                            slotsState,
                            history: self.history
                        });

                        if (actions) {
                            self.executeActions(actions);
                        }
                        
                        target.setSelectedMarkId(selectedMarkId, targetSlot);
                    };
                }

                if (prop === 'onContentChange') {
                    return async (slotId: string, contentId: string, contentType: string) => {
                        const state = self.store.getState();
                        const slot = state.slots[slotId];
                        
                        if (slot && slot.contentId && slot.contentType) {
                            if (slot.contentId !== contentId || slot.contentType !== contentType) {
                                self.pushHistory(slotId, {
                                    contentId: slot.contentId,
                                    contentType: slot.contentType,
                                    slotType: slot.slotType ?? 'verticalPane',
                                    zoom: slot.zoom,
                                    tool: slot.tool,
                                    scrollTop: slot.scrollTop,
                                    selectedMarkId: slot.selectedMarkId
                                });
                            }
                        }

                        const slotsState: any = {};
                        for (const [id, s] of Object.entries(state.slots)) {
                            slotsState[id] = {
                                contentId: s.contentId,
                                contentType: s.contentType,
                                selectedMarkId: s.selectedMarkId,
                                marks: s.marks
                            };
                        }

                        const actions = kramRules.evaluate('onContentChange', {
                            slotId,
                            args: [contentId, contentType],
                            slotsState,
                            history: self.history
                        });

                        if (actions) {
                            self.executeActions(actions);
                        }

                        return target.onContentChange(slotId, contentId, contentType);
                    };
                }

                if (prop === 'setTool') {
                    return (tool: string, slotId?: string) => {
                        const targetSlot = slotId || self.store.getState().activeSlot;
                        const state = self.store.getState();
                        const slotsState: any = {};
                        for (const [id, s] of Object.entries(state.slots)) {
                            slotsState[id] = {
                                contentId: s.contentId,
                                contentType: s.contentType,
                                selectedMarkId: s.selectedMarkId,
                                marks: s.marks
                            };
                        }

                        const actions = kramRules.evaluate('onToolSelected', {
                            slotId: targetSlot,
                            args: [tool],
                            slotsState,
                            history: self.history
                        });

                        if (actions) {
                            self.executeActions(actions);
                        } else {
                            target.setTool(tool, targetSlot);
                        }
                    };
                }
                if (prop === 'setSlotState') {
                    return (slotId: string, key: string, value: any) => {
                        if (key === 'tool') {
                            return receiver.setTool(value, slotId);
                        }
                        return target.setSlotState(slotId, key, value);
                    };
                }

                return Reflect.get(target, prop, receiver);
            }
        });
    }
}
