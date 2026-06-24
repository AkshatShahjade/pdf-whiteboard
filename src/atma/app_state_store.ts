import { MarkDTO } from '../shared_doman_models_and_dtos/dtos';

export interface AppState {
  workspace_layout: any;
  tool_config: any;
  zoom: number;
  libraryPath: string | null;
  tool: string;
  pdfPath: string | null;
  leftPct: number;
  selectedMarkId: string | null;
  scrollTop: number;
  marks: Map<string, MarkDTO>;
}

export interface AppStateStore {
  getState(): AppState;
  setState(updater: (state: AppState) => void): void;
  subscribe(listener: () => void): () => void;
}

export function createAppStateStore(initialState?: Partial<AppState>): AppStateStore {
  let state: AppState = {
    workspace_layout: { screens: [] },
    tool_config: {},
    zoom: 1.0,
    libraryPath: null,
    tool: 'select',
    pdfPath: null,
    leftPct: 50,
    selectedMarkId: null,
    scrollTop: 0,
    marks: new Map(),
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
