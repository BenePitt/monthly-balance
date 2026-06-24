export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  purpose: string;
  category: string;
  partner: string;
  recurrence: 'once' | 'monthly';
  createdAt: string;
  updatedAt: string;
}

export interface Filters {
  purpose: string;
  categories: string[];
  partners: string[];
}

export interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

export interface MonthBalance {
  year: number;
  month: number;
  income: number;
  expense: number;
  balance: number;
  transactions: Transaction[];
}

export interface PeriodStats {
  months: MonthBalance[];
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  avgMonthlyBalance: number;
}

export type TransactionType = 'income' | 'expense';
export type RecurrenceType = 'once' | 'monthly';
export type ChartType = 'bar' | 'line' | 'verlauf';
export type BarGroupBy = 'category' | 'purpose' | 'partner' | null;
export type SaveStatus = 'idle' | 'saving' | 'saved';
export type LineChartBalanceMode = 'start' | 'current';
