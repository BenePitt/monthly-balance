import { describe, expect, it } from 'vitest';
import {
  mapComdirectTransaction,
  mapComdirectTransactions,
  applyCategoryInference,
} from '../comdirectImport';

const OWN_IBAN = 'DE02120300000000202051';

function tx(overrides) {
  return {
    id: 'x',
    date: '2026-01-01',
    type: 'expense',
    amount: 10,
    purpose: 'Text',
    category: 'Sonstiges',
    partner: 'Unbekannt',
    recurrence: 'once',
    accountId: 'acc-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function rawTx(overrides) {
  return {
    date: '2026-01-01',
    type: 'expense',
    amount: 10,
    purpose: 'Miete Januar',
    category: 'Sonstiges',
    partner: 'Vermieter GmbH',
    recurrence: 'once',
    ...overrides,
  };
}

describe('mapComdirectTransaction', () => {
  it('nutzt den Creditor als Partner bei einer SEPA-Lastschrift (debtor ist das eigene Konto)', () => {
    const result = mapComdirectTransaction(
      {
        bookingDate: '2026-01-15',
        amount: { value: '-49.99', unit: 'EUR' },
        remittanceInfo: 'Miete Januar',
        creditor: { holderName: 'Vermieter GmbH', iban: 'DE11500105170648489890' },
        debtor: { holderName: 'Max Mustermann', iban: OWN_IBAN },
      },
      OWN_IBAN
    );

    expect(result).toEqual({
      date: '2026-01-15',
      type: 'expense',
      amount: 49.99,
      purpose: 'Miete Januar',
      category: 'Sonstiges',
      partner: 'Vermieter GmbH',
      recurrence: 'once',
    });
  });

  it('nutzt den Remitter als Partner bei einer eingehenden Überweisung (creditor ist das eigene Konto)', () => {
    const result = mapComdirectTransaction(
      {
        bookingDate: '2026-01-31',
        amount: { value: '2500.00', unit: 'EUR' },
        remittanceInfo: 'Gehalt',
        creditor: { holderName: 'Max Mustermann', iban: OWN_IBAN },
        remitter: { holderName: 'Arbeitgeber AG', iban: 'DE89370400440532013000' },
      },
      OWN_IBAN
    );

    expect(result).toMatchObject({ type: 'income', amount: 2500, partner: 'Arbeitgeber AG' });
  });

  it('nutzt den Creditor als Partner bei einer ausgehenden Überweisung (remitter ist das eigene Konto)', () => {
    const result = mapComdirectTransaction(
      {
        bookingDate: '2026-02-01',
        amount: { value: '-100', unit: 'EUR' },
        remitter: { holderName: 'Max Mustermann', iban: OWN_IBAN },
        creditor: { holderName: 'Empfänger GmbH', iban: 'DE11500105170648489890' },
      },
      OWN_IBAN
    );

    expect(result?.partner).toBe('Empfänger GmbH');
  });

  it('ist niemals die eigene IBAN, selbst wenn nur die eigene Partei befüllt ist', () => {
    const result = mapComdirectTransaction(
      {
        bookingDate: '2026-02-05',
        amount: { value: '-20', unit: 'EUR' },
        debtor: { holderName: 'Max Mustermann', iban: OWN_IBAN },
      },
      OWN_IBAN
    );

    expect(result?.partner).toBe('Unbekannt');
  });

  it('akzeptiert eine Partei ohne IBAN (z. B. Barauszahlung) als Partner', () => {
    const result = mapComdirectTransaction(
      {
        bookingDate: '2026-02-06',
        amount: { value: '-50', unit: 'EUR' },
        creditor: { holderName: 'Geldautomat' },
      },
      OWN_IBAN
    );

    expect(result?.partner).toBe('Geldautomat');
  });

  it('vergleicht IBANs unabhängig von Leerzeichen und Groß-/Kleinschreibung', () => {
    const result = mapComdirectTransaction(
      {
        bookingDate: '2026-02-07',
        amount: { value: '-30', unit: 'EUR' },
        debtor: { holderName: 'Max Mustermann', iban: 'de02 1203 0000 0000 2020 51' },
        creditor: { holderName: 'Shop GmbH', iban: 'DE11500105170648489890' },
      },
      OWN_IBAN
    );

    expect(result?.partner).toBe('Shop GmbH');
  });

  it('faellt auf den Transaktionstyp-Text zurueck, wenn remittanceInfo fehlt', () => {
    const result = mapComdirectTransaction(
      {
        bookingDate: '2026-01-10',
        amount: { value: '-5', unit: 'EUR' },
        transactionType: { text: 'Kartenzahlung' },
      },
      OWN_IBAN
    );

    expect(result?.purpose).toBe('Kartenzahlung');
    expect(result?.partner).toBe('Unbekannt');
  });

  it('entfernt die nummerierten SEPA-Zeilenpräfixe und überflüssige Leerzeichen im Verwendungszweck', () => {
    const result = mapComdirectTransaction(
      {
        bookingDate: '2026-08-05',
        amount: { value: '-12.5', unit: 'EUR' },
        remittanceInfo:
          '01Hungriges Herz, Muenchen  DE       02Karte Nr. 1234 56XX XXXX 1234      ' +
          '03Kartenzahlung                      04comdirect Visa-Debitkarte          ' +
          '052026-08-05 00:00:00',
      },
      OWN_IBAN
    );

    expect(result?.purpose).toBe(
      'Hungriges Herz, Muenchen DE Karte Nr. 1234 56XX XXXX 1234 Kartenzahlung comdirect Visa-Debitkarte 2026-08-05 00:00:00'
    );
  });

  it('laesst Verwendungszweck-Text ohne Zeilenpräfixe unveraendert (bis auf Leerzeichen-Kollaps)', () => {
    const result = mapComdirectTransaction(
      {
        bookingDate: '2026-08-05',
        amount: { value: '-12.5', unit: 'EUR' },
        remittanceInfo: 'Miete   August',
      },
      OWN_IBAN
    );

    expect(result?.purpose).toBe('Miete August');
  });

  it('entfernt auch einen einzelnen Zeilenpräfix ohne weitere Segmente', () => {
    const result = mapComdirectTransaction(
      {
        bookingDate: '2026-08-05',
        amount: { value: '-12.5', unit: 'EUR' },
        remittanceInfo: '01Kartenzahlung',
      },
      OWN_IBAN
    );

    expect(result?.purpose).toBe('Kartenzahlung');
  });

  it('gibt null zurueck fuer fehlendes Datum oder ungueltigen Betrag', () => {
    expect(mapComdirectTransaction({ amount: { value: '10', unit: 'EUR' } }, OWN_IBAN)).toBeNull();
    expect(
      mapComdirectTransaction(
        { bookingDate: '2026-01-01', amount: { value: 'x', unit: 'EUR' } },
        OWN_IBAN
      )
    ).toBeNull();
    expect(
      mapComdirectTransaction(
        { bookingDate: '2026-01-01', amount: { value: '0', unit: 'EUR' } },
        OWN_IBAN
      )
    ).toBeNull();
  });

  it('nutzt valutaDate als Fallback, wenn bookingDate fehlt', () => {
    const result = mapComdirectTransaction(
      {
        valutaDate: '2026-02-01',
        amount: { value: '-1', unit: 'EUR' },
      },
      OWN_IBAN
    );

    expect(result?.date).toBe('2026-02-01');
  });
});

describe('mapComdirectTransactions', () => {
  it('filtert nicht mappbare Eintraege heraus', () => {
    const results = mapComdirectTransactions(
      [
        { bookingDate: '2026-01-01', amount: { value: '-1', unit: 'EUR' } },
        { amount: { value: '-1', unit: 'EUR' } },
      ],
      OWN_IBAN
    );

    expect(results).toHaveLength(1);
  });
});

describe('applyCategoryInference', () => {
  it('uebernimmt die Kategorie einer identischen Buchung (gleicher Partner/Typ/Betrag) wie beim CSV-Import', () => {
    const existing = [
      tx({ partner: 'Vermieter GmbH', type: 'expense', amount: 750, category: 'Wohnen' }),
    ];
    const results = applyCategoryInference(
      [rawTx({ partner: 'Vermieter GmbH', type: 'expense', amount: 750 })],
      existing
    );

    expect(results[0].category).toBe('Wohnen');
  });

  it('nutzt die aehnlichste Buchung desselben Partners, wenn kein exakter Betrag vorliegt', () => {
    const existing = [
      tx({
        partner: 'Vermieter GmbH',
        type: 'expense',
        amount: 750,
        purpose: 'Miete Januar',
        category: 'Wohnen',
      }),
    ];
    const results = applyCategoryInference(
      [
        rawTx({
          partner: 'Vermieter GmbH',
          type: 'expense',
          amount: 760,
          purpose: 'Miete Februar',
        }),
      ],
      existing
    );

    expect(results[0].category).toBe('Wohnen');
  });

  it('behandelt den Partner "Unbekannt" wie CSV-Import als "kein Partner bekannt" statt ihn woertlich zu matchen', () => {
    const existing = [
      tx({ partner: 'Unbekannt', type: 'expense', amount: 5, category: 'Bankgebuehren' }),
      tx({
        partner: '',
        type: 'expense',
        amount: 999,
        purpose: 'Bargeldauszahlung',
        category: 'Bar',
      }),
    ];
    const results = applyCategoryInference(
      [
        rawTx({
          partner: 'Unbekannt',
          type: 'expense',
          amount: 5,
          purpose: 'Voellig anderer Text',
        }),
      ],
      existing
    );

    // Sollte NICHT die zufaellig gleich benannte "Unbekannt"-Buchung matchen,
    // sondern regulaer ueber den Text/die Historie gehen (hier: kein Treffer -> Sonstiges).
    expect(results[0].category).not.toBe('Bankgebuehren');
  });

  it('faellt ohne passende Historie auf "Sonstiges" zurueck', () => {
    const results = applyCategoryInference([rawTx({ partner: 'Neuer Partner GmbH' })], []);

    expect(results[0].category).toBe('Sonstiges');
  });
});
