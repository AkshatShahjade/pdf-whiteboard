import { MarkDTO } from '../shared_doman_models_and_dtos/dtos';

export interface SlotAppState {
  contentId: string;
  contentType: string; // 'pdf' | 'whiteboard'
  slotType: string;   // 'verticalPane' | future slot types
  zoom: number;
  tool: string;
  scrollTop: number;
  selectedMarkId: string | null;
  marks: Map<string, MarkDTO>;
}

export interface AppState {
  workspace_layout: any;
  tool_config: any;
  libraryPath: string | null;
  dualSplitPaneLeftPct: number;
  slots: Record<string, SlotAppState>;
}

export interface AppStateStore {
  getState(): AppState;
  setState(updater: (state: AppState) => void): void;
  subscribe(listener: () => void): () => void;
}

export function createAppStateStore(initialState?: Partial<AppState>): AppStateStore {
  let state: AppState = {
    workspace_layout: null,
    tool_config: null,
    libraryPath: null,
    dualSplitPaneLeftPct: 50, // This will be hydrated dynamically later
    slots: {},
    ...initialState
  };

  const listeners = new Set<() => void>();

  return {
    getState(): AppState {
      // We return state directly instead of copying the map to avoid O(N) allocations
      // on every state read, which was causing the subscriber to constantly detect changes.
      return state;
    },

    setState(updater: (state: AppState) => void): void {
      const draftState: AppState = { ...state };

      updater(draftState);
      state = draftState;

      listeners.forEach(listener => {
        try {
          listener();
        } catch (err) {
          console.error('[AppStateStore] Error during subscription notification:', err);
        }
      });
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
