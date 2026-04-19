import type { ProjectionAssumptions, SOTPValuation, YearlyData } from '@/data/itcData';
import { sharesOutstanding } from '@/data/itcData';

export const MODEL_ASSUMPTIONS = Object.freeze({
  projectionYears: 7,
  cigarettePassThroughRate: 0.85,
  cigaretteShortTermElasticity: -0.4,
  cigaretteLongTermElasticity: -0.6,
  cigaretteMarginPressureThreshold: 16,
  cigaretteMarginPressurePerPoint: 0.5,
  cigaretteMarginFloor: 55,
  operatingEbitdaMultiplier: 1.05,
  hotelsEbitMargin: 0.27,
  paperEbitMargin: 0.27,
  agriEbitMargin: 0.09,
  ebitdaToNetProfitMultiplier: 0.85,
  ebitdaToFreeCashFlowMultiplier: 0.7,
  maxCigaretteVolumeIndex: 110,
  startingYear: 2024,
} as const);

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

function validateProjectionAssumptions(assumptions: ProjectionAssumptions): void {
  const numericFields: Array<[keyof ProjectionAssumptions, string]> = [
    ['cigaretteRevenueGrowth', 'cigaretteRevenueGrowth'],
    ['fmcgRevenueGrowth', 'fmcgRevenueGrowth'],
    ['hotelsRevenueGrowth', 'hotelsRevenueGrowth'],
    ['paperRevenueGrowth', 'paperRevenueGrowth'],
    ['agriRevenueGrowth', 'agriRevenueGrowth'],
    ['cigaretteEbitMargin', 'cigaretteEbitMargin'],
    ['fmcgEbitdaMargin', 'fmcgEbitdaMargin'],
    ['taxRate', 'taxRate'],
    ['capexPercent', 'capexPercent'],
    ['terminalGrowth', 'terminalGrowth'],
    ['wacc', 'wacc'],
    ['annualNccdHike', 'annualNccdHike'],
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

  if (assumptions.wacc <= 0) {
    throw new Error('wacc must be greater than 0.');
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
    assertFiniteNumber(baseData[field], label);
  }
}

export interface DCFResult {
  enterpriseValue: number;
  equityValue: number;
  perShareValue: number;
  pvCashFlows: number[];
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

export function generateProjections(assumptions: ProjectionAssumptions, baseData: YearlyData): YearlyData[] {
  validateProjectionAssumptions(assumptions);
  validateProjectionInput(baseData);

  const projections: YearlyData[] = [];
  let prev = { ...baseData };

  for (let i = 1; i <= MODEL_ASSUMPTIONS.projectionYears; i++) {
    const priceIncrease = assumptions.annualNccdHike * MODEL_ASSUMPTIONS.cigarettePassThroughRate;
    const volumeImpact = -(priceIncrease * Math.abs(MODEL_ASSUMPTIONS.cigaretteShortTermElasticity));
    const cigaretteGrowthAfterTax = assumptions.cigaretteRevenueGrowth + (priceIncrease + volumeImpact);

    const cigRev = prev.cigaretteRevenue * (1 + cigaretteGrowthAfterTax / 100);
    const fmcgRev = prev.fmcgRevenue * (1 + assumptions.fmcgRevenueGrowth / 100);
    const hotelRev = prev.hotelsRevenue * (1 + assumptions.hotelsRevenueGrowth / 100);
    const paperRev = prev.paperRevenue * (1 + assumptions.paperRevenueGrowth / 100);
    const agriRev = prev.agriRevenue * (1 + assumptions.agriRevenueGrowth / 100);

    const totalRev = cigRev + fmcgRev + hotelRev + paperRev + agriRev;
    const marginPressure =
      assumptions.annualNccdHike > MODEL_ASSUMPTIONS.cigaretteMarginPressureThreshold
        ? (assumptions.annualNccdHike - MODEL_ASSUMPTIONS.cigaretteMarginPressureThreshold) *
          MODEL_ASSUMPTIONS.cigaretteMarginPressurePerPoint
        : 0;
    const adjustedCigMargin = Math.max(MODEL_ASSUMPTIONS.cigaretteMarginFloor, assumptions.cigaretteEbitMargin - marginPressure);

    const cigEbit = cigRev * (adjustedCigMargin / 100);
    const fmcgEbit = fmcgRev * (assumptions.fmcgEbitdaMargin / 100);
    const hotelEbit = hotelRev * MODEL_ASSUMPTIONS.hotelsEbitMargin;
    const paperEbit = paperRev * MODEL_ASSUMPTIONS.paperEbitMargin;
    const agriEbit = agriRev * MODEL_ASSUMPTIONS.agriEbitMargin;
    const totalEbit = cigEbit + fmcgEbit + hotelEbit + paperEbit + agriEbit;
    const ebitda = totalEbit * MODEL_ASSUMPTIONS.operatingEbitdaMultiplier;
    const netProfit = ebitda * (1 - assumptions.taxRate / 100) * MODEL_ASSUMPTIONS.ebitdaToNetProfitMultiplier;
    const yearNum = MODEL_ASSUMPTIONS.startingYear + i;
    const fcf = ebitda * (1 - assumptions.capexPercent / 100) * MODEL_ASSUMPTIONS.ebitdaToFreeCashFlowMultiplier;
    const dps = prev.dps * 1.08;
    const eps = netProfit / sharesOutstanding;

    const newEntry: YearlyData = {
      year: String(yearNum),
      fy: `FY${yearNum}E`,
      revenue: Math.round(totalRev),
      cigaretteRevenue: Math.round(cigRev),
      fmcgRevenue: Math.round(fmcgRev),
      hotelsRevenue: Math.round(hotelRev),
      paperRevenue: Math.round(paperRev),
      agriRevenue: Math.round(agriRev),
      ebitda: Math.round(ebitda),
      ebitdaMargin: Math.round((ebitda / totalRev) * 100 * 10) / 10,
      netProfit: Math.round(netProfit),
      netMargin: Math.round((netProfit / totalRev) * 100 * 10) / 10,
      eps: Math.round(eps * 100) / 100,
      dps: Math.round(dps * 100) / 100,
      roe: Math.round((netProfit / (prev.totalAssets * 0.6)) * 100 * 10) / 10,
      roce: Math.round((totalEbit / prev.totalAssets) * 100 * 10) / 10,
      cigaretteEbitMargin: Math.round(adjustedCigMargin * 10) / 10,
      fmcgEbitdaMargin: assumptions.fmcgEbitdaMargin,
      freeCashFlow: Math.round(fcf),
      totalAssets: Math.round(prev.totalAssets * 1.04),
      netDebt: Math.round(prev.netDebt - fcf * 0.4),
      taxHikePct: assumptions.annualNccdHike,
      stockPriceHigh: Math.round(prev.stockPriceHigh * (1 + assumptions.cigaretteRevenueGrowth / 200)),
      stockPriceLow: Math.round(prev.stockPriceLow * (1 + cigaretteGrowthAfterTax / 250)),
      dividendYield: Math.round((dps / (prev.stockPriceHigh * 0.9)) * 100 * 10) / 10,
      peRatio: Math.round((prev.stockPriceHigh * 0.9 / eps) * 10) / 10,
      cigaretteVolumeIndex: Math.min(MODEL_ASSUMPTIONS.maxCigaretteVolumeIndex, prev.cigaretteVolumeIndex + 1),
    };

    projections.push(newEntry);
    prev = newEntry;
  }

  return projections;
}

export function calculateDCF(projections: YearlyData[], wacc: number, terminalGrowth: number): DCFResult {
  const validationErrors: string[] = [];

  if (projections.length === 0) {
    validationErrors.push('At least one projection year is required.');
  }

  assertFiniteNumber(wacc, 'wacc');
  assertFiniteNumber(terminalGrowth, 'terminalGrowth');

  if (wacc <= 0) {
    validationErrors.push('WACC must be greater than 0.');
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
      isValid: false,
      validationErrors,
    };
  }

  const pvCashFlows: number[] = [];
  let totalPV = 0;

  for (let i = 0; i < projections.length; i++) {
    const discountFactor = Math.pow(1 + wacc / 100, i + 1);
    const pv = projections[i].freeCashFlow / discountFactor;
    pvCashFlows.push(Math.round(pv));
    totalPV += pv;
  }

  const lastFCF = projections[projections.length - 1].freeCashFlow;
  const terminalValue = lastFCF * (1 + terminalGrowth / 100) / (wacc / 100 - terminalGrowth / 100);
  const terminalPvFactor = Math.pow(1 + wacc / 100, projections.length);
  const pvTerminalValue = terminalValue / terminalPvFactor;
  const lastData = projections[projections.length - 1];
  const netCash = lastData.netDebt < 0 ? Math.abs(lastData.netDebt) : -lastData.netDebt;
  const enterpriseValue = totalPV + pvTerminalValue;
  const equityValue = enterpriseValue + netCash;
  const perShareValue = equityValue / sharesOutstanding;

  return {
    enterpriseValue: Math.round(enterpriseValue),
    equityValue: Math.round(equityValue),
    perShareValue: Math.round(perShareValue * 100) / 100,
    pvCashFlows,
    isValid: true,
    validationErrors: [],
  };
}

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

export function simulateTaxImpact(simHike: number, latestData: YearlyData): TaxImpactResult {
  assertFiniteNumber(simHike, 'simHike');
  validateProjectionInput(latestData);

  const priceIncrease = simHike * MODEL_ASSUMPTIONS.cigarettePassThroughRate;
  const volumeImpactShort = -(priceIncrease * Math.abs(MODEL_ASSUMPTIONS.cigaretteShortTermElasticity));
  const volumeImpactLong = -(priceIncrease * Math.abs(MODEL_ASSUMPTIONS.cigaretteLongTermElasticity));
  const revenueImpact = priceIncrease + volumeImpactShort;
  const newCigRevenue = latestData.cigaretteRevenue * (1 + revenueImpact / 100);
  const marginPressure =
    simHike > MODEL_ASSUMPTIONS.cigaretteMarginPressureThreshold
      ? (simHike - MODEL_ASSUMPTIONS.cigaretteMarginPressureThreshold) *
        MODEL_ASSUMPTIONS.cigaretteMarginPressurePerPoint
      : 0;
  const newEbitMargin = Math.max(MODEL_ASSUMPTIONS.cigaretteMarginFloor, latestData.cigaretteEbitMargin - marginPressure);
  const newCigEbit = newCigRevenue * (newEbitMargin / 100);
  const stockReactionEstimate = simHike === 0 ? 6 : simHike <= 10 ? 3 : simHike <= 16 ? -1 : simHike <= 20 ? -4 : -8;

  return {
    priceIncrease,
    volumeImpactShort,
    volumeImpactLong,
    revenueImpact,
    newCigRevenue,
    newEbitMargin,
    newCigEbit,
    stockReactionEstimate,
  };
}
