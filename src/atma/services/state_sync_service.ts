import { AppStateStore, AppState } from '../app_state_store';
import { OutputAPIInterface } from '../api/output_api';
import { StateInitialValuesRepository } from '../storage/repositories/StateInitialValuesRepository';
import { MarkRepository } from '../storage/repositories/MarkRepository';
import { ContentRepository } from '../storage/repositories/ContentRepository';
import { parseRawMark } from '../../shared_doman_models_and_dtos/factories';
import { SessionDTO } from '../../shared_doman_models_and_dtos/dtos';
import { getContentDomainType } from '../capabilities_registry/content_domain_registry';

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

    const persistFlat = debounce(async (changedKeys: (keyof AppState)[], newState: AppState) => {
      for (const key of changedKeys) {
        if (key === 'slots') continue; // Handled separately

        const type = keyTypes[key as string];
        if (type === 'personalizable') {
          try {
             const val = newState[key];
             const scope = ['global']; // Flat state is global for now
             await StateInitialValuesRepository.setSpecificValue(key as string, scope, val);
          } catch (err) {
             console.error(`[StateSyncService] Failed to persist ${key}:`, err);
          }
        }
      }
    }, 600);

    const pendingSlotUpdates = new Map<string, { contentId: string; key: string; val: any }>();

    const persistSlotUpdates = debounce(async () => {
      if (pendingSlotUpdates.size === 0) return;

      const updates = Array.from(pendingSlotUpdates.values());
      pendingSlotUpdates.clear();

      for (const update of updates) {
        const type = keyTypes[update.key];
        if (type === 'personalizable') {
          try {
             const scope = ['doc:' + update.contentId, 'global'];
             await StateInitialValuesRepository.setSpecificValue(update.key, scope, update.val);
          } catch (err) {
             console.error(`[StateSyncService] Failed to persist slot key ${update.key}:`, err);
          }
        }
      }
    }, 600);

    this._flushPersist = () => {
      persistFlat.flush();
      persistSlotUpdates.flush();
    };

    store.subscribe(() => {
      const newState = store.getState();
      const changedKeys: (keyof AppState)[] = [];

      for (const key in newState) {
        const k = key as keyof AppState;
        if (newState[k] !== prevState[k]) {
          changedKeys.push(k);
        }
      }

      // We need to diff slots manually because mutations are in-place
      const delta: Partial<AppState> = {};
      const slotDeltas: Record<string, any> = {};
      let slotsChanged = false;

      if (!prevState.slots) prevState.slots = {};
      for (const [slotId, slot] of Object.entries(newState.slots)) {
        const prevSlot = prevState.slots[slotId] || {} as any;
        const slotDelta: Record<string, any> = {};
        
        let persistentKeys: string[] = [];
        try {
          const domain = getContentDomainType(slot.contentType);
          persistentKeys = domain.stateVariables
            ?.filter(v => v.scope === 'app' && v.persistence === 'personalizable')
            .map(v => v.name) || [];
        } catch (err) {
          persistentKeys = ['zoom', 'tool', 'scrollTop', 'selectedMarkId'];
        }

        for (const key of persistentKeys) {
          if ((slot as any)[key] !== prevSlot[key]) {
             slotsChanged = true;
             slotDelta[key] = (slot as any)[key];
             pendingSlotUpdates.set(`${slot.contentId}:${key}`, {
               contentId: slot.contentId,
               key,
               val: (slot as any)[key]
             });
             persistSlotUpdates();
          }
        }
        if (Object.keys(slotDelta).length > 0) {
          slotDeltas[slotId] = slotDelta;
        }
      }

      if (changedKeys.length > 0) {
        for (const key of changedKeys) {
          if (key !== 'slots') {
            (delta as any)[key] = newState[key];
          }
        }
        if (Object.keys(delta).length > 0) {
          output.publish('APPSTATE_MUTATED', delta);
          persistFlat(changedKeys, newState);
        }
      }

      if (slotsChanged) {
        // Publish slots changed
        output.publish('APPSTATE_MUTATED', { slots: slotDeltas });
      }

      // Deep clone prev state for primitive diffing next time
      prevState = { ...newState, slots: {} };
      for (const [id, s] of Object.entries(newState.slots)) {
        prevState.slots[id] = { ...s }; // shallow clone of the slot is enough for primitives
      }
    });
  },

  /**
   * Hydrates the store with the resolved session state from the 4-layer architecture.
   */
  async loadSession(store: AppStateStore, output: OutputAPIInterface, pdfPath: string, slotId: string = 'main') {
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
        draft.leftPct = leftPct;
        draft.slots[slotId] = {
          contentId: pdfPath,
          contentType: 'pdf',
          zoom,
          tool,
          selectedMarkId,
          scrollTop,
          marks: marksMap,
          slotType: slotId === 'main' ? 'verticalPane' : 'verticalPane' // maintain structure
        };
      });

      const sessionDTO: SessionDTO = {
        leftPct,
        slots: {
          [slotId]: {
            contentId: pdfPath,
            contentType: 'pdf',
            zoom,
            tool,
            selectedMarkId,
            scrollTop,
            marks: parsedMarks,
            slotType: 'verticalPane'
          }
        }
      };

      output.publish('SESSION_LOADED', sessionDTO);
    } catch (err) {
      console.error('[StateSyncService] Failed to load session:', err);
      throw err;
    }
  }
};
