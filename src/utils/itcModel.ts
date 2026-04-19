import type {
  PeerMultiple,
  ProjectionAssumptions,
  SOTPValuation,
  ValuationScenario,
  YearlyData,
} from '@/data/itcData';
import { sharesOutstanding } from '@/data/itcData';

export const MODEL_ASSUMPTIONS = Object.freeze({
  projectionYears: 7,
  cigaretteLongTermElasticity: -0.6,
  cigaretteShortTermElasticity: -0.4,
  cigarettePassThroughRate: 85, // % of tax hike passed through to consumers in the tax simulator
  cigaretteMarginPressureThreshold: 16,
  cigaretteMarginPressurePerPoint: 0.5,
  cigaretteMarginFloor: 55,
  hotelsEbitMargin: 0.27,
  paperEbitMargin: 0.15, // compressed from wood prices + import dumping
  agriEbitMargin: 0.09,
  terminalCashTaxRate: 0.96,
  depreciationPercentOfRevenue: 2.4,
  maxCigaretteVolumeIndex: 115,
  minCigaretteVolumeIndex: 50,
  startingYear: 2025, // FY25 actuals are the jump-off base
  fmcgMarginFloor: 8,
  infotechStartingEbit: 680,
  infotechGrowthFactor: 0.7,
  sensitivityStep: 1,
  // Reverse DCF solver bounds
  reverseGrowthMin: -10,
  reverseGrowthMax: 20,
  reverseSolverTolerance: 0.5,
  reverseSolverMaxIter: 60,
  // Monte Carlo defaults
  monteCarloDraws: 500,
  monteCarloSeed: 42,
} as const);

export interface ProjectionDetail {
  year: string;
  fy: string;
  totalRevenue: number;
  cigaretteRevenue: number;
  fmcgRevenue: number;
  hotelsRevenue: number;
  paperRevenue: number;
  agriRevenue: number;
  cigarettePriceIncrease: number;
  cigaretteVolumeGrowth: number;
  cigaretteRevenueGrowth: number;
  cigaretteEbitMargin: number;
  fmcgEbitdaMargin: number;
  cigaretteEbit: number;
  fmcgEbit: number;
  hotelsEbit: number;
  paperEbit: number;
  agriEbit: number;
  infotechEbit: number;
  ebit: number;
  depreciation: number;
  ebitda: number;
  nopat: number;
  capex: number;
  workingCapitalInvestment: number;
  fcff: number;
  terminalYear: boolean;
  summary: YearlyData;
}

export interface DCFResult {
  enterpriseValue: number;
  equityValue: number;
  perShareValue: number;
  pvCashFlows: number[];
  terminalValue: number;
  pvTerminalValue: number;
  terminalValueWeight: number;
  explicitForecastWeight: number;
  impliedExitEbitdaMultiple: number;
  midYearConvention: boolean;
  isValid: boolean;
  validationErrors: string[];
}

export interface SOTPSummary {
  totalBase: number;
  totalLow: number;
  totalHigh: number;
  netCash: number;
  perShareBase: number;
  perShareLow: number;
  perShareHigh: number;
}

export interface DynamicSotpLine {
  segment: string;
  ebit: number;
  multiple: number;
  multipleLow: number;
  multipleHigh: number;
  value: number;
  valueLow: number;
  valueHigh: number;
  basis: string;
}

export interface DynamicSotpSummary extends SOTPSummary {
  conglomerateDiscount: number;
  discountValueBase: number;
  discountValueLow: number;
  discountValueHigh: number;
  lines: DynamicSotpLine[];
}

export interface TaxImpactResult {
  priceIncrease: number;
  volumeImpactShort: number;
  volumeImpactLong: number;
  revenueImpact: number;
  newCigRevenue: number;
  newEbitMargin: number;
  newCigEbit: number;
  stockReactionEstimate: number;
}

export interface SensitivityPoint {
  wacc: number;
  terminalGrowth: number;
  perShareValue: number | null;
  isBase: boolean;
}

export interface ScenarioResult {
  id: string;
  label: string;
  probability: number;
  description: string;
  color: string;
  assumptions: ProjectionAssumptions;
  dcfPerShare: number;
  sotpPerShare: number;
  blendedPerShare: number; // 60% DCF + 40% SOTP reconciliation
  terminalValueWeight: number;
  implicitTerminalMultiple: number;
  isValid: boolean;
}

export interface ScenarioAnalysisResult {
  scenarios: ScenarioResult[];
  expectedValuePerShare: number;
  expectedValueDcfOnly: number;
  expectedValueSotpOnly: number;
  bearPerShare: number;
  basePerShare: number;
  bullPerShare: number;
  upsideVsMarket: number; // % upside/downside relative to market price
}

export interface MonteCarloResult {
  samples: number;
  perShareValues: number[];
  mean: number;
  stdDev: number;
  median: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
  probUpside: number; // P(fair > market)
  histogram: Array<{ bucket: string; count: number; low: number; high: number }>;
}

export interface MonteCarloConfig {
  draws?: number;
  seed?: number;
  rangeOverride?: Partial<Record<keyof ProjectionAssumptions, { low: number; mid: number; high: number }>>;
}

export interface ReverseDCFResult {
  currentPrice: number;
  impliedCigaretteGrowth: number;
  baseGrowthUsed: number;
  iterations: number;
  converged: boolean;
  dcfAtImplied: number;
  description: string;
}

export interface RelativeValuationResult {
  method: 'EV/EBITDA' | 'P/E' | 'EV/Sales';
  appliedMultiple: number;
  peerAverage: number;
  peerMedian: number;
  peerMin: number;
  peerMax: number;
  discountVsPeers: number; // % discount (negative) / premium (positive)
  impliedEnterpriseValue: number;
  impliedEquityValue: number;
  perShareValue: number;
}

export interface PeerPercentileRank {
  ticker: string;
  name: string;
  category: PeerMultiple['category'];
  evEbitdaRank: number;
  peRank: number;
  dividendYieldRank: number;
  roicRank: number;
  compositeRank: number;
}

export interface DividendDiscountResult {
  method: 'Gordon' | 'Two-Stage';
  currentDps: number;
  nearTermGrowth: number;
  terminalGrowth: number;
  requiredReturn: number;
  perShareValue: number;
  payoutRatio: number;
  sustainabilityScore: number; // 0-100; higher = safer
  notes: string;
}

export interface EvaYear {
  year: string;
  fy: string;
  nopat: number;
  investedCapital: number;
  capitalCharge: number;
  eva: number;
  roic: number;
  roicSpread: number; // ROIC - WACC
}

export interface RoicDecomposition {
  year: string;
  nopatMargin: number;
  capitalTurnover: number;
  roic: number;
}

export interface BlendedValuationBridge {
  methods: Array<{
    label: string;
    perShareValue: number;
    weight: number;
    color: string;
  }>;
  blendedPerShare: number;
  marketPrice: number;
  upside: number;
}

// ------------------------------- helpers ---------------------------------

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mergeAssumptions(
  base: ProjectionAssumptions,
  overrides: Partial<ProjectionAssumptions> | undefined,
): ProjectionAssumptions {
  return { ...base, ...(overrides ?? {}) };
}

// Deterministic pseudo-random generator (Mulberry32)
function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Sample from a triangular distribution with given lower, mode, upper.
function sampleTriangular(rng: () => number, low: number, mode: number, high: number): number {
  const u = rng();
  const f = (mode - low) / (high - low);
  if (u < f) {
    return low + Math.sqrt(u * (high - low) * (mode - low));
  }
  return high - Math.sqrt((1 - u) * (high - low) * (high - mode));
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = clamp(Math.round((p / 100) * (sortedValues.length - 1)), 0, sortedValues.length - 1);
  return sortedValues[idx];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], meanValue: number): number {
  if (values.length === 0) return 0;
  const v = values.reduce((acc, x) => acc + (x - meanValue) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// --------------------------- validation ----------------------------------

function validateProjectionAssumptions(assumptions: ProjectionAssumptions): void {
  const numericFields: Array<[keyof ProjectionAssumptions, string]> = [
    ['cigaretteRevenueGrowth', 'cigaretteRevenueGrowth'],
    ['cigaretteVolumeGrowth', 'cigaretteVolumeGrowth'],
    ['fmcgRevenueGrowth', 'fmcgRevenueGrowth'],
    ['hotelsRevenueGrowth', 'hotelsRevenueGrowth'],
    ['paperRevenueGrowth', 'paperRevenueGrowth'],
    ['agriRevenueGrowth', 'agriRevenueGrowth'],
    ['cigaretteEbitMargin', 'cigaretteEbitMargin'],
    ['fmcgEbitdaMargin', 'fmcgEbitdaMargin'],
    ['fmcgMarginTarget', 'fmcgMarginTarget'],
    ['taxRate', 'taxRate'],
    ['capexPercent', 'capexPercent'],
    ['workingCapitalPercent', 'workingCapitalPercent'],
    ['terminalGrowth', 'terminalGrowth'],
    ['wacc', 'wacc'],
    ['annualNccdHike', 'annualNccdHike'],
    ['cigarettePassThroughRate', 'cigarettePassThroughRate'],
    ['cigaretteTaxElasticity', 'cigaretteTaxElasticity'],
    ['illicitTradeDrag', 'illicitTradeDrag'],
    ['conglomerateDiscount', 'conglomerateDiscount'],
  ];

  for (const [field, label] of numericFields) {
    assertFiniteNumber(assumptions[field], label);
  }

  if (assumptions.taxRate < 0 || assumptions.taxRate > 100) {
    throw new Error('taxRate must be between 0 and 100.');
  }

  if (assumptions.capexPercent < 0 || assumptions.capexPercent > 100) {
    throw new Error('capexPercent must be between 0 and 100.');
  }

  if (assumptions.workingCapitalPercent < 0 || assumptions.workingCapitalPercent > 20) {
    throw new Error('workingCapitalPercent must be between 0 and 20.');
  }

  if (assumptions.cigarettePassThroughRate < 0 || assumptions.cigarettePassThroughRate > 120) {
    throw new Error('cigarettePassThroughRate must be between 0 and 120.');
  }

  if (assumptions.fmcgMarginTarget < assumptions.fmcgEbitdaMargin) {
    throw new Error('fmcgMarginTarget must be greater than or equal to fmcgEbitdaMargin.');
  }

  if (assumptions.wacc <= 0) {
    throw new Error('wacc must be greater than 0.');
  }

  if (assumptions.terminalGrowth < 0) {
    throw new Error('terminalGrowth must be non-negative.');
  }
}

function validateProjectionInput(baseData: YearlyData): void {
  const numericFields: Array<[keyof YearlyData, string]> = [
    ['revenue', 'revenue'],
    ['cigaretteRevenue', 'cigaretteRevenue'],
    ['fmcgRevenue', 'fmcgRevenue'],
    ['hotelsRevenue', 'hotelsRevenue'],
    ['paperRevenue', 'paperRevenue'],
    ['agriRevenue', 'agriRevenue'],
    ['ebitda', 'ebitda'],
    ['netProfit', 'netProfit'],
    ['eps', 'eps'],
    ['dps', 'dps'],
    ['totalAssets', 'totalAssets'],
    ['netDebt', 'netDebt'],
    ['cigaretteEbitMargin', 'cigaretteEbitMargin'],
    ['fmcgEbitdaMargin', 'fmcgEbitdaMargin'],
    ['freeCashFlow', 'freeCashFlow'],
    ['stockPriceHigh', 'stockPriceHigh'],
    ['stockPriceLow', 'stockPriceLow'],
    ['cigaretteVolumeIndex', 'cigaretteVolumeIndex'],
  ];

  for (const [field, label] of numericFields) {
    assertFiniteNumber(baseData[field] as number, label);
  }
}

function buildDynamicSotpLine(line: SOTPValuation, projectedEbit: number): DynamicSotpLine {
  return {
    ...line,
    ebit: round(projectedEbit),
    value: round(projectedEbit * line.multiple),
    valueLow: round(projectedEbit * line.multipleLow),
    valueHigh: round(projectedEbit * line.multipleHigh),
  };
}

// --------------------------- projections ---------------------------------

export function generateProjectionDetails(
  assumptions: ProjectionAssumptions,
  baseData: YearlyData,
): ProjectionDetail[] {
  validateProjectionAssumptions(assumptions);
  validateProjectionInput(baseData);

  const details: ProjectionDetail[] = [];
  let prev = { ...baseData };
  let prevInfotechEbit: number = MODEL_ASSUMPTIONS.infotechStartingEbit;

  for (let i = 1; i <= MODEL_ASSUMPTIONS.projectionYears; i++) {
    const yearNum = MODEL_ASSUMPTIONS.startingYear + i;
    const progress = i / MODEL_ASSUMPTIONS.projectionYears;
    const priceIncrease = assumptions.annualNccdHike * (assumptions.cigarettePassThroughRate / 100);
    const taxVolumeImpact = priceIncrease * assumptions.cigaretteTaxElasticity;
    const cigaretteVolumeGrowth =
      assumptions.cigaretteVolumeGrowth + taxVolumeImpact - assumptions.illicitTradeDrag;
    const cigaretteRevenueGrowth =
      assumptions.cigaretteRevenueGrowth +
      assumptions.cigaretteVolumeGrowth +
      priceIncrease +
      taxVolumeImpact -
      assumptions.illicitTradeDrag;

    const cigaretteRevenue = prev.cigaretteRevenue * (1 + cigaretteRevenueGrowth / 100);
    const fmcgRevenue = prev.fmcgRevenue * (1 + assumptions.fmcgRevenueGrowth / 100);
    const hotelsRevenue = prev.hotelsRevenue * (1 + assumptions.hotelsRevenueGrowth / 100);
    const paperRevenue = prev.paperRevenue * (1 + assumptions.paperRevenueGrowth / 100);
    const agriRevenue = prev.agriRevenue * (1 + assumptions.agriRevenueGrowth / 100);
    const totalRevenue = cigaretteRevenue + fmcgRevenue + hotelsRevenue + paperRevenue + agriRevenue;

    const marginPressure =
      assumptions.annualNccdHike > MODEL_ASSUMPTIONS.cigaretteMarginPressureThreshold
        ? (assumptions.annualNccdHike - MODEL_ASSUMPTIONS.cigaretteMarginPressureThreshold) *
          MODEL_ASSUMPTIONS.cigaretteMarginPressurePerPoint
        : 0;
    const cigaretteEbitMargin = clamp(
      assumptions.cigaretteEbitMargin - marginPressure,
      MODEL_ASSUMPTIONS.cigaretteMarginFloor,
      75,
    );
    const fmcgEbitdaMargin = round(
      assumptions.fmcgEbitdaMargin +
        (assumptions.fmcgMarginTarget - assumptions.fmcgEbitdaMargin) * progress,
      1,
    );

    const cigaretteEbit = cigaretteRevenue * (cigaretteEbitMargin / 100);
    const fmcgEbit = fmcgRevenue * (Math.max(MODEL_ASSUMPTIONS.fmcgMarginFloor, fmcgEbitdaMargin) / 100);
    const hotelsEbit = hotelsRevenue * MODEL_ASSUMPTIONS.hotelsEbitMargin;
    const paperEbit = paperRevenue * MODEL_ASSUMPTIONS.paperEbitMargin;
    const agriEbit = agriRevenue * MODEL_ASSUMPTIONS.agriEbitMargin;
    const infotechGrowth = Math.max(6, assumptions.fmcgRevenueGrowth * MODEL_ASSUMPTIONS.infotechGrowthFactor);
    const infotechEbit = prevInfotechEbit * (1 + infotechGrowth / 100);
    const ebit = cigaretteEbit + fmcgEbit + hotelsEbit + paperEbit + agriEbit + infotechEbit;

    const depreciation = totalRevenue * (MODEL_ASSUMPTIONS.depreciationPercentOfRevenue / 100);
    const ebitda = ebit + depreciation;
    const nopat = ebit * (1 - assumptions.taxRate / 100);
    const capex = totalRevenue * (assumptions.capexPercent / 100);
    const workingCapitalInvestment =
      Math.max(totalRevenue - prev.revenue, 0) * (assumptions.workingCapitalPercent / 100);
    const fcff = nopat + depreciation - capex - workingCapitalInvestment;
    const netProfit = nopat * MODEL_ASSUMPTIONS.terminalCashTaxRate;
    const totalAssets = prev.totalAssets + capex - depreciation + workingCapitalInvestment;
    const netDebt = prev.netDebt - fcff * 0.45;
    const eps = netProfit / sharesOutstanding;
    const peRatio = round(
      Math.max(14, prev.peRatio - assumptions.conglomerateDiscount * 0.1 + assumptions.fmcgMarginTarget * 0.15),
      1,
    );
    const stockPriceHigh = round(eps * peRatio);
    const stockPriceLow = round(stockPriceHigh * 0.8);
    const dps = round(eps * 0.72, 2);
    const dividendYield = round((dps / Math.max(stockPriceHigh, 1)) * 100, 1);
    const cigaretteVolumeIndex = clamp(
      round(prev.cigaretteVolumeIndex * (1 + cigaretteVolumeGrowth / 100)),
      MODEL_ASSUMPTIONS.minCigaretteVolumeIndex,
      MODEL_ASSUMPTIONS.maxCigaretteVolumeIndex,
    );

    const summary: YearlyData = {
      year: String(yearNum),
      fy: `FY${yearNum}E`,
      revenue: round(totalRevenue),
      cigaretteRevenue: round(cigaretteRevenue),
      fmcgRevenue: round(fmcgRevenue),
      hotelsRevenue: round(hotelsRevenue),
      paperRevenue: round(paperRevenue),
      agriRevenue: round(agriRevenue),
      ebitda: round(ebitda),
      ebitdaMargin: round((ebitda / totalRevenue) * 100, 1),
      netProfit: round(netProfit),
      netMargin: round((netProfit / totalRevenue) * 100, 1),
      eps: round(eps, 2),
      dps,
      roe: round((netProfit / Math.max(totalAssets * 0.6, 1)) * 100, 1),
      roce: round((ebit / Math.max(totalAssets, 1)) * 100, 1),
      cigaretteEbitMargin: round(cigaretteEbitMargin, 1),
      fmcgEbitdaMargin,
      freeCashFlow: round(fcff),
      totalAssets: round(totalAssets),
      netDebt: round(netDebt),
      taxHikePct: assumptions.annualNccdHike,
      stockPriceHigh,
      stockPriceLow,
      dividendYield,
      peRatio,
      cigaretteVolumeIndex,
    };

    details.push({
      year: summary.year,
      fy: summary.fy,
      totalRevenue: round(totalRevenue),
      cigaretteRevenue: round(cigaretteRevenue),
      fmcgRevenue: round(fmcgRevenue),
      hotelsRevenue: round(hotelsRevenue),
      paperRevenue: round(paperRevenue),
      agriRevenue: round(agriRevenue),
      cigarettePriceIncrease: round(priceIncrease, 1),
      cigaretteVolumeGrowth: round(cigaretteVolumeGrowth, 1),
      cigaretteRevenueGrowth: round(cigaretteRevenueGrowth, 1),
      cigaretteEbitMargin: round(cigaretteEbitMargin, 1),
      fmcgEbitdaMargin,
      cigaretteEbit: round(cigaretteEbit),
      fmcgEbit: round(fmcgEbit),
      hotelsEbit: round(hotelsEbit),
      paperEbit: round(paperEbit),
      agriEbit: round(agriEbit),
      infotechEbit: round(infotechEbit),
      ebit: round(ebit),
      depreciation: round(depreciation),
      ebitda: round(ebitda),
      nopat: round(nopat),
      capex: round(capex),
      workingCapitalInvestment: round(workingCapitalInvestment),
      fcff: round(fcff),
      terminalYear: i === MODEL_ASSUMPTIONS.projectionYears,
      summary,
    });

    prev = summary;
    prevInfotechEbit = infotechEbit;
  }

  return details;
}

export function generateProjections(
  assumptions: ProjectionAssumptions,
  baseData: YearlyData,
): YearlyData[] {
  return generateProjectionDetails(assumptions, baseData).map(detail => detail.summary);
}

// --------------------------- DCF -----------------------------------------

export function calculateDCF(
  projections: YearlyData[],
  wacc: number,
  terminalGrowth: number,
  options: { midYearConvention?: boolean } = {},
): DCFResult {
  const validationErrors: string[] = [];
  const midYearConvention = options.midYearConvention ?? false;

  if (projections.length === 0) {
    validationErrors.push('At least one projection year is required.');
  }

  assertFiniteNumber(wacc, 'wacc');
  assertFiniteNumber(terminalGrowth, 'terminalGrowth');

  if (wacc <= 0) {
    validationErrors.push('WACC must be greater than 0.');
  }

  if (terminalGrowth < 0) {
    validationErrors.push('Terminal growth must be non-negative.');
  }

  if (terminalGrowth >= wacc) {
    validationErrors.push('Terminal growth must stay below WACC.');
  }

  if (validationErrors.length > 0) {
    return {
      enterpriseValue: 0,
      equityValue: 0,
      perShareValue: 0,
      pvCashFlows: projections.map(() => 0),
      terminalValue: 0,
      pvTerminalValue: 0,
      terminalValueWeight: 0,
      explicitForecastWeight: 0,
      impliedExitEbitdaMultiple: 0,
      midYearConvention,
      isValid: false,
      validationErrors,
    };
  }

  const pvCashFlows: number[] = [];
  let totalPV = 0;

  for (let i = 0; i < projections.length; i++) {
    const tDiscount = midYearConvention ? i + 0.5 : i + 1;
    const discountFactor = Math.pow(1 + wacc / 100, tDiscount);
    const pv = projections[i].freeCashFlow / discountFactor;
    pvCashFlows.push(round(pv));
    totalPV += pv;
  }

  const lastProjection = projections[projections.length - 1];
  const lastFCF = lastProjection.freeCashFlow;
  const terminalValue = (lastFCF * (1 + terminalGrowth / 100)) / (wacc / 100 - terminalGrowth / 100);
  const terminalT = midYearConvention ? projections.length - 0.5 : projections.length;
  const terminalPvFactor = Math.pow(1 + wacc / 100, terminalT);
  const pvTerminalValue = terminalValue / terminalPvFactor;
  const netCash = lastProjection.netDebt < 0 ? Math.abs(lastProjection.netDebt) : -lastProjection.netDebt;
  const enterpriseValue = totalPV + pvTerminalValue;
  const equityValue = enterpriseValue + netCash;
  const perShareValue = equityValue / sharesOutstanding;
  const terminalValueWeight = enterpriseValue > 0 ? pvTerminalValue / enterpriseValue : 0;
  const explicitForecastWeight = enterpriseValue > 0 ? totalPV / enterpriseValue : 0;
  const impliedExitEbitdaMultiple = lastProjection.ebitda > 0 ? terminalValue / lastProjection.ebitda : 0;

  return {
    enterpriseValue: round(enterpriseValue),
    equityValue: round(equityValue),
    perShareValue: round(perShareValue, 2),
    pvCashFlows,
    terminalValue: round(terminalValue),
    pvTerminalValue: round(pvTerminalValue),
    terminalValueWeight: round(terminalValueWeight * 100, 1),
    explicitForecastWeight: round(explicitForecastWeight * 100, 1),
    impliedExitEbitdaMultiple: round(impliedExitEbitdaMultiple, 1),
    midYearConvention,
    isValid: true,
    validationErrors: [],
  };
}

// ------------------------ SOTP summaries ---------------------------------

export function calculateSotpSummary(sotpData: SOTPValuation[], latestData: YearlyData): SOTPSummary {
  const totalBase = sotpData.reduce((sum, segment) => sum + segment.value, 0);
  const totalLow = sotpData.reduce((sum, segment) => sum + segment.valueLow, 0);
  const totalHigh = sotpData.reduce((sum, segment) => sum + segment.valueHigh, 0);
  const netCash = latestData.netDebt < 0 ? Math.abs(latestData.netDebt) : -latestData.netDebt;

  return {
    totalBase,
    totalLow,
    totalHigh,
    netCash,
    perShareBase: (totalBase + netCash) / sharesOutstanding,
    perShareLow: (totalLow + netCash) / sharesOutstanding,
    perShareHigh: (totalHigh + netCash) / sharesOutstanding,
  };
}

export function calculateDynamicSotpSummary(
  projectionDetails: ProjectionDetail[],
  sotpData: SOTPValuation[],
  conglomerateDiscount: number,
): DynamicSotpSummary {
  const lastProjection = projectionDetails[projectionDetails.length - 1];
  const lines = sotpData.map(line => {
    switch (line.segment) {
      case 'Cigarettes':
        return buildDynamicSotpLine(line, lastProjection.cigaretteEbit);
      case 'FMCG (Non-Cigarette)':
        return buildDynamicSotpLine(line, lastProjection.fmcgEbit);
      case 'Hotels (Demerged)':
        return buildDynamicSotpLine(line, lastProjection.hotelsEbit);
      case 'Paperboards & Packaging':
        return buildDynamicSotpLine(line, lastProjection.paperEbit);
      case 'Agri-Business':
        return buildDynamicSotpLine(line, lastProjection.agriEbit);
      case 'ITC Infotech':
        return buildDynamicSotpLine(line, lastProjection.infotechEbit);
      default:
        return buildDynamicSotpLine(line, line.ebit);
    }
  });

  const totalBeforeDiscountBase = lines.reduce((sum, line) => sum + line.value, 0);
  const totalBeforeDiscountLow = lines.reduce((sum, line) => sum + line.valueLow, 0);
  const totalBeforeDiscountHigh = lines.reduce((sum, line) => sum + line.valueHigh, 0);
  const discountFactor = 1 - conglomerateDiscount / 100;
  const totalBase = round(totalBeforeDiscountBase * discountFactor);
  const totalLow = round(totalBeforeDiscountLow * discountFactor);
  const totalHigh = round(totalBeforeDiscountHigh * discountFactor);
  const discountValueBase = round(totalBeforeDiscountBase - totalBase);
  const discountValueLow = round(totalBeforeDiscountLow - totalLow);
  const discountValueHigh = round(totalBeforeDiscountHigh - totalHigh);
  const netCash = lastProjection.summary.netDebt < 0 ? Math.abs(lastProjection.summary.netDebt) : -lastProjection.summary.netDebt;

  return {
    totalBase,
    totalLow,
    totalHigh,
    netCash,
    perShareBase: round((totalBase + netCash) / sharesOutstanding, 2),
    perShareLow: round((totalLow + netCash) / sharesOutstanding, 2),
    perShareHigh: round((totalHigh + netCash) / sharesOutstanding, 2),
    conglomerateDiscount,
    discountValueBase,
    discountValueLow,
    discountValueHigh,
    lines,
  };
}

// ------------------------ sensitivity ------------------------------------

export function buildDcfSensitivity(
  projections: YearlyData[],
  baseWacc: number,
  baseTerminalGrowth: number,
): SensitivityPoint[] {
  const points: SensitivityPoint[] = [];
  const waccValues = [
    round(baseWacc - MODEL_ASSUMPTIONS.sensitivityStep, 1),
    round(baseWacc, 1),
    round(baseWacc + MODEL_ASSUMPTIONS.sensitivityStep, 1),
  ];
  const terminalValues = [
    round(baseTerminalGrowth - MODEL_ASSUMPTIONS.sensitivityStep, 1),
    round(baseTerminalGrowth, 1),
    round(baseTerminalGrowth + MODEL_ASSUMPTIONS.sensitivityStep, 1),
  ];

  for (const terminalGrowth of terminalValues) {
    for (const wacc of waccValues) {
      const result = calculateDCF(projections, wacc, terminalGrowth);
      points.push({
        wacc,
        terminalGrowth,
        perShareValue: result.isValid ? result.perShareValue : null,
        isBase: wacc === round(baseWacc, 1) && terminalGrowth === round(baseTerminalGrowth, 1),
      });
    }
  }

  return points;
}

// ---------------------- tax impact simulator ------------------------------

export function simulateTaxImpact(simHike: number, latestData: YearlyData): TaxImpactResult {
  assertFiniteNumber(simHike, 'simHike');
  validateProjectionInput(latestData);

  const priceIncrease = simHike * (MODEL_ASSUMPTIONS.cigarettePassThroughRate / 100);
  const volumeImpactShort = priceIncrease * MODEL_ASSUMPTIONS.cigaretteShortTermElasticity;
  const volumeImpactLong = priceIncrease * MODEL_ASSUMPTIONS.cigaretteLongTermElasticity;
  const revenueImpact = priceIncrease + volumeImpactShort;
  const newCigRevenue = latestData.cigaretteRevenue * (1 + revenueImpact / 100);
  const marginPressure =
    simHike > MODEL_ASSUMPTIONS.cigaretteMarginPressureThreshold
      ? (simHike - MODEL_ASSUMPTIONS.cigaretteMarginPressureThreshold) *
        MODEL_ASSUMPTIONS.cigaretteMarginPressurePerPoint
      : 0;
  const newEbitMargin = Math.max(
    MODEL_ASSUMPTIONS.cigaretteMarginFloor,
    latestData.cigaretteEbitMargin - marginPressure,
  );
  const newCigEbit = newCigRevenue * (newEbitMargin / 100);
  const stockReactionEstimate =
    simHike === 0 ? 6 : simHike <= 10 ? 3 : simHike <= 16 ? -1 : simHike <= 20 ? -4 : -8;

  return {
    priceIncrease: round(priceIncrease, 1),
    volumeImpactShort: round(volumeImpactShort, 1),
    volumeImpactLong: round(volumeImpactLong, 1),
    revenueImpact: round(revenueImpact, 1),
    newCigRevenue: round(newCigRevenue),
    newEbitMargin: round(newEbitMargin, 1),
    newCigEbit: round(newCigEbit, 1),
    stockReactionEstimate,
  };
}

// ----------------------- scenario analysis -------------------------------

export function runScenarioAnalysis(
  baseAssumptions: ProjectionAssumptions,
  baseData: YearlyData,
  sotpTemplate: SOTPValuation[],
  scenarios: ValuationScenario[],
  marketPrice: number,
): ScenarioAnalysisResult {
  const results: ScenarioResult[] = scenarios.map(scenario => {
    const assumptions = mergeAssumptions(baseAssumptions, scenario.overrides);
    try {
      const details = generateProjectionDetails(assumptions, baseData);
      const projections = details.map(d => d.summary);
      const dcf = calculateDCF(projections, assumptions.wacc, assumptions.terminalGrowth);
      const sotp = calculateDynamicSotpSummary(details, sotpTemplate, assumptions.conglomerateDiscount);
      const dcfPerShare = dcf.isValid ? dcf.perShareValue : 0;
      const sotpPerShare = sotp.perShareBase;
      const blended = round(dcfPerShare * 0.6 + sotpPerShare * 0.4, 2);
      return {
        id: scenario.id,
        label: scenario.label,
        probability: scenario.probability,
        description: scenario.description,
        color: scenario.color,
        assumptions,
        dcfPerShare,
        sotpPerShare,
        blendedPerShare: blended,
        terminalValueWeight: dcf.terminalValueWeight,
        implicitTerminalMultiple: dcf.impliedExitEbitdaMultiple,
        isValid: dcf.isValid,
      };
    } catch (error) {
      return {
        id: scenario.id,
        label: scenario.label,
        probability: scenario.probability,
        description: scenario.description,
        color: scenario.color,
        assumptions,
        dcfPerShare: 0,
        sotpPerShare: 0,
        blendedPerShare: 0,
        terminalValueWeight: 0,
        implicitTerminalMultiple: 0,
        isValid: false,
      };
    }
  });

  const probSum = results.reduce((s, r) => s + r.probability, 0) || 1;
  const expectedValuePerShare = round(
    results.reduce((s, r) => s + (r.blendedPerShare * r.probability) / probSum, 0),
    2,
  );
  const expectedValueDcfOnly = round(
    results.reduce((s, r) => s + (r.dcfPerShare * r.probability) / probSum, 0),
    2,
  );
  const expectedValueSotpOnly = round(
    results.reduce((s, r) => s + (r.sotpPerShare * r.probability) / probSum, 0),
    2,
  );
  const bear = results.find(r => r.id === 'bear');
  const base = results.find(r => r.id === 'base');
  const bull = results.find(r => r.id === 'bull');

  return {
    scenarios: results,
    expectedValuePerShare,
    expectedValueDcfOnly,
    expectedValueSotpOnly,
    bearPerShare: bear?.blendedPerShare ?? results[0].blendedPerShare,
    basePerShare: base?.blendedPerShare ?? results[Math.floor(results.length / 2)].blendedPerShare,
    bullPerShare: bull?.blendedPerShare ?? results[results.length - 1].blendedPerShare,
    upsideVsMarket: marketPrice > 0 ? round(((expectedValuePerShare - marketPrice) / marketPrice) * 100, 1) : 0,
  };
}

// --------------------------- Monte Carlo ---------------------------------

// Triangular range around each base assumption. The width is calibrated to empirically observed
// historical volatility of each driver (e.g. cigarette revenue growth has wider range than FMCG).
function defaultTriangularRanges(base: ProjectionAssumptions) {
  return {
    cigaretteRevenueGrowth: { low: base.cigaretteRevenueGrowth - 5, mid: base.cigaretteRevenueGrowth, high: base.cigaretteRevenueGrowth + 4 },
    cigaretteVolumeGrowth: { low: base.cigaretteVolumeGrowth - 4, mid: base.cigaretteVolumeGrowth, high: base.cigaretteVolumeGrowth + 3 },
    fmcgRevenueGrowth: { low: base.fmcgRevenueGrowth - 4, mid: base.fmcgRevenueGrowth, high: base.fmcgRevenueGrowth + 5 },
    fmcgMarginTarget: { low: Math.max(base.fmcgMarginTarget - 4, base.fmcgEbitdaMargin), mid: base.fmcgMarginTarget, high: base.fmcgMarginTarget + 4 },
    cigaretteEbitMargin: { low: Math.max(base.cigaretteEbitMargin - 6, 55), mid: base.cigaretteEbitMargin, high: Math.min(base.cigaretteEbitMargin + 3, 72) },
    annualNccdHike: { low: Math.max(0, base.annualNccdHike - 10), mid: base.annualNccdHike, high: base.annualNccdHike + 12 },
    illicitTradeDrag: { low: Math.max(0, base.illicitTradeDrag - 0.7), mid: base.illicitTradeDrag, high: base.illicitTradeDrag + 1.2 },
    wacc: { low: Math.max(7, base.wacc - 1.5), mid: base.wacc, high: base.wacc + 1.5 },
    terminalGrowth: { low: Math.max(2, base.terminalGrowth - 1.5), mid: base.terminalGrowth, high: Math.min(base.wacc - 1, base.terminalGrowth + 1.5) },
  } as const;
}

export function runMonteCarloSimulation(
  baseAssumptions: ProjectionAssumptions,
  baseData: YearlyData,
  config: MonteCarloConfig = {},
): MonteCarloResult {
  const draws = config.draws ?? MODEL_ASSUMPTIONS.monteCarloDraws;
  const seed = config.seed ?? MODEL_ASSUMPTIONS.monteCarloSeed;
  const rng = createRng(seed);
  const ranges = { ...defaultTriangularRanges(baseAssumptions), ...(config.rangeOverride ?? {}) };

  const values: number[] = [];

  for (let i = 0; i < draws; i++) {
    const sampled: ProjectionAssumptions = {
      ...baseAssumptions,
      cigaretteRevenueGrowth: sampleTriangular(rng, ranges.cigaretteRevenueGrowth.low, ranges.cigaretteRevenueGrowth.mid, ranges.cigaretteRevenueGrowth.high),
      cigaretteVolumeGrowth: sampleTriangular(rng, ranges.cigaretteVolumeGrowth.low, ranges.cigaretteVolumeGrowth.mid, ranges.cigaretteVolumeGrowth.high),
      fmcgRevenueGrowth: sampleTriangular(rng, ranges.fmcgRevenueGrowth.low, ranges.fmcgRevenueGrowth.mid, ranges.fmcgRevenueGrowth.high),
      fmcgMarginTarget: sampleTriangular(rng, ranges.fmcgMarginTarget.low, ranges.fmcgMarginTarget.mid, ranges.fmcgMarginTarget.high),
      cigaretteEbitMargin: sampleTriangular(rng, ranges.cigaretteEbitMargin.low, ranges.cigaretteEbitMargin.mid, ranges.cigaretteEbitMargin.high),
      annualNccdHike: sampleTriangular(rng, ranges.annualNccdHike.low, ranges.annualNccdHike.mid, ranges.annualNccdHike.high),
      illicitTradeDrag: sampleTriangular(rng, ranges.illicitTradeDrag.low, ranges.illicitTradeDrag.mid, ranges.illicitTradeDrag.high),
      wacc: sampleTriangular(rng, ranges.wacc.low, ranges.wacc.mid, ranges.wacc.high),
      terminalGrowth: sampleTriangular(rng, ranges.terminalGrowth.low, ranges.terminalGrowth.mid, ranges.terminalGrowth.high),
    };

    // Enforce g < r
    if (sampled.terminalGrowth >= sampled.wacc) {
      sampled.terminalGrowth = sampled.wacc - 1;
    }
    if (sampled.fmcgMarginTarget < sampled.fmcgEbitdaMargin) {
      sampled.fmcgMarginTarget = sampled.fmcgEbitdaMargin;
    }

    try {
      const projections = generateProjections(sampled, baseData);
      const dcf = calculateDCF(projections, sampled.wacc, sampled.terminalGrowth);
      if (dcf.isValid) {
        values.push(dcf.perShareValue);
      }
    } catch (error) {
      // discard infeasible draw
    }
  }

  const sorted = [...values].sort((a, b) => a - b);
  const m = mean(values);
  const sd = stdDev(values, m);
  const med = median(values);

  const marketPrice = baseData.stockPriceHigh > 0 ? (baseData.stockPriceHigh + baseData.stockPriceLow) / 2 : 400;
  const probUpside = values.length === 0 ? 0 : values.filter(v => v > marketPrice).length / values.length;

  // Build 10-bucket histogram
  const low = sorted[0] ?? 0;
  const high = sorted[sorted.length - 1] ?? 0;
  const bucketCount = 12;
  const bucketWidth = Math.max((high - low) / bucketCount, 1);
  const histogram = Array.from({ length: bucketCount }, (_, i) => {
    const lowEdge = low + i * bucketWidth;
    const highEdge = low + (i + 1) * bucketWidth;
    const count = values.filter(v => v >= lowEdge && (i === bucketCount - 1 ? v <= highEdge : v < highEdge)).length;
    return {
      bucket: `₹${round(lowEdge)}`,
      count,
      low: round(lowEdge, 2),
      high: round(highEdge, 2),
    };
  });

  return {
    samples: values.length,
    perShareValues: values,
    mean: round(m, 2),
    stdDev: round(sd, 2),
    median: round(med, 2),
    p5: round(percentile(sorted, 5), 2),
    p25: round(percentile(sorted, 25), 2),
    p75: round(percentile(sorted, 75), 2),
    p95: round(percentile(sorted, 95), 2),
    probUpside: round(probUpside * 100, 1),
    histogram,
  };
}

// --------------------------- Reverse DCF ---------------------------------

export function calculateReverseDCF(
  currentPrice: number,
  baseAssumptions: ProjectionAssumptions,
  baseData: YearlyData,
): ReverseDCFResult {
  assertFiniteNumber(currentPrice, 'currentPrice');
  if (currentPrice <= 0) {
    return {
      currentPrice,
      impliedCigaretteGrowth: 0,
      baseGrowthUsed: baseAssumptions.cigaretteRevenueGrowth,
      iterations: 0,
      converged: false,
      dcfAtImplied: 0,
      description: 'Current price must be positive.',
    };
  }

  const tryGrowth = (g: number): number => {
    const assumptions = { ...baseAssumptions, cigaretteRevenueGrowth: g };
    try {
      const projections = generateProjections(assumptions, baseData);
      const dcf = calculateDCF(projections, assumptions.wacc, assumptions.terminalGrowth);
      return dcf.isValid ? dcf.perShareValue : NaN;
    } catch {
      return NaN;
    }
  };

  let lo: number = MODEL_ASSUMPTIONS.reverseGrowthMin;
  let hi: number = MODEL_ASSUMPTIONS.reverseGrowthMax;
  let iterations = 0;
  let lastMid = (lo + hi) / 2;
  let lastValue = tryGrowth(lastMid);

  while (iterations < MODEL_ASSUMPTIONS.reverseSolverMaxIter && hi - lo > 0.01) {
    iterations++;
    const mid = (lo + hi) / 2;
    const value = tryGrowth(mid);
    if (!Number.isFinite(value)) {
      lo = mid;
      continue;
    }
    lastMid = mid;
    lastValue = value;
    if (Math.abs(value - currentPrice) < MODEL_ASSUMPTIONS.reverseSolverTolerance) {
      break;
    }
    if (value < currentPrice) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const converged = Number.isFinite(lastValue) && Math.abs(lastValue - currentPrice) <= MODEL_ASSUMPTIONS.reverseSolverTolerance * 4;
  return {
    currentPrice,
    impliedCigaretteGrowth: round(lastMid, 2),
    baseGrowthUsed: baseAssumptions.cigaretteRevenueGrowth,
    iterations,
    converged,
    dcfAtImplied: round(lastValue, 2),
    description: converged
      ? `Market price of ₹${currentPrice} implies ~${round(lastMid, 1)}% cigarette revenue growth over the explicit forecast horizon, holding other assumptions fixed.`
      : 'Solver did not converge within the bounds — the market-implied growth lies outside the feasible range.',
  };
}

// --------------------- relative valuation --------------------------------

export function calculateRelativeValuation(
  latest: YearlyData,
  peers: PeerMultiple[],
  method: 'EV/EBITDA' | 'P/E',
  multipleOverride?: number,
): RelativeValuationResult {
  const filtered = peers.filter(p => p.ticker !== 'ITC');
  const arr = filtered.map(p => (method === 'EV/EBITDA' ? p.evEbitda : p.peForward));
  const sorted = [...arr].sort((a, b) => a - b);
  const average = mean(arr);
  const med = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const applied = multipleOverride ?? average;

  const netCash = latest.netDebt < 0 ? Math.abs(latest.netDebt) : -latest.netDebt;
  let impliedEnterpriseValue = 0;
  let impliedEquityValue = 0;
  let perShareValue = 0;

  if (method === 'EV/EBITDA') {
    impliedEnterpriseValue = latest.ebitda * applied;
    impliedEquityValue = impliedEnterpriseValue + netCash;
    perShareValue = impliedEquityValue / sharesOutstanding;
  } else {
    impliedEquityValue = latest.netProfit * applied;
    impliedEnterpriseValue = impliedEquityValue - netCash;
    perShareValue = (latest.eps * applied);
  }

  const itcPeer = peers.find(p => p.ticker === 'ITC');
  const itcMultiple = itcPeer ? (method === 'EV/EBITDA' ? itcPeer.evEbitda : itcPeer.peForward) : applied;
  const discountVsPeers = average > 0 ? ((itcMultiple - average) / average) * 100 : 0;

  return {
    method,
    appliedMultiple: round(applied, 1),
    peerAverage: round(average, 1),
    peerMedian: round(med, 1),
    peerMin: round(min, 1),
    peerMax: round(max, 1),
    discountVsPeers: round(discountVsPeers, 1),
    impliedEnterpriseValue: round(impliedEnterpriseValue),
    impliedEquityValue: round(impliedEquityValue),
    perShareValue: round(perShareValue, 2),
  };
}

export function computePeerPercentileRanks(peers: PeerMultiple[]): PeerPercentileRank[] {
  const rankIn = (values: number[], val: number, higherBetter = true): number => {
    const sorted = [...values].sort((a, b) => (higherBetter ? a - b : b - a));
    const idx = sorted.findIndex(v => v === val);
    return sorted.length <= 1 ? 50 : round(((idx + 1) / sorted.length) * 100);
  };

  const evEbitdaList = peers.map(p => p.evEbitda);
  const peList = peers.map(p => p.peForward);
  const dyList = peers.map(p => p.dividendYield);
  const roicList = peers.map(p => p.roic);

  return peers.map(peer => {
    const evEbitdaRank = rankIn(evEbitdaList, peer.evEbitda, true);
    const peRank = rankIn(peList, peer.peForward, true);
    const dividendYieldRank = rankIn(dyList, peer.dividendYield, true);
    const roicRank = rankIn(roicList, peer.roic, true);
    const compositeRank = round((evEbitdaRank + peRank + dividendYieldRank + roicRank) / 4);
    return {
      ticker: peer.ticker,
      name: peer.name,
      category: peer.category,
      evEbitdaRank,
      peRank,
      dividendYieldRank,
      roicRank,
      compositeRank,
    };
  });
}

// -------------------- Dividend Discount Model ----------------------------

// Gordon growth single-stage DDM: V = D1 / (r - g)
export function calculateGordonGrowthDDM(
  latest: YearlyData,
  requiredReturn: number,
  terminalGrowth: number,
): DividendDiscountResult {
  if (requiredReturn <= terminalGrowth) {
    return {
      method: 'Gordon',
      currentDps: latest.dps,
      nearTermGrowth: terminalGrowth,
      terminalGrowth,
      requiredReturn,
      perShareValue: 0,
      payoutRatio: 0,
      sustainabilityScore: 0,
      notes: 'Required return must exceed terminal growth for Gordon DDM to converge.',
    };
  }
  const nextDividend = latest.dps * (1 + terminalGrowth / 100);
  const value = nextDividend / ((requiredReturn - terminalGrowth) / 100);
  const payoutRatio = latest.eps > 0 ? (latest.dps / latest.eps) * 100 : 0;
  const fcfCoverage = latest.freeCashFlow / Math.max(latest.dps * sharesOutstanding, 1);
  const sustainabilityScore = clamp(
    round(40 + (fcfCoverage * 15) + (latest.roe - 20) + Math.min(10, latest.netDebt < 0 ? 10 : 0)),
    0,
    100,
  );
  return {
    method: 'Gordon',
    currentDps: latest.dps,
    nearTermGrowth: terminalGrowth,
    terminalGrowth,
    requiredReturn,
    perShareValue: round(value, 2),
    payoutRatio: round(payoutRatio, 1),
    sustainabilityScore,
    notes: 'Single-stage Gordon growth assumes constant dividend growth in perpetuity.',
  };
}

// Two-stage DDM: explicit high-growth years + terminal
export function calculateTwoStageDDM(
  latest: YearlyData,
  nearTermGrowth: number,
  nearTermYears: number,
  terminalGrowth: number,
  requiredReturn: number,
): DividendDiscountResult {
  if (requiredReturn <= terminalGrowth) {
    return {
      method: 'Two-Stage',
      currentDps: latest.dps,
      nearTermGrowth,
      terminalGrowth,
      requiredReturn,
      perShareValue: 0,
      payoutRatio: 0,
      sustainabilityScore: 0,
      notes: 'Required return must exceed terminal growth for DDM to converge.',
    };
  }

  let pv = 0;
  let lastDividend = latest.dps;
  for (let t = 1; t <= nearTermYears; t++) {
    const divT = lastDividend * (1 + nearTermGrowth / 100);
    pv += divT / Math.pow(1 + requiredReturn / 100, t);
    lastDividend = divT;
  }
  const terminalDividend = lastDividend * (1 + terminalGrowth / 100);
  const terminalValue = terminalDividend / ((requiredReturn - terminalGrowth) / 100);
  pv += terminalValue / Math.pow(1 + requiredReturn / 100, nearTermYears);

  const payoutRatio = latest.eps > 0 ? (latest.dps / latest.eps) * 100 : 0;
  const fcfCoverage = latest.freeCashFlow / Math.max(latest.dps * sharesOutstanding, 1);
  const sustainabilityScore = clamp(
    round(45 + (fcfCoverage * 15) + (latest.roe - 22) + (latest.netDebt < 0 ? 10 : -5)),
    0,
    100,
  );

  return {
    method: 'Two-Stage',
    currentDps: latest.dps,
    nearTermGrowth,
    terminalGrowth,
    requiredReturn,
    perShareValue: round(pv, 2),
    payoutRatio: round(payoutRatio, 1),
    sustainabilityScore,
    notes: `Two-stage DDM: ${nearTermGrowth}% dividend growth for ${nearTermYears}y, then ${terminalGrowth}% in perpetuity.`,
  };
}

// ------------------------- EVA & ROIC ------------------------------------

export function calculateEvaSeries(details: ProjectionDetail[], wacc: number): EvaYear[] {
  return details.map(d => {
    const investedCapital = Math.max(d.summary.totalAssets * 0.6, 1); // proxy: equity + debt ~60% of assets
    const capitalCharge = investedCapital * (wacc / 100);
    const eva = d.nopat - capitalCharge;
    const roic = (d.nopat / investedCapital) * 100;
    return {
      year: d.year,
      fy: d.fy,
      nopat: d.nopat,
      investedCapital: round(investedCapital),
      capitalCharge: round(capitalCharge),
      eva: round(eva),
      roic: round(roic, 1),
      roicSpread: round(roic - wacc, 1),
    };
  });
}

export function calculateRoicDecomposition(details: ProjectionDetail[]): RoicDecomposition[] {
  return details.map(d => {
    const investedCapital = Math.max(d.summary.totalAssets * 0.6, 1);
    const nopatMargin = (d.nopat / Math.max(d.totalRevenue, 1)) * 100;
    const capitalTurnover = d.totalRevenue / investedCapital;
    const roic = (d.nopat / investedCapital) * 100;
    return {
      year: d.year,
      nopatMargin: round(nopatMargin, 2),
      capitalTurnover: round(capitalTurnover, 2),
      roic: round(roic, 2),
    };
  });
}

// --------------------- blended bridge ------------------------------------

export function buildBlendedValuationBridge(
  dcfPerShare: number,
  sotpPerShare: number,
  relativeEvEbitdaPerShare: number,
  relativePePerShare: number,
  ddmPerShare: number,
  marketPrice: number,
): BlendedValuationBridge {
  // Weights reflect methodology reliability for diversified FMCG + regulated-tobacco entity
  const methods = [
    { label: 'DCF', perShareValue: round(dcfPerShare, 2), weight: 0.35, color: '#3b82f6' },
    { label: 'SOTP', perShareValue: round(sotpPerShare, 2), weight: 0.30, color: '#10b981' },
    { label: 'EV / EBITDA', perShareValue: round(relativeEvEbitdaPerShare, 2), weight: 0.15, color: '#8b5cf6' },
    { label: 'P / E', perShareValue: round(relativePePerShare, 2), weight: 0.10, color: '#f59e0b' },
    { label: 'Dividend Discount', perShareValue: round(ddmPerShare, 2), weight: 0.10, color: '#06b6d4' },
  ];
  const totalWeight = methods.reduce((s, m) => s + m.weight, 0);
  const blended = round(
    methods.reduce((s, m) => s + (m.perShareValue * m.weight) / totalWeight, 0),
    2,
  );
  const upside = marketPrice > 0 ? round(((blended - marketPrice) / marketPrice) * 100, 1) : 0;
  return { methods, blendedPerShare: blended, marketPrice, upside };
}
