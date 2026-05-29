import { describe, expect, it } from 'vitest';
import {
  inferTransactionMetadata,
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

describe('inferTransactionMetadata', () => {
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
      category: 'Onlinehandel',
      partner: 'Amazon',
      recurrence: 'once',
    });
    expect(result.transactions[1]).toMatchObject({
      type: 'income',
      amount: 1234.56,
      purpose: 'Gehalt Mai',
      category: 'Gehalt',
      partner: 'Arbeitgeber',
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
});
