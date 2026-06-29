import { tauriSqlAdapter } from './storage_implementations/tauri_sqlite';
import { DatabaseAdapter } from './storage_adapter/database_interface';

/**
 * Purges all specific values for a state variable.
 * Used when a user changes a setting from 'personalizable' to 'defaulted', 
 * meaning their specific session overrides should be thrown away.
 */
export async function purgeDowngradedClassification(
    key: string,
    dbAdapter: DatabaseAdapter = tauriSqlAdapter
) {
    try {
        await dbAdapter.execute(
            `DELETE FROM SPECIFIC_INITIAL_VALUES WHERE key = ?`,
            [key]
        );
        console.log(`[GarbageCollector] Purged specific values for downgraded key: ${key}`);
    } catch (err) {
        console.error(`[GarbageCollector] Failed to purge downgraded key ${key}:`, err);
    }
}

/**
 * Scans the database and removes any rows tied to a scope that no longer exists in the active workspace or registries.
 * 
 * @param validContentIds Array of all existing document/content UUIDs in the library
 * @param validContentTypes Array of all registered content types (e.g. ['pdf', 'whiteboard'])
 * @param validSlotTypes Array of all registered slot types (e.g. ['verticalPane'])
 * @param validScreenIds Array of all screen UUIDs in the entire saved workspace layout
 * @param validSlotIds Array of all slot UUIDs across all saved screens
 */
export async function runGarbageCollection(
    validContentIds: string[],
    validContentTypes: string[],
    validSlotTypes: string[],
    validScreenIds: string[],
    validSlotIds: string[],
    dbAdapter: DatabaseAdapter = tauriSqlAdapter
) {
    try {
        console.log('[GarbageCollector] Starting scope garbage collection...');
        
        // Fetch all distinct scopes currently in the DB (from both tables)
        const specificScopes = await dbAdapter.select<{scope: string}>(`SELECT DISTINCT scope FROM SPECIFIC_INITIAL_VALUES`);
        const defaultScopes = await dbAdapter.select<{scope: string}>(`SELECT DISTINCT scope FROM DEFAULT_INITIAL_VALUES`);
        
        const allScopes = new Set<string>();
        specificScopes.forEach(r => allScopes.add(r.scope));
        defaultScopes.forEach(r => allScopes.add(r.scope));

        const scopesToDelete: string[] = [];

        for (const scope of allScopes) {
            if (scope === 'global') continue;

            const parts = scope.split(':');
            if (parts.length !== 2) continue; // Malformed scope, ignore.

            const prefix = parts[0];
            const id = parts[1];

            let isValid = true;
            if (prefix === 'content') {
                isValid = validContentIds.includes(id);
            } else if (prefix === 'contentType') {
                isValid = validContentTypes.includes(id);
            } else if (prefix === 'slotType') {
                isValid = validSlotTypes.includes(id);
            } else if (prefix === 'screen') {
                isValid = validScreenIds.includes(id);
            } else if (prefix === 'slot') {
                isValid = validSlotIds.includes(id);
            }

            if (!isValid) {
                scopesToDelete.push(scope);
            }
        }

        if (scopesToDelete.length > 0) {
            console.log(`[GarbageCollector] Found ${scopesToDelete.length} orphaned scopes. Purging...`, scopesToDelete);
            
            const placeholders = scopesToDelete.map(() => '?').join(',');
            
            await dbAdapter.execute(
                `DELETE FROM SPECIFIC_INITIAL_VALUES WHERE scope IN (${placeholders})`,
                scopesToDelete
            );
            await dbAdapter.execute(
                `DELETE FROM DEFAULT_INITIAL_VALUES WHERE scope IN (${placeholders})`,
                scopesToDelete
            );
            
            console.log('[GarbageCollector] Purge complete.');
        } else {
            console.log('[GarbageCollector] No orphaned scopes found. DB is clean.');
        }
        
    } catch (err) {
        console.error('[GarbageCollector] Execution failed:', err);
    }
}
