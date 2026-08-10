import { describe, expect, it } from 'vitest';
import { isDuplicateTransaction } from '../duplicateDetection';

const existing = [
  {
    date: '2026-01-01',
    purpose: 'Edeka Einkauf',
    type: 'expense',
    amount: 25,
    recurrence: 'once',
  },
];

describe('isDuplicateTransaction', () => {
  it('erkennt eine identische Transaktion als Duplikat', () => {
    const candidate = {
      date: '2026-01-01',
      purpose: 'Edeka Einkauf',
      type: 'expense',
      amount: 25,
      recurrence: 'once',
    };
    expect(isDuplicateTransaction(candidate, existing)).toBe(true);
  });

  it('vergleicht den Betrag numerisch (String vs. Number)', () => {
    const candidate = {
      date: '2026-01-01',
      purpose: 'Edeka Einkauf',
      type: 'expense',
      amount: '25',
      recurrence: 'once',
    };
    expect(isDuplicateTransaction(candidate, existing)).toBe(true);
  });

  it('erkennt keine Duplikate bei abweichendem Feld', () => {
    expect(
      isDuplicateTransaction(
        {
          date: '2026-01-02',
          purpose: 'Edeka Einkauf',
          type: 'expense',
          amount: 25,
          recurrence: 'once',
        },
        existing
      )
    ).toBe(false);
    expect(
      isDuplicateTransaction(
        {
          date: '2026-01-01',
          purpose: 'Edeka Einkauf',
          type: 'expense',
          amount: 26,
          recurrence: 'once',
        },
        existing
      )
    ).toBe(false);
    expect(
      isDuplicateTransaction(
        {
          date: '2026-01-01',
          purpose: 'Edeka Einkauf',
          type: 'expense',
          amount: 25,
          recurrence: 'monthly',
        },
        existing
      )
    ).toBe(false);
  });

  it('gibt false zurueck, wenn keine bestehenden Transaktionen vorhanden sind', () => {
    expect(
      isDuplicateTransaction(
        {
          date: '2026-01-01',
          purpose: 'Edeka Einkauf',
          type: 'expense',
          amount: 25,
          recurrence: 'once',
        },
        []
      )
    ).toBe(false);
  });
});
