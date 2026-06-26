import { tauriSqlAdapter } from '../storage_implementations/tauri_sqlite';

export const ContentRepository = {
    async ensureContentExists(id: string, jodoType: string, filePath: string): Promise<void> {
        // We use INSERT INTO ... ON CONFLICT DO UPDATE so we don't delete and re-insert the row,
        // which prevents ON DELETE CASCADE from wiping marks.
        await tauriSqlAdapter.execute(
            `INSERT INTO CONTENTS (id, jodo_content_type, file_path) VALUES (?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                jodo_content_type = excluded.jodo_content_type,
                file_path = excluded.file_path`,
            [id, jodoType, filePath]
        );
    },

    async getAllWhiteboards(): Promise<{id: string, file_path: string}[]> {
        return await tauriSqlAdapter.select<{id: string, file_path: string}>(
            `SELECT id, file_path FROM CONTENTS WHERE jodo_content_type = 'core.whiteboard'`
        );
    },

    async getContentById(id: string): Promise<{id: string, file_path: string} | null> {
        const results = await tauriSqlAdapter.select<{id: string, file_path: string}>(
            `SELECT id, file_path FROM CONTENTS WHERE id = ?`,
            [id]
        );
        return results[0] || null;
    }
};
