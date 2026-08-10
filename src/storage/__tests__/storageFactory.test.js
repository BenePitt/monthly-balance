import { describe, it, expect, afterEach } from 'vitest';
import { createStorageAdapter } from '../storageFactory';
import { DesktopStorageAdapter } from '../DesktopStorageAdapter';
import { WebMemoryStorageAdapter } from '../WebMemoryStorageAdapter';

describe('createStorageAdapter', () => {
  afterEach(() => {
    delete window.electronAPI;
  });

  it('liefert den DesktopStorageAdapter, wenn window.electronAPI.isElectron gesetzt ist', () => {
    window.electronAPI = { isElectron: true };
    expect(createStorageAdapter()).toBeInstanceOf(DesktopStorageAdapter);
  });

  it('liefert den WebMemoryStorageAdapter, wenn window.electronAPI fehlt', () => {
    expect(createStorageAdapter()).toBeInstanceOf(WebMemoryStorageAdapter);
  });

  it('liefert den WebMemoryStorageAdapter, wenn isElectron nicht gesetzt ist', () => {
    window.electronAPI = {};
    expect(createStorageAdapter()).toBeInstanceOf(WebMemoryStorageAdapter);
  });
});
