import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import type {
  Transaction,
  Filters,
  DateRange,
  PeriodStats,
  LineChartBalanceMode,
  Account,
} from '../types';
import { AppLogger } from '../utils/AppLogger';
import { TransactionService } from '../services/TransactionService';
import { createStorageAdapter } from '../storage/storageFactory';
import { applyFilters } from '../domain/filterEngine';
import { calculatePeriodStats } from '../domain/balanceCalculator';
import {
  DEFAULT_ACCOUNT_ID,
  createDefaultAccount,
  createAccount,
  renameAccount as renameAccountDomain,
  canDeleteAccount,
} from '../domain/account';
import type { UIContextValue } from './UIContext';

export interface DataContextValue {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  periodStats: PeriodStats;
  filters: Filters;
  dateRange: DateRange;
  isLoading: boolean;
  accounts: Account[];
  selectedAccountId: string;
  lineChartBalanceMode: LineChartBalanceMode;
  lineChartStartBalance: number;
  lineChartCurrentBalance: number;
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

const now = new Date();
const DEFAULT_STATE = {
  transactions: [],
  accounts: [],
  selectedAccountId: DEFAULT_ACCOUNT_ID,
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
  chartType: 'bar',
  barGroupBy: null,
  categorySort: 'none',
  hideEmptyCategories: false,
  lineChartBalanceMode: 'start',
  lineChartStartBalance: 0,
  lineChartCurrentBalance: 0,
  isLoading: true,
  isElectron: false,
  saveStatus: 'idle',
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
    case 'SET_CATEGORY_SORT':
      return { ...state, categorySort: action.payload };
    case 'SET_HIDE_EMPTY_CATEGORIES':
      return { ...state, hideEmptyCategories: action.payload };
    case 'SET_LINE_CHART_BALANCE_MODE':
      return { ...state, lineChartBalanceMode: action.payload };
    case 'SET_LINE_CHART_START_BALANCE':
      return { ...state, lineChartStartBalance: action.payload };
    case 'SET_LINE_CHART_CURRENT_BALANCE':
      return { ...state, lineChartCurrentBalance: action.payload };
    case 'SET_SAVE_STATUS':
      return { ...state, saveStatus: action.payload };
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload };
    case 'SET_SELECTED_ACCOUNT':
      return { ...state, selectedAccountId: action.payload };
    default:
      return state;
  }
}

/**
 * Owns the app's single reducer/state (transactions, accounts, filters, chart
 * settings) plus storage wiring. Returns the Data- and UI-facing slices of
 * that shared state so AppContext.jsx can compose them into the two contexts
 * and the legacy useApp() value without duplicating the reducer.
 */
export function useAppState(): { dataValue: DataContextValue; uiValue: UIContextValue } {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const storageAdapterRef = useRef(null);
  if (!storageAdapterRef.current) storageAdapterRef.current = createStorageAdapter();
  const serviceRef = useRef(null);
  if (!serviceRef.current) serviceRef.current = new TransactionService(storageAdapterRef.current);
  const storageAdapter = storageAdapterRef.current;
  const service = serviceRef.current;
  const saveStatusTimerRef = useRef(null);
  const balanceDebounceRef = useRef(null);
  const isInitializedRef = useRef(false);

  const isDesktop = storageAdapter.isElectron();

  const buildAppData = useCallback(
    (transactions, balanceMode, startBalance, currentBalance, accounts, selectedAccountId) => ({
      transactions,
      balanceMode,
      startBalance,
      currentBalance,
      accounts,
      selectedAccountId,
    }),
    []
  );

  const setSaveStatus = useCallback((status) => {
    dispatch({ type: 'SET_SAVE_STATUS', payload: status });
    if (status === 'saved') {
      clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => {
        dispatch({ type: 'SET_SAVE_STATUS', payload: 'idle' });
      }, 2000);
    }
  }, []);

  const seedAccounts = useCallback((loadedAccounts, loadedSelectedAccountId) => {
    const accounts = loadedAccounts?.length ? loadedAccounts : [createDefaultAccount()];
    const selectedAccountId = accounts.some((a) => a.id === loadedSelectedAccountId)
      ? loadedSelectedAccountId
      : accounts[0].id;
    dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
    dispatch({ type: 'SET_SELECTED_ACCOUNT', payload: selectedAccountId });
  }, []);

  useEffect(() => {
    dispatch({ type: 'SET_IS_ELECTRON', payload: isDesktop });
    if (isDesktop && storageAdapter.getData) {
      storageAdapter.getData().then((data) => {
        dispatch({ type: 'SET_TRANSACTIONS', payload: data.transactions ?? [] });
        dispatch({ type: 'SET_LINE_CHART_BALANCE_MODE', payload: data.balanceMode ?? 'start' });
        dispatch({ type: 'SET_LINE_CHART_START_BALANCE', payload: data.startBalance ?? 0 });
        dispatch({ type: 'SET_LINE_CHART_CURRENT_BALANCE', payload: data.currentBalance ?? 0 });
        seedAccounts(data.accounts, data.selectedAccountId);
        isInitializedRef.current = true;
      });
    } else {
      service.loadAll().then((txs) => {
        dispatch({ type: 'SET_TRANSACTIONS', payload: txs });
        seedAccounts([], null);
        isInitializedRef.current = true;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDesktop || !storageAdapter.saveData || !isInitializedRef.current) return;
    clearTimeout(balanceDebounceRef.current);
    balanceDebounceRef.current = setTimeout(() => {
      storageAdapter.saveData(
        buildAppData(
          state.transactions,
          state.lineChartBalanceMode,
          state.lineChartStartBalance,
          state.lineChartCurrentBalance,
          state.accounts,
          state.selectedAccountId
        )
      );
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lineChartBalanceMode, state.lineChartStartBalance, state.lineChartCurrentBalance]);

  const saveAppData = useCallback(
    async (
      transactions,
      accounts = state.accounts,
      selectedAccountId = state.selectedAccountId
    ) => {
      if (isDesktop && storageAdapter.saveData) {
        await storageAdapter.saveData(
          buildAppData(
            transactions,
            state.lineChartBalanceMode,
            state.lineChartStartBalance,
            state.lineChartCurrentBalance,
            accounts,
            selectedAccountId
          )
        );
        AppLogger.log('GESPEICHERT', {
          count: transactions.length,
          adapter: 'Desktop',
          status: 'OK',
        });
      }
    },
    [
      state.lineChartBalanceMode,
      state.lineChartStartBalance,
      state.lineChartCurrentBalance,
      state.accounts,
      state.selectedAccountId,
      isDesktop,
      buildAppData,
    ]
  );

  const addTransaction = useCallback(
    async (fields) => {
      const updated = await service.add(
        { ...fields, accountId: state.selectedAccountId },
        state.transactions
      );
      dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
      await saveAppData(updated);
    },
    [state.transactions, state.selectedAccountId, saveAppData]
  );

  const importTransactions = useCallback(
    async (fieldsList) => {
      const taggedFieldsList = fieldsList.map((fields) => ({
        ...fields,
        accountId: state.selectedAccountId,
      }));
      const updated = await service.addMany(taggedFieldsList, state.transactions);
      dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
      await saveAppData(updated);
    },
    [state.transactions, state.selectedAccountId, saveAppData]
  );

  const updateTransaction = useCallback(
    async (id, changes) => {
      const updated = await service.update(id, changes, state.transactions);
      dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
      await saveAppData(updated);
    },
    [state.transactions, saveAppData]
  );

  const deleteTransaction = useCallback(
    async (id) => {
      const updated = await service.remove(id, state.transactions);
      dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
      await saveAppData(updated);
    },
    [state.transactions, saveAppData]
  );

  const loadDemoData = useCallback(
    async (demoTransactions) => {
      AppLogger.log('DEMO-DATEN', { count: demoTransactions.length });
      const updated = [...state.transactions, ...demoTransactions];
      dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
      await saveAppData(updated);
    },
    [state.transactions, saveAppData]
  );

  const bulkUpdateTransactions = useCallback(
    async (ids, changes) => {
      const updated = await service.bulkUpdate(ids, changes, state.transactions);
      dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
      await saveAppData(updated);
    },
    [state.transactions, saveAppData]
  );

  const clearAllTransactions = useCallback(async () => {
    AppLogger.log('ALLE GELÖSCHT', { count: state.transactions.length });
    dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
    await saveAppData([]);
  }, [state.transactions.length, saveAppData]);

  const importAllData = useCallback(
    async (data) => {
      AppLogger.log('JSON-IMPORT', {
        mode: data._importMode ?? 'replace',
        count: data.transactions.length,
      });
      dispatch({ type: 'SET_TRANSACTIONS', payload: data.transactions });
      dispatch({ type: 'SET_LINE_CHART_BALANCE_MODE', payload: data.balanceMode });
      dispatch({ type: 'SET_LINE_CHART_START_BALANCE', payload: data.startBalance });
      dispatch({ type: 'SET_LINE_CHART_CURRENT_BALANCE', payload: data.currentBalance });
      if (isDesktop && storageAdapter.saveData) {
        await storageAdapter.saveData(
          buildAppData(
            data.transactions,
            data.balanceMode,
            data.startBalance,
            data.currentBalance,
            state.accounts,
            state.selectedAccountId
          )
        );
      }
    },
    [isDesktop, storageAdapter, buildAppData, state.accounts, state.selectedAccountId]
  );

  const manualSave = useCallback(async () => {
    if (!isDesktop || !storageAdapter.saveData) return;
    setSaveStatus('saving');
    await storageAdapter.saveData(
      buildAppData(
        state.transactions,
        state.lineChartBalanceMode,
        state.lineChartStartBalance,
        state.lineChartCurrentBalance,
        state.accounts,
        state.selectedAccountId
      )
    );
    setSaveStatus('saved');
  }, [
    state.transactions,
    state.lineChartBalanceMode,
    state.lineChartStartBalance,
    state.lineChartCurrentBalance,
    state.accounts,
    state.selectedAccountId,
    isDesktop,
    buildAppData,
    setSaveStatus,
  ]);

  const addAccount = useCallback(
    async (name) => {
      const account = createAccount(name);
      const updatedAccounts = [...state.accounts, account];
      dispatch({ type: 'SET_ACCOUNTS', payload: updatedAccounts });
      await saveAppData(state.transactions, updatedAccounts);
      return account;
    },
    [state.accounts, state.transactions, saveAppData]
  );

  const renameAccount = useCallback(
    async (id, name) => {
      const updatedAccounts = state.accounts.map((a) =>
        a.id === id ? renameAccountDomain(a, name) : a
      );
      dispatch({ type: 'SET_ACCOUNTS', payload: updatedAccounts });
      await saveAppData(state.transactions, updatedAccounts);
    },
    [state.accounts, state.transactions, saveAppData]
  );

  const deleteAccount = useCallback(
    async (id) => {
      if (!canDeleteAccount(id, state.transactions)) {
        throw new Error(
          'Konto kann nicht gelöscht werden: entweder Standardkonto oder es sind noch Transaktionen zugeordnet.'
        );
      }
      const updatedAccounts = state.accounts.filter((a) => a.id !== id);
      dispatch({ type: 'SET_ACCOUNTS', payload: updatedAccounts });
      const nextSelectedAccountId =
        state.selectedAccountId === id ? DEFAULT_ACCOUNT_ID : state.selectedAccountId;
      if (nextSelectedAccountId !== state.selectedAccountId) {
        dispatch({ type: 'SET_SELECTED_ACCOUNT', payload: nextSelectedAccountId });
      }
      AppLogger.log('KONTO GELÖSCHT', { id });
      await saveAppData(state.transactions, updatedAccounts, nextSelectedAccountId);
    },
    [state.accounts, state.transactions, state.selectedAccountId, saveAppData]
  );

  const setSelectedAccount = useCallback((id) => {
    dispatch({ type: 'SET_SELECTED_ACCOUNT', payload: id });
  }, []);

  const filteredTransactions = useMemo(
    () => applyFilters(state.transactions, state.filters),
    [state.transactions, state.filters]
  );

  const { startYear, startMonth, endYear, endMonth } = state.dateRange;
  const periodStats = useMemo(
    () => calculatePeriodStats(filteredTransactions, startYear, startMonth, endYear, endMonth),
    [filteredTransactions, startYear, startMonth, endYear, endMonth]
  );

  const dataValue = useMemo(
    () => ({
      transactions: state.transactions,
      filteredTransactions,
      periodStats,
      filters: state.filters,
      dateRange: state.dateRange,
      isLoading: state.isLoading,
      accounts: state.accounts,
      selectedAccountId: state.selectedAccountId,
      lineChartBalanceMode: state.lineChartBalanceMode,
      lineChartStartBalance: state.lineChartStartBalance,
      lineChartCurrentBalance: state.lineChartCurrentBalance,
      dispatch,
      addTransaction,
      importTransactions,
      updateTransaction,
      bulkUpdateTransactions,
      deleteTransaction,
      loadDemoData,
      clearAllTransactions,
      importAllData,
      addAccount,
      renameAccount,
      deleteAccount,
      setSelectedAccount,
    }),
    [
      state.transactions,
      filteredTransactions,
      periodStats,
      state.filters,
      state.dateRange,
      state.isLoading,
      state.accounts,
      state.selectedAccountId,
      state.lineChartBalanceMode,
      state.lineChartStartBalance,
      state.lineChartCurrentBalance,
      addTransaction,
      importTransactions,
      updateTransaction,
      bulkUpdateTransactions,
      deleteTransaction,
      loadDemoData,
      clearAllTransactions,
      importAllData,
      addAccount,
      renameAccount,
      deleteAccount,
      setSelectedAccount,
    ]
  );

  const uiValue = useMemo(
    () => ({
      chartType: state.chartType,
      barGroupBy: state.barGroupBy,
      categorySort: state.categorySort,
      hideEmptyCategories: state.hideEmptyCategories,
      saveStatus: state.saveStatus,
      isElectron: state.isElectron,
      dispatch,
      manualSave,
    }),
    [
      state.chartType,
      state.barGroupBy,
      state.categorySort,
      state.hideEmptyCategories,
      state.saveStatus,
      state.isElectron,
      manualSave,
    ]
  );

  return { dataValue, uiValue };
}
