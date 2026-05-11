/**
 * Shared CSV export utility for the Sensax / Nifty 250 ledger.
 * Extracted from the inline Blob/URL/a.click pattern duplicated across
 * ConstituentLedger, Nifty250Ledger, NiftyIndexDataSection, and CompanyUniverseSection.
 */

/**
 * Trigger a CSV file download in the browser.
 * Creates a Blob, generates an object URL, and clicks a temporary <a> element.
 *
 * @param filename  Suggested download filename (e.g. 'nifty250-ledger-FY2024.csv')
 * @param headers   Column header strings
 * @param rows      Array of row data, each row being an array of cell strings
 */
export function exportCsv(
  filename: string,
  headers: string[],
  rows: string[][],
): void {
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Escape a cell value for CSV: if it contains commas, newlines, or quotes,
 * wrap in double-quotes and escape embedded quotes.
 */
export function csvEscape(val: string | number): string {
  const s = String(val);
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}