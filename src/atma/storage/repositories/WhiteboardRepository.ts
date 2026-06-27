import { writeTextFile, readTextFile, remove, exists } from '@tauri-apps/plugin-fs';
import { join, dirname } from '@tauri-apps/api/path';
import { StateInitialValuesRepository } from './StateInitialValuesRepository';
import { ContentRepository } from './ContentRepository';

export const WhiteboardRepository = {
    async resolvePath(id: string, libraryFolder?: string): Promise<string> {
        try {
            const content = await ContentRepository.getContentById(id);
            if (content && content.file_path) {
                return content.file_path;
            }
        } catch (e) {
            // Database query failed or table doesn't exist, fall back to default path resolution
        }

        let folder = '';
        if (libraryFolder) {
            folder = libraryFolder;
        } else {
            const fallback = await StateInitialValuesRepository.getInitialValue<string | null>('personalized', 'libraryPath', ['global']);
            if (!fallback) {
                throw new Error("Cannot save whiteboard: libraryPath is not configured.");
            }
            folder = fallback;
        }
        return await join(folder, `${id}.tldr`);
    },

    async saveWhiteboard(id: string, snapshot: any, libraryFolder?: string): Promise<void> {
        const filePath = await this.resolvePath(id, libraryFolder);
        await writeTextFile(filePath, JSON.stringify(snapshot, null, 2));
        try {
            await ContentRepository.ensureContentExists(id, 'core.whiteboard', filePath);
        } catch (e) {
            console.error("Failed to register whiteboard in CONTENTS database:", e);
        }
    },

    async loadWhiteboard(id: string, libraryFolder?: string): Promise<any | null> {
        const filePath = await this.resolvePath(id, libraryFolder);
        if (await exists(filePath)) {
            const data = await readTextFile(filePath);
            return JSON.parse(data);
        }
        return null;
    },

    async deleteWhiteboard(id: string, libraryFolder?: string): Promise<void> {
        const filePath = await this.resolvePath(id, libraryFolder);
        if (await exists(filePath)) {
            await remove(filePath);
        }
    }
};
