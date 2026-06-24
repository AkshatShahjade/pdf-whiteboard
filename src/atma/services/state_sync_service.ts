import { AppStateStore, AppState } from '../app_state_store';
import { OutputAPIInterface } from '../api/output_api';
import { StateInitialValuesRepository } from '../storage/repositories/StateInitialValuesRepository';
import { MarkRepository } from '../storage/repositories/MarkRepository';
import { parseRawMark } from '../../shared_doman_models_and_dtos/factories';
import { SessionDTO } from '../../shared_doman_models_and_dtos/dtos';

export function debounce(fn: Function, ms: number) {
  let timer: any = null;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Keys that are registered in our 4-layer architecture
const PERSISTENT_KEYS: Array<keyof AppState> = [
  'workspace_layout', 'tool_config', 'zoom', 'libraryPath', 'tool', 
  'leftPct', 'scrollTop', 'selectedMarkId'
];

export const stateSyncService = {
  
  /**
   * Starts the background subscriber that watches the AppStore, diffs changes,
   * emits OutputAPI events, and debounces SQLite persistence.
   */
  startSubscriber(store: AppStateStore, output: OutputAPIInterface) {
    let prevState = store.getState();

    const persistChanges = debounce(async (changedKeys: (keyof AppState)[], newState: AppState) => {
      for (const key of changedKeys) {
        if (PERSISTENT_KEYS.includes(key)) {
          try {
             const val = newState[key];
             // For now we use ['global'] scope as defined in state_initializer
             await StateInitialValuesRepository.setSpecificValue(key, ['global'], val);
          } catch (err) {
             console.error(`[StateSyncService] Failed to persist ${key}:`, err);
          }
        }
      }
    }, 600);

    store.subscribe(() => {
      const newState = store.getState();
      const changedKeys: (keyof AppState)[] = [];

      for (const key in newState) {
        const k = key as keyof AppState;
        if (newState[k] !== prevState[k]) {
          changedKeys.push(k);
        }
      }

      if (changedKeys.length === 0) return;

      // 1. Automatic Event Publishing
      // We only publish keys that are simple state variables (excluding 'marks')
      const patch: Partial<AppState> = {};
      for (const key of changedKeys) {
        if (key !== 'marks') {
          (patch as any)[key] = newState[key];
        }
      }

      if (Object.keys(patch).length > 0) {
        output.publish('APPSTATE_MUTATED', patch);
      }

      // 2. Debounced Background Persistence
      persistChanges(changedKeys, newState);

      prevState = newState;
    });
  },

  /**
   * Hydrates the store with the resolved session state from the 4-layer architecture.
   */
  async loadSession(store: AppStateStore, output: OutputAPIInterface, pdfPath: string) {
    try {
      // Load individual keys via cascading scopes
      const leftPct = await StateInitialValuesRepository.getInitialValue('leftPct', ['global']);
      const selectedMarkId = await StateInitialValuesRepository.getInitialValue('selectedMarkId', ['global']);
      const scrollTop = await StateInitialValuesRepository.getInitialValue('scrollTop', ['global']);
      const zoom = await StateInitialValuesRepository.getInitialValue('zoom', ['global']);
      const tool = await StateInitialValuesRepository.getInitialValue('tool', ['global']);
      
      // Marks are still stored in MARKS table as they are relational data, not 4-layer state presets
      const rawMarks = await MarkRepository.loadMarksByContentId(pdfPath);
      const parsedMarks = rawMarks.map(parseRawMark);
      const marksMap = new Map(parsedMarks.map((m: any) => [m.id, m]));

      // Mutate store (Subscriber will automatically pick this up, but we'll ignore initial load diffing or just let it re-persist safely)
      store.setState(draft => {
        draft.pdfPath = pdfPath;
        draft.leftPct = leftPct;
        draft.selectedMarkId = selectedMarkId;
        draft.scrollTop = scrollTop;
        draft.zoom = zoom;
        draft.tool = tool;
        draft.marks = marksMap;
      });

      const sessionDTO: SessionDTO = {
        pdfPath,
        leftPct,
        selectedMarkId,
        scrollTop,
        marks: parsedMarks
      };

      output.publish('SESSION_LOADED', sessionDTO);
    } catch (err) {
      console.error('[StateSyncService] Failed to load session:', err);
      throw err;
    }
  }
};
