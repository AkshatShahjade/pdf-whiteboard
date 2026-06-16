import { writeTextFile, readTextFile, remove, exists } from '@tauri-apps/plugin-fs';
import { join, dirname } from '@tauri-apps/api/path';

export const WhiteboardRepository = {
    async resolvePath(id: string, parentPdfPath?: string, libraryFolder?: string): Promise<string> {
        let folder = '';
        if (parentPdfPath) {
            folder = await dirname(parentPdfPath);
        } else if (libraryFolder) {
            folder = libraryFolder;
        } else {
            const fallback = localStorage.getItem('lemmamap:library');
            if (!fallback) {
                throw new Error("Cannot save whiteboard: neither parentPdfPath nor libraryFolder was provided.");
            }
            folder = fallback;
        }
        return await join(folder, `${id}.tldr`);
    },

    async saveWhiteboard(id: string, snapshot: any, parentPdfPath?: string, libraryFolder?: string): Promise<void> {
        const filePath = await this.resolvePath(id, parentPdfPath, libraryFolder);
        await writeTextFile(filePath, JSON.stringify(snapshot, null, 2));
    },

    async loadWhiteboard(id: string, parentPdfPath?: string, libraryFolder?: string): Promise<any | null> {
        const filePath = await this.resolvePath(id, parentPdfPath, libraryFolder);
        if (await exists(filePath)) {
            const data = await readTextFile(filePath);
            return JSON.parse(data);
        }
        return null;
    },

    async deleteWhiteboard(id: string, parentPdfPath?: string, libraryFolder?: string): Promise<void> {
        const filePath = await this.resolvePath(id, parentPdfPath, libraryFolder);
        if (await exists(filePath)) {
            await remove(filePath);
        }
    }
};
