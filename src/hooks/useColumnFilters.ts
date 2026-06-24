import { useState, useCallback } from 'react';
import { EMPTY_COLUMN_FILTERS, ColumnFilters } from '../constants/ui';

export function useColumnFilters(initial: ColumnFilters = EMPTY_COLUMN_FILTERS) {
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(initial);

  const handleColumnFilterChange = useCallback((field: keyof ColumnFilters, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetColumnFilters = useCallback(() => {
    setColumnFilters(initial);
  }, [initial]);

  const hasColumnFilters = Object.values(columnFilters).some((v) => v !== '');

  return { columnFilters, handleColumnFilterChange, resetColumnFilters, hasColumnFilters };
}
