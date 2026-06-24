import { useState } from 'react';
import MonthRangeSelector from '../components/MonthRangeSelector';
import FilterPanel from '../components/FilterPanel';
import TransactionTable from '../components/TransactionTable';
import { useApp } from '../context/AppContext';
import { hasActiveFilters, getUniquePeriodTransactions } from '../domain/filterEngine';
import { DETAILTABELLE_ROW_LIMIT_OPTIONS } from '../constants/ui';

export default function Detailtabelle() {
  const { filters, periodStats, isLoading } = useApp();
  const [rowLimit, setRowLimit] = useState('10');
  const filtersActive = hasActiveFilters(filters);
  const periodTransactions = getUniquePeriodTransactions(periodStats);
  const totalOccurrences = periodStats.months.reduce((sum, month) => sum + month.transactions.length, 0);
  const maxVisibleRows = rowLimit === 'all' ? null : Number(rowLimit);

  if (isLoading) {
    return <div className="page-loading">Daten werden geladen...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Detailtabelle</h1>
        <p className="page-subtitle">
          Transaktionen im ausgewählten Zeitraum
          {filtersActive && <span className="filter-active-badge"> – Filter aktiv</span>}
        </p>
      </div>

      <section className="section">
        <h2 className="section-title">Zeitraum</h2>
        <MonthRangeSelector />
      </section>

      <section className="section">
        <div className="card">
          <FilterPanel />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">
            Transaktionen
            <span className="text-muted" style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>
              {' '}({periodTransactions.length} eindeutig
              {totalOccurrences !== periodTransactions.length && `, ${totalOccurrences} Vorkommen`})
            </span>
          </h2>
          <label className="table-row-limit">
            Einträge anzeigen:
            <select
              className="form-input form-select"
              value={rowLimit}
              onChange={(e) => setRowLimit(e.target.value)}
            >
              {DETAILTABELLE_ROW_LIMIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>
        <TransactionTable transactions={periodTransactions} maxVisibleRows={maxVisibleRows} />
      </section>
    </div>
  );
}
