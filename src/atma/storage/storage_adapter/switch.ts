import type { FileSystemAdapter } from './file_system_interface';
import type { DatabaseAdapter } from './database_interface';

import { tauriFsAdapter } from '../storage_implementations/tauri_fs';
import { tauriSqlAdapter } from '../storage_implementations/tauri_sqlite';

// In Stage 8, you will add 'web' to this union
export type StoragePlatformName = 'tauri'; 

const DEFAULT_PLATFORM: StoragePlatformName = 'tauri';

const FS_IMPLEMENTATIONS: Partial<Record<StoragePlatformName, FileSystemAdapter>> = {
  tauri: tauriFsAdapter,
};

const DB_IMPLEMENTATIONS: Partial<Record<StoragePlatformName, DatabaseAdapter>> = {
  tauri: tauriSqlAdapter,
};

function getRequestedPlatform(): StoragePlatformName {
  const requested = import.meta.env.VITE_PLATFORM as StoragePlatformName | undefined;
  return requested ?? DEFAULT_PLATFORM;
}

export const requestedPlatform = getRequestedPlatform();

export const activePlatform =
  FS_IMPLEMENTATIONS[requestedPlatform] ? requestedPlatform : DEFAULT_PLATFORM;

export const fsAdapter = FS_IMPLEMENTATIONS[activePlatform] ?? tauriFsAdapter;
export const dbAdapter = DB_IMPLEMENTATIONS[activePlatform] ?? tauriSqlAdapter;

// --- Destructured File System Methods ---
export const {
    readDir,
    makeDirectory,
    copyFile,
    exists,
    writeFile,
    writeTextFile,
    readTextFile,
    remove
} = fsAdapter;

// --- Destructured Database Methods ---
export const {
    execute,
    select
} = dbAdapter;
