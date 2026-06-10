import { useApp } from '../context/AppContext';

export default function Navigation({ activePage, onNavigate }) {
  const { isElectron, saveStatus, manualSave } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'transaktionen', label: 'Transaktionen' },
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
        {isElectron && (
          <button
            className={`nav-save-btn${saveStatus === 'saved' ? ' nav-save-btn--saved' : ''}`}
            onClick={manualSave}
            disabled={saveStatus === 'saving'}
            title="Daten jetzt speichern"
          >
            {saveStatus === 'saved' ? '✓ Gespeichert' : saveStatus === 'saving' ? 'Speichert…' : '💾 Speichern'}
          </button>
        )}
      </div>
    </nav>
  );
}
