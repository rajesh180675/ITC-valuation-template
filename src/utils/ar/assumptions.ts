// src/utils/ar/assumptions.ts
// Derives projection assumptions from historical actuals.
// Used by ForecastsTab and ValuationTab so both always stay in sync.

import type { DerivedFinancialsRow } from './derivedKPIs';
import type { ProjectionAssumptions } from './projection';

/**
 * Seed a ProjectionAssumptions object from the last ≤5 years of actuals.
 * Every key is derived from data; hardcoded fallbacks are used only when
 * a metric is unavailable (e.g. no capex in screener data).
 */
export function deriveAssumptions(history: DerivedFinancialsRow[]): ProjectionAssumptions {
  const recent = history.slice(-5).filter(r => r.revenue != null && r.revenue > 0);

  // Revenue CAGR over the recent window → Y1 growth rate
  const revCAGR = (() => {
    const n = recent.length;
    if (n < 2) return 8;
    const first = recent[0].revenue!;
    const last = recent[n - 1].revenue!;
    if (first <= 0) return 8;
    return Math.max(2, Math.min(30, ((last / first) ** (1 / (n - 1)) - 1) * 100));
  })();

  // Average EBITDA margin
  const avgEbitdaMargin = (() => {
    const vals = recent.filter(r => r.ebitdaMargin != null).map(r => r.ebitdaMargin!);
    if (vals.length === 0) return 22;
    return Math.max(5, Math.min(60, vals.reduce((a, b) => a + b, 0) / vals.length));
  })();

  // Average D&A as % of revenue
  const avgDaPct = (() => {
    const vals = recent
      .filter(r => r.depreciation != null && r.revenue != null && r.revenue > 0)
      .map(r => (r.depreciation! / r.revenue!) * 100);
    if (vals.length === 0) return 3;
    return Math.max(0.5, Math.min(15, vals.reduce((a, b) => a + b, 0) / vals.length));
  })();

  // Average capex as % of revenue
  const avgCapexPct = (() => {
    const vals = recent
      .filter(r => r.capex != null && r.revenue != null && r.revenue > 0)
      .map(r => (Math.abs(r.capex!) / r.revenue!) * 100);
    if (vals.length === 0) return 5;
    return Math.max(0.5, Math.min(25, vals.reduce((a, b) => a + b, 0) / vals.length));
  })();

  // Average effective tax rate across all history where PAT and PBT are available
  const avgTaxRate = (() => {
    const vals = history
      .filter(r => r.pbt != null && r.pbt > 0 && r.pat != null)
      .map(r => ((r.pbt! - r.pat!) / r.pbt!) * 100)
      .filter(v => v >= 0 && v <= 50);
    if (vals.length === 0) return 25.17;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();

  // Terminal growth = half of historical CAGR, floored at 3%, capped at 5%
  const terminalGrowth = Math.min(5, Math.max(3, revCAGR * 0.5));

  // Taper growth from revCAGR to terminalGrowth over 5 years
  const step = (revCAGR - terminalGrowth) / 4;
  const growthYears = [0, 1, 2, 3, 4].map(i =>
    Math.round((revCAGR - i * step) * 10) / 10
  );

  const m = Math.round(avgEbitdaMargin * 10) / 10;
  const da = Math.round(avgDaPct * 10) / 10;
  const capex = Math.round(avgCapexPct * 10) / 10;

  return {
    revenueGrowthYears: growthYears,
    terminalGrowth: Math.round(terminalGrowth * 10) / 10,
    forecastYears: 5,
    ebitdaMargin: [m, m, m, m, m],
    daPctOfRevenue: [da, da, da, da, da],
    taxRate: Math.round(avgTaxRate * 100) / 100,
    capexPctOfRevenue: [capex, capex, capex, capex, capex],
    nwcPctOfRevenue: [2, 2, 2, 2, 2],
    netDebtToEbitdaTarget: 1,
    payoutRatio: 35,
    riskFreeRate: 7,
    equityRiskPremium: 5.5,
    beta: 1,
    costOfDebt: 8.5,
    targetDebtWeight: 0.3,
  };
}
