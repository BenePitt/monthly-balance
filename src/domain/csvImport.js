import { AppLogger } from '../utils/AppLogger';

const REQUIRED_COLUMNS = {
  date: ['buchungstag'],
  bookingText: ['buchungstext'],
  amount: ['umsatzineur', 'umsatz'],
};

export const DEFAULT_IMPORT_CATEGORY = 'Sonstiges';
export const DEFAULT_IMPORT_PARTNER = 'Unbekannt';

const PUBLIC_PARTNER_RULES = [
  { partner: 'Amazon', category: 'Onlinehandel', keywords: ['amazon', 'amzn'] },
  { partner: 'PayPal', category: 'Online-Zahlung', keywords: ['paypal'] },
  { partner: 'Edeka', category: 'Lebensmittel', keywords: ['edeka'] },
  { partner: 'REWE', category: 'Lebensmittel', keywords: ['rewe'] },
  { partner: 'Aldi', category: 'Lebensmittel', keywords: ['aldi'] },
  { partner: 'Lidl', category: 'Lebensmittel', keywords: ['lidl'] },
  { partner: 'Penny', category: 'Lebensmittel', keywords: ['penny'] },
  { partner: 'Netto', category: 'Lebensmittel', keywords: ['netto'] },
  { partner: 'Kaufland', category: 'Lebensmittel', keywords: ['kaufland'] },
  { partner: 'dm', category: 'Drogerie', keywords: [/\bdm\b/, 'dm-drogerie'] },
  { partner: 'Rossmann', category: 'Drogerie', keywords: ['rossmann'] },
  { partner: 'IKEA', category: 'Haushalt', keywords: ['ikea'] },
  { partner: 'Zalando', category: 'Kleidung', keywords: ['zalando'] },
  { partner: 'Klarna', category: 'Online-Zahlung', keywords: ['klarna'] },
  { partner: 'eBay', category: 'Onlinehandel', keywords: ['ebay'] },
  { partner: 'MediaMarkt', category: 'Elektronik', keywords: ['mediamarkt', 'media markt'] },
  { partner: 'Saturn', category: 'Elektronik', keywords: ['saturn'] },
  { partner: 'Apple', category: 'Digitales', keywords: ['apple'] },
  { partner: 'Google', category: 'Digitales', keywords: ['google'] },
  { partner: 'Microsoft', category: 'Digitales', keywords: ['microsoft', 'xbox'] },
  { partner: 'Netflix', category: 'Freizeit', keywords: ['netflix'] },
  { partner: 'Spotify', category: 'Freizeit', keywords: ['spotify'] },
  { partner: 'Disney+', category: 'Freizeit', keywords: ['disney'] },
  { partner: 'Steam', category: 'Freizeit', keywords: ['steam'] },
  { partner: 'Nintendo', category: 'Freizeit', keywords: ['nintendo'] },
  { partner: 'PlayStation', category: 'Freizeit', keywords: ['playstation', 'sony interactive'] },
  { partner: 'Lieferando', category: 'Restaurant', keywords: ['lieferando'] },
  { partner: "McDonald's", category: 'Restaurant', keywords: ['mcdonald', 'mcdonalds'] },
  { partner: 'Burger King', category: 'Restaurant', keywords: ['burger king'] },
  { partner: 'Deutsche Bahn', category: 'Mobilitaet', keywords: ['deutsche bahn', /\bdb\b/] },
  { partner: 'BVG', category: 'Mobilitaet', keywords: [/\bbvg\b/] },
  { partner: 'Uber', category: 'Mobilitaet', keywords: ['uber'] },
  { partner: 'Bolt', category: 'Mobilitaet', keywords: [/\bbolt\b/] },
  { partner: 'Shell', category: 'Mobilitaet', keywords: ['shell'] },
  { partner: 'Aral', category: 'Mobilitaet', keywords: ['aral'] },
  { partner: 'Esso', category: 'Mobilitaet', keywords: ['esso'] },
  { partner: 'TotalEnergies', category: 'Mobilitaet', keywords: ['totalenergies', 'total energies'] },
  { partner: 'Telekom', category: 'Telekommunikation', keywords: ['telekom'] },
  { partner: 'Vodafone', category: 'Telekommunikation', keywords: ['vodafone'] },
  { partner: 'O2', category: 'Telekommunikation', keywords: [/\bo2\b/, 'telefonica'] },
];

const GENERIC_RULES = [
  { partner: 'Arbeitgeber', category: 'Gehalt', type: 'income', keywords: ['gehalt', 'lohn', 'salary'] },
  { partner: 'Vermieter', category: 'Wohnen', keywords: ['miete', 'vermieter'] },
  { partner: 'Stadtwerke', category: 'Nebenkosten', keywords: ['stadtwerke', 'strom', 'gasabschlag'] },
  { partner: 'Versicherung', category: 'Versicherung', keywords: ['versicherung'] },
  { partner: 'Finanzamt', category: 'Steuern', keywords: ['finanzamt', 'steuer'] },
  { partner: 'Bank', category: 'Bankgebuehren', keywords: ['kontofuehrung', 'kontofuehrungsentgelt', 'gebuehr'] },
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase();
}

function normalizeHeader(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function matchesKeyword(text, keyword) {
  if (keyword instanceof RegExp) return keyword.test(text);
  return text.includes(normalizeText(keyword));
}

// Parses the structured booking text format used by comdirect and similar banks:
// "Auftraggeber: NAME Buchungstext: CONTENT Ref. ..."
// "Empfänger: NAME Kto/IBAN: ... Buchungstext: CONTENT Ref. ..."
// "Buchungstext: CONTENT Ref. ..."
function extractBookingParts(rawText) {
  const text = String(rawText || '');

  // Counterparty: after "Auftraggeber:" or "Empf...:" — stop before "Buchungstext:", "Kto/", "BLZ/", "Ref."
  const cpMatch = text.match(
    /(?:Auftraggeber|Empf[^:]{0,12})\s*:\s*(.+?)(?=\s*(?:Buchungstext\s*:|Kto\/|BLZ\/|Ref\.)|$)/i
  );
  const counterparty = cpMatch ? cpMatch[1].trim() : '';

  // Booking content: after "Buchungstext:" — stop before "Ref."
  const bcMatch = text.match(/Buchungstext\s*:\s*(.+?)(?=\s*Ref\.|$)/i);
  const bookingContent = bcMatch ? bcMatch[1].trim() : '';

  return { counterparty, bookingContent };
}

const LEARNED_STOP_WORDS = new Set([
  'gmbh', 'kgaa', 'bank', 'kauf', 'zahlung', 'auftrag', 'euro', 'eur',
  'lastschrift', 'ueberweisung', 'datum', 'referenz', 'abschluss',
  'sepa', 'iban', 'bic', 'mandat', 'gutschrift', 'eingang',
  // structural field-label prefixes embedded in bank booking texts
  'auftraggeber', 'buchungstext', 'empfanger', 'empfaenger',
  'kartenzahlung', 'bargeldauszahlung', 'kreditkarte', 'debitkarte',
  // encoding artifact: "Empfänger" corrupted to "Empf???" → tokenizes to "empf"
  'empf',
]);

const DEFAULT_VALUES = new Set(['', 'Sonstiges', 'Unbekannt']);

export function buildLearnedRules(transactions) {
  const rulesMap = new Map();
  const wordCombos = new Map(); // word → Set of "category|partner" combos it appears in

  for (const tx of transactions) {
    if (DEFAULT_VALUES.has(tx.category) && DEFAULT_VALUES.has(tx.partner)) continue;
    if (!tx.purpose) continue;

    const key = `${tx.category}|${tx.partner}`;
    const { counterparty, bookingContent } = extractBookingParts(tx.purpose);

    // For structured bank texts: learn from counterparty name + booking content.
    // For plain text (manually entered): learn from the full purpose.
    const sourceText = (counterparty || bookingContent)
      ? [counterparty, bookingContent].filter(Boolean).join(' ')
      : tx.purpose;

    const words = normalizeText(sourceText)
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .filter((w) => w.length >= 4 && !LEARNED_STOP_WORDS.has(w) && !/^\d+$/.test(w));

    if (words.length === 0) continue;

    if (!rulesMap.has(key)) {
      rulesMap.set(key, { category: tx.category, partner: tx.partner, keywords: new Set() });
    }
    for (const w of words) {
      rulesMap.get(key).keywords.add(w);
      if (!wordCombos.has(w)) wordCombos.set(w, new Set());
      wordCombos.get(w).add(key);
    }
  }

  // Only keep keywords that uniquely identify one category/partner combination.
  // Words appearing across multiple combos are unreliable and are excluded from all rules.
  return [...rulesMap.values()]
    .map(({ category, partner, keywords }) => ({
      category,
      partner,
      keywords: [...keywords].filter((w) => wordCombos.get(w)?.size === 1),
    }))
    .filter((rule) => rule.keywords.length > 0);
}

export function inferTransactionMetadata(bookingText, type = 'expense', learnedRules = []) {
  const { counterparty, bookingContent } = extractBookingParts(bookingText);
  const allRules = [...learnedRules, ...PUBLIC_PARTNER_RULES, ...GENERIC_RULES];

  function findRule(text) {
    if (!text) return null;
    const norm = normalizeText(text);
    return allRules.find((c) => {
      if (c.type && c.type !== type) return false;
      return c.keywords.some((kw) => matchesKeyword(norm, kw));
    }) ?? null;
  }

  // 1. Match on counterparty name (most precise: who sent/received the money)
  // 2. Match on booking content (what the payment is for → category)
  // 3. Fallback: full text (unstructured/manual entries)
  const rule = findRule(counterparty) ?? findRule(bookingContent) ?? findRule(bookingText);

  return {
    category: rule?.category || '',
    partner: rule?.partner || '',
    matchedRule: rule?.partner || null,
  };
}

export function parseCsvRows(text, delimiter = ';') {
  const normalizedText = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < normalizedText.length; i += 1) {
    const char = normalizedText[i];
    const next = normalizedText[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }

  return rows;
}

function findColumnIndex(normalizedHeader, aliases) {
  return normalizedHeader.findIndex((column) => aliases.includes(column));
}

function findHeader(rows) {
  for (let index = 0; index < rows.length; index += 1) {
    const normalizedHeader = rows[index].map(normalizeHeader);
    const columnIndexes = {
      date: findColumnIndex(normalizedHeader, REQUIRED_COLUMNS.date),
      bookingText: findColumnIndex(normalizedHeader, REQUIRED_COLUMNS.bookingText),
      amount: findColumnIndex(normalizedHeader, REQUIRED_COLUMNS.amount),
    };

    if (Object.values(columnIndexes).every((columnIndex) => columnIndex >= 0)) {
      return { headerIndex: index, columnIndexes };
    }
  }

  return null;
}

function parseBankDate(value) {
  const trimmed = String(value || '').trim();
  const germanDate = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (germanDate) {
    const [, day, month, year] = germanDate;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return '';
}

function parseGermanAmount(value) {
  const normalized = String(value || '')
    .replace(/eur/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function readCell(row, index) {
  return String(row[index] || '').trim();
}

export function parseBankCsv(text, { fillUnknowns = true, existingTransactions = [], debug = false, fileName = null } = {}) {
  const learnedRules = buildLearnedRules(existingTransactions);
  const rows = parseCsvRows(text);
  const header = findHeader(rows);
  const warnings = [];
  const debugLog = [];

  AppLogger.log('CSV-IMPORT GESTARTET', {
    fileName,
    mode: fillUnknowns ? 'auto' : 'manuell',
    rows: rows.length,
    learnedRules: learnedRules.length,
  });

  if (debug) {
    debugLog.push('=== CSV Import Debug Log ===');
    debugLog.push(`Zeitstempel: ${new Date().toISOString()}`);
    debugLog.push(`Vorhandene Transaktionen: ${existingTransactions.length}`);
    debugLog.push('');
    debugLog.push(`--- Gelernte Regeln (${learnedRules.length}) ---`);
    if (learnedRules.length === 0) {
      debugLog.push('  (keine — alle vorhandenen Transaktionen haben Standard-Kategorie/Partner)');
    } else {
      learnedRules.forEach((r, i) => {
        debugLog.push(`[${i + 1}] ${r.category} / ${r.partner} → Keywords: ${r.keywords.join(', ')}`);
      });
    }
    debugLog.push('');
    debugLog.push(`--- Öffentliche Regeln: ${PUBLIC_PARTNER_RULES.length} | Generische Regeln: ${GENERIC_RULES.length} ---`);
    debugLog.push('');
    debugLog.push('--- Zeilenanalyse ---');
  }

  if (!header) {
    return {
      transactions: [],
      warnings: ['Keine passende CSV-Kopfzeile gefunden. Erwartet werden Buchungstag, Buchungstext und Umsatz in EUR.'],
      debugLog,
    };
  }

  const transactions = [];
  const { columnIndexes, headerIndex } = header;

  const allRulesWithSource = debug ? [
    ...learnedRules.map((r) => ({ ...r, _source: 'gelernt' })),
    ...PUBLIC_PARTNER_RULES.map((r) => ({ ...r, _source: 'öffentlich' })),
    ...GENERIC_RULES.map((r) => ({ ...r, _source: 'generisch' })),
  ] : null;

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const rawDate = readCell(row, columnIndexes.date);
    const purpose = readCell(row, columnIndexes.bookingText);
    const rawAmount = readCell(row, columnIndexes.amount);

    if (!rawDate && !purpose && !rawAmount) continue;

    const date = parseBankDate(rawDate);
    const signedAmount = parseGermanAmount(rawAmount);

    if (!date || signedAmount === null || signedAmount === 0 || !purpose) {
      warnings.push(`Zeile ${rowIndex + 1} wurde uebersprungen, weil Datum, Buchungstext oder Betrag fehlen.`);
      if (debug) debugLog.push(`\nZeile ${rowIndex + 1} | übersprungen (Datum, Betrag oder Buchungstext fehlt)`);
      continue;
    }

    const type = signedAmount < 0 ? 'expense' : 'income';
    const inferred = inferTransactionMetadata(purpose, type, learnedRules);
    const category = inferred.category || (fillUnknowns ? DEFAULT_IMPORT_CATEGORY : '');
    const partner = inferred.partner || (fillUnknowns ? DEFAULT_IMPORT_PARTNER : '');

    if (debug) {
      const { counterparty, bookingContent } = extractBookingParts(purpose);
      debugLog.push('');
      debugLog.push(`Zeile ${rowIndex + 1} | "${purpose}"`);
      if (counterparty) debugLog.push(`  Auftraggeber/Empfänger: "${counterparty}"`);
      if (bookingContent) debugLog.push(`  Buchungstext: "${bookingContent}"`);
      debugLog.push(`  Typ: ${type === 'income' ? 'Einnahme' : 'Ausgabe'}`);

      let matchSource = null;
      let matchedKeyword = null;
      let matchPart = null;

      const parts = [
        { label: 'Auftraggeber', text: counterparty },
        { label: 'Buchungstext', text: bookingContent },
        { label: 'Volltext', text: purpose },
      ];

      for (const { label, text } of parts) {
        if (!text) continue;
        const norm = normalizeText(text);
        const matched = allRulesWithSource.find((c) => {
          if (c.type && c.type !== type) return false;
          return c.keywords.some((kw) => matchesKeyword(norm, kw));
        });
        if (matched) {
          matchSource = matched._source;
          matchedKeyword = matched.keywords.find((kw) => matchesKeyword(norm, kw));
          matchPart = label;
          debugLog.push(`  → MATCH via ${label} (${matched._source}): ${matched.category} / ${matched.partner} | Keyword: "${matchedKeyword}"`);
          break;
        }
      }
      if (!matchSource) {
        debugLog.push(`  → Kein Match → Fallback: ${fillUnknowns ? `${DEFAULT_IMPORT_CATEGORY} / ${DEFAULT_IMPORT_PARTNER}` : 'leer'}`);
      }
      debugLog.push(`  Ergebnis: Kategorie=${category}, Partner=${partner}`);

      AppLogger.log('CSV-ZEILE', {
        row: rowIndex + 1,
        purpose,
        category,
        partner,
        matchSource,
        matchedKeyword,
        matchPart,
      });
    }

    transactions.push({
      sourceRow: rowIndex + 1,
      date,
      type,
      amount: Math.abs(signedAmount),
      purpose,
      category,
      partner,
      recurrence: 'once',
      matchedRule: inferred.matchedRule,
    });
  }

  AppLogger.log('CSV-IMPORT FERTIG', {
    imported: transactions.length,
    skipped: warnings.length,
  });

  return { transactions, warnings, debugLog };
}

export function toTransactionFields(importDraft) {
  const fields = { ...importDraft };
  delete fields.importId;
  delete fields.sourceRow;
  delete fields.matchedRule;
  return fields;
}
