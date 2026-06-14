export type PlatformName = 'tauri' | 'android';

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

export interface PlatformAdapter {
  openFile1(name: string, extensions: string[], singleFile?: boolean): Promise<string | null>;
  openFile2(selectFolder?: boolean): Promise<string | null>;
  saveFile(name: string, extensions: string[], defaultPath: string): Promise<string | null>;
  confirmErrorDialog(message: string, title: string): Promise<boolean>;
  convertFileSrcAKS(path: string): string;
  readDirAKS(path: string): Promise<FsEntry[]>;
  makeDirectory(path: string): Promise<void>;
  cpyFile(file: string | URL, dest: string | URL): Promise<void>;
  existsAKS(path: string | URL): Promise<boolean>;
  wrtFile(dest: string | URL, data: Uint8Array): Promise<void>;
  wrtTextFile(path: string | URL, jsonStrData: string): Promise<void>;
  rdTextFile(path: string | URL): Promise<string>;
  remmove(path: string | URL, options?: RemoveOptions): Promise<void>;
  jjoin(...paths: string[]): Promise<string>;
  basenamee(file: string): Promise<string>;
  dirnamee(file: string): Promise<string>;
}
