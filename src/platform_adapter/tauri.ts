import { open, save, confirm as tauriConfirm } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { readDir, mkdir, copyFile, exists, writeFile, writeTextFile, readTextFile, remove, DirEntry } from '@tauri-apps/plugin-fs';
import { join, basename, dirname } from '@tauri-apps/api/path';
import type { FsEntry, PlatformAdapter, RemoveOptions } from './interface';


// returns file path? as string
export function openFile1(
    name: string, 
    extensions: string[], 
    singleFile?: boolean,
): Promise<string|null>{
    return open({
        multiple: !singleFile,
        filters: [{ name: name, extensions: extensions}]

    });
}

export function openFile2(
    selectFolder?: boolean,
): Promise<string|null>{
    return open({
        directory: selectFolder,
    });
}


export function saveFile(
    name: string,
    extensions: string[],
    defaultPath: string
): Promise<string|null>{
    return save({
        filters: [{name: name, extensions: extensions}],
        defaultPath: defaultPath
    });
}

export function confirmErrorDialog(
    message:string,
    title: string,
):Promise<boolean>{
    return tauriConfirm(message, { title: title, kind: 'warning' })
}


export function convertFileSrcAKS(
    path: string,
):string{
    return convertFileSrc(path);
}

function normalizeDirEntry(entry: DirEntry): FsEntry {
    return {
        name: entry.name,
        isDirectory: entry.isDirectory,
        isFile: entry.isFile,
        isSymlink: entry.isSymlink
    };
}

export async function readDirAKS(
    path: string,
): Promise<FsEntry[]> {
    const entries = await readDir(path);
    return entries.map(normalizeDirEntry);
}

export function makeDirectory(
    path: string,
):Promise<void>{
    return mkdir(path)
}

export function cpyFile(
    file:string|URL,
    dest:string|URL,
):Promise<void>{
    return copyFile(file, dest);
}

export function existsAKS(
    path: string|URL,
):Promise<boolean>{
    return exists(path)

}

export function wrtFile(
    dest: string|URL,
    data: Uint8Array,
):Promise<void>{
    return writeFile(dest, data);
}

export function wrtTextFile(
    path: string|URL,
    jsonStrData: string,
): Promise<void> {
    return writeTextFile(path, jsonStrData)
}

export function rdTextFile(
    path: string|URL,
): Promise<string>{
    return readTextFile(path)
}

export function remmove(
    path: string|URL,
    options?: RemoveOptions
): Promise<void>{
    return remove(path, options)
}


export function jjoin(
    ...paths:string[]
): Promise<string>{
    return join(...paths)
}

export function basenamee(
    file: string,
): Promise<string>{
    return basename(file)
}

export function dirnamee(
    file:string,
):Promise<string>{
    return dirname(file)
}

const tauriPlatform: PlatformAdapter = {
    openFile1,
    openFile2,
    saveFile,
    confirmErrorDialog,
    convertFileSrcAKS,
    readDirAKS,
    makeDirectory,
    cpyFile,
    existsAKS,
    wrtFile,
    wrtTextFile,
    rdTextFile,
    remmove,
    jjoin,
    basenamee,
    dirnamee,
};

export default tauriPlatform;
