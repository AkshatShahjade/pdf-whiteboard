import { AppStateStore } from '../app_state_store';
import { OutputAPIInterface } from '../api/output_api';
import { MarkDTO } from '../api/dtos';
import { validateMark } from '../domain/validation';
import { generateMarkId } from '../domain/factories';
import { 
  deleteWhiteboard as dbDeleteWhiteboard,
  saveWhiteboard as dbSaveWhiteboard
} from '../../storage';
import { sessionService } from './session_service';

export const markService = {
  /**
   * Validates and inserts a new MarkDTO into AppStateStore, triggers session persistence, and publishes MARK_ADDED.
   */
  async addMark(
    store: AppStateStore,
    output: OutputAPIInterface,
    markData: Omit<MarkDTO, 'id'>
  ): Promise<string> {
    const validation = validateMark(markData);
    if (!validation.isValid) {
      throw new Error(`[MarkService] Invalid mark data: ${validation.error}`);
    }

    const id = generateMarkId();
    const newMark: MarkDTO = {
      ...markData,
      id
    } as MarkDTO;

    store.setState(draft => {
      draft.marks.set(id, newMark);
    });

    output.publish('MARK_ADDED', newMark);

    // Force immediate persist to storage
    sessionService.persist(store, true);

    return id;
  },

  /**
   * Validates and updates an existing MarkDTO, triggers session persistence, and publishes MARK_UPDATED.
   */
  async updateMark(
    store: AppStateStore,
    output: OutputAPIInterface,
    mark: MarkDTO
  ): Promise<void> {
    const validation = validateMark(mark);
    if (!validation.isValid) {
      throw new Error(`[MarkService] Invalid mark update: ${validation.error}`);
    }

    store.setState(draft => {
      if (draft.marks.has(mark.id)) {
        draft.marks.set(mark.id, mark);
      }
    });

    output.publish('MARK_UPDATED', mark);

    // Force immediate persist to storage
    sessionService.persist(store, true);
  },

  /**
   * Deletes a mark from AppStateStore, cleans up associated whiteboard data in IndexedDB, and publishes MARK_DELETED.
   */
  async deleteMark(
    store: AppStateStore,
    output: OutputAPIInterface,
    markId: string
  ): Promise<void> {
    store.setState(draft => {
      draft.marks.delete(markId);
      if (draft.selectedMarkId === markId) {
        draft.selectedMarkId = null;
      }
    });

    output.publish('MARK_DELETED', { markId });

    // Force immediate persist to storage
    sessionService.persist(store, true);

    try {
      await dbDeleteWhiteboard(markId);
    } catch (err) {
      console.warn(`[MarkService] Failed to clean up whiteboard data for deleted mark ${markId}:`, err);
    }
  },

  /**
   * Saves a whiteboard canvas snapshot to IndexedDB and publishes WHITEBOARD_UPDATED.
   */
  async saveWhiteboardSnapshot(
    output: OutputAPIInterface,
    markId: string,
    snapshot: any
  ): Promise<void> {
    await dbSaveWhiteboard(markId, snapshot);
    output.publish('WHITEBOARD_UPDATED', { markId });
  }
};
