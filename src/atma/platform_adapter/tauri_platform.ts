import { open, save, confirm as tauriConfirm } from '@tauri-apps/plugin-dialog';
import { convertFileSrc as convertFileSrcCore } from '@tauri-apps/api/core';
import { join, basename as tauriBasename, dirname as tauriDirname } from '@tauri-apps/api/path';
import type { PlatformAdapter } from './interface';



// returns file path? as string
export function pickFiles(
    name: string, 
    extensions: string[], 
    singleFile?: boolean,
): Promise<string|null>{
    return open({
        multiple: !singleFile,
        filters: [{ name: name, extensions: extensions}]

    });
}

export function pickFolder(
    selectFolder?: boolean,
): Promise<string|null>{
    return open({
        directory: selectFolder,
    });
}


export function saveFilePicker(
    name: string,
    extensions: string[],
    defaultPath: string
): Promise<string|null>{
    return save({
        filters: [{name: name, extensions: extensions}],
        defaultPath: defaultPath
    });
}

export function confirmDialog(
    message:string,
    title: string,
):Promise<boolean>{
    return tauriConfirm(message, { title: title, kind: 'warning' })
}


export function convertFileSrc(
    path: string,
):string{
    return convertFileSrcCore(path);
}

export function joinPath(
    ...paths:string[]
): Promise<string>{
    return join(...paths)
}

export function basename(
    file: string,
): Promise<string>{
    return tauriBasename(file)
}

export function dirname(
    file:string,
):Promise<string>{
    return tauriDirname(file)
}

const tauriPlatform: PlatformAdapter = {
    pickFiles,
    pickFolder,
    saveFilePicker,
    confirmDialog,
    convertFileSrc,
    joinPath,
    basename,
    dirname,
};

export default tauriPlatform;
