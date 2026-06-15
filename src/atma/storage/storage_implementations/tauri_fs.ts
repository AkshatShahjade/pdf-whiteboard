import { readDir, mkdir, copyFile, exists, writeFile, writeTextFile, readTextFile, remove, DirEntry } from '@tauri-apps/plugin-fs';
import { FileSystemAdapter, FsEntry, RemoveOptions } from '../storage_adapter/file_system_interface';

function normalizeDirEntry(entry: DirEntry): FsEntry {
    return {
        name: entry.name,
        isDirectory: entry.isDirectory,
        isFile: entry.isFile,
        isSymlink: entry.isSymlink
    };
}

export const tauriFsAdapter: FileSystemAdapter = {
    async readDir(path: string): Promise<FsEntry[]> {
        const entries = await readDir(path);
        return entries.map(normalizeDirEntry);
    },

    async makeDirectory(path: string): Promise<void> {
        return mkdir(path);
    },

    async copyFile(file: string | URL, dest: string | URL): Promise<void> {
        return copyFile(file, dest);
    },

    async exists(path: string | URL): Promise<boolean> {
        return exists(path);
    },

    async writeFile(dest: string | URL, data: Uint8Array): Promise<void> {
        return writeFile(dest, data);
    },

    async writeTextFile(path: string | URL, data: string): Promise<void> {
        return writeTextFile(path, data);
    },

    async readTextFile(path: string | URL): Promise<string> {
        return readTextFile(path);
    },

    async remove(path: string | URL, options?: RemoveOptions): Promise<void> {
        return remove(path, options);
    }
};
