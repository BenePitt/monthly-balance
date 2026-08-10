import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useImportState } from '../hooks/useImportState';
import { buildExportPayload } from '../domain/jsonExport';
import { AppLogger } from '../utils/AppLogger';
import CsvPreviewTable from './CsvPreviewTable';
import ImportDropzone from './ImportDropzone';
import ConfirmDialog from './ConfirmDialog';

interface ImportPanelProps {
  onNewTransaction: () => void;
}

export default function ImportPanel({ onNewTransaction }: ImportPanelProps) {
  const {
    transactions,
    importTransactions,
    importAllData,
    lineChartBalanceMode,
    lineChartStartBalance,
    lineChartCurrentBalance,
  } = useApp();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);

  const {
    source,
    pastedText,
    setPastedText,
    mode,
    fileName,
    rawCsv,
    drafts,
    warnings,
    error,
    selectedIds,
    bulkCategory,
    setBulkCategory,
    bulkPartner,
    setBulkPartner,
    isImporting,
    successMessage,
    missingMetadataCount,
    invalidDraftCount,
    canImport,
    debugMode,
    duplicateCount,
    suggestedCategories,
    suggestedPartners,
    pendingBalanceSettings,
    importMode,
    setImportMode,
    handleModeChange,
    handleFile,
    handleFileChange,
    handleTextInput,
    updateDraft,
    toggleSelected,
    toggleAllSelected,
    applyBulkMetadata,
    handleImport,
    cancelImport,
  } = useImportState(transactions);

  function handleExport() {
    const payload = buildExportPayload(
      transactions,
      lineChartBalanceMode,
      lineChartStartBalance,
      lineChartCurrentBalance
    );
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monatliche-bilanz-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    AppLogger.log('JSON-EXPORT', { count: transactions.length });
  }

  return (
    <div className="import-panel">
      <div className="import-panel-header">
        <div>
          <h2 className="section-title">Daten hinzufügen</h2>
          {fileName && <p className="import-file-name">{fileName}</p>}
        </div>
      </div>

      {drafts.length === 0 && (
        <div className="import-entry-row">
          <div className="import-actions-column">
            <button type="button" className="btn btn-primary" onClick={onNewTransaction}>
              + Neue Transaktion
            </button>
            <label className="btn btn-outline import-file-button">
              CSV/JSON einfügen
              <input type="file" accept=".csv,.json" onChange={handleFileChange} />
            </label>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowTextInput((v) => !v)}
            >
              Text einfügen
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleExport}
              disabled={transactions.length === 0}
            >
              JSON exportieren
            </button>
          </div>
          <ImportDropzone onFile={handleFile} />
        </div>
      )}

      {showTextInput && drafts.length === 0 && (
        <div className="csv-text-input-wrap">
          <textarea
            className="form-input csv-text-input"
            placeholder="CSV- oder JSON-Inhalt hier einfügen…"
            rows={8}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
          />
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                handleTextInput(pastedText);
                setShowTextInput(false);
              }}
              disabled={!pastedText.trim()}
            >
              Analysieren
            </button>
          </div>
        </div>
      )}

      {source === 'csv' && rawCsv && (
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

      {source === 'json' && pendingBalanceSettings && drafts.length > 0 && (
        <div className="import-mode-toggle" role="radiogroup" aria-label="JSON-Importmodus">
          <label className={`radio-option${importMode === 'merge' ? ' radio-option--active' : ''}`}>
            <input
              type="radio"
              name="json-import-mode"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
            />
            Zusammenführen
          </label>
          <label
            className={`radio-option${importMode === 'replace' ? ' radio-option--active' : ''}`}
          >
            <input
              type="radio"
              name="json-import-mode"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
            />
            Alles ersetzen
          </label>
        </div>
      )}

      {error && <div className="import-message import-message--error">{error}</div>}
      {successMessage && (
        <div className="import-message import-message--success">{successMessage}</div>
      )}
      {warnings.length > 0 && (
        <div className="import-message import-message--warning">
          {warnings.slice(0, 3).map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
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
            {suggestedCategories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          <datalist id="import-partner-options">
            {suggestedPartners.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>

          <CsvPreviewTable
            drafts={drafts}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelected}
            onToggleAll={toggleAllSelected}
            onUpdateDraft={updateDraft}
            suggestedCategories={suggestedCategories}
            suggestedPartners={suggestedPartners}
            debugMode={debugMode}
          />

          <div className="import-footer">
            <span className={invalidDraftCount > 0 ? 'import-missing' : 'text-muted'}>
              {invalidDraftCount > 0
                ? `${invalidDraftCount} ausgewählte Zeile${invalidDraftCount !== 1 ? 'n' : ''} unvollständig`
                : missingMetadataCount > 0
                  ? `${missingMetadataCount} ausgewählte Zeile${missingMetadataCount !== 1 ? 'n' : ''} ohne Kategorie oder Partner`
                  : `${selectedIds.length} von ${drafts.length} Transaktion${drafts.length !== 1 ? 'en' : ''} ausgewählt`}
              {duplicateCount > 0 && ` (${duplicateCount} bereits vorhanden)`}
              {source === 'json' &&
                pendingBalanceSettings &&
                (importMode === 'replace'
                  ? ' — ersetzt alle vorhandenen Daten'
                  : ' — fügt neue hinzu (Duplikate werden übersprungen)')}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setShowCancelConfirm(true)}
                disabled={isImporting}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  handleImport(importTransactions, importAllData, {
                    balanceMode: lineChartBalanceMode,
                    startBalance: lineChartStartBalance,
                    currentBalance: lineChartCurrentBalance,
                  })
                }
                disabled={!canImport}
              >
                {isImporting ? 'Import läuft...' : 'Importieren'}
              </button>
            </div>
          </div>
        </>
      )}

      {showCancelConfirm && (
        <ConfirmDialog
          message="Import wirklich abbrechen? Die eingelesenen und bearbeiteten Zeilen gehen dabei verloren."
          onConfirm={() => {
            cancelImport();
            setShowCancelConfirm(false);
          }}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
    </div>
  );
}
