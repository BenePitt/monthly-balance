import { describe, expect, it } from 'vitest';
import { detectImportFormat } from '../importFormat';

describe('detectImportFormat', () => {
  it('erkennt .csv-Dateiendung', () => {
    expect(detectImportFormat({ fileName: 'export.csv', text: 'egal' })).toBe('csv');
  });

  it('erkennt .json-Dateiendung', () => {
    expect(detectImportFormat({ fileName: 'export.json', text: 'egal' })).toBe('json');
  });

  it('erkennt Dateiendungen unabhaengig von Gross-/Kleinschreibung', () => {
    expect(detectImportFormat({ fileName: 'EXPORT.CSV', text: 'egal' })).toBe('csv');
    expect(detectImportFormat({ fileName: 'EXPORT.JSON', text: 'egal' })).toBe('json');
  });

  it('erkennt JSON-Objekt-Text ohne Dateiname', () => {
    expect(detectImportFormat({ text: '{"transactions":[]}' })).toBe('json');
  });

  it('erkennt JSON-Array-Text ohne Dateiname', () => {
    expect(detectImportFormat({ text: '[1,2,3]' })).toBe('json');
  });

  it('erkennt CSV-artigen Text ohne Dateiname als csv', () => {
    const csv = 'Buchungstag;Buchungstext;Umsatz\n01.01.2026;Test;10,00';
    expect(detectImportFormat({ text: csv })).toBe('csv');
  });

  it('faellt bei ungueltigem JSON-aehnlichem Text auf csv zurueck', () => {
    expect(detectImportFormat({ text: '{nicht valide' })).toBe('csv');
  });

  it('gibt null fuer leeren Text ohne Dateiname zurueck', () => {
    expect(detectImportFormat({ text: '   ' })).toBeNull();
    expect(detectImportFormat({})).toBeNull();
  });

  it('sniffed den Inhalt bei unbekannter Dateiendung', () => {
    expect(detectImportFormat({ fileName: 'daten.txt', text: '[1,2,3]' })).toBe('json');
    expect(detectImportFormat({ fileName: 'daten.txt', text: 'a;b;c' })).toBe('csv');
  });
});
