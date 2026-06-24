import { useState, useCallback } from 'react';
import { Transaction } from '../types';
import { NEW_ROW_ID } from '../constants/ui';

interface EditValues {
  date: string;
  type: string;
  amount: string;
  purpose: string;
  category: string;
  partner: string;
  recurrence: string;
}

type EditErrors = Partial<Record<keyof EditValues, boolean>>;

function emptyEditValues(): EditValues {
  return {
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    amount: '',
    purpose: '',
    category: '',
    partner: '',
    recurrence: 'once',
  };
}

function validateEditValues(values: EditValues): EditErrors {
  const errors: EditErrors = {};
  if (!values.date) errors.date = true;
  const amt = parseFloat(values.amount);
  if (isNaN(amt) || amt <= 0) errors.amount = true;
  if (!values.purpose.trim()) errors.purpose = true;
  if (!values.category.trim()) errors.category = true;
  if (!values.partner.trim()) errors.partner = true;
  return errors;
}

export function useTransactionEdit(
  onAdd: (fields: object) => Promise<void>,
  onUpdate: (id: string, changes: object) => Promise<void>,
  frozenOrder: string[] | null,
  setFrozenOrder: (order: string[] | null) => void,
  displayRows: Transaction[],
  sorted: Transaction[],
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<EditValues>(emptyEditValues());
  const [editErrors, setEditErrors] = useState<EditErrors>({});

  const setField = useCallback((field: keyof EditValues, value: string) => {
    setEditingValues((prev) => ({ ...prev, [field]: value }));
    setEditErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const startNewRow = useCallback(() => {
    setFrozenOrder(sorted.map((t) => t.id));
    setEditingId(NEW_ROW_ID);
    setEditErrors({});
    setEditingValues(emptyEditValues());
  }, [sorted, setFrozenOrder]);

  const startEdit = useCallback((t: Transaction) => {
    setFrozenOrder(displayRows.map((tx) => tx.id));
    setEditingId(t.id);
    setEditErrors({});
    setEditingValues({
      date: t.date,
      type: t.type,
      amount: String(t.amount),
      purpose: t.purpose,
      category: t.category,
      partner: t.partner,
      recurrence: t.recurrence,
    });
  }, [displayRows, setFrozenOrder]);

  const cancelEdit = useCallback(() => {
    if (editingId === NEW_ROW_ID) setFrozenOrder(null);
    setEditingId(null);
    setEditingValues(emptyEditValues());
    setEditErrors({});
  }, [editingId, setFrozenOrder]);

  const saveNewRow = useCallback(async (andAddAnother = false) => {
    const errors = validateEditValues(editingValues);
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return; }

    const fields = { ...editingValues, amount: parseFloat(editingValues.amount) };
    setEditingId(null);
    setEditingValues(emptyEditValues());
    setEditErrors({});
    await onAdd(fields);

    if (andAddAnother) {
      setEditingId(NEW_ROW_ID);
      setEditErrors({});
      setEditingValues(emptyEditValues());
    }
  }, [editingValues, onAdd]);

  const saveEdit = useCallback(async () => {
    const errors = validateEditValues(editingValues);
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return; }

    const id = editingId!;
    const changes = { ...editingValues, amount: parseFloat(editingValues.amount) };
    setEditingId(null);
    setEditingValues(emptyEditValues());
    setEditErrors({});
    await onUpdate(id, changes);
  }, [editingId, editingValues, onUpdate]);

  return {
    editingId,
    editingValues,
    editErrors,
    setField,
    startNewRow,
    startEdit,
    cancelEdit,
    saveNewRow,
    saveEdit,
  };
}
