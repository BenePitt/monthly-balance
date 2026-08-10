import { useState, useMemo, useRef } from 'react';
import { parseBankCsv, toTransactionFields } from '../domain/csvImport';
import { detectImportFormat } from '../domain/importFormat';
import {
  parseImportPayload,
  sanitizeTransaction,
  validateTransaction,
  sanitizeBalanceSettings,
  applyImportMode,
} from '../domain/jsonExport';
import { jsonToImportDraft, RawImportTransaction } from '../domain/jsonToImportDraft';
import { applyCategoryInference } from '../domain/comdirectImport';
import { AppLogger } from '../utils/AppLogger';
import { Transaction, ImportDraft } from '../types';

type ImportSource = 'csv' | 'json' | 'comdirect' | null;
type BalanceSettings = {
  startBalance: number;
  currentBalance: number;
  balanceMode: 'start' | 'current';
};
type LineChartBalanceInfo = {
  balanceMode: 'start' | 'current';
  startBalance: number;
  currentBalance: number;
};

function withCsvImportIds(transactions: Omit<ImportDraft, 'importId'>[]): ImportDraft[] {
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
  'Bankgebuehren',
  'Digitales',
  'Drogerie',
  'Elektronik',
  'Freizeit',
  'Gehalt',
  'Haushalt',
  'Kleidung',
  'Lebensmittel',
  'Mobilitaet',
  'Nebenkosten',
  'Online-Zahlung',
  'Onlinehandel',
  'Restaurant',
  'Sonstiges',
  'Steuern',
  'Telekommunikation',
  'Versicherung',
  'Wohnen',
];

const DEFAULT_PARTNERS = [
  'Amazon',
  'Arbeitgeber',
  'Bank',
  'Edeka',
  'PayPal',
  'Unbekannt',
  'Vermieter',
];

export function useImportState(existingTransactions: Transaction[], onImportDone?: () => void) {
  const [source, setSource] = useState<ImportSource>(null);
  const [pastedText, setPastedText] = useState('');
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
  const [pendingBalanceSettings, setPendingBalanceSettings] = useState<BalanceSettings | null>(
    null
  );
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const originalByIdRef = useRef<Map<string, Transaction>>(new Map());

  const debugMode = AppLogger.isDebugMode();
  const duplicateCount = drafts.filter((d) => d.isDuplicate).length;

  const selectedDrafts = drafts.filter((d) => selectedIds.includes(d.importId));
  const missingMetadataCount = selectedDrafts.filter(
    (d) => !d.category.toString().trim() || !d.partner.toString().trim()
  ).length;
  const invalidDraftCount = selectedDrafts.filter((d) => !isValidDraft(d)).length;
  const canImport = selectedDrafts.length > 0 && invalidDraftCount === 0 && !isImporting;

  const suggestedCategories = useMemo(
    () =>
      uniqueSorted([
        ...existingTransactions.map((t) => t.category),
        ...drafts.map((d) => d.category as string),
        ...DEFAULT_CATEGORIES,
      ]),
    [existingTransactions, drafts]
  );

  const suggestedPartners = useMemo(
    () =>
      uniqueSorted([
        ...existingTransactions.map((t) => t.partner),
        ...drafts.map((d) => d.partner as string),
        ...DEFAULT_PARTNERS,
      ]),
    [existingTransactions, drafts]
  );

  function resetPendingState() {
    setError('');
    setWarnings([]);
    setSuccessMessage('');
    setPendingBalanceSettings(null);
    setImportMode('merge');
    originalByIdRef.current = new Map();
  }

  function parseCsvText(text: string, nextMode: 'auto' | 'manual') {
    const result = parseBankCsv(text, {
      fillUnknowns: nextMode === 'auto',
      existingTransactions,
      debug: AppLogger.isDebugMode(),
      fileName,
    });
    const nextDrafts = withCsvImportIds(result.transactions);
    setDrafts(nextDrafts);
    setWarnings(result.warnings);
    setSelectedIds(nextDrafts.filter((d) => !d.isDuplicate).map((d) => d.importId));
    setBulkCategory('');
    setBulkPartner('');
    setError(
      result.transactions.length === 0 ? 'Keine importierbaren Transaktionen gefunden.' : ''
    );
  }

  function parseJsonText(text: string) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError('Datei konnte nicht gelesen werden. Bitte eine gültige JSON-Datei auswählen.');
      setDrafts([]);
      return;
    }

    const {
      transactions: rawTxs,
      balanceSettings: rawSettings,
      warnings: parseWarnings,
    } = parseImportPayload(parsed);

    const allWarnings = [...parseWarnings];
    const validTxs: Transaction[] = [];
    let skipped = 0;

    for (const raw of rawTxs) {
      const sanitized = sanitizeTransaction(raw);
      const { valid } = validateTransaction(sanitized);
      if (valid) {
        validTxs.push(sanitized);
      } else {
        skipped++;
      }
    }

    if (skipped > 0) {
      allWarnings.push(`${skipped} Transaktion(en) übersprungen (ungültige Pflichtfelder).`);
    }

    if (validTxs.length === 0) {
      setError('Keine gültigen Transaktionen in der Datei gefunden.');
      setDrafts([]);
      return;
    }

    const { drafts: nextDrafts, originalById } = jsonToImportDraft(validTxs, existingTransactions);
    originalByIdRef.current = originalById;

    setDrafts(nextDrafts);
    setWarnings(allWarnings);
    setSelectedIds(nextDrafts.filter((d) => !d.isDuplicate).map((d) => d.importId));
    setBulkCategory('');
    setBulkPartner('');
    setPendingBalanceSettings(rawSettings ? sanitizeBalanceSettings(rawSettings) : null);
  }

  function processText(text: string, sourceFileName: string | null) {
    resetPendingState();
    const format = detectImportFormat({ fileName: sourceFileName, text });

    if (format === 'json') {
      setSource('json');
      parseJsonText(text);
    } else if (format === 'csv') {
      setSource('csv');
      setRawCsv(text);
      parseCsvText(text, mode);
    } else {
      setError('Datei konnte nicht erkannt werden (.csv oder .json erwartet).');
      setDrafts([]);
    }
  }

  function handleModeChange(nextMode: 'auto' | 'manual') {
    setMode(nextMode);
    if (source === 'csv' && rawCsv) parseCsvText(rawCsv, nextMode);
  }

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      processText(text, file.name);
    };
    reader.onerror = () => {
      setError('Die Datei konnte nicht gelesen werden.');
      setDrafts([]);
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFile(file);
  }

  function handleTextInput(text: string) {
    if (!text.trim()) return;
    setFileName('');
    processText(text, null);
  }

  function handleComdirectImport(transactions: RawImportTransaction[]) {
    resetPendingState();
    setFileName('');
    setSource('comdirect');

    if (transactions.length === 0) {
      setError('Keine Umsätze im gewählten Zeitraum gefunden.');
      setDrafts([]);
      return;
    }

    const categorized = applyCategoryInference(transactions, existingTransactions);
    const { drafts: nextDrafts, originalById } = jsonToImportDraft(
      categorized,
      existingTransactions
    );
    originalByIdRef.current = originalById;

    setDrafts(nextDrafts);
    setSelectedIds(nextDrafts.filter((d) => !d.isDuplicate).map((d) => d.importId));
    setBulkCategory('');
    setBulkPartner('');
  }

  function updateDraft(importId: string, changes: Partial<ImportDraft>) {
    setDrafts((prev) => prev.map((d) => (d.importId === importId ? { ...d, ...changes } : d)));
  }

  function toggleSelected(importId: string) {
    setSelectedIds((prev) =>
      prev.includes(importId) ? prev.filter((id) => id !== importId) : [...prev, importId]
    );
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
    setDrafts((prev) =>
      prev.map((d) => {
        if (!selected.has(d.importId)) return d;
        return {
          ...d,
          category: bulkCategory.trim() || d.category,
          partner: bulkPartner.trim() || d.partner,
        };
      })
    );
  }

  async function handleImport(
    importTransactionsFn: (fields: object[]) => Promise<void>,
    importAllDataFn: (
      data: { transactions: Transaction[] } & LineChartBalanceInfo & { _importMode: string }
    ) => Promise<void>,
    currentBalanceInfo: LineChartBalanceInfo
  ) {
    if (!canImport) return;
    setIsImporting(true);
    setError('');
    try {
      if (source === 'json' && pendingBalanceSettings) {
        const originalById = originalByIdRef.current;
        const selectedTransactions = selectedDrafts.map((draft) => ({
          ...originalById.get(draft.importId),
          ...toTransactionFields(draft),
        })) as Transaction[];

        const finalTransactions = applyImportMode(
          existingTransactions,
          selectedTransactions,
          importMode
        );
        const balanceSettings =
          importMode === 'replace' ? pendingBalanceSettings : currentBalanceInfo;

        await importAllDataFn({
          transactions: finalTransactions,
          ...balanceSettings,
          _importMode: importMode,
        });

        const added = finalTransactions.length - existingTransactions.length;
        setSuccessMessage(
          importMode === 'merge'
            ? `${added} neue Transaktion(en) importiert.`
            : `${finalTransactions.length} Transaktion(en) importiert (alle Daten ersetzt).`
        );
      } else {
        await importTransactionsFn(selectedDrafts.map(toTransactionFields));
        setSuccessMessage(
          `${selectedDrafts.length} Transaktion${selectedDrafts.length !== 1 ? 'en' : ''} importiert.`
        );
      }
      setDrafts([]);
      setSelectedIds([]);
      setRawCsv('');
      setFileName('');
      setPastedText('');
      setSource(null);
      setPendingBalanceSettings(null);
      originalByIdRef.current = new Map();
      onImportDone?.();
    } catch {
      setError('Der Import konnte nicht gespeichert werden.');
    } finally {
      setIsImporting(false);
    }
  }

  function cancelImport() {
    setDrafts([]);
    setRawCsv('');
    setFileName('');
    setPastedText('');
    setWarnings([]);
    setError('');
    setSelectedIds([]);
    setSuccessMessage('');
    setSource(null);
    setPendingBalanceSettings(null);
    setImportMode('merge');
    originalByIdRef.current = new Map();
  }

  return {
    source,
    pastedText,
    setPastedText,
    mode,
    fileName,
    rawCsv,
    drafts,
    warnings,
    error,
    selectedIds,
    bulkCategory,
    setBulkCategory,
    bulkPartner,
    setBulkPartner,
    isImporting,
    successMessage,
    missingMetadataCount,
    invalidDraftCount,
    canImport,
    debugMode,
    duplicateCount,
    suggestedCategories,
    suggestedPartners,
    pendingBalanceSettings,
    importMode,
    setImportMode,
    handleModeChange,
    handleFile,
    handleFileChange,
    handleTextInput,
    handleComdirectImport,
    updateDraft,
    toggleSelected,
    toggleAllSelected,
    applyBulkMetadata,
    handleImport,
    cancelImport,
  };
}
