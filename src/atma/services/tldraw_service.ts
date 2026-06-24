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
    markId: string,
    snapshot: any
  ): Promise<void> {
    const pdfPath = store.getState().pdfPath;
    // For global whiteboards pdfPath is null. WhiteboardRepository handles falling back to library folder
    await WhiteboardRepository.saveWhiteboard(markId, snapshot, pdfPath || undefined);
    output.publish('WHITEBOARD_UPDATED', { markId });
  }
};