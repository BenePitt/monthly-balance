/**
 * In-memory storage adapter for the static web version.
 * Data exists only for the current browser session and is lost on page reload.
 * Does NOT use localStorage, IndexedDB, or cookies.
 */
export class WebMemoryStorageAdapter {
  constructor() {
    this._transactions = [];
  }

  async getAll() {
    return [...this._transactions];
  }

  async save(transactions) {
    this._transactions = [...transactions];
  }

  isElectron() {
    return false;
  }
}
