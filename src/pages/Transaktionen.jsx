import { useState, useMemo, useRef } from 'react';
import TransactionTable from '../components/TransactionTable';
import FilterPanel from '../components/FilterPanel';
import MonthRangeSelector from '../components/MonthRangeSelector';
import BulkEditForm from '../components/BulkEditForm';
import CsvImportPanel from '../components/CsvImportPanel';
import { useApp } from '../context/AppContext';
import { createDemoTransactions } from '../utils/demoData';
import { formatDate } from '../utils/formatting';

const ROW_LIMIT_OPTIONS = [
  { value: '25', label: '25' },
  { value: '100', label: '100' },
  { value: '500', label: '500' },
  { value: 'all', label: 'Alle' },
];

const EMPTY_COLUMN_FILTERS = {
  date: '', type: '', amount: '', purpose: '', category: '', partner: '', recurrence: '',
};

function getUniquePeriodTransactions(periodStats) {
  const byId = new Map();
  for (const month of periodStats.months) {
    for (const tx of month.transactions) byId.set(tx.id, tx);
  }
  return Array.from(byId.values());
}

function applyColumnFilters(transactions, filters) {
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

export default function Transaktionen() {
  const { transactions, periodStats, loadDemoData, clearAllTransactions, isLoading } = useApp();

  const tableRef = useRef(null);
  const tableSectionRef = useRef(null);

  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [columnFilters, setColumnFilters] = useState(EMPTY_COLUMN_FILTERS);
  const [rowLimit, setRowLimit] = useState('25');
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const maxVisibleRows = rowLimit === 'all' ? null : Number(rowLimit);

  const periodTransactions = useMemo(
    () => getUniquePeriodTransactions(periodStats),
    [periodStats]
  );

  const tableTransactions = useMemo(
    () => applyColumnFilters(periodTransactions, columnFilters),
    [periodTransactions, columnFilters]
  );

  const hasColumnFilters = Object.values(columnFilters).some((v) => v !== '');
  const isFiltered = tableTransactions.length !== transactions.length;

  // ── Neue Transaktion (inline in Tabelle) ──────────────────────────────────

  function handleNewTransaction() {
    exitBulkMode();
    tableRef.current?.startNewRow();
    tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleLoadDemo() {
    await loadDemoData(createDemoTransactions());
    setShowDemoConfirm(false);
  }

  async function handleClearAll() {
    await clearAllTransactions();
    setShowClearConfirm(false);
    exitBulkMode();
    resetColumnFilters();
  }

  // ── Bulk-edit ─────────────────────────────────────────────────────────────

  function enterBulkMode() {
    setSelectedIds(new Set());
    setBulkEditMode(true);
  }

  function exitBulkMode() {
    setBulkEditMode(false);
    setSelectedIds(new Set());
  }

  function handleToggleSelect(ids, select) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) select ? next.add(id) : next.delete(id);
      return next;
    });
  }

  // ── Column filters ────────────────────────────────────────────────────────

  function handleColumnFilterChange(field, value) {
    setColumnFilters((prev) => ({ ...prev, [field]: value }));
  }

  function resetColumnFilters() {
    setColumnFilters(EMPTY_COLUMN_FILTERS);
  }

  if (isLoading) {
    return <div className="page-loading">Daten werden geladen...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Transaktionen</h1>
      </div>

      {/* ── Daten hinzufügen (CSV + Neue Transaktion) ───────────────────── */}
      <section className="section">
        <CsvImportPanel onNewTransaction={handleNewTransaction} />
      </section>

      {/* ── Zeitraum ────────────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Zeitraum</h2>
        <MonthRangeSelector />
      </section>

      {/* ── Globale Filter ──────────────────────────────────────────────── */}
      <section className="section">
        <div className="card">
          <FilterPanel onResetAll={resetColumnFilters} hasColumnFilters={hasColumnFilters} />
        </div>
      </section>

      {/* ── Bulk-Edit-Formular ───────────────────────────────────────────── */}
      {bulkEditMode && selectedIds.size > 0 && (
        <section className="section">
          <BulkEditForm selectedIds={selectedIds} onDone={exitBulkMode} />
        </section>
      )}

      {/* ── Tabelle ─────────────────────────────────────────────────────── */}
      <section className="section" ref={tableSectionRef}>
        <div className="section-header">
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            {isFiltered
              ? `${tableTransactions.length} von ${transactions.length} Transaktionen`
              : `Alle Transaktionen (${transactions.length})`}
          </h2>

          <div className="section-actions">
            {!bulkEditMode ? (
              <>
                <button className="btn btn-sm btn-primary" onClick={handleNewTransaction}>
                  + Neue Transaktion
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={enterBulkMode}
                  disabled={tableTransactions.length === 0}
                >
                  Mehrere bearbeiten
                </button>
              </>
            ) : (
              <>
                <span className="bulk-mode-indicator">{selectedIds.size} ausgewählt</span>
                <button className="btn btn-sm btn-outline" onClick={exitBulkMode}>Abbrechen</button>
              </>
            )}

            <label className="table-row-limit">
              Anzeigen:
              <select className="form-input form-select" value={rowLimit}
                onChange={(e) => setRowLimit(e.target.value)}>
                {ROW_LIMIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>

            {transactions.length === 0 && (
              <>
                {!showDemoConfirm ? (
                  <button className="btn btn-sm btn-outline" onClick={() => setShowDemoConfirm(true)}>
                    Demodaten laden
                  </button>
                ) : (
                  <>
                    <span className="text-muted">Demodaten laden?</span>
                    <button className="btn btn-sm btn-primary" onClick={handleLoadDemo}>Ja</button>
                    <button className="btn btn-sm btn-outline" onClick={() => setShowDemoConfirm(false)}>Nein</button>
                  </>
                )}
              </>
            )}

            {transactions.length > 0 && !bulkEditMode && (
              <>
                {!showClearConfirm ? (
                  <button className="btn btn-sm btn-danger-outline" onClick={() => setShowClearConfirm(true)}>
                    Alle löschen
                  </button>
                ) : (
                  <>
                    <span className="text-muted">Alle löschen?</span>
                    <button className="btn btn-sm btn-danger" onClick={handleClearAll}>Ja</button>
                    <button className="btn btn-sm btn-outline" onClick={() => setShowClearConfirm(false)}>Nein</button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <TransactionTable
          ref={tableRef}
          transactions={tableTransactions}
          showAll={true}
          showActions={true}
          maxVisibleRows={maxVisibleRows}
          bulkEditMode={bulkEditMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          columnFilters={columnFilters}
          onColumnFilterChange={handleColumnFilterChange}
        />
      </section>
    </div>
  );
}
