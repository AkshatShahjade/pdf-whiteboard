import { MarkDTO, SessionDTO } from '../../shared_doman_models_and_dtos/dtos';
import { AppStateStore } from '../app_state_store';
import { WhiteboardRepository } from '../storage/repositories/WhiteboardRepository';
import { StateInitialValuesRepository } from '../storage/repositories/StateInitialValuesRepository';

export interface QueryAPIInterface {
  getCurrentSession(): SessionDTO | null;
  getMark(markId: string): MarkDTO | null;
  getAllMarks(): MarkDTO[];
  getWhiteboardSnapshot(markId: string): Promise<any | null>;
  getSettings(): Promise<any>;
  getRecents(): Promise<any[]>;
  getLibraryPath(): Promise<string | null>;
  getBackupPath(): Promise<string | null>;
}

/**
 * Functional factory generating the QueryAPI implementation.
 */
export function createQueryAPI(store: AppStateStore): QueryAPIInterface {
  return {
    getCurrentSession(): SessionDTO | null {
      const state = store.getState();
      if (!state.pdfPath) return null;
      
      return {
        pdfPath: state.pdfPath,
        leftPct: state.leftPct,
        selectedMarkId: state.selectedMarkId,
        scrollTop: state.scrollTop,
        marks: Array.from(state.marks.values())
      };
    },

    getMark(markId: string): MarkDTO | null {
      const state = store.getState();
      return state.marks.get(markId) ?? null;
    },

    getAllMarks(): MarkDTO[] {
      const state = store.getState();
      return Array.from(state.marks.values());
    },

    getWhiteboardSnapshot(markId: string): Promise<any | null> {
      const pdfPath = store.getState().pdfPath;
      return WhiteboardRepository.loadWhiteboard(markId, pdfPath || undefined);
    },

    getSettings(): Promise<any> {
      return StateInitialValuesRepository.getInitialValue('personalized', 'settings', ['global']);
    },

    getRecents(): Promise<any[]> {
      return StateInitialValuesRepository.getInitialValue('personalized', 'recents', ['global']);
    },

    getLibraryPath(): Promise<string | null> {
      return StateInitialValuesRepository.getInitialValue<string | null>('personalized', 'libraryPath', ['global']);
    },

    getBackupPath(): Promise<string | null> {
      return StateInitialValuesRepository.getInitialValue<string | null>('personalized', 'backupPath', ['global']);
    }
  };
}
