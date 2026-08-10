import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionService } from '../TransactionService';

describe('TransactionService', () => {
  let storage;
  let service;

  beforeEach(() => {
    storage = {
      getAll: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
    };
    service = new TransactionService(storage);
  });

  const fields = (overrides = {}) => ({
    date: '2026-01-01',
    type: 'expense',
    amount: '10',
    purpose: 'Einkauf',
    category: 'Lebensmittel',
    partner: 'Supermarkt',
    recurrence: 'once',
    ...overrides,
  });

  it('loadAll delegiert an storage.getAll', async () => {
    storage.getAll.mockResolvedValue([{ id: '1' }]);
    expect(await service.loadAll()).toEqual([{ id: '1' }]);
  });

  it('add hängt eine neue Transaktion an und speichert das Ergebnis', async () => {
    const updated = await service.add(fields(), []);
    expect(updated).toHaveLength(1);
    expect(updated[0].purpose).toBe('Einkauf');
    expect(storage.save).toHaveBeenCalledWith(updated);
  });

  it('addMany erstellt mehrere Transaktionen und speichert das Ergebnis', async () => {
    const updated = await service.addMany([fields(), fields({ purpose: 'Zweite' })], []);
    expect(updated).toHaveLength(2);
    expect(storage.save).toHaveBeenCalledWith(updated);
  });

  it('update ändert nur die passende Transaktion und speichert das Ergebnis', async () => {
    const existing = [
      { id: '1', purpose: 'Alt', amount: 10 },
      { id: '2', purpose: 'Unverändert', amount: 20 },
    ];
    const updated = await service.update('1', { purpose: 'Neu' }, existing);
    expect(updated.find((t) => t.id === '1').purpose).toBe('Neu');
    expect(updated.find((t) => t.id === '2').purpose).toBe('Unverändert');
    expect(storage.save).toHaveBeenCalledWith(updated);
  });

  it('remove entfernt die Transaktion mit der angegebenen id und speichert das Ergebnis', async () => {
    const existing = [{ id: '1' }, { id: '2' }];
    const updated = await service.remove('1', existing);
    expect(updated).toEqual([{ id: '2' }]);
    expect(storage.save).toHaveBeenCalledWith(updated);
  });

  it('remove speichert unverändert, wenn die id nicht existiert', async () => {
    const existing = [{ id: '1' }];
    const updated = await service.remove('unbekannt', existing);
    expect(updated).toEqual(existing);
  });

  it('bulkUpdate ändert nur Transaktionen mit passender id', async () => {
    const existing = [
      { id: '1', category: 'Alt' },
      { id: '2', category: 'Alt' },
      { id: '3', category: 'Alt' },
    ];
    const updated = await service.bulkUpdate(['1', '3'], { category: 'Neu' }, existing);
    expect(updated.find((t) => t.id === '1').category).toBe('Neu');
    expect(updated.find((t) => t.id === '2').category).toBe('Alt');
    expect(updated.find((t) => t.id === '3').category).toBe('Neu');
    expect(storage.save).toHaveBeenCalledWith(updated);
  });

  it('saveAll delegiert unverändert an storage.save', async () => {
    const transactions = [{ id: '1' }];
    await service.saveAll(transactions);
    expect(storage.save).toHaveBeenCalledWith(transactions);
  });
});
