import { createContext, useContext, useMemo } from 'react';
import { useAppState, DataContext } from './DataContext';
import { UIContext } from './UIContext';

// Legacy compat context — used only by useApp()
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { dataValue, uiValue } = useAppState();
  const appValue = useMemo(() => ({ ...dataValue, ...uiValue }), [dataValue, uiValue]);

  return (
    <DataContext.Provider value={dataValue}>
      <UIContext.Provider value={uiValue}>
        <AppContext.Provider value={appValue}>{children}</AppContext.Provider>
      </UIContext.Provider>
    </DataContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
