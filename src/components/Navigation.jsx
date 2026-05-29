import { useApp } from '../context/AppContext';

export default function Navigation({ activePage, onNavigate }) {
  const { isElectron } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'transaktionen', label: 'Transaktionen' },
    { id: 'auswertung', label: 'Auswertung' },
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
      </div>
    </nav>
  );
}
