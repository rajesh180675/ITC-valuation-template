// ──────────────────────────────────────────────────────────────────────────────
// Indian IT Services — State-of-the-Art Valuation Engine (pure TS, no I/O)
// Methods: 3-stage DCF · Reverse DCF · DDM · Monte Carlo · Tornado · AI-Overlay
// ──────────────────────────────────────────────────────────────────────────────

// ───────────────────────────── Types ─────────────────────────────────────────

/** Per-share / per-company baseline used by every method. All currency in INR Cr unless noted. */
export interface CompanyBaseline {
  ticker: string;
  name: string;
  /** Current market price, INR per share */
  cmp: number;
  /** Shares outstanding (Cr) */
  shares: number;
  /** Net cash (negative = net debt), INR Cr */
  netCash: number;
  /** Latest reported FY revenue, INR Cr */
  baseRevenue: number;
  /** Latest reported EBIT margin (%) — used as starting margin for fade */
  baseEBITMargin: number;
  /** Effective cash tax rate (%) */
  taxRate: number;
  /** D&A as % of revenue (steady-state) */
  daPctRevenue: number;
  /** Maintenance + growth capex as % of revenue (steady-state) */
  capexPctRevenue: number;
  /** Working-capital investment as % of incremental revenue */
  wcPctIncRevenue: number;
  /** Trailing 4-quarter EPS, INR */
  trailingEPS: number;
  /** Trailing dividend per share, INR */
  trailingDPS: number;
  /** Buyback yield (%) — return-of-capital that supplements DPS */
  buybackYield: number;
  /** Long-run sustainable ROE (%) — used in DDM Gordon */
  sustainableROE: number;
}

/** 3-stage DCF parameters. */
export interface ThreeStageDCFParams {
  /** Stage-1 explicit growth (%) */
  g1: number;
  /** Stage-1 length (years) */
  n1: number;
  /** Stage-2 (fade) terminal growth at end of fade (%) */
  g2: number;
  /** Stage-2 length (years) */
  n2: number;
  /** Stage-3 (terminal) perpetuity growth (%) */
  gT: number;
  /** Operating margin at end of stage-1 (%) — fades from base to this */
  marginEnd: number;
  /** Operating margin in terminal (%) */
  marginTerminal: number;
  /** Cost of equity / WACC (%) */
  wacc: number;
}

export interface DCFOutput {
  /** Year-by-year free cash flow projection */
  fcfPath: { year: number; revenue: number; ebit: number; ebitMargin: number; nopat: number; reinvest: number; fcf: number; pvFCF: number; }[];
  /** Sum of PV of explicit + fade FCFs */
  pvExplicit: number;
  /** PV of terminal value */
  pvTerminal: number;
  /** Enterprise value */
  ev: number;
  /** Equity value */
  equityValue: number;
  /** Per-share fair value */
  fairValue: number;
  /** Margin of safety vs CMP, +ve = undervalued */
  marginOfSafety: number;
  /** Upside / downside vs CMP (%) */
  upside: number;
  /** Implied EV / FY1 revenue */
  impliedEVRev: number;
  /** Implied EV / FY1 EBIT */
  impliedEVEBIT: number;
}

export interface ReverseDCFInput {
  /** What CMP is the market paying? */
  cmp: number;
  /** Solve for: 'g1' (stage-1 growth) or 'margin' (terminal margin) */
  solveFor: 'g1' | 'marginTerminal';
  /** All other 3-stage parameters fixed */
  fixedParams: ThreeStageDCFParams;
}

export interface ReverseDCFOutput {
  impliedValue: number;
  /** What rate / margin the market is implying (%) */
  implied: number;
  /** Convergence iterations */
  iterations: number;
  /** Residual error after solve */
  residual: number;
}

export interface DDMParams {
  /** Cost of equity (%) */
  ke: number;
  /** Stage-1 dividend growth (%) */
  g1: number;
  /** Stage-1 length (years) */
  n1: number;
  /** Stage-2 dividend growth (%) */
  g2: number;
  /** Stage-2 length (years) */
  n2: number;
  /** Terminal dividend growth (%) — gordon */
  gT: number;
  /** Buyback yield treated as supplemental cash distribution (%) */
  buybackYield: number;
}

export interface DDMOutput {
  pvDividends: number;
  pvTerminal: number;
  fairValue: number;
  upside: number;
  /** Implied dividend yield */
  impliedDY: number;
}

export interface MonteCarloInputs {
  /** Triangular distribution: low/mode/high in % */
  g1: { low: number; mode: number; high: number };
  marginEnd: { low: number; mode: number; high: number };
  marginTerminal: { low: number; mode: number; high: number };
  wacc: { low: number; mode: number; high: number };
  gT: { low: number; mode: number; high: number };
  /** Fixed parameters */
  fixed: { n1: number; n2: number; g2: number };
  /** Number of trials */
  trials: number;
  /** RNG seed */
  seed: number;
}

export interface MonteCarloOutput {
  values: number[]; // per-share fair value samples
  mean: number;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  stdev: number;
  probAboveCMP: number;
  bins: { x: number; count: number }[];
}

export interface AIOverlayInputs {
  /** % uplift in productivity (pricing pressure) — typically -8% to +5% */
  productivityUplift: number;
  /** Share of productivity passed through to clients (0–100%) */
  passThrough: number;
  /** Year when AI repricing fully bites (1–5) */
  crossoverYear: number;
  /** AI-services revenue growth (%) — replaces some traditional revenue */
  aiServicesGrowth: number;
  /** % of FY1 revenue currently AI-services */
  aiSharePct: number;
  /** Net margin uplift from AI-led automation (basis points) */
  marginUpliftBps: number;
}

export interface AIOverlayOutput {
  baseRevenue5Y: number;
  adjustedRevenue5Y: number;
  baseMarginExit: number;
  adjustedMarginExit: number;
  baseFairValue: number;
  adjustedFairValue: number;
  netImpactPct: number;
}

export interface TornadoVar {
  name: string;
  delta: number; // % impact (high - low) / base
  high: number;
  low: number;
  base: number;
}

export interface ScenarioCase {
  name: 'Bull' | 'Base' | 'Bear' | 'Stress' | 'Black Swan';
  probability: number; // 0–100
  /** Stage-1 growth (%) */
  g1: number;
  /** Terminal growth (%) */
  gT: number;
  /** Terminal EBIT margin (%) */
  marginTerminal: number;
  /** WACC override (%) */
  wacc: number;
  /** Exit EV/EBIT multiple — used as cross-check */
  exitMultiple: number;
  narrative: string;
}

export interface ScenarioResult extends ScenarioCase {
  fairValue: number;
  upside: number;
  weightedFV: number;
}

// ──────────────────────────── Helpers ─────────────────────────────────────────

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** Mulberry32 — fast deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Triangular distribution sample. */
export function triangular(rng: () => number, low: number, mode: number, high: number): number {
  const u = rng();
  const c = (mode - low) / (high - low);
  if (u < c) return low + Math.sqrt(u * (high - low) * (mode - low));
  return high - Math.sqrt((1 - u) * (high - low) * (high - mode));
}

/** Linear fade between start and end over n periods. */
function fade(start: number, end: number, n: number, t: number): number {
  if (n <= 1) return end;
  return start + ((end - start) * t) / (n - 1);
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = clamp(Math.floor((p / 100) * sorted.length), 0, sorted.length - 1);
  return sorted[idx];
}

// ─────────────────────── 3-Stage DCF (the workhorse) ─────────────────────────

/**
 * 3-stage DCF with linear margin fade, reinvestment-based FCF,
 * and convergence to terminal growth/margin/ROIC.
 */
export function threeStageDCF(b: CompanyBaseline, p: ThreeStageDCFParams): DCFOutput {
  const totalYears = p.n1 + p.n2;
  const fcfPath: DCFOutput['fcfPath'] = [];

  let revenue = b.baseRevenue;
  let prevRevenue = b.baseRevenue;
  let pvExplicit = 0;

  // Stage 1: explicit growth, margin fades from base → marginEnd over n1 years
  for (let i = 1; i <= p.n1; i++) {
    revenue = prevRevenue * (1 + p.g1 / 100);
    const margin = fade(b.baseEBITMargin, p.marginEnd, p.n1, i - 1);
    const ebit = revenue * (margin / 100);
    const nopat = ebit * (1 - b.taxRate / 100);
    const da = revenue * (b.daPctRevenue / 100);
    const capex = revenue * (b.capexPctRevenue / 100);
    const wc = (revenue - prevRevenue) * (b.wcPctIncRevenue / 100);
    const fcf = nopat + da - capex - wc;
    const pvFCF = fcf / Math.pow(1 + p.wacc / 100, i);
    fcfPath.push({ year: i, revenue, ebit, ebitMargin: margin, nopat, reinvest: capex - da + wc, fcf, pvFCF });
    pvExplicit += pvFCF;
    prevRevenue = revenue;
  }

  // Stage 2: growth fades from g1 → g2; margin fades from marginEnd → marginTerminal
  for (let i = 1; i <= p.n2; i++) {
    const yr = p.n1 + i;
    const growth = fade(p.g1, p.g2, p.n2, i - 1);
    revenue = prevRevenue * (1 + growth / 100);
    const margin = fade(p.marginEnd, p.marginTerminal, p.n2, i - 1);
    const ebit = revenue * (margin / 100);
    const nopat = ebit * (1 - b.taxRate / 100);
    const da = revenue * (b.daPctRevenue / 100);
    const capex = revenue * (b.capexPctRevenue / 100);
    const wc = (revenue - prevRevenue) * (b.wcPctIncRevenue / 100);
    const fcf = nopat + da - capex - wc;
    const pvFCF = fcf / Math.pow(1 + p.wacc / 100, yr);
    fcfPath.push({ year: yr, revenue, ebit, ebitMargin: margin, nopat, reinvest: capex - da + wc, fcf, pvFCF });
    pvExplicit += pvFCF;
    prevRevenue = revenue;
  }

  // Terminal: Gordon growth on the last FCF
  const lastFCF = fcfPath[fcfPath.length - 1].fcf * (1 + p.gT / 100);
  const tvDiscount = Math.max(p.wacc - p.gT, 0.5) / 100;
  const tv = lastFCF / tvDiscount;
  const pvTerminal = tv / Math.pow(1 + p.wacc / 100, totalYears);

  const ev = pvExplicit + pvTerminal;
  const equityValue = ev + b.netCash;
  const fairValue = equityValue / b.shares;
  const upside = ((fairValue - b.cmp) / b.cmp) * 100;
  const marginOfSafety = upside; // alias
  const impliedEVRev = ev / fcfPath[0].revenue;
  const impliedEVEBIT = ev / fcfPath[0].ebit;

  return { fcfPath, pvExplicit, pvTerminal, ev, equityValue, fairValue, marginOfSafety, upside, impliedEVRev, impliedEVEBIT };
}

// ─────────────────────── Reverse DCF (bisection solver) ───────────────────────

export function reverseDCF(b: CompanyBaseline, input: ReverseDCFInput): ReverseDCFOutput {
  const { cmp, solveFor, fixedParams } = input;
  let lo = solveFor === 'g1' ? -5 : 5;
  let hi = solveFor === 'g1' ? 30 : 35;
  let mid = 0;
  let i = 0;
  let residual = 0;

  while (i < 60 && hi - lo > 0.005) {
    mid = (lo + hi) / 2;
    const params = { ...fixedParams, [solveFor]: mid } as ThreeStageDCFParams;
    const out = threeStageDCF(b, params);
    residual = out.fairValue - cmp;
    if (residual > 0) hi = mid;
    else lo = mid;
    i++;
  }

  const finalParams = { ...fixedParams, [solveFor]: mid } as ThreeStageDCFParams;
  const out = threeStageDCF(b, finalParams);
  return { impliedValue: out.fairValue, implied: mid, iterations: i, residual };
}

// ──────────────────────── 2-Stage DDM (with buybacks) ─────────────────────────

export function ddm(b: CompanyBaseline, p: DDMParams): DDMOutput {
  let div = b.trailingDPS * (1 + p.g1 / 100);
  let pv = 0;
  for (let i = 1; i <= p.n1; i++) {
    pv += div / Math.pow(1 + p.ke / 100, i);
    div = div * (1 + p.g1 / 100);
  }
  let pvStage2 = 0;
  for (let i = 1; i <= p.n2; i++) {
    div = div * (1 + p.g2 / 100);
    pvStage2 += div / Math.pow(1 + p.ke / 100, p.n1 + i);
  }
  const terminalDiv = div * (1 + p.gT / 100);
  const tv = terminalDiv / Math.max(p.ke / 100 - p.gT / 100, 0.005);
  const pvTerminal = tv / Math.pow(1 + p.ke / 100, p.n1 + p.n2);

  // Augment dividend with buyback yield (treated as supplemental yield on price)
  const buybackBoost = (b.cmp * p.buybackYield) / 100;
  const buybackPV = buybackBoost * ((1 - Math.pow(1 + p.g1 / 100, p.n1) / Math.pow(1 + p.ke / 100, p.n1)) / (Math.max(p.ke - p.g1, 0.5) / 100));

  const fairValue = pv + pvStage2 + pvTerminal + buybackPV;
  const upside = ((fairValue - b.cmp) / b.cmp) * 100;
  const impliedDY = (b.trailingDPS / fairValue) * 100;

  return { pvDividends: pv + pvStage2 + buybackPV, pvTerminal, fairValue, upside, impliedDY };
}

// ───────────────────────── Monte Carlo Simulation ─────────────────────────────

export function monteCarlo(b: CompanyBaseline, mc: MonteCarloInputs): MonteCarloOutput {
  const rng = mulberry32(mc.seed);
  const values: number[] = new Array(mc.trials);
  let aboveCMP = 0;

  for (let i = 0; i < mc.trials; i++) {
    const params: ThreeStageDCFParams = {
      g1: triangular(rng, mc.g1.low, mc.g1.mode, mc.g1.high),
      n1: mc.fixed.n1,
      g2: mc.fixed.g2,
      n2: mc.fixed.n2,
      gT: triangular(rng, mc.gT.low, mc.gT.mode, mc.gT.high),
      marginEnd: triangular(rng, mc.marginEnd.low, mc.marginEnd.mode, mc.marginEnd.high),
      marginTerminal: triangular(rng, mc.marginTerminal.low, mc.marginTerminal.mode, mc.marginTerminal.high),
      wacc: triangular(rng, mc.wacc.low, mc.wacc.mode, mc.wacc.high),
    };
    const fv = threeStageDCF(b, params).fairValue;
    values[i] = fv;
    if (fv > b.cmp) aboveCMP++;
  }

  const sorted = [...values].sort((a, c) => a - c);
  const mean = values.reduce((s, x) => s + x, 0) / values.length;
  const variance = values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length;

  // Histogram bins (40 buckets across P5–P95 to avoid extreme outliers stretching scale)
  const lo = percentile(sorted, 5);
  const hi = percentile(sorted, 95);
  const binCount = 40;
  const binW = Math.max((hi - lo) / binCount, 0.001);
  const bins: { x: number; count: number }[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({ x: lo + i * binW + binW / 2, count: 0 });
  }
  for (const v of values) {
    if (v < lo || v > hi) continue;
    const idx = clamp(Math.floor((v - lo) / binW), 0, binCount - 1);
    bins[idx].count++;
  }

  return {
    values,
    mean,
    median: percentile(sorted, 50),
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    stdev: Math.sqrt(variance),
    probAboveCMP: (aboveCMP / mc.trials) * 100,
    bins,
  };
}

// ───────────────────────── AI Disruption Overlay ──────────────────────────────

export function applyAIOverlay(
  b: CompanyBaseline,
  base: ThreeStageDCFParams,
  ai: AIOverlayInputs
): AIOverlayOutput {
  // Adjust Stage-1 growth: AI pass-through compresses growth; AI services boost it
  const repricingDrag = (ai.productivityUplift * ai.passThrough) / 100; // %
  const aiContribution = ai.aiSharePct * (ai.aiServicesGrowth / 100); // weighted contribution
  const traditionalContribution = (100 - ai.aiSharePct) * (base.g1 / 100);
  const blendedG1 = (aiContribution + traditionalContribution) - repricingDrag * (1 - 0.2 * Math.max(0, ai.crossoverYear - 1) / 4);

  // Margin uplift from AI-led automation in stage-1 (bps), then sustained in terminal
  const adjustedMarginEnd = base.marginEnd + ai.marginUpliftBps / 100;
  const adjustedMarginTerminal = base.marginTerminal + ai.marginUpliftBps / 100;

  const baseOut = threeStageDCF(b, base);
  const adjOut = threeStageDCF(b, {
    ...base,
    g1: blendedG1,
    marginEnd: adjustedMarginEnd,
    marginTerminal: adjustedMarginTerminal,
  });

  return {
    baseRevenue5Y: baseOut.fcfPath[Math.min(4, baseOut.fcfPath.length - 1)].revenue,
    adjustedRevenue5Y: adjOut.fcfPath[Math.min(4, adjOut.fcfPath.length - 1)].revenue,
    baseMarginExit: baseOut.fcfPath[Math.min(4, baseOut.fcfPath.length - 1)].ebitMargin,
    adjustedMarginExit: adjOut.fcfPath[Math.min(4, adjOut.fcfPath.length - 1)].ebitMargin,
    baseFairValue: baseOut.fairValue,
    adjustedFairValue: adjOut.fairValue,
    netImpactPct: ((adjOut.fairValue - baseOut.fairValue) / baseOut.fairValue) * 100,
  };
}

// ─────────────────── Tornado Sensitivity (top-N drivers) ─────────────────────

export function tornado(b: CompanyBaseline, base: ThreeStageDCFParams, deltas: { name: keyof ThreeStageDCFParams; pct: number }[]): TornadoVar[] {
  const baseFV = threeStageDCF(b, base).fairValue;
  return deltas.map(d => {
    const high: ThreeStageDCFParams = { ...base, [d.name]: (base[d.name] as number) * (1 + d.pct / 100) };
    const low: ThreeStageDCFParams = { ...base, [d.name]: (base[d.name] as number) * (1 - d.pct / 100) };
    const hiFV = threeStageDCF(b, high).fairValue;
    const loFV = threeStageDCF(b, low).fairValue;
    return {
      name: String(d.name),
      delta: ((hiFV - loFV) / baseFV) * 100,
      high: hiFV,
      low: loFV,
      base: baseFV,
    };
  }).sort((a, c) => Math.abs(c.delta) - Math.abs(a.delta));
}

// ──────────────────── 5-Scenario Tree (Bull/Base/Bear/Stress/BS) ──────────────

export function runScenarios(b: CompanyBaseline, base: ThreeStageDCFParams, scenarios: ScenarioCase[]): { results: ScenarioResult[]; weightedFV: number; weightedUpside: number; } {
  const results: ScenarioResult[] = scenarios.map(s => {
    const params: ThreeStageDCFParams = {
      ...base,
      g1: s.g1,
      gT: s.gT,
      marginTerminal: s.marginTerminal,
      wacc: s.wacc,
    };
    const out = threeStageDCF(b, params);
    return {
      ...s,
      fairValue: out.fairValue,
      upside: out.upside,
      weightedFV: (out.fairValue * s.probability) / 100,
    };
  });
  const weightedFV = results.reduce((s, r) => s + r.weightedFV, 0);
  const weightedUpside = ((weightedFV - b.cmp) / b.cmp) * 100;
  return { results, weightedFV, weightedUpside };
}

// ───────────────────── IRR & Margin-of-Safety Engine ──────────────────────────

export function impliedIRR(currentPrice: number, exitPrice: number, years: number, dividendStreamYearly: number): number {
  // Solve IRR for: -P + Σ(div / (1+r)^t) + exit/(1+r)^N = 0
  let lo = -0.5, hi = 1.0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    let npv = -currentPrice;
    for (let t = 1; t <= years; t++) npv += dividendStreamYearly / Math.pow(1 + mid, t);
    npv += exitPrice / Math.pow(1 + mid, years);
    if (npv > 0) lo = mid; else hi = mid;
    if (Math.abs(hi - lo) < 1e-5) break;
  }
  return ((lo + hi) / 2) * 100;
}

export interface MoSDecision {
  status: 'STRONG BUY' | 'BUY' | 'ACCUMULATE' | 'HOLD' | 'TRIM' | 'AVOID';
  color: string;
  reasoning: string;
}

export function decisionFromMoS(mos: number): MoSDecision {
  if (mos > 30) return { status: 'STRONG BUY', color: '#10B981', reasoning: 'Significant margin of safety; multi-year compounder at deep discount.' };
  if (mos > 15) return { status: 'BUY', color: '#22C55E', reasoning: 'Comfortable margin of safety; quality-at-reasonable-price.' };
  if (mos > 5)  return { status: 'ACCUMULATE', color: '#84CC16', reasoning: 'Mild discount; size into volatility.' };
  if (mos > -5) return { status: 'HOLD', color: '#EAB308', reasoning: 'Fair value; ride the compounding, do not add aggressively.' };
  if (mos > -15) return { status: 'TRIM', color: '#F97316', reasoning: 'Modestly overvalued; trim into strength.' };
  return { status: 'AVOID', color: '#EF4444', reasoning: 'Overvalued; risk-reward unfavourable until valuation resets.' };
}

export interface MethodTriangulation {
  dcf: number;
  ddm: number;
  reverseImplied: number;
  scenarioWeighted: number;
  monteCarloMedian: number;
  blended: number;
  weights: { dcf: number; ddm: number; scenario: number; mc: number };
}

export function triangulate(weights: { dcf: number; ddm: number; scenario: number; mc: number }, values: { dcf: number; ddm: number; scenario: number; mc: number }): number {
  const total = weights.dcf + weights.ddm + weights.scenario + weights.mc;
  return (
    (values.dcf * weights.dcf + values.ddm * weights.ddm + values.scenario * weights.scenario + values.mc * weights.mc) /
    Math.max(total, 1e-6)
  );
}
