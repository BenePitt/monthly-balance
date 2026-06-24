import { TYPE_LABELS, RECURRENCE_LABELS } from '../domain/transaction';
import { getPurposeRows } from '../utils/formatting';

interface EditValues {
  date?: string;
  type?: string;
  amount?: string;
  purpose?: string;
  category?: string;
  partner?: string;
  recurrence?: string;
}

interface EditErrors {
  date?: boolean;
  amount?: boolean;
  purpose?: boolean;
  category?: boolean;
  partner?: boolean;
}

interface EditTransactionRowProps {
  values: EditValues;
  errors: EditErrors;
  onChange: (field: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onSaveAndAnother?: () => void;
  suggestedCategories: string[];
  suggestedPartners: string[];
  isNew?: boolean;
}

export default function EditTransactionRow({
  values,
  errors,
  onChange,
  onSave,
  onCancel,
  onSaveAndAnother,
  suggestedCategories,
  suggestedPartners,
  isNew = false,
}: EditTransactionRowProps) {
  return (
    <>
      <td className="td-expand" />
      <td>
        <input
          type="date"
          className={`form-input form-input-compact${errors.date ? ' form-input--error' : ''}`}
          value={values.date ?? ''}
          onChange={(e) => onChange('date', e.target.value)}
        />
      </td>
      <td>
        <select
          className="form-input form-select form-input-compact"
          value={values.type ?? 'expense'}
          onChange={(e) => onChange('type', e.target.value)}
        >
          <option value="income">{TYPE_LABELS.income}</option>
          <option value="expense">{TYPE_LABELS.expense}</option>
        </select>
      </td>
      <td>
        <input
          type="number"
          className={`form-input form-input-compact${errors.amount ? ' form-input--error' : ''}`}
          min="0.01"
          step="0.01"
          placeholder="0,00"
          value={values.amount ?? ''}
          onChange={(e) => onChange('amount', e.target.value)}
        />
      </td>
      <td className="import-purpose">
        <textarea
          className={`form-input${errors.purpose ? ' form-input--error' : ''}`}
          placeholder="Verwendungszweck"
          value={values.purpose ?? ''}
          rows={getPurposeRows(values.purpose)}
          onChange={(e) => onChange('purpose', e.target.value)}
        />
      </td>
      <td>
        <select
          className={`form-input form-select form-input-compact${errors.category ? ' form-input--error' : ''}`}
          value={values.category ?? ''}
          onChange={(e) => onChange('category', e.target.value)}
        >
          <option value="">– Kategorie –</option>
          {suggestedCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td>
        <select
          className={`form-input form-select form-input-compact${errors.partner ? ' form-input--error' : ''}`}
          value={values.partner ?? ''}
          onChange={(e) => onChange('partner', e.target.value)}
        >
          <option value="">– Partner –</option>
          {suggestedPartners.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </td>
      <td>
        <select
          className="form-input form-select form-input-compact"
          value={values.recurrence ?? 'once'}
          onChange={(e) => onChange('recurrence', e.target.value)}
        >
          <option value="once">{RECURRENCE_LABELS.once}</option>
          <option value="monthly">{RECURRENCE_LABELS.monthly}</option>
        </select>
      </td>
      <td className="tx-actions">
        <div className="tx-actions-inner" style={{ flexWrap: 'wrap', gap: '0.3rem' }}>
          {isNew ? (
            <>
              <button className="btn btn-sm btn-primary" onClick={onSave}>
                Speichern
              </button>
              {onSaveAndAnother && (
                <button
                  className="btn btn-sm btn-outline btn-income-outline"
                  style={{ fontSize: '0.75rem' }}
                  onClick={onSaveAndAnother}
                >
                  + Weitere
                </button>
              )}
              <button className="btn btn-sm btn-outline" onClick={onCancel}>
                Abbrechen
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-sm btn-primary" onClick={onSave}>Speichern</button>
              <button className="btn btn-sm btn-outline" onClick={onCancel}>Abbrechen</button>
            </>
          )}
        </div>
      </td>
    </>
  );
}
