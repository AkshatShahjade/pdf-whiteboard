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
    slotId: string,
    markData: Omit<MarkDTO, 'id'> & { id?: string }
  ): Promise<string> {
    const id = markData.id || generateMarkId();
    const newMark: MarkDTO = {
      ...markData,
      id
    } as MarkDTO;


    const contentId = store.getState().slots[slotId]?.contentId;

    store.setState(draft => {
      for (const slot of Object.values(draft.slots)) {
        if (slot && slot.contentId === contentId) {
          slot.marks.set(id, newMark);
        }
      }
    });

    output.publish('MARK_ADDED', { ...newMark, contentId: contentId || '' });

    // Persist relational data directly
    if (contentId) {
      try {
        await MarkRepository.upsertMarks(contentId, Array.from(store.getState().slots[slotId].marks.values()));
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
    slotId: string,
    mark: MarkDTO
  ): Promise<void> {

    const contentId = store.getState().slots[slotId]?.contentId;

    store.setState(draft => {
      for (const slot of Object.values(draft.slots)) {
        if (slot && slot.contentId === contentId) {
          slot.marks.set(mark.id, mark);
        }
      }
    });

    output.publish('MARK_UPDATED', { ...mark, contentId: contentId || '' });

    // Persist relational data directly
    if (contentId) {
      try {
        // We might want to debounce this in the future for rapid dragging, 
        // but explicit data writes are safer done immediately or handled specifically.
        await MarkRepository.upsertMarks(contentId, Array.from(store.getState().slots[slotId].marks.values()));
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
    slotId: string,
    markId: string
  ): Promise<void> {
    const contentId = store.getState().slots[slotId]?.contentId;

    store.setState(draft => {
      for (const slot of Object.values(draft.slots)) {
        if (slot && slot.contentId === contentId) {
          slot.marks.delete(markId);
          if (slot.selectedMarkId === markId) {
            slot.selectedMarkId = null;
          }
        }
      }
    });

    output.publish('MARK_DELETED', { markId, contentId: contentId || '' });

    // Delete relational data directly
    // Note: Assuming MarkRepository has a deleteMark method. If not, it needs to be implemented.
    if (contentId) {
      try {
        // If the repository doesn't have a single-mark delete yet, we could just rewrite all marks:
        // await MarkRepository.upsertMarks(contentId, Array.from(store.getState().slots[slotId].marks.values()));
        // But for safety and correctness, we will do full sync for now:
        const marks = store.getState().slots[slotId]?.marks;
        if (marks) {
          await MarkRepository.upsertMarks(contentId, Array.from(marks.values()));
        }
      } catch (err) {
        console.error(`[MarkService] Failed to persist deletion of mark ${markId}:`, err);
      }
    }

    try {
      await WhiteboardRepository.deleteWhiteboard(markId, contentId || undefined);
    } catch (err) {
      console.warn(`[MarkService] Failed to clean up whiteboard data for deleted mark ${markId}:`, err);
    }
  },
};

