import { tauriSqlAdapter } from '../storage_implementations/tauri_sqlite';

export class RoopaWorkspaceRepository {
    static async getWorkspaceLayout(id: string): Promise<any | null> {
        const result = await tauriSqlAdapter.select<{layout_json: string}>(
            "SELECT layout_json FROM ROOPA_WORKSPACES WHERE id = ?",
            [id]
        );
        
        if (result.length > 0) {
            return JSON.parse(result[0].layout_json);
        }
        
        return null;
    }

    static async getAllWorkspaces(): Promise<{id: string, name: string}[]> {
        return await tauriSqlAdapter.select<{id: string, name: string}[]>(
            "SELECT id, name FROM ROOPA_WORKSPACES"
        );
    }
}
