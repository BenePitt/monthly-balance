import { useMemo } from 'react';
import MonthRangeSelector from '../components/MonthRangeSelector';
import KennzahlenPanel from '../components/KennzahlenPanel';
import MonthSummaryTable from '../components/MonthSummaryTable';
import FilterPanel from '../components/FilterPanel';
import ChartContainer from '../charts/ChartContainer';
import CategoryMiniChart from '../charts/CategoryMiniChart';
import { useApp } from '../context/AppContext';
import { formatMonthYear } from '../utils/formatting';
import { hasActiveFilters, getUniqueValues } from '../domain/filterEngine';
import { calculateDimensionTotals } from '../domain/balanceCalculator';

const CATEGORY_SORT_OPTIONS = [
  { value: 'none', label: 'Standard' },
  { value: 'income', label: 'Einnahmen' },
  { value: 'expense', label: 'Ausgaben' },
  { value: 'balance', label: 'Bilanz' },
];

export default function Dashboard() {
  const {
    dateRange, transactions, filteredTransactions, filters, isLoading,
    categorySort, hideEmptyCategories, dispatch,
  } = useApp();
  const { startYear, startMonth, endYear, endMonth } = dateRange;
  const filtersActive = hasActiveFilters(filters);

  const categoryTotals = useMemo(
    () => calculateDimensionTotals(filteredTransactions, 'category', startYear, startMonth, endYear, endMonth),
    [filteredTransactions, startYear, startMonth, endYear, endMonth]
  );

  const allCategories = useMemo(() => (
    filters.categories.length > 0
      ? filters.categories
      : getUniqueValues(filteredTransactions, 'category')
  ), [filters.categories, filteredTransactions]);

  const categoriesToShow = useMemo(() => {
    const totalsByLabel = new Map(categoryTotals.map((t) => [t.label, t]));

    let result = allCategories;
    if (hideEmptyCategories) {
      result = result.filter((cat) => {
        const total = totalsByLabel.get(cat);
        return total && (total.income !== 0 || total.expense !== 0);
      });
    }

    if (categorySort !== 'none') {
      result = [...result].sort((a, b) => {
        const totalA = totalsByLabel.get(a)?.[categorySort] ?? -Infinity;
        const totalB = totalsByLabel.get(b)?.[categorySort] ?? -Infinity;
        return totalB - totalA;
      });
    }

    return result;
  }, [allCategories, categoryTotals, hideEmptyCategories, categorySort]);

  if (isLoading) {
    return <div className="page-loading">Daten werden geladen...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Übersicht für {formatMonthYear(startYear, startMonth)}
          {(startYear !== endYear || startMonth !== endMonth) && (
            <> bis {formatMonthYear(endYear, endMonth)}</>
          )}
          {filtersActive && <span className="filter-active-badge"> – Filter aktiv</span>}
        </p>
      </div>

      {transactions.length === 0 && (
        <div className="info-banner">
          <strong>Willkommen!</strong> Es sind noch keine Transaktionen vorhanden.
          Gehen Sie zu <em>Transaktionen</em>, um Einnahmen und Ausgaben zu erfassen.
        </div>
      )}

      <div className="auswertung-layout">
        <aside className="auswertung-sidebar">
          <div className="card">
            <h2 className="section-title">Zeitraum</h2>
            <MonthRangeSelector />
          </div>
          <div className="card" style={{ marginTop: '1rem' }}>
            <FilterPanel />
          </div>
        </aside>

        <main className="auswertung-main">
          <section className="section">
            <h2 className="section-title">Kennzahlen</h2>
            <KennzahlenPanel />
          </section>

          <section className="section">
            <h2 className="section-title">Diagramm</h2>
            <ChartContainer showGroupingOptions={true} />
          </section>

          <section className="section">
            <h2 className="section-title">Monatsübersicht</h2>
            <MonthSummaryTable />
          </section>

          {allCategories.length > 0 && (
            <section className="section">
              <div className="section-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>Kategorien</h2>
                <div className="section-actions">
                  <div className="category-sort-control">
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Sortierung:
                      <select
                        className="form-input form-select"
                        value={categorySort}
                        onChange={(e) => dispatch({ type: 'SET_CATEGORY_SORT', payload: e.target.value })}
                      >
                        {CATEGORY_SORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    className={`btn btn-sm${hideEmptyCategories ? ' btn-primary' : ' btn-outline'}`}
                    onClick={() => dispatch({ type: 'SET_HIDE_EMPTY_CATEGORIES', payload: !hideEmptyCategories })}
                  >
                    Leere Kategorien ausblenden
                  </button>
                </div>
              </div>
              {categoriesToShow.length > 0 ? (
                <div className="category-mini-grid">
                  {categoriesToShow.map((cat) => (
                    <CategoryMiniChart
                      key={cat}
                      category={cat}
                      transactions={filteredTransactions}
                      dateRange={dateRange}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted">Keine Kategorien mit Einnahmen oder Ausgaben im gewählten Zeitraum.</p>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
