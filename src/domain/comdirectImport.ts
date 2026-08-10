import type { RawImportTransaction } from './jsonToImportDraft';
import { inferCategory, DEFAULT_IMPORT_CATEGORY } from './csvImport';
import type { Transaction } from '../types';

export interface ComdirectAmount {
  value: string;
  unit: string;
}

// Per comdirect's official REST API spec ($AccountInformation), each of
// remitter/debtor/creditor carries the holder name, IBAN and BIC of that
// party. Which field is populated depends on the transaction type (SEPA
// transfer vs. direct debit) — one of them always holds the account
// holder's own data rather than the counterparty's.
export interface ComdirectParty {
  holderName?: string;
  iban?: string;
}

export interface ComdirectTransaction {
  bookingDate?: string;
  valutaDate?: string;
  amount?: ComdirectAmount;
  remittanceInfo?: string;
  transactionType?: { text?: string };
  remitter?: ComdirectParty;
  debtor?: ComdirectParty;
  creditor?: ComdirectParty;
}

function normalizeIban(iban?: string): string {
  return (iban || '').replace(/\s+/g, '').toUpperCase();
}

// Picks the transaction partner from creditor/remitter/debtor — whichever is
// present and whose IBAN does not match the account's own IBAN. Checking the
// IBAN (rather than assuming a fixed field per income/expense direction) is
// what guarantees the partner is never the account holder itself: comdirect
// fills the "self" side of a transaction into one of these same three
// fields depending on transaction type (e.g. debtor = self for a SEPA
// direct debit, creditor = self for an incoming transfer).
function partyName(transaction: ComdirectTransaction, ownIban: string): string {
  const ownIbanNormalized = normalizeIban(ownIban);
  const candidates = [transaction.creditor, transaction.remitter, transaction.debtor];

  for (const party of candidates) {
    const name = party?.holderName?.trim();
    if (!name) continue;
    const partyIban = normalizeIban(party.iban);
    if (!partyIban || partyIban !== ownIbanNormalized) {
      return name;
    }
  }
  return 'Unbekannt';
}

// Comdirect's remittanceInfo concatenates fixed SEPA purpose lines, each
// prefixed with a sequential 2-digit line number ("01", "02", "03", …) and
// right-padded with spaces, e.g. "01Hungriges Herz, Muenchen  DE       02Karte
// Nr. 1234 …". This strips those prefixes and collapses the padding. Markers
// are only removed when found in strict sequence (01, then 02, then 03, …)
// right after whitespace/start-of-string — this avoids mistaking incidental
// digit pairs (e.g. "1234" in a card number) for a line marker. Text without
// this line-number format (e.g. the transactionType fallback) passes through
// unchanged aside from whitespace collapsing.
function cleanComdirectPurpose(text: string): string {
  let result = text;
  for (let n = 1; n <= 20; n += 1) {
    const marker = String(n).padStart(2, '0');
    const next = result.replace(new RegExp(`(^|\\s)${marker}(?=\\S)`), '$1');
    // Markers are strictly sequential (01, 02, 03, …) with no gaps — if the
    // next one in sequence isn't found, stop rather than keep guessing at
    // higher numbers, which risks matching incidental digit pairs inside
    // the remaining content (e.g. "1234" in a card number, or "2026" in a
    // date) instead of a real line marker.
    if (next === result) break;
    result = next;
  }
  return result.replace(/\s+/g, ' ').trim();
}

export function mapComdirectTransaction(
  transaction: ComdirectTransaction,
  ownIban: string
): RawImportTransaction | null {
  const date = transaction.bookingDate || transaction.valutaDate;
  const rawAmount = Number(transaction.amount?.value);
  if (!date || !Number.isFinite(rawAmount) || rawAmount === 0) return null;

  const type = rawAmount < 0 ? 'expense' : 'income';

  return {
    date,
    type,
    amount: Math.abs(rawAmount),
    purpose: cleanComdirectPurpose(
      transaction.remittanceInfo?.trim() || transaction.transactionType?.text?.trim() || 'Umsatz'
    ),
    category: 'Sonstiges',
    partner: partyName(transaction, ownIban),
    recurrence: 'once',
  };
}

export function mapComdirectTransactions(
  transactions: ComdirectTransaction[],
  ownIban: string
): RawImportTransaction[] {
  return transactions
    .map((transaction) => mapComdirectTransaction(transaction, ownIban))
    .filter((t): t is RawImportTransaction => t !== null);
}

// Re-derives each transaction's category using the exact same history-based
// logic as the CSV import (`inferCategory` in domain/csvImport.js): exact
// amount/type/partner match, then closest-text match by partner, then a
// known category name found in the text, then closest text match globally —
// falling back to "Sonstiges" only when nothing qualifies. `partyName()`
// above already resolves an unmatched partner to the literal "Unbekannt",
// but category inference should treat that the same as "no partner known"
// (as the CSV path does, where the partner is still empty at this stage) —
// otherwise it would incorrectly match against other transactions that also
// happen to have partner "Unbekannt" instead of falling through to the
// text-based comparison.
export function applyCategoryInference(
  transactions: RawImportTransaction[],
  existingTransactions: Transaction[]
): RawImportTransaction[] {
  return transactions.map((transaction) => {
    const partner = transaction.partner === 'Unbekannt' ? '' : transaction.partner;
    const { category } = inferCategory(
      {
        text: transaction.purpose,
        partner,
        type: transaction.type,
        amount: Number(transaction.amount),
      },
      existingTransactions
    );
    return { ...transaction, category: category || DEFAULT_IMPORT_CATEGORY };
  });
}
