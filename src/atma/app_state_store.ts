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
  leftPct: number;
  slots: Record<string, SlotAppState>;
}

export const DEFAULT_APP_STATE: Omit<AppState, 'slots'> = {
  workspace_layout: { screens: [] },
  tool_config: {},
  libraryPath: null,
  leftPct: 50,
};

export const DEFAULT_SLOT_APP_STATE: Omit<SlotAppState, 'contentId' | 'contentType' | 'slotType' | 'marks'> = {
  zoom: 1.0,
  tool: 'select',
  selectedMarkId: null,
  scrollTop: 0,
};

export interface AppStateStore {
  getState(): AppState;
  setState(updater: (state: AppState) => void): void;
  subscribe(listener: () => void): () => void;
}

export function createAppStateStore(initialState?: Partial<AppState>): AppStateStore {
  let state: AppState = {
    ...DEFAULT_APP_STATE,
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
