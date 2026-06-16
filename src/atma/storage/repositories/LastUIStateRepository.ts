import { tauriSqlAdapter } from '../storage_implementations/tauri_sqlite';

export const LastUIStateRepository = {
    async saveSessionState(pdfPath: string, state: any): Promise<void> {
        const valueJson = JSON.stringify(state);
        await tauriSqlAdapter.execute(
            `INSERT INTO DOCUMENT_UI_STATES (key, value_json) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
            [`session:${pdfPath}`, valueJson]
        );
    },

    async loadSessionState(pdfPath: string): Promise<any | null> {
        const results = await tauriSqlAdapter.select<{value_json: string}>(
            `SELECT value_json FROM DOCUMENT_UI_STATES WHERE key = ?`,
            [`session:${pdfPath}`]
        );
        if (results.length > 0) {
            return JSON.parse(results[0].value_json);
        }
        return null;
    }
};
