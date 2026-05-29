import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Transaktionen from './pages/Transaktionen';
import Auswertung from './pages/Auswertung';

function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');

  function renderPage() {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'transaktionen': return <Transaktionen />;
      case 'auswertung': return <Auswertung />;
      default: return <Dashboard />;
    }
  }

  return (
    <div className="app">
      <Navigation activePage={activePage} onNavigate={setActivePage} />
      <main className="app-main">
        {renderPage()}
      </main>
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
