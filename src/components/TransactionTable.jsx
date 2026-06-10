import { useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatting';
import { TYPE_LABELS, RECURRENCE_LABELS } from '../domain/transaction';
import { getUniqueValues } from '../domain/filterEngine';

const EMPTY_COLUMN_FILTERS = {
  date: '', type: '', amount: '', purpose: '', category: '', partner: '', recurrence: '',
};

const NEW_ROW_ID = '__new__';

function getPurposeRows(text) {
  const lines = String(text || '').split('\n');
  const visualRows = lines.reduce(
    (sum, line) => sum + Math.max(1, Math.ceil(line.length / 42)), 0
  );
  return Math.min(6, Math.max(2, visualRows));
}

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
            {t.type === 'expense' ? '−' : '+'}{formatCurrency(t.amount)}
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

function emptyEditValues() {
  return {
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    amount: '',
    purpose: '',
    category: '',
    partner: '',
    recurrence: 'once',
  };
}

const TransactionTable = forwardRef(function TransactionTable({
  transactions,
  showAll = false,
  maxVisibleRows = null,
  showActions = false,
  bulkEditMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  columnFilters = EMPTY_COLUMN_FILTERS,
  onColumnFilterChange,
}, ref) {
  const { addTransaction, updateTransaction, deleteTransaction, transactions: allTransactions } = useApp();

  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [frozenOrder, setFrozenOrder] = useState(null);

  const suggestedCategories = getUniqueValues(allTransactions, 'category');
  const suggestedPartners = getUniqueValues(allTransactions, 'partner');

  // ── Sort & display order ─────────────────────────────────────────────────

  const sorted = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'amount') {
        aVal = a.type === 'income' ? a.amount : -a.amount;
        bVal = b.type === 'income' ? b.amount : -b.amount;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, sortField, sortDir]);

  const displayRows = useMemo(() => {
    if (!frozenOrder) return sorted;
    const map = new Map(transactions.map((t) => [t.id, t]));
    const frozen = frozenOrder.map((id) => map.get(id)).filter(Boolean);
    const frozenSet = new Set(frozenOrder);
    const newItems = sorted.filter((t) => !frozenSet.has(t.id));
    return [...frozen, ...newItems];
  }, [frozenOrder, sorted, transactions]);

  function handleSort(field) {
    setFrozenOrder(null);
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  }

  // ── Expand ───────────────────────────────────────────────────────────────

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // ── Bulk select ──────────────────────────────────────────────────────────

  const allSelected = displayRows.length > 0 && displayRows.every((t) => selectedIds.has(t.id));
  const someSelected = !allSelected && displayRows.some((t) => selectedIds.has(t.id));

  function handleToggleAll() {
    onToggleSelect?.(displayRows.map((t) => t.id), !allSelected);
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

  // ── New row (via ref) ────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    startNewRow() {
      setFrozenOrder(sorted.map((t) => t.id));
      setExpandedId(null);
      setEditingId(NEW_ROW_ID);
      setEditErrors({});
      setEditingValues(emptyEditValues());
    },
  }), [sorted]);

  async function saveNewRow(andAddAnother = false) {
    const errors = {};
    const amt = parseFloat(editingValues.amount);
    if (!editingValues.date) errors.date = true;
    if (isNaN(amt) || amt <= 0) errors.amount = true;
    if (!editingValues.purpose.trim()) errors.purpose = true;
    if (!editingValues.category.trim()) errors.category = true;
    if (!editingValues.partner.trim()) errors.partner = true;
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return; }

    const fields = { ...editingValues, amount: amt };
    setEditingId(null);
    setEditingValues({});
    setEditErrors({});

    await addTransaction(fields);

    if (andAddAnother) {
      setEditingId(NEW_ROW_ID);
      setEditErrors({});
      setEditingValues(emptyEditValues());
    }
  }

  // ── Edit existing row ────────────────────────────────────────────────────

  function startEdit(t) {
    setFrozenOrder(displayRows.map((tx) => tx.id));
    setExpandedId(null);
    setEditingId(t.id);
    setEditErrors({});
    setEditingValues({
      date: t.date,
      type: t.type,
      amount: String(t.amount),
      purpose: t.purpose,
      category: t.category,
      partner: t.partner,
      recurrence: t.recurrence,
    });
  }

  function cancelEdit() {
    if (editingId === NEW_ROW_ID) setFrozenOrder(null);
    setEditingId(null);
    setEditingValues({});
    setEditErrors({});
  }

  async function saveEdit() {
    const errors = {};
    if (!editingValues.date) errors.date = true;
    const amt = parseFloat(editingValues.amount);
    if (isNaN(amt) || amt <= 0) errors.amount = true;
    if (!editingValues.purpose.trim()) errors.purpose = true;
    if (!editingValues.category.trim()) errors.category = true;
    if (!editingValues.partner.trim()) errors.partner = true;
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return; }

    const id = editingId;
    const changes = { ...editingValues, amount: amt };
    setEditingId(null);
    setEditingValues({});
    setEditErrors({});
    await updateTransaction(id, changes);
  }

  function setField(field, value) {
    setEditingValues((prev) => ({ ...prev, [field]: value }));
    setEditErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // ── Shared edit row renderer ─────────────────────────────────────────────

  function renderEditCells(isNew = false) {
    return (
      <>
        <td className="td-expand" />
        <td>
          <input type="date"
            className={`form-input form-input-compact${editErrors.date ? ' form-input--error' : ''}`}
            value={editingValues.date ?? ''}
            onChange={(e) => setField('date', e.target.value)} />
        </td>
        <td>
          <select className="form-input form-select form-input-compact"
            value={editingValues.type ?? 'expense'}
            onChange={(e) => setField('type', e.target.value)}>
            <option value="income">{TYPE_LABELS.income}</option>
            <option value="expense">{TYPE_LABELS.expense}</option>
          </select>
        </td>
        <td>
          <input type="number"
            className={`form-input form-input-compact${editErrors.amount ? ' form-input--error' : ''}`}
            min="0.01" step="0.01" placeholder="0,00"
            value={editingValues.amount ?? ''}
            onChange={(e) => setField('amount', e.target.value)} />
        </td>
        <td className="import-purpose">
          <textarea
            className={`form-input${editErrors.purpose ? ' form-input--error' : ''}`}
            placeholder="Verwendungszweck"
            value={editingValues.purpose ?? ''}
            rows={getPurposeRows(editingValues.purpose)}
            onChange={(e) => setField('purpose', e.target.value)} />
        </td>
        <td>
          <select
            className={`form-input form-select form-input-compact${editErrors.category ? ' form-input--error' : ''}`}
            value={editingValues.category ?? ''}
            onChange={(e) => setField('category', e.target.value)}>
            <option value="">– Kategorie –</option>
            {suggestedCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </td>
        <td>
          <select
            className={`form-input form-select form-input-compact${editErrors.partner ? ' form-input--error' : ''}`}
            value={editingValues.partner ?? ''}
            onChange={(e) => setField('partner', e.target.value)}>
            <option value="">– Partner –</option>
            {suggestedPartners.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </td>
        <td>
          <select className="form-input form-select form-input-compact"
            value={editingValues.recurrence ?? 'once'}
            onChange={(e) => setField('recurrence', e.target.value)}>
            <option value="once">{RECURRENCE_LABELS.once}</option>
            <option value="monthly">{RECURRENCE_LABELS.monthly}</option>
          </select>
        </td>
        <td className="tx-actions">
          <div className="tx-actions-inner" style={{ flexWrap: 'wrap', gap: '0.3rem' }}>
            {isNew ? (
              <>
                <button className="btn btn-sm btn-primary" onClick={() => saveNewRow(false)}>
                  Speichern
                </button>
                <button className="btn btn-sm btn-outline btn-income-outline"
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => saveNewRow(true)}>
                  + Weitere
                </button>
                <button className="btn btn-sm btn-outline" onClick={cancelEdit}>
                  Abbrechen
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-sm btn-primary" onClick={saveEdit}>Speichern</button>
                <button className="btn btn-sm btn-outline" onClick={cancelEdit}>Abbrechen</button>
              </>
            )}
          </div>
        </td>
      </>
    );
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

  // Only show the full wrapper when there's content OR when the filter row is present (so header stays visible)
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
            <th className="sortable" onClick={() => handleSort('date')}>Datum <SortIcon field="date" /></th>
            <th>Typ</th>
            <th className="sortable" onClick={() => handleSort('amount')}>Betrag <SortIcon field="amount" /></th>
            <th className="th-purpose">Verwendungszweck</th>
            <th>Kategorie</th>
            <th>Partner</th>
            <th>Wiederholung</th>
            {visibleActions && <th>Aktionen</th>}
            {visibleCheckbox && (
              <th className="th-checkbox">
                <input type="checkbox" className="row-checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={handleToggleAll}
                  title="Alle auswählen" />
              </th>
            )}
          </tr>

          {onColumnFilterChange && (
            <tr className="filter-row">
              <td />
              <td><input type="text" className="col-filter-input" placeholder="TT.MM.JJJJ"
                value={columnFilters.date} onChange={cf('date')} /></td>
              <td><select className="col-filter-input col-filter-select"
                value={columnFilters.type} onChange={cf('type')}>
                <option value="">Alle</option>
                <option value="income">Einnahme</option>
                <option value="expense">Ausgabe</option>
              </select></td>
              <td><input type="text" className="col-filter-input" placeholder="Suche…"
                value={columnFilters.amount} onChange={cf('amount')} /></td>
              <td><input type="text" className="col-filter-input" placeholder="Suche…"
                value={columnFilters.purpose} onChange={cf('purpose')} /></td>
              <td><input type="text" className="col-filter-input" placeholder="Suche…"
                value={columnFilters.category} onChange={cf('category')} /></td>
              <td><input type="text" className="col-filter-input" placeholder="Suche…"
                value={columnFilters.partner} onChange={cf('partner')} /></td>
              <td><select className="col-filter-input col-filter-select"
                value={columnFilters.recurrence} onChange={cf('recurrence')}>
                <option value="">Alle</option>
                <option value="once">Einmalig</option>
                <option value="monthly">Regelmäßig</option>
              </select></td>
              {visibleActions && <td />}
              {visibleCheckbox && <td />}
            </tr>
          )}
        </thead>

        <tbody>
          {/* ── Empty state (filter active, no results) ──────────────── */}
          {showEmptyState && (
            <tr>
              <td colSpan={colCount} className="table-empty-cell">
                <p>Keine Transaktionen gefunden.</p>
                <p className="text-muted">Passen Sie die Spaltenfilter an.</p>
              </td>
            </tr>
          )}

          {/* ── New row at top ───────────────────────────────────────── */}
          {editingId === NEW_ROW_ID && (
            <tr className="tx-row tx-row--editing tx-row--new">
              {renderEditCells(true)}
            </tr>
          )}

          {/* ── Existing rows ────────────────────────────────────────── */}
          {displayRows.map((t) => {
            const isSelected = selectedIds.has(t.id);
            const isExpanded = expandedId === t.id;

            if (editingId === t.id) {
              return (
                <tr key={t.id} className={`tx-row tx-row--${t.type} tx-row--editing`}>
                  {renderEditCells(false)}
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
                    <button className="expand-btn"
                      onClick={(e) => { e.stopPropagation(); toggleExpand(t.id); }}
                      title={isExpanded ? 'Zuklappen' : 'Aufklappen'}>
                      {isExpanded ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="tx-date">{formatDate(t.date)}</td>
                  <td><span className={`badge badge--${t.type}`}>{TYPE_LABELS[t.type]}</span></td>
                  <td className={`tx-amount tx-amount--${t.type}`}>
                    {t.type === 'expense' ? '−' : '+'}{formatCurrency(t.amount)}
                  </td>
                  <td className="td-purpose">{t.purpose}</td>
                  <td><span className="category-tag">{t.category}</span></td>
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
                            <button className="btn btn-sm btn-danger"
                              onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
                              Bestätigen
                            </button>
                            <button className="btn btn-sm btn-outline"
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}>
                              Abbrechen
                            </button>
                          </>
                        ) : (
                          <button className="btn btn-sm btn-danger-outline"
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(t.id); }}>
                            Löschen
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleCheckbox && (
                    <td className="td-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="row-checkbox" checked={isSelected}
                        onChange={() => onToggleSelect?.([t.id], !isSelected)} />
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
        {!frozenOrder && (
          bulkEditMode && selectedIds.size > 0
            ? `${selectedIds.size} von ${transactions.length} ausgewählt`
            : `${transactions.length} Transaktion${transactions.length !== 1 ? 'en' : ''}`
        )}
      </div>
    </div>
  );
});

export default TransactionTable;
