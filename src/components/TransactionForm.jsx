import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/formatting';
import { TYPE_LABELS, RECURRENCE_LABELS } from '../domain/transaction';
import { getUniqueValues } from '../domain/filterEngine';

const EMPTY_FORM = {
  date: '',
  type: 'expense',
  amount: '',
  purpose: '',
  category: '',
  partner: '',
  recurrence: 'once',
};

export default function TransactionForm({ editTransaction, onClose }) {
  const { addTransaction, updateTransaction, transactions } = useApp();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const suggestedCategories = getUniqueValues(transactions, 'category');
  const suggestedPartners = getUniqueValues(transactions, 'partner');
  const isEditing = !!editTransaction;

  useEffect(() => {
    if (editTransaction) {
      setForm({
        date: editTransaction.date,
        type: editTransaction.type,
        amount: String(editTransaction.amount),
        purpose: editTransaction.purpose,
        category: editTransaction.category,
        partner: editTransaction.partner,
        recurrence: editTransaction.recurrence,
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setForm({ ...EMPTY_FORM, date: today });
    }
    setErrors({});
  }, [editTransaction]);

  function validate() {
    const e = {};
    if (!form.date) e.date = 'Bitte Datum angeben.';
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      e.amount = 'Bitte einen gültigen positiven Betrag angeben.';
    if (!form.purpose.trim()) e.purpose = 'Bitte Verwendungszweck angeben.';
    if (!form.category.trim()) e.category = 'Bitte Kategorie angeben.';
    if (!form.partner.trim()) e.partner = 'Bitte Transaktionspartner angeben.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const fields = {
      ...form,
      amount: parseFloat(form.amount),
    };

    if (isEditing) {
      await updateTransaction(editTransaction.id, fields);
    } else {
      await addTransaction(fields);
    }
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setErrors({});
    if (onClose) onClose();
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  return (
    <form className="transaction-form" onSubmit={handleSubmit} noValidate>
      <h2 className="form-title">
        {isEditing ? 'Transaktion bearbeiten' : 'Neue Transaktion'}
      </h2>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label required">
            Typ
            <div className="radio-group">
              {['income', 'expense'].map((t) => (
                <label key={t} className={`radio-option${form.type === t ? ' radio-option--active' : ''}`}>
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={form.type === t}
                    onChange={() => handleChange('type', t)}
                  />
                  {TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </label>
        </div>

        <div className="form-group">
          <label className="form-label required">
            Wiederholungsart
            <div className="radio-group">
              {['once', 'monthly'].map((r) => (
                <label key={r} className={`radio-option${form.recurrence === r ? ' radio-option--active' : ''}`}>
                  <input
                    type="radio"
                    name="recurrence"
                    value={r}
                    checked={form.recurrence === r}
                    onChange={() => handleChange('recurrence', r)}
                  />
                  {RECURRENCE_LABELS[r]}
                </label>
              ))}
            </div>
          </label>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label required">
            {form.recurrence === 'monthly' ? 'Startdatum' : 'Datum'}
            <input
              type="date"
              className={`form-input${errors.date ? ' form-input--error' : ''}`}
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
            {errors.date && <span className="form-error">{errors.date}</span>}
          </label>
        </div>

        <div className="form-group">
          <label className="form-label required">
            Betrag (€)
            <input
              type="number"
              className={`form-input${errors.amount ? ' form-input--error' : ''}`}
              placeholder="0,00"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
            />
            {errors.amount && <span className="form-error">{errors.amount}</span>}
          </label>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label required">
          Verwendungszweck
          <input
            type="text"
            className={`form-input${errors.purpose ? ' form-input--error' : ''}`}
            placeholder="z.B. Gehalt Mai, Monatsmiete, Wocheneinkauf..."
            value={form.purpose}
            onChange={(e) => handleChange('purpose', e.target.value)}
          />
          {errors.purpose && <span className="form-error">{errors.purpose}</span>}
        </label>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label required">
            Kategorie
            <input
              type="text"
              className={`form-input${errors.category ? ' form-input--error' : ''}`}
              placeholder="z.B. Gehalt, Wohnen, Lebensmittel..."
              value={form.category}
              list="categories-list"
              onChange={(e) => handleChange('category', e.target.value)}
            />
            {suggestedCategories.length > 0 && (
              <datalist id="categories-list">
                {suggestedCategories.map((c) => <option key={c} value={c} />)}
              </datalist>
            )}
            {errors.category && <span className="form-error">{errors.category}</span>}
          </label>
        </div>

        <div className="form-group">
          <label className="form-label required">
            Transaktionspartner
            <input
              type="text"
              className={`form-input${errors.partner ? ' form-input--error' : ''}`}
              placeholder="z.B. Arbeitgeber GmbH, Vermieter..."
              value={form.partner}
              list="partners-list"
              onChange={(e) => handleChange('partner', e.target.value)}
            />
            {suggestedPartners.length > 0 && (
              <datalist id="partners-list">
                {suggestedPartners.map((p) => <option key={p} value={p} />)}
              </datalist>
            )}
            {errors.partner && <span className="form-error">{errors.partner}</span>}
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className={`btn btn-primary${form.type === 'income' ? ' btn-income' : ''}`}>
          {isEditing ? 'Änderungen speichern' : 'Transaktion speichern'}
        </button>
        {onClose && (
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}
