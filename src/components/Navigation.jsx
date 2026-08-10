import { useApp } from '../context/AppContext';
import { formatIban } from '../utils/formatting';

export default function Navigation({ activePage, onNavigate }) {
  const { isElectron, saveStatus, manualSave, accounts, selectedAccountId, setSelectedAccount } =
    useApp();

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'transaktionen', label: 'Transaktionen' },
    { id: 'konten', label: 'Konten' },
    { id: 'einstellungen', label: 'Einstellungen' },
  ];

  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="nav-brand-icon">€</span>
        <span className="nav-brand-title">Monatliche Bilanz</span>
        {isElectron && <span className="nav-badge">Desktop</span>}
      </div>
      <div className="nav-links">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-link${activePage === item.id ? ' nav-link--active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
        {accounts.length > 0 && (
          <select
            className="nav-account-select"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccount(e.target.value)}
            title="Aktives Konto für neue Transaktionen"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        )}
        {isElectron && (
          <button
            className={`nav-save-btn${saveStatus === 'saved' ? ' nav-save-btn--saved' : ''}`}
            onClick={manualSave}
            disabled={saveStatus === 'saving'}
            title="Daten jetzt speichern"
          >
            {saveStatus === 'saved'
              ? '✓ Gespeichert'
              : saveStatus === 'saving'
                ? 'Speichert…'
                : '💾 Speichern'}
          </button>
        )}
      </div>
      {selectedAccount?.iban && (
        <div className="nav-iban" title={`IBAN von „${selectedAccount.name}“`}>
          <span className="nav-iban-label">IBAN</span>
          <span className="nav-iban-value">{formatIban(selectedAccount.iban)}</span>
        </div>
      )}
    </nav>
  );
}
