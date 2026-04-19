/**
 * Generic company-agnostic valuation engine.
 *
 * Reuses the same analytical primitives as itcModel.ts but operates on the
 * top-down `CompanyProfile` schema in @/data/companies, making it suitable
 * for any company (TCS, HUL, Kansai Nerolac, VST, ITC) without segment-level
 * build-up.
 *
 * Engines supported:
 *   - Top-down revenue / EBIT / NOPAT / FCFF projection
 *   - Two-stage DCF with mid-year convention
 *   - Gordon-growth DDM and two-stage DDM
 *   - Monte Carlo with triangular distributions (Mulberry32 RNG, deterministic)
 *   - Scenario analysis (Bear/Base/Bull/Stress from company profile)
 *   - Reverse DCF (binary search on implied revenue CAGR)
 *   - Relative valuation (peer EV/EBITDA, P/E, EV/Sales)
 *   - EVA / ROIC decomposition (DuPont)
 *   - Blended valuation bridge across 5 methods
 *   - WACC × g sensitivity matrix
 */

import type {
  CompanyProfile,
  GenericAssumptions,
  GenericPeer,
  HistoricalYear,
} from '@/data/companies';

// ---------------------------------------------------------------------------
// Shared constants / config
// ---------------------------------------------------------------------------

export const GENERIC_MODEL_ASSUMPTIONS = Object.freeze({
  reverseGrowthMin: -10,
  reverseGrowthMax: 25,
  reverseSolverTolerance: 0.25,
  reverseSolverMaxIter: 80,
  monteCarloDraws: 500,
  monteCarloSeed: 42,
  sensitivityStep: 0.5,
  midYearConvention: true,
});

// ---------------------------------------------------------------------------
// Utility math
// ---------------------------------------------------------------------------

function round(n: number, p = 2): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function triangular(rand: number, low: number, mid: number, high: number): number {
  const f = (mid - low) / (high - low);
  return rand < f
    ? low + Math.sqrt(rand * (high - low) * (mid - low))
    : high - Math.sqrt((1 - rand) * (high - low) * (high - mid));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenericProjectionYear {
  fy: string;
  year: number; // 1..N
  revenue: number;
  ebitda: number;
  ebit: number;
  depreciation: number;
  taxRate: number;
  nopat: number;
  capex: number;
  workingCapitalChange: number;
  fcff: number;
  terminalYear: boolean;
}

export interface GenericDCFResult {
  perShareValue: number;
  equityValue: number;
  enterpriseValue: number;
  pvExplicit: number;
  pvTerminal: number;
  terminalValueWeight: number;
  impliedExitEbitdaMultiple: number;
  isValid: boolean;
  validationErrors: string[];
}

export interface GenericSensitivityPoint {
  wacc: number;
  terminalGrowth: number;
  perShareValue: number | null;
  isBase: boolean;
}

export interface GenericScenarioOutcome {
  id: string;
  label: string;
  probability: number;
  description: string;
  color: string;
  perShareValue: number;
  assumptions: GenericAssumptions;
  terminalValueWeight: number;
  impliedExitMultiple: number;
}

export interface GenericScenarioSummary {
  scenarios: GenericScenarioOutcome[];
  expectedValue: number;
  bearValue: number;
  baseValue: number;
  bullValue: number;
  stressValue: number;
  upsideVsMarket: number;
}

export interface GenericMonteCarloResult {
  samples: number;
  mean: number;
  median: number;
  stdDev: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
  probUpside: number;
  histogram: Array<{ bucket: string; count: number; low: number; high: number }>;
  perShareValues: number[];
}

export interface GenericReverseDCFResult {
  currentPrice: number;
  impliedRevenueCAGR: number;
  baseCAGR: number;
  converged: boolean;
  iterations: number;
  dcfAtImplied: number;
  description: string;
}

export interface GenericRelativeValResult {
  method: 'EV/EBITDA' | 'P/E' | 'EV/Sales';
  appliedMultiple: number;
  peerAverage: number;
  peerMedian: number;
  peerMin: number;
  peerMax: number;
  discountVsPeers: number;
  impliedEnterpriseValue: number;
  impliedEquityValue: number;
  perShareValue: number;
}

export interface GenericDDMResult {
  method: 'Gordon' | 'Two-Stage';
  currentDps: number;
  nearTermGrowth: number;
  terminalGrowth: number;
  requiredReturn: number;
  perShareValue: number;
  payoutRatio: number;
  sustainabilityScore: number;
  notes: string;
}

export interface GenericEvaYear {
  fy: string;
  year: number;
  nopat: number;
  investedCapital: number;
  capitalCharge: number;
  eva: number;
  roic: number;
  roicSpread: number;
}

export interface GenericRoicDecomposition {
  fy: string;
  nopatMargin: number;
  capitalTurnover: number;
  roic: number;
}

export interface GenericBlendedBridge {
  methods: Array<{ label: string; perShareValue: number; weight: number; color: string }>;
  blendedPerShare: number;
  marketPrice: number;
  upside: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextFy(lastFy: string, offset: number): string {
  // "FY25" -> "FY26E" (offset 1)
  const n = parseInt(lastFy.replace('FY', ''), 10);
  return `FY${String(n + offset).padStart(2, '0')}E`;
}

function latest(profile: CompanyProfile): HistoricalYear {
  return profile.historical[profile.historical.length - 1]!;
}

function mergeAssumptions(
  base: GenericAssumptions,
  overrides?: Partial<GenericAssumptions>,
): GenericAssumptions {
  return { ...base, ...(overrides ?? {}) };
}

// ---------------------------------------------------------------------------
// Top-down projection engine
// ---------------------------------------------------------------------------

export function projectCompany(
  profile: CompanyProfile,
  overrides?: Partial<GenericAssumptions>,
): GenericProjectionYear[] {
  const a = mergeAssumptions(profile.assumptions, overrides);
  const base = latest(profile);
  const years: GenericProjectionYear[] = [];

  let prevRevenue = base.revenue;
  const currentMargin = base.ebitda / base.revenue; // %
  const targetMargin = a.targetEbitdaMargin / 100;

  for (let i = 1; i <= a.projectionYears; i++) {
    // S-curve growth: start at Y1, taper to CAGR
    const progress = (i - 1) / Math.max(1, a.projectionYears - 1);
    const growth = a.revenueGrowthY1 + (a.revenueGrowthCAGR - a.revenueGrowthY1) * progress;
    const revenue = prevRevenue * (1 + growth / 100);

    // Margin glide toward target over horizon
    const margin = currentMargin + (targetMargin - currentMargin) * progress;
    const ebitda = revenue * margin;
    const depreciation = revenue * (a.daPercentRevenue / 100);
    const ebit = ebitda - depreciation;
    const nopat = ebit * (1 - a.taxRate / 100);
    const capex = revenue * (a.capexPercentRevenue / 100);
    const deltaRev = revenue - prevRevenue;
    const workingCapitalChange = deltaRev * (a.workingCapitalIntensity / 100);
    const fcff = nopat + depreciation - capex - workingCapitalChange;

    years.push({
      fy: nextFy(base.fy, i),
      year: i,
      revenue: round(revenue, 0),
      ebitda: round(ebitda, 0),
      ebit: round(ebit, 0),
      depreciation: round(depreciation, 0),
      taxRate: a.taxRate,
      nopat: round(nopat, 0),
      capex: round(capex, 0),
      workingCapitalChange: round(workingCapitalChange, 0),
      fcff: round(fcff, 0),
      terminalYear: i === a.projectionYears,
    });

    prevRevenue = revenue;
  }

  return years;
}

// ---------------------------------------------------------------------------
// DCF
// ---------------------------------------------------------------------------

export function dcf(
  profile: CompanyProfile,
  projection: GenericProjectionYear[],
  overrides?: Partial<GenericAssumptions>,
): GenericDCFResult {
  const a = mergeAssumptions(profile.assumptions, overrides);
  const wacc = a.wacc / 100;
  const tg = a.terminalGrowth / 100;
  const errors: string[] = [];

  if (!Number.isFinite(wacc) || wacc <= 0) errors.push('WACC invalid');
  if (!(wacc > tg)) errors.push('WACC must exceed terminal growth');
  if (projection.length === 0) errors.push('Projection empty');

  if (errors.length > 0) {
    return {
      perShareValue: 0, equityValue: 0, enterpriseValue: 0,
      pvExplicit: 0, pvTerminal: 0, terminalValueWeight: 0,
      impliedExitEbitdaMultiple: 0, isValid: false, validationErrors: errors,
    };
  }

  const midYear = GENERIC_MODEL_ASSUMPTIONS.midYearConvention;
  let pvExplicit = 0;
  for (const y of projection) {
    const t = midYear ? y.year - 0.5 : y.year;
    pvExplicit += y.fcff / Math.pow(1 + wacc, t);
  }

  const terminalYear = projection[projection.length - 1]!;
  const terminalFCFF = terminalYear.fcff * (1 + tg);
  const terminalValue = terminalFCFF / (wacc - tg);
  const pvTerminal = terminalValue / Math.pow(1 + wacc, terminalYear.year);

  const enterpriseValue = pvExplicit + pvTerminal;
  const equityValue = enterpriseValue + profile.netCashCr;
  const perShareValue = equityValue / profile.sharesOutstandingCr;
  const terminalValueWeight = pvTerminal / Math.max(1, enterpriseValue);
  const impliedExitEbitdaMultiple = terminalValue / Math.max(1, terminalYear.ebitda);

  return {
    perShareValue: round(perShareValue, 1),
    equityValue: round(equityValue, 0),
    enterpriseValue: round(enterpriseValue, 0),
    pvExplicit: round(pvExplicit, 0),
    pvTerminal: round(pvTerminal, 0),
    terminalValueWeight: round(terminalValueWeight * 100, 1),
    impliedExitEbitdaMultiple: round(impliedExitEbitdaMultiple, 1),
    isValid: true,
    validationErrors: [],
  };
}

export function valueWithAssumptions(
  profile: CompanyProfile,
  overrides?: Partial<GenericAssumptions>,
): GenericDCFResult {
  const projection = projectCompany(profile, overrides);
  return dcf(profile, projection, overrides);
}

// ---------------------------------------------------------------------------
// Sensitivity (WACC x g)
// ---------------------------------------------------------------------------

export function waccTerminalSensitivity(
  profile: CompanyProfile,
  waccDelta = 2,
  tgDelta = 1,
  step = 0.5,
): GenericSensitivityPoint[] {
  const base = profile.assumptions;
  const points: GenericSensitivityPoint[] = [];
  for (let w = base.wacc - waccDelta; w <= base.wacc + waccDelta + 1e-6; w += step) {
    for (let g = base.terminalGrowth - tgDelta; g <= base.terminalGrowth + tgDelta + 1e-6; g += step) {
      const isBase = Math.abs(w - base.wacc) < 1e-4 && Math.abs(g - base.terminalGrowth) < 1e-4;
      if (w <= g) {
        points.push({ wacc: round(w, 2), terminalGrowth: round(g, 2), perShareValue: null, isBase });
        continue;
      }
      const result = valueWithAssumptions(profile, { wacc: w, terminalGrowth: g });
      points.push({
        wacc: round(w, 2),
        terminalGrowth: round(g, 2),
        perShareValue: result.isValid ? result.perShareValue : null,
        isBase,
      });
    }
  }
  return points;
}

// ---------------------------------------------------------------------------
// Scenario analysis
// ---------------------------------------------------------------------------

export function runScenarios(profile: CompanyProfile): GenericScenarioSummary {
  const outcomes: GenericScenarioOutcome[] = profile.scenarios.map(s => {
    const merged = mergeAssumptions(profile.assumptions, s.overrides);
    const proj = projectCompany(profile, s.overrides);
    const v = dcf(profile, proj, s.overrides);
    return {
      id: s.id,
      label: s.label,
      probability: s.probability,
      description: s.description,
      color: s.color,
      perShareValue: v.perShareValue,
      assumptions: merged,
      terminalValueWeight: v.terminalValueWeight,
      impliedExitMultiple: v.impliedExitEbitdaMultiple,
    };
  });

  const totalProb = outcomes.reduce((s, o) => s + o.probability, 0);
  const normalized = outcomes.map(o => ({ ...o, probability: o.probability / Math.max(1e-9, totalProb) }));
  const expectedValue = normalized.reduce((s, o) => s + o.perShareValue * o.probability, 0);

  const findValue = (id: string, fallback: number): number => {
    const o = normalized.find(x => x.id === id);
    return o ? o.perShareValue : fallback;
  };

  const baseValue = findValue('base', expectedValue);
  const bearValue = findValue('bear', baseValue * 0.8);
  const bullValue = findValue('bull', baseValue * 1.2);
  const stressValue = findValue('stress', bearValue * 0.85);

  return {
    scenarios: normalized,
    expectedValue: round(expectedValue, 1),
    bearValue: round(bearValue, 1),
    baseValue: round(baseValue, 1),
    bullValue: round(bullValue, 1),
    stressValue: round(stressValue, 1),
    upsideVsMarket: round(((expectedValue - profile.currentMarketPrice) / profile.currentMarketPrice) * 100, 1),
  };
}

// ---------------------------------------------------------------------------
// Monte Carlo
// ---------------------------------------------------------------------------

export function runMonteCarlo(
  profile: CompanyProfile,
  draws: number = GENERIC_MODEL_ASSUMPTIONS.monteCarloDraws,
  seed: number = GENERIC_MODEL_ASSUMPTIONS.monteCarloSeed,
): GenericMonteCarloResult {
  const rand = mulberry32(seed);
  const a = profile.assumptions;

  const ranges = {
    revenueGrowthCAGR: { low: a.revenueGrowthCAGR - 4, mid: a.revenueGrowthCAGR, high: a.revenueGrowthCAGR + 4 },
    targetEbitdaMargin: { low: a.targetEbitdaMargin - 3, mid: a.targetEbitdaMargin, high: a.targetEbitdaMargin + 3 },
    wacc: { low: a.wacc - 1, mid: a.wacc, high: a.wacc + 1.5 },
    terminalGrowth: { low: Math.max(2, a.terminalGrowth - 1.5), mid: a.terminalGrowth, high: a.terminalGrowth + 1 },
    capexPercentRevenue: { low: Math.max(0.5, a.capexPercentRevenue - 1), mid: a.capexPercentRevenue, high: a.capexPercentRevenue + 1 },
  };

  const values: number[] = [];
  for (let i = 0; i < draws; i++) {
    const overrides: Partial<GenericAssumptions> = {
      revenueGrowthCAGR: triangular(rand(), ranges.revenueGrowthCAGR.low, ranges.revenueGrowthCAGR.mid, ranges.revenueGrowthCAGR.high),
      targetEbitdaMargin: triangular(rand(), ranges.targetEbitdaMargin.low, ranges.targetEbitdaMargin.mid, ranges.targetEbitdaMargin.high),
      wacc: triangular(rand(), ranges.wacc.low, ranges.wacc.mid, ranges.wacc.high),
      terminalGrowth: triangular(rand(), ranges.terminalGrowth.low, ranges.terminalGrowth.mid, ranges.terminalGrowth.high),
      capexPercentRevenue: triangular(rand(), ranges.capexPercentRevenue.low, ranges.capexPercentRevenue.mid, ranges.capexPercentRevenue.high),
    };
    const v = valueWithAssumptions(profile, overrides);
    if (v.isValid) values.push(v.perShareValue);
  }

  values.sort((a, b) => a - b);
  const n = values.length;
  const pct = (p: number): number => values[Math.max(0, Math.min(n - 1, Math.floor(p * n)))] ?? 0;
  const mean = values.reduce((s, x) => s + x, 0) / Math.max(1, n);
  const variance = values.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n);
  const stdDev = Math.sqrt(variance);
  const median = pct(0.5);
  const probUpside = values.filter(v => v > profile.currentMarketPrice).length / Math.max(1, n);

  // Histogram with 14 buckets from p1 to p99
  const lo = pct(0.01);
  const hi = pct(0.99);
  const BUCKETS = 14;
  const width = (hi - lo) / BUCKETS;
  const histogram: GenericMonteCarloResult['histogram'] = [];
  for (let b = 0; b < BUCKETS; b++) {
    const bLo = lo + b * width;
    const bHi = b === BUCKETS - 1 ? hi : bLo + width;
    const count = values.filter(v => v >= bLo && v < bHi).length;
    histogram.push({ bucket: `${round(bLo, 0)}-${round(bHi, 0)}`, count, low: bLo, high: bHi });
  }

  return {
    samples: n,
    mean: round(mean, 1),
    median: round(median, 1),
    stdDev: round(stdDev, 1),
    p5: round(pct(0.05), 1),
    p25: round(pct(0.25), 1),
    p75: round(pct(0.75), 1),
    p95: round(pct(0.95), 1),
    probUpside: round(probUpside, 4),
    histogram,
    perShareValues: values,
  };
}

// ---------------------------------------------------------------------------
// Reverse DCF - solve for implied revenue CAGR that matches market price
// ---------------------------------------------------------------------------

export function reverseDCF(profile: CompanyProfile): GenericReverseDCFResult {
  const target = profile.currentMarketPrice;
  let lo: number = GENERIC_MODEL_ASSUMPTIONS.reverseGrowthMin;
  let hi: number = GENERIC_MODEL_ASSUMPTIONS.reverseGrowthMax;
  let iter = 0;
  let mid = (lo + hi) / 2;
  let val = 0;

  while (iter < GENERIC_MODEL_ASSUMPTIONS.reverseSolverMaxIter && Math.abs(hi - lo) > 0.01) {
    mid = (lo + hi) / 2;
    const result = valueWithAssumptions(profile, { revenueGrowthCAGR: mid, revenueGrowthY1: mid });
    val = result.perShareValue;
    if (val < target) lo = mid;
    else hi = mid;
    iter++;
    if (Math.abs(val - target) < GENERIC_MODEL_ASSUMPTIONS.reverseSolverTolerance) break;
  }

  return {
    currentPrice: target,
    impliedRevenueCAGR: round(mid, 2),
    baseCAGR: profile.assumptions.revenueGrowthCAGR,
    converged: Math.abs(val - target) < GENERIC_MODEL_ASSUMPTIONS.reverseSolverTolerance,
    iterations: iter,
    dcfAtImplied: round(val, 1),
    description: `Market implies ${round(mid, 1)}% revenue CAGR vs ${profile.assumptions.revenueGrowthCAGR}% base expectation.`,
  };
}

// ---------------------------------------------------------------------------
// Relative valuation
// ---------------------------------------------------------------------------

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const i = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * sorted.length)));
  return sorted[i] ?? 0;
}

export function relativeValuation(profile: CompanyProfile): GenericRelativeValResult[] {
  const peers = profile.peers;
  const base = latest(profile);

  const buildResult = (
    method: GenericRelativeValResult['method'],
    metric: (p: GenericPeer) => number,
    companyMetric: number,
  ): GenericRelativeValResult => {
    const vals = peers.map(metric).filter(Number.isFinite);
    const avg = vals.reduce((s, x) => s + x, 0) / Math.max(1, vals.length);
    const med = percentile(vals, 0.5);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const appliedMultiple = med;
    let impliedEv: number;
    let impliedEquity: number;
    if (method === 'EV/EBITDA') {
      impliedEv = appliedMultiple * base.ebitda;
      impliedEquity = impliedEv + profile.netCashCr;
    } else if (method === 'P/E') {
      impliedEquity = appliedMultiple * base.pat;
      impliedEv = impliedEquity - profile.netCashCr;
    } else {
      impliedEv = appliedMultiple * base.revenue;
      impliedEquity = impliedEv + profile.netCashCr;
    }
    const perShare = impliedEquity / profile.sharesOutstandingCr;

    return {
      method,
      appliedMultiple: round(appliedMultiple, 1),
      peerAverage: round(avg, 1),
      peerMedian: round(med, 1),
      peerMin: round(min, 1),
      peerMax: round(max, 1),
      discountVsPeers: round(((companyMetric - med) / Math.max(1e-6, med)) * 100, 1),
      impliedEnterpriseValue: round(impliedEv, 0),
      impliedEquityValue: round(impliedEquity, 0),
      perShareValue: round(perShare, 1),
    };
  };

  const companyEvEbitda = (profile.currentMarketPrice * profile.sharesOutstandingCr - profile.netCashCr) / Math.max(1, base.ebitda);
  const companyPe = profile.currentMarketPrice / Math.max(0.01, base.eps);
  const companyEvSales = (profile.currentMarketPrice * profile.sharesOutstandingCr - profile.netCashCr) / Math.max(1, base.revenue);

  return [
    buildResult('EV/EBITDA', p => p.evEbitda, companyEvEbitda),
    buildResult('P/E', p => p.pe, companyPe),
    buildResult('EV/Sales', p => p.marketCapCr / Math.max(1, p.marketCapCr * (p.evEbitda / Math.max(1, p.pe * 0.6))), companyEvSales),
  ];
}

// ---------------------------------------------------------------------------
// Dividend Discount Model
// ---------------------------------------------------------------------------

export function gordonGrowthDDM(profile: CompanyProfile): GenericDDMResult {
  const base = latest(profile);
  const a = profile.assumptions;
  const ke = a.costOfEquity / 100;
  const g = a.dividendGrowthTerminal / 100;
  const safeG = Math.min(g, ke - 0.005);
  const perShare = (base.dps * (1 + safeG)) / Math.max(1e-6, ke - safeG);
  const payoutRatio = (base.dps / Math.max(0.01, base.eps)) * 100;
  const sustainability = Math.max(
    0,
    Math.min(100, 100 - Math.abs(payoutRatio - 70) - Math.abs(a.dividendGrowthTerminal - 5) * 2),
  );

  return {
    method: 'Gordon',
    currentDps: base.dps,
    nearTermGrowth: a.dividendGrowthTerminal,
    terminalGrowth: a.dividendGrowthTerminal,
    requiredReturn: a.costOfEquity,
    perShareValue: round(perShare, 1),
    payoutRatio: round(payoutRatio, 1),
    sustainabilityScore: round(sustainability, 1),
    notes: `Assumes perpetual ${a.dividendGrowthTerminal}% DPS growth at ${a.costOfEquity}% cost of equity.`,
  };
}

export function twoStageDDM(profile: CompanyProfile, nearTermYears = 5): GenericDDMResult {
  const base = latest(profile);
  const a = profile.assumptions;
  const ke = a.costOfEquity / 100;
  const g1 = a.dividendGrowthNearTerm / 100;
  const g2 = Math.min(a.dividendGrowthTerminal / 100, ke - 0.005);

  let pv = 0;
  let dps = base.dps;
  for (let i = 1; i <= nearTermYears; i++) {
    dps *= 1 + g1;
    pv += dps / Math.pow(1 + ke, i);
  }
  const terminalDps = dps * (1 + g2);
  const terminalValue = terminalDps / Math.max(1e-6, ke - g2);
  const pvTerminal = terminalValue / Math.pow(1 + ke, nearTermYears);
  const total = pv + pvTerminal;

  const payoutRatio = (base.dps / Math.max(0.01, base.eps)) * 100;
  const sustainability = Math.max(
    0,
    Math.min(100, 100 - Math.abs(payoutRatio - 70) - Math.abs(a.dividendGrowthNearTerm - 8)),
  );

  return {
    method: 'Two-Stage',
    currentDps: base.dps,
    nearTermGrowth: a.dividendGrowthNearTerm,
    terminalGrowth: a.dividendGrowthTerminal,
    requiredReturn: a.costOfEquity,
    perShareValue: round(total, 1),
    payoutRatio: round(payoutRatio, 1),
    sustainabilityScore: round(sustainability, 1),
    notes: `${nearTermYears}-yr at ${a.dividendGrowthNearTerm}% then ${a.dividendGrowthTerminal}% perpetuity.`,
  };
}

// ---------------------------------------------------------------------------
// EVA & ROIC
// ---------------------------------------------------------------------------

export function computeEvaSeries(
  profile: CompanyProfile,
  projection: GenericProjectionYear[],
): GenericEvaYear[] {
  const a = profile.assumptions;
  const wacc = a.wacc / 100;
  const base = latest(profile);
  let ic = base.investedCapital;

  const series: GenericEvaYear[] = [];
  for (const y of projection) {
    const capitalCharge = ic * wacc;
    const eva = y.nopat - capitalCharge;
    const roic = (y.nopat / Math.max(1, ic)) * 100;
    series.push({
      fy: y.fy,
      year: y.year,
      nopat: round(y.nopat, 0),
      investedCapital: round(ic, 0),
      capitalCharge: round(capitalCharge, 0),
      eva: round(eva, 0),
      roic: round(roic, 1),
      roicSpread: round(roic - a.wacc, 1),
    });
    ic += y.capex + y.workingCapitalChange - y.depreciation;
  }
  return series;
}

export function computeRoicDecomposition(
  profile: CompanyProfile,
  projection: GenericProjectionYear[],
): GenericRoicDecomposition[] {
  const base = latest(profile);
  let ic = base.investedCapital;
  const rows: GenericRoicDecomposition[] = [];
  for (const y of projection) {
    const nopatMargin = (y.nopat / Math.max(1, y.revenue)) * 100;
    const capitalTurnover = y.revenue / Math.max(1, ic);
    const roic = nopatMargin * capitalTurnover;
    rows.push({
      fy: y.fy,
      nopatMargin: round(nopatMargin, 1),
      capitalTurnover: round(capitalTurnover, 2),
      roic: round(roic, 1),
    });
    ic += y.capex + y.workingCapitalChange - y.depreciation;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Blended valuation bridge
// ---------------------------------------------------------------------------

export function blendedValuationBridge(profile: CompanyProfile): GenericBlendedBridge {
  const dcfResult = valueWithAssumptions(profile);
  const scenarios = runScenarios(profile);
  const rel = relativeValuation(profile);
  const evEbitda = rel.find(r => r.method === 'EV/EBITDA')!;
  const pe = rel.find(r => r.method === 'P/E')!;
  const ddm = twoStageDDM(profile);

  const methods = [
    { label: 'DCF (Base)', perShareValue: dcfResult.perShareValue, weight: 0.40, color: '#1D4ED8' },
    { label: 'Prob-weighted', perShareValue: scenarios.expectedValue, weight: 0.20, color: '#0F766E' },
    { label: 'EV/EBITDA Peers', perShareValue: evEbitda.perShareValue, weight: 0.15, color: '#B45309' },
    { label: 'P/E Peers', perShareValue: pe.perShareValue, weight: 0.15, color: '#7C3AED' },
    { label: 'Two-Stage DDM', perShareValue: ddm.perShareValue, weight: 0.10, color: '#DC2626' },
  ];

  const blended = methods.reduce((s, m) => s + m.perShareValue * m.weight, 0);
  const upside = ((blended - profile.currentMarketPrice) / profile.currentMarketPrice) * 100;

  return {
    methods,
    blendedPerShare: round(blended, 1),
    marketPrice: profile.currentMarketPrice,
    upside: round(upside, 1),
  };
}

// ---------------------------------------------------------------------------
// Convenience combined snapshot
// ---------------------------------------------------------------------------

export interface CompanySnapshot {
  profile: CompanyProfile;
  projection: GenericProjectionYear[];
  dcf: GenericDCFResult;
  scenarios: GenericScenarioSummary;
  reverseDCF: GenericReverseDCFResult;
  relative: GenericRelativeValResult[];
  ddmGordon: GenericDDMResult;
  ddmTwoStage: GenericDDMResult;
  bridge: GenericBlendedBridge;
  eva: GenericEvaYear[];
  roic: GenericRoicDecomposition[];
}

export function buildCompanySnapshot(profile: CompanyProfile): CompanySnapshot {
  const projection = projectCompany(profile);
  const dcfRes = dcf(profile, projection);
  const scenarios = runScenarios(profile);
  const reverseDCFRes = reverseDCF(profile);
  const relative = relativeValuation(profile);
  const ddmGordon = gordonGrowthDDM(profile);
  const ddmTwoStage = twoStageDDM(profile);
  const bridge = blendedValuationBridge(profile);
  const eva = computeEvaSeries(profile, projection);
  const roic = computeRoicDecomposition(profile, projection);
  return {
    profile,
    projection,
    dcf: dcfRes,
    scenarios,
    reverseDCF: reverseDCFRes,
    relative,
    ddmGordon,
    ddmTwoStage,
    bridge,
    eva,
    roic,
  };
}
