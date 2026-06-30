import { AppStateStore, AppState } from '../app_state_store';
import { OutputAPIInterface } from '../api/output_api';
import { StateInitialValuesRepository } from '../storage/repositories/StateInitialValuesRepository';
import { MarkRepository } from '../storage/repositories/MarkRepository';
import { ContentRepository } from '../storage/repositories/ContentRepository';
import { parseRawMark } from '../../shared_doman_models_and_dtos/factories';
import { SessionDTO } from '../../shared_doman_models_and_dtos/dtos';
import { getContentDomainType, createDefaultSlotState } from '../capabilities_registry/content_domain_registry';
import { WhiteboardRepository } from '../storage/repositories/WhiteboardRepository';

import { getSchema } from '../storage/state_schema_registry';
import { hydrateStateCache, resolveStateValue, StateVariableContext } from '../storage/resolve_state_initial_value';

export function debounce(fn: Function, ms: number, maxWait: number = 5000) {
  let timer: any = null;
  let lastArgs: any[] | null = null;
  let firstCallTime: number | null = null;
  
  const debounced = (...args: any[]) => {
    lastArgs = args;
    const now = Date.now();
    
    if (firstCallTime === null) {
      firstCallTime = now;
    }
    
    const timeElapsed = now - firstCallTime;
    clearTimeout(timer);
    
    if (timeElapsed >= maxWait) {
      fn(...args);
      lastArgs = null;
      firstCallTime = null;
      timer = null;
    } else {
      timer = setTimeout(() => {
        fn(...args);
        lastArgs = null;
        firstCallTime = null;
        timer = null;
      }, ms);
    }
  };

  debounced.flush = (...args: any[]) => {
    clearTimeout(timer);
    timer = null;
    firstCallTime = null;
    if (args.length > 0) {
      fn(...args);
    } else if (lastArgs) {
      fn(...lastArgs);
    }
    lastArgs = null;
  };

  return debounced;
}

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

    const persistFlat = debounce(async (changedKeys: (keyof AppState)[], newState: AppState) => {
      for (const key of changedKeys) {
        if (key === 'slots') continue; // Handled separately

        const schema = getSchema(key as string);
        if (schema && schema.classification === 'personalizable') {
          try {
             const val = newState[key];
             const scope = ['global']; // Flat state is globally scoped
             await StateInitialValuesRepository.setSpecificValue(key as string, scope, val);
          } catch (err) {
             console.error(`[StateSyncService] Failed to persist ${key}:`, err);
          }
        }
      }
    }, 600, 5000);

    const pendingSlotUpdates = new Map<string, { slotId: string, contentId: string; key: string; val: any }>();

    const persistSlotUpdates = debounce(async () => {
      if (pendingSlotUpdates.size === 0) return;

      const updates = Array.from(pendingSlotUpdates.values());
      pendingSlotUpdates.clear();

      for (const update of updates) {
        const schema = getSchema(update.key);
        if (schema && schema.classification === 'personalizable') {
          try {
             let targetScope = '';
             if (schema.cascade_path === 'content_tree') {
                 targetScope = 'content:' + update.contentId;
             } else if (schema.cascade_path === 'slot_tree') {
                 targetScope = 'slot:' + update.slotId;
             }
             
             if (targetScope) {
                 const scopeArray = [targetScope, 'global'];
                 await StateInitialValuesRepository.setSpecificValue(update.key, scopeArray, update.val);
             }
          } catch (err) {
             console.error(`[StateSyncService] Failed to persist slot key ${update.key}:`, err);
          }
        }
      }
    }, 600, 5000);

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
             pendingSlotUpdates.set(`${slotId}:${slot.contentId}:${key}`, {
               slotId,
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
  async loadSession(store: AppStateStore, output: OutputAPIInterface, contentId: string, contentType: string, slotId: string = 'left') {
    try {
      // Resolve path from DB if it exists, or dynamically resolve for whiteboard, fallback to contentId
      let filePath = contentId;
      try {
        const content = await ContentRepository.getContentById(contentId);
        if (content && content.file_path) {
          filePath = content.file_path;
        } else if (contentType === 'whiteboard') {
          // Resolve whiteboard path dynamically (even if not yet saved on disk/db)
          filePath = await WhiteboardRepository.resolvePath(contentId);
        }
      } catch (e) {}

      // Ensure the content is registered in the DB before we do any relational writing (like marks)
      await ContentRepository.ensureContentExists(contentId, 'core.' + contentType, filePath);

      // Hydrate the StateCache for this slot and content
      const activeScopes = [
          'global', 
          'workspace:default_workspace',
          'screen:screen_main',
          'pane:split_1',
          `slot:${slotId}`, 
          `slotType:verticalPane`,
          `content:${contentId}`, 
          `contentType:${contentType}`
      ];
      
      const stateCache = await hydrateStateCache(activeScopes);
      const context: StateVariableContext = {
          slotId,
          slotType: 'verticalPane',
          contentId,
          contentType
      };

      // Load individual keys via cascading scopes (Synchronous!)
      const dualSplitPaneLeftPct = resolveStateValue('dualSplitPaneLeftPct', context, stateCache);
      const selectedMarkId = resolveStateValue('selectedMarkId', context, stateCache);
      const scrollTop = resolveStateValue('scrollTop', context, stateCache);
      const zoom = resolveStateValue('zoom', context, stateCache);
      const tool = resolveStateValue('tool', context, stateCache);
      
      // Marks are still stored in MARKS table as they are relational data, not 4-layer state presets
      const rawMarks = await MarkRepository.loadMarksByContentId(contentId);
      const parsedMarks = rawMarks.map(parseRawMark);
      const marksMap = new Map(parsedMarks.map((m: any) => [m.id, m]));

      const existingSlot = store.getState().slots[slotId];
      const baseState = existingSlot && existingSlot.contentType === contentType
        ? existingSlot
        : createDefaultSlotState(contentId, contentType, 'verticalPane', 'ui');

      // Mutate store (Subscriber will automatically pick this up, but we'll ignore initial load diffing or just let it re-persist safely)
      store.setState(draft => {
        draft.dualSplitPaneLeftPct = dualSplitPaneLeftPct;
        draft.slots[slotId] = {
          ...baseState,
          contentId: contentId,
          contentType: contentType,
          zoom: zoom ?? baseState.zoom ?? 1.0,
          tool: tool ?? baseState.tool ?? 'select',
          selectedMarkId: selectedMarkId ?? baseState.selectedMarkId ?? null,
          scrollTop: scrollTop ?? baseState.scrollTop ?? 0,
          marks: marksMap,
          slotType: 'verticalPane'
        };
      });

      const sessionDTO: SessionDTO = {
        dualSplitPaneLeftPct,
        slots: {
          [slotId]: {
            contentId: contentId,
            contentType: contentType,
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
