import type { AnnualReportYearData } from './annualReportCashFlow';

export interface YearlyRatios {
  fy: string;
  // Margins
  grossMargin: number | null;
  ebitdaMargin: number | null;
  pbtMargin: number | null;
  patMargin: number | null;
  // Returns
  roe: number | null;
  roa: number | null;
  roce: number | null;
  // Efficiency
  assetTurnover: number | null;
  equityTurnover: number | null;
  // Leverage
  debtToEquity: number | null;
  debtToAssets: number | null;
  equityRatio: number | null;
  // Cash
  cashConversion: number | null;
  fcfYield: number | null;
  dividendPayout: number | null;
  // DuPont
  dupontMargin: number | null;
  dupontTurnover: number | null;
  dupontLeverage: number | null;
}

function safeDiv(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || b === 0) return null;
  return Math.round((a / b) * 1000) / 10;
}

function safePct(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || b === 0) return null;
  return Math.round((a / b) * 10000) / 100;
}

export function calculateRatios(data: Record<string, AnnualReportYearData>, years: string[]): YearlyRatios[] {
  return years.map(fy => {
    const y = data[fy];
    const pnl = y?.profitLoss?.kpIs ?? {};
    const bs = y?.balanceSheet?.kpIs ?? {};
    const cf = y?.cashFlow?.kpIs ?? {};

    const rev = pnl.revenueCr ?? null;
    const pat = pnl.patCr ?? null;
    const pbt = pnl.pbtCr ?? null;
    const ta = bs.totalAssetsCr ?? null;
    const eq = bs.equityCr ?? null;
    const tel = bs.totalEquityLiabCr ?? null;
    const cfo = cf.cfoCr ?? null;
    const fcf = cf.fcfCr ?? null;
    const div = cf.dividendCr ?? null;

    // Estimate EBITDA = PBT + Finance Cost + Depreciation (approximate)
    const finCost = pnl.financeCostCr ?? null;
    const depr = pnl.depreciationCr ?? null;
    const ebitda = pbt != null && finCost != null && depr != null ? pbt + finCost + depr : null;

    return {
      fy,
      grossMargin: null, // Would need COGS
      ebitdaMargin: safePct(ebitda, rev),
      pbtMargin: safePct(pbt, rev),
      patMargin: safePct(pat, rev),
      roe: safePct(pat, eq),
      roa: safePct(pat, ta),
      roce: safePct(pbt, eq), // Simplified: PBT / Equity
      assetTurnover: safeDiv(rev, ta),
      equityTurnover: safeDiv(rev, eq),
      debtToEquity: eq != null && tel != null ? safeDiv(tel - eq, eq) : null,
      debtToAssets: ta != null && tel != null && ta !== 0 ? safeDiv(tel - (eq ?? 0), ta) : null,
      equityRatio: safePct(eq, ta),
      cashConversion: cfo != null && pat != null && pat !== 0 ? Math.round((cfo / pat) * 1000) / 10 : null,
      fcfYield: safePct(fcf, rev),
      dividendPayout: div != null && fcf != null && fcf !== 0 ? Math.round((Math.abs(div) / Math.abs(fcf)) * 1000) / 10 : null,
      dupontMargin: safePct(pat, rev),
      dupontTurnover: safeDiv(rev, ta),
      dupontLeverage: ta != null && eq != null && eq !== 0 ? Math.round((ta / eq) * 1000) / 10 : null,
    };
  });
}

export function formatRatio(value: number | null, suffix = '%'): string {
  if (value == null) return '\u2014';
  return `${value.toFixed(1)}${suffix}`;
}
