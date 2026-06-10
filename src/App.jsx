import { useState, lazy, Suspense } from 'react';
import { AppProvider } from './context/AppContext';
import Navigation from './components/Navigation';
import { LegalModal } from './components/LegalModal';
import { legalData } from './legal/legalData';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transaktionen = lazy(() => import('./pages/Transaktionen'));

function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');
  const [legalView, setLegalView] = useState(null);
  const logoSrc = `${import.meta.env.BASE_URL}assets/veit-bds-logo.png`;

  function renderPage() {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'transaktionen': return <Transaktionen />;
      default: return <Dashboard />;
    }
  }

  return (
    <div className="app">
      <Navigation activePage={activePage} onNavigate={setActivePage} />
      <main className="app-main">
        <Suspense fallback={<div className="page-loading">Wird geladen...</div>}>
          {renderPage()}
        </Suspense>
      </main>
      <footer className="legal-footer">
        <div className="legal-footer-inner">
          {legalData.website ? (
            <a
              href={legalData.website}
              target="_blank"
              rel="noopener noreferrer"
              className="legal-branding legal-branding--link"
            >
              <img
                src={logoSrc}
                alt="Veit-BDS"
                className="legal-branding-logo"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
              <span>
                Gebaut von <strong>Veit-BDS</strong>
              </span>
            </a>
          ) : (
            <div className="legal-branding">
              <img
                src={logoSrc}
                alt="Veit-BDS"
                className="legal-branding-logo"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
              <span>
                Gebaut von <strong>Veit-BDS</strong>
              </span>
            </div>
          )}

          {(legalData.name || legalData.email) && (
            <div className="legal-footer-links">
              <button type="button" onClick={() => setLegalView('impressum')}>
                Impressum
              </button>
              <button type="button" onClick={() => setLegalView('datenschutz')}>
                Datenschutz
              </button>
            </div>
          )}
        </div>
      </footer>
      {legalView && (
        <LegalModal view={legalView} onClose={() => setLegalView(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
