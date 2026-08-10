import { useState, useMemo } from 'react';
import type { Transaction } from '../types';

type SortField = keyof Transaction;
type SortDir = 'asc' | 'desc';

export function useSortedRows(transactions: Transaction[]) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [frozenOrder, setFrozenOrder] = useState<string[] | null>(null);

  const sorted = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let aVal: string | number = a[sortField] as string | number;
      let bVal: string | number = b[sortField] as string | number;
      if (sortField === 'amount') {
        aVal = a.type === 'income' ? a.amount : -a.amount;
        bVal = b.type === 'income' ? b.amount : -b.amount;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, sortField, sortDir]);

  const displayRows = useMemo(() => {
    if (!frozenOrder) return sorted;
    const map = new Map(transactions.map((t) => [t.id, t]));
    const frozen = frozenOrder.map((id) => map.get(id)).filter(Boolean) as Transaction[];
    const frozenSet = new Set(frozenOrder);
    const newItems = sorted.filter((t) => !frozenSet.has(t.id));
    return [...frozen, ...newItems];
  }, [frozenOrder, sorted, transactions]);

  function handleSort(field: SortField) {
    setFrozenOrder(null);
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  return { sortField, sortDir, sorted, frozenOrder, setFrozenOrder, displayRows, handleSort };
}
