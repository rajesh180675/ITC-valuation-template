import type { ProjectionAssumptions, SOTPValuation, YearlyData } from '@/data/itcData';
import { sharesOutstanding } from '@/data/itcData';

export interface DCFResult {
  enterpriseValue: number;
  equityValue: number;
  perShareValue: number;
  pvCashFlows: number[];
  isValid: boolean;
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
  const projections: YearlyData[] = [];
  let prev = { ...baseData };

  for (let i = 1; i <= 7; i++) {
    const cigRev = prev.cigaretteRevenue * (1 + assumptions.cigaretteRevenueGrowth / 100);
    const fmcgRev = prev.fmcgRevenue * (1 + assumptions.fmcgRevenueGrowth / 100);
    const hotelRev = prev.hotelsRevenue * (1 + assumptions.hotelsRevenueGrowth / 100);
    const paperRev = prev.paperRevenue * (1 + assumptions.paperRevenueGrowth / 100);
    const agriRev = prev.agriRevenue * (1 + assumptions.agriRevenueGrowth / 100);

    const totalRev = cigRev + fmcgRev + hotelRev + paperRev + agriRev;
    const cigEbit = cigRev * (assumptions.cigaretteEbitMargin / 100);
    const fmcgEbit = fmcgRev * (assumptions.fmcgEbitdaMargin / 100);
    const hotelEbit = hotelRev * 0.27;
    const paperEbit = paperRev * 0.27;
    const agriEbit = agriRev * 0.09;
    const totalEbit = cigEbit + fmcgEbit + hotelEbit + paperEbit + agriEbit;
    const ebitda = totalEbit * 1.05;
    const netProfit = ebitda * (1 - assumptions.taxRate / 100) * 0.85;
    const yearNum = 2024 + i;
    const fcf = ebitda * (1 - assumptions.capexPercent / 100) * 0.7;
    const dps = prev.dps * 1.08;
    const eps = netProfit / sharesOutstanding * 100;

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
      cigaretteEbitMargin: assumptions.cigaretteEbitMargin,
      fmcgEbitdaMargin: assumptions.fmcgEbitdaMargin,
      freeCashFlow: Math.round(fcf),
      totalAssets: Math.round(prev.totalAssets * 1.04),
      netDebt: Math.round(prev.netDebt - fcf * 0.4),
      taxHikePct: assumptions.annualNccdHike,
      stockPriceHigh: Math.round(prev.stockPriceHigh * (1 + assumptions.cigaretteRevenueGrowth / 200)),
      stockPriceLow: Math.round(prev.stockPriceHigh * 0.85),
      dividendYield: Math.round((dps / (prev.stockPriceHigh * 0.9)) * 100 * 10) / 10,
      peRatio: Math.round((prev.stockPriceHigh * 0.9 / eps) * 10) / 10,
      cigaretteVolumeIndex: Math.min(110, prev.cigaretteVolumeIndex + 1),
    };

    projections.push(newEntry);
    prev = newEntry;
  }

  return projections;
}

export function calculateDCF(projections: YearlyData[], wacc: number, terminalGrowth: number): DCFResult {
  if (projections.length === 0 || terminalGrowth >= wacc) {
    return {
      enterpriseValue: 0,
      equityValue: 0,
      perShareValue: 0,
      pvCashFlows: projections.map(() => 0),
      isValid: false,
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
  const elasticityShort = -0.4;
  const elasticityLong = -0.6;
  const passThroughPct = 85;
  const priceIncrease = simHike * (passThroughPct / 100);
  const volumeImpactShort = -(priceIncrease * Math.abs(elasticityShort));
  const volumeImpactLong = -(priceIncrease * Math.abs(elasticityLong));
  const revenueImpact = priceIncrease + volumeImpactShort;
  const newCigRevenue = latestData.cigaretteRevenue * (1 + revenueImpact / 100);
  const marginPressure = simHike > 16 ? (simHike - 16) * 0.5 : 0;
  const newEbitMargin = Math.max(55, latestData.cigaretteEbitMargin - marginPressure);
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
