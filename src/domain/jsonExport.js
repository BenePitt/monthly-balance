export const CURRENT_VERSION = 1;

export function buildExportPayload(transactions, balanceMode, startBalance, currentBalance) {
  return {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    transactions,
    balanceSettings: {
      balanceMode,
      startBalance,
      currentBalance,
    },
  };
}

export function sanitizeTransaction(raw) {
  const now = new Date().toISOString();
  return {
    id: raw.id,
    date: raw.date,
    type: raw.type,
    amount: raw.amount,
    purpose: raw.purpose,
    category:
      typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : 'Sonstiges',
    partner:
      typeof raw.partner === 'string' && raw.partner.trim() ? raw.partner.trim() : 'Unbekannt',
    recurrence: raw.recurrence === 'monthly' ? 'monthly' : 'once',
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : now,
  };
}

export function validateTransaction(raw) {
  const errors = [];
  if (!raw || typeof raw.id !== 'string' || !raw.id.trim()) errors.push('id fehlt');
  if (typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date))
    errors.push('Ungültiges Datum');
  if (raw.type !== 'income' && raw.type !== 'expense') errors.push('Ungültiger Typ');
  if (typeof raw.amount !== 'number' || !isFinite(raw.amount) || raw.amount <= 0)
    errors.push('Ungültiger Betrag');
  if (typeof raw.purpose !== 'string' || !raw.purpose.trim()) errors.push('Verwendungszweck fehlt');
  return { valid: errors.length === 0, errors };
}

export function sanitizeBalanceSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return { startBalance: 0, currentBalance: 0, balanceMode: 'start' };
  }
  return {
    startBalance:
      typeof raw.startBalance === 'number' && isFinite(raw.startBalance) ? raw.startBalance : 0,
    currentBalance:
      typeof raw.currentBalance === 'number' && isFinite(raw.currentBalance)
        ? raw.currentBalance
        : 0,
    balanceMode: raw.balanceMode === 'current' ? 'current' : 'start',
  };
}

export function parseImportPayload(parsed) {
  const warnings = [];

  if (Array.isArray(parsed)) {
    return { version: 0, transactions: parsed, balanceSettings: null, warnings };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      version: 0,
      transactions: [],
      balanceSettings: null,
      warnings: ['Ungültiges JSON-Format'],
    };
  }

  const version = typeof parsed.version === 'number' ? parsed.version : 0;

  if (version > CURRENT_VERSION) {
    warnings.push(
      `Datei wurde mit einer neueren Version exportiert (v${version}). Import wird trotzdem versucht.`
    );
  }

  const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  const balanceSettings = parsed.balanceSettings ?? null;

  return { version, transactions, balanceSettings, warnings };
}

export function mergeTransactions(existing, incoming) {
  const existingIds = new Set(existing.map((t) => t.id));
  const newOnes = incoming.filter((t) => !existingIds.has(t.id));
  return [...existing, ...newOnes];
}

export function applyImportMode(existing, incoming, mode) {
  if (mode === 'replace') return incoming;
  return mergeTransactions(existing, incoming);
}
