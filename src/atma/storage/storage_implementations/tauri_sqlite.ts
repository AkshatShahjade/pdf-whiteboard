import Database from '@tauri-apps/plugin-sql';
import { DatabaseAdapter } from '../storage_adapter/database_interface';
import { SCHEMA_SQL } from './schema';

// Default SQLite connection string for Tauri plugin
const DB_URL = 'sqlite:lemmamap.db';

let dbInstance: Database | null = null;

async function getDb(): Promise<Database> {
    if (!dbInstance) {
        dbInstance = await Database.load(DB_URL);
        
        // Initialize schema
        const statements = SCHEMA_SQL.split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);
            
        for (const stmt of statements) {
            await dbInstance.execute(stmt);
        }
    }
    return dbInstance;
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
