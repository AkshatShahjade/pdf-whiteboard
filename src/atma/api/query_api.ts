import { MarkDTO, SessionDTO } from '../../shared_doman_models_and_dtos/dtos';
import { AppStateStore } from '../app_state_store';
import { WhiteboardRepository } from '../storage/repositories/WhiteboardRepository';
import { StateInitialValuesRepository } from '../storage/repositories/StateInitialValuesRepository';
import { RoopaWorkspaceRepository } from '../storage/repositories/RoopaWorkspaceRepository';

export interface QueryAPIInterface {
  getCurrentSession(): SessionDTO | null;
  getMark(slotId: string, markId: string): MarkDTO | null;
  getAllMarks(slotId: string): MarkDTO[];
  getWhiteboardSnapshot(slotId: string | null, markId: string): Promise<any | null>;
  getSettings(): Promise<any>;
  getRecents(): Promise<any[]>;
  getLibraryPath(): Promise<string | null>;
  getBackupPath(): Promise<string | null>;
  getWorkspaceLayout(id: string): Promise<any | null>;
  getAllWorkspaces(): Promise<{id: string, name: string}[]>;
  getAllStateDefaults(): Promise<any[]>;
}

/**
 * Functional factory generating the QueryAPI implementation.
 */
export function createQueryAPI(store: AppStateStore): QueryAPIInterface {
  return {
    getCurrentSession(): SessionDTO {
      const state = store.getState();
      
      const slotsDto: Record<string, any> = {};
      for (const [slotId, slotState] of Object.entries(state.slots)) {
        slotsDto[slotId] = {
          ...slotState,
          marks: Array.from(slotState.marks.values())
        };
      }

      return {
        dualSplitPaneLeftPct: state.dualSplitPaneLeftPct,
        slots: slotsDto
      };
    },

    getMark(slotId: string, markId: string): MarkDTO | null {
      const state = store.getState();
      const slot = state.slots[slotId];
      if (!slot) return null;
      return slot.marks.get(markId) ?? null;
    },

    getAllMarks(slotId: string): MarkDTO[] {
      const state = store.getState();
      const slot = state.slots[slotId];
      if (!slot) return [];
      return Array.from(slot.marks.values());
    },

    getWhiteboardSnapshot(slotId: string | null, markId: string): Promise<any | null> {
      return WhiteboardRepository.loadWhiteboard(markId);
    },

    async getSettings(): Promise<any> {
      const theme = await StateInitialValuesRepository.getInitialValue('personalized', 'theme', ['global']);
      const autosaveMs = await StateInitialValuesRepository.getInitialValue('personalized', 'autosaveMs', ['global']);
      const maxGlobalPdfTools = await StateInitialValuesRepository.getInitialValue('personalized', 'maxGlobalPdfTools', ['global']);
      const defaultTool = await StateInitialValuesRepository.getInitialValue('personalized', 'defaultTool', ['global']);
      const activeWorkspaceId = await StateInitialValuesRepository.getInitialValue('personalized', 'activeWorkspaceId', ['global']);

      return {
        theme,
        autosaveMs,
        maxGlobalPdfTools,
        defaultTool,
        activeWorkspaceId
      };
    },

    getRecents(): Promise<any[]> {
      return StateInitialValuesRepository.getInitialValue('personalized', 'recents', ['global']);
    },

    getLibraryPath(): Promise<string | null> {
      return StateInitialValuesRepository.getInitialValue<string | null>('personalized', 'libraryPath', ['global']);
    },

    getBackupPath(): Promise<string | null> {
      return StateInitialValuesRepository.getInitialValue<string | null>('personalized', 'backupPath', ['global']);
    },

    getWorkspaceLayout(id: string): Promise<any | null> {
      return RoopaWorkspaceRepository.getWorkspaceLayout(id);
    },

    getAllWorkspaces(): Promise<{id: string, name: string}[]> {
      return RoopaWorkspaceRepository.getAllWorkspaces();
    },

    getAllStateDefaults(): Promise<any[]> {
      return StateInitialValuesRepository.getAllDefaults();
    }
  };
}
