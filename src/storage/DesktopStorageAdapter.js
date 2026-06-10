/**
 * Desktop storage adapter for the Electron app.
 * Uses Electron IPC (via preload script) to persist transactions as a JSON file
 * in the user's AppData directory on Windows.
 *
 * Requires window.electronAPI to be present (injected by electron/preload.js).
 */
export class DesktopStorageAdapter {
  async getAll() {
    try {
      const data = await window.electronAPI.loadTransactions();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async save(transactions) {
    try {
      await window.electronAPI.saveTransactions(transactions);
    } catch (error) {
      console.error('Fehler beim Speichern der Transaktionen:', error);
    }
  }

  async getData() {
    try {
      return await window.electronAPI.loadAppData();
    } catch {
      return { transactions: [], startBalance: 0, currentBalance: 0, balanceMode: 'start' };
    }
  }

  async saveData(data) {
    try {
      await window.electronAPI.saveAppData(data);
    } catch (error) {
      console.error('Fehler beim Speichern der App-Daten:', error);
    }
  }

  isElectron() {
    return true;
  }
}
