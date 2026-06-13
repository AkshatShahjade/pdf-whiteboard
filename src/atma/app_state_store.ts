import { MarkDTO } from './api/dtos';

export interface AppState {
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
      // Return a shallow copy of state and map to prevent accidental external mutations
      return {
        ...state,
        marks: new Map(state.marks)
      };
    },

    setState(updater: (state: AppState) => void): void {
      const nextMarks = new Map(state.marks);
      const draftState: AppState = {
        ...state,
        marks: nextMarks
      };

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
