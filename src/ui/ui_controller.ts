import { UIStateStore, ToastState } from './ui_state_store';
import { inputAPI, outputAPI } from '../atma/singletons';
import { getContentDomainType, createDefaultSlotState } from '../atma/capabilities_registry/content_domain_registry';
import { KramEngine } from '../kram/kram_engine';
import { ContentRepository } from '../atma/storage/repositories/ContentRepository';
/**
 * UIController - Interface encapsulating all low-frequency UI state mutations and command delegations.
 */
export interface UIController {
    // ─── Transient UI / Layout Mutations ──────────────────────────────────────
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
    setSlotState: (slotId: string, key: string, val: any) => void;
    setSlotStates: (slotId: string, patch: Record<string, any>) => void;
    closeSlot: (slotId: string) => void;
    enterMarkSelectionMode: (selectedMarkId?: string) => void;
    exitMarkSelectionMode: () => void;
    connect: () => () => void;

    // ─── Domain / Data Commands Delegations (Refactored from InputAPI) ────────
    onContentChange: (slotId: string, contentId: string, contentType: string) => Promise<void>;
    deleteMark: (slotId: string, markId: string) => Promise<void>;
    addMark: (slotId: string, mark: any) => Promise<string>;
    updateMark: (slotId: string, mark: any) => Promise<void>;
    updateScrollTop: (slotId: string, scrollTop: number) => void;
    saveSettings: (settings: any) => Promise<void>;
    saveRecents: (recents: any[]) => Promise<void>;
    saveLibraryPath: (libraryPath: string | null) => Promise<void>;
    saveBackupPath: (backupPath: string | null) => Promise<void>;
    saveWhiteboardSnapshot: (markId: string, snapshot: any, slotId?: string) => void;
    flushSession: () => void;
    updateDefaultValue: (key: string, scope: string, value: any) => Promise<void>;
    updateClassification: (key: string, classification: 'personalizable' | 'defaulted') => Promise<void>;
}

/**
 * Factory function to create a new UIController instance operating on a UIStateStore.
 */
export function createUIController(store: UIStateStore, onHomeCallback?: () => void): UIController {
    const rawController: UIController = {
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

        closeSlot: (slotId) => {
            const state = store.getState();
            const slot = state.slots[slotId];
            if (!slot) return;

            // Reset slot to empty (Kram overrides this, but this is the raw fallback)
            store.setState({
                slots: {
                    ...state.slots,
                    [slotId]: {
                        ...slot,
                        contentId: '',
                        contentType: '',
                    }
                }
            });
        },
        enterMarkSelectionMode: (selectedMarkId) => {
            store.setState({ uiMode: { type: 'MARK_SELECTION', selectedMarkId } });
        },
        exitMarkSelectionMode: () => {
            store.setState({ uiMode: { type: 'REGULAR' } });
        },

        // ─── Domain Commands Delegations ──────────────────────────────────────────
        onContentChange: async (slotId, contentId, contentType) => {
            await inputAPI.loadSession(contentId, contentType, slotId);
        },
        deleteMark: (slotId, markId) => {
            return inputAPI.deleteMark(slotId, markId);
        },
        addMark: (slotId, mark) => {
            return inputAPI.addMark(slotId, mark);
        },
        updateMark: (slotId, mark) => {
            return inputAPI.updateMark(slotId, mark);
        },
        updateScrollTop: (slotId, scrollTop) => {
            inputAPI.updateScrollTop(slotId, scrollTop);
        },
        saveSettings: (settings) => {
            return inputAPI.saveSettings(settings);
        },
        saveRecents: (recents) => {
            return inputAPI.saveRecents(recents);
        },
        saveLibraryPath: (libraryPath) => {
            return inputAPI.saveLibraryPath(libraryPath);
        },
        saveBackupPath: (backupPath) => {
            return inputAPI.saveBackupPath(backupPath);
        },
        saveWhiteboardSnapshot: (markId, snapshot, slotId) => {
            inputAPI.saveWhiteboardSnapshot(slotId || null, markId, snapshot);
        },
        flushSession: () => {
            inputAPI.flushSession();
        },
        updateDefaultValue: async (key, scope, value) => {
            await inputAPI.updateDefaultValue(key, scope, value);
        },
        deleteDefaultValue: async (key, scope) => {
            await inputAPI.deleteDefaultValue(key, scope);
        },
        updateClassification: async (key, classification) => {
            await inputAPI.updateClassification(key, classification);
        },

        // ─── OutputAPI Event Subscriptions (Read/Event Path) ──────────────────────
        connect: () => {
            const subs = [
                outputAPI.subscribe('SESSION_LOADED', (session: any) => {
                    const mergedSlots = { ...store.getState().slots };
                    for (const [slotId, slotSession] of Object.entries(session.slots)) {
                        const defaults = createDefaultSlotState((slotSession as any).contentId, (slotSession as any).contentType, (slotSession as any).slotType ?? 'verticalPane', 'ui');
                        mergedSlots[slotId] = {
                            ...defaults,
                            ...slotSession,
                            marks: new Map((slotSession as any).marks.map((m: any) => [m.id, m])),
                        };
                    }

                    store.setState({
                        leftPct: session.leftPct,
                        slots: mergedSlots
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
                outputAPI.subscribe('MARK_ADDED', (payload: any) => {
                    const state = store.getState();
                    const contentId = payload.contentId;
                    const { contentId: _, ...mark } = payload;
                    const newSlots = { ...state.slots };
                    let changed = false;
                    for (const [slotId, slot] of Object.entries(newSlots)) {
                        if (slot && slot.contentId === contentId) {
                            const newMarks = new Map(slot.marks);
                            newMarks.set(mark.id, mark);
                            newSlots[slotId] = { ...slot, marks: newMarks };
                            changed = true;
                        }
                    }
                    if (changed) {
                        store.setState({ slots: newSlots });
                    }
                }),
                outputAPI.subscribe('MARK_UPDATED', (payload: any) => {
                    const state = store.getState();
                    const contentId = payload.contentId;
                    const { contentId: _, ...mark } = payload;
                    const newSlots = { ...state.slots };
                    let changed = false;
                    for (const [slotId, slot] of Object.entries(newSlots)) {
                        if (slot && slot.contentId === contentId) {
                            const newMarks = new Map(slot.marks);
                            newMarks.set(mark.id, mark);
                            newSlots[slotId] = { ...slot, marks: newMarks };
                            changed = true;
                        }
                    }
                    if (changed) {
                        store.setState({ slots: newSlots });
                    }
                }),
                outputAPI.subscribe('MARK_DELETED', (payload: any) => {
                    const state = store.getState();
                    const contentId = payload.contentId;
                    const newSlots = { ...state.slots };
                    let changed = false;
                    for (const [slotId, slot] of Object.entries(newSlots)) {
                        if (slot && slot.contentId === contentId) {
                            const newMarks = new Map(slot.marks);
                            newMarks.delete(payload.markId);
                            
                            let newSelectedId = slot.selectedMarkId;
                            if (newSelectedId === payload.markId) {
                                newSelectedId = null;
                            }
                            newSlots[slotId] = { ...slot, marks: newMarks, selectedMarkId: newSelectedId };
                            changed = true;
                        }
                    }
                    if (changed) {
                        store.setState({ slots: newSlots });
                    }
                })
            ];

            return () => {
                subs.forEach(sub => sub.unsubscribe());
            };
        }
    };

    const kramEngine = new KramEngine(rawController, store, onHomeCallback);
    return kramEngine.createProxy();
}
