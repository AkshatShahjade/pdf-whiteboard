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
    
    // Check if the SETTINGS table exists by querying the SQLite master table
    const result = await db.select<{name: string}[]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='SETTINGS';"
    );
    
    if (result.length === 0) {
        console.log('[tauri_sqlite] Database is empty. Executing schema commands...');
        
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
        await initializeStateDefaults(true);
    } else {
        console.log('[tauri_sqlite] Database already initialized. Ensuring missing defaults are seeded...');
        
        await runSeeds(db);
        
        await initializeStateDefaults(false);
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
}

async function getDb(): Promise<Database> {
    if (dbInstance) return dbInstance;
    
    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            console.log('[tauri_sqlite] Loading database:', DB_URL);
            try {
                const db = await Database.load(DB_URL);
                
                // Set the synchronous instance immediately to prevent deadlocks 
                // when initializeDatabaseIfEmpty makes recursive queries.
                dbInstance = db;
                
                // Call the initialization function exactly once when the connection is established.
                await initializeDatabaseIfEmpty(db);
                
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
