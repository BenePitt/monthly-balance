import MonthRangeSelector from '../components/MonthRangeSelector';
import KennzahlenPanel from '../components/KennzahlenPanel';
import FilterPanel from '../components/FilterPanel';
import ChartContainer from '../charts/ChartContainer';
import MonthSummaryTable from '../components/MonthSummaryTable';
import { useApp } from '../context/AppContext';
import { hasActiveFilters } from '../domain/filterEngine';

export default function Auswertung() {
  const { filters, isLoading } = useApp();
  const filtersActive = hasActiveFilters(filters);

  if (isLoading) {
    return <div className="page-loading">Daten werden geladen...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Auswertung</h1>
        <p className="page-subtitle">
          Detaillierte Analyse mit Filtern
          {filtersActive && <span className="filter-active-badge"> – Filter aktiv</span>}
        </p>
      </div>

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
        </main>
      </div>
    </div>
  );
}
