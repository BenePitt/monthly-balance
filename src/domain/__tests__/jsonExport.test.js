import { describe, it, expect } from 'vitest';
import {
  CURRENT_VERSION,
  buildExportPayload,
  sanitizeTransaction,
  validateTransaction,
  sanitizeBalanceSettings,
  parseImportPayload,
  mergeTransactions,
  applyImportMode,
} from '../jsonExport';

describe('buildExportPayload', () => {
  it('erstellt ein Export-Objekt mit Version, Zeitstempel und Bilanz-Einstellungen', () => {
    const payload = buildExportPayload([{ id: '1' }], 'start', 100, 200);
    expect(payload.version).toBe(CURRENT_VERSION);
    expect(payload.exportedAt).toBeTruthy();
    expect(payload.transactions).toEqual([{ id: '1' }]);
    expect(payload.balanceSettings).toEqual({
      balanceMode: 'start',
      startBalance: 100,
      currentBalance: 200,
    });
  });
});

describe('sanitizeTransaction', () => {
  it('setzt Standardwerte für fehlende Kategorie und Partner', () => {
    const result = sanitizeTransaction({ id: '1', date: '2026-01-01', type: 'income', amount: 10 });
    expect(result.category).toBe('Sonstiges');
    expect(result.partner).toBe('Unbekannt');
  });

  it('trimmt vorhandene Kategorie und Partner statt sie zu ersetzen', () => {
    const result = sanitizeTransaction({
      id: '1',
      category: '  Miete  ',
      partner: '  Vermieter  ',
    });
    expect(result.category).toBe('Miete');
    expect(result.partner).toBe('Vermieter');
  });

  it('erzwingt recurrence auf "once", falls kein gültiger Wert vorliegt', () => {
    expect(sanitizeTransaction({ id: '1', recurrence: 'monthly' }).recurrence).toBe('monthly');
    expect(sanitizeTransaction({ id: '1', recurrence: 'wöchentlich' }).recurrence).toBe('once');
  });

  it('behält ein vorhandenes createdAt bei, statt es zu überschreiben', () => {
    const result = sanitizeTransaction({ id: '1', createdAt: '2020-01-01T00:00:00.000Z' });
    expect(result.createdAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('setzt createdAt neu, wenn keines vorhanden ist', () => {
    const result = sanitizeTransaction({ id: '1' });
    expect(result.createdAt).toBeTruthy();
  });
});

describe('validateTransaction', () => {
  const valid = () => ({
    id: '1',
    date: '2026-01-01',
    type: 'income',
    amount: 10,
    purpose: 'Gehalt',
  });

  it('akzeptiert eine gültige Transaktion', () => {
    expect(validateTransaction(valid())).toEqual({ valid: true, errors: [] });
  });

  it('meldet eine fehlende id', () => {
    const { valid: isValid, errors } = validateTransaction({ ...valid(), id: '' });
    expect(isValid).toBe(false);
    expect(errors).toContain('id fehlt');
  });

  it('meldet ein ungültiges Datum', () => {
    const { errors } = validateTransaction({ ...valid(), date: '01.01.2026' });
    expect(errors).toContain('Ungültiges Datum');
  });

  it('meldet einen ungültigen Typ', () => {
    const { errors } = validateTransaction({ ...valid(), type: 'sonstiges' });
    expect(errors).toContain('Ungültiger Typ');
  });

  it('meldet einen ungültigen Betrag', () => {
    expect(validateTransaction({ ...valid(), amount: 0 }).errors).toContain('Ungültiger Betrag');
    expect(validateTransaction({ ...valid(), amount: -5 }).errors).toContain('Ungültiger Betrag');
    expect(validateTransaction({ ...valid(), amount: NaN }).errors).toContain('Ungültiger Betrag');
  });

  it('meldet einen fehlenden Verwendungszweck', () => {
    const { errors } = validateTransaction({ ...valid(), purpose: '  ' });
    expect(errors).toContain('Verwendungszweck fehlt');
  });
});

describe('sanitizeBalanceSettings', () => {
  it('liefert Standardwerte bei ungültiger Eingabe', () => {
    expect(sanitizeBalanceSettings(null)).toEqual({
      startBalance: 0,
      currentBalance: 0,
      balanceMode: 'start',
    });
    expect(sanitizeBalanceSettings('foo')).toEqual({
      startBalance: 0,
      currentBalance: 0,
      balanceMode: 'start',
    });
  });

  it('übernimmt gültige Werte', () => {
    const result = sanitizeBalanceSettings({
      startBalance: 100,
      currentBalance: 250,
      balanceMode: 'current',
    });
    expect(result).toEqual({ startBalance: 100, currentBalance: 250, balanceMode: 'current' });
  });

  it('erzwingt balanceMode auf "start" bei ungültigem Wert', () => {
    expect(sanitizeBalanceSettings({ balanceMode: 'unbekannt' }).balanceMode).toBe('start');
  });
});

describe('parseImportPayload', () => {
  it('erkennt das Legacy-Array-Format als Version 0', () => {
    const result = parseImportPayload([{ id: '1' }]);
    expect(result.version).toBe(0);
    expect(result.transactions).toEqual([{ id: '1' }]);
    expect(result.balanceSettings).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it('meldet ein ungültiges JSON-Format', () => {
    const result = parseImportPayload(null);
    expect(result.warnings).toContain('Ungültiges JSON-Format');
    expect(result.transactions).toEqual([]);
  });

  it('liest ein gültiges v1-Export-Objekt', () => {
    const payload = buildExportPayload([{ id: '1' }], 'start', 0, 0);
    const result = parseImportPayload(payload);
    expect(result.version).toBe(CURRENT_VERSION);
    expect(result.transactions).toEqual([{ id: '1' }]);
    expect(result.balanceSettings).toEqual(payload.balanceSettings);
    expect(result.warnings).toEqual([]);
  });

  it('warnt bei einer neueren Version als der aktuellen', () => {
    const result = parseImportPayload({ version: CURRENT_VERSION + 1, transactions: [] });
    expect(result.warnings).toHaveLength(1);
  });
});

describe('mergeTransactions', () => {
  it('dedupliziert nach id und behält bestehende Einträge', () => {
    const existing = [{ id: '1' }, { id: '2' }];
    const incoming = [{ id: '2' }, { id: '3' }];
    expect(mergeTransactions(existing, incoming)).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
  });
});

describe('applyImportMode', () => {
  it('ersetzt bei Modus "replace" alle bestehenden Transaktionen', () => {
    const result = applyImportMode([{ id: '1' }], [{ id: '2' }], 'replace');
    expect(result).toEqual([{ id: '2' }]);
  });

  it('führt bei anderem Modus die Transaktionen zusammen (merge)', () => {
    const result = applyImportMode([{ id: '1' }], [{ id: '2' }], 'merge');
    expect(result).toEqual([{ id: '1' }, { id: '2' }]);
  });
});
