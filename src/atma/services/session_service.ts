import { AppStateStore } from '../app_state_store';
import { OutputAPIInterface } from '../api/output_api';
import { parseRawMark } from '../../shared_doman_models_and_dtos/factories';
import { SessionDTO } from '../../shared_doman_models_and_dtos/dtos';
import { LastUIStateRepository } from '../storage/repositories/LastUIStateRepository';
import { MarkRepository } from '../storage/repositories/MarkRepository';
import { ContentRepository } from '../storage/repositories/ContentRepository';

export function debounce(fn: Function, ms: number) {
  let timer: any = null;
  const debounced = (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debounced.flush = (...args: any[]) => {
    clearTimeout(timer);
    fn(...args);
  };
  return debounced;
}

// Debounce helper that reads the latest state from store only at execution time
const debouncedPersist = debounce(async (store: AppStateStore) => {
  const state = store.getState();
  if (state.pdfPath) {
    try {
      //TODO: why is this even a logic:
      // 1. Ensure the PDF content row exists
      await ContentRepository.ensureContentExists(state.pdfPath, 'core.pdf', state.pdfPath);

      // 2. Save UI State to Settings
      await LastUIStateRepository.saveSessionState(state.pdfPath, {
        selectedMarkId: state.selectedMarkId,
        scrollTop: state.scrollTop,
        leftPct: state.leftPct
      });

      // 3. Upsert Marks
      await MarkRepository.upsertMarks(state.pdfPath, Array.from(state.marks.values()));
    } catch (err) {
      console.warn('[SessionService] Debounced session save failed:', err);
    }
  }
}, 600);

export const sessionService = {
  /**
   * Triggers or schedules session serialization to SQLite.
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

      const rawSession = await LastUIStateRepository.loadSessionState(pdfPath) || {};
      const leftPct = rawSession?.leftPct ?? 50;
      const selectedMarkId = rawSession?.selectedMarkId ?? null;
      const scrollTop = rawSession?.scrollTop ?? 0;
      
      const rawMarks = await MarkRepository.loadMarksByContentId(pdfPath);
      const parsedMarks = rawMarks.map(parseRawMark);
      const marksMap = new Map(parsedMarks.map((m: any) => [m.id, m]));

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

  updateSplitter(
    store: AppStateStore,
    output: OutputAPIInterface,
    leftPct: number
  ): void {
    store.setState(draft => { draft.leftPct = leftPct; });
    output.publish('SPLITTER_CHANGED', { leftPct });
    this.persist(store, false);
  },

  selectMark(
    store: AppStateStore,
    output: OutputAPIInterface,
    markId: string | null
  ): void {
    store.setState(draft => { draft.selectedMarkId = markId; });
    output.publish('MARK_SELECTED', { markId });
    this.persist(store, false);
  },

  updateScrollTop(
    store: AppStateStore,
    pdfPath: string,
    scrollTop: number
  ): void {
    store.setState(draft => {
      if (draft.pdfPath === pdfPath) { draft.scrollTop = scrollTop; }
    });
    this.persist(store, false);
  },

  flushPendingSave(store: AppStateStore): void {
    this.persist(store, true);
  }
};


