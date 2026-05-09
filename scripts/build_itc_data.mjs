#!/usr/bin/env node
/**
 * Seed JSON data generator for ITC valuation template.
 *
 * Reads static data from src/data/itcData.ts and transforms it into
 * four JSON files in public/data/ matching the itcDataSchemas.ts interfaces.
 *
 * Usage: node --import tsx scripts/build_itc_data.mjs
 * (or: npm run generate:itc:synthetic)
 *
 * Generated files are marked source: "synthetic" and schemaVersion: 1.
 * For real-time data, use: python3 scripts/data_collector/fetch_itc_data.py all
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// We import from the compiled TS data, but since this script uses tsx,
// we can directly import the TS module.
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public', 'data');

// Ensure output directory exists
mkdirSync(OUT_DIR, { recursive: true });

// ─── Import static data ──────────────────────────────────────────────────────

// Since we use tsx, we can import the TS module directly.
// However, to keep the script self-contained and avoid module resolution issues,
// we duplicate the minimum needed data inline. This is intentional for the
// synthetic seed generator — the Python script will produce real data from yfinance.

// The data below mirrors src/data/itcData.ts historicalData (FY2012-FY2025)
const historicalData = [
  { year: '2012', fy: 'FY2012', revenue: 35997, cigaretteRevenue: 21200, fmcgRevenue: 5200, hotelsRevenue: 1400, paperRevenue: 3020, agriRevenue: 5177, ebitda: 10778, ebitdaMargin: 29.9, netProfit: 6496, netMargin: 18.0, eps: 8.39, dps: 5.10, roe: 31.5, roce: 39.8, cigaretteEbitMargin: 62, fmcgEbitdaMargin: -3, freeCashFlow: 7800, totalAssets: 36000, netDebt: -1200, stockPriceHigh: 265, stockPriceLow: 190, peRatio: 30, dividendYield: 2.4, cigaretteVolumeIndex: 105 },
  { year: '2013', fy: 'FY2013', revenue: 39427, cigaretteRevenue: 23000, fmcgRevenue: 6100, hotelsRevenue: 1500, paperRevenue: 3227, agriRevenue: 5600, ebitda: 11860, ebitdaMargin: 30.1, netProfit: 7418, netMargin: 18.8, eps: 9.52, dps: 5.70, roe: 30.8, roce: 38.5, cigaretteEbitMargin: 63, fmcgEbitdaMargin: -2, freeCashFlow: 8500, totalAssets: 39000, netDebt: -1500, stockPriceHigh: 355, stockPriceLow: 245, peRatio: 32, dividendYield: 2.1, cigaretteVolumeIndex: 100 },
  { year: '2014', fy: 'FY2014', revenue: 42976, cigaretteRevenue: 24800, fmcgRevenue: 7200, hotelsRevenue: 1350, paperRevenue: 3426, agriRevenue: 6200, ebitda: 13321, ebitdaMargin: 31.0, netProfit: 8975, netMargin: 20.9, eps: 11.40, dps: 6.50, roe: 29.5, roce: 37.2, cigaretteEbitMargin: 63, fmcgEbitdaMargin: -1, freeCashFlow: 9200, totalAssets: 42500, netDebt: -2000, stockPriceHigh: 385, stockPriceLow: 295, peRatio: 28, dividendYield: 2.0, cigaretteVolumeIndex: 97 },
  { year: '2015', fy: 'FY2015', revenue: 45120, cigaretteRevenue: 25500, fmcgRevenue: 8500, hotelsRevenue: 1300, paperRevenue: 3520, agriRevenue: 6300, ebitda: 13925, ebitdaMargin: 30.9, netProfit: 9388, netMargin: 20.8, eps: 11.83, dps: 7.00, roe: 28.2, roce: 36.0, cigaretteEbitMargin: 62, fmcgEbitdaMargin: 1, freeCashFlow: 9800, totalAssets: 44500, netDebt: -3500, stockPriceHigh: 410, stockPriceLow: 305, peRatio: 27, dividendYield: 2.2, cigaretteVolumeIndex: 90 },
  { year: '2016', fy: 'FY2016', revenue: 46255, cigaretteRevenue: 25200, fmcgRevenue: 9500, hotelsRevenue: 1250, paperRevenue: 3605, agriRevenue: 6700, ebitda: 14300, ebitdaMargin: 30.9, netProfit: 10175, netMargin: 22.0, eps: 12.72, dps: 8.50, roe: 27.8, roce: 35.5, cigaretteEbitMargin: 62, fmcgEbitdaMargin: 2, freeCashFlow: 10200, totalAssets: 47000, netDebt: -5000, stockPriceHigh: 345, stockPriceLow: 255, peRatio: 24, dividendYield: 2.8, cigaretteVolumeIndex: 83 },
  { year: '2017', fy: 'FY2017', revenue: 46270, cigaretteRevenue: 24500, fmcgRevenue: 10500, hotelsRevenue: 1400, paperRevenue: 3770, agriRevenue: 6100, ebitda: 14600, ebitdaMargin: 31.6, netProfit: 10201, netMargin: 22.0, eps: 12.68, dps: 9.50, roe: 26.5, roce: 34.2, cigaretteEbitMargin: 63, fmcgEbitdaMargin: 3, freeCashFlow: 10800, totalAssets: 48000, netDebt: -6500, stockPriceHigh: 310, stockPriceLow: 235, peRatio: 22, dividendYield: 3.5, cigaretteVolumeIndex: 80 },
  { year: '2018', fy: 'FY2018', revenue: 47975, cigaretteRevenue: 24800, fmcgRevenue: 11500, hotelsRevenue: 1520, paperRevenue: 3955, agriRevenue: 6200, ebitda: 15700, ebitdaMargin: 32.7, netProfit: 11225, netMargin: 23.4, eps: 13.90, dps: 11.50, roe: 25.8, roce: 33.5, cigaretteEbitMargin: 64, fmcgEbitdaMargin: 5, freeCashFlow: 11200, totalAssets: 50000, netDebt: -8000, stockPriceHigh: 285, stockPriceLow: 230, peRatio: 20, dividendYield: 4.5, cigaretteVolumeIndex: 82 },
  { year: '2019', fy: 'FY2019', revenue: 49520, cigaretteRevenue: 25200, fmcgRevenue: 12500, hotelsRevenue: 1550, paperRevenue: 4070, agriRevenue: 6200, ebitda: 16400, ebitdaMargin: 33.1, netProfit: 12600, netMargin: 25.4, eps: 15.60, dps: 11.50, roe: 27.2, roce: 34.8, cigaretteEbitMargin: 65, fmcgEbitdaMargin: 6, freeCashFlow: 11800, totalAssets: 52000, netDebt: -10000, stockPriceHigh: 300, stockPriceLow: 240, peRatio: 18, dividendYield: 4.2, cigaretteVolumeIndex: 85 },
  { year: '2020', fy: 'FY2020', revenue: 46845, cigaretteRevenue: 23800, fmcgRevenue: 13200, hotelsRevenue: 1100, paperRevenue: 3745, agriRevenue: 5000, ebitda: 15900, ebitdaMargin: 33.9, netProfit: 15280, netMargin: 32.6, eps: 12.55, dps: 10.15, roe: 25.5, roce: 30.2, cigaretteEbitMargin: 66, fmcgEbitdaMargin: 8, freeCashFlow: 12500, totalAssets: 54000, netDebt: -13000, stockPriceHigh: 260, stockPriceLow: 135, peRatio: 16, dividendYield: 5.2, cigaretteVolumeIndex: 75 },
  { year: '2021', fy: 'FY2021', revenue: 53155, cigaretteRevenue: 26500, fmcgRevenue: 14500, hotelsRevenue: 850, paperRevenue: 4005, agriRevenue: 7300, ebitda: 18300, ebitdaMargin: 34.4, netProfit: 13529, netMargin: 25.4, eps: 10.85, dps: 10.75, roe: 24.8, roce: 31.5, cigaretteEbitMargin: 67, fmcgEbitdaMargin: 9, freeCashFlow: 14000, totalAssets: 56500, netDebt: -15000, stockPriceHigh: 245, stockPriceLow: 175, peRatio: 18, dividendYield: 5.0, cigaretteVolumeIndex: 80 },
  { year: '2022', fy: 'FY2022', revenue: 60761, cigaretteRevenue: 28200, fmcgRevenue: 16500, hotelsRevenue: 1400, paperRevenue: 5161, agriRevenue: 9500, ebitda: 19900, ebitdaMargin: 32.7, netProfit: 15057, netMargin: 24.8, eps: 12.10, dps: 11.50, roe: 26.2, roce: 33.0, cigaretteEbitMargin: 66, fmcgEbitdaMargin: 10, freeCashFlow: 13500, totalAssets: 60000, netDebt: -18000, stockPriceHigh: 290, stockPriceLow: 200, peRatio: 22, dividendYield: 4.5, cigaretteVolumeIndex: 88 },
  { year: '2023', fy: 'FY2023', revenue: 69476, cigaretteRevenue: 30800, fmcgRevenue: 19000, hotelsRevenue: 2400, paperRevenue: 5876, agriRevenue: 11400, ebitda: 22800, ebitdaMargin: 32.8, netProfit: 19428, netMargin: 28.0, eps: 15.61, dps: 13.75, roe: 28.5, roce: 35.2, cigaretteEbitMargin: 67, fmcgEbitdaMargin: 11, freeCashFlow: 15000, totalAssets: 65000, netDebt: -20000, stockPriceHigh: 460, stockPriceLow: 310, peRatio: 26, dividendYield: 3.5, cigaretteVolumeIndex: 92 },
  { year: '2024', fy: 'FY2024', revenue: 74200, cigaretteRevenue: 32500, fmcgRevenue: 20500, hotelsRevenue: 2700, paperRevenue: 6000, agriRevenue: 12500, ebitda: 24500, ebitdaMargin: 33.0, netProfit: 20300, netMargin: 27.4, eps: 16.30, dps: 15.50, roe: 28.0, roce: 35.0, cigaretteEbitMargin: 67, fmcgEbitdaMargin: 12, freeCashFlow: 16000, totalAssets: 68000, netDebt: -22000, stockPriceHigh: 500, stockPriceLow: 400, peRatio: 27, dividendYield: 3.2, cigaretteVolumeIndex: 95 },
  { year: '2025', fy: 'FY2025', revenue: 73465, cigaretteRevenue: 34800, fmcgRevenue: 21485, hotelsRevenue: 0, paperRevenue: 6180, agriRevenue: 15625, ebitda: 24025, ebitdaMargin: 32.7, netProfit: 20092, netMargin: 27.4, eps: 16.07, dps: 14.35, roe: 29.2, roce: 35.8, cigaretteEbitMargin: 66, fmcgEbitdaMargin: 10, freeCashFlow: 17200, totalAssets: 65500, netDebt: -26000, stockPriceHigh: 495, stockPriceLow: 390, peRatio: 27, dividendYield: 3.4, cigaretteVolumeIndex: 100 },
];

const dividendHistory = [
  { year: '2012', fy: 'FY2012', dps: 5.10, specialDiv: 0, totalDps: 5.10, eps: 8.39, payoutRatio: 60.8, divYield: 2.4, priceApprec: 18.5, totalReturn: 20.9 },
  { year: '2013', fy: 'FY2013', dps: 5.70, specialDiv: 1.50, totalDps: 7.20, eps: 9.52, payoutRatio: 75.6, divYield: 2.1, priceApprec: 25.4, totalReturn: 27.5 },
  { year: '2014', fy: 'FY2014', dps: 6.50, specialDiv: 0, totalDps: 6.50, eps: 11.40, payoutRatio: 57.0, divYield: 2.0, priceApprec: -5.2, totalReturn: -3.2 },
  { year: '2015', fy: 'FY2015', dps: 7.00, specialDiv: 1.75, totalDps: 8.75, eps: 11.83, payoutRatio: 73.9, divYield: 2.2, priceApprec: -10.5, totalReturn: -8.3 },
  { year: '2016', fy: 'FY2016', dps: 8.50, specialDiv: 0, totalDps: 8.50, eps: 12.72, payoutRatio: 66.8, divYield: 2.8, priceApprec: 12.8, totalReturn: 15.6 },
  { year: '2017', fy: 'FY2017', dps: 9.50, specialDiv: 0, totalDps: 9.50, eps: 12.68, payoutRatio: 74.9, divYield: 3.5, priceApprec: 10.5, totalReturn: 14.0 },
  { year: '2018', fy: 'FY2018', dps: 11.50, specialDiv: 0, totalDps: 11.50, eps: 13.90, payoutRatio: 82.7, divYield: 4.5, priceApprec: -2.1, totalReturn: 2.4 },
  { year: '2019', fy: 'FY2019', dps: 11.50, specialDiv: 0, totalDps: 11.50, eps: 15.60, payoutRatio: 73.7, divYield: 4.2, priceApprec: 8.5, totalReturn: 12.7 },
  { year: '2020', fy: 'FY2020', dps: 10.15, specialDiv: 0, totalDps: 10.15, eps: 12.55, payoutRatio: 80.9, divYield: 5.2, priceApprec: -18.2, totalReturn: -13.0 },
  { year: '2021', fy: 'FY2021', dps: 10.75, specialDiv: 0, totalDps: 10.75, eps: 10.85, payoutRatio: 99.1, divYield: 5.0, priceApprec: 32.5, totalReturn: 37.5 },
  { year: '2022', fy: 'FY2022', dps: 11.50, specialDiv: 0, totalDps: 11.50, eps: 12.10, payoutRatio: 95.0, divYield: 4.5, priceApprec: 22.0, totalReturn: 26.5 },
  { year: '2023', fy: 'FY2023', dps: 13.75, specialDiv: 2.75, totalDps: 16.50, eps: 15.61, payoutRatio: 105.7, divYield: 3.5, priceApprec: 32.0, totalReturn: 35.5 },
  { year: '2024', fy: 'FY2024', dps: 15.50, specialDiv: 0, totalDps: 15.50, eps: 16.30, payoutRatio: 95.1, divYield: 3.2, priceApprec: 15.2, totalReturn: 18.4 },
  { year: '2025', fy: 'FY2025', dps: 14.35, specialDiv: 0, totalDps: 14.35, eps: 16.07, payoutRatio: 89.3, divYield: 3.4, priceApprec: 4.5, totalReturn: 7.9 },
];

const now = new Date().toISOString();

// ─── 1. itc_live_quote.json ────────────────────────────────────────────────

const latest = historicalData[historicalData.length - 1];
const sharesOutstanding = 1249;
const currentMarketPrice = 418;

const liveQuote = {
  symbol: 'ITC.NS',
  exchange: 'NSE',
  lastPrice: currentMarketPrice,
  change: 0,
  changePercent: 0,
  open: latest.stockPriceLow + (latest.stockPriceHigh - latest.stockPriceLow) * 0.5,
  high: latest.stockPriceHigh,
  low: latest.stockPriceLow,
  previousClose: latest.stockPriceLow + (latest.stockPriceHigh - latest.stockPriceLow) * 0.4,
  volume: 0,
  marketCap: sharesOutstanding * currentMarketPrice,
  pe: latest.peRatio,
  pb: 7.6,
  dividendYield: latest.dividendYield,
  fiftyTwoWeekHigh: latest.stockPriceHigh,
  fiftyTwoWeekLow: latest.stockPriceLow,
  ttmRevenue: latest.revenue,
  ttmNetProfit: latest.netProfit,
  source: 'synthetic',
  fetchedAt: now,
};

// ─── 2. itc_financials.json ──────────────────────────────────────────────────

const financials = {
  symbol: 'ITC.NS',
  source: 'synthetic',
  schemaVersion: 1,
  generatedAt: now,
  statementType: 'consolidated',
  currency: 'INR',
  unit: 'Cr',
  rows: historicalData.map(d => ({
    fiscalYear: d.fy,
    periodEndDate: `${d.year.length === 4 ? d.year : '20' + d.year.slice(2)}-03-31`,
    revenue: d.revenue,
    ebitda: d.ebitda,
    ebit: Math.round(d.ebitda * 0.83),
    netProfit: d.netProfit,
    eps: d.eps,
    dps: d.dps,
    totalAssets: d.totalAssets,
    shareholdersEquity: Math.round(d.netProfit / (d.roe / 100)),
    grossDebt: d.netDebt,
    freeCashFlow: d.freeCashFlow,
    operatingCashFlow: Math.round(d.freeCashFlow * 1.3),
    cigaretteRevenue: d.cigaretteRevenue,
    fmcgRevenue: d.fmcgRevenue,
    hotelsRevenue: d.hotelsRevenue,
    paperRevenue: d.paperRevenue,
    agriRevenue: d.agriRevenue,
    otherRevenue: Math.round(d.revenue - d.cigaretteRevenue - d.fmcgRevenue - d.hotelsRevenue - d.paperRevenue - d.agriRevenue),
    ebitdaMargin: d.ebitdaMargin,
    netMargin: d.netMargin,
    roe: d.roe,
    roce: d.roce,
  })),
};

// ─── 3. itc_dividend_history.json ────────────────────────────────────────────

// Convert annual dividend history to individual dividend entries (synthetic)
const dividendEntries = [];
for (const d of dividendHistory) {
  const yearNum = parseInt(d.fy.replace('FY', ''));
  // Special dividend comes first chronologically (typically January)
  if (d.specialDiv > 0) {
    dividendEntries.push({
      exDate: `${yearNum}-01-15`,
      recordDate: null,
      dividendType: 'special',
      amountPerShare: d.specialDiv,
      fiscalYear: d.fy,
      source: 'synthetic',
    });
  }
  // Final dividend (typically May) — after special in same year
  dividendEntries.push({
    exDate: `${yearNum}-05-20`,
    recordDate: null,
    dividendType: 'final',
    amountPerShare: d.dps,
    fiscalYear: d.fy,
    source: 'synthetic',
  });
}

const dividendHistoryJson = {
  symbol: 'ITC.NS',
  source: 'synthetic',
  schemaVersion: 1,
  generatedAt: now,
  dividends: dividendEntries,
};

// ─── 4. itc_price_history.json ──────────────────────────────────────────────

// Generate synthetic daily price data from annual high/low
// Interpolate between years to create realistic-looking daily OHLCV
function generatePriceDays() {
  const days = [];
  const firstYear = parseInt(historicalData[0].year);
  const lastYear = parseInt(historicalData[historicalData.length - 1].year);

  for (let i = 0; i < historicalData.length - 1; i++) {
    const curr = historicalData[i];
    const next = historicalData[i + 1];
    const yearStart = parseInt(curr.year);
    const yearEnd = parseInt(next.year);

    // Generate ~252 trading days per year
    const numDays = Math.round(252 * (yearEnd - yearStart) / (lastYear - firstYear + 1));
    const progress = (yearStart - firstYear) / (lastYear - firstYear);

    for (let d = 0; d < numDays; d++) {
      const t = d / numDays; // 0 to 1 within this year
      const overallT = (i + t) / (historicalData.length - 1);

      // Interpolate between year boundaries
      const basePrice = curr.stockPriceLow + (curr.stockPriceHigh - curr.stockPriceLow) *
        (0.3 + 0.4 * Math.sin(t * Math.PI + i * 0.7)); // Sine wave for realistic movement
      const startPrice = curr.stockPriceLow + (curr.stockPriceHigh - curr.stockPriceLow) * 0.4;
      const endPrice = next.stockPriceLow + (next.stockPriceHigh - next.stockPriceLow) * 0.4;
      const price = startPrice + (endPrice - startPrice) * t;

      // Add small random variation
      const dailyVol = (curr.stockPriceHigh - curr.stockPriceLow) * 0.015;
      const variation = Math.sin(d * 0.3 + i * 5) * dailyVol;

      const close = Math.round(price + variation);
      const high = Math.round(close + Math.abs(variation) * 0.8);
      const low = Math.round(close - Math.abs(variation) * 0.8);
      const open = Math.round(close + variation * 0.3);

      // Create a realistic date
      const month = Math.floor(d * 12 / numDays) + 1;
      const dayOfMonth = Math.floor((d % Math.max(1, Math.floor(numDays / 12))) + 1);
      const dateStr = `${yearStart}-${String(month).padStart(2, '0')}-${String(Math.min(dayOfMonth, 28)).padStart(2, '0')}`;

      days.push({
        date: dateStr,
        open: Math.max(open, low),
        high,
        low: Math.max(low, 1),
        close,
        volume: Math.round(8000000 + variation * 100000),
        adjClose: close,
      });
    }
  }

  // Sort by date
  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

const priceDays = generatePriceDays();
const priceHistory = {
  symbol: 'ITC.NS',
  source: 'synthetic',
  startDate: priceDays.length > 0 ? priceDays[0].date : '2012-01-02',
  endDate: priceDays.length > 0 ? priceDays[priceDays.length - 1].date : '2026-03-31',
  totalDays: priceDays.length,
  schemaVersion: 1,
  generatedAt: now,
  days: priceDays,
};

// ─── Write all files ────────────────────────────────────────────────────────

const files = [
  { name: 'itc_live_quote.json', data: liveQuote },
  { name: 'itc_financials.json', data: financials },
  { name: 'itc_dividend_history.json', data: dividendHistoryJson },
  { name: 'itc_price_history.json', data: priceHistory },
];

for (const f of files) {
  const path = resolve(OUT_DIR, f.name);
  writeFileSync(path, JSON.stringify(f.data, null, 2), 'utf-8');
  const sizeKB = Math.round(JSON.stringify(f.data).length / 1024);
  console.log(`✓ ${f.name} (${sizeKB} KB) → ${path}`);
}

console.log(`\nAll 4 synthetic ITC data files written to ${OUT_DIR}`);
console.log('For real data from yfinance, run: python3 scripts/data_collector/fetch_itc_data.py all');