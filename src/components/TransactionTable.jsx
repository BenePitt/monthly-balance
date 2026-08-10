import { useState, useImperativeHandle, forwardRef } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatting';
import { TYPE_LABELS, RECURRENCE_LABELS } from '../domain/transaction';
import { getUniqueValues } from '../domain/filterEngine';
import { EMPTY_COLUMN_FILTERS, NEW_ROW_ID } from '../constants/ui';
import { useSortedRows } from '../hooks/useSortedRows';
import { useTransactionEdit } from '../hooks/useTransactionEdit';
import EditTransactionRow from './EditTransactionRow';

function DetailPanel({ t }) {
  return (
    <div className="tx-detail-panel">
      <div className="tx-detail-grid">
        <div className="tx-detail-item">
          <span className="tx-detail-label">Datum</span>
          <span className="tx-detail-value">{formatDate(t.date)}</span>
        </div>
        <div className="tx-detail-item">
          <span className="tx-detail-label">Typ</span>
          <span className={`tx-detail-value badge badge--${t.type}`}>{TYPE_LABELS[t.type]}</span>
        </div>
        <div className="tx-detail-item">
          <span className="tx-detail-label">Betrag</span>
          <span className={`tx-detail-value tx-amount--${t.type}`}>
            {t.type === 'expense' ? '−' : '+'}
            {formatCurrency(t.amount)}
          </span>
        </div>
        <div className="tx-detail-item">
          <span className="tx-detail-label">Wiederholung</span>
          <span className={`tx-detail-value recurrence-tag recurrence-tag--${t.recurrence}`}>
            {RECURRENCE_LABELS[t.recurrence]}
          </span>
        </div>
        <div className="tx-detail-item tx-detail-item--full">
          <span className="tx-detail-label">Verwendungszweck</span>
          <span className="tx-detail-value tx-detail-purpose">{t.purpose}</span>
        </div>
        <div className="tx-detail-item">
          <span className="tx-detail-label">Kategorie</span>
          <span className="tx-detail-value category-tag">{t.category}</span>
        </div>
        <div className="tx-detail-item">
          <span className="tx-detail-label">Transaktionspartner</span>
          <span className="tx-detail-value">{t.partner}</span>
        </div>
      </div>
    </div>
  );
}

const TransactionTable = forwardRef(function TransactionTable(
  {
    transactions,
    showAll = false,
    maxVisibleRows = null,
    showActions = false,
    bulkEditMode = false,
    selectedIds = new Set(),
    onToggleSelect,
    columnFilters = EMPTY_COLUMN_FILTERS,
    onColumnFilterChange,
  },
  ref
) {
  const {
    addTransaction,
    updateTransaction,
    deleteTransaction,
    transactions: allTransactions,
  } = useApp();

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const suggestedCategories = getUniqueValues(allTransactions, 'category');
  const suggestedPartners = getUniqueValues(allTransactions, 'partner');

  // ── Sort & display order ─────────────────────────────────────────────────

  const { sortField, sortDir, sorted, frozenOrder, setFrozenOrder, displayRows, handleSort } =
    useSortedRows(transactions);

  // ── Expand ───────────────────────────────────────────────────────────────

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // ── Bulk select ──────────────────────────────────────────────────────────

  const allSelected = displayRows.length > 0 && displayRows.every((t) => selectedIds.has(t.id));
  const someSelected = !allSelected && displayRows.some((t) => selectedIds.has(t.id));

  function handleToggleAll() {
    onToggleSelect?.(
      displayRows.map((t) => t.id),
      !allSelected
    );
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  function handleDelete(id) {
    if (confirmDeleteId === id) {
      deleteTransaction(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  // ── New row / edit existing row ─────────────────────────────────────────

  const {
    editingId,
    editingValues,
    editErrors,
    setField,
    startNewRow: startNewEditRow,
    startEdit: startEditRow,
    cancelEdit,
    saveNewRow,
    saveEdit,
  } = useTransactionEdit(
    addTransaction,
    updateTransaction,
    frozenOrder,
    setFrozenOrder,
    displayRows,
    sorted
  );

  useImperativeHandle(
    ref,
    () => ({
      startNewRow() {
        setExpandedId(null);
        startNewEditRow();
      },
    }),
    [startNewEditRow]
  );

  function startEdit(t) {
    setExpandedId(null);
    startEditRow(t);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function cf(field) {
    return onColumnFilterChange ? (e) => onColumnFilterChange(field, e.target.value) : undefined;
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon sort-icon--active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const visibleActions = showActions && !bulkEditMode;
  const visibleCheckbox = bulkEditMode;
  const colCount = 1 + 7 + (visibleActions ? 1 : 0) + (visibleCheckbox ? 1 : 0);

  const showEmptyState = transactions.length === 0 && editingId !== NEW_ROW_ID;

  if (showEmptyState && !onColumnFilterChange) {
    return (
      <div className="table-empty">
        <p>Keine Transaktionen gefunden.</p>
        {!showAll && <p className="text-muted">Passen Sie den Zeitraum oder die Filter an.</p>}
      </div>
    );
  }

  return (
    <div
      className={`table-wrapper${maxVisibleRows ? ' table-wrapper--scroll' : ''}`}
      style={maxVisibleRows ? { '--visible-rows': maxVisibleRows } : undefined}
    >
      <table className="transaction-table">
        <thead>
          <tr>
            <th className="th-expand" />
            <th className="sortable" onClick={() => handleSort('date')}>
              Datum <SortIcon field="date" />
            </th>
            <th>Typ</th>
            <th className="sortable" onClick={() => handleSort('amount')}>
              Betrag <SortIcon field="amount" />
            </th>
            <th className="th-purpose">Verwendungszweck</th>
            <th>Kategorie</th>
            <th>Partner</th>
            <th>Wiederholung</th>
            {visibleActions && <th>Aktionen</th>}
            {visibleCheckbox && (
              <th className="th-checkbox">
                <input
                  type="checkbox"
                  className="row-checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleToggleAll}
                  title="Alle auswählen"
                />
              </th>
            )}
          </tr>

          {onColumnFilterChange && (
            <tr className="filter-row">
              <td />
              <td>
                <input
                  type="text"
                  className="col-filter-input"
                  placeholder="TT.MM.JJJJ"
                  value={columnFilters.date}
                  onChange={cf('date')}
                />
              </td>
              <td>
                <select
                  className="col-filter-input col-filter-select"
                  value={columnFilters.type}
                  onChange={cf('type')}
                >
                  <option value="">Alle</option>
                  <option value="income">Einnahme</option>
                  <option value="expense">Ausgabe</option>
                </select>
              </td>
              <td>
                <input
                  type="text"
                  className="col-filter-input"
                  placeholder="Suche…"
                  value={columnFilters.amount}
                  onChange={cf('amount')}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="col-filter-input"
                  placeholder="Suche…"
                  value={columnFilters.purpose}
                  onChange={cf('purpose')}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="col-filter-input"
                  placeholder="Suche…"
                  value={columnFilters.category}
                  onChange={cf('category')}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="col-filter-input"
                  placeholder="Suche…"
                  value={columnFilters.partner}
                  onChange={cf('partner')}
                />
              </td>
              <td>
                <select
                  className="col-filter-input col-filter-select"
                  value={columnFilters.recurrence}
                  onChange={cf('recurrence')}
                >
                  <option value="">Alle</option>
                  <option value="once">Einmalig</option>
                  <option value="monthly">Regelmäßig</option>
                </select>
              </td>
              {visibleActions && <td />}
              {visibleCheckbox && <td />}
            </tr>
          )}
        </thead>

        <tbody>
          {showEmptyState && (
            <tr>
              <td colSpan={colCount} className="table-empty-cell">
                <p>Keine Transaktionen gefunden.</p>
                <p className="text-muted">Passen Sie die Spaltenfilter an.</p>
              </td>
            </tr>
          )}

          {editingId === NEW_ROW_ID && (
            <tr className="tx-row tx-row--editing tx-row--new">
              <EditTransactionRow
                values={editingValues}
                errors={editErrors}
                onChange={setField}
                onSave={() => saveNewRow(false)}
                onSaveAndAnother={() => saveNewRow(true)}
                onCancel={cancelEdit}
                suggestedCategories={suggestedCategories}
                suggestedPartners={suggestedPartners}
                isNew
                existingTransactions={allTransactions}
              />
            </tr>
          )}

          {displayRows.map((t) => {
            const isSelected = selectedIds.has(t.id);
            const isExpanded = expandedId === t.id;

            if (editingId === t.id) {
              return (
                <tr key={t.id} className={`tx-row tx-row--${t.type} tx-row--editing`}>
                  <EditTransactionRow
                    values={editingValues}
                    errors={editErrors}
                    onChange={setField}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    suggestedCategories={suggestedCategories}
                    suggestedPartners={suggestedPartners}
                  />
                </tr>
              );
            }

            return (
              <>
                <tr
                  key={t.id}
                  className={`tx-row tx-row--${t.type}${isSelected ? ' tx-row--selected' : ''}${isExpanded ? ' tx-row--expanded' : ''}`}
                  onClick={bulkEditMode ? () => onToggleSelect?.([t.id], !isSelected) : undefined}
                  style={bulkEditMode ? { cursor: 'pointer' } : undefined}
                >
                  <td className="td-expand">
                    <button
                      className="expand-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(t.id);
                      }}
                      title={isExpanded ? 'Zuklappen' : 'Aufklappen'}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="tx-date">{formatDate(t.date)}</td>
                  <td>
                    <span className={`badge badge--${t.type}`}>{TYPE_LABELS[t.type]}</span>
                  </td>
                  <td className={`tx-amount tx-amount--${t.type}`}>
                    {t.type === 'expense' ? '−' : '+'}
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="td-purpose" title={t.purpose}>
                    {t.purpose}
                  </td>
                  <td>
                    <span className="category-tag">{t.category}</span>
                  </td>
                  <td className="tx-nowrap">{t.partner}</td>
                  <td>
                    <span className={`recurrence-tag recurrence-tag--${t.recurrence}`}>
                      {RECURRENCE_LABELS[t.recurrence]}
                    </span>
                  </td>
                  {visibleActions && (
                    <td className="tx-actions">
                      <div className="tx-actions-inner">
                        <button className="btn btn-sm btn-outline" onClick={() => startEdit(t)}>
                          Bearbeiten
                        </button>
                        {confirmDeleteId === t.id ? (
                          <>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(t.id);
                              }}
                            >
                              Bestätigen
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                              }}
                            >
                              Abbrechen
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-sm btn-danger-outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(t.id);
                            }}
                          >
                            Löschen
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleCheckbox && (
                    <td className="td-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect?.([t.id], !isSelected)}
                      />
                    </td>
                  )}
                </tr>

                {isExpanded && (
                  <tr key={`${t.id}-detail`} className="tx-row-detail">
                    <td colSpan={colCount}>
                      <DetailPanel t={t} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>

      <div className="table-footer">
        {frozenOrder && (
          <span className="table-footer-hint">
            Sortierung pausiert –{' '}
            <button className="link-btn" onClick={() => setFrozenOrder(null)}>
              aktualisieren
            </button>
          </span>
        )}
        {!frozenOrder &&
          (bulkEditMode && selectedIds.size > 0
            ? `${selectedIds.size} von ${transactions.length} ausgewählt`
            : `${transactions.length} Transaktion${transactions.length !== 1 ? 'en' : ''}`)}
      </div>
    </div>
  );
});

export default TransactionTable;
