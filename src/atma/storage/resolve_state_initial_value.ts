import { tauriSqlAdapter } from './storage_implementations/tauri_sqlite';
import { DatabaseAdapter } from './storage_adapter/database_interface';
import { getSchema, CascadePath } from './state_schema_registry';

export interface StateVariableContext {
    screenId?: string;
    slotId?: string;
    slotType?: string;
    contentId?: string;
    contentType?: string;
}

export interface DefaultCacheEntry {
    value: any;
    hash: string;
}

export interface SpecificCacheEntry {
    value: any;
    based_on_default_hash: string;
}

export interface StateCache {
    specificValues: Map<string, SpecificCacheEntry>; // Key: `${scope}|${variable_key}`
    defaultValues: Map<string, DefaultCacheEntry>;   // Key: `${scope}|${variable_key}`
}

/**
 * Creates an empty StateCache dictionary.
 */
export function createStateCache(): StateCache {
    return {
        specificValues: new Map(),
        defaultValues: new Map()
    };
}

/**
 * Fetches all specific and default values for the given active scopes in a single batch query.
 * This should be called once when a Roopa Screen loads.
 * 
 * @param activeScopes An array of all active scopes in the layout (e.g. ['global', 'screen:uuid', 'slot:left'])
 * @param dbAdapter The database adapter
 */
export async function hydrateStateCache(
    activeScopes: string[], 
    dbAdapter: DatabaseAdapter = tauriSqlAdapter
): Promise<StateCache> {
    const cache = createStateCache();

    if (activeScopes.length === 0) {
        return cache;
    }

    // SQLite doesn't strictly support dynamic array binding for IN (?) easily in this plugin wrapper,
    // so we construct the placeholders dynamically.
    const placeholders = activeScopes.map(() => '?').join(',');

    try {
        // Fetch specifics
        const specificRows = await dbAdapter.select<{key: string, scope: string, value_json: string, based_on_default_hash: string}>(
            `SELECT key, scope, value_json, based_on_default_hash 
             FROM SPECIFIC_INITIAL_VALUES 
             WHERE scope IN (${placeholders})`,
            activeScopes
        );
        for (const row of specificRows) {
            cache.specificValues.set(`${row.scope}|${row.key}`, {
                value: JSON.parse(row.value_json),
                based_on_default_hash: row.based_on_default_hash
            });
        }

        // Fetch defaults
        const defaultRows = await dbAdapter.select<{key: string, scope: string, value_json: string, value_hash: string}>(
            `SELECT key, scope, value_json, value_hash 
             FROM DEFAULT_INITIAL_VALUES 
             WHERE scope IN (${placeholders})`,
            activeScopes
        );
        for (const row of defaultRows) {
            cache.defaultValues.set(`${row.scope}|${row.key}`, {
                value: JSON.parse(row.value_json),
                hash: row.value_hash
            });
        }
    } catch (err) {
        console.error('[hydrateStateCache] Failed to hydrate cache:', err);
    }

    return cache;
}

/**
 * Generates the sequence of cascade scopes to check based on the schema's tree path and the current context.
 */
function generateCascadeScopes(cascadePath: CascadePath, context: StateVariableContext): string[] {
    const scopes: string[] = [];
    
    if (cascadePath === 'content_tree') {
        if (context.contentId) scopes.push(`content:${context.contentId}`);
        if (context.contentType) scopes.push(`contentType:${context.contentType}`);
        if (context.screenId) scopes.push(`screen:${context.screenId}`);
        scopes.push('global');
    } else if (cascadePath === 'slot_tree') {
        if (context.slotId) scopes.push(`slot:${context.slotId}`);
        if (context.slotType) scopes.push(`slotType:${context.slotType}`);
        if (context.screenId) scopes.push(`screen:${context.screenId}`);
        scopes.push('global');
    }
    
    return scopes;
}

/**
 * Synchronously resolves the initial value of a state variable.
 * Uses the StateSchemaRegistry to determine classification and cascade paths, 
 * and pulls the actual value from the pre-hydrated StateCache.
 * 
 * @param key The variable key (e.g. 'zoom')
 * @param context The current UI position (e.g. { contentId: 'xyz' })
 * @param cache The pre-hydrated StateCache
 */
export function resolveStateValue(key: string, context: StateVariableContext, cache: StateCache): any {
    const schema = getSchema(key);
    
    if (!schema) {
        console.warn(`[resolveStateValue] Unregistered state variable key "${key}". Returning undefined.`);
        return undefined;
    }

    if (schema.classification === 'volatile') {
        return schema.seed_default_value;
    }

    const cascadeScopes = generateCascadeScopes(schema.cascade_path, context);

    // 1. Find the active Default Hash (needed to validate Specific values)
    let activeDefaultHash: string | null = null;
    let activeDefaultValue: any = null;

    for (const scope of cascadeScopes) {
        const cacheKey = `${scope}|${key}`;
        if (cache.defaultValues.has(cacheKey)) {
            const entry = cache.defaultValues.get(cacheKey)!;
            activeDefaultHash = entry.hash;
            activeDefaultValue = entry.value;
            break; // Stop at the most specific default
        }
    }

    // 2. Try to find a valid Specific Value (if personalizable)
    if (schema.classification === 'personalizable') {
        for (const scope of cascadeScopes) {
            const cacheKey = `${scope}|${key}`;
            if (cache.specificValues.has(cacheKey)) {
                const entry = cache.specificValues.get(cacheKey)!;
                
                // Hash validation check
                if (entry.based_on_default_hash === activeDefaultHash) {
                    return entry.value;
                } else {
                    console.warn(`[resolveStateValue] Hash mismatch for key "${key}" at scope "${scope}". The default value was modified. Reverting to default.`);
                    // We do not lazily delete from the DB here because this is a synchronous pure function.
                    // The specific value is ignored and we fall through to the default.
                }
            }
        }
    }

    // 3. Fallback to Default Value
    if (activeDefaultValue !== null) {
        return activeDefaultValue;
    }

    // 4. Ultimate fallback to Developer Seed
    return schema.seed_default_value;
}
