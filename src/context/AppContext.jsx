import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { TransactionService } from '../services/TransactionService';
import { createStorageAdapter } from '../storage/storageFactory';
import { applyFilters } from '../domain/filterEngine';
import { calculatePeriodStats } from '../domain/balanceCalculator';

const now = new Date();
const DEFAULT_STATE = {
  transactions: [],
  filters: {
    purpose: '',
    categories: [],
    partners: [],
  },
  dateRange: {
    startYear: now.getFullYear(),
    startMonth: 1,
    endYear: now.getFullYear(),
    endMonth: now.getMonth() + 1,
  },
  chartType: 'bar',    // 'bar' | 'line'
  barGroupBy: null,    // null | 'category' | 'purpose' | 'partner'
  lineChartBalanceMode: 'start',
  lineChartStartBalance: 0,
  lineChartCurrentBalance: 0,
  isLoading: true,
  isElectron: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_IS_ELECTRON':
      return { ...state, isElectron: action.payload };
    case 'SET_FILTER_PURPOSE':
      return { ...state, filters: { ...state.filters, purpose: action.payload } };
    case 'SET_FILTER_CATEGORIES':
      return { ...state, filters: { ...state.filters, categories: action.payload } };
    case 'SET_FILTER_PARTNERS':
      return { ...state, filters: { ...state.filters, partners: action.payload } };
    case 'RESET_FILTERS':
      return { ...state, filters: { purpose: '', categories: [], partners: [] } };
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: { ...state.dateRange, ...action.payload } };
    case 'SET_CHART_TYPE':
      return { ...state, chartType: action.payload };
    case 'SET_BAR_GROUP_BY':
      return { ...state, barGroupBy: action.payload };
    case 'SET_LINE_CHART_BALANCE_MODE':
      return { ...state, lineChartBalanceMode: action.payload };
    case 'SET_LINE_CHART_START_BALANCE':
      return { ...state, lineChartStartBalance: action.payload };
    case 'SET_LINE_CHART_CURRENT_BALANCE':
      return { ...state, lineChartCurrentBalance: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const storageAdapter = createStorageAdapter();
  const service = new TransactionService(storageAdapter);

  useEffect(() => {
    dispatch({ type: 'SET_IS_ELECTRON', payload: storageAdapter.isElectron() });
    service.loadAll().then((txs) => {
      dispatch({ type: 'SET_TRANSACTIONS', payload: txs });
    });
  }, []);

  const addTransaction = useCallback(async (fields) => {
    const updated = await service.add(fields, state.transactions);
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
  }, [state.transactions]);

  const importTransactions = useCallback(async (fieldsList) => {
    const updated = await service.addMany(fieldsList, state.transactions);
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
  }, [state.transactions]);

  const updateTransaction = useCallback(async (id, changes) => {
    const updated = await service.update(id, changes, state.transactions);
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
  }, [state.transactions]);

  const deleteTransaction = useCallback(async (id) => {
    const updated = await service.remove(id, state.transactions);
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
  }, [state.transactions]);

  const loadDemoData = useCallback(async (demoTransactions) => {
    const updated = [...state.transactions, ...demoTransactions];
    await service.saveAll(updated);
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
  }, [state.transactions]);

  const bulkUpdateTransactions = useCallback(async (ids, changes) => {
    const updated = await service.bulkUpdate(ids, changes, state.transactions);
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
  }, [state.transactions]);

  const clearAllTransactions = useCallback(async () => {
    await service.saveAll([]);
    dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
  }, []);

  // Derived data: filtered transactions
  const filteredTransactions = applyFilters(state.transactions, state.filters);

  // Derived data: period stats based on filtered transactions
  const { startYear, startMonth, endYear, endMonth } = state.dateRange;
  const periodStats = calculatePeriodStats(
    filteredTransactions,
    startYear, startMonth,
    endYear, endMonth
  );

  const value = {
    ...state,
    filteredTransactions,
    periodStats,
    dispatch,
    addTransaction,
    importTransactions,
    updateTransaction,
    bulkUpdateTransactions,
    deleteTransaction,
    loadDemoData,
    clearAllTransactions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
