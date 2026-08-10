const MAX_ENTRIES = 2000;
const entries = [];
const sessionStart = new Date().toISOString();
let debugMode = false;

function pad(n) {
  return String(n).padStart(2, '0');
}

function timeLabel(iso) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatAmount(amount) {
  return `${Number(amount).toFixed(2).replace('.', ',')} €`;
}

function formatLine(entry) {
  const { event, data } = entry;
  const t = timeLabel(entry.timestamp);
  const label = event.padEnd(24);

  switch (event) {
    case 'TRANSAKTION ANGELEGT':
      return `[${t}] ${label}${data.source} | ${data.date} | ${data.type === 'income' ? 'Einnahme' : 'Ausgabe'} | ${formatAmount(data.amount)} | "${data.purpose}" | ${data.category} / ${data.partner}`;
    case 'TRANSAKTION AKTUALISIERT': {
      const fields = Object.entries(data.changed || {})
        .map(([k, [o, n]]) => `${k}: ${o} → ${n}`)
        .join(' | ');
      return `[${t}] ${label}${data.id.slice(0, 8)} | ${fields || '(keine Änderungen)'}`;
    }
    case 'TRANSAKTION GELÖSCHT':
      return `[${t}] ${label}${data.id.slice(0, 8)} | ${data.date} | ${formatAmount(data.amount)}`;
    case 'BATCH ANGELEGT':
      return `[${t}] ${label}${data.count} Transaktionen`;
    case 'BULK-EDIT':
      return `[${t}] ${label}${data.count} Transaktionen | ${Object.keys(data.changes || {}).join(', ')}`;
    case 'ALLE GELÖSCHT':
      return `[${t}] ${label}vorher ${data.count} Transaktionen`;
    case 'CSV-IMPORT GESTARTET':
      return `[${t}] ${label}${data.fileName || '(Text)'} | ${data.mode} | ${data.rows} Zeilen | ${data.learnedRules} gelernte Regeln`;
    case 'CSV-IMPORT FERTIG':
      return `[${t}] ${label}${data.imported} importiert, ${data.skipped} übersprungen`;
    case 'CSV-ZEILE': {
      const part = data.matchPart && data.matchPart !== 'Volltext' ? ` via ${data.matchPart}` : '';
      const src = data.matchSource
        ? `[${data.matchSource}${part}: "${data.matchedKeyword}"]`
        : '[kein Match]';
      return `[${t}] CSV-ZEILE ${String(data.row).padEnd(6)} "${data.purpose}" → ${data.category} / ${data.partner}  ${src}`;
    }
    case 'JSON-IMPORT':
      return `[${t}] ${label}${data.mode} | ${data.count} Transaktionen`;
    case 'JSON-EXPORT':
      return `[${t}] ${label}${data.count} Transaktionen`;
    case 'GESPEICHERT':
      return `[${t}] ${label}${data.count} Transaktionen | ${data.adapter} | ${data.status}`;
    case 'DEMO-DATEN':
      return `[${t}] ${label}${data.count} Transaktionen geladen`;
    default:
      return `[${t}] ${event}  ${JSON.stringify(data)}`;
  }
}

export const AppLogger = {
  setDebugMode(val) {
    debugMode = Boolean(val);
  },
  isDebugMode() {
    return debugMode;
  },

  log(event, data) {
    if (entries.length >= MAX_ENTRIES) entries.shift();
    entries.push({ timestamp: new Date().toISOString(), event, data: data ?? {} });
  },

  getCount() {
    return entries.length;
  },

  getEntries() {
    return [...entries];
  },

  clear() {
    entries.length = 0;
  },

  formatAsText() {
    const lines = ['=== Monatliche Bilanz – Anwendungslog ===', `Sitzung: ${sessionStart}`, ''];
    for (const entry of entries) {
      lines.push(formatLine(entry));
    }
    return lines.join('\n');
  },
};
