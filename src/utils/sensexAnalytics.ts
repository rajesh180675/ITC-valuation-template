// ─── Sensex Universe Analytics ─────────────────────────────────────────────
// Institutional-grade cross-sectional analytics for the 30 Sensex constituents.
// All models are deliberately transparent closed-form approximations so the
// numbers can be traced back to the inputs a PM would put on a napkin.

import type { SensexConstituent, SensexYearFinancial } from '@/data/sensexData';

/* ---------------------------------------------------------------------------
 * Market parameters (used by CAPM and reverse-Gordon)
 * ------------------------------------------------------------------------ */
export const MARKET_PARAMS = Object.freeze({
  /** Indian 10Y G-Sec yield, Apr 2026 snapshot. */
  riskFreeRatePct: 7.1,
  /** Long-run equity risk premium for India (Damodaran Jan 2026). */
  equityRiskPremiumPct: 5.5,
  /** Long-run nominal GDP growth ceiling for terminal growth. */
  maxTerminalGrowthPct: 7.0,
  /** Floor on solved implied growth to avoid nonsense outputs. */
  minImpliedGrowthPct: -2.0,
});

/* ---------------------------------------------------------------------------
 * CAPM cost of equity
 * ------------------------------------------------------------------------ */
export function costOfEquity(beta: number): number {
  return round1(MARKET_PARAMS.riskFreeRatePct + beta * MARKET_PARAMS.equityRiskPremiumPct);
}

/* ---------------------------------------------------------------------------
 * Earnings volatility (stdev of YoY profit growth, in %)
 * ------------------------------------------------------------------------ */
export function earningsVolatility(history: SensexYearFinancial[]): number {
  if (history.length < 3) return 0;
  const growths: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].netProfitCr;
    const curr = history[i].netProfitCr;
    if (prev > 0) {
      growths.push(((curr - prev) / prev) * 100);
    }
  }
  if (growths.length === 0) return 0;
  const mean = growths.reduce((s, v) => s + v, 0) / growths.length;
  const variance = growths.reduce((s, v) => s + (v - mean) ** 2, 0) / growths.length;
  return round1(Math.sqrt(variance));
}

/* ---------------------------------------------------------------------------
 * Implied perpetual growth (reverse Gordon / PV-of-perpetuity)
 *
 * Corporates (PE-based): P/E = payout / (r − g)  ⇒  g = r − payout·(E/P)
 *   where payout = DPS / EPS  ≈  dividendYield · P/E
 *
 * Banks (PB-based): P/B = (ROE − g) / (r − g)
 *   ⇒  g = (r · P/B − ROE) / (P/B − 1)
 *
 * Falls back to `minImpliedGrowthPct` when the math is degenerate.
 * ------------------------------------------------------------------------ */
export function impliedPerpetualGrowth(company: SensexConstituent): number {
  const r = costOfEquity(company.beta) / 100;
  const latestFin = company.history[company.history.length - 1] ?? company.history[0];
  const roe = latestFin ? latestFin.roePct / 100 : 0.10;

  if (company.valuationMetric === 'pb') {
    const pb = company.valuationMultiple;
    if (Math.abs(pb - 1) < 0.01) return MARKET_PARAMS.minImpliedGrowthPct;
    const g = (r * pb - roe) / (pb - 1);
    return clampGrowth(g * 100, r * 100);
  }

  // PE route: payout ratio ≈ dividendYield × P/E (fraction of E distributed)
  const pe = company.valuationMultiple;
  if (pe <= 0) return MARKET_PARAMS.minImpliedGrowthPct;
  const payoutRatio = Math.max(0, Math.min(0.95, (company.dividendYieldPct / 100) * pe));
  // Solving P/E = payout / (r − g)  ⇒  g = r − payout / (P/E)
  const g = r - payoutRatio / pe;
  return clampGrowth(g * 100, r * 100);
}

function clampGrowth(gPct: number, rPct: number): number {
  const ceiling = Math.min(MARKET_PARAMS.maxTerminalGrowthPct, rPct - 0.5);
  return round1(Math.max(MARKET_PARAMS.minImpliedGrowthPct, Math.min(ceiling, gPct)));
}

/* ---------------------------------------------------------------------------
 * DuPont-lite decomposition
 *
 * For corporates we know: net profit margin (NPM ≈ PAT / Topline) and ROE.
 * Full DuPont needs asset turnover and equity multiplier, neither of which are
 * in the seed. We therefore split ROE into two additive contribution bars:
 *
 *   NPM contribution   = NPM (same units as ROE, %)
 *   Efficiency+Leverage = ROE − NPM  (residual; captures turnover × leverage)
 *
 * This isolates the "margin story" from the "balance-sheet leverage story".
 * For banks the decomposition is skipped (NPM-on-revenue is not meaningful).
 * ------------------------------------------------------------------------ */
export interface DuPontDecomposition {
  npm: number;
  leverageAndTurnover: number;
  roe: number;
  applicable: boolean;
}

export function computeDuPont(company: SensexConstituent): DuPontDecomposition {
  const latest = company.history[company.history.length - 1];
  const roe = latest.roePct;
  if (company.reportingType === 'financial' || latest.toplineCr <= 0) {
    return { npm: 0, leverageAndTurnover: 0, roe, applicable: false };
  }
  const npm = (latest.netProfitCr / latest.toplineCr) * 100;
  return {
    npm: round1(npm),
    leverageAndTurnover: round1(Math.max(0, roe - npm)),
    roe,
    applicable: true,
  };
}

/* ---------------------------------------------------------------------------
 * Factor scoring (Quality, Value, Growth, Momentum)
 *
 * Each raw metric is converted to a 0-100 percentile rank across the filtered
 * universe, then the factor score is the simple average of its components.
 * Higher = better on that factor.
 *
 *   Quality:   latest ROE (+), margin stability (1 / earnings vol, +),
 *              leverage headroom (-netDebt/EBITDA for corporates; +ROE for BFSI)
 *   Value:     inverse valuation multiple (+), dividend yield (+)
 *   Growth:    recent PAT CAGR (+), recent topline CAGR (+)
 *   Momentum:  PAT acceleration (last 3Y CAGR − full-window CAGR) (+),
 *              margin expansion (latest OpMargin − 5Y-ago OpMargin) (+)
 * ------------------------------------------------------------------------ */
export interface FactorScores {
  quality: number;
  value: number;
  growth: number;
  momentum: number;
  composite: number;
}

export interface CompanyScore extends FactorScores {
  id: string;
}

export function buildFactorScores(
  companies: SensexConstituent[],
  rangeStart: number,
  rangeEnd: number,
): Map<string, CompanyScore> {
  if (companies.length === 0) return new Map();
  const periods = Math.max(1, rangeEnd - rangeStart);
  const last = (c: SensexConstituent) => c.history[c.history.length - 1] ?? c.history[0] ?? { fy: '', toplineCr: 0, netProfitCr: 0, roePct: 0 };
  const safeAt = (c: SensexConstituent, i: number) => c.history[i] ?? last(c);

  // Raw metric vectors (aligned with companies[])
  const roe = companies.map(c => last(c).roePct);
  const volInv = companies.map(c => {
    const v = earningsVolatility(c.history);
    return v === 0 ? 0 : -v; // negate so that higher (less volatile) = better
  });
  const leverage = companies.map(c =>
    c.reportingType === 'financial'
      ? last(c).roePct / 2 // use half ROE as a capital-strength proxy for banks
      : -(c.netDebtToEbitda ?? 2) // lower leverage is better
  );

  const invVal = companies.map(c => 1 / Math.max(0.1, c.valuationMultiple));
  const dy = companies.map(c => c.dividendYieldPct);

  const patCagr = companies.map(c => cagr(safeAt(c, rangeStart).netProfitCr, safeAt(c, rangeEnd).netProfitCr, periods));
  const topCagr = companies.map(c => cagr(safeAt(c, rangeStart).toplineCr, safeAt(c, rangeEnd).toplineCr, periods));

  const accel = companies.map(c => {
    const h = c.history;
    const recentStart = Math.max(rangeStart, h.length - 4);
    const recentCagr = cagr(safeAt(c, recentStart).netProfitCr, safeAt(c, h.length - 1).netProfitCr, Math.max(1, h.length - 1 - recentStart));
    const full = cagr(safeAt(c, rangeStart).netProfitCr, safeAt(c, rangeEnd).netProfitCr, periods);
    return recentCagr - full;
  });

  const marginDelta = companies.map(c => {
    const h = c.history;
    const latestM = last(c).operatingMarginPct ?? 0;
    const pastIndex = Math.max(rangeStart, h.length - 6);
    const pastM = h[pastIndex].operatingMarginPct ?? latestM;
    return latestM - pastM;
  });

  const rankROE = percentileRanks(roe);
  const rankVol = percentileRanks(volInv);
  const rankLev = percentileRanks(leverage);
  const rankVal = percentileRanks(invVal);
  const rankDY = percentileRanks(dy);
  const rankPAT = percentileRanks(patCagr);
  const rankTop = percentileRanks(topCagr);
  const rankAccel = percentileRanks(accel);
  const rankMargin = percentileRanks(marginDelta);

  const map = new Map<string, CompanyScore>();
  companies.forEach((c, i) => {
    const quality = avg([rankROE[i], rankVol[i], rankLev[i]]);
    const value = avg([rankVal[i], rankDY[i]]);
    const growth = avg([rankPAT[i], rankTop[i]]);
    const momentum = avg([rankAccel[i], rankMargin[i]]);
    const composite = round1(avg([quality, value, growth, momentum]));
    map.set(c.id, {
      id: c.id,
      quality: round1(quality),
      value: round1(value),
      growth: round1(growth),
      momentum: round1(momentum),
      composite,
    });
  });
  return map;
}

/* ---------------------------------------------------------------------------
 * Index concentration
 *
 * Herfindahl-Hirschman Index on index weights (0-10,000 where 10,000 = single
 * stock). Effective N = 10,000 / HHI gives the "equivalent equal-weighted"
 * count. Also computes the TopN weight share for quick communication.
 * ------------------------------------------------------------------------ */
export interface ConcentrationStats {
  hhi: number;
  effectiveN: number;
  top3Pct: number;
  top5Pct: number;
  top10Pct: number;
}

export function computeConcentration(companies: SensexConstituent[]): ConcentrationStats {
  if (companies.length === 0) {
    return { hhi: 0, effectiveN: 0, top3Pct: 0, top5Pct: 0, top10Pct: 0 };
  }
  const totalWeight = companies.reduce((s, c) => s + c.weightPct, 0) || 1;
  const normalized = companies.map(c => (c.weightPct / totalWeight) * 100);
  const hhi = normalized.reduce((s, w) => s + w * w, 0);
  const effectiveN = hhi > 0 ? 10000 / hhi : 0;
  const sorted = [...normalized].sort((a, b) => b - a);
  const sum = (n: number) => sorted.slice(0, n).reduce((s, v) => s + v, 0);
  return {
    hhi: Math.round(hhi),
    effectiveN: Math.round(effectiveN * 10) / 10,
    top3Pct: round1(sum(3)),
    top5Pct: round1(sum(5)),
    top10Pct: round1(sum(10)),
  };
}

/* ---------------------------------------------------------------------------
 * Weighted sector analytics (aggregates per sector, weight-weighted means)
 * ------------------------------------------------------------------------ */
export interface SectorAnalytics {
  sector: string;
  count: number;
  weightPct: number;
  marketCapCr: number;
  weightedRoePct: number;
  weightedValuationMultiple: number;
  weightedBeta: number;
  weightedCostOfEquityPct: number;
  weightedPatCagrPct: number;
  valuationLabel: 'P/E' | 'P/B' | 'Mixed';
  internalHHI: number;
  topConstituent: string;
}

export function buildSectorAnalytics(
  companies: SensexConstituent[],
  rangeStart: number,
  rangeEnd: number,
): SectorAnalytics[] {
  if (companies.length === 0) return [];
  const periods = Math.max(1, rangeEnd - rangeStart);
  const map = new Map<string, SensexConstituent[]>();
  companies.forEach(c => {
    const arr = map.get(c.sector) ?? [];
    arr.push(c);
    map.set(c.sector, arr);
  });

  const out: SectorAnalytics[] = [];
  map.forEach((members, sector) => {
    const totalWeight = members.reduce((s, c) => s + c.weightPct, 0);
    const totalMcap = members.reduce((s, c) => s + c.marketCapCr, 0);
    const w = (c: SensexConstituent) => c.weightPct / totalWeight;
    const lastFin = (c: SensexConstituent) => c.history[c.history.length - 1] ?? c.history[0] ?? { fy: '', toplineCr: 0, netProfitCr: 0, roePct: 0 };
    const safeAt = (c: SensexConstituent, i: number) => c.history[i] ?? lastFin(c);

    const wRoe = members.reduce((s, c) => s + w(c) * lastFin(c).roePct, 0);
    const wVal = members.reduce((s, c) => s + w(c) * c.valuationMultiple, 0);
    const wBeta = members.reduce((s, c) => s + w(c) * c.beta, 0);
    const wPatCagr = members.reduce((s, c) => s + w(c) * cagr(safeAt(c, rangeStart).netProfitCr, safeAt(c, rangeEnd).netProfitCr, periods), 0);

    const labels = new Set(members.map(c => c.valuationMetric));
    const valuationLabel = labels.size === 1 ? (labels.has('pb') ? 'P/B' : 'P/E') : 'Mixed';

    // Intra-sector concentration
    const inSectorWeights = members.map(c => (c.weightPct / totalWeight) * 100);
    const hhi = inSectorWeights.reduce((s, v) => s + v * v, 0);
    const top = [...members].sort((a, b) => b.weightPct - a.weightPct)[0];

    out.push({
      sector,
      count: members.length,
      weightPct: round1(totalWeight),
      marketCapCr: Math.round(totalMcap),
      weightedRoePct: round1(wRoe),
      weightedValuationMultiple: round1(wVal),
      weightedBeta: round2(wBeta),
      weightedCostOfEquityPct: round1(MARKET_PARAMS.riskFreeRatePct + wBeta * MARKET_PARAMS.equityRiskPremiumPct),
      weightedPatCagrPct: round1(wPatCagr),
      valuationLabel: valuationLabel as 'P/E' | 'P/B' | 'Mixed',
      internalHHI: Math.round(hhi),
      topConstituent: top.ticker,
    });
  });

  return out.sort((a, b) => b.weightPct - a.weightPct);
}

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */
function percentileRanks(values: number[]): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [50];
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length).fill(0);
  indexed.forEach((entry, rank) => {
    ranks[entry.i] = (rank / (values.length - 1)) * 100;
  });
  return ranks;
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

function cagr(start: number, end: number, periods: number): number {
  if (start <= 0 || end <= 0 || periods <= 0) return 0;
  return (Math.pow(end / start, 1 / periods) - 1) * 100;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/* ---------------------------------------------------------------------------
 * Magic Formula (Greenblatt) — combined rank of capital efficiency and
 * earnings yield. Higher composite rank = "good business at a fair price".
 *
 *   Capital efficiency proxy:
 *     • Corporates → ROCE (or ROE if ROCE is missing)
 *     • BFSI       → ROE  (ROCE is not informative for banks/insurers)
 *
 *   Earnings yield proxy:
 *     • P/E names  → 1 / P/E
 *     • P/B names  → ROE / P/B  (the bank-equivalent E/P, since EPS/Price
 *                                 ≈ ROE × (BV/Price))
 * ------------------------------------------------------------------------ */
export interface MagicFormulaScore {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  capitalEfficiencyPct: number;
  earningsYieldPct: number;
  rankCapital: number;
  rankYield: number;
  rankCombined: number;
}

export function buildMagicFormulaRanks(
  companies: SensexConstituent[],
): MagicFormulaScore[] {
  if (companies.length === 0) return [];
  const last = (c: SensexConstituent) => c.history[c.history.length - 1];

  const capEff = companies.map((c) => {
    const latest = last(c);
    if (c.reportingType === 'financial') return latest.roePct;
    return latest.rocePct ?? latest.roePct;
  });

  const earningsYield = companies.map((c) => {
    if (c.valuationMetric === 'pb') {
      const pb = Math.max(0.1, c.valuationMultiple);
      return last(c).roePct / pb;
    }
    const pe = Math.max(0.1, c.valuationMultiple);
    return 100 / pe;
  });

  // Higher value = better → invert ordinal so rank #1 is best.
  const ordCap = ordinalRanks(capEff);
  const ordYld = ordinalRanks(earningsYield);

  return companies.map((c, i) => ({
    id: c.id,
    ticker: c.ticker,
    name: c.name,
    sector: c.sector,
    capitalEfficiencyPct: round1(capEff[i]),
    earningsYieldPct: round1(earningsYield[i]),
    rankCapital: ordCap[i],
    rankYield: ordYld[i],
    rankCombined: ordCap[i] + ordYld[i],
  })).sort((a, b) => a.rankCombined - b.rankCombined);
}

/* ---------------------------------------------------------------------------
 * Valuation z-score — how cheap/expensive a name is vs. its sector peers.
 *
 *   z = (multiple − sector median) / sector MAD
 *
 * Negative z = trading below sector midpoint (cheap-vs-peers); positive z =
 * premium-vs-peers. Banks (P/B) and corporates (P/E) are z-scored within
 * their own metric so the read is apples-to-apples.
 * ------------------------------------------------------------------------ */
export interface ValuationZScore {
  id: string;
  ticker: string;
  sector: string;
  multiple: number;
  metric: 'pe' | 'pb';
  sectorMedian: number;
  zScore: number;
}

export function buildValuationZScores(
  companies: SensexConstituent[],
): Map<string, ValuationZScore> {
  const out = new Map<string, ValuationZScore>();
  if (companies.length === 0) return out;

  // Group by sector × metric so P/E and P/B are scored separately.
  const buckets = new Map<string, SensexConstituent[]>();
  companies.forEach((c) => {
    const key = `${c.sector}::${c.valuationMetric}`;
    const arr = buckets.get(key) ?? [];
    arr.push(c);
    buckets.set(key, arr);
  });

  buckets.forEach((members) => {
    if (members.length === 0) return;
    const values = members.map((c) => c.valuationMultiple);
    const median = quantile(values, 0.5);
    const mad = medianAbsoluteDeviation(values, median);
    const scale = mad > 1e-6 ? mad : (median * 0.15) || 1;

    members.forEach((c) => {
      out.set(c.id, {
        id: c.id,
        ticker: c.ticker,
        sector: c.sector,
        multiple: c.valuationMultiple,
        metric: c.valuationMetric,
        sectorMedian: round2(median),
        zScore: round2((c.valuationMultiple - median) / scale),
      });
    });
  });
  return out;
}

/* ---------------------------------------------------------------------------
 * Sector momentum grid — sector × FY heatmap of YoY weighted PAT growth.
 * Rows = sectors (sorted by index weight); columns = fiscal years (after
 * the first, since YoY needs t-1).
 * ------------------------------------------------------------------------ */
export interface SectorMomentumCell {
  fy: string;
  yoyPatGrowthPct: number;
}
export interface SectorMomentumRow {
  sector: string;
  weightPct: number;
  fullPeriodCagrPct: number;
  cells: SectorMomentumCell[];
}

export function buildSectorMomentumGrid(
  companies: SensexConstituent[],
): SectorMomentumRow[] {
  if (companies.length === 0) return [];

  const map = new Map<string, SensexConstituent[]>();
  companies.forEach((c) => {
    const arr = map.get(c.sector) ?? [];
    arr.push(c);
    map.set(c.sector, arr);
  });

  const yearLabels = companies[0].history.map((h) => h.fy);
  const rows: SectorMomentumRow[] = [];

  map.forEach((members, sector) => {
    const sectorMcap = members.reduce((s, c) => s + c.marketCapCr, 0) || 1;
    // Mcap-weighted aggregate PAT trajectory (in Cr).
    const aggregate = yearLabels.map((_, i) =>
      members.reduce((s, c) => s + (c.history[i]?.netProfitCr ?? 0), 0),
    );
    const cells: SectorMomentumCell[] = [];
    for (let i = 1; i < aggregate.length; i++) {
      const prev = aggregate[i - 1];
      const curr = aggregate[i];
      const growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      cells.push({ fy: yearLabels[i], yoyPatGrowthPct: round1(growth) });
    }
    const fullCagr = cagr(aggregate[0], aggregate[aggregate.length - 1], aggregate.length - 1);
    const weightPct = members.reduce((s, c) => s + c.weightPct, 0);
    rows.push({
      sector,
      weightPct: round1(weightPct),
      fullPeriodCagrPct: round1(fullCagr),
      cells,
    });

    // suppress unused-var warning: sectorMcap kept for future weight schemes
    void sectorMcap;
  });

  return rows.sort((a, b) => b.weightPct - a.weightPct);
}

/* ---------------------------------------------------------------------------
 * Helpers (additional)
 * ------------------------------------------------------------------------ */
function ordinalRanks(values: number[]): number[] {
  // Higher value → lower (better) rank number, i.e. rank 1 = max.
  if (values.length === 0) return [];
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const ranks = new Array(values.length).fill(0);
  indexed.forEach((entry, rank) => {
    ranks[entry.i] = rank + 1;
  });
  return ranks;
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function medianAbsoluteDeviation(values: number[], median: number): number {
  if (values.length === 0) return 0;
  const deviations = values.map((v) => Math.abs(v - median));
  return quantile(deviations, 0.5);
}
