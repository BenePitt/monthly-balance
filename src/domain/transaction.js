import { v4 as uuidv4 } from 'uuid';
import { AppLogger } from '../utils/AppLogger';
import { DEFAULT_ACCOUNT_ID } from './account';

/**
 * Creates a new transaction object with generated id and timestamps.
 * @param {Object} fields - Transaction fields
 * @returns {Object} Complete transaction object
 */
export function createTransaction({ date, type, amount, purpose, category, partner, recurrence, accountId }, source = 'manuell') {
  const now = new Date().toISOString();
  const tx = {
    id: uuidv4(),
    date,
    type,
    amount: parseFloat(amount),
    purpose,
    category,
    partner,
    recurrence,
    accountId: accountId ?? DEFAULT_ACCOUNT_ID,
    createdAt: now,
    updatedAt: now,
  };
  AppLogger.log('TRANSAKTION ANGELEGT', { source, id: tx.id, date, type, amount: tx.amount, purpose, category, partner });
  return tx;
}

/**
 * Returns a new transaction with updated fields and updatedAt timestamp.
 */
export function updateTransaction(transaction, changes) {
  const changedFields = {};
  for (const [key, newVal] of Object.entries(changes)) {
    if (key !== 'updatedAt' && transaction[key] !== undefined && String(transaction[key]) !== String(newVal)) {
      changedFields[key] = [transaction[key], newVal];
    }
  }
  if (Object.keys(changedFields).length > 0) {
    AppLogger.log('TRANSAKTION AKTUALISIERT', { id: transaction.id, changed: changedFields });
  }
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
