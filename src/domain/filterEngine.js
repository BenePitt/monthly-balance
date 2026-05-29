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
 * Returns true if any filter is currently active.
 */
export function hasActiveFilters(filters) {
  return !!(
    (filters.purpose && filters.purpose.trim().length > 0) ||
    (filters.categories && filters.categories.length > 0) ||
    (filters.partners && filters.partners.length > 0)
  );
}
