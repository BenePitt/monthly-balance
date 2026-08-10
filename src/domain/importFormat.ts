export interface DetectImportFormatOptions {
  fileName?: string | null;
  text?: string;
}

export function detectImportFormat({ fileName = null, text = '' }: DetectImportFormatOptions = {}):
  'json' | 'csv' | null {
  if (fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.json')) return 'json';
    if (lower.endsWith('.csv')) return 'csv';
  }

  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Sieht wie JSON aus, ist aber keins gueltiges -> als CSV interpretieren
    }
  }

  return 'csv';
}
