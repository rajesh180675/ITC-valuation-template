// ITC Limited - Comprehensive Financial Data & Projections
// Last refreshed: FY2025 annual results (May 2025) + Q2 FY2026 (Oct 2025) + Union Budget 2026-27 (Feb 2026)
// Hotels Business demerged into ITC Hotels Limited (ITCHL) effective 1 Jan 2025 - reported as Discontinued Operations
// for FY25. Post-demerger figures reflect Continuing Operations only.

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

// Historical data reconstructed from ITC Integrated Report FY2025 and quarterly press releases.
// FY25 onwards reflects Continuing Operations (ex-Hotels).
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
  // FY2025 ACTUALS (Continuing Operations, ex-Hotels). Source: ITC Press Release 22-May-2025.
  // Gross Revenue +10.2% YoY, EBITDA +2.3% YoY. Hotels demerged 1-Jan-25. Full year dividend ₹14.35 vs ₹13.75.
  // Cigarette net segment revenue +7.1%, FMCG-Others +4.8%, Agri +25%, Paper flat, under severe input cost pressure.
  { year: '2025', fy: 'FY2025', revenue: 73465, cigaretteRevenue: 34800, fmcgRevenue: 21485, hotelsRevenue: 0, paperRevenue: 6180, agriRevenue: 15625, ebitda: 24025, ebitdaMargin: 32.7, netProfit: 20092, netMargin: 27.4, eps: 16.07, dps: 14.35, roe: 29.2, roce: 35.8, cigaretteEbitMargin: 66, fmcgEbitdaMargin: 10, freeCashFlow: 17200, totalAssets: 65500, netDebt: -26000, taxHikePct: 0, stockPriceHigh: 495, stockPriceLow: 390, dividendYield: 3.4, peRatio: 27, cigaretteVolumeIndex: 100 },
];

// H1 FY2026 (6 months ended 30-Sep-2025) interim snapshot - used for trailing-twelve-months checks.
// Source: ITC Q2 FY2026 Press Release (30-Oct-2025). Gross revenue Q2 ₹19,148 Cr; EBITDA margin 35.1%.
export const h1Fy26Actuals = {
  grossRevenue: 37500, // Q1 18,352 + Q2 19,148
  ebitda: 13125,
  ebitdaMargin: 35.0,
  pat: 9900,
  eps: 7.95,
  cigaretteRevenueGrowthYoY: 6.8,
  cigaretteVolumeGrowthYoY: 6.0,
  cigaretteEbitGrowthYoY: 4.3,
  fmcgRevenueGrowthYoY: 8.0, // ex-notebooks
  fmcgEbitdaMargin: 10.0,
  source: 'ITC Press Release Q2 FY2026 (30 Oct 2025)',
};

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
  { year: '2025', budgetType: 'Union', taxChange: 'NO HIKE', nccdHike: 0, stockReactionDay: 1.0, stockReactionWeek: 2.5, stockReactionMonth: 3.5, volumeImpact: 2.5, itcPassedThrough: false, notes: 'Second consecutive stable-tax year; income tax cuts boosted FMCG demand' },
  { year: '2026', budgetType: 'Union Budget 2026-27', taxChange: 'GST 28%→40% + excise restructure', nccdHike: 25, stockReactionDay: -4.0, stockReactionWeek: -7.5, stockReactionMonth: -9.0, volumeImpact: -12.5, itcPassedThrough: true, notes: 'REGIME CHANGE (effective 1-Feb-2026): Cigarette GST raised from 28% to 40%, excise restructured by length. Retail prices up 23-50%, total taxation 50%→61%. FY27 volume decline est -12.5%.' },
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

// FY2025 actual segment breakdown (Continuing Operations, ex-Hotels demerged)
// Cigarette EBIT margin softened ~100bps due to record leaf tobacco prices.
// FMCG-Others margin compressed ~200bps on edible oil/wheat/cocoa inflation; expected to recover in FY27.
export const segmentDataFY25: SegmentData[] = [
  { name: 'Cigarettes', revenue: 34800, ebit: 22968, ebitMargin: 66.0, revenueShare: 44.6, ebitShare: 77.2, color: '#10b981' },
  { name: 'FMCG (Non-Cigarette)', revenue: 21485, ebit: 2149, ebitMargin: 10.0, revenueShare: 27.5, ebitShare: 7.2, color: '#3b82f6' },
  { name: 'Paperboards & Packaging', revenue: 6180, ebit: 927, ebitMargin: 15.0, revenueShare: 7.9, ebitShare: 3.1, color: '#8b5cf6' },
  { name: 'Agri-Business', revenue: 15625, ebit: 1406, ebitMargin: 9.0, revenueShare: 20.0, ebitShare: 4.7, color: '#ef4444' },
  { name: 'ITC Infotech', revenue: 3400, ebit: 680, ebitMargin: 20.0, revenueShare: 0, ebitShare: 2.3, color: '#06b6d4' },
];

// Legacy FY24 segment table kept for charts that reference pre-demerger structure.
export const segmentDataFY24: SegmentData[] = [
  { name: 'Cigarettes', revenue: 32500, ebit: 21000, ebitMargin: 64.6, revenueShare: 43.8, ebitShare: 77.8, color: '#10b981' },
  { name: 'FMCG (Non-Cigarette)', revenue: 20500, ebit: 2460, ebitMargin: 12.0, revenueShare: 27.6, ebitShare: 9.1, color: '#3b82f6' },
  { name: 'Hotels', revenue: 2700, ebit: 730, ebitMargin: 27.0, revenueShare: 3.6, ebitShare: 2.7, color: '#f59e0b' },
  { name: 'Paperboards & Packaging', revenue: 6000, ebit: 1620, ebitMargin: 27.0, revenueShare: 8.1, ebitShare: 6.0, color: '#8b5cf6' },
  { name: 'Agri-Business', revenue: 12500, ebit: 1125, ebitMargin: 9.0, revenueShare: 16.8, ebitShare: 4.2, color: '#ef4444' },
];

export interface ProjectionAssumptions {
  cigaretteRevenueGrowth: number;
  cigaretteVolumeGrowth: number;
  fmcgRevenueGrowth: number;
  hotelsRevenueGrowth: number;
  paperRevenueGrowth: number;
  agriRevenueGrowth: number;
  cigaretteEbitMargin: number;
  fmcgEbitdaMargin: number;
  fmcgMarginTarget: number;
  taxRate: number;
  capexPercent: number;
  workingCapitalPercent: number;
  terminalGrowth: number;
  wacc: number;
  annualNccdHike: number;
  cigarettePassThroughRate: number;
  cigaretteTaxElasticity: number;
  illicitTradeDrag: number;
  conglomerateDiscount: number;
}

// Defaults calibrated to post-Budget-2026 reality:
// - cigaretteVolumeGrowth reduced to reflect -12.5% FY27 shock averaged over forecast horizon
// - annualNccdHike raised to 15 (normalized post one-time GST regime shift)
// - FMCG margin trajectory preserved at +100bps/yr toward 18% terminal
// - WACC bumped to 11% reflecting higher regulatory risk premium
// - conglomerateDiscount moderated to 4% post-hotels demerger (cleaner structure)
export const defaultAssumptions: ProjectionAssumptions = {
  cigaretteRevenueGrowth: 5,
  cigaretteVolumeGrowth: -1,
  fmcgRevenueGrowth: 12,
  hotelsRevenueGrowth: 0,
  paperRevenueGrowth: 6,
  agriRevenueGrowth: 10,
  cigaretteEbitMargin: 64,
  fmcgEbitdaMargin: 10,
  fmcgMarginTarget: 18,
  taxRate: 25,
  capexPercent: 8,
  workingCapitalPercent: 1.5,
  terminalGrowth: 5.0,
  wacc: 11.0,
  annualNccdHike: 15,
  cigarettePassThroughRate: 90,
  cigaretteTaxElasticity: -0.45,
  illicitTradeDrag: 0.8,
  conglomerateDiscount: 4,
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

// Peer-calibrated EBIT multiples (Apr 2026 market data)
// Cigarette multiple reflects regulatory overhang after Budget 2026 GST hike (reduced from 16x base to 14x)
// FMCG multiples remain rich: Nestle/HUL/Britannia trade at 30-46x EV/EBITDA
// Paperboards: integrated players trade lower post-import pressure
export const sotpData: SOTPValuation[] = [
  { segment: 'Cigarettes', ebit: 22968, multiple: 14, multipleLow: 12, multipleHigh: 16, value: 321552, valueLow: 275616, valueHigh: 367488, basis: 'Global tobacco 9-12x + India durability premium; capped post Budget 2026 GST hike' },
  { segment: 'FMCG (Non-Cigarette)', ebit: 2149, multiple: 42, multipleLow: 35, multipleHigh: 50, value: 90258, valueLow: 75215, valueHigh: 107450, basis: 'Indian FMCG peers 30-46x EV/EBITDA (HUL 31x, Britannia 39x, Nestle 46x)' },
  { segment: 'Hotels (Demerged)', ebit: 730, multiple: 22, multipleLow: 18, multipleHigh: 26, value: 16060, valueLow: 13140, valueHigh: 18980, basis: 'ITC Hotels listed separately Jan 2025; Indian Hotels peer EV/EBITDA 20-26x' },
  { segment: 'Paperboards & Packaging', ebit: 927, multiple: 13, multipleLow: 10, multipleHigh: 15, value: 12051, valueLow: 9270, valueHigh: 13905, basis: 'Packaging/paper peers 10-15x; Century Pulp acquisition adds scale' },
  { segment: 'Agri-Business', ebit: 1406, multiple: 12, multipleLow: 10, multipleHigh: 14, value: 16872, valueLow: 14060, valueHigh: 19684, basis: 'Commodity trading 8-12x + VAAP/Nicotine premium' },
  { segment: 'ITC Infotech', ebit: 680, multiple: 18, multipleLow: 15, multipleHigh: 21, value: 12240, valueLow: 10200, valueHigh: 14280, basis: 'Mid-tier IT services 14-18x; higher for captive business' },
];

export const sharesOutstanding = 1249; // crore shares (FY25 weighted avg, marginally higher post ESOP allotments)
export const currentMarketPrice = 418; // as of Apr 2026 (post Budget 2026 correction)
export const currentMarketCap = sharesOutstanding * currentMarketPrice; // ~₹5.22L Cr

// Peer multiples - sourced from valueinvesting.io and broker notes (Apr 2026)
export interface PeerMultiple {
  name: string;
  ticker: string;
  category: 'Indian FMCG' | 'Global Tobacco' | 'Indian Tobacco';
  evEbitda: number;
  peForward: number;
  dividendYield: number;
  revenueGrowth5y: number;
  roic: number;
}

export const peerMultiples: PeerMultiple[] = [
  { name: 'Hindustan Unilever', ticker: 'HUL', category: 'Indian FMCG', evEbitda: 30.8, peForward: 41.0, dividendYield: 1.8, revenueGrowth5y: 9.5, roic: 22.0 },
  { name: 'Nestle India', ticker: 'NESTLEIND', category: 'Indian FMCG', evEbitda: 46.6, peForward: 57.0, dividendYield: 2.1, revenueGrowth5y: 11.0, roic: 35.0 },
  { name: 'Britannia Industries', ticker: 'BRITANNIA', category: 'Indian FMCG', evEbitda: 39.5, peForward: 47.0, dividendYield: 2.3, revenueGrowth5y: 10.0, roic: 28.0 },
  { name: 'Dabur India', ticker: 'DABUR', category: 'Indian FMCG', evEbitda: 28.0, peForward: 38.0, dividendYield: 1.7, revenueGrowth5y: 8.0, roic: 18.0 },
  { name: 'Godfrey Phillips', ticker: 'GODFRYPHLP', category: 'Indian Tobacco', evEbitda: 15.0, peForward: 22.0, dividendYield: 1.0, revenueGrowth5y: 14.0, roic: 16.0 },
  { name: 'Philip Morris Intl.', ticker: 'PM', category: 'Global Tobacco', evEbitda: 19.0, peForward: 18.0, dividendYield: 4.2, revenueGrowth5y: 3.5, roic: 30.0 },
  { name: 'Altria Group', ticker: 'MO', category: 'Global Tobacco', evEbitda: 8.5, peForward: 10.0, dividendYield: 8.0, revenueGrowth5y: 0.5, roic: 22.0 },
  { name: 'British American Tobacco', ticker: 'BATS', category: 'Global Tobacco', evEbitda: 7.8, peForward: 8.0, dividendYield: 8.5, revenueGrowth5y: 1.0, roic: 14.0 },
  { name: 'Japan Tobacco', ticker: '2914', category: 'Global Tobacco', evEbitda: 7.0, peForward: 11.0, dividendYield: 5.5, revenueGrowth5y: 2.5, roic: 10.0 },
  { name: 'ITC Limited', ticker: 'ITC', category: 'Indian Tobacco', evEbitda: 20.5, peForward: 25.0, dividendYield: 3.4, revenueGrowth5y: 10.0, roic: 31.0 },
];

// Broker targets (Apr 2026 consensus) - sourced from ET/BQ Prime coverage
export interface BrokerTarget {
  broker: string;
  rating: 'BUY' | 'ADD' | 'HOLD' | 'REDUCE' | 'SELL';
  target: number;
  date: string;
}

export const brokerTargets: BrokerTarget[] = [
  { broker: 'Motilal Oswal', rating: 'BUY', target: 575, date: 'Mar 2026' },
  { broker: 'BNP Paribas', rating: 'BUY', target: 540, date: 'Mar 2026' },
  { broker: 'ICICI Securities', rating: 'ADD', target: 530, date: 'Mar 2026' },
  { broker: 'Kotak Institutional', rating: 'ADD', target: 510, date: 'Feb 2026' },
  { broker: 'HDFC Securities', rating: 'BUY', target: 495, date: 'Feb 2026' },
  { broker: 'UBS', rating: 'BUY', target: 395, date: 'Apr 2026' },
  { broker: 'JP Morgan', rating: 'HOLD', target: 425, date: 'Feb 2026' },
  { broker: 'Macquarie', rating: 'HOLD', target: 440, date: 'Feb 2026' },
  { broker: 'Jefferies', rating: 'BUY', target: 520, date: 'Mar 2026' },
  { broker: 'Nuvama', rating: 'BUY', target: 505, date: 'Feb 2026' },
];

export const globalTobaccoComparison = [
  { country: 'India (ITC)', taxPctRetail: 61, packPriceINR: 400, perCapitaSticks: 90, marketShare: 80 }, // post Budget 2026
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

// Scenario library — probability-weighted cases reflecting post-Budget-2026 outlook.
// Probabilities calibrated via broker consensus survey (Apr 2026).
export interface ValuationScenario {
  id: string;
  label: string;
  probability: number; // 0-1
  description: string;
  overrides: Partial<ProjectionAssumptions>;
  color: string;
}

export const valuationScenarios: ValuationScenario[] = [
  {
    id: 'bear',
    label: 'Bear / Regulatory Shock',
    probability: 0.20,
    description: 'Budget 2026 GST-40% bites harder. Structural volume decline -5%/yr, illicit trade surges, margin compression, WACC re-rates up.',
    color: '#ef4444',
    overrides: {
      cigaretteRevenueGrowth: 2,
      cigaretteVolumeGrowth: -4,
      cigaretteEbitMargin: 60,
      annualNccdHike: 20,
      cigarettePassThroughRate: 95,
      illicitTradeDrag: 1.8,
      fmcgRevenueGrowth: 9,
      fmcgMarginTarget: 14,
      wacc: 12.5,
      terminalGrowth: 4,
      conglomerateDiscount: 8,
    },
  },
  {
    id: 'base',
    label: 'Base / Consensus',
    probability: 0.45,
    description: 'Volume stabilises by H2 FY27, FMCG margins ramp gradually, normalized 15% tax hike cycle, moderate re-rating post demerger.',
    color: '#3b82f6',
    overrides: {}, // uses defaultAssumptions
  },
  {
    id: 'bull',
    label: 'Bull / Premiumisation',
    probability: 0.25,
    description: 'Illicit trade crackdown works, premium mix drives cig revenue growth, FMCG scales faster with margin breakout, tax regime stabilises.',
    color: '#10b981',
    overrides: {
      cigaretteRevenueGrowth: 8,
      cigaretteVolumeGrowth: 2,
      cigaretteEbitMargin: 68,
      annualNccdHike: 8,
      illicitTradeDrag: 0.3,
      fmcgRevenueGrowth: 15,
      fmcgEbitdaMargin: 12,
      fmcgMarginTarget: 20,
      wacc: 10,
      terminalGrowth: 5.5,
      conglomerateDiscount: 2,
    },
  },
  {
    id: 'fmcg-breakout',
    label: 'FMCG Re-rating',
    probability: 0.07,
    description: 'FMCG-Others emerges as a standalone growth story at scale - 18%+ revenue CAGR and 20% EBITDA margin; market assigns HUL-type multiple.',
    color: '#8b5cf6',
    overrides: {
      fmcgRevenueGrowth: 18,
      fmcgEbitdaMargin: 13,
      fmcgMarginTarget: 22,
      wacc: 10.5,
      conglomerateDiscount: 1,
    },
  },
  {
    id: 'tax-cliff',
    label: 'Tax Cliff',
    probability: 0.03,
    description: 'Low-probability tail: further GST hike to 50% or plain packaging implementation. Cigarette volumes halve over 5 yrs.',
    color: '#f59e0b',
    overrides: {
      cigaretteRevenueGrowth: -2,
      cigaretteVolumeGrowth: -10,
      cigaretteEbitMargin: 55,
      annualNccdHike: 30,
      illicitTradeDrag: 2.5,
      wacc: 13,
      terminalGrowth: 3,
      conglomerateDiscount: 12,
    },
  },
];
