import { v4 as uuidv4 } from 'uuid';
import { AppLogger } from '../utils/AppLogger';

export const DEFAULT_ACCOUNT_ID = 'default';
export const DEFAULT_ACCOUNT_NAME = 'Standardkonto';

/**
 * Creates the fixed default account, used as fallback for transactions
 * without an explicit account assignment.
 */
export function createDefaultAccount() {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_ACCOUNT_ID,
    name: DEFAULT_ACCOUNT_NAME,
    iban: '',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a new account object with generated id and timestamps.
 */
export function createAccount(name) {
  const now = new Date().toISOString();
  const account = { id: uuidv4(), name: name.trim(), iban: '', createdAt: now, updatedAt: now };
  AppLogger.log('KONTO ANGELEGT', { id: account.id, name: account.name });
  return account;
}

/**
 * Returns a new account with updated name and updatedAt timestamp.
 */
export function renameAccount(account, name) {
  AppLogger.log('KONTO UMBENANNT', { id: account.id, from: account.name, to: name.trim() });
  return { ...account, name: name.trim(), updatedAt: new Date().toISOString() };
}

/**
 * Strips whitespace and uppercases an IBAN for consistent storage/comparison.
 */
export function normalizeIban(iban) {
  return String(iban || '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

/**
 * Returns a new account with an updated, normalized IBAN and updatedAt timestamp.
 */
export function updateAccountIban(account, iban) {
  const normalized = normalizeIban(iban);
  AppLogger.log('KONTO IBAN AKTUALISIERT', { id: account.id, iban: normalized });
  return { ...account, iban: normalized, updatedAt: new Date().toISOString() };
}

/**
 * Determines whether an account may be deleted: the default account is
 * never deletable, and accounts with assigned transactions are protected.
 */
export function canDeleteAccount(accountId, transactions) {
  if (accountId === DEFAULT_ACCOUNT_ID) return false;
  return !transactions.some((t) => t.accountId === accountId);
}
