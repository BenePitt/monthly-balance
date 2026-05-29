/**
 * Determines whether a transaction applies to a given month/year.
 *
 * - "once": applies only if the transaction date falls in that exact month.
 * - "monthly": applies from the transaction's start month onwards.
 */
export function isTransactionInMonth(transaction, year, month) {
  const [txYear, txMonth] = transaction.date.split('-').map(Number);
  // txMonth is 1-based

  if (transaction.recurrence === 'once') {
    return txYear === year && txMonth === month;
  }

  // monthly: applies from start month (inclusive) to any future month
  const txYearMonth = txYear * 12 + txMonth;
  const targetYearMonth = year * 12 + month;
  return txYearMonth <= targetYearMonth;
}

/**
 * Returns all transactions that apply to the given year/month.
 */
export function getTransactionsForMonth(transactions, year, month) {
  return transactions.filter((t) => isTransactionInMonth(t, year, month));
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function toIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDateParts(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year, month, day };
}

function compareYearMonthDay(a, b) {
  return a.year * 10000 + a.month * 100 + a.day - (b.year * 10000 + b.month * 100 + b.day);
}

/**
 * Determines whether a transaction applies to a concrete day.
 *
 * - "once": applies only on the transaction date.
 * - "monthly": applies once per month from its start date, on the same day
 *   of month. If a month has fewer days, it applies on that month's last day.
 */
export function isTransactionOnDay(transaction, isoDate) {
  const txDate = getDateParts(transaction.date);
  const targetDate = getDateParts(isoDate);

  if (transaction.recurrence === 'once') {
    return transaction.date === isoDate;
  }

  if (compareYearMonthDay(targetDate, txDate) < 0) return false;

  const effectiveDay = Math.min(txDate.day, daysInMonth(targetDate.year, targetDate.month));
  return targetDate.day === effectiveDay;
}

/**
 * Generates an array of ISO date strings for a month range (inclusive).
 */
export function getDaysInRange(startYear, startMonth, endYear, endMonth) {
  const days = [];
  let year = startYear;
  let month = startMonth;
  let day = 1;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    days.push(toIsoDate(year, month, day));

    day += 1;
    if (day > daysInMonth(year, month)) {
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }

  return days;
}

/**
 * Calculates income, expense, and balance for a single day.
 */
export function calculateDayBalance(transactions, isoDate) {
  const dayTransactions = transactions.filter((t) => isTransactionOnDay(t, isoDate));
  let income = 0;
  let expense = 0;

  for (const t of dayTransactions) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expense += t.amount;
  }

  return {
    date: isoDate,
    income,
    expense,
    balance: income - expense,
    transactions: dayTransactions,
  };
}

function normalizeMoneyValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Calculates daily balances for every day in a selected month range.
 */
export function calculateDailyPeriodStats(
  transactions,
  startYear,
  startMonth,
  endYear,
  endMonth,
  startBalance = 0
) {
  const normalizedStartBalance = normalizeMoneyValue(startBalance);
  let accountBalance = normalizedStartBalance;

  const days = getDaysInRange(startYear, startMonth, endYear, endMonth)
    .map((isoDate) => {
      const day = calculateDayBalance(transactions, isoDate);
      const dailyBalance = day.balance;
      accountBalance += dailyBalance;

      return {
        ...day,
        dailyBalance,
        balance: accountBalance,
        accountBalance,
      };
    });
  const totalIncome = days.reduce((sum, day) => sum + day.income, 0);
  const totalExpense = days.reduce((sum, day) => sum + day.expense, 0);
  const totalMovement = totalIncome - totalExpense;

  return {
    days,
    startBalance: normalizedStartBalance,
    totalIncome,
    totalExpense,
    totalMovement,
    totalBalance: accountBalance,
    endBalance: accountBalance,
  };
}

/**
 * Calculates the required starting account balance for a known current/end
 * balance and all movements in the selected period.
 */
export function calculateStartBalanceFromCurrentBalance(
  transactions,
  startYear,
  startMonth,
  endYear,
  endMonth,
  currentBalance = 0
) {
  const normalizedCurrentBalance = normalizeMoneyValue(currentBalance);
  const stats = calculateDailyPeriodStats(transactions, startYear, startMonth, endYear, endMonth, 0);
  return normalizedCurrentBalance - stats.totalMovement;
}

/**
 * Calculates income, expense, and balance for a single month.
 * @returns {{ income: number, expense: number, balance: number, transactions: Array }}
 */
export function calculateMonthBalance(transactions, year, month) {
  const monthTransactions = getTransactionsForMonth(transactions, year, month);
  let income = 0;
  let expense = 0;

  for (const t of monthTransactions) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expense += t.amount;
  }

  return {
    year,
    month,
    income,
    expense,
    balance: income - expense,
    transactions: monthTransactions,
  };
}

/**
 * Generates an array of { year, month } objects for a date range (inclusive).
 */
export function getMonthsInRange(startYear, startMonth, endYear, endMonth) {
  const months = [];
  let y = startYear;
  let m = startMonth;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  return months;
}

/**
 * Calculates monthly balances and period totals for a date range.
 * @returns {{
 *   months: Array<{ year, month, income, expense, balance, transactions }>,
 *   totalIncome: number,
 *   totalExpense: number,
 *   totalBalance: number,
 *   avgMonthlyBalance: number
 * }}
 */
export function calculatePeriodStats(transactions, startYear, startMonth, endYear, endMonth) {
  const monthRange = getMonthsInRange(startYear, startMonth, endYear, endMonth);

  const months = monthRange.map(({ year, month }) =>
    calculateMonthBalance(transactions, year, month)
  );

  const totalIncome = months.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = months.reduce((sum, m) => sum + m.expense, 0);
  const totalBalance = totalIncome - totalExpense;
  const avgMonthlyBalance = months.length > 0 ? totalBalance / months.length : 0;

  return {
    months,
    totalIncome,
    totalExpense,
    totalBalance,
    avgMonthlyBalance,
  };
}

/**
 * Groups transactions for a month by a given dimension (category, purpose, partner).
 * Returns an array of { label, income, expense, balance }.
 */
export function groupMonthByDimension(monthData, dimension) {
  const map = new Map();

  for (const t of monthData.transactions) {
    const key = t[dimension] || '(unbekannt)';
    if (!map.has(key)) {
      map.set(key, { label: key, income: 0, expense: 0, balance: 0 });
    }
    const entry = map.get(key);
    if (t.type === 'income') entry.income += t.amount;
    else entry.expense += t.amount;
    entry.balance = entry.income - entry.expense;
  }

  return Array.from(map.values());
}

/**
 * Builds chart data for a bar chart grouped by a dimension across months.
 * Returns { labels: string[], series: [{ name, data: number[] }] }
 */
export function buildGroupedChartData(periodStats, groupBy) {
  const { months } = periodStats;

  // Collect all unique dimension values across all months
  const allKeys = new Set();
  for (const monthData of months) {
    for (const t of monthData.transactions) {
      allKeys.add(t[groupBy] || '(unbekannt)');
    }
  }

  // For each key, build a series with one value per month (net: income - expense)
  const series = Array.from(allKeys).map((key) => {
    const data = months.map((monthData) => {
      let net = 0;
      for (const t of monthData.transactions) {
        const k = t[groupBy] || '(unbekannt)';
        if (k === key) {
          net += t.type === 'income' ? t.amount : -t.amount;
        }
      }
      return net;
    });
    return { name: key, data };
  });

  return { series };
}
