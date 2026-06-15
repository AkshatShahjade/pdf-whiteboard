export type FsEntry = {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink?: boolean;
  children?: FsEntry[];
};

export type RemoveOptions = {
  recursive?: boolean;
};

export interface FileSystemAdapter {
    readDir(path: string): Promise<FsEntry[]>;
    makeDirectory(path: string): Promise<void>;
    copyFile(file: string | URL, dest: string | URL): Promise<void>;
    exists(path: string | URL): Promise<boolean>;
    writeFile(dest: string | URL, data: Uint8Array): Promise<void>;
    writeTextFile(path: string | URL, data: string): Promise<void>;
    readTextFile(path: string | URL): Promise<string>;
    remove(path: string | URL, options?: RemoveOptions): Promise<void>;
}
