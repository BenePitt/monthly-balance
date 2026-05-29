import { createTransaction, updateTransaction } from '../domain/transaction';

/**
 * TransactionService manages CRUD operations for transactions
 * and persists changes via the injected storage adapter.
 */
export class TransactionService {
  constructor(storageAdapter) {
    this._storage = storageAdapter;
  }

  async loadAll() {
    return await this._storage.getAll();
  }

  async add(fields, currentTransactions) {
    const transaction = createTransaction(fields);
    const updated = [...currentTransactions, transaction];
    await this._storage.save(updated);
    return updated;
  }

  async addMany(fieldsList, currentTransactions) {
    const newTransactions = fieldsList.map((fields) => createTransaction(fields));
    const updated = [...currentTransactions, ...newTransactions];
    await this._storage.save(updated);
    return updated;
  }

  async update(id, changes, currentTransactions) {
    const updated = currentTransactions.map((t) =>
      t.id === id ? updateTransaction(t, changes) : t
    );
    await this._storage.save(updated);
    return updated;
  }

  async remove(id, currentTransactions) {
    const updated = currentTransactions.filter((t) => t.id !== id);
    await this._storage.save(updated);
    return updated;
  }

  async bulkUpdate(ids, changes, currentTransactions) {
    const idSet = new Set(ids);
    const updated = currentTransactions.map((t) =>
      idSet.has(t.id) ? updateTransaction(t, changes) : t
    );
    await this._storage.save(updated);
    return updated;
  }

  async saveAll(transactions) {
    await this._storage.save(transactions);
  }
}
