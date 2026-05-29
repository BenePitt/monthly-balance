import { DesktopStorageAdapter } from './DesktopStorageAdapter';
import { WebMemoryStorageAdapter } from './WebMemoryStorageAdapter';

/**
 * Returns the appropriate storage adapter based on the runtime environment.
 * Uses DesktopStorageAdapter if running in Electron (window.electronAPI present),
 * otherwise uses WebMemoryStorageAdapter.
 */
export function createStorageAdapter() {
  if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
    return new DesktopStorageAdapter();
  }
  return new WebMemoryStorageAdapter();
}
