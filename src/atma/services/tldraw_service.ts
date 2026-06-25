import { AppStateStore } from '../app_state_store';
import { OutputAPIInterface } from '../api/output_api';
import { WhiteboardRepository } from '../storage/repositories/WhiteboardRepository';

export const whiteboardService = {
    /**
   * Saves a whiteboard canvas snapshot to the file system and publishes WHITEBOARD_UPDATED.
   */
  async saveWhiteboardSnapshot(
    store: AppStateStore,
    output: OutputAPIInterface,
    slotId: string | null,
    markId: string,
    snapshot: any
  ): Promise<void> {
    const contentId = slotId ? store.getState().slots[slotId]?.contentId : null;
    // For global whiteboards contentId is null. WhiteboardRepository handles falling back to library folder
    await WhiteboardRepository.saveWhiteboard(markId, snapshot, contentId || undefined);
    output.publish('WHITEBOARD_UPDATED', { markId });
  }
};