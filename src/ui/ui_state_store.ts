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
}

export interface LinkModeState {
    isActive: boolean;
    activeTarget: 'source' | 'destination' | null;
    direction: '1-way' | '1-way-reverse' | '2-way';
    sourceMarkId: string | null;
    destinationMarkId: string | null;
}

export type UIState = Omit<AppState, 'slots'> & {
    activeSlot: string; // slotId of active slot
    toast: ToastState | null;
    uiMode: import('../roopa/mode_system').RoopaMode;
    linkMode: LinkModeState;
    slotsSnapshot: Record<string, SlotUIState> | null;
    isContentSelectorOpen: boolean;
    isMarkSelectorOpen: boolean;
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
        uiMode: { type: 'REGULAR' },
        linkMode: {
            isActive: false,
            activeTarget: null,
            direction: '2-way',
            sourceMarkId: null,
            destinationMarkId: null
        },
        slotsSnapshot: null,
        isContentSelectorOpen: false,
        isMarkSelectorOpen: false,
        slots: {},
        // These are required by AppState but usually provided by initialState:
        workspace_layout: null,
        tool_config: null,
        libraryPath: null,
        dualSplitPaneLeftPct: 50, // Hydrated dynamically
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
