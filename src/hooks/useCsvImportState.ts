import { useState, useMemo } from 'react';
import { parseBankCsv, toTransactionFields } from '../domain/csvImport';
import { Transaction } from '../types';

interface ImportDraft {
  importId: string;
  sourceRow: number;
  date: string;
  type: string;
  amount: string | number;
  purpose: string;
  category: string;
  partner: string;
  recurrence: string;
  matchedRule: string | null;
}

function withImportIds(transactions: Omit<ImportDraft, 'importId'>[]): ImportDraft[] {
  return transactions.map((transaction, index) => ({
    ...transaction,
    importId: `${transaction.sourceRow}-${index}`,
  }));
}

function uniqueSorted(values: (string | undefined | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}

export function isValidDraft(draft: ImportDraft): boolean {
  return !!(
    draft.date &&
    ['income', 'expense'].includes(draft.type) &&
    Number.isFinite(Number(draft.amount)) &&
    Number(draft.amount) > 0 &&
    String(draft.purpose).trim() &&
    String(draft.category).trim() &&
    String(draft.partner).trim() &&
    ['once', 'monthly'].includes(draft.recurrence)
  );
}

const DEFAULT_CATEGORIES = [
  'Bankgebuehren', 'Digitales', 'Drogerie', 'Elektronik', 'Freizeit',
  'Gehalt', 'Haushalt', 'Kleidung', 'Lebensmittel', 'Mobilitaet',
  'Nebenkosten', 'Online-Zahlung', 'Onlinehandel', 'Restaurant',
  'Sonstiges', 'Steuern', 'Telekommunikation', 'Versicherung', 'Wohnen',
];

const DEFAULT_PARTNERS = [
  'Amazon', 'Arbeitgeber', 'Bank', 'Edeka', 'PayPal', 'Unbekannt', 'Vermieter',
];

export function useCsvImportState(existingTransactions: Transaction[], onImportDone?: () => void) {
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [csvTextInput, setCsvTextInput] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [fileName, setFileName] = useState('');
  const [rawCsv, setRawCsv] = useState('');
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkPartner, setBulkPartner] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const missingMetadataCount = drafts.filter((d) => !d.category.toString().trim() || !d.partner.toString().trim()).length;
  const invalidDraftCount = drafts.filter((d) => !isValidDraft(d)).length;
  const canImport = drafts.length > 0 && invalidDraftCount === 0 && !isImporting;

  const suggestedCategories = useMemo(() => uniqueSorted([
    ...existingTransactions.map((t) => t.category),
    ...drafts.map((d) => d.category as string),
    ...DEFAULT_CATEGORIES,
  ]), [existingTransactions, drafts]);

  const suggestedPartners = useMemo(() => uniqueSorted([
    ...existingTransactions.map((t) => t.partner),
    ...drafts.map((d) => d.partner as string),
    ...DEFAULT_PARTNERS,
  ]), [existingTransactions, drafts]);

  function parseCsv(text: string, nextMode: 'auto' | 'manual') {
    const result = parseBankCsv(text, { fillUnknowns: nextMode === 'auto', existingTransactions });
    setDrafts(withImportIds(result.transactions));
    setWarnings(result.warnings);
    setSelectedIds([]);
    setBulkCategory('');
    setBulkPartner('');
    setSuccessMessage('');
    setError(result.transactions.length === 0 ? 'Keine importierbaren Transaktionen gefunden.' : '');
  }

  function handleModeChange(nextMode: 'auto' | 'manual') {
    setMode(nextMode);
    if (rawCsv) parseCsv(rawCsv, nextMode);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setSuccessMessage('');
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setRawCsv(text);
      parseCsv(text, mode);
    };
    reader.onerror = () => {
      setError('Die CSV-Datei konnte nicht gelesen werden.');
      setDrafts([]);
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleAnalyzeText() {
    if (!csvTextInput.trim()) return;
    setError('');
    setSuccessMessage('');
    setFileName('');
    setRawCsv(csvTextInput);
    parseCsv(csvTextInput, mode);
  }

  function updateDraft(importId: string, changes: Partial<ImportDraft>) {
    setDrafts((prev) => prev.map((d) => d.importId === importId ? { ...d, ...changes } : d));
  }

  function toggleSelected(importId: string) {
    setSelectedIds((prev) => prev.includes(importId) ? prev.filter((id) => id !== importId) : [...prev, importId]);
  }

  function toggleAllSelected() {
    if (selectedIds.length === drafts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(drafts.map((d) => d.importId));
    }
  }

  function applyBulkMetadata() {
    const selected = new Set(selectedIds);
    setDrafts((prev) => prev.map((d) => {
      if (!selected.has(d.importId)) return d;
      return {
        ...d,
        category: bulkCategory.trim() || d.category,
        partner: bulkPartner.trim() || d.partner,
      };
    }));
  }

  async function handleImport(importFn: (fields: object[]) => Promise<void>) {
    if (!canImport) return;
    setIsImporting(true);
    setError('');
    try {
      await importFn(drafts.map(toTransactionFields));
      setSuccessMessage(`${drafts.length} Transaktion${drafts.length !== 1 ? 'en' : ''} importiert.`);
      setDrafts([]);
      setSelectedIds([]);
      setRawCsv('');
      setFileName('');
      setCsvTextInput('');
      onImportDone?.();
    } catch {
      setError('Der Import konnte nicht gespeichert werden.');
    } finally {
      setIsImporting(false);
    }
  }

  return {
    inputMode, setInputMode,
    csvTextInput, setCsvTextInput,
    mode,
    fileName,
    rawCsv,
    drafts,
    warnings,
    error,
    selectedIds,
    bulkCategory, setBulkCategory,
    bulkPartner, setBulkPartner,
    isImporting,
    successMessage,
    missingMetadataCount,
    invalidDraftCount,
    canImport,
    suggestedCategories,
    suggestedPartners,
    handleModeChange,
    handleFileChange,
    handleAnalyzeText,
    updateDraft,
    toggleSelected,
    toggleAllSelected,
    applyBulkMetadata,
    handleImport,
  };
}
