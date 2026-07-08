import { useState } from 'react';
import { AppLogger } from '../utils/AppLogger';

export default function Einstellungen() {
  const [debugMode, setDebugMode] = useState(AppLogger.isDebugMode());
  const [logCount, setLogCount] = useState(AppLogger.getCount());

  function handleDebugToggle(e) {
    const val = e.target.checked;
    AppLogger.setDebugMode(val);
    setDebugMode(val);
  }

  function handleExportLog() {
    const text = AppLogger.formatAsText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-log-${today}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClearLog() {
    AppLogger.clear();
    setLogCount(0);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Einstellungen</h1>
      </div>

      <section className="section">
        <div className="card">
          <h2 className="section-title">Diagnose &amp; Debug</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={debugMode} onChange={handleDebugToggle} />
            <span>Debug-Modus aktivieren</span>
          </label>
          <p className="text-muted" style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>
            Wenn aktiv: CSV-Import schreibt pro Zeile den Matching-Grund ins Anwendungslog.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h2 className="section-title">Anwendungslog</h2>
          <p className="text-muted" style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            {logCount === 0
              ? 'Keine Einträge im aktuellen Sitzungslog.'
              : `${logCount} ${logCount === 1 ? 'Eintrag' : 'Einträge'} im aktuellen Sitzungslog.`}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={handleExportLog}
              disabled={logCount === 0}
            >
              Log exportieren (.log)
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={handleClearLog}
              disabled={logCount === 0}
            >
              Log löschen
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
