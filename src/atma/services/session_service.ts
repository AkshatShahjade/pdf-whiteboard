import { AppStateStore } from '../app_state_store';
import { OutputAPIInterface } from '../api/output_api';
import { loadSession as dbLoadSession, saveSession as dbSaveSession, debounce } from '../../storage';
import { parseRawMark } from '../domain/factories';
import { SessionDTO } from '../api/dtos';

// Debounce helper that reads the latest state from store only at execution time
const debouncedPersist = debounce((store: AppStateStore) => {
  const state = store.getState();
  if (state.pdfPath) {
    try {
      dbSaveSession(state.pdfPath, {
        marks: Array.from(state.marks.values()),
        selectedMarkId: state.selectedMarkId,
        scrollTop: state.scrollTop,
        leftPct: state.leftPct
      });
    } catch (err) {
      console.warn('[SessionService] Debounced session save failed:', err);
    }
  }
}, 600);

export const sessionService = {
  /**
   * Triggers or schedules session serialization to localStorage.
   */
  persist(store: AppStateStore, forceImmediate = false): void {
    if (forceImmediate) {
      debouncedPersist.flush(store);
    } else {
      debouncedPersist(store);
    }
  },

  /**
   * Loads a document session from storage, validates it, populates AppStateStore, and publishes a SESSION_LOADED event.
   */
  async loadSession(
    store: AppStateStore,
    output: OutputAPIInterface,
    pdfPath: string
  ): Promise<void> {
    try {
      // Flush any pending save for the previous document before loading the new one
      this.persist(store, true);

      const rawSession = dbLoadSession(pdfPath);
      const leftPct = rawSession?.leftPct ?? 50;
      const selectedMarkId = rawSession?.selectedMarkId ?? null;
      const scrollTop = rawSession?.scrollTop ?? 0;
      const rawMarks = Array.isArray(rawSession?.marks) ? rawSession.marks : [];
      
      const parsedMarks = rawMarks.map(parseRawMark);
      const marksMap = new Map(parsedMarks.map(m => [m.id, m]));

      store.setState(draft => {
        draft.pdfPath = pdfPath;
        draft.leftPct = leftPct;
        draft.selectedMarkId = selectedMarkId;
        draft.scrollTop = scrollTop;
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
      console.error('[SessionService] Failed to load session:', err);
      throw err;
    }
  },

  /**
   * Updates the layout pane splitter percentage, updates the store, triggers storage persistence, and publishes SPLITTER_CHANGED.
   */
  updateSplitter(
    store: AppStateStore,
    output: OutputAPIInterface,
    leftPct: number
  ): void {
    store.setState(draft => {
      draft.leftPct = leftPct;
    });

    output.publish('SPLITTER_CHANGED', { leftPct });

    // Queue debounced save to persistence
    this.persist(store, false);
  },

  /**
   * Persists scroll position changes to the store and schedules a debounced storage save.
   */
  updateScrollTop(
    store: AppStateStore,
    pdfPath: string,
    scrollTop: number
  ): void {
    store.setState(draft => {
      if (draft.pdfPath === pdfPath) {
        draft.scrollTop = scrollTop;
      }
    });

    this.persist(store, false);
  },

  /**
   * Flushes any pending writes immediately (e.g. on window unload/shutdown).
   */
  flushPendingSave(store: AppStateStore): void {
    this.persist(store, true);
  }
};


