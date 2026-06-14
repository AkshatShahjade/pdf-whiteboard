/**
 * UIStateStore - Factory-based store interface holding transient low-frequency UI states.
 * Uses closure-based state encapsulation rather than ES6 classes.
 */

import { MarkDTO } from '../shared_doman_models_and_dtos/dtos';

export interface ToastState {
    msg: string;
    type: 'info' | 'success' | 'error';
}

export interface UIState {
    zoom: number;
    currentPage: number;
    pageInput: string;
    tool: string;
    activePane: 'pdf' | 'whiteboard';
    editingShapeId: string | null;
    shapeBackup: any | null;
    editingSectionId: string | null;
    sectionTarget: 'start' | 'end';
    toast: ToastState | null;
    // Core Domain Variables cached for UI presentation
    leftPct: number;
    selectedMarkId: string | null;
    marks: MarkDTO[];
    pdfPath: string | null;
    scrollTop: number;
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
        zoom: 1.0,
        leftPct: 50,
        currentPage: 1,
        pageInput: '1',
        tool: 'select',
        selectedMarkId: null,
        activePane: 'pdf',
        editingShapeId: null,
        shapeBackup: null,
        editingSectionId: null,
        sectionTarget: 'start',
        toast: null,
        marks: [],
        pdfPath: null,
        scrollTop: 0,
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
