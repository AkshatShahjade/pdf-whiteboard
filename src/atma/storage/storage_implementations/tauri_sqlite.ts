import Database from '@tauri-apps/plugin-sql';
import { DatabaseAdapter } from '../storage_adapter/database_interface';
import { SCHEMA_SQL, SEED_SQL } from './schema';
import { initializeStateDefaults } from '../state_initializer';

// Default SQLite connection string for Tauri plugin
const DB_URL = 'sqlite:lemmamap.db';

let dbInstance: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

async function initializeDatabaseIfEmpty(db: Database) {
    console.log('[tauri_sqlite] Checking if database needs initialization...');
    const initAdapter: DatabaseAdapter = {
        async execute(sql: string, bindValues?: unknown[]): Promise<void> {
            await db.execute(sql, bindValues);
        },
        async select<T>(sql: string, bindValues?: unknown[]): Promise<T[]> {
            return await db.select<T[]>(sql, bindValues);
        },
    };
    
    // Check if the DEFAULT_INITIAL_VALUES table exists by querying the SQLite master table
    const result = await db.select<{name: string}[]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='DEFAULT_INITIAL_VALUES';"
    );
    
    if (result.length === 0) {
        console.log('[tauri_sqlite] Database is empty or missing core tables. Executing schema commands...');
        
        try {
            await db.execute('BEGIN TRANSACTION;');

            // Remove SQL comments (anything starting with -- until the end of the line)
            const cleanSchema = SCHEMA_SQL.replace(/--.*$/gm, '');
            
            // Split the schema by semicolon into individual commands,
            // and remove newlines to prevent Tauri from misinterpreting them.
            const statements = cleanSchema.split(';')
                .map(s => s.replace(/\s+/g, ' ').trim())
                .filter(s => s.length > 0)
                .map(s => s+';')
                
            for (let i = 0; i < statements.length; i++) {
                const stmt = statements[i];
                console.log(`[tauri_sqlite] Executing statement ${i + 1}/${statements.length}:`, stmt.substring(0, 40) + '...');
                await db.execute(stmt);
            }
            console.log('[tauri_sqlite] Database schema initialization complete!');
            
            await runSeeds(db);

            // Seed the default state variables
            await initializeStateDefaults(true, initAdapter);

            await db.execute('COMMIT;');
        } catch (e) {
            console.error('[tauri_sqlite] Initialization failed, rolling back!', e);
            await db.execute('ROLLBACK;');
            throw e;
        }
    } else {
        console.log('[tauri_sqlite] Database already initialized. Ensuring missing defaults are seeded...');
        
        await runSeeds(db);
        
        await initializeStateDefaults(false, initAdapter);
    }
}

async function runSeeds(db: Database) {
    console.log('[tauri_sqlite] Running database seeds...');
    const cleanSeed = SEED_SQL.replace(/--.*$/gm, '');
    const statements = cleanSeed.split(';')
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(s => s.length > 0)
        .map(s => s+';')
        
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        console.log(`[tauri_sqlite] Executing seed ${i + 1}/${statements.length}:`, stmt.substring(0, 40) + '...');
        await db.execute(stmt);
    }

    // Seed the temporary Roopa layout
    console.log('[tauri_sqlite] Seeding temporary Roopa layout...');
    const result = await db.select<{id: string}[]>("SELECT id FROM ROOPA_WORKSPACES WHERE id = 'default_workspace'");
    if (result.length === 0) {
        const { TEMPORARY_ROOPA_LAYOUT } = await import('../../../roopa/temporary_layout');
        await db.execute(
            "INSERT INTO ROOPA_WORKSPACES (id, name, layout_json) VALUES (?, ?, ?)",
            [TEMPORARY_ROOPA_LAYOUT.workspaceId, TEMPORARY_ROOPA_LAYOUT.name, JSON.stringify(TEMPORARY_ROOPA_LAYOUT)]
        );
    }
}

async function getDb(): Promise<Database> {
    if (dbInstance) return dbInstance;
    
    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            console.log('[tauri_sqlite] Loading database:', DB_URL);
            try {
                const db = await Database.load(DB_URL);
                
                // Enable WAL (Write-Ahead Logging) mode on database startup.
                // This is persistent on the SQLite database file and allows concurrent reads/writes.
                try {
                    await db.execute('PRAGMA journal_mode = WAL;');
                } catch (e) {
                    console.warn('[tauri_sqlite] Failed to enable WAL mode:', e);
                }
                
                // Call the initialization function exactly once when the connection is established.
                await initializeDatabaseIfEmpty(db);

                // Publish the shared instance only after schema and seed data are ready.
                dbInstance = db;
                
                return db;
            } catch (err) {
                console.error('[tauri_sqlite] Database loading failed:', err);
                dbInstance = null;
                dbInitPromise = null;
                throw err;
            }
        })();
    }
    return dbInitPromise;
}

export const tauriSqlAdapter: DatabaseAdapter = {
    async execute(sql: string, bindValues?: unknown[]): Promise<void> {
        const db = await getDb();
        await db.execute(sql, bindValues);
    },

    async select<T>(sql: string, bindValues?: unknown[]): Promise<T[]> {
        const db = await getDb();
        return await db.select<T[]>(sql, bindValues);
    }
};
