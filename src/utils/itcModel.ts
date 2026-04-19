import type { ProjectionAssumptions, SOTPValuation, YearlyData } from '@/data/itcData';
import { sharesOutstanding } from '@/data/itcData';

export const MODEL_ASSUMPTIONS = Object.freeze({
  projectionYears: 7,
  cigaretteLongTermElasticity: -0.6,
  cigaretteMarginPressureThreshold: 16,
  cigaretteMarginPressurePerPoint: 0.5,
  cigaretteMarginFloor: 55,
  hotelsEbitMargin: 0.27,
  paperEbitMargin: 0.27,
  agriEbitMargin: 0.09,
  terminalCashTaxRate: 0.96,
  depreciationPercentOfRevenue: 2.4,
  maxCigaretteVolumeIndex: 110,
  minCigaretteVolumeIndex: 55,
  startingYear: 2024,
  fmcgMarginFloor: 8,
  infotechStartingEbit: 500,
  infotechGrowthFactor: 0.6,
  sensitivityStep: 1,
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
    assertFiniteNumber(baseData[field], label);
  }
}

function buildDynamicSotpLine(
  line: SOTPValuation,
  projectedEbit: number,
): DynamicSotpLine {
  return {
    ...line,
    ebit: round(projectedEbit),
    value: round(projectedEbit * line.multiple),
    valueLow: round(projectedEbit * line.multipleLow),
    valueHigh: round(projectedEbit * line.multipleHigh),
  };
}

export function generateProjectionDetails(
  assumptions: ProjectionAssumptions,
  baseData: YearlyData,
): ProjectionDetail[] {
  validateProjectionAssumptions(assumptions);
  validateProjectionInput(baseData);

  const details: ProjectionDetail[] = [];
  let prev = { ...baseData };
  let prevInfotechEbit = MODEL_ASSUMPTIONS.infotechStartingEbit;

  for (let i = 1; i <= MODEL_ASSUMPTIONS.projectionYears; i++) {
    const yearNum = MODEL_ASSUMPTIONS.startingYear + i;
    const progress = i / MODEL_ASSUMPTIONS.projectionYears;
    const priceIncrease = assumptions.annualNccdHike * (assumptions.cigarettePassThroughRate / 100);
    const taxVolumeImpact = priceIncrease * assumptions.cigaretteTaxElasticity;
    const cigaretteVolumeGrowth =
      assumptions.cigaretteVolumeGrowth + taxVolumeImpact - assumptions.illicitTradeDrag;
    const cigaretteRevenueGrowth =
      assumptions.cigaretteRevenueGrowth + assumptions.cigaretteVolumeGrowth + priceIncrease + taxVolumeImpact - assumptions.illicitTradeDrag;

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
    const workingCapitalInvestment = Math.max(totalRevenue - prev.revenue, 0) * (assumptions.workingCapitalPercent / 100);
    const fcff = nopat + depreciation - capex - workingCapitalInvestment;
    const netProfit = nopat * MODEL_ASSUMPTIONS.terminalCashTaxRate;
    const totalAssets = prev.totalAssets + capex - depreciation + workingCapitalInvestment;
    const netDebt = prev.netDebt - fcff * 0.45;
    const eps = netProfit / sharesOutstanding;
    const peRatio = round(Math.max(14, prev.peRatio - assumptions.conglomerateDiscount * 0.1 + assumptions.fmcgMarginTarget * 0.15), 1);
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

export function calculateDCF(
  projections: YearlyData[],
  wacc: number,
  terminalGrowth: number,
): DCFResult {
  const validationErrors: string[] = [];

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
      isValid: false,
      validationErrors,
    };
  }

  const pvCashFlows: number[] = [];
  let totalPV = 0;

  for (let i = 0; i < projections.length; i++) {
    const discountFactor = Math.pow(1 + wacc / 100, i + 1);
    const pv = projections[i].freeCashFlow / discountFactor;
    pvCashFlows.push(round(pv));
    totalPV += pv;
  }

  const lastProjection = projections[projections.length - 1];
  const lastFCF = lastProjection.freeCashFlow;
  const terminalValue = lastFCF * (1 + terminalGrowth / 100) / (wacc / 100 - terminalGrowth / 100);
  const terminalPvFactor = Math.pow(1 + wacc / 100, projections.length);
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

export function simulateTaxImpact(simHike: number, latestData: YearlyData): TaxImpactResult {
  assertFiniteNumber(simHike, 'simHike');
  validateProjectionInput(latestData);

  const passThroughRate = 85;
  const priceIncrease = simHike * (passThroughRate / 100);
  const volumeImpactShort = priceIncrease * -0.4;
  const volumeImpactLong = priceIncrease * MODEL_ASSUMPTIONS.cigaretteLongTermElasticity;
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
