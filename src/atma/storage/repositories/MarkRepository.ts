import { tauriSqlAdapter } from '../storage_implementations/tauri_sqlite';
import { MarkDTO } from '../../../shared_doman_models_and_dtos/dtos';

export const MarkRepository = {
    // TODO: add better algorithm
    async upsertMarks(contentId: string, marks: MarkDTO[]): Promise<void> {
        // Delete marks that are no longer in the provided list
        const markIds = marks.map(m => m.id);
        if (markIds.length > 0) {
            const placeholders = markIds.map(() => '?').join(',');
            await tauriSqlAdapter.execute(
                `DELETE FROM MARKS WHERE content_id = ? AND id NOT IN (${placeholders})`,
                [contentId, ...markIds]
            );
        } else {
            await tauriSqlAdapter.execute(`DELETE FROM MARKS WHERE content_id = ?`, [contentId]);
        }
        
        for (const mark of marks) {
            const payload = JSON.stringify(mark);

            const markType = (mark as any).type;
            await tauriSqlAdapter.execute(
                `INSERT OR REPLACE INTO MARKS (id, content_id, jodo_mark_type, payload) VALUES (?, ?, ?, ?)`,
                [mark.id, contentId, markType, payload]
            );
        }
    },

    async loadMarksByContentId(contentId: string): Promise<MarkDTO[]> {
        const results = await tauriSqlAdapter.select<{payload: string}>(
            `SELECT payload FROM MARKS WHERE content_id = ?`,
            [contentId]
        );
        return results.map(row => JSON.parse(row.payload) as MarkDTO);
    }
};
