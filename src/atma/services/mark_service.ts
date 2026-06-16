import { AppStateStore } from '../app_state_store';
import { OutputAPIInterface } from '../api/output_api';
import { MarkDTO } from '../../shared_doman_models_and_dtos/dtos';
import { generateMarkId } from '../../shared_doman_models_and_dtos/factories';
import { WhiteboardRepository } from '../storage/repositories/WhiteboardRepository';
import { sessionService } from './session_service';

export const markService = {
  /**
   * Validates and inserts a new MarkDTO into AppStateStore, triggers session persistence, and publishes MARK_ADDED.
   */
  async addMark(
    store: AppStateStore,
    output: OutputAPIInterface,
    markData: Omit<MarkDTO, 'id'> & { id?: string }
  ): Promise<string> {
    const id = markData.id || generateMarkId();
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

    store.setState(draft => {
      if (draft.marks.has(mark.id)) {
        draft.marks.set(mark.id, mark);
      }
    });

    output.publish('MARK_UPDATED', mark);

    // Use debounced persist to prevent disk thrashing during dragging updates
    sessionService.persist(store, false);
  },

  /**
   * Deletes a mark from AppStateStore, cleans up associated whiteboard data in IndexedDB, and publishes MARK_DELETED.
   */
  async deleteMark(
    store: AppStateStore,
    output: OutputAPIInterface,
    markId: string
  ): Promise<void> {
    const pdfPath = store.getState().pdfPath;

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
      await WhiteboardRepository.deleteWhiteboard(markId, pdfPath || undefined);
    } catch (err) {
      console.warn(`[MarkService] Failed to clean up whiteboard data for deleted mark ${markId}:`, err);
    }
  },

  /**
   * Saves a whiteboard canvas snapshot to the file system and publishes WHITEBOARD_UPDATED.
   */
  async saveWhiteboardSnapshot(
    store: AppStateStore,
    output: OutputAPIInterface,
    markId: string,
    snapshot: any
  ): Promise<void> {
    const pdfPath = store.getState().pdfPath;
    // For global whiteboards pdfPath is null. WhiteboardRepository handles falling back to library folder
    await WhiteboardRepository.saveWhiteboard(markId, snapshot, pdfPath || undefined);
    output.publish('WHITEBOARD_UPDATED', { markId });
  }
};

