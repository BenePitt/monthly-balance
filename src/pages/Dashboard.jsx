import MonthRangeSelector from '../components/MonthRangeSelector';
import KennzahlenPanel from '../components/KennzahlenPanel';
import MonthSummaryTable from '../components/MonthSummaryTable';
import ChartContainer from '../charts/ChartContainer';
import { useApp } from '../context/AppContext';
import { formatMonthYear } from '../utils/formatting';

export default function Dashboard() {
  const { dateRange, periodStats, transactions, isLoading } = useApp();
  const { startYear, startMonth, endYear, endMonth } = dateRange;

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
        </p>
      </div>

      {transactions.length === 0 && (
        <div className="info-banner">
          <strong>Willkommen!</strong> Es sind noch keine Transaktionen vorhanden.
          Gehen Sie zu <em>Transaktionen</em>, um Einnahmen und Ausgaben zu erfassen.
        </div>
      )}

      <section className="section">
        <h2 className="section-title">Zeitraum</h2>
        <MonthRangeSelector />
      </section>

      <section className="section">
        <h2 className="section-title">Kennzahlen</h2>
        <KennzahlenPanel />
      </section>

      <section className="section">
        <h2 className="section-title">Diagramm</h2>
        <ChartContainer showGroupingOptions={false} />
      </section>

      <section className="section">
        <h2 className="section-title">Monatsübersicht</h2>
        <MonthSummaryTable />
      </section>
    </div>
  );
}
