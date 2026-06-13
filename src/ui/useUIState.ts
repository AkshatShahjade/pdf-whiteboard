import { useSyncExternalStore } from 'react';
import { UIStateStore, UIState } from './ui_state_store';

/**
 * useUIState - React hook bridge that subscribes to a UIStateStore
 * and triggers re-renders whenever the store state changes.
 * Supports concurrent rendering patterns out of the box in React 18/19.
 *
 * @param store The UIStateStore instance to subscribe to.
 * @returns The current snapshot of the UI state.
 */
export function useUIState(store: UIStateStore): UIState {
    return useSyncExternalStore(
        store.subscribe,
        () => store.getState()
    );
}
