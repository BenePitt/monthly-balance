import type { Transaction } from '../types';

export interface DuplicateCandidate {
  date: string;
  purpose: string;
  type: string;
  amount: string | number;
  recurrence: string;
}

export function isDuplicateTransaction(
  candidate: DuplicateCandidate,
  existingTransactions: Transaction[]
): boolean {
  return existingTransactions.some(
    (t) =>
      t.date === candidate.date &&
      t.purpose === candidate.purpose &&
      t.type === candidate.type &&
      Number(t.amount) === Number(candidate.amount) &&
      t.recurrence === candidate.recurrence
  );
}
