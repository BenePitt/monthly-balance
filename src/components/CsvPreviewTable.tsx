import { getPurposeRows } from '../utils/formatting';
import { TYPE_LABELS, RECURRENCE_LABELS } from '../domain/transaction';
import { ImportDraft } from '../types';

interface CsvPreviewTableProps {
  drafts: ImportDraft[];
  selectedIds: string[];
  onToggleSelect: (importId: string) => void;
  onToggleAll: () => void;
  onUpdateDraft: (importId: string, changes: Partial<ImportDraft>) => void;
  suggestedCategories: string[];
  suggestedPartners: string[];
  debugMode: boolean;
}

export default function CsvPreviewTable({
  drafts,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onUpdateDraft,
  suggestedCategories,
  suggestedPartners,
  debugMode,
}: CsvPreviewTableProps) {
  return (
    <div className="table-wrapper import-table-wrapper">
      <table className="transaction-table import-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={drafts.length > 0 && selectedIds.length === drafts.length}
                onChange={onToggleAll}
                aria-label="Alle Importzeilen auswählen"
              />
            </th>
            <th>Datum</th>
            <th>Typ</th>
            <th>Betrag</th>
            <th>Verwendungszweck (Buchungstext)</th>
            <th>Kategorie</th>
            <th>Partner</th>
            <th>Wiederholung</th>
            <th>Status</th>
            {debugMode && <th>Begründung</th>}
          </tr>
        </thead>
        <tbody>
          {drafts.map((draft) => (
            <tr
              key={draft.importId}
              className={`tx-row tx-row--${draft.type}${draft.isDuplicate ? ' tx-row--duplicate' : ''}`}
            >
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(draft.importId)}
                  onChange={() => onToggleSelect(draft.importId)}
                  aria-label={`Zeile ${draft.sourceRow} auswählen`}
                />
              </td>
              <td>
                <input
                  type="date"
                  className={`form-input${!draft.date ? ' form-input--error' : ''}`}
                  value={draft.date}
                  onChange={(e) => onUpdateDraft(draft.importId, { date: e.target.value })}
                />
              </td>
              <td>
                <select
                  className="form-input form-select"
                  value={draft.type}
                  onChange={(e) => onUpdateDraft(draft.importId, { type: e.target.value })}
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  className={`form-input${!(Number.isFinite(Number(draft.amount)) && Number(draft.amount) > 0) ? ' form-input--error' : ''}`}
                  min="0.01"
                  step="0.01"
                  value={draft.amount}
                  onChange={(e) => onUpdateDraft(draft.importId, { amount: e.target.value })}
                />
              </td>
              <td className="import-purpose">
                <textarea
                  className={`form-input${!String(draft.purpose).trim() ? ' form-input--error' : ''}`}
                  value={draft.purpose}
                  rows={getPurposeRows(draft.purpose)}
                  onChange={(e) => onUpdateDraft(draft.importId, { purpose: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="text"
                  className={`form-input${!String(draft.category).trim() ? ' form-input--error' : ''}`}
                  value={draft.category}
                  list="import-category-options"
                  placeholder="Kategorie"
                  onChange={(e) => onUpdateDraft(draft.importId, { category: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="text"
                  className={`form-input${!String(draft.partner).trim() ? ' form-input--error' : ''}`}
                  value={draft.partner}
                  list="import-partner-options"
                  placeholder="Partner"
                  onChange={(e) => onUpdateDraft(draft.importId, { partner: e.target.value })}
                />
              </td>
              <td>
                <select
                  className="form-input form-select"
                  value={draft.recurrence}
                  onChange={(e) => onUpdateDraft(draft.importId, { recurrence: e.target.value })}
                >
                  {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                {draft.isDuplicate ? (
                  <span className="import-missing">Bereits vorhanden</span>
                ) : (
                  <span className="text-muted">Neu</span>
                )}
              </td>
              {debugMode && <td className="import-debug-info">{draft.debugInfo || '-'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
