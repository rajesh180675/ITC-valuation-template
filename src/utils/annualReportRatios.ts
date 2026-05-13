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
  // Company type
  isFinancial: boolean;
  // Bank-specific
  costToIncome: number | null;
  provisionsRatio: number | null;
  // Raw values for external use
  revenueCr: number | null;
  patCr: number | null;
  equityCr: number | null;
  totalAssetsCr: number | null;
}

/* ── Safe helpers ─────────────────────────────────────────────────── */
function safeDiv(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || b === 0) return null;
  return Math.round((a / b) * 1000) / 10;
}

function safePct(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || b === 0) return null;
  return Math.round((a / b) * 10000) / 100;
}

/** Try multiple field names, return first non-null value */
function pickField(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && typeof v === 'number') return v;
  }
  return null;
}

/* ── Main ─────────────────────────────────────────────────────────── */
export function calculateRatios(data: Record<string, AnnualReportYearData>, years: string[]): YearlyRatios[] {
  // Detect company type from first available year
  let isFinancial = false;
  for (const fy of years) {
    const pnl = data[fy]?.profitLoss?.kpIs ?? {};
    if (pnl.netInterestIncomeCr != null) {
      isFinancial = true;
      break;
    }
  }

  return years.map(fy => {
    const y = data[fy];
    const pnl = y?.profitLoss?.kpIs ?? {};
    const bs = y?.balanceSheet?.kpIs ?? {};
    const cf = y?.cashFlow?.kpIs ?? {};

    // ── Resolve fields with fallbacks ──
    // Revenue: manufacturing uses revenueCr, banks use netInterestIncome + otherIncome
    const revenueCr = pickField(pnl, 'revenueCr', 'totalIncomeCr', 'salesCr');
    const netIntInc = pickField(pnl, 'netInterestIncomeCr');
    const otherInc = pickField(pnl, 'otherIncomeCr');
    const totalRevenue = isFinancial && netIntInc != null
      ? netIntInc + (otherInc ?? 0)
      : revenueCr;

    const pat = pickField(pnl, 'patCr', 'netProfitCr', 'profitForYearCr');
    const pbt = pickField(pnl, 'pbtCr', 'profitBeforeTaxCr');
    const ta = pickField(bs, 'totalAssetsCr', 'assetsCr');
    const eq = pickField(bs, 'equityCr', 'shareholdersFundsCr');
    const tel = pickField(bs, 'totalEquityLiabCr', 'totalLiabilitiesCr');
    const cfo = pickField(cf, 'cfoCr', 'netCashFromOperationsCr');
    const fcf = pickField(cf, 'fcfCr', 'freeCashFlowCr');
    const div = pickField(cf, 'dividendCr');

    // ── Bank-specific fields ──
    const operatingExpenses = pickField(pnl, 'operatingExpensesCr', 'employeeBenefitsCr', 'employeeBenefitsExpenseCr');
    const provisions = pickField(pnl, 'provisionsCr', 'provisionsAndContingenciesCr', 'impairmentLossCr');

    // Estimate operating expenses for cost-to-income (total expenses - finance cost - depreciation)
    const totExpenses = pickField(pnl, 'totalExpensesCr');
    const finCost = pickField(pnl, 'financeCostCr', 'interestExpenseCr');
    const depr = pickField(pnl, 'depreciationCr', 'depreciationAmortisationCr', 'depreciationAndAmortisationCr');

    // EBITDA = PBT + Finance Cost + Depreciation
    const ebitda = pbt != null && finCost != null && depr != null ? pbt + finCost + depr : null;

    // For banks, use operating expenses directly or estimate from total expenses
    let costToIncome: number | null = null;
    if (isFinancial && totalRevenue != null && totalRevenue !== 0) {
      if (operatingExpenses != null) {
        costToIncome = Math.round((operatingExpenses / totalRevenue) * 10000) / 100;
      } else if (totExpenses != null) {
        // Subtract finance cost and provisions from total expenses for operating cost estimate
        let opCost = totExpenses;
        if (finCost != null) opCost -= finCost;
        if (provisions != null) opCost -= provisions;
        costToIncome = Math.round((opCost / totalRevenue) * 10000) / 100;
      }
    }

    return {
      fy,
      grossMargin: null, // Would need COGS
      ebitdaMargin: safePct(ebitda, totalRevenue),
      pbtMargin: safePct(pbt, totalRevenue),
      patMargin: safePct(pat, totalRevenue),
      roe: safePct(pat, eq),
      roa: safePct(pat, ta),
      roce: pbt != null && eq != null && eq !== 0
        ? Math.round((pbt / eq) * 1000) / 10
        : isFinancial && pat != null && eq != null && eq !== 0
          ? Math.round((pat / eq) * 1000) / 10
          : null,
      assetTurnover: safeDiv(totalRevenue, ta),
      equityTurnover: safeDiv(totalRevenue, eq),
      debtToEquity: eq != null && tel != null ? safeDiv(tel - eq, eq) : null,
      debtToAssets: ta != null && tel != null && ta !== 0 ? safeDiv(tel - (eq ?? 0), ta) : null,
      equityRatio: safePct(eq, ta),
      cashConversion: cfo != null && pat != null && pat !== 0 ? Math.round((cfo / pat) * 1000) / 10 : null,
      fcfYield: safePct(fcf, totalRevenue),
      dividendPayout: div != null && fcf != null && fcf !== 0 ? Math.round((Math.abs(div) / Math.abs(fcf)) * 1000) / 10 : null,
      dupontMargin: safePct(pat, totalRevenue),
      dupontTurnover: safeDiv(totalRevenue, ta),
      dupontLeverage: ta != null && eq != null && eq !== 0 ? Math.round((ta / eq) * 1000) / 10 : null,

      // New fields
      isFinancial,
      costToIncome,
      provisionsRatio: isFinancial ? safePct(provisions, totalRevenue) : null,
      revenueCr: totalRevenue,
      patCr: pat,
      equityCr: eq,
      totalAssetsCr: ta,
    };
  });
}

export function formatRatio(value: number | null, suffix = '%'): string {
  if (value == null) return '\u2014';
  return `${value.toFixed(1)}${suffix}`;
}
