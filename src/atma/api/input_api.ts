import { MarkDTO } from './dtos';
import { AppStateStore } from '../app_state_store';
import { OutputAPIInterface } from './output_api';
import { sessionService } from '../services/session_service';
import { markService } from '../services/mark_service';

export interface InputAPIInterface {
  loadSession(pdfPath: string): Promise<void>;
  updateSplitter(leftPct: number): void;
  addMark(mark: Omit<MarkDTO, 'id'>): Promise<string>;
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
      return sessionService.loadSession(store, output, pdfPath);
    },

    async updateSplitter(leftPct: number): Promise<void> {
      sessionService.updateSplitter(store, output, leftPct);
    },

    addMark(mark: Omit<MarkDTO, 'id'>): Promise<string> {
      return markService.addMark(store, output, mark);
    },

    updateMark(mark: MarkDTO): Promise<void> {
      return markService.updateMark(store, output, mark);
    },

    deleteMark(markId: string): Promise<void> {
      return markService.deleteMark(store, output, markId);
    },

    saveWhiteboardSnapshot(markId: string, snapshot: any): Promise<void> {
      return markService.saveWhiteboardSnapshot(output, markId, snapshot);
    }
  };
}
