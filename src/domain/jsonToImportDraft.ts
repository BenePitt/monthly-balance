import { isDuplicateTransaction } from './duplicateDetection';
import type { ImportDraft, Transaction } from '../types';

export interface RawImportTransaction {
  date: string;
  type: string;
  amount: string | number;
  purpose: string;
  category: string;
  partner: string;
  recurrence: string;
}

export interface JsonToImportDraftResult {
  drafts: ImportDraft[];
  originalById: Map<string, RawImportTransaction>;
}

export function jsonToImportDraft(
  transactions: RawImportTransaction[],
  existingTransactions: Transaction[]
): JsonToImportDraftResult {
  const originalById = new Map<string, RawImportTransaction>();

  const drafts = transactions.map((transaction, index) => {
    const importId = `json-${index}`;
    originalById.set(importId, transaction);
    const isDuplicate = isDuplicateTransaction(transaction, existingTransactions);

    return {
      importId,
      sourceRow: index + 1,
      date: transaction.date,
      type: transaction.type,
      amount: transaction.amount,
      purpose: transaction.purpose,
      category: transaction.category,
      partner: transaction.partner,
      recurrence: transaction.recurrence,
      isDuplicate,
      debugInfo: isDuplicate
        ? `Bereits vorhanden (identische Buchung am ${transaction.date}).`
        : 'Aus Datei übernommen.',
    };
  });

  return { drafts, originalById };
}
