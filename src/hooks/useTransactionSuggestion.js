import { useMemo, useEffect, useState } from 'react';
import { buildLearnedRules, inferTransactionMetadata } from '../domain/csvImport';

export function useTransactionSuggestion(purpose, type, existingTransactions) {
  const learnedRules = useMemo(
    () => buildLearnedRules(existingTransactions),
    [existingTransactions]
  );

  const [suggestion, setSuggestion] = useState({ category: '', partner: '' });

  useEffect(() => {
    if (!purpose || !purpose.trim()) {
      setSuggestion({ category: '', partner: '' });
      return;
    }
    const inferred = inferTransactionMetadata(purpose, type || 'expense', learnedRules);
    setSuggestion({ category: inferred.category || '', partner: inferred.partner || '' });
  }, [purpose, type, learnedRules]);

  return suggestion;
}
