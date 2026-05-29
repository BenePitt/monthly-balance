import { describe, it, expect } from 'vitest';
import { applyFilters, getUniqueValues, hasActiveFilters } from '../filterEngine';

const tx = (overrides) => ({
  id: '1',
  date: '2026-05-01',
  type: 'expense',
  amount: 100,
  purpose: 'Wocheneinkauf',
  category: 'Lebensmittel',
  partner: 'Supermarkt',
  recurrence: 'once',
  ...overrides,
});

const transactions = [
  tx({ id: '1', purpose: 'Wocheneinkauf', category: 'Lebensmittel', partner: 'Supermarkt' }),
  tx({ id: '2', purpose: 'Monatsmiete', category: 'Wohnen', partner: 'Vermieter', type: 'expense' }),
  tx({ id: '3', purpose: 'Gehalt Mai', category: 'Gehalt', partner: 'Arbeitgeber GmbH', type: 'income' }),
  tx({ id: '4', purpose: 'Einkauf Drogerie', category: 'Lebensmittel', partner: 'Drogerie', type: 'expense' }),
];

describe('applyFilters', () => {
  it('keine Filter gibt alle Transaktionen zurück', () => {
    const result = applyFilters(transactions, {});
    expect(result).toHaveLength(4);
  });

  it('Filter nach Verwendungszweck findet Teilbegriffe (case-insensitive)', () => {
    const result = applyFilters(transactions, { purpose: 'einkauf' });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toContain('1'); // Wocheneinkauf
    expect(result.map((t) => t.id)).toContain('4'); // Einkauf Drogerie
  });

  it('Filter nach einzelner Kategorie reduziert korrekt', () => {
    const result = applyFilters(transactions, { categories: ['Lebensmittel'] });
    expect(result).toHaveLength(2);
    result.forEach((t) => expect(t.category).toBe('Lebensmittel'));
  });

  it('Filter nach mehreren Kategorien gibt alle passenden zurück', () => {
    const result = applyFilters(transactions, { categories: ['Lebensmittel', 'Wohnen'] });
    expect(result).toHaveLength(3);
  });

  it('Filter nach Transaktionspartner reduziert korrekt', () => {
    const result = applyFilters(transactions, { partners: ['Supermarkt'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('kombinierte Filter werden mit UND verknüpft', () => {
    const result = applyFilters(transactions, {
      purpose: 'einkauf',
      categories: ['Lebensmittel'],
      partners: ['Supermarkt'],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('Filter nach nicht vorhandener Kategorie ergibt leere Liste', () => {
    const result = applyFilters(transactions, { categories: ['Nichtexistent'] });
    expect(result).toHaveLength(0);
  });

  it('leere Kategorienliste filtert nicht', () => {
    const result = applyFilters(transactions, { categories: [] });
    expect(result).toHaveLength(4);
  });
});

describe('getUniqueValues', () => {
  it('liefert sortierte eindeutige Kategorien', () => {
    const cats = getUniqueValues(transactions, 'category');
    expect(cats).toEqual(['Gehalt', 'Lebensmittel', 'Wohnen']);
  });

  it('liefert sortierte eindeutige Partner', () => {
    const partners = getUniqueValues(transactions, 'partner');
    expect(partners).toContain('Supermarkt');
    expect(partners).toContain('Vermieter');
  });
});

describe('hasActiveFilters', () => {
  it('keine aktiven Filter', () => {
    expect(hasActiveFilters({ purpose: '', categories: [], partners: [] })).toBe(false);
    expect(hasActiveFilters({})).toBe(false);
  });

  it('purpose-Filter ist aktiv', () => {
    expect(hasActiveFilters({ purpose: 'test' })).toBe(true);
  });

  it('Kategorien-Filter ist aktiv', () => {
    expect(hasActiveFilters({ categories: ['Wohnen'] })).toBe(true);
  });

  it('Partner-Filter ist aktiv', () => {
    expect(hasActiveFilters({ partners: ['Supermarkt'] })).toBe(true);
  });
});
