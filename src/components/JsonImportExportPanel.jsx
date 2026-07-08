import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AppLogger } from '../utils/AppLogger';
import {
  buildExportPayload,
  parseImportPayload,
  sanitizeTransaction,
  validateTransaction,
  sanitizeBalanceSettings,
  applyImportMode,
} from '../domain/jsonExport';

export default function JsonImportExportPanel() {
  const {
    transactions,
    lineChartBalanceMode,
    lineChartStartBalance,
    lineChartCurrentBalance,
    importAllData,
  } = useApp();

  const fileInputRef = useRef(null);
  const [pendingData, setPendingData] = useState(null);
  const [importMode, setImportMode] = useState('merge');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [success, setSuccess] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  function handleExport() {
    const payload = buildExportPayload(
      transactions,
      lineChartBalanceMode,
      lineChartStartBalance,
      lineChartCurrentBalance,
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

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setWarnings([]);
    setSuccess('');
    setPendingData(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const { transactions: rawTxs, balanceSettings: rawSettings, warnings: parseWarnings } = parseImportPayload(parsed);

        const allWarnings = [...parseWarnings];
        const validTxs = [];
        let skipped = 0;

        for (const raw of rawTxs) {
          const sanitized = sanitizeTransaction(raw);
          const { valid } = validateTransaction(sanitized);
          if (valid) {
            validTxs.push(sanitized);
          } else {
            skipped++;
          }
        }

        if (skipped > 0) {
          allWarnings.push(`${skipped} Transaktion(en) übersprungen (ungültige Pflichtfelder).`);
        }

        if (validTxs.length === 0) {
          setError('Keine gültigen Transaktionen in der Datei gefunden.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setWarnings(allWarnings);
        setPendingData({
          transactions: validTxs,
          balanceSettings: sanitizeBalanceSettings(rawSettings),
        });
      } catch {
        setError('Datei konnte nicht gelesen werden. Bitte eine gültige JSON-Datei auswählen.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  async function handleConfirmImport() {
    if (!pendingData) return;
    setIsImporting(true);
    setError('');
    try {
      const finalTransactions = applyImportMode(transactions, pendingData.transactions, importMode);
      const balanceSettings = importMode === 'replace'
        ? pendingData.balanceSettings
        : { startBalance: lineChartStartBalance, currentBalance: lineChartCurrentBalance, balanceMode: lineChartBalanceMode };

      await importAllData({ transactions: finalTransactions, ...balanceSettings, _importMode: importMode });

      const added = finalTransactions.length - transactions.length;
      if (importMode === 'merge') {
        setSuccess(`${added} neue Transaktion(en) importiert.`);
      } else {
        setSuccess(`${finalTransactions.length} Transaktion(en) importiert (alle Daten ersetzt).`);
      }
      setPendingData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      setError('Import fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setIsImporting(false);
    }
  }

  function handleCancel() {
    setPendingData(null);
    setError('');
    setWarnings([]);
    setSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="import-panel">
      <div className="import-panel-header">
        <div>
          <h2 className="section-title">JSON Export / Import</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-sm btn-outline" onClick={handleExport} disabled={transactions.length === 0}>
            Exportieren
          </button>
          {!pendingData && (
            <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', marginBottom: 0 }}>
              JSON importieren
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      </div>

      {pendingData && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="json-import-mode"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
              />
              Zusammenführen
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="json-import-mode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
              />
              Alles ersetzen
            </label>
          </div>

          <div className="import-footer">
            <span className="text-muted">
              {pendingData.transactions.length} Transaktion(en) bereit
              {importMode === 'replace' ? ' — ersetzt alle vorhandenen Daten' : ' — fügt neue hinzu (Duplikate werden übersprungen)'}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-sm btn-outline" onClick={handleCancel} disabled={isImporting}>
                Abbrechen
              </button>
              <button className="btn btn-sm btn-primary" onClick={handleConfirmImport} disabled={isImporting}>
                {isImporting ? 'Import läuft...' : 'Importieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="import-message import-message--error" style={{ marginTop: '0.5rem' }}>{error}</div>}
      {success && <div className="import-message import-message--success" style={{ marginTop: '0.5rem' }}>{success}</div>}
      {warnings.length > 0 && (
        <div className="import-message import-message--warning" style={{ marginTop: '0.5rem' }}>
          {warnings.map((w) => <p key={w} style={{ margin: 0 }}>{w}</p>)}
        </div>
      )}
    </div>
  );
}
