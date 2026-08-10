import { useEffect, useState } from 'react';
import { useBankFetch } from '../hooks/useBankFetch';
import { formatIban } from '../utils/formatting';
import type { RawImportTransaction } from '../domain/jsonToImportDraft';
import type { Account } from '../types';

interface BankFetchModalProps {
  account: Account;
  defaultStartDate?: string;
  onClose: () => void;
  onImported: (transactions: RawImportTransaction[]) => void;
  onBalanceUpdated: (balanceEUR: number) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fallbackStartIso(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

export default function BankFetchModal({
  account,
  defaultStartDate,
  onClose,
  onImported,
  onBalanceUpdated,
}: BankFetchModalProps) {
  const {
    config,
    setConfig,
    saveConfig,
    setSaveConfig,
    status,
    statusLabel,
    isBusy,
    error,
    challengeType,
    startLogin,
    confirmTan,
    cancel,
  } = useBankFetch(account.iban, (transactions, balanceEUR) => {
    onImported(transactions);
    if (balanceEUR !== null) onBalanceUpdated(balanceEUR);
    onClose();
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate || fallbackStartIso());
  const [endDate, setEndDate] = useState(todayIso());

  const showForm = status === 'idle' || status === 'login' || status === 'error';
  const awaitingConfirmation =
    status === 'awaiting_confirmation' || status === 'confirming' || status === 'authorizing';
  const canRetryConfirm = status === 'awaiting_confirmation' && !!error;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isBusy) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isBusy]);

  const canSubmit =
    (status === 'idle' || status === 'error') &&
    config.clientId.trim() &&
    config.clientSecret.trim() &&
    username.trim() &&
    password.trim() &&
    startDate &&
    endDate;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    startLogin({ username, password, startDate, endDate });
  }

  function handleClose() {
    if (isBusy || awaitingConfirmation) cancel();
    onClose();
  }

  return (
    <div className="legal-overlay" onClick={isBusy ? undefined : handleClose} role="presentation">
      <div
        className="bank-fetch-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-fetch-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="bank-fetch-modal-header">
          <h2 id="bank-fetch-modal-title">Von Comdirect abrufen</h2>
          <button
            type="button"
            className="bank-fetch-close-button"
            onClick={handleClose}
            aria-label="Modal schließen"
          >
            ×
          </button>
        </header>
        <div className="bank-fetch-modal-body">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
            Ruft Umsätze für einen Zeitraum direkt von der Comdirect ab. Zugangsnummer, PIN und TAN
            werden nur für diesen Abruf verwendet und nicht gespeichert. Die Freigabe erfolgt per
            TAN in Ihrer Comdirect-App.
          </p>
          <p className="import-message" style={{ fontFamily: 'monospace' }}>
            Zielkonto: {account.name} · {formatIban(account.iban)}
          </p>

          {showForm && (
            <form onSubmit={handleSubmit} noValidate>
              <h3 className="bank-fetch-section-title">API-Zugang</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">
                    Client-ID
                    <input
                      type="text"
                      className="form-input"
                      placeholder="z. B. 762a3c9e-..."
                      value={config.clientId}
                      onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                      disabled={status === 'login'}
                      required
                    />
                    <span className="field-hint">
                      Aus dem comdirect Online-Banking unter „Service &gt; Freigabe für
                      comdirect-API&rdquo;.
                    </span>
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label required">
                    Client-Secret
                    <input
                      type="password"
                      className="form-input"
                      value={config.clientSecret}
                      onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                      disabled={status === 'login'}
                      required
                    />
                    <span className="field-hint">Wird zusammen mit der Client-ID vergeben.</span>
                  </label>
                </div>
              </div>
              <label
                className="radio-option"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginBottom: '0.5rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={saveConfig}
                  onChange={(e) => setSaveConfig(e.target.checked)}
                  disabled={status === 'login'}
                />
                Client-ID/Secret auf diesem Gerät speichern (Zugangsnummer, PIN und TAN werden nie
                gespeichert)
              </label>

              <h3 className="bank-fetch-section-title">Comdirect-Anmeldung</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">
                    Zugangsnummer
                    <input
                      type="text"
                      className="form-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={status === 'login'}
                      autoComplete="off"
                      required
                    />
                    <span className="field-hint">Ihre comdirect-Zugangsnummer (Login-ID).</span>
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label required">
                    PIN
                    <input
                      type="password"
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={status === 'login'}
                      autoComplete="off"
                      required
                    />
                    <span className="field-hint">Ihre comdirect-Online-Banking-PIN.</span>
                  </label>
                </div>
              </div>

              <h3 className="bank-fetch-section-title">Zeitraum der Umsätze</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">
                    Von
                    <input
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={status === 'login'}
                      required
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label required">
                    Bis
                    <input
                      type="date"
                      className="form-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={status === 'login'}
                      required
                    />
                  </label>
                </div>
              </div>

              {status === 'login' && <div className="import-message">{statusLabel}</div>}
              {status === 'error' && error && (
                <div className="import-message import-message--error">{error}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={handleClose}>
                  {status === 'login' ? 'Abbrechen' : 'Schließen'}
                </button>
                <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
                  {status === 'login' ? 'Läuft…' : 'Abrufen'}
                </button>
              </div>
            </form>
          )}

          {awaitingConfirmation && (
            <div>
              <h3 className="bank-fetch-section-title">TAN-Bestätigung</h3>
              <p>
                Bitte öffnen Sie die Comdirect-App auf Ihrem Smartphone
                {challengeType === 'P_TAN_PUSH' ? ' und bestätigen Sie die PushTAN-Anfrage' : ''}.
                Klicken Sie erst danach unten auf „Ich habe bestätigt“.
              </p>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
                Wichtig: Klicken Sie erst, nachdem Sie die Anfrage in der App tatsächlich bestätigt
                haben — ein zu früher Klick lässt die Anfrage bei comdirect ablaufen und erzwingt
                einen Neustart.
              </p>

              {status === 'confirming' && <div className="import-message">{statusLabel}</div>}
              {status === 'authorizing' && <div className="import-message">{statusLabel}</div>}
              {error && <div className="import-message import-message--error">{error}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={handleClose}>
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => confirmTan()}
                  disabled={status === 'confirming' || status === 'authorizing'}
                >
                  {status === 'confirming' || status === 'authorizing'
                    ? 'Läuft…'
                    : canRetryConfirm
                      ? 'Erneut versuchen'
                      : 'Ich habe bestätigt'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
