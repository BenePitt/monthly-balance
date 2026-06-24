export const EMPTY_COLUMN_FILTERS = {
  date: '',
  type: '',
  amount: '',
  purpose: '',
  category: '',
  partner: '',
  recurrence: '',
} as const;

export type ColumnFilters = typeof EMPTY_COLUMN_FILTERS;

export const NEW_ROW_ID = '__new__';

export const ROW_LIMIT_OPTIONS = [
  { value: '25', label: '25' },
  { value: '100', label: '100' },
  { value: '500', label: '500' },
  { value: 'all', label: 'Alle' },
] as const;

export const DETAILTABELLE_ROW_LIMIT_OPTIONS = [
  { value: '10', label: '10' },
  { value: '100', label: '100' },
  { value: '1000', label: '1000' },
  { value: 'all', label: 'Alle' },
] as const;
