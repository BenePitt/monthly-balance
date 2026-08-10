import { describe, it, expect } from 'vitest';
import {
  createTransaction,
  updateTransaction,
  getLatestTransactionDate,
  TRANSACTION_TYPES,
  RECURRENCE_TYPES,
  TYPE_LABELS,
  RECURRENCE_LABELS,
} from '../transaction';
import { DEFAULT_ACCOUNT_ID } from '../account';

describe('createTransaction', () => {
  const fields = () => ({
    date: '2026-01-01',
    type: 'income',
    amount: '42.5',
    purpose: 'Gehalt',
    category: 'Lohn',
    partner: 'Arbeitgeber',
    recurrence: 'once',
  });

  it('erzeugt eine Transaktion mit generierter id und geparstem Betrag', () => {
    const tx = createTransaction(fields());
    expect(tx.id).toBeTruthy();
    expect(tx.amount).toBe(42.5);
    expect(tx.date).toBe('2026-01-01');
  });

  it('setzt createdAt und updatedAt gleich', () => {
    const tx = createTransaction(fields());
    expect(tx.createdAt).toBeTruthy();
    expect(tx.updatedAt).toBe(tx.createdAt);
  });

  it('nutzt DEFAULT_ACCOUNT_ID, wenn kein Konto angegeben ist', () => {
    const tx = createTransaction(fields());
    expect(tx.accountId).toBe(DEFAULT_ACCOUNT_ID);
  });

  it('übernimmt ein explizit angegebenes Konto', () => {
    const tx = createTransaction({ ...fields(), accountId: 'sparkonto' });
    expect(tx.accountId).toBe('sparkonto');
  });
});

describe('updateTransaction', () => {
  const base = () =>
    createTransaction({
      date: '2026-01-01',
      type: 'expense',
      amount: '10',
      purpose: 'Einkauf',
      category: 'Lebensmittel',
      partner: 'Supermarkt',
      recurrence: 'once',
    });

  it('behält id und createdAt bei Änderungen unverändert', () => {
    const tx = base();
    const updated = updateTransaction(tx, { amount: '20' });
    expect(updated.id).toBe(tx.id);
    expect(updated.createdAt).toBe(tx.createdAt);
  });

  it('setzt updatedAt neu, unabhängig vom bisherigen Wert', () => {
    const tx = { ...base(), updatedAt: '2020-01-01T00:00:00.000Z' };
    const updated = updateTransaction(tx, { purpose: 'Neuer Zweck' });
    expect(updated.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
  });

  it('parst amount nur neu, wenn es in changes enthalten ist', () => {
    const tx = base();
    const updated = updateTransaction(tx, { purpose: 'Neuer Zweck' });
    expect(updated.amount).toBe(tx.amount);

    const updatedAmount = updateTransaction(tx, { amount: '99.9' });
    expect(updatedAmount.amount).toBe(99.9);
  });
});

describe('getLatestTransactionDate', () => {
  it('liefert das späteste Datum unter den Transaktionen des Kontos', () => {
    const transactions = [
      { date: '2026-01-10', accountId: 'a' },
      { date: '2026-03-05', accountId: 'a' },
      { date: '2026-12-31', accountId: 'b' },
    ];
    expect(getLatestTransactionDate(transactions, 'a')).toBe('2026-03-05');
  });

  it('gibt null zurück, wenn das Konto keine Transaktionen hat', () => {
    const transactions = [{ date: '2026-01-10', accountId: 'a' }];
    expect(getLatestTransactionDate(transactions, 'b')).toBeNull();
  });

  it('gibt null zurück für eine leere Transaktionsliste', () => {
    expect(getLatestTransactionDate([], 'a')).toBeNull();
  });
});

describe('Konstanten', () => {
  it('definieren die erwarteten Typ- und Wiederholungs-Werte', () => {
    expect(TRANSACTION_TYPES).toEqual({ INCOME: 'income', EXPENSE: 'expense' });
    expect(RECURRENCE_TYPES).toEqual({ ONCE: 'once', MONTHLY: 'monthly' });
    expect(TYPE_LABELS).toEqual({ income: 'Einnahme', expense: 'Ausgabe' });
    expect(RECURRENCE_LABELS).toEqual({ once: 'Einmalig', monthly: 'Regelmäßig' });
  });
});
