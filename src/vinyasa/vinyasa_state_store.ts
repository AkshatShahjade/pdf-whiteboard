export interface BadlavState {
  defaultSplit: number;
  autosaveMs: number;
  maxGlobalPdfTools: number;
  defaultTool: string;
}

export interface BadlavStateStore {
  getState(): BadlavState;
  setState(updater: (state: BadlavState) => void): void;
  subscribe(listener: () => void): () => void;
}

const DEFAULT_SETTINGS: BadlavState = {
  defaultSplit: 50,
  autosaveMs: 600,
  maxGlobalPdfTools: 5,
  defaultTool: 'select'
};

export function createBadlavStateStore(initialState?: Partial<BadlavState>): BadlavStateStore {
  let state: BadlavState = {
    ...DEFAULT_SETTINGS,
    ...initialState
  };

  const listeners = new Set<() => void>();

  return {
    getState(): BadlavState {
      return { ...state };
    },

    setState(updater: (state: BadlavState) => void): void {
      const draftState: BadlavState = { ...state };
      updater(draftState);
      state = draftState;

      listeners.forEach(listener => {
        try {
          listener();
        } catch (err) {
          console.error('[BadlavStateStore] Error during subscription notification:', err);
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