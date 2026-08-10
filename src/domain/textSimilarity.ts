export function levenshteinDistance(a: string, b: string): number {
  const s = String(a || '');
  const t = String(b || '');
  const m = s.length;
  const n = t.length;

  if (m === 0) return n;
  if (n === 0) return m;

  let previousRow = Array.from({ length: n + 1 }, (_, i) => i);
  let currentRow = new Array(n + 1);

  for (let i = 1; i <= m; i += 1) {
    currentRow[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        previousRow[j] + 1,
        currentRow[j - 1] + 1,
        previousRow[j - 1] + cost
      );
    }
    [previousRow, currentRow] = [currentRow, previousRow];
  }

  return previousRow[n];
}

export function relativeLevenshteinDistance(a: string, b: string): number {
  const s = String(a || '');
  const t = String(b || '');
  const maxLen = Math.max(s.length, t.length);
  if (maxLen === 0) return 0;
  return levenshteinDistance(s, t) / maxLen;
}
