import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a new transaction object with generated id and timestamps.
 * @param {Object} fields - Transaction fields
 * @returns {Object} Complete transaction object
 */
export function createTransaction({ date, type, amount, purpose, category, partner, recurrence }) {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    date,          // ISO string "YYYY-MM-DD"
    type,          // "income" | "expense"
    amount: parseFloat(amount),
    purpose,
    category,
    partner,
    recurrence,    // "once" | "monthly"
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Returns a new transaction with updated fields and updatedAt timestamp.
 */
export function updateTransaction(transaction, changes) {
  return {
    ...transaction,
    ...changes,
    amount: changes.amount !== undefined ? parseFloat(changes.amount) : transaction.amount,
    id: transaction.id,
    createdAt: transaction.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
};

export const RECURRENCE_TYPES = {
  ONCE: 'once',
  MONTHLY: 'monthly',
};

export const TYPE_LABELS = {
  income: 'Einnahme',
  expense: 'Ausgabe',
};

export const RECURRENCE_LABELS = {
  once: 'Einmalig',
  monthly: 'Regelmäßig',
};
