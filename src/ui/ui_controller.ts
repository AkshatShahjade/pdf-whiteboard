import { UIStateStore, ToastState } from './ui_state_store';
import { inputAPI, outputAPI } from '../atma/singletons';
import { getContentDomainType, createDefaultSlotState } from '../atma/capabilities_registry/content_domain_registry';

/**
 * UIController - Interface encapsulating all low-frequency UI state mutations.
 */
export interface UIController {
    setZoom: (zoom: number, slotId?: string) => void;
    setLeftPct: (pct: number) => void;
    setCurrentPage: (currentPage: number, slotId?: string) => void;
    setPageInput: (pageInput: string, slotId?: string) => void;
    setTool: (tool: string, slotId?: string) => void;
    setSelectedMarkId: (selectedMarkId: string | null, slotId?: string) => void;
    setActiveSlot: (activeSlot: string) => void;
    setEditingShapeId: (editingShapeId: string | null, slotId?: string) => void;
    setShapeBackup: (shapeBackup: any, slotId?: string) => void;
    setEditingSectionId: (editingSectionId: string | null, slotId?: string) => void;
    setSectionTarget: (sectionTarget: 'start' | 'end', slotId?: string) => void;
    showToast: (msg: string, type?: ToastState['type']) => void;
    clearToast: () => void;
    saveWhiteboardSnapshot: (markId: string, snapshot: any, slotId?: string) => void;
    setSlotState: (slotId: string, key: string, val: any) => void;
    setSlotStates: (slotId: string, patch: Record<string, any>) => void;
    connect: () => () => void;
}

/**
 * Factory function to create a new UIController instance operating on a UIStateStore.
 */
export function createUIController(store: UIStateStore): UIController {
    return {
        // ─── UI Actions (Write/Command Path Delegates) ────────────────────────────
        setZoom: (zoom, slotId) => {
            inputAPI.updateZoom(slotId || store.getState().activeSlot, zoom);
        },
        setLeftPct: (leftPct) => {
            inputAPI.updateSplitter(leftPct);
        },
        setCurrentPage: (currentPage, slotId) => {
            const target = slotId || store.getState().activeSlot;
            const state = store.getState();
            if (state.slots[target]?.currentPage === currentPage) return;
            store.setState({
                slots: { ...state.slots, [target]: { ...state.slots[target], currentPage, pageInput: String(currentPage) } }
            });
        },
        setPageInput: (pageInput, slotId) => {
            const target = slotId || store.getState().activeSlot;
            const state = store.getState();
            if (state.slots[target]?.pageInput === pageInput) return;
            store.setState({
                slots: { ...state.slots, [target]: { ...state.slots[target], pageInput } }
            });
        },
        setTool: (tool, slotId) => {
            inputAPI.updateTool(slotId || store.getState().activeSlot, tool);
        },
        setSelectedMarkId: (selectedMarkId, slotId) => {
            inputAPI.selectMark(slotId || store.getState().activeSlot, selectedMarkId);
        },
        setActiveSlot: (activeSlot) => {
            store.setState({ activeSlot });
        },
        setEditingShapeId: (editingShapeId, slotId) => {
            const target = slotId || store.getState().activeSlot;
            const state = store.getState();
            store.setState({
                slots: { ...state.slots, [target]: { ...state.slots[target], editingShapeId } }
            });
        },
        setShapeBackup: (shapeBackup, slotId) => {
            const target = slotId || store.getState().activeSlot;
            const state = store.getState();
            store.setState({
                slots: { ...state.slots, [target]: { ...state.slots[target], shapeBackup } }
            });
        },
        setEditingSectionId: (editingSectionId, slotId) => {
            const target = slotId || store.getState().activeSlot;
            const state = store.getState();
            store.setState({
                slots: { ...state.slots, [target]: { ...state.slots[target], editingSectionId } }
            });
        },
        setSectionTarget: (sectionTarget, slotId) => {
            const target = slotId || store.getState().activeSlot;
            const state = store.getState();
            store.setState({
                slots: { ...state.slots, [target]: { ...state.slots[target], sectionTarget } }
            });
        },
        showToast: (msg, type = 'info') => {
            store.setState({
                toast: { msg, type },
            });
        },
        clearToast: () => {
            store.setState({ toast: null });
        },
        saveWhiteboardSnapshot: (markId, snapshot, slotId) => {
            inputAPI.saveWhiteboardSnapshot(slotId || store.getState().activeSlot, markId, snapshot);
        },
        setSlotState: (slotId, key, val) => {
            const slot = store.getState().slots[slotId];
            if (!slot) return;
            try {
                const domain = getContentDomainType(slot.contentType);
                const schema = domain.stateVariables?.find(v => v.name === key);
                if (schema && schema.scope === 'app') {
                    inputAPI.updateSlotState(slotId, key, val);
                } else {
                    const state = store.getState();
                    store.setState({
                        slots: {
                            ...state.slots,
                            [slotId]: {
                                ...state.slots[slotId],
                                [key]: val
                            }
                        }
                    });
                }
            } catch (err) {
                const state = store.getState();
                store.setState({
                    slots: {
                        ...state.slots,
                        [slotId]: {
                            ...state.slots[slotId],
                            [key]: val
                        }
                    }
                });
            }
        },
        setSlotStates: (slotId, patch) => {
            const slot = store.getState().slots[slotId];
            const contentId = patch.contentId ?? slot?.contentId ?? '';
            const contentType = patch.contentType ?? slot?.contentType ?? '';
            
            let baseState = slot;
            if (!baseState) {
                if (contentType) {
                    try {
                        baseState = createDefaultSlotState(contentId, contentType, patch.slotType ?? slot?.slotType ?? 'verticalPane', 'ui');
                    } catch (err) {
                        baseState = { contentId, contentType, marks: new Map() };
                    }
                } else {
                    return; // No slot state and no contentType specified to create it
                }
            }

            const appPatch: Record<string, any> = {};
            const uiPatch: Record<string, any> = {};

            for (const [key, val] of Object.entries(patch)) {
                try {
                    const domain = getContentDomainType(contentType);
                    const schema = domain.stateVariables?.find(v => v.name === key);
                    if (schema && schema.scope === 'app') {
                        appPatch[key] = val;
                    } else {
                        uiPatch[key] = val;
                    }
                } catch (err) {
                    uiPatch[key] = val;
                }
            }

            for (const [key, val] of Object.entries(appPatch)) {
                inputAPI.updateSlotState(slotId, key, val);
            }

            if (Object.keys(uiPatch).length > 0 || !slot) {
                const state = store.getState();
                store.setState({
                    slots: {
                        ...state.slots,
                        [slotId]: {
                            ...baseState,
                            ...uiPatch
                        }
                    }
                });
            }
        },

        // ─── OutputAPI Event Subscriptions (Read/Event Path) ──────────────────────
        connect: () => {
            const subs = [
                outputAPI.subscribe('SESSION_LOADED', (session: any) => {
                    const newSlots: Record<string, any> = {};
                    for (const [slotId, slotSession] of Object.entries(session.slots)) {
                        const defaults = createDefaultSlotState((slotSession as any).contentId, (slotSession as any).contentType, (slotSession as any).slotType ?? 'verticalPane', 'ui');
                        newSlots[slotId] = {
                            ...defaults,
                            ...slotSession,
                            marks: new Map((slotSession as any).marks.map((m: any) => [m.id, m])),
                        };
                    }

                    store.setState({
                        leftPct: session.leftPct,
                        slots: newSlots
                    });
                }),
                outputAPI.subscribe('APPSTATE_MUTATED', (patch: any) => {
                    const currentState = store.getState();
                    if (patch.slots) {
                        const newSlots = { ...currentState.slots };
                        for (const [slotId, slotPatch] of Object.entries(patch.slots)) {
                           newSlots[slotId] = { ...(newSlots[slotId] || {}), ...(slotPatch as any) };
                        }
                        store.setState({ ...patch, slots: newSlots });
                    } else {
                        store.setState(patch as Partial<UIState>);
                    }
                }),
                outputAPI.subscribe('MARK_ADDED', (mark: any) => {
                    // Requires activeSlot because MARK_ADDED output doesn't broadcast slotId natively.
                    // To do it perfectly, MARK_ADDED could contain slotId.
                    const state = store.getState();
                    const activeSlot = state.activeSlot;
                    if (state.slots[activeSlot]) {
                        const newMarks = new Map(state.slots[activeSlot].marks);
                        newMarks.set(mark.id, mark);
                        store.setState({
                            slots: { ...state.slots, [activeSlot]: { ...state.slots[activeSlot], marks: newMarks } }
                        });
                    }
                }),
                outputAPI.subscribe('MARK_UPDATED', (mark: any) => {
                    const state = store.getState();
                    const activeSlot = state.activeSlot;
                    if (state.slots[activeSlot]) {
                        const newMarks = new Map(state.slots[activeSlot].marks);
                        newMarks.set(mark.id, mark);
                        store.setState({
                            slots: { ...state.slots, [activeSlot]: { ...state.slots[activeSlot], marks: newMarks } }
                        });
                    }
                }),
                outputAPI.subscribe('MARK_DELETED', (payload: any) => {
                    const state = store.getState();
                    const activeSlot = state.activeSlot;
                    if (state.slots[activeSlot]) {
                        const newMarks = new Map(state.slots[activeSlot].marks);
                        newMarks.delete(payload.markId);
                        
                        let newSelectedId = state.slots[activeSlot].selectedMarkId;
                        if (newSelectedId === payload.markId) {
                            newSelectedId = null;
                        }

                        store.setState({
                            slots: { ...state.slots, [activeSlot]: { ...state.slots[activeSlot], marks: newMarks, selectedMarkId: newSelectedId } }
                        });
                    }
                })
            ];

            return () => {
                subs.forEach(sub => sub.unsubscribe());
            };
        }
    };
}
