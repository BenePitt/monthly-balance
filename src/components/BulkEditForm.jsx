import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getUniqueValues } from '../domain/filterEngine';
import { TYPE_LABELS, RECURRENCE_LABELS } from '../domain/transaction';

const EMPTY_FORM = {
  type: '',
  date: '',
  amount: '',
  purpose: '',
  category: '',
  partner: '',
  recurrence: '',
};

export default function BulkEditForm({ selectedIds, onDone }) {
  const { transactions, bulkUpdateTransactions } = useApp();
  const [form, setForm] = useState(EMPTY_FORM);
  const [applying, setApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(null);

  const suggestedCategories = getUniqueValues(transactions, 'category');
  const suggestedPartners = getUniqueValues(transactions, 'partner');
  const count = selectedIds.size;

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setAppliedCount(null);
  }

  function buildChanges() {
    const changes = {};
    if (form.type)      changes.type = form.type;
    if (form.recurrence) changes.recurrence = form.recurrence;
    if (form.date)      changes.date = form.date;
    if (form.purpose.trim())  changes.purpose = form.purpose.trim();
    if (form.category.trim()) changes.category = form.category.trim();
    if (form.partner.trim())  changes.partner = form.partner.trim();
    const amt = parseFloat(form.amount);
    if (!isNaN(amt) && amt > 0) changes.amount = amt;
    return changes;
  }

  const hasChanges = Object.keys(buildChanges()).length > 0;

  async function handleApply() {
    const changes = buildChanges();
    if (Object.keys(changes).length === 0 || count === 0) return;
    setApplying(true);
    await bulkUpdateTransactions(Array.from(selectedIds), changes);
    setApplying(false);
    setAppliedCount(count);
    setForm(EMPTY_FORM);
    onDone();
  }

  return (
    <div className="bulk-edit-form">
      <div className="bulk-edit-header">
        <div className="bulk-edit-title">
          <span className="bulk-edit-badge">{count}</span>
          Transaktion{count !== 1 ? 'en' : ''} ausgewählt – Felder zum Übernehmen ausfüllen
        </div>
        <button className="btn btn-sm btn-outline" onClick={onDone}>
          Abbrechen
        </button>
      </div>

      <p className="bulk-edit-hint">
        Nur ausgefüllte Felder werden übertragen. Leere Felder bleiben unverändert.
      </p>

      <div className="bulk-edit-fields">
        {/* Typ */}
        <label className="form-label">
          Typ
          <select
            className="form-input form-select"
            value={form.type}
            onChange={(e) => handleChange('type', e.target.value)}
          >
            <option value="">– nicht ändern –</option>
            <option value="income">{TYPE_LABELS.income}</option>
            <option value="expense">{TYPE_LABELS.expense}</option>
          </select>
        </label>

        {/* Wiederholungsart */}
        <label className="form-label">
          Wiederholungsart
          <select
            className="form-input form-select"
            value={form.recurrence}
            onChange={(e) => handleChange('recurrence', e.target.value)}
          >
            <option value="">– nicht ändern –</option>
            <option value="once">{RECURRENCE_LABELS.once}</option>
            <option value="monthly">{RECURRENCE_LABELS.monthly}</option>
          </select>
        </label>

        {/* Datum */}
        <label className="form-label">
          Datum / Startdatum
          <input
            type="date"
            className="form-input"
            value={form.date}
            onChange={(e) => handleChange('date', e.target.value)}
          />
        </label>

        {/* Betrag */}
        <label className="form-label">
          Betrag (€)
          <input
            type="number"
            className="form-input"
            placeholder="nicht ändern"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
          />
        </label>

        {/* Verwendungszweck */}
        <label className="form-label">
          Verwendungszweck
          <input
            type="text"
            className="form-input"
            placeholder="nicht ändern"
            value={form.purpose}
            onChange={(e) => handleChange('purpose', e.target.value)}
          />
        </label>

        {/* Kategorie */}
        <label className="form-label">
          Kategorie
          <input
            type="text"
            className="form-input"
            placeholder="nicht ändern"
            value={form.category}
            list="bulk-categories-list"
            onChange={(e) => handleChange('category', e.target.value)}
          />
          <datalist id="bulk-categories-list">
            {suggestedCategories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>

        {/* Transaktionspartner */}
        <label className="form-label">
          Transaktionspartner
          <input
            type="text"
            className="form-input"
            placeholder="nicht ändern"
            value={form.partner}
            list="bulk-partners-list"
            onChange={(e) => handleChange('partner', e.target.value)}
          />
          <datalist id="bulk-partners-list">
            {suggestedPartners.map((p) => <option key={p} value={p} />)}
          </datalist>
        </label>
      </div>

      <div className="bulk-edit-actions">
        <button
          className="btn btn-primary"
          onClick={handleApply}
          disabled={!hasChanges || count === 0 || applying}
        >
          {applying
            ? 'Wird angewendet…'
            : `Auf ${count} Transaktion${count !== 1 ? 'en' : ''} anwenden`}
        </button>
        {appliedCount !== null && (
          <span className="bulk-edit-success">
            ✓ {appliedCount} Transaktion{appliedCount !== 1 ? 'en' : ''} aktualisiert
          </span>
        )}
      </div>
    </div>
  );
}
