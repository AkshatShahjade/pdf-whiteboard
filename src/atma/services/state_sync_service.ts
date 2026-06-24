import { AppStateStore, AppState } from '../app_state_store';
import { OutputAPIInterface } from '../api/output_api';
import { StateInitialValuesRepository } from '../storage/repositories/StateInitialValuesRepository';
import { MarkRepository } from '../storage/repositories/MarkRepository';
import { ContentRepository } from '../storage/repositories/ContentRepository';
import { parseRawMark } from '../../shared_doman_models_and_dtos/factories';
import { SessionDTO } from '../../shared_doman_models_and_dtos/dtos';

export function debounce(fn: Function, ms: number) {
  let timer: any = null;
  let lastArgs: any[] | null = null;
  
  const debounced = (...args: any[]) => {
    lastArgs = args;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      lastArgs = null;
      timer = null;
    }, ms);
  };

  debounced.flush = (...args: any[]) => {
    clearTimeout(timer);
    timer = null;
    if (args.length > 0) {
      fn(...args);
    } else if (lastArgs) {
      fn(...lastArgs);
    }
    lastArgs = null;
  };

  return debounced;
}

// We will asynchronously fetch the types of all state keys from the database
let keyTypes: Record<string, string> = {};

export const stateSyncService = {
  
  _flushPersist: null as (() => void) | null,

  flushSession() {
    if (this._flushPersist) {
      this._flushPersist();
    }
  },

  /**
   * Starts the background subscriber that watches the AppStore, diffs changes,
   * emits OutputAPI events, and debounces SQLite persistence.
   */
  startSubscriber(store: AppStateStore, output: OutputAPIInterface) {
    let prevState = store.getState();

    // Fire and forget fetch of key types. 
    // This will definitely finish before the user's first 600ms debounced persist.
    StateInitialValuesRepository.getAllKeyTypes()
      .then(types => { keyTypes = types; })
      .catch(console.error);

    const persistChanges = debounce(async (changedKeys: (keyof AppState)[], newState: AppState) => {
      for (const key of changedKeys) {
        if (key === 'marks') continue; // Marks are persisted directly by MarkRepository

        // If the key exists in our DB schema and is not volatile, persist it.
        const type = keyTypes[key as string];
        if (type && type !== 'volatile') {
          try {
             const val = newState[key];
             const scope = ['doc:' + newState.pdfPath, 'global'];
             await StateInitialValuesRepository.setSpecificValue(key as string, scope, val);
          } catch (err) {
             console.error(`[StateSyncService] Failed to persist ${key}:`, err);
          }
        }
      }
    }, 600);

    this._flushPersist = () => persistChanges.flush();

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
      const delta: Partial<AppState> = {};
      for (const key of changedKeys) {
        if (key !== 'marks') {
          (delta as any)[key] = newState[key];
        }
      }

      if (Object.keys(delta).length > 0) {
        output.publish('APPSTATE_MUTATED', delta);
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
      // Ensure the content is registered in the DB before we do any relational writing (like marks)
      await ContentRepository.ensureContentExists(pdfPath, 'core.pdf', pdfPath);

      // Load individual keys via cascading scopes
      const docScope = ['doc:' + pdfPath, 'global'];
      const leftPct = await StateInitialValuesRepository.getInitialValue('personalized', 'leftPct', docScope);
      const selectedMarkId = await StateInitialValuesRepository.getInitialValue('personalized', 'selectedMarkId', docScope);
      const scrollTop = await StateInitialValuesRepository.getInitialValue('personalized', 'scrollTop', docScope);
      const zoom = await StateInitialValuesRepository.getInitialValue('personalized', 'zoom', docScope);
      const tool = await StateInitialValuesRepository.getInitialValue('personalized', 'tool', docScope);
      
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
        zoom,
        tool,
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
