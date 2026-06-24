import { useApp } from '../context/AppContext';
import { useCsvImportState } from '../hooks/useCsvImportState';
import CsvPreviewTable from './CsvPreviewTable';

export default function CsvImportPanel({ onNewTransaction }) {
  const { transactions, importTransactions } = useApp();

  const {
    inputMode, setInputMode,
    csvTextInput, setCsvTextInput,
    mode,
    fileName,
    rawCsv,
    drafts,
    warnings,
    error,
    selectedIds,
    bulkCategory, setBulkCategory,
    bulkPartner, setBulkPartner,
    isImporting,
    successMessage,
    missingMetadataCount,
    invalidDraftCount,
    canImport,
    suggestedCategories,
    suggestedPartners,
    handleModeChange,
    handleFileChange,
    handleAnalyzeText,
    updateDraft,
    toggleSelected,
    toggleAllSelected,
    applyBulkMetadata,
    handleImport,
  } = useCsvImportState(transactions);

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
            <input type="radio" name="csv-import-mode" checked={mode === 'auto'} onChange={() => handleModeChange('auto')} />
            Automatisch erkennen
          </label>
          <label className={`radio-option${mode === 'manual' ? ' radio-option--active' : ''}`}>
            <input type="radio" name="csv-import-mode" checked={mode === 'manual'} onChange={() => handleModeChange('manual')} />
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
              onChange={(e) => setBulkCategory(e.target.value)}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Transaktionspartner"
              list="import-partner-options"
              value={bulkPartner}
              onChange={(e) => setBulkPartner(e.target.value)}
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
            {suggestedCategories.map((cat) => <option key={cat} value={cat} />)}
          </datalist>
          <datalist id="import-partner-options">
            {suggestedPartners.map((p) => <option key={p} value={p} />)}
          </datalist>

          <CsvPreviewTable
            drafts={drafts}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelected}
            onToggleAll={toggleAllSelected}
            onUpdateDraft={updateDraft}
            suggestedCategories={suggestedCategories}
            suggestedPartners={suggestedPartners}
          />

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
              onClick={() => handleImport(importTransactions)}
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
