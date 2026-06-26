/**
 * UIStateStore - Factory-based store interface holding transient low-frequency UI states.
 * Uses closure-based state encapsulation rather than ES6 classes.
 */

import { MarkDTO } from '../shared_doman_models_and_dtos/dtos';

import { AppState, SlotAppState } from '../atma/app_state_store';

export interface ToastState {
    msg: string;
    type: 'info' | 'success' | 'error';
}

export interface SlotUIState extends SlotAppState {
    currentPage: number;
    pageInput: string;
    editingShapeId: string | null;
    shapeBackup: any | null;
    editingSectionId: string | null;
    sectionTarget: 'start' | 'end';
    history?: Omit<SlotUIState, 'history'>[];
}

export type UIState = Omit<AppState, 'slots'> & {
    activeSlot: string; // slotId of active slot
    toast: ToastState | null;
    slots: Record<string, SlotUIState>;
}

export type UIStateListener = (state: UIState) => void;

export interface UIStateStore {
    getState: () => Readonly<UIState>;
    setState: (patch: Partial<UIState>) => void;
    subscribe: (listener: UIStateListener) => () => void;
}

/**
 * Factory function to create a new UIStateStore instance.
 */
export function createUIStateStore(initialState: Partial<UIState> = {}): UIStateStore {
    let state: UIState = {
        // purely volatile UI states
        activeSlot: 'left', // default active slot
        toast: null,
        slots: {},
        // These are required by AppState but usually provided by initialState:
        workspace_layout: { screens: [] },
        tool_config: {},
        libraryPath: null,
        leftPct: 50,
        ...initialState,
    };

    const listeners = new Set<UIStateListener>();

    return {
        getState: () => state,
        setState: (patch) => {
            state = { ...state, ...patch };
            listeners.forEach((listener) => {
                try {
                    listener(state);
                } catch (err) {
                    console.error('[UIStateStore] Error in listener callback:', err);
                }
            });
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        }
    };
}
