import { tauriSqlAdapter } from '../storage_implementations/tauri_sqlite';
import { LinkDTO } from '../../../shared_doman_models_and_dtos/dtos';

export const LinkRepository = {
    async insertLinks(links: LinkDTO[]): Promise<void> {
        if (links.length === 0) return;
        const batchSize = 100;
        for (let i = 0; i < links.length; i += batchSize) {
            const chunk = links.slice(i, i + batchSize);
            const valuesPlaceholders = chunk.map(() => '(?, ?, ?, ?)').join(', ');
            const bindValues: unknown[] = [];
            for (const link of chunk) {
                bindValues.push(link.id, link.source_mark_id, link.target_mark_id, link.label || null);
            }
            await tauriSqlAdapter.execute(
                `INSERT OR REPLACE INTO LINKS (id, source_mark_id, target_mark_id, label) VALUES ${valuesPlaceholders}`,
                bindValues
            );
        }
    },
    
    async deleteLinks(linkIds: string[]): Promise<void> {
        if (linkIds.length === 0) return;
        const placeholders = linkIds.map(() => '?').join(',');
        await tauriSqlAdapter.execute(
            `DELETE FROM LINKS WHERE id IN (${placeholders})`,
            linkIds
        );
    },

    async loadLinksForMarks(markIds: string[]): Promise<LinkDTO[]> {
        if (markIds.length === 0) return [];
        const placeholders = markIds.map(() => '?').join(',');
        const results = await tauriSqlAdapter.select<LinkDTO>(
            `SELECT id, source_mark_id, target_mark_id, label FROM LINKS WHERE source_mark_id IN (${placeholders}) OR target_mark_id IN (${placeholders})`,
            [...markIds, ...markIds]
        );
        return results;
    }
};
