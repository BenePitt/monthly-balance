import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DesktopStorageAdapter } from '../DesktopStorageAdapter';

describe('DesktopStorageAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new DesktopStorageAdapter();
    window.electronAPI = {
      loadTransactions: vi.fn(),
      saveTransactions: vi.fn(),
      loadAppData: vi.fn(),
      saveAppData: vi.fn(),
    };
  });

  afterEach(() => {
    delete window.electronAPI;
  });

  it('isElectron liefert true', () => {
    expect(adapter.isElectron()).toBe(true);
  });

  describe('getAll', () => {
    it('liefert die per IPC geladenen Transaktionen', async () => {
      window.electronAPI.loadTransactions.mockResolvedValue([{ id: '1' }]);
      expect(await adapter.getAll()).toEqual([{ id: '1' }]);
    });

    it('liefert ein leeres Array, wenn die IPC-Antwort kein Array ist', async () => {
      window.electronAPI.loadTransactions.mockResolvedValue(null);
      expect(await adapter.getAll()).toEqual([]);
    });

    it('liefert ein leeres Array, wenn die IPC-Anfrage fehlschlägt', async () => {
      window.electronAPI.loadTransactions.mockRejectedValue(new Error('IPC-Fehler'));
      expect(await adapter.getAll()).toEqual([]);
    });
  });

  describe('save', () => {
    it('delegiert an window.electronAPI.saveTransactions', async () => {
      await adapter.save([{ id: '1' }]);
      expect(window.electronAPI.saveTransactions).toHaveBeenCalledWith([{ id: '1' }]);
    });

    it('wirft nicht, wenn die IPC-Anfrage fehlschlägt', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.electronAPI.saveTransactions.mockRejectedValue(new Error('IPC-Fehler'));
      await expect(adapter.save([{ id: '1' }])).resolves.toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('getData', () => {
    it('liefert die per IPC geladenen App-Daten', async () => {
      const data = { transactions: [], startBalance: 10, currentBalance: 20, balanceMode: 'start' };
      window.electronAPI.loadAppData.mockResolvedValue(data);
      expect(await adapter.getData()).toEqual(data);
    });

    it('liefert Standardwerte, wenn die IPC-Anfrage fehlschlägt', async () => {
      window.electronAPI.loadAppData.mockRejectedValue(new Error('IPC-Fehler'));
      expect(await adapter.getData()).toEqual({
        transactions: [],
        startBalance: 0,
        currentBalance: 0,
        balanceMode: 'start',
      });
    });
  });

  describe('saveData', () => {
    it('delegiert an window.electronAPI.saveAppData', async () => {
      const data = { transactions: [], startBalance: 0, currentBalance: 0, balanceMode: 'start' };
      await adapter.saveData(data);
      expect(window.electronAPI.saveAppData).toHaveBeenCalledWith(data);
    });

    it('wirft nicht, wenn die IPC-Anfrage fehlschlägt', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.electronAPI.saveAppData.mockRejectedValue(new Error('IPC-Fehler'));
      await expect(adapter.saveData({})).resolves.toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
