import { createContext, useContext } from 'react';
import type { Transaction, Filters, DateRange, PeriodStats, LineChartBalanceMode, Account } from '../types';

export interface DataContextValue {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  periodStats: PeriodStats;
  filters: Filters;
  dateRange: DateRange;
  isLoading: boolean;
  accounts: Account[];
  selectedAccountId: string;
  dispatch: React.Dispatch<{ type: string; payload?: unknown }>;
  addTransaction: (fields: object) => Promise<void>;
  importTransactions: (fieldsList: object[]) => Promise<void>;
  updateTransaction: (id: string, changes: object) => Promise<void>;
  bulkUpdateTransactions: (ids: string[], changes: object) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  loadDemoData: (demos: Transaction[]) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
  importAllData: (data: {
    transactions: Transaction[];
    startBalance: number;
    currentBalance: number;
    balanceMode: LineChartBalanceMode;
  }) => Promise<void>;
  addAccount: (name: string) => Promise<Account>;
  renameAccount: (id: string, name: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  setSelectedAccount: (id: string) => void;
}

export const DataContext = createContext<DataContextValue | null>(null);

export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataContext must be used within AppProvider');
  return ctx;
}
