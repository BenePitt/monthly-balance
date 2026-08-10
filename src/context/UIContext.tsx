import { createContext, useContext } from 'react';

export interface UIContextValue {
  chartType: 'bar' | 'line';
  barGroupBy: 'category' | 'purpose' | 'partner' | null;
  categorySort: 'none' | 'income' | 'expense' | 'balance';
  hideEmptyCategories: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  isElectron: boolean;
  dispatch: React.Dispatch<{ type: string; payload?: unknown }>;
  manualSave: () => Promise<void>;
}

export const UIContext = createContext<UIContextValue | null>(null);

export function useUIContext(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUIContext must be used within AppProvider');
  return ctx;
}
