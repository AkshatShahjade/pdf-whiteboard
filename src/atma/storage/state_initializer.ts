import { StateInitialValuesRepository } from './repositories/StateInitialValuesRepository.js';
import { tauriSqlAdapter } from './storage_implementations/tauri_sqlite.js';
import { DatabaseAdapter } from './storage_adapter/database_interface.js';
import { stateSchemaRegistry } from './state_schema_registry.js';

/**
 * Initializes the DEFAULT_INITIAL_VALUES table with hardcoded fallback values.
 * Executed during database creation or application startup to ensure all defaults exist.
 * This is now powered entirely by the distributed State Schema Registry.
 * 
 * @param forceReset - If true, overwrites existing defaults with these hardcoded ones.
 */
export async function initializeStateDefaults(forceReset: boolean, adapter: DatabaseAdapter = tauriSqlAdapter) {
    console.log(`[StateInitializer] Checking/seeding default initial values from Schema Registry (forceReset: ${forceReset})...`);
    
    try {
        const schemas = Object.values(stateSchemaRegistry);

        for (const schema of schemas) {
            let shouldSet = forceReset;
            
            // Note: Currently in Layer 2 (DEFAULT_INITIAL_VALUES), 'scope' is stored as a string.
            // When seeding the initial developer defaults, we seed them at the 'global' scope.
            const seedScope = 'global';

            if (!shouldSet) {
                const results = await adapter.select<any>(
                    `SELECT 1 FROM DEFAULT_INITIAL_VALUES WHERE key = ? AND scope = ?`,
                    [schema.key, seedScope]
                );
                shouldSet = results.length === 0;
            }

            if (shouldSet) {
                console.log(`[StateInitializer] Seeding default for key="${schema.key}", scope="${seedScope}"`);
                await StateInitialValuesRepository.setDefaultValue(
                    schema.key, 
                    seedScope, 
                    schema.seed_default_value, 
                    schema.classification as any, 
                    adapter
                );
            }
        }
        console.log('[StateInitializer] Seeding check complete.');
    } catch (err) {
        console.error('[StateInitializer] Failed to seed default initial values:', err);
    }
}
