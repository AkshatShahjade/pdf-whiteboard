import { UIStateStore, ToastState } from './ui_state_store';
import { inputAPI, outputAPI } from '../atma/singletons';

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
    setActivePane: (activePane: string) => void;
    setEditingShapeId: (editingShapeId: string | null, slotId?: string) => void;
    setShapeBackup: (shapeBackup: any, slotId?: string) => void;
    setEditingSectionId: (editingSectionId: string | null, slotId?: string) => void;
    setSectionTarget: (sectionTarget: 'start' | 'end', slotId?: string) => void;
    showToast: (msg: string, type?: ToastState['type']) => void;
    clearToast: () => void;
    saveWhiteboardSnapshot: (markId: string, snapshot: any, slotId?: string) => void;
    connect: () => () => void;
}

/**
 * Factory function to create a new UIController instance operating on a UIStateStore.
 */
export function createUIController(store: UIStateStore): UIController {
    return {
        // ─── UI Actions (Write/Command Path Delegates) ────────────────────────────
        setZoom: (zoom, slotId) => {
            inputAPI.updateZoom(slotId || store.getState().activePane, zoom);
        },
        setLeftPct: (leftPct) => {
            inputAPI.updateSplitter(leftPct);
        },
        setCurrentPage: (currentPage, slotId) => {
            const target = slotId || store.getState().activePane;
            const state = store.getState();
            if (state.slots[target]?.currentPage === currentPage) return;
            store.setState({
                slots: { ...state.slots, [target]: { ...state.slots[target], currentPage, pageInput: String(currentPage) } }
            });
        },
        setPageInput: (pageInput, slotId) => {
            const target = slotId || store.getState().activePane;
            const state = store.getState();
            if (state.slots[target]?.pageInput === pageInput) return;
            store.setState({
                slots: { ...state.slots, [target]: { ...state.slots[target], pageInput } }
            });
        },
        setTool: (tool, slotId) => {
            inputAPI.updateTool(slotId || store.getState().activePane, tool);
        },
        setSelectedMarkId: (selectedMarkId, slotId) => {
            inputAPI.selectMark(slotId || store.getState().activePane, selectedMarkId);
        },
        setActivePane: (activePane) => {
            store.setState({ activePane });
        },
        setEditingShapeId: (editingShapeId, slotId) => {
            const target = slotId || store.getState().activePane;
            const state = store.getState();
            store.setState({
                slots: { ...state.slots, [target]: { ...state.slots[target], editingShapeId } }
            });
        },
        setShapeBackup: (shapeBackup, slotId) => {
            const target = slotId || store.getState().activePane;
            const state = store.getState();
            store.setState({
                slots: { ...state.slots, [target]: { ...state.slots[target], shapeBackup } }
            });
        },
        setEditingSectionId: (editingSectionId, slotId) => {
            const target = slotId || store.getState().activePane;
            const state = store.getState();
            store.setState({
                slots: { ...state.slots, [target]: { ...state.slots[target], editingSectionId } }
            });
        },
        setSectionTarget: (sectionTarget, slotId) => {
            const target = slotId || store.getState().activePane;
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
            inputAPI.saveWhiteboardSnapshot(slotId || store.getState().activePane, markId, snapshot);
        },

        // ─── OutputAPI Event Subscriptions (Read/Event Path) ──────────────────────
        connect: () => {
            const subs = [
                outputAPI.subscribe('SESSION_LOADED', (session: any) => {
                    const newSlots: Record<string, any> = {};
                    for (const [slotId, slotSession] of Object.entries(session.slots)) {
                        newSlots[slotId] = {
                            ...(store.getState().slots[slotId] || {}),
                            ...slotSession,
                            marks: new Map((slotSession as any).marks.map((m: any) => [m.id, m])),
                            currentPage: 1, // Reset UI specifics
                            pageInput: '1',
                            editingShapeId: null,
                            shapeBackup: null,
                            editingSectionId: null,
                            sectionTarget: 'start'
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
                    // Requires activePane because MARK_ADDED output doesn't broadcast slotId natively.
                    // To do it perfectly, MARK_ADDED could contain slotId.
                    const state = store.getState();
                    const activeSlot = state.activePane;
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
                    const activeSlot = state.activePane;
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
                    const activeSlot = state.activePane;
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
