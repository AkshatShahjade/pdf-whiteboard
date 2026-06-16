import { tauriSqlAdapter } from '../storage_implementations/tauri_sqlite';

export const ContentRepository = {
    async ensureContentExists(id: string, jodoType: string, filePath: string): Promise<void> {
        // We use INSERT OR REPLACE because SQLite's ON CONFLICT requires a UNIQUE constraint on the specific columns
        // For the PRIMARY KEY id, INSERT OR REPLACE is equivalent.
        await tauriSqlAdapter.execute(
            `INSERT OR REPLACE INTO CONTENTS (id, jodo_content_type, file_path) VALUES (?, ?, ?)`,
            [id, jodoType, filePath]
        );
    },

    async getAllWhiteboards(): Promise<{id: string, file_path: string}[]> {
        return await tauriSqlAdapter.select<{id: string, file_path: string}>(
            `SELECT id, file_path FROM CONTENTS WHERE jodo_content_type = 'core.whiteboard'`
        );
    }
};
