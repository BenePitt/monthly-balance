import { describe, expect, it } from 'vitest';
import {
  inferTransactionMetadata,
  inferImportMetadata,
  parseBankCsv,
  parseCsvRows,
} from '../csvImport';

describe('parseCsvRows', () => {
  it('liest Semikolon-CSV mit Anfuehrungszeichen', () => {
    const rows = parseCsvRows('"A";"B";"Text mit ; Semikolon"\n"1";"2";"3"');

    expect(rows).toEqual([
      ['A', 'B', 'Text mit ; Semikolon'],
      ['1', '2', '3'],
    ]);
  });
});

describe('inferTransactionMetadata (Vorschlaege fuer manuelle Eingabe)', () => {
  it('erkennt bekannte oeffentliche Partner', () => {
    expect(inferTransactionMetadata('AMAZON Mktp DE').partner).toBe('Amazon');
    expect(inferTransactionMetadata('EDEKA Einkauf').category).toBe('Lebensmittel');
    expect(inferTransactionMetadata('PayPal Europe').partner).toBe('PayPal');
  });

  it('erkennt generische oeffentliche Buchungsarten', () => {
    const result = inferTransactionMetadata('Gehalt Mai', 'income');

    expect(result).toMatchObject({
      partner: 'Arbeitgeber',
      category: 'Gehalt',
    });
  });
});

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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('inferImportMetadata', () => {
  it('uebernimmt den Partner aus dem Text zwischen "Auftraggeber:" und "Buchungstext:"', () => {
    const result = inferImportMetadata({
      bookingText: 'Auftraggeber: Mustermann GmbH Buchungstext: Einkauf Elektronik Ref. XYZ',
      type: 'expense',
      amount: 42,
      existingTransactions: [],
    });

    expect(result.partner).toBe('Mustermann GmbH');
    expect(result.partnerSource).toBe('auftraggeber');
  });

  it('faellt ohne Auftraggeber-Struktur auf die Keyword-Regeln fuer den Partner zurueck', () => {
    const result = inferImportMetadata({
      bookingText: 'AMAZON Mktp DE',
      type: 'expense',
      amount: 12,
      existingTransactions: [],
    });

    expect(result.partner).toBe('Amazon');
    expect(result.partnerSource).toBe('keyword-regel');
  });

  it('liefert ohne jede Historie "Sonstiges" (leer), auch bei bekanntem Partner', () => {
    const result = inferImportMetadata({
      bookingText: 'AMAZON Mktp DE',
      type: 'expense',
      amount: 12,
      existingTransactions: [],
    });

    expect(result.category).toBe('');
    expect(result.categorySource).toBe('keine-historie');
  });

  it('uebernimmt die Kategorie bei exaktem Treffer (Betrag+Typ+Partner)', () => {
    const existing = [
      tx({ partner: 'Mustermann GmbH', type: 'expense', amount: 42, category: 'Elektronik' }),
    ];
    const result = inferImportMetadata({
      bookingText: 'Auftraggeber: Mustermann GmbH Buchungstext: Anderer Text Ref. 1',
      type: 'expense',
      amount: 42,
      existingTransactions: existing,
    });

    expect(result.category).toBe('Elektronik');
    expect(result.categorySource).toBe('exakter-treffer');
  });

  it('uebernimmt die Kategorie der textlich naehesten Buchung bei gleichem Typ+Partner', () => {
    const existing = [
      tx({
        partner: 'Mustermann GmbH',
        type: 'expense',
        amount: 10,
        category: 'Haushalt',
        purpose: 'Buchungstext: Kauf Staubsauger',
      }),
      tx({
        partner: 'Mustermann GmbH',
        type: 'expense',
        amount: 15,
        category: 'Elektronik',
        purpose: 'Buchungstext: Kauf Laptop',
      }),
    ];
    const result = inferImportMetadata({
      bookingText: 'Auftraggeber: Mustermann GmbH Buchungstext: Kauf Laptop Tasche',
      type: 'expense',
      amount: 99,
      existingTransactions: existing,
    });

    expect(result.category).toBe('Elektronik');
    expect(result.categorySource).toBe('levenshtein-typ-partner');
  });

  it('uebernimmt die Kategorie ueber gleichen Partner, wenn der Typ abweicht', () => {
    const existing = [
      tx({
        partner: 'Mustermann GmbH',
        type: 'income',
        amount: 500,
        category: 'Sonstige Einnahmen',
        purpose: 'Buchungstext: Rueckerstattung',
      }),
    ];
    const result = inferImportMetadata({
      bookingText: 'Auftraggeber: Mustermann GmbH Buchungstext: Rueckerstattung Artikel',
      type: 'expense',
      amount: 20,
      existingTransactions: existing,
    });

    expect(result.category).toBe('Sonstige Einnahmen');
    expect(result.categorySource).toBe('levenshtein-partner');
  });

  it('erkennt eine bekannte Kategorie, wenn sie woertlich im Buchungstext vorkommt und der Partner unbekannt ist', () => {
    const existing = [
      tx({
        partner: 'Irgendwer',
        category: 'Lebensmittel',
        purpose: 'Buchungstext: Wocheneinkauf',
      }),
    ];
    const result = inferImportMetadata({
      bookingText: 'Buchungstext: Lebensmittel Markt Ref. 1',
      type: 'expense',
      amount: 30,
      existingTransactions: existing,
    });

    expect(result.category).toBe('Lebensmittel');
    expect(result.categorySource).toBe('kategorie-im-text');
  });

  it('erkennt eine Kategorie nur als eigenes Wort, nicht als Teil eines laengeren Wortes', () => {
    const existing = [
      tx({ partner: 'Irgendwer', category: 'Auto', purpose: 'Buchungstext: Sonstiges' }),
    ];
    const result = inferImportMetadata({
      bookingText: 'Buchungstext: Autoversicherung Jahresbeitrag Ref. 1',
      type: 'expense',
      amount: 30,
      existingTransactions: existing,
    });

    expect(result.category).not.toBe('Auto');
    expect(result.categorySource).not.toBe('kategorie-im-text');
  });

  it('bevorzugt bei mehreren im Text vorkommenden Kategorien die laengste', () => {
    const existing = [
      tx({ partner: 'Irgendwer1', category: 'Bahn', purpose: 'Buchungstext: Sonstiges A' }),
      tx({
        partner: 'Irgendwer2',
        category: 'Deutsche Bahn',
        purpose: 'Buchungstext: Sonstiges B',
      }),
    ];
    const result = inferImportMetadata({
      bookingText: 'Buchungstext: Fahrkarte Deutsche Bahn Ref. 1',
      type: 'expense',
      amount: 30,
      existingTransactions: existing,
    });

    expect(result.category).toBe('Deutsche Bahn');
    expect(result.categorySource).toBe('kategorie-im-text');
  });

  it('uebernimmt die Kategorie der aehnlichsten Buchung global, wenn Aehnlichkeit >= 70%', () => {
    const existing = [
      tx({
        partner: 'Irgendwer',
        category: 'Freizeit',
        purpose: 'Buchungstext: Kinokarten Muenchen',
      }),
    ];
    const result = inferImportMetadata({
      bookingText: 'Buchungstext: Kinokarten Muenster',
      type: 'expense',
      amount: 30,
      existingTransactions: existing,
    });

    expect(result.category).toBe('Freizeit');
    expect(result.categorySource).toBe('levenshtein-global');
  });

  it('faellt bei zu geringer Aehnlichkeit (<70%) auf "Sonstiges" zurueck', () => {
    const existing = [
      tx({ partner: 'Irgendwer', category: 'Freizeit', purpose: 'Buchungstext: Kinokarten' }),
    ];
    const result = inferImportMetadata({
      bookingText: 'Buchungstext: Zahnarztrechnung Praxis Novak',
      type: 'expense',
      amount: 30,
      existingTransactions: existing,
    });

    expect(result.category).toBe('');
    expect(result.categorySource).toBe('sonstiges-kein-treffer');
  });

  it('befuellt debugReason nur wenn debug=true', () => {
    const withoutDebug = inferImportMetadata({
      bookingText: 'AMAZON Mktp DE',
      existingTransactions: [],
    });
    expect(withoutDebug.debugReason).toBeNull();

    const withDebug = inferImportMetadata({
      bookingText: 'AMAZON Mktp DE',
      existingTransactions: [],
      debug: true,
    });
    expect(withDebug.debugReason).toEqual(expect.any(String));
    expect(withDebug.debugReason.length).toBeGreaterThan(0);
  });
});

describe('parseBankCsv', () => {
  it('importiert Bankumsatz-Zeilen aus der eigentlichen Kopfzeile', () => {
    const csv = [
      ';"Umsaetze Girokonto"',
      '"Neuer Kontostand";"0,00 EUR"',
      '',
      '"Buchungstag";"Wertstellung (Valuta)";"Vorgang";"Buchungstext";"Umsatz in EUR"',
      '"28.05.2026";"28.05.2026";"Kartenzahlung";"Amazon Marketplace";"-12,34"',
      '"29.05.2026";"29.05.2026";"Gutschrift";"Gehalt Mai";"1.234,56"',
    ].join('\n');

    const result = parseBankCsv(csv);

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({
      date: '2026-05-28',
      type: 'expense',
      amount: 12.34,
      purpose: 'Amazon Marketplace',
      partner: 'Amazon',
      category: 'Sonstiges',
      recurrence: 'once',
      isDuplicate: false,
    });
    expect(result.transactions[1]).toMatchObject({
      type: 'income',
      amount: 1234.56,
      purpose: 'Gehalt Mai',
      partner: 'Arbeitgeber',
      category: 'Sonstiges',
    });
  });

  it('verwendet fuer den Verwendungszweck immer den Buchungstext', () => {
    const csv = [
      '"Buchungstag";"Wertstellung (Valuta)";"Vorgang";"Buchungstext";"Umsatz in EUR"',
      '"28.05.2026";"28.05.2026";"Kartenzahlung";"Edeka Einkauf";"-42,10"',
    ].join('\n');

    const result = parseBankCsv(csv);

    expect(result.transactions[0].purpose).toBe('Edeka Einkauf');
    expect(result.transactions[0].purpose).not.toBe('Kartenzahlung');
  });

  it('laesst unbekannte Partner im manuellen Modus leer', () => {
    const csv = [
      '"Buchungstag";"Wertstellung (Valuta)";"Vorgang";"Buchungstext";"Umsatz in EUR"',
      '"28.05.2026";"28.05.2026";"Ueberweisung";"Nicht erkannter Text";"-10,00"',
    ].join('\n');

    const result = parseBankCsv(csv, { fillUnknowns: false });

    expect(result.transactions[0]).toMatchObject({
      category: '',
      partner: '',
      purpose: 'Nicht erkannter Text',
    });
  });

  it('extrahiert den Partner aus "Auftraggeber:"/"Buchungstext:" und kuerzt den Verwendungszweck auf den Text nach "Buchungstext:"', () => {
    const csv = [
      '"Buchungstag";"Wertstellung (Valuta)";"Vorgang";"Buchungstext";"Umsatz in EUR"',
      '"28.05.2026";"28.05.2026";"Ueberweisung";"Auftraggeber: Mustermann GmbH Buchungstext: Einkauf Ref. 1";"-42,10"',
    ].join('\n');

    const result = parseBankCsv(csv);

    expect(result.transactions[0].partner).toBe('Mustermann GmbH');
    expect(result.transactions[0].purpose).toBe('Einkauf Ref. 1');
  });

  it('extrahiert Partner und Verwendungszweck fuer "Empfaenger: ...Kto/IBAN: ... BLZ/BIC: ... Buchungstext: ..."', () => {
    const csv = [
      '"Buchungstag";"Wertstellung (Valuta)";"Vorgang";"Buchungstext";"Umsatz in EUR"',
      '"28.05.2026";"28.05.2026";"Ueberweisung";' +
        '"Empfänger: Markus MustermannKto/IBAN: DE712345678600 BLZ/BIC: CSDFFSEDXXX  Buchungstext: Ionos Ref. AZ2C29C32WEVC6XC/22732";' +
        '"-42,10"',
    ].join('\n');

    const result = parseBankCsv(csv);

    expect(result.transactions[0].partner).toBe('Markus Mustermann');
    expect(result.transactions[0].purpose).toBe('Ionos Ref. AZ2C29C32WEVC6XC/22732');
  });

  it('markiert eine bereits vorhandene Transaktion als Duplikat', () => {
    const existingTransactions = [
      tx({
        date: '2026-05-28',
        purpose: 'Edeka Einkauf',
        type: 'expense',
        amount: 42.1,
        recurrence: 'once',
      }),
    ];
    const csv = [
      '"Buchungstag";"Wertstellung (Valuta)";"Vorgang";"Buchungstext";"Umsatz in EUR"',
      '"28.05.2026";"28.05.2026";"Kartenzahlung";"Edeka Einkauf";"-42,10"',
    ].join('\n');

    const result = parseBankCsv(csv, { existingTransactions });

    expect(result.transactions[0].isDuplicate).toBe(true);
  });

  it('setzt debugInfo nur im Debug-Modus', () => {
    const csv = [
      '"Buchungstag";"Wertstellung (Valuta)";"Vorgang";"Buchungstext";"Umsatz in EUR"',
      '"28.05.2026";"28.05.2026";"Kartenzahlung";"Amazon Marketplace";"-12,34"',
    ].join('\n');

    expect(parseBankCsv(csv).transactions[0].debugInfo).toBeNull();
    expect(parseBankCsv(csv, { debug: true }).transactions[0].debugInfo).toEqual(
      expect.any(String)
    );
  });
});
