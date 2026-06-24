import { formatDate } from '../utils/formatting';

/**
 * Applies active filters to a list of transactions using AND logic.
 *
 * Filters:
 *   - purpose: string – matches if transaction.purpose contains the string (case-insensitive)
 *   - categories: string[] – empty means no filter; non-empty means transaction.category must be in the list
 *   - partners: string[] – empty means no filter; non-empty means transaction.partner must be in the list
 */
export function applyFilters(transactions, filters) {
  const { purpose = '', categories = [], partners = [] } = filters;

  return transactions.filter((t) => {
    if (purpose.trim()) {
      const search = purpose.trim().toLowerCase();
      if (!t.purpose.toLowerCase().includes(search)) return false;
    }

    if (categories.length > 0) {
      if (!categories.includes(t.category)) return false;
    }

    if (partners.length > 0) {
      if (!partners.includes(t.partner)) return false;
    }

    return true;
  });
}

/**
 * Returns the sorted unique values for a given field across all transactions.
 */
export function getUniqueValues(transactions, field) {
  const values = new Set(transactions.map((t) => t[field]).filter(Boolean));
  return Array.from(values).sort();
}

/**
 * Collects all unique transactions across all months of a period, deduplicating by ID.
 * Recurring transactions that appear in multiple months are counted once.
 */
export function getUniquePeriodTransactions(periodStats) {
  const byId = new Map();
  for (const month of periodStats.months) {
    for (const tx of month.transactions) byId.set(tx.id, tx);
  }
  return Array.from(byId.values());
}

/**
 * Applies per-column text/select filters to a transaction list.
 * Each filter is an empty string (= no filter) or a search value.
 */
export function applyColumnFilters(transactions, filters) {
  return transactions.filter((t) => {
    if (filters.date && !formatDate(t.date).includes(filters.date)) return false;
    if (filters.type && t.type !== filters.type) return false;
    if (filters.amount && !String(t.amount).includes(filters.amount)) return false;
    if (filters.purpose && !t.purpose.toLowerCase().includes(filters.purpose.toLowerCase())) return false;
    if (filters.category && !t.category.toLowerCase().includes(filters.category.toLowerCase())) return false;
    if (filters.partner && !t.partner.toLowerCase().includes(filters.partner.toLowerCase())) return false;
    if (filters.recurrence && t.recurrence !== filters.recurrence) return false;
    return true;
  });
}

/**
 * Returns true if any filter is currently active.
 */
export function hasActiveFilters(filters) {
  return !!(
    (filters.purpose && filters.purpose.trim().length > 0) ||
    (filters.categories && filters.categories.length > 0) ||
    (filters.partners && filters.partners.length > 0)
  );
}
