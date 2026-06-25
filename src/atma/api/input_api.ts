import { MarkDTO } from '../../shared_doman_models_and_dtos/dtos';
import { AppStateStore } from '../app_state_store';
import { OutputAPIInterface } from './output_api';
import { stateSyncService } from '../services/state_sync_service';
import { markService } from '../services/mark_service';
import { whiteboardService } from '../services/tldraw_service';
import { StateInitialValuesRepository } from '../storage/repositories/StateInitialValuesRepository';

export interface InputAPIInterface {
  loadSession(pdfPath: string): Promise<void>;
  flushSession(): void;
  updateSplitter(leftPct: number): void;
  selectMark(slotId: string, markId: string | null): void;
  updateScrollTop(slotId: string, scrollTop: number): void;
  addMark(slotId: string, mark: Omit<MarkDTO, 'id'> & { id?: string }): Promise<string>;
  updateMark(slotId: string, mark: MarkDTO): Promise<void>;
  deleteMark(slotId: string, markId: string): Promise<void>;
  saveWhiteboardSnapshot(slotId: string | null, markId: string, snapshot: any): Promise<void>;
  saveSettings(settings: any): Promise<void>;
  saveRecents(recents: any[]): Promise<void>;
  saveLibraryPath(libraryPath: string | null): Promise<void>;
  saveBackupPath(backupPath: string | null): Promise<void>;
  updateZoom(slotId: string, zoom: number): void;
  updateTool(slotId: string, tool: string): void;
  updateSlotState(slotId: string, key: string, val: any): void;
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

    flushSession(): void {
      stateSyncService.flushSession();
    },

    async updateSplitter(leftPct: number): Promise<void> {
      store.setState(draft => { draft.leftPct = leftPct; });
    },

    selectMark(slotId: string, markId: string | null): void {
      store.setState(draft => { 
        if (draft.slots[slotId]) {
          draft.slots[slotId].selectedMarkId = markId; 
        }
      });
    },

    updateScrollTop(slotId: string, scrollTop: number): void {
      store.setState(draft => {
        if (draft.slots[slotId]) {
          draft.slots[slotId].scrollTop = scrollTop;
        }
      });
    },

    addMark(slotId: string, mark: Omit<MarkDTO, 'id'> & { id?: string }): Promise<string> {
      return markService.addMark(store, output, slotId, mark);
    },

    updateMark(slotId: string, mark: MarkDTO): Promise<void> {
      return markService.updateMark(store, output, slotId, mark);
    },

    deleteMark(slotId: string, markId: string): Promise<void> {
      return markService.deleteMark(store, output, slotId, markId);
    },

    saveWhiteboardSnapshot(slotId: string | null, markId: string, snapshot: any): Promise<void> {
      return whiteboardService.saveWhiteboardSnapshot(store, output, slotId, markId, snapshot);
    },

    async saveSettings(settings: any): Promise<void> {
      await StateInitialValuesRepository.setSpecificValue('settings', ['global'], settings);
    },

    async saveRecents(recents: any[]): Promise<void> {
      await StateInitialValuesRepository.setSpecificValue('recents', ['global'], recents);
    },

    async saveLibraryPath(libraryPath: string | null): Promise<void> {
      await StateInitialValuesRepository.setSpecificValue('libraryPath', ['global'], libraryPath);
    },

    async saveBackupPath(backupPath: string | null): Promise<void> {
      await StateInitialValuesRepository.setSpecificValue('backupPath', ['global'], backupPath);
    },

    updateZoom(slotId: string, zoom: number): void {
      store.setState(draft => { 
        if (draft.slots[slotId]) {
          draft.slots[slotId].zoom = zoom; 
        }
      });
    },

    updateTool(slotId: string, tool: string): void {
      store.setState(draft => { 
        if (draft.slots[slotId]) {
          draft.slots[slotId].tool = tool; 
        }
      });
    },

    updateSlotState(slotId: string, key: string, val: any): void {
      store.setState(draft => {
        if (draft.slots[slotId]) {
          (draft.slots[slotId] as any)[key] = val;
        }
      });
    }
  };
}
