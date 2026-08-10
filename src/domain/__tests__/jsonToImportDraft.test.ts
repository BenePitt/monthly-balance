import { describe, expect, it } from 'vitest';
import { jsonToImportDraft } from '../jsonToImportDraft';

function tx(overrides) {
  return {
    id: 'x',
    date: '2026-01-01',
    type: 'expense',
    amount: 10,
    purpose: 'Test',
    category: 'Sonstiges',
    partner: 'Unbekannt',
    recurrence: 'once',
    accountId: 'acc-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('jsonToImportDraft', () => {
  it('wandelt Transaktionen in ImportDrafts mit deterministischer importId um', () => {
    const transactions = [tx({ id: 'a' }), tx({ id: 'b' })];
    const { drafts } = jsonToImportDraft(transactions, []);

    expect(drafts).toHaveLength(2);
    expect(drafts[0].importId).toBe('json-0');
    expect(drafts[1].importId).toBe('json-1');
    expect(drafts[0]).toMatchObject({
      date: '2026-01-01',
      type: 'expense',
      amount: 10,
      purpose: 'Test',
      category: 'Sonstiges',
      partner: 'Unbekannt',
      recurrence: 'once',
      isDuplicate: false,
    });
  });

  it('markiert Duplikate anhand von isDuplicateTransaction', () => {
    const existing = [tx({ id: 'existing' })];
    const transactions = [tx({ id: 'new' })];

    const { drafts } = jsonToImportDraft(transactions, existing);

    expect(drafts[0].isDuplicate).toBe(true);
    expect(drafts[0].debugInfo).toContain('Bereits vorhanden');
  });

  it('liefert originalById, geschluesselt nach importId, mit den urspruenglichen Transaktionsobjekten', () => {
    const transactions = [tx({ id: 'a' }), tx({ id: 'b' })];
    const { originalById } = jsonToImportDraft(transactions, []);

    expect(originalById.get('json-0')).toBe(transactions[0]);
    expect(originalById.get('json-1')).toBe(transactions[1]);
  });

  it('gibt leere Ergebnisse fuer ein leeres Array zurueck', () => {
    const { drafts, originalById } = jsonToImportDraft([], []);

    expect(drafts).toEqual([]);
    expect(originalById.size).toBe(0);
  });
});
