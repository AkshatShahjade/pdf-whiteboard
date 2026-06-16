import { StateInitialValuesRepository } from './repositories/StateInitialValuesRepository';

/**
 * Developer Seed Data.
 * These are the hardcoded default values shipped with the app.
 * They populate the DEFAULT_INITIAL_VALUES (Scoped Presets) table exactly once 
 * when the database is created, or when the user resets all settings.
 */
const SEED_DEFAULTS = [
    // Defaulted
    { key: 'tool', scope: 'global', value: 'select', type: 'defaulted' },
    { key: 'currentDir', scope: 'global', value: null, type: 'defaulted' }, // Falls back to libraryPath's specific value dynamically
    
    // Personalized
    { key: 'zoom', scope: 'global', value: 1.0, type: 'personalizable' },
    { key: 'libraryPath', scope: 'global', value: null, type: 'personalizable' },
    { key: 'backupPath', scope: 'global', value: null, type: 'personalizable' },
    
    // Personalized (Document Scoped UI)
    { key: 'leftPct', scope: 'global', value: 50, type: 'personalizable' },
    { key: 'scrollTop', scope: 'global', value: 0, type: 'personalizable' },
    { key: 'selectedMarkId', scope: 'global', value: null, type: 'personalizable' },
    
    // Personalized (Document Scoped Content)
    { key: 'marks', scope: 'global', value: [], type: 'personalizable' }
];

/**
 * Initializes the DEFAULT_INITIAL_VALUES table with hardcoded fallback values.
 * Executed exactly once during database creation in `tauri_sqlite.ts`.
 * @param forceReset - If true, overwrites existing defaults with these hardcoded ones.
 */
export async function initializeStateDefaults(forceReset: boolean) {
    if (!forceReset) {
        return;
    }

    console.log('[StateInitializer] Seeding default initial values into Scoped Presets...');
    
    try {
        for (const preset of SEED_DEFAULTS) {
            await StateInitialValuesRepository.setDefaultValue(preset.key, preset.scope, preset.value, preset.type as any);
        }
        console.log('[StateInitializer] Successfully seeded Scoped Presets.');
    } catch (err) {
        console.error('[StateInitializer] Failed to seed default initial values:', err);
    }
}
