import { describe, expect, it } from 'vitest';
import { levenshteinDistance, relativeLevenshteinDistance } from '../textSimilarity';

describe('levenshteinDistance', () => {
  it('ist 0 fuer identische Strings', () => {
    expect(levenshteinDistance('Amazon', 'Amazon')).toBe(0);
  });

  it('ist die Laenge des anderen Strings, wenn einer leer ist', () => {
    expect(levenshteinDistance('', 'Amazon')).toBe(6);
    expect(levenshteinDistance('Amazon', '')).toBe(6);
  });

  it('zaehlt Einfuegungen, Loeschungen und Ersetzungen korrekt', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('Edeka Einkauf', 'Edeka Markt')).toBe(6);
  });
});

describe('relativeLevenshteinDistance', () => {
  it('ist 0 fuer zwei leere Strings', () => {
    expect(relativeLevenshteinDistance('', '')).toBe(0);
  });

  it('ist 0 fuer identische Strings', () => {
    expect(relativeLevenshteinDistance('Amazon', 'Amazon')).toBe(0);
  });

  it('normalisiert auf die Laenge des laengeren Strings', () => {
    expect(relativeLevenshteinDistance('abc', 'abcd')).toBeCloseTo(1 / 4);
  });

  it('ist 1 fuer komplett verschiedene Strings gleicher Laenge', () => {
    expect(relativeLevenshteinDistance('abc', 'xyz')).toBe(1);
  });
});
