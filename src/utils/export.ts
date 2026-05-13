/**
 * Export helpers for Nifty universe data.
 * Builds CSV files from various analytics views.
 */

/** Escape a value for CSV (wrap in quotes if it contains comma or quote). */
export function csvEscape(v: string | number): string {
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Download a CSV file from headers + rows. */
export function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Build sector analytics CSV rows.
 */
export interface SectorAnalyticsRow {
  sector: string;
  count: number;
  weightPct: number;
  marketCapCr: number;
  weightedRoePct: number;
  weightedPatCagrPct: number;
  weightedBeta: number;
  weightedCostOfEquityPct: number;
  internalHHI: number;
  topConstituent: string;
}

export function exportSectorAnalytics(rows: SectorAnalyticsRow[], filename: string) {
  const headers = ['Sector', 'Companies', 'WeightPct', 'MarketCapCr', 'AvgROE_pct', 'PAT_CAGR_pct', 'AvgBeta', 'AvgCoE_pct', 'HHI', 'Leader'];
  const csvRows = rows.map(s => [
    csvEscape(s.sector), String(s.count), s.weightPct.toFixed(2),
    String(s.marketCapCr), s.weightedRoePct.toFixed(2),
    s.weightedPatCagrPct.toFixed(2), s.weightedBeta.toFixed(2),
    s.weightedCostOfEquityPct.toFixed(2), String(s.internalHHI), csvEscape(s.topConstituent),
  ]);
  exportCsv(filename, headers, csvRows);
}

/**
 * Build constituent ledger CSV rows.
 */
export interface LedgerRow {
  ticker: string;
  name: string;
  sector: string;
  weightPct: number;
  marketCapCr: number;
  pe: number;
  roePct: number;
  revenueCagr: number;
  profitCagr: number;
  beta: number;
  compositeScore: number;
}

export function exportLedger(rows: LedgerRow[], filename: string) {
  const headers = ['Ticker', 'Name', 'Sector', 'Weight%', 'MarketCap(Cr)', 'P/E', 'ROE%', 'RevenueCAGR%', 'ProfitCAGR%', 'Beta', 'CompositeScore'];
  const csvRows = rows.map(r => [
    csvEscape(r.ticker), csvEscape(r.name), csvEscape(r.sector),
    r.weightPct.toFixed(2), String(Math.round(r.marketCapCr)),
    r.pe.toFixed(1), r.roePct.toFixed(1),
    r.revenueCagr.toFixed(1), r.profitCagr.toFixed(1),
    r.beta.toFixed(2), r.compositeScore.toFixed(1),
  ]);
  exportCsv(filename, headers, csvRows);
}
