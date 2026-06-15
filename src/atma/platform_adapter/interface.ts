export type PlatformName = 'tauri' | 'android';

export interface PlatformAdapter {
  pickFiles(name: string, extensions: string[], singleFile?: boolean): Promise<string | null>;
  pickFolder(selectFolder?: boolean): Promise<string | null>;
  saveFilePicker(name: string, extensions: string[], defaultPath: string): Promise<string | null>;
  confirmDialog(message: string, title: string): Promise<boolean>;
  convertFileSrc(path: string): string;
  joinPath(...paths: string[]): Promise<string>;
  basename(file: string): Promise<string>;
  dirname(file: string): Promise<string>;
}
