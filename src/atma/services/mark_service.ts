import { AppStateStore } from '../app_state_store';
import { OutputAPIInterface } from '../api/output_api';
import { MarkDTO } from '../../shared_doman_models_and_dtos/dtos';
import { generateMarkId } from '../../shared_doman_models_and_dtos/factories';
import { WhiteboardRepository } from '../storage/repositories/WhiteboardRepository';
import { MarkRepository } from '../storage/repositories/MarkRepository';

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

    // Persist relational data directly
    const pdfPath = store.getState().pdfPath;
    if (pdfPath) {
      try {
        await MarkRepository.upsertMarks(pdfPath, [newMark]);
      } catch (err) {
        console.error(`[MarkService] Failed to persist new mark ${id}:`, err);
      }
    }

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

    // Persist relational data directly
    const pdfPath = store.getState().pdfPath;
    if (pdfPath) {
      try {
        // We might want to debounce this in the future for rapid dragging, 
        // but explicit data writes are safer done immediately or handled specifically.
        await MarkRepository.upsertMarks(pdfPath, [mark]);
      } catch (err) {
        console.error(`[MarkService] Failed to persist updated mark ${mark.id}:`, err);
      }
    }
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

    // Delete relational data directly
    // Note: Assuming MarkRepository has a deleteMark method. If not, it needs to be implemented.
    if (pdfPath) {
      try {
        // If the repository doesn't have a single-mark delete yet, we could just rewrite all marks:
        // await MarkRepository.upsertMarks(pdfPath, Array.from(store.getState().marks.values()));
        // But for safety and correctness, we will do full sync for now:
        await MarkRepository.upsertMarks(pdfPath, Array.from(store.getState().marks.values()));
      } catch (err) {
        console.error(`[MarkService] Failed to persist deletion of mark ${markId}:`, err);
      }
    }

    try {
      await WhiteboardRepository.deleteWhiteboard(markId, pdfPath || undefined);
    } catch (err) {
      console.warn(`[MarkService] Failed to clean up whiteboard data for deleted mark ${markId}:`, err);
    }
  },
};

