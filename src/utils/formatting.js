const MONTH_NAMES_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const MONTH_NAMES_SHORT_DE = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

/**
 * Formats a number as German Euro currency string.
 * Example: 1234.56 → "1.234,56 €"
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats an ISO date string "YYYY-MM-DD" to German format "DD.MM.YYYY".
 */
export function formatDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

/**
 * Parses a German date "DD.MM.YYYY" to ISO "YYYY-MM-DD".
 */
export function parseGermanDate(germanDate) {
  if (!germanDate) return '';
  const [day, month, year] = germanDate.split('.');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Formats year and month (1-based) as German month/year string.
 * Example: (2026, 5) → "Mai 2026"
 */
export function formatMonthYear(year, month) {
  return `${MONTH_NAMES_DE[month - 1]} ${year}`;
}

/**
 * Short month label for charts.
 * Example: (2026, 5) → "Mai 26"
 */
export function formatMonthShort(year, month) {
  return `${MONTH_NAMES_SHORT_DE[month - 1]} ${String(year).slice(2)}`;
}

/**
 * Returns the value string for an HTML month input ("YYYY-MM").
 */
export function toMonthInputValue(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Parses an HTML month input value ("YYYY-MM") to { year, month }.
 */
export function fromMonthInputValue(value) {
  const [y, m] = value.split('-').map(Number);
  return { year: y, month: m };
}

export { MONTH_NAMES_DE };
