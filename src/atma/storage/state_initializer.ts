import { StateInitialValuesRepository } from './repositories/StateInitialValuesRepository.js';
import { tauriSqlAdapter } from './storage_implementations/tauri_sqlite.js';
import { DEFAULT_APP_STATE, DEFAULT_SLOT_APP_STATE } from '../app_state_store.js';
import { DatabaseAdapter } from './storage_adapter/database_interface.js';

/**
 * Developer Seed Data.
 * These are the hardcoded default values shipped with the app.
 * They populate the DEFAULT_INITIAL_VALUES (Scoped Presets) table exactly once 
 * when the database is created, or when the user resets all settings.
 */
const SEED_DEFAULTS = [
    // Defaulted
    { key: 'tool', scope: 'global', value: DEFAULT_SLOT_APP_STATE.tool, type: 'defaulted' },
    { key: 'currentDir', scope: 'global', value: null, type: 'defaulted' }, // Falls back to libraryPath's specific value dynamically
    
    // Personalized
    { key: 'zoom', scope: 'global', value: DEFAULT_SLOT_APP_STATE.zoom, type: 'personalizable' },
    { key: 'libraryPath', scope: 'global', value: DEFAULT_APP_STATE.libraryPath, type: 'personalizable' },
    { key: 'backupPath', scope: 'global', value: null, type: 'personalizable' },
    
    // Personalized (Document Scoped UI)
    { key: 'leftPct', scope: 'global', value: DEFAULT_APP_STATE.leftPct, type: 'personalizable' },
    { key: 'scrollTop', scope: 'global', value: DEFAULT_SLOT_APP_STATE.scrollTop, type: 'personalizable' },
    { key: 'selectedMarkId', scope: 'global', value: DEFAULT_SLOT_APP_STATE.selectedMarkId, type: 'personalizable' },
    
    // Personalized (Document Scoped Content)
    { key: 'marks', scope: 'global', value: [], type: 'personalizable' },

    // Workspace Layout (Replaces SCREEN_INSTANCES and SLOT_INSTANCES)
    { key: 'workspace_layout', scope: 'global', value: DEFAULT_APP_STATE.workspace_layout, type: 'personalizable' },

    // Global Settings & Recents
    { key: 'settings', scope: 'global', value: { defaultSplit: 50, theme: 'dark', autosaveMs: 800, maxGlobalPdfTools: 8, defaultTool: 'draw' }, type: 'personalizable' },
    { key: 'recents', scope: 'global', value: [], type: 'personalizable' }
];

/**
 * Initializes the DEFAULT_INITIAL_VALUES table with hardcoded fallback values.
 * Executed during database creation or application startup to ensure all defaults exist.
 * @param forceReset - If true, overwrites existing defaults with these hardcoded ones.
 */
export async function initializeStateDefaults(forceReset: boolean, adapter: DatabaseAdapter = tauriSqlAdapter) {
    console.log(`[StateInitializer] Checking/seeding default initial values (forceReset: ${forceReset})...`);
    
    try {
        for (const preset of SEED_DEFAULTS) {
            let shouldSet = forceReset;
            if (!shouldSet) {
                const results = await adapter.select<any>(
                    `SELECT 1 FROM DEFAULT_INITIAL_VALUES WHERE key = ? AND scope = ?`,
                    [preset.key, preset.scope]
                );
                shouldSet = results.length === 0;
            }
            if (shouldSet) {
                console.log(`[StateInitializer] Seeding default for key="${preset.key}", scope="${preset.scope}"`);
                await StateInitialValuesRepository.setDefaultValue(preset.key, preset.scope, preset.value, preset.type as any, adapter);
            }
        }
        console.log('[StateInitializer] Seeding check complete.');
    } catch (err) {
        console.error('[StateInitializer] Failed to seed default initial values:', err);
    }
}
