import { useState, useCallback } from 'react';

export function useBulkSelectMode() {
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const enterBulkMode = useCallback(() => {
    setSelectedIds(new Set());
    setBulkEditMode(true);
  }, []);

  const exitBulkMode = useCallback(() => {
    setBulkEditMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelect = useCallback((ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) select ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  return { bulkEditMode, setBulkEditMode, selectedIds, enterBulkMode, exitBulkMode, handleToggleSelect };
}
