import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { parseBankCsv, toTransactionFields } from '../domain/csvImport';
import { RECURRENCE_LABELS, TYPE_LABELS } from '../domain/transaction';

function withImportIds(transactions) {
  return transactions.map((transaction, index) => ({
    ...transaction,
    importId: `${transaction.sourceRow}-${index}`,
  }));
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function isValidDraft(draft) {
  return !!(
    draft.date &&
    ['income', 'expense'].includes(draft.type) &&
    Number.isFinite(Number(draft.amount)) &&
    Number(draft.amount) > 0 &&
    draft.purpose.trim() &&
    draft.category.trim() &&
    draft.partner.trim() &&
    ['once', 'monthly'].includes(draft.recurrence)
  );
}

function getPurposeRows(purpose) {
  const text = String(purpose || '');
  const visualRows = text
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 42)), 0);
  return Math.min(6, Math.max(2, visualRows));
}

export default function CsvImportPanel({ onNewTransaction }) {
  const { transactions, importTransactions } = useApp();
  const [inputMode, setInputMode] = useState('file');
  const [csvTextInput, setCsvTextInput] = useState('');
  const [mode, setMode] = useState('auto');
  const [fileName, setFileName] = useState('');
  const [rawCsv, setRawCsv] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkPartner, setBulkPartner] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const missingMetadataCount = drafts.filter((draft) => (
    !draft.category.trim() || !draft.partner.trim()
  )).length;
  const invalidDraftCount = drafts.filter((draft) => !isValidDraft(draft)).length;
  const canImport = drafts.length > 0 && invalidDraftCount === 0 && !isImporting;

  const suggestedCategories = useMemo(() => uniqueSorted([
    ...transactions.map((transaction) => transaction.category),
    ...drafts.map((draft) => draft.category),
    'Bankgebuehren',
    'Digitales',
    'Drogerie',
    'Elektronik',
    'Freizeit',
    'Gehalt',
    'Haushalt',
    'Kleidung',
    'Lebensmittel',
    'Mobilitaet',
    'Nebenkosten',
    'Online-Zahlung',
    'Onlinehandel',
    'Restaurant',
    'Sonstiges',
    'Steuern',
    'Telekommunikation',
    'Versicherung',
    'Wohnen',
  ]), [transactions, drafts]);

  const suggestedPartners = useMemo(() => uniqueSorted([
    ...transactions.map((transaction) => transaction.partner),
    ...drafts.map((draft) => draft.partner),
    'Amazon',
    'Arbeitgeber',
    'Bank',
    'Edeka',
    'PayPal',
    'Unbekannt',
    'Vermieter',
  ]), [transactions, drafts]);

  function parseCsv(text, nextMode) {
    const result = parseBankCsv(text, { fillUnknowns: nextMode === 'auto' });
    setDrafts(withImportIds(result.transactions));
    setWarnings(result.warnings);
    setSelectedIds([]);
    setBulkCategory('');
    setBulkPartner('');
    setSuccessMessage('');
    setError(result.transactions.length === 0 ? 'Keine importierbaren Transaktionen gefunden.' : '');
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    if (rawCsv) parseCsv(rawCsv, nextMode);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');
    setSuccessMessage('');

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setRawCsv(text);
      parseCsv(text, mode);
    };
    reader.onerror = () => {
      setError('Die CSV-Datei konnte nicht gelesen werden.');
      setDrafts([]);
    };
    reader.readAsText(file, 'utf-8');
  }

  function updateDraft(importId, changes) {
    setDrafts((currentDrafts) => currentDrafts.map((draft) => (
      draft.importId === importId ? { ...draft, ...changes } : draft
    )));
  }

  function toggleSelected(importId) {
    setSelectedIds((currentIds) => (
      currentIds.includes(importId)
        ? currentIds.filter((id) => id !== importId)
        : [...currentIds, importId]
    ));
  }

  function toggleAllSelected() {
    if (selectedIds.length === drafts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(drafts.map((draft) => draft.importId));
    }
  }

  function applyBulkMetadata() {
    const selected = new Set(selectedIds);
    setDrafts((currentDrafts) => currentDrafts.map((draft) => {
      if (!selected.has(draft.importId)) return draft;
      return {
        ...draft,
        category: bulkCategory.trim() || draft.category,
        partner: bulkPartner.trim() || draft.partner,
      };
    }));
  }

  async function handleImport() {
    if (!canImport) return;

    setIsImporting(true);
    setError('');
    try {
      await importTransactions(drafts.map(toTransactionFields));
      setSuccessMessage(`${drafts.length} Transaktion${drafts.length !== 1 ? 'en' : ''} importiert.`);
      setDrafts([]);
      setSelectedIds([]);
      setRawCsv('');
      setFileName('');
      setCsvTextInput('');
    } catch {
      setError('Der Import konnte nicht gespeichert werden.');
    } finally {
      setIsImporting(false);
    }
  }

  function handleAnalyzeText() {
    if (!csvTextInput.trim()) return;
    setError('');
    setSuccessMessage('');
    setFileName('');
    setRawCsv(csvTextInput);
    parseCsv(csvTextInput, mode);
  }

  return (
    <div className="import-panel">
      <div className="import-panel-header">
        <div>
          <h2 className="section-title">Daten hinzufügen</h2>
          {fileName && <p className="import-file-name">{fileName}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {drafts.length === 0 && (
            <div className="chart-type-toggle">
              <button
                className={`btn btn-sm${inputMode === 'file' ? ' btn-primary' : ' btn-outline'}`}
                onClick={() => setInputMode('file')}
              >
                Datei hochladen
              </button>
              <button
                className={`btn btn-sm${inputMode === 'text' ? ' btn-primary' : ' btn-outline'}`}
                onClick={() => setInputMode('text')}
              >
                Text einfügen
              </button>
            </div>
          )}
          {inputMode === 'file' && drafts.length === 0 && (
            <label className="btn btn-outline import-file-button">
              CSV auswählen
              <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
            </label>
          )}
          {onNewTransaction && (
            <button type="button" className="btn btn-primary" onClick={onNewTransaction}>
              + Neue Transaktion
            </button>
          )}
        </div>
      </div>

      {inputMode === 'text' && drafts.length === 0 && (
        <div className="csv-text-input-wrap">
          <textarea
            className="form-input csv-text-input"
            placeholder="CSV-Inhalt hier einfügen…"
            rows={8}
            value={csvTextInput}
            onChange={(e) => setCsvTextInput(e.target.value)}
          />
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAnalyzeText}
              disabled={!csvTextInput.trim()}
            >
              CSV analysieren
            </button>
          </div>
        </div>
      )}

      {rawCsv && (
        <div className="import-mode-toggle" role="radiogroup" aria-label="Importmodus">
          <label className={`radio-option${mode === 'auto' ? ' radio-option--active' : ''}`}>
            <input
              type="radio"
              name="csv-import-mode"
              checked={mode === 'auto'}
              onChange={() => handleModeChange('auto')}
            />
            Automatisch erkennen
          </label>
          <label className={`radio-option${mode === 'manual' ? ' radio-option--active' : ''}`}>
            <input
              type="radio"
              name="csv-import-mode"
              checked={mode === 'manual'}
              onChange={() => handleModeChange('manual')}
            />
            Manuell zuordnen
          </label>
        </div>
      )}

      {error && <div className="import-message import-message--error">{error}</div>}
      {successMessage && <div className="import-message import-message--success">{successMessage}</div>}
      {warnings.length > 0 && (
        <div className="import-message import-message--warning">
          {warnings.slice(0, 3).map((warning) => <p key={warning}>{warning}</p>)}
          {warnings.length > 3 && <p>{warnings.length - 3} weitere Hinweise.</p>}
        </div>
      )}

      {drafts.length > 0 && (
        <>
          <div className="import-bulk-actions">
            <span className="text-muted">{selectedIds.length} ausgewählt</span>
            <input
              type="text"
              className="form-input"
              placeholder="Kategorie"
              list="import-category-options"
              value={bulkCategory}
              onChange={(event) => setBulkCategory(event.target.value)}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Transaktionspartner"
              list="import-partner-options"
              value={bulkPartner}
              onChange={(event) => setBulkPartner(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={applyBulkMetadata}
              disabled={selectedIds.length === 0 || (!bulkCategory.trim() && !bulkPartner.trim())}
            >
              Auswahl anwenden
            </button>
          </div>

          <datalist id="import-category-options">
            {suggestedCategories.map((category) => <option key={category} value={category} />)}
          </datalist>
          <datalist id="import-partner-options">
            {suggestedPartners.map((partner) => <option key={partner} value={partner} />)}
          </datalist>

          <div className="table-wrapper import-table-wrapper">
            <table className="transaction-table import-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={drafts.length > 0 && selectedIds.length === drafts.length}
                      onChange={toggleAllSelected}
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
                  <th>Treffer</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft) => (
                  <tr key={draft.importId} className={`tx-row tx-row--${draft.type}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(draft.importId)}
                        onChange={() => toggleSelected(draft.importId)}
                        aria-label={`Zeile ${draft.sourceRow} auswählen`}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className={`form-input${!draft.date ? ' form-input--error' : ''}`}
                        value={draft.date}
                        onChange={(event) => updateDraft(draft.importId, { date: event.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        className="form-input form-select"
                        value={draft.type}
                        onChange={(event) => updateDraft(draft.importId, { type: event.target.value })}
                      >
                        {Object.entries(TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
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
                        onChange={(event) => updateDraft(draft.importId, { amount: event.target.value })}
                      />
                    </td>
                    <td className="import-purpose">
                      <textarea
                        className={`form-input${!draft.purpose.trim() ? ' form-input--error' : ''}`}
                        value={draft.purpose}
                        rows={getPurposeRows(draft.purpose)}
                        onChange={(event) => updateDraft(draft.importId, { purpose: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={`form-input${!draft.category.trim() ? ' form-input--error' : ''}`}
                        value={draft.category}
                        list="import-category-options"
                        onChange={(event) => updateDraft(draft.importId, { category: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={`form-input${!draft.partner.trim() ? ' form-input--error' : ''}`}
                        value={draft.partner}
                        list="import-partner-options"
                        onChange={(event) => updateDraft(draft.importId, { partner: event.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        className="form-input form-select"
                        value={draft.recurrence}
                        onChange={(event) => updateDraft(draft.importId, { recurrence: event.target.value })}
                      >
                        {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>{draft.matchedRule || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="import-footer">
            <span className={invalidDraftCount > 0 ? 'import-missing' : 'text-muted'}>
              {invalidDraftCount > 0
                ? `${invalidDraftCount} Zeile${invalidDraftCount !== 1 ? 'n' : ''} unvollständig`
                : missingMetadataCount > 0
                  ? `${missingMetadataCount} Zeile${missingMetadataCount !== 1 ? 'n' : ''} ohne Kategorie oder Partner`
                  : `${drafts.length} Transaktion${drafts.length !== 1 ? 'en' : ''} bereit`}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={!canImport}
            >
              {isImporting ? 'Import läuft...' : 'Importieren'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
