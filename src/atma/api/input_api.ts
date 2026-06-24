import { MarkDTO } from '../../shared_doman_models_and_dtos/dtos';
import { AppStateStore } from '../app_state_store';
import { OutputAPIInterface } from './output_api';
import { stateSyncService } from '../services/state_sync_service';
import { markService } from '../services/mark_service';
import { whiteboardService } from '../services/tldraw_service';

export interface InputAPIInterface {
  loadSession(pdfPath: string): Promise<void>;
  updateSplitter(leftPct: number): void;
  selectMark(markId: string | null): void;
  updateScrollTop(pdfPath: string, scrollTop: number): void;
  addMark(mark: Omit<MarkDTO, 'id'> & { id?: string }): Promise<string>;
  updateMark(mark: MarkDTO): Promise<void>;
  deleteMark(markId: string): Promise<void>;
  saveWhiteboardSnapshot(markId: string, snapshot: any): Promise<void>;
}

/**
 * Functional factory generating the InputAPI implementation.
 */
export function createInputAPI(
  store: AppStateStore, 
  output: OutputAPIInterface
): InputAPIInterface {
  return {
    loadSession(pdfPath: string): Promise<void> {
      return stateSyncService.loadSession(store, output, pdfPath);
    },

    async updateSplitter(leftPct: number): Promise<void> {
      store.setState(draft => { draft.leftPct = leftPct; });
    },

    selectMark(markId: string | null): void {
      store.setState(draft => { draft.selectedMarkId = markId; });
    },

    updateScrollTop(pdfPath: string, scrollTop: number): void {
      store.setState(draft => {
        if (draft.pdfPath === pdfPath) {
          draft.scrollTop = scrollTop;
        }
      });
    },

    addMark(mark: Omit<MarkDTO, 'id'> & { id?: string }): Promise<string> {
      return markService.addMark(store, output, mark);
    },

    updateMark(mark: MarkDTO): Promise<void> {
      return markService.updateMark(store, output, mark);
    },

    deleteMark(markId: string): Promise<void> {
      return markService.deleteMark(store, output, markId);
    },

    saveWhiteboardSnapshot(markId: string, snapshot: any): Promise<void> {
      return whiteboardService.saveWhiteboardSnapshot(store, output, markId, snapshot);
    }
  };
}
