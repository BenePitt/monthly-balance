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

export default function Dashboard() {
  const { dateRange, transactions, filteredTransactions, filters, isLoading } = useApp();
  const { startYear, startMonth, endYear, endMonth } = dateRange;
  const filtersActive = hasActiveFilters(filters);

  const categoriesToShow = useMemo(() => {
    if (filters.categories.length > 0) {
      return filters.categories;
    }
    return getUniqueValues(filteredTransactions, 'category');
  }, [filters.categories, filteredTransactions]);

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

          {categoriesToShow.length > 0 && (
            <section className="section">
              <h2 className="section-title">Kategorien</h2>
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
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
