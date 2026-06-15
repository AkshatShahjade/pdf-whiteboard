// TODO: Understand this switch. 

import type { PlatformAdapter, PlatformName } from './interface';
import tauriPlatform from './tauri_platform';

const DEFAULT_PLATFORM: PlatformName = 'tauri';

const IMPLEMENTATIONS: Partial<Record<PlatformName, PlatformAdapter>> = {
  tauri: tauriPlatform,
};

function getRequestedPlatform(): PlatformName {
  const requested = import.meta.env.VITE_PLATFORM as PlatformName | undefined;
  return requested ?? DEFAULT_PLATFORM;
}

export const requestedPlatform = getRequestedPlatform();
export const activePlatform =
  IMPLEMENTATIONS[requestedPlatform] ? requestedPlatform : DEFAULT_PLATFORM;

const platform = IMPLEMENTATIONS[activePlatform] ?? tauriPlatform;

export default platform;

export const {
  pickFiles,
  pickFolder,
  saveFilePicker,
  confirmDialog,
  convertFileSrc,
  joinPath,
  basename,
  dirname,
} = platform;
