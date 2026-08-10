import { AppLogger } from '../utils/AppLogger';
import { getUniqueValues } from './filterEngine';
import { isDuplicateTransaction } from './duplicateDetection';
import { relativeLevenshteinDistance } from './textSimilarity';

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
  {
    partner: 'TotalEnergies',
    category: 'Mobilitaet',
    keywords: ['totalenergies', 'total energies'],
  },
  { partner: 'Telekom', category: 'Telekommunikation', keywords: ['telekom'] },
  { partner: 'Vodafone', category: 'Telekommunikation', keywords: ['vodafone'] },
  { partner: 'O2', category: 'Telekommunikation', keywords: [/\bo2\b/, 'telefonica'] },
];

const GENERIC_RULES = [
  {
    partner: 'Arbeitgeber',
    category: 'Gehalt',
    type: 'income',
    keywords: ['gehalt', 'lohn', 'salary'],
  },
  { partner: 'Vermieter', category: 'Wohnen', keywords: ['miete', 'vermieter'] },
  {
    partner: 'Stadtwerke',
    category: 'Nebenkosten',
    keywords: ['stadtwerke', 'strom', 'gasabschlag'],
  },
  { partner: 'Versicherung', category: 'Versicherung', keywords: ['versicherung'] },
  { partner: 'Finanzamt', category: 'Steuern', keywords: ['finanzamt', 'steuer'] },
  {
    partner: 'Bank',
    category: 'Bankgebuehren',
    keywords: ['kontofuehrung', 'kontofuehrungsentgelt', 'gebuehr'],
  },
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Checks whether `category` occurs in `normalizedText` as its own word — no
// letters directly before or after the match (digits/punctuation/spaces are
// fine as neighbors, so e.g. "Auto" still matches in "Auto2026").
function containsCategoryAsWord(normalizedText, category) {
  const normalizedCategory = normalizeText(category);
  if (!normalizedCategory) return false;
  const pattern = new RegExp(`(?<![a-z])${escapeRegExp(normalizedCategory)}(?![a-z])`);
  return pattern.test(normalizedText);
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

  // Booking content: after "Buchungstext:" — stop before "Ref." (used for
  // partner/category matching, where the reference number is just noise).
  const bcMatch = text.match(/Buchungstext\s*:\s*(.+?)(?=\s*Ref\.|$)/i);
  const bookingContent = bcMatch ? bcMatch[1].trim() : '';

  // Full booking text: everything after "Buchungstext:" through the end of
  // the string, including the reference number — used as the cleaned
  // `purpose` shown to the user, who does want to see the full text.
  const fullBcMatch = text.match(/Buchungstext\s*:\s*(.+)$/i);
  const fullBookingText = fullBcMatch ? fullBcMatch[1].trim() : '';

  return { counterparty, bookingContent, fullBookingText };
}

const LEARNED_STOP_WORDS = new Set([
  'gmbh',
  'kgaa',
  'bank',
  'kauf',
  'zahlung',
  'auftrag',
  'euro',
  'eur',
  'lastschrift',
  'ueberweisung',
  'datum',
  'referenz',
  'abschluss',
  'sepa',
  'iban',
  'bic',
  'mandat',
  'gutschrift',
  'eingang',
  // structural field-label prefixes embedded in bank booking texts
  'auftraggeber',
  'buchungstext',
  'empfanger',
  'empfaenger',
  'kartenzahlung',
  'bargeldauszahlung',
  'kreditkarte',
  'debitkarte',
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
    const sourceText =
      counterparty || bookingContent
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
    return (
      allRules.find((c) => {
        if (c.type && c.type !== type) return false;
        return c.keywords.some((kw) => matchesKeyword(norm, kw));
      }) ?? null
    );
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

function getComparableText(purpose) {
  const { bookingContent } = extractBookingParts(purpose);
  return bookingContent || purpose || '';
}

function findKeywordRule(text, type, allRules) {
  if (!text) return null;
  const norm = normalizeText(text);
  return (
    allRules.find((c) => {
      if (c.type && c.type !== type) return false;
      return c.keywords.some((kw) => matchesKeyword(norm, kw));
    }) ?? null
  );
}

function pickMostRecent(transactions) {
  return transactions.slice().sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || a.date).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || b.date).getTime();
    return bTime - aTime;
  })[0];
}

// Finds the transaction whose comparable text is closest (lowest relative Levenshtein
// distance) to `text`. When `minSimilarity` is set, returns null unless the best match
// clears that similarity threshold (similarity = 1 - relative distance).
function findClosestByText(pool, text, { minSimilarity = 0 } = {}) {
  let best = null;
  let bestDistance = Infinity;
  for (const tx of pool) {
    const distance = relativeLevenshteinDistance(text, getComparableText(tx.purpose));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = tx;
    }
  }
  if (!best) return null;
  const similarity = 1 - bestDistance;
  if (similarity < minSimilarity) return null;
  return { transaction: best, similarity };
}

// Category priority: 1) exact amount+type+partner match, 2) closest text match among
// same type+partner, 3) closest text match among same partner (any type), 4) a known
// category name literally appearing in the text, 5) closest text match across all
// history if at least 70% similar, 6) empty (caller applies the "Sonstiges" fallback).
export function inferCategory({ text, partner, type, amount }, existingTransactions) {
  if (existingTransactions.length === 0) {
    return { category: '', categorySource: 'keine-historie', matchedTransaction: null };
  }

  if (partner) {
    const sameTypePartner = existingTransactions.filter(
      (t) => t.partner === partner && t.type === type
    );
    if (sameTypePartner.length > 0) {
      const exactAmountMatches = sameTypePartner.filter((t) => Number(t.amount) === amount);
      if (exactAmountMatches.length > 0) {
        const match = pickMostRecent(exactAmountMatches);
        return {
          category: match.category,
          categorySource: 'exakter-treffer',
          matchedTransaction: match,
        };
      }
      const closest = findClosestByText(sameTypePartner, text);
      return {
        category: closest.transaction.category,
        categorySource: 'levenshtein-typ-partner',
        matchedTransaction: closest.transaction,
        similarity: closest.similarity,
      };
    }

    const samePartner = existingTransactions.filter((t) => t.partner === partner);
    if (samePartner.length > 0) {
      const closest = findClosestByText(samePartner, text);
      return {
        category: closest.transaction.category,
        categorySource: 'levenshtein-partner',
        matchedTransaction: closest.transaction,
        similarity: closest.similarity,
      };
    }
  }

  const knownCategories = getUniqueValues(existingTransactions, 'category');
  const normalizedText = normalizeText(text);
  const categoriesByLengthDesc = [...knownCategories].sort((a, b) => b.length - a.length);
  const substringMatch = categoriesByLengthDesc.find((cat) =>
    containsCategoryAsWord(normalizedText, cat)
  );
  if (substringMatch) {
    return {
      category: substringMatch,
      categorySource: 'kategorie-im-text',
      matchedTransaction: null,
    };
  }

  const globalClosest = findClosestByText(existingTransactions, text, { minSimilarity: 0.7 });
  if (globalClosest) {
    return {
      category: globalClosest.transaction.category,
      categorySource: 'levenshtein-global',
      matchedTransaction: globalClosest.transaction,
      similarity: globalClosest.similarity,
    };
  }

  return { category: '', categorySource: 'sonstiges-kein-treffer', matchedTransaction: null };
}

const PARTNER_SOURCE_TEXT = {
  auftraggeber: 'Partner aus "Auftraggeber:"-Feld übernommen.',
  'keyword-regel': 'Partner über Keyword-Regel erkannt.',
  'kein-treffer': 'Kein Partner erkannt.',
};

function buildDebugReason({
  partner,
  partnerSource,
  categorySource,
  matchedTransaction,
  similarity,
}) {
  const partnerText = partner
    ? `${PARTNER_SOURCE_TEXT[partnerSource]} ("${partner}")`
    : PARTNER_SOURCE_TEXT[partnerSource];

  const similarityPct = similarity != null ? `${Math.round(similarity * 100)}%` : null;
  const categoryTextMap = {
    'exakter-treffer': `Kategorie von identischer Buchung (gleicher Betrag/Typ/Partner) übernommen: "${matchedTransaction?.purpose}".`,
    'levenshtein-typ-partner': `Kategorie von ähnlichster Buchung mit gleichem Typ+Partner übernommen (Ähnlichkeit ${similarityPct}): "${matchedTransaction?.purpose}".`,
    'levenshtein-partner': `Kategorie von ähnlichster Buchung mit gleichem Partner übernommen (Ähnlichkeit ${similarityPct}): "${matchedTransaction?.purpose}".`,
    'kategorie-im-text': 'Kategorie-Name im Buchungstext gefunden.',
    'levenshtein-global': `Kategorie von global ähnlichster Buchung übernommen (Ähnlichkeit ${similarityPct}): "${matchedTransaction?.purpose}".`,
    'sonstiges-kein-treffer':
      'Keine ausreichend ähnliche Buchung gefunden (unter 70% Ähnlichkeit) → "Sonstiges".',
    'keine-historie': 'Keine bestehenden Transaktionen zum Vergleich vorhanden → "Sonstiges".',
  };

  return `${partnerText} ${categoryTextMap[categorySource]}`;
}

// Rework of the CSV metadata inference: the partner comes directly from the
// "Auftraggeber:"/"Buchungstext:" structure when present (keyword rules are only a
// fallback for unstructured texts), and the category is derived from the user's own
// transaction history (see `inferCategory`) instead of a fixed keyword→category list.
export function inferImportMetadata({
  bookingText,
  type = 'expense',
  amount = 0,
  existingTransactions = [],
  learnedRules = [],
  debug = false,
}) {
  const { counterparty, bookingContent } = extractBookingParts(bookingText);
  const comparableText = bookingContent || bookingText || '';

  let partner = '';
  let partnerSource = 'kein-treffer';

  if (counterparty) {
    partner = counterparty;
    partnerSource = 'auftraggeber';
  } else {
    const allRules = [...learnedRules, ...PUBLIC_PARTNER_RULES, ...GENERIC_RULES];
    const rule =
      findKeywordRule(bookingContent, type, allRules) ??
      findKeywordRule(bookingText, type, allRules);
    if (rule) {
      partner = rule.partner;
      partnerSource = 'keyword-regel';
    }
  }

  const { category, categorySource, matchedTransaction, similarity } = inferCategory(
    { text: comparableText, partner, type, amount },
    existingTransactions
  );

  const debugReason = debug
    ? buildDebugReason({ partner, partnerSource, categorySource, matchedTransaction, similarity })
    : null;

  return { partner, category, partnerSource, categorySource, debugReason };
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

export function parseBankCsv(
  text,
  { fillUnknowns = true, existingTransactions = [], debug = false, fileName = null } = {}
) {
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
        debugLog.push(
          `[${i + 1}] ${r.category} / ${r.partner} → Keywords: ${r.keywords.join(', ')}`
        );
      });
    }
    debugLog.push('');
    debugLog.push(
      `--- Öffentliche Regeln: ${PUBLIC_PARTNER_RULES.length} | Generische Regeln: ${GENERIC_RULES.length} ---`
    );
    debugLog.push('');
    debugLog.push('--- Zeilenanalyse ---');
  }

  if (!header) {
    return {
      transactions: [],
      warnings: [
        'Keine passende CSV-Kopfzeile gefunden. Erwartet werden Buchungstag, Buchungstext und Umsatz in EUR.',
      ],
      debugLog,
    };
  }

  const transactions = [];
  const { columnIndexes, headerIndex } = header;

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const rawDate = readCell(row, columnIndexes.date);
    const rawPurpose = readCell(row, columnIndexes.bookingText);
    const rawAmount = readCell(row, columnIndexes.amount);

    if (!rawDate && !rawPurpose && !rawAmount) continue;

    const date = parseBankDate(rawDate);
    const signedAmount = parseGermanAmount(rawAmount);

    if (!date || signedAmount === null || signedAmount === 0 || !rawPurpose) {
      warnings.push(
        `Zeile ${rowIndex + 1} wurde uebersprungen, weil Datum, Buchungstext oder Betrag fehlen.`
      );
      if (debug)
        debugLog.push(
          `\nZeile ${rowIndex + 1} | übersprungen (Datum, Betrag oder Buchungstext fehlt)`
        );
      continue;
    }

    const type = signedAmount < 0 ? 'expense' : 'income';
    const amount = Math.abs(signedAmount);
    const inferred = inferImportMetadata({
      bookingText: rawPurpose,
      type,
      amount,
      existingTransactions,
      learnedRules,
      debug,
    });
    const { counterparty, bookingContent, fullBookingText } = extractBookingParts(rawPurpose);
    // When the raw text has the structured "Buchungstext:"-format, show the
    // reader only the text after that label; otherwise keep the raw value.
    const purpose = fullBookingText || rawPurpose;
    const category = inferred.category || (fillUnknowns ? DEFAULT_IMPORT_CATEGORY : '');
    const partner = inferred.partner || (fillUnknowns ? DEFAULT_IMPORT_PARTNER : '');
    const isDuplicate = isDuplicateTransaction(
      { date, purpose, type, amount, recurrence: 'once' },
      existingTransactions
    );

    if (debug) {
      debugLog.push('');
      debugLog.push(`Zeile ${rowIndex + 1} | "${rawPurpose}"`);
      if (counterparty) debugLog.push(`  Auftraggeber/Empfänger: "${counterparty}"`);
      if (bookingContent) debugLog.push(`  Buchungstext: "${bookingContent}"`);
      debugLog.push(`  Typ: ${type === 'income' ? 'Einnahme' : 'Ausgabe'}`);
      debugLog.push(`  ${inferred.debugReason}`);
      debugLog.push(
        `  Ergebnis: Kategorie=${category}, Partner=${partner}${isDuplicate ? ' | DUPLIKAT' : ''}`
      );

      AppLogger.log('CSV-ZEILE', {
        row: rowIndex + 1,
        purpose,
        category,
        partner,
        partnerSource: inferred.partnerSource,
        categorySource: inferred.categorySource,
        isDuplicate,
      });
    }

    transactions.push({
      sourceRow: rowIndex + 1,
      date,
      type,
      amount,
      purpose,
      category,
      partner,
      recurrence: 'once',
      isDuplicate,
      debugInfo: inferred.debugReason,
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
  delete fields.isDuplicate;
  delete fields.debugInfo;
  return fields;
}
