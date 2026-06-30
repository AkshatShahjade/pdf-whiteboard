import { MarkDTO } from '../../shared_doman_models_and_dtos/dtos';
import { AppStateStore } from '../app_state_store';
import { OutputAPIInterface } from './output_api';
import { stateSyncService } from '../services/state_sync_service';
import { markService } from '../services/mark_service';
import { whiteboardService } from '../services/tldraw_service';
import { StateInitialValuesRepository } from '../storage/repositories/StateInitialValuesRepository';

export interface InputAPIInterface {
  loadSession(contentId: string, contentType: string, slotId?: string): Promise<void>;
  flushSession(): void;
  updateSplitter(dualSplitPaneLeftPct: number): void;
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
    updateDefaultValue(key: string, scope: string, value: any): Promise<void>;
    deleteDefaultValue(key: string, scope: string): Promise<void>;
    updateClassification(key: string, classification: 'personalizable' | 'defaulted'): Promise<void>;
}

/**
 * Functional factory generating the InputAPI implementation.
 */
export function createInputAPI(
  store: AppStateStore, 
  output: OutputAPIInterface
): InputAPIInterface {
  return {
    loadSession(contentId: string, contentType: string, slotId?: string): Promise<void> {
      return stateSyncService.loadSession(store, output, contentId, contentType, slotId);
    },

    flushSession(): void {
      stateSyncService.flushSession();
    },

    async updateSplitter(dualSplitPaneLeftPct: number): Promise<void> {
      store.setState(draft => { draft.dualSplitPaneLeftPct = dualSplitPaneLeftPct; });
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
      await StateInitialValuesRepository.setSpecificValue('theme', ['global'], settings.theme);
      await StateInitialValuesRepository.setSpecificValue('autosaveMs', ['global'], settings.autosaveMs);
      await StateInitialValuesRepository.setSpecificValue('maxGlobalPdfTools', ['global'], settings.maxGlobalPdfTools);
      await StateInitialValuesRepository.setSpecificValue('defaultTool', ['global'], settings.defaultTool);
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
    },

    async updateDefaultValue(key: string, scope: string, value: any): Promise<void> {
      const { StateInitialValuesRepository } = await import('../storage/repositories/StateInitialValuesRepository');
      await StateInitialValuesRepository.setDefaultValue(key, scope, value, 'defaulted');
    },

    async deleteDefaultValue(key: string, scope: string): Promise<void> {
      const { StateInitialValuesRepository } = await import('../storage/repositories/StateInitialValuesRepository');
      await StateInitialValuesRepository.deleteDefault(key, scope);
    },

    async updateClassification(key: string, classification: 'personalizable' | 'defaulted'): Promise<void> {
      // 1. Update the in-memory schema registry
      const { stateSchemaRegistry } = await import('../storage/state_schema_registry');
      if (stateSchemaRegistry[key]) {
          stateSchemaRegistry[key].classification = classification;
      }
      
      // 2. Persist the override
      const { StateInitialValuesRepository } = await import('../storage/repositories/StateInitialValuesRepository');
      let overrides: Record<string, string> = {};
      try {
          const overridesStr = await StateInitialValuesRepository.getInitialValue<Record<string, string>>('defaulted', '_classification_overrides', ['global']);
          if (overridesStr) overrides = overridesStr;
      } catch (err) {
          // It's perfectly fine if the base default doesn't exist yet, it just means we have no overrides.
      }
      
      overrides[key] = classification;
      
      // IMPORTANT: setDefaultValue requires a 4th argument: type ('personalizable' | 'defaulted')
      await StateInitialValuesRepository.setDefaultValue('_classification_overrides', 'global', overrides, 'defaulted');
      
      // 3. If downgraded to defaulted, purge all specific values
      if (classification === 'defaulted') {
          const { purgeDowngradedClassification } = await import('../storage/garbage_collector');
          await purgeDowngradedClassification(key);
      }
    }
  };
}
