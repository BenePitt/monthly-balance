import { describe, it, expect, beforeEach } from 'vitest';
import { WebMemoryStorageAdapter } from '../WebMemoryStorageAdapter';

describe('WebMemoryStorageAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new WebMemoryStorageAdapter();
  });

  it('starts empty', async () => {
    const all = await adapter.getAll();
    expect(all).toHaveLength(0);
  });

  it('saves and retrieves transactions from memory', async () => {
    const tx = [{ id: '1', amount: 100, type: 'income' }];
    await adapter.save(tx);
    const all = await adapter.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('1');
  });

  it('overwrites previous data on save', async () => {
    await adapter.save([{ id: '1' }]);
    await adapter.save([{ id: '2' }, { id: '3' }]);
    const all = await adapter.getAll();
    expect(all).toHaveLength(2);
  });

  it('returns a copy, not the internal reference', async () => {
    const tx = [{ id: '1' }];
    await adapter.save(tx);
    const all = await adapter.getAll();
    all.push({ id: '2' });
    const all2 = await adapter.getAll();
    expect(all2).toHaveLength(1);
  });

  it('isElectron returns false', () => {
    expect(adapter.isElectron()).toBe(false);
  });

  it('statische Webversion nutzt nur In-Memory-Speicherung (kein localStorage)', async () => {
    // Verify that the adapter does not touch localStorage
    const localStorageSetSpy = vi.spyOn(Storage.prototype, 'setItem');
    await adapter.save([{ id: '1' }]);
    expect(localStorageSetSpy).not.toHaveBeenCalled();
  });
});
