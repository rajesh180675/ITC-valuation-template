// ITC Limited - Comprehensive Financial Data & Projections

export interface YearlyData {
  year: string;
  fy: string;
  revenue: number;
  cigaretteRevenue: number;
  fmcgRevenue: number;
  hotelsRevenue: number;
  paperRevenue: number;
  agriRevenue: number;
  ebitda: number;
  ebitdaMargin: number;
  netProfit: number;
  netMargin: number;
  eps: number;
  dps: number;
  roe: number;
  roce: number;
  cigaretteEbitMargin: number;
  fmcgEbitdaMargin: number;
  freeCashFlow: number;
  totalAssets: number;
  netDebt: number;
  taxHikePct: number;
  stockPriceHigh: number;
  stockPriceLow: number;
  dividendYield: number;
  peRatio: number;
  cigaretteVolumeIndex: number;
}

export const historicalData: YearlyData[] = [
  { year: '2012', fy: 'FY2012', revenue: 35997, cigaretteRevenue: 21200, fmcgRevenue: 5200, hotelsRevenue: 1400, paperRevenue: 3020, agriRevenue: 5177, ebitda: 10778, ebitdaMargin: 29.9, netProfit: 6496, netMargin: 18.0, eps: 8.39, dps: 5.10, roe: 31.5, roce: 39.8, cigaretteEbitMargin: 62, fmcgEbitdaMargin: -3, freeCashFlow: 7800, totalAssets: 36000, netDebt: -1200, taxHikePct: 12, stockPriceHigh: 265, stockPriceLow: 190, dividendYield: 2.4, peRatio: 30, cigaretteVolumeIndex: 105 },
  { year: '2013', fy: 'FY2013', revenue: 39427, cigaretteRevenue: 23000, fmcgRevenue: 6100, hotelsRevenue: 1500, paperRevenue: 3227, agriRevenue: 5600, ebitda: 11860, ebitdaMargin: 30.1, netProfit: 7418, netMargin: 18.8, eps: 9.52, dps: 5.70, roe: 30.8, roce: 38.5, cigaretteEbitMargin: 63, fmcgEbitdaMargin: -2, freeCashFlow: 8500, totalAssets: 39000, netDebt: -1500, taxHikePct: 18, stockPriceHigh: 355, stockPriceLow: 245, dividendYield: 2.1, peRatio: 32, cigaretteVolumeIndex: 100 },
  { year: '2014', fy: 'FY2014', revenue: 42976, cigaretteRevenue: 24800, fmcgRevenue: 7200, hotelsRevenue: 1350, paperRevenue: 3426, agriRevenue: 6200, ebitda: 13321, ebitdaMargin: 31.0, netProfit: 8975, netMargin: 20.9, eps: 11.40, dps: 6.50, roe: 29.5, roce: 37.2, cigaretteEbitMargin: 63, fmcgEbitdaMargin: -1, freeCashFlow: 9200, totalAssets: 42500, netDebt: -2000, taxHikePct: 15, stockPriceHigh: 385, stockPriceLow: 295, dividendYield: 2.0, peRatio: 28, cigaretteVolumeIndex: 97 },
  { year: '2015', fy: 'FY2015', revenue: 45120, cigaretteRevenue: 25500, fmcgRevenue: 8500, hotelsRevenue: 1300, paperRevenue: 3520, agriRevenue: 6300, ebitda: 13925, ebitdaMargin: 30.9, netProfit: 9388, netMargin: 20.8, eps: 11.83, dps: 7.00, roe: 28.2, roce: 36.0, cigaretteEbitMargin: 62, fmcgEbitdaMargin: 1, freeCashFlow: 9800, totalAssets: 44500, netDebt: -3500, taxHikePct: 25, stockPriceHigh: 410, stockPriceLow: 305, dividendYield: 2.2, peRatio: 27, cigaretteVolumeIndex: 90 },
  { year: '2016', fy: 'FY2016', revenue: 46255, cigaretteRevenue: 25200, fmcgRevenue: 9500, hotelsRevenue: 1250, paperRevenue: 3605, agriRevenue: 6700, ebitda: 14300, ebitdaMargin: 30.9, netProfit: 10175, netMargin: 22.0, eps: 12.72, dps: 8.50, roe: 27.8, roce: 35.5, cigaretteEbitMargin: 62, fmcgEbitdaMargin: 2, freeCashFlow: 10200, totalAssets: 47000, netDebt: -5000, taxHikePct: 12, stockPriceHigh: 345, stockPriceLow: 255, dividendYield: 2.8, peRatio: 24, cigaretteVolumeIndex: 83 },
  { year: '2017', fy: 'FY2017', revenue: 46270, cigaretteRevenue: 24500, fmcgRevenue: 10500, hotelsRevenue: 1400, paperRevenue: 3770, agriRevenue: 6100, ebitda: 14600, ebitdaMargin: 31.6, netProfit: 10201, netMargin: 22.0, eps: 12.68, dps: 9.50, roe: 26.5, roce: 34.2, cigaretteEbitMargin: 63, fmcgEbitdaMargin: 3, freeCashFlow: 10800, totalAssets: 48000, netDebt: -6500, taxHikePct: 8, stockPriceHigh: 310, stockPriceLow: 235, dividendYield: 3.5, peRatio: 22, cigaretteVolumeIndex: 80 },
  { year: '2018', fy: 'FY2018', revenue: 47975, cigaretteRevenue: 24800, fmcgRevenue: 11500, hotelsRevenue: 1520, paperRevenue: 3955, agriRevenue: 6200, ebitda: 15700, ebitdaMargin: 32.7, netProfit: 11225, netMargin: 23.4, eps: 13.90, dps: 11.50, roe: 25.8, roce: 33.5, cigaretteEbitMargin: 64, fmcgEbitdaMargin: 5, freeCashFlow: 11200, totalAssets: 50000, netDebt: -8000, taxHikePct: 0, stockPriceHigh: 285, stockPriceLow: 230, dividendYield: 4.5, peRatio: 20, cigaretteVolumeIndex: 82 },
  { year: '2019', fy: 'FY2019', revenue: 49520, cigaretteRevenue: 25200, fmcgRevenue: 12500, hotelsRevenue: 1550, paperRevenue: 4070, agriRevenue: 6200, ebitda: 16400, ebitdaMargin: 33.1, netProfit: 12600, netMargin: 25.4, eps: 15.60, dps: 11.50, roe: 27.2, roce: 34.8, cigaretteEbitMargin: 65, fmcgEbitdaMargin: 6, freeCashFlow: 11800, totalAssets: 52000, netDebt: -10000, taxHikePct: 8, stockPriceHigh: 300, stockPriceLow: 240, dividendYield: 4.2, peRatio: 18, cigaretteVolumeIndex: 85 },
  { year: '2020', fy: 'FY2020', revenue: 46845, cigaretteRevenue: 23800, fmcgRevenue: 13200, hotelsRevenue: 1100, paperRevenue: 3745, agriRevenue: 5000, ebitda: 15900, ebitdaMargin: 33.9, netProfit: 15280, netMargin: 32.6, eps: 12.55, dps: 10.15, roe: 25.5, roce: 30.2, cigaretteEbitMargin: 66, fmcgEbitdaMargin: 8, freeCashFlow: 12500, totalAssets: 54000, netDebt: -13000, taxHikePct: 12, stockPriceHigh: 260, stockPriceLow: 135, dividendYield: 5.2, peRatio: 16, cigaretteVolumeIndex: 75 },
  { year: '2021', fy: 'FY2021', revenue: 53155, cigaretteRevenue: 26500, fmcgRevenue: 14500, hotelsRevenue: 850, paperRevenue: 4005, agriRevenue: 7300, ebitda: 18300, ebitdaMargin: 34.4, netProfit: 13529, netMargin: 25.4, eps: 10.85, dps: 10.75, roe: 24.8, roce: 31.5, cigaretteEbitMargin: 67, fmcgEbitdaMargin: 9, freeCashFlow: 14000, totalAssets: 56500, netDebt: -15000, taxHikePct: 0, stockPriceHigh: 245, stockPriceLow: 175, dividendYield: 5.0, peRatio: 18, cigaretteVolumeIndex: 80 },
  { year: '2022', fy: 'FY2022', revenue: 60761, cigaretteRevenue: 28200, fmcgRevenue: 16500, hotelsRevenue: 1400, paperRevenue: 5161, agriRevenue: 9500, ebitda: 19900, ebitdaMargin: 32.7, netProfit: 15057, netMargin: 24.8, eps: 12.10, dps: 11.50, roe: 26.2, roce: 33.0, cigaretteEbitMargin: 66, fmcgEbitdaMargin: 10, freeCashFlow: 13500, totalAssets: 60000, netDebt: -18000, taxHikePct: 16, stockPriceHigh: 290, stockPriceLow: 200, dividendYield: 4.5, peRatio: 22, cigaretteVolumeIndex: 88 },
  { year: '2023', fy: 'FY2023', revenue: 69476, cigaretteRevenue: 30800, fmcgRevenue: 19000, hotelsRevenue: 2400, paperRevenue: 5876, agriRevenue: 11400, ebitda: 22800, ebitdaMargin: 32.8, netProfit: 19428, netMargin: 28.0, eps: 15.61, dps: 13.75, roe: 28.5, roce: 35.2, cigaretteEbitMargin: 67, fmcgEbitdaMargin: 11, freeCashFlow: 15000, totalAssets: 65000, netDebt: -20000, taxHikePct: 16, stockPriceHigh: 460, stockPriceLow: 310, dividendYield: 3.5, peRatio: 26, cigaretteVolumeIndex: 92 },
  { year: '2024', fy: 'FY2024', revenue: 74200, cigaretteRevenue: 32500, fmcgRevenue: 20500, hotelsRevenue: 2700, paperRevenue: 6000, agriRevenue: 12500, ebitda: 24500, ebitdaMargin: 33.0, netProfit: 20300, netMargin: 27.4, eps: 16.30, dps: 15.50, roe: 28.0, roce: 35.0, cigaretteEbitMargin: 67, fmcgEbitdaMargin: 12, freeCashFlow: 16000, totalAssets: 68000, netDebt: -22000, taxHikePct: 0, stockPriceHigh: 500, stockPriceLow: 400, dividendYield: 3.2, peRatio: 27, cigaretteVolumeIndex: 95 },
];

export interface TaxEvent {
  year: string;
  budgetType: string;
  taxChange: string;
  nccdHike: number;
  stockReactionDay: number;
  stockReactionWeek: number;
  stockReactionMonth: number;
  volumeImpact: number;
  itcPassedThrough: boolean;
  notes: string;
}

export const taxEvents: TaxEvent[] = [
  { year: '2012', budgetType: 'Union', taxChange: 'Excise +18-21%', nccdHike: 18, stockReactionDay: -3.5, stockReactionWeek: -5.5, stockReactionMonth: -4.0, volumeImpact: -3.5, itcPassedThrough: true, notes: 'Sharp hike on non-filter & filter segments' },
  { year: '2013', budgetType: 'Union', taxChange: 'Excise +8-18%', nccdHike: 14, stockReactionDay: -2.5, stockReactionWeek: -3.0, stockReactionMonth: -1.0, volumeImpact: -2.0, itcPassedThrough: true, notes: 'Mixed hike across categories' },
  { year: '2014', budgetType: 'Union', taxChange: 'Excise +12-17%', nccdHike: 14, stockReactionDay: -1.5, stockReactionWeek: -2.0, stockReactionMonth: 1.0, volumeImpact: -1.5, itcPassedThrough: true, notes: 'First Modi govt budget, hike in line with expectations' },
  { year: '2015', budgetType: 'Union', taxChange: 'Excise +25%', nccdHike: 25, stockReactionDay: -5.5, stockReactionWeek: -7.0, stockReactionMonth: -8.0, volumeImpact: -8.0, itcPassedThrough: true, notes: 'Steepest hike in a decade — significant volume destruction' },
  { year: '2016', budgetType: 'Union', taxChange: 'Excise +10-15%', nccdHike: 12, stockReactionDay: -2.0, stockReactionWeek: -3.0, stockReactionMonth: -1.0, volumeImpact: -2.5, itcPassedThrough: true, notes: 'Cumulative impact with previous year\'s steep hike' },
  { year: '2017', budgetType: 'Union', taxChange: 'Excise +6-10%', nccdHike: 8, stockReactionDay: -1.0, stockReactionWeek: -1.5, stockReactionMonth: 0.5, volumeImpact: -1.0, itcPassedThrough: true, notes: 'Last pre-GST budget; muted impact' },
  { year: '2017Q3', budgetType: 'GST', taxChange: 'GST 28% + Cess', nccdHike: 10, stockReactionDay: -2.0, stockReactionWeek: -4.0, stockReactionMonth: -3.0, volumeImpact: -4.0, itcPassedThrough: true, notes: 'GST implementation disrupted supply chains' },
  { year: '2018', budgetType: 'Union', taxChange: 'NO HIKE', nccdHike: 0, stockReactionDay: 3.5, stockReactionWeek: 5.0, stockReactionMonth: 7.0, volumeImpact: 1.5, itcPassedThrough: false, notes: 'Relief rally — first no-hike budget post-GST' },
  { year: '2019', budgetType: 'Union', taxChange: 'NCCD +5-10%', nccdHike: 7, stockReactionDay: -2.0, stockReactionWeek: -1.0, stockReactionMonth: 2.0, volumeImpact: -1.0, itcPassedThrough: true, notes: 'Modest hike; market had expected worse' },
  { year: '2020', budgetType: 'Union', taxChange: 'NCCD +10-15%', nccdHike: 13, stockReactionDay: -4.0, stockReactionWeek: -8.0, stockReactionMonth: -20.0, volumeImpact: -6.0, itcPassedThrough: true, notes: 'COVID amplified the decline; budget + pandemic' },
  { year: '2021', budgetType: 'Union', taxChange: 'NO HIKE', nccdHike: 0, stockReactionDay: 2.0, stockReactionWeek: 4.0, stockReactionMonth: 5.0, volumeImpact: 3.0, itcPassedThrough: false, notes: 'Recovery year; no tax hike + post-COVID normalization' },
  { year: '2022', budgetType: 'Union', taxChange: 'NCCD ~16%', nccdHike: 16, stockReactionDay: -1.0, stockReactionWeek: -2.0, stockReactionMonth: 3.0, volumeImpact: -2.5, itcPassedThrough: true, notes: 'Market largely priced in the hike; resilient reaction' },
  { year: '2023', budgetType: 'Union', taxChange: 'NCCD ~16%', nccdHike: 16, stockReactionDay: -0.5, stockReactionWeek: 1.0, stockReactionMonth: 4.0, volumeImpact: -1.5, itcPassedThrough: true, notes: 'Back-to-back 16% hikes; minimal stock impact' },
  { year: '2024', budgetType: 'Union', taxChange: 'NO HIKE', nccdHike: 0, stockReactionDay: 1.5, stockReactionWeek: 3.0, stockReactionMonth: 2.0, volumeImpact: 2.0, itcPassedThrough: false, notes: 'No hike in coalition government\'s first budget' },
];

export interface SegmentData {
  name: string;
  revenue: number;
  ebit: number;
  ebitMargin: number;
  revenueShare: number;
  ebitShare: number;
  color: string;
}

export const segmentDataFY24: SegmentData[] = [
  { name: 'Cigarettes', revenue: 32500, ebit: 21000, ebitMargin: 64.6, revenueShare: 43.8, ebitShare: 77.8, color: '#10b981' },
  { name: 'FMCG (Non-Cigarette)', revenue: 20500, ebit: 2460, ebitMargin: 12.0, revenueShare: 27.6, ebitShare: 9.1, color: '#3b82f6' },
  { name: 'Hotels', revenue: 2700, ebit: 730, ebitMargin: 27.0, revenueShare: 3.6, ebitShare: 2.7, color: '#f59e0b' },
  { name: 'Paperboards & Packaging', revenue: 6000, ebit: 1620, ebitMargin: 27.0, revenueShare: 8.1, ebitShare: 6.0, color: '#8b5cf6' },
  { name: 'Agri-Business', revenue: 12500, ebit: 1125, ebitMargin: 9.0, revenueShare: 16.8, ebitShare: 4.2, color: '#ef4444' },
];

export interface ProjectionAssumptions {
  cigaretteRevenueGrowth: number;
  fmcgRevenueGrowth: number;
  hotelsRevenueGrowth: number;
  paperRevenueGrowth: number;
  agriRevenueGrowth: number;
  cigaretteEbitMargin: number;
  fmcgEbitdaMargin: number;
  taxRate: number;
  capexPercent: number;
  terminalGrowth: number;
  wacc: number;
  annualNccdHike: number;
}

export const defaultAssumptions: ProjectionAssumptions = {
  cigaretteRevenueGrowth: 6,
  fmcgRevenueGrowth: 13,
  hotelsRevenueGrowth: 8,
  paperRevenueGrowth: 6,
  agriRevenueGrowth: 7,
  cigaretteEbitMargin: 66,
  fmcgEbitdaMargin: 14,
  taxRate: 25,
  capexPercent: 8,
  terminalGrowth: 5.5,
  wacc: 10.5,
  annualNccdHike: 12,
};

export interface SOTPValuation {
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

export const sotpData: SOTPValuation[] = [
  { segment: 'Cigarettes', ebit: 21000, multiple: 16, multipleLow: 14, multipleHigh: 18, value: 336000, valueLow: 294000, valueHigh: 378000, basis: 'Global tobacco peers 9-12x + India premium' },
  { segment: 'FMCG (Non-Cigarette)', ebit: 2460, multiple: 45, multipleLow: 40, multipleHigh: 50, value: 110700, valueLow: 98400, valueHigh: 123000, basis: 'Indian FMCG peers 40-60x earnings' },
  { segment: 'Hotels (Demerged)', ebit: 730, multiple: 20, multipleLow: 16, multipleHigh: 24, value: 14600, valueLow: 11680, valueHigh: 17520, basis: 'Indian hotel peers 16-24x' },
  { segment: 'Paperboards & Packaging', ebit: 1620, multiple: 14, multipleLow: 12, multipleHigh: 16, value: 22680, valueLow: 19440, valueHigh: 25920, basis: 'Packaging/paper peers 12-16x' },
  { segment: 'Agri-Business', ebit: 1125, multiple: 10, multipleLow: 8, multipleHigh: 12, value: 11250, valueLow: 9000, valueHigh: 13500, basis: 'Commodity trading 8-12x' },
  { segment: 'ITC Infotech', ebit: 500, multiple: 16, multipleLow: 14, multipleHigh: 18, value: 8000, valueLow: 7000, valueHigh: 9000, basis: 'Mid-tier IT services 14-18x' },
];

export const sharesOutstanding = 1245; // crore shares

export const globalTobaccoComparison = [
  { country: 'India (ITC)', taxPctRetail: 55, packPriceINR: 300, perCapitaSticks: 90, marketShare: 80 },
  { country: 'Australia', taxPctRetail: 70, packPriceINR: 2200, perCapitaSticks: 900, marketShare: 40 },
  { country: 'UK', taxPctRetail: 77, packPriceINR: 1350, perCapitaSticks: 700, marketShare: 35 },
  { country: 'USA', taxPctRetail: 45, packPriceINR: 900, perCapitaSticks: 1000, marketShare: 50 },
  { country: 'Japan', taxPctRetail: 63, packPriceINR: 450, perCapitaSticks: 1200, marketShare: 65 },
  { country: 'China', taxPctRetail: 56, packPriceINR: 320, perCapitaSticks: 1800, marketShare: 98 },
  { country: 'Brazil', taxPctRetail: 67, packPriceINR: 300, perCapitaSticks: 500, marketShare: 80 },
  { country: 'Indonesia', taxPctRetail: 60, packPriceINR: 250, perCapitaSticks: 1100, marketShare: 60 },
];

export const budgetCheatSheet = [
  { hikePct: '0% (No hike)', action: 'BUY aggressively', expectedImpact: '+5 to +8%', confidence: 'HIGH', stockMove: 6.5 },
  { hikePct: '1–10%', action: 'BUY on dip', expectedImpact: '+2 to +4%', confidence: 'HIGH', stockMove: 3 },
  { hikePct: '10–16%', action: 'HOLD / minor buy', expectedImpact: '-1 to +2%', confidence: 'MODERATE', stockMove: 0.5 },
  { hikePct: '16–20%', action: 'HOLD / wait', expectedImpact: '-2 to -4%', confidence: 'MODERATE', stockMove: -3 },
  { hikePct: '>20%', action: 'SELL/REDUCE', expectedImpact: '-5 to -8%', confidence: 'LOW', stockMove: -6.5 },
  { hikePct: '>25% (Extreme)', action: 'SELL; wait for data', expectedImpact: '-7 to -12%', confidence: 'LOW', stockMove: -9.5 },
];

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
    const revenue = totalRev;

    const yearNum = 2024 + i;
    const fcf = ebitda * (1 - assumptions.capexPercent / 100) * 0.7;
    const dps = prev.dps * 1.08;
    const eps = netProfit / sharesOutstanding * 100;

    const newEntry: YearlyData = {
      year: String(yearNum),
      fy: `FY${yearNum}E`,
      revenue: Math.round(revenue),
      cigaretteRevenue: Math.round(cigRev),
      fmcgRevenue: Math.round(fmcgRev),
      hotelsRevenue: Math.round(hotelRev),
      paperRevenue: Math.round(paperRev),
      agriRevenue: Math.round(agriRev),
      ebitda: Math.round(ebitda),
      ebitdaMargin: Math.round((ebitda / revenue) * 100 * 10) / 10,
      netProfit: Math.round(netProfit),
      netMargin: Math.round((netProfit / revenue) * 100 * 10) / 10,
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

export function calculateDCF(projections: YearlyData[], wacc: number, terminalGrowth: number): { enterpriseValue: number; equityValue: number; perShareValue: number; pvCashFlows: number[] } {
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
  const netCash = Math.abs(lastData.netDebt);

  const enterpriseValue = totalPV + pvTerminalValue;
  const equityValue = enterpriseValue + netCash;
  const perShareValue = equityValue / sharesOutstanding;

  return {
    enterpriseValue: Math.round(enterpriseValue),
    equityValue: Math.round(equityValue),
    perShareValue: Math.round(perShareValue * 100) / 100,
    pvCashFlows,
  };
}
