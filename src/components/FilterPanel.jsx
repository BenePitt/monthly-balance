import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getUniqueValues, hasActiveFilters } from '../domain/filterEngine';

export default function FilterPanel({ onResetAll, hasColumnFilters = false }) {
  const { transactions, filters, dateRange, dispatch } = useApp();

  const periodTransactions = useMemo(() => {
    const { startYear, startMonth, endYear, endMonth } = dateRange;
    const startYM = startYear * 12 + startMonth;
    const endYM = endYear * 12 + endMonth;
    return transactions.filter((t) => {
      const [ty, tm] = t.date.split('-').map(Number);
      const txYM = ty * 12 + tm;
      if (t.recurrence === 'monthly') return txYM <= endYM;
      return txYM >= startYM && txYM <= endYM;
    });
  }, [transactions, dateRange]);

  const allCategories = getUniqueValues(periodTransactions, 'category');
  const allPartners = getUniqueValues(periodTransactions, 'partner');
  const isGlobalActive = hasActiveFilters(filters);
  const showReset = isGlobalActive || hasColumnFilters;

  function toggleCategory(cat) {
    const updated = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    dispatch({ type: 'SET_FILTER_CATEGORIES', payload: updated });
  }

  function togglePartner(partner) {
    const updated = filters.partners.includes(partner)
      ? filters.partners.filter((p) => p !== partner)
      : [...filters.partners, partner];
    dispatch({ type: 'SET_FILTER_PARTNERS', payload: updated });
  }

  function resetFilters() {
    dispatch({ type: 'RESET_FILTERS' });
    onResetAll?.();
  }

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <h3 className="filter-panel-title">Filter</h3>
        {showReset && (
          <button className="btn btn-sm btn-outline" onClick={resetFilters}>
            Filter zurücksetzen
          </button>
        )}
      </div>

      {allCategories.length > 0 && (
        <div className="filter-group">
          <div className="form-label">Kategorie</div>
          <div className="filter-chips">
            {allCategories.map((cat) => (
              <button
                key={cat}
                className={`chip${filters.categories.includes(cat) ? ' chip--active' : ''}`}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {allPartners.length > 0 && (
        <div className="filter-group">
          <div className="form-label">Transaktionspartner</div>
          <div className="filter-chips">
            {allPartners.map((partner) => (
              <button
                key={partner}
                className={`chip${filters.partners.includes(partner) ? ' chip--active' : ''}`}
                onClick={() => togglePartner(partner)}
              >
                {partner}
              </button>
            ))}
          </div>
        </div>
      )}

      {allCategories.length === 0 && allPartners.length === 0 && (
        <p className="filter-empty-hint">
          Noch keine Transaktionen vorhanden. Erfassen Sie zunächst Transaktionen, um Filter zu verwenden.
        </p>
      )}
    </div>
  );
}
