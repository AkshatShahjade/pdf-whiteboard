import { tauriSqlAdapter } from '../storage_implementations/tauri_sqlite';

export type StateInitialValueType = 'volatile' | 'defaulted' | 'personalized';

/**
 * Fast, non-cryptographic string hashing algorithm (FNV-1a 32-bit).
 * Perfect for generating quick hashes of stringified JSON objects.
 */
function fnv1aHash(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    // Return unsigned 32-bit hex
    return (hash >>> 0).toString(16);
}

export const StateInitialValuesRepository = {
    /**
     * Retrieves an initial value based on its type and scopes.
     * @param type - volatile, defaulted, or personalized
     * @param key - The unique state key
     * @param scopes - Array of scopes in order of specificity (e.g. ['doc:123', 'global'])
     * @throws Error if type is not volatile and no default value exists in the database.
     */
    async getInitialValue<T>(
        type: StateInitialValueType,
        key: string,
        scopes: string[] = ['global']
    ): Promise<T> {
        if (type === 'volatile') {
            throw new Error(`[StateInitialValuesRepository] getInitialValue called for volatile key "${key}". Volatile values should not be fetched from persistence.`);
        }

        // 1. Fetch the most specific default value from DB by iterating through scopes
        let defaultJson: string | null = null;
        let defaultHash: string | null = null;
        
        for (const scope of scopes) {
            const defaultResults = await tauriSqlAdapter.select<{value_json: string, value_hash: string}>(
                `SELECT value_json, value_hash FROM DEFAULT_INITIAL_VALUES WHERE key = ? AND scope = ?`,
                [key, scope]
            );
            
            if (defaultResults.length > 0) {
                defaultJson = defaultResults[0].value_json;
                defaultHash = defaultResults[0].value_hash;
                break; // Found the most specific default!
            }
        }

        if (defaultJson === null || defaultHash === null) {
            throw new Error(`[StateInitialValuesRepository] Missing default value for key "${key}" across scopes: ${scopes.join(', ')}. Cannot resolve defaulted/personalized state without a base default.`);
        }

        if (type === 'defaulted') {
            return JSON.parse(defaultJson);
        }

        // 2. If personalized, query specific values in order of specificity
        if (type === 'personalized') {
            for (const scope of scopes) {
                const specificResults = await tauriSqlAdapter.select<{value_json: string, based_on_default_hash: string}>(
                    `SELECT value_json, based_on_default_hash FROM SPECIFIC_INITIAL_VALUES WHERE key = ? AND scope = ?`,
                    [key, scope]
                );

                if (specificResults.length > 0) {
                    const specific = specificResults[0];
                    // 3. Hash invalidation check
                    if (specific.based_on_default_hash === defaultHash) {
                        return JSON.parse(specific.value_json);
                    } else {
                        // console.warn(`[StateInitialValuesRepository] Hash mismatch for specific value (key: ${key}, scope: ${scope}). Default was changed. Resetting to default.`);
                        // Delete the stale specific value to clean up the database
                        await tauriSqlAdapter.execute(
                            `DELETE FROM SPECIFIC_INITIAL_VALUES WHERE key = ? AND scope = ?`,
                            [key, scope]
                        );
                        // We do not return here; we let the loop continue or fall back to default
                    }
                }
            }

            // Fallback to default if no valid specific value found in any scope
            return JSON.parse(defaultJson);
        }

        throw new Error(`[StateInitialValuesRepository] Invalid StateInitialValueType: ${type}`);
    },

    /**
     * Updates the default value. If it changes, the hash updates, automatically
     * invalidating any specific values that were based on the old default.
     */
    async setDefaultValue<T>(key: string, scope: string, value: T, type: 'personalizable' | 'defaulted'): Promise<void> {
        const valueJson = JSON.stringify(value);
        const valueHash = fnv1aHash(valueJson);

        await tauriSqlAdapter.execute(
            `INSERT INTO DEFAULT_INITIAL_VALUES (key, scope, value_json, value_hash, type) 
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(key, scope) DO UPDATE SET 
                value_json = excluded.value_json,
                value_hash = excluded.value_hash,
                type = excluded.type`,
            [key, scope, valueJson, valueHash, type]
        );
    },

    /**
     * Sets a specific personalized value for a given scope.
     * @throws Error if no default exists to base this specific value on.
     */
    async setSpecificValue<T>(key: string, scopes: string[], value: T): Promise<void> {
        if (scopes.length === 0) {
            throw new Error(`[StateInitialValuesRepository] No scopes provided to setSpecificValue for key "${key}"`);
        }
        
        const saveScope = scopes[0]; // Save to the most specific scope

        // 1. Fetch current default hash to record what we are diverging from
        let defaultHash: string | null = null;
        for (const scope of scopes) {
            const defaultResults = await tauriSqlAdapter.select<{value_hash: string}>(
                `SELECT value_hash FROM DEFAULT_INITIAL_VALUES WHERE key = ? AND scope = ?`,
                [key, scope]
            );
            if (defaultResults.length > 0) {
                defaultHash = defaultResults[0].value_hash;
                break;
            }
        }

        if (defaultHash === null) {
            throw new Error(`[StateInitialValuesRepository] Cannot set specific value for key "${key}". No default value exists across scopes: ${scopes.join(', ')}.`);
        }
        const valueJson = JSON.stringify(value);

        // 2. Upsert specific value
        await tauriSqlAdapter.execute(
            `INSERT INTO SPECIFIC_INITIAL_VALUES (key, scope, value_json, based_on_default_hash)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(key, scope) DO UPDATE SET 
                value_json = excluded.value_json,
                based_on_default_hash = excluded.based_on_default_hash`,
            [key, saveScope, valueJson, defaultHash]
        );
    },

    /**
     * Retrieves a mapping of all registered keys to their types from the default values table.
     */
    async getAllKeyTypes(): Promise<Record<string, string>> {
        const results = await tauriSqlAdapter.select<{key: string, type: string}>(
            `SELECT key, type FROM DEFAULT_INITIAL_VALUES`
        );
        const map: Record<string, string> = {};
        for (const row of results) {
            map[row.key] = row.type;
        }
        return map;
    }
};
