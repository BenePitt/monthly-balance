import { describe, it, expect } from 'vitest';
import {
  isTransactionInMonth,
  isTransactionOnDay,
  calculateMonthBalance,
  calculateDayBalance,
  calculateDailyPeriodStats,
  calculateStartBalanceFromCurrentBalance,
  calculatePeriodStats,
  getDaysInRange,
  getMonthsInRange,
} from '../balanceCalculator';

const income = (date, amount, recurrence = 'once') => ({
  id: '1', date, type: 'income', amount, purpose: 'Test', category: 'Test',
  partner: 'Test', recurrence,
});

const expense = (date, amount, recurrence = 'once') => ({
  id: '2', date, type: 'expense', amount, purpose: 'Test', category: 'Test',
  partner: 'Test', recurrence,
});

// --- isTransactionInMonth ---

describe('isTransactionInMonth', () => {
  it('einmalige Einnahme im Mai 2026 erscheint nur im Mai 2026', () => {
    const t = income('2026-05-01', 100, 'once');
    expect(isTransactionInMonth(t, 2026, 5)).toBe(true);
    expect(isTransactionInMonth(t, 2026, 4)).toBe(false);
    expect(isTransactionInMonth(t, 2026, 6)).toBe(false);
    expect(isTransactionInMonth(t, 2025, 5)).toBe(false);
  });

  it('regelmäßige Ausgabe mit Start Januar 2026 erscheint in Jan, Feb, Mär 2026', () => {
    const t = expense('2026-01-01', 950, 'monthly');
    expect(isTransactionInMonth(t, 2026, 1)).toBe(true);
    expect(isTransactionInMonth(t, 2026, 2)).toBe(true);
    expect(isTransactionInMonth(t, 2026, 3)).toBe(true);
    expect(isTransactionInMonth(t, 2026, 12)).toBe(true);
    expect(isTransactionInMonth(t, 2027, 6)).toBe(true);
  });

  it('regelmäßige Ausgabe mit Start März 2026 erscheint nicht in Januar oder Februar 2026', () => {
    const t = expense('2026-03-01', 500, 'monthly');
    expect(isTransactionInMonth(t, 2026, 1)).toBe(false);
    expect(isTransactionInMonth(t, 2026, 2)).toBe(false);
    expect(isTransactionInMonth(t, 2026, 3)).toBe(true);
    expect(isTransactionInMonth(t, 2026, 4)).toBe(true);
  });

  it('regelmäßige Transaktion vom Vorjahr gilt im aktuellen Jahr', () => {
    const t = income('2025-06-01', 200, 'monthly');
    expect(isTransactionInMonth(t, 2026, 1)).toBe(true);
    expect(isTransactionInMonth(t, 2025, 5)).toBe(false);
    expect(isTransactionInMonth(t, 2025, 6)).toBe(true);
  });
});

// --- calculateMonthBalance ---

describe('calculateMonthBalance', () => {
  it('Einnahmen und Ausgaben werden korrekt zur Monatsbilanz verrechnet', () => {
    const transactions = [
      income('2026-05-01', 3200),
      expense('2026-05-03', 950),
      expense('2026-05-07', 54.90),
    ];
    const result = calculateMonthBalance(transactions, 2026, 5);
    expect(result.income).toBeCloseTo(3200);
    expect(result.expense).toBeCloseTo(1004.90);
    expect(result.balance).toBeCloseTo(3200 - 1004.90);
  });

  it('regelmäßige Ausgabe erscheint in mehreren Monaten', () => {
    const transactions = [expense('2026-01-01', 950, 'monthly')];
    const jan = calculateMonthBalance(transactions, 2026, 1);
    const feb = calculateMonthBalance(transactions, 2026, 2);
    const mar = calculateMonthBalance(transactions, 2026, 3);
    expect(jan.expense).toBeCloseTo(950);
    expect(feb.expense).toBeCloseTo(950);
    expect(mar.expense).toBeCloseTo(950);
  });

  it('einmalige Transaktion erscheint nur einmal', () => {
    const transactions = [income('2026-05-01', 100, 'once')];
    const may = calculateMonthBalance(transactions, 2026, 5);
    const jun = calculateMonthBalance(transactions, 2026, 6);
    expect(may.income).toBeCloseTo(100);
    expect(jun.income).toBeCloseTo(0);
  });

  it('Bilanz = Einnahmen - Ausgaben', () => {
    const transactions = [
      income('2026-03-01', 2000),
      expense('2026-03-01', 800),
      expense('2026-03-15', 300),
    ];
    const result = calculateMonthBalance(transactions, 2026, 3);
    expect(result.balance).toBeCloseTo(2000 - 800 - 300);
  });

  it('keine Transaktionen ergibt 0-Bilanz', () => {
    const result = calculateMonthBalance([], 2026, 5);
    expect(result.income).toBe(0);
    expect(result.expense).toBe(0);
    expect(result.balance).toBe(0);
  });
});

// --- getMonthsInRange ---

describe('getMonthsInRange', () => {
  it('liefert alle Monate von Jan bis Mär 2026', () => {
    const months = getMonthsInRange(2026, 1, 2026, 3);
    expect(months).toHaveLength(3);
    expect(months[0]).toEqual({ year: 2026, month: 1 });
    expect(months[2]).toEqual({ year: 2026, month: 3 });
  });

  it('liefert Monate über Jahreswechsel', () => {
    const months = getMonthsInRange(2025, 11, 2026, 2);
    expect(months).toHaveLength(4);
    expect(months[0]).toEqual({ year: 2025, month: 11 });
    expect(months[3]).toEqual({ year: 2026, month: 2 });
  });

  it('einzelner Monat ergibt eine Periode', () => {
    const months = getMonthsInRange(2026, 6, 2026, 6);
    expect(months).toHaveLength(1);
  });
});

// --- Daily line chart data ---

describe('getDaysInRange', () => {
  it('liefert jeden Tag im ausgewaehlten Monatszeitraum', () => {
    const days = getDaysInRange(2026, 2, 2026, 3);

    expect(days).toHaveLength(59);
    expect(days[0]).toBe('2026-02-01');
    expect(days[58]).toBe('2026-03-31');
  });
});

describe('isTransactionOnDay', () => {
  it('einmalige Transaktion gilt nur am exakten Tag', () => {
    const t = expense('2026-05-10', 20, 'once');

    expect(isTransactionOnDay(t, '2026-05-10')).toBe(true);
    expect(isTransactionOnDay(t, '2026-05-11')).toBe(false);
  });

  it('monatliche Transaktion gilt jeden Monat am gleichen Tag', () => {
    const t = expense('2026-01-15', 50, 'monthly');

    expect(isTransactionOnDay(t, '2026-01-15')).toBe(true);
    expect(isTransactionOnDay(t, '2026-02-15')).toBe(true);
    expect(isTransactionOnDay(t, '2026-02-14')).toBe(false);
  });

  it('monatliche Transaktion am Monatsende nutzt in kuerzeren Monaten den letzten Tag', () => {
    const t = expense('2026-01-31', 50, 'monthly');

    expect(isTransactionOnDay(t, '2026-02-28')).toBe(true);
    expect(isTransactionOnDay(t, '2026-03-31')).toBe(true);
  });
});

describe('calculateDayBalance', () => {
  it('berechnet Tageswerte fuer das Liniendiagramm', () => {
    const transactions = [
      income('2026-05-10', 100),
      expense('2026-05-10', 40),
      expense('2026-05-11', 10),
    ];

    const may10 = calculateDayBalance(transactions, '2026-05-10');

    expect(may10.income).toBe(100);
    expect(may10.expense).toBe(40);
    expect(may10.balance).toBe(60);
  });
});

describe('calculateDailyPeriodStats', () => {
  it('enthaelt Tage ohne Transaktionen als Nullpunkte', () => {
    const stats = calculateDailyPeriodStats([income('2026-05-02', 100)], 2026, 5, 2026, 5);

    expect(stats.days).toHaveLength(31);
    expect(stats.days[0]).toMatchObject({ date: '2026-05-01', income: 0, expense: 0, balance: 0 });
    expect(stats.days[1]).toMatchObject({ date: '2026-05-02', income: 100, balance: 100 });
  });

  it('berechnet die Bilanz als laufenden Kontostand ab Startkontostand', () => {
    const transactions = [
      income('2026-05-02', 100),
      expense('2026-05-04', 30),
    ];

    const stats = calculateDailyPeriodStats(transactions, 2026, 5, 2026, 5, 500);

    expect(stats.days[0]).toMatchObject({
      date: '2026-05-01',
      dailyBalance: 0,
      balance: 500,
      accountBalance: 500,
    });
    expect(stats.days[1]).toMatchObject({
      date: '2026-05-02',
      dailyBalance: 100,
      balance: 600,
      accountBalance: 600,
    });
    expect(stats.days[3]).toMatchObject({
      date: '2026-05-04',
      dailyBalance: -30,
      balance: 570,
      accountBalance: 570,
    });
    expect(stats.totalMovement).toBe(70);
    expect(stats.endBalance).toBe(570);
  });
});

describe('calculateStartBalanceFromCurrentBalance', () => {
  it('berechnet den Startkontostand aus aktuellem Kontostand und Zeitraumbewegung', () => {
    const transactions = [
      income('2026-05-02', 100),
      expense('2026-05-04', 30),
    ];

    const startBalance = calculateStartBalanceFromCurrentBalance(
      transactions,
      2026,
      5,
      2026,
      5,
      570
    );

    expect(startBalance).toBe(500);
  });
});

// --- calculatePeriodStats ---

describe('calculatePeriodStats', () => {
  const transactions = [
    income('2026-01-01', 3200, 'monthly'),
    expense('2026-01-01', 950, 'monthly'),
    expense('2026-02-10', 100, 'once'),
  ];

  it('berechnet Gesamtsummen für den Zeitraum Jan-Mar 2026', () => {
    const stats = calculatePeriodStats(transactions, 2026, 1, 2026, 3);
    // income: 3x3200 = 9600
    // expense: 3x950 + 100 = 2950
    expect(stats.totalIncome).toBeCloseTo(9600);
    expect(stats.totalExpense).toBeCloseTo(2950);
    expect(stats.totalBalance).toBeCloseTo(9600 - 2950);
    expect(stats.months).toHaveLength(3);
  });

  it('berechnet die durchschnittliche Monatsbilanz', () => {
    const stats = calculatePeriodStats(transactions, 2026, 1, 2026, 3);
    expect(stats.avgMonthlyBalance).toBeCloseTo(stats.totalBalance / 3);
  });

  it('einmalige Transaktion erscheint nur in ihrem Monat in der Periodenanalyse', () => {
    const stats = calculatePeriodStats(transactions, 2026, 1, 2026, 3);
    const feb = stats.months.find((m) => m.month === 2);
    expect(feb.expense).toBeCloseTo(950 + 100); // monthly 950 + once 100
    const jan = stats.months.find((m) => m.month === 1);
    expect(jan.expense).toBeCloseTo(950); // only monthly
  });
});
