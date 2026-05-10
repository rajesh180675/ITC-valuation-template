/**
 * Shared segment-blending utilities for ITC data source switching.
 *
 * When the user toggles from "static" to "live" mode, yfinance provides
 * real totals but no segment breakdown. We blend year-matched segment
 * proportions from annual reports (itcData.ts) onto the live totals.
 *
 * Previously this logic was duplicated in 4 components; now it lives here.
 */

import { historicalData, type YearlyData } from '@/data/itcData';
import type { ItcFinancialRow } from './itcDataSchemas';

// ─── Segment proportion entry ──────────────────────────────────────────────

export interface SegmentProportions {
  cigPct: number;
  fmcgPct: number;
  hotelsPct: number;
  paperPct: number;
  agriPct: number;
  // Absolute revenues from annual reports (for Dashboard blending)
  cigRev: number;
  fmcgRev: number;
  hotelsRev: number;
  paperRev: number;
  agriRev: number;
  // Margin & metric carry-overs from annual reports
  cigEbitMargin: number;
  fmcgEbitdaMargin: number;
  volumeIndex: number;
  taxHikePct: number;
  dividendYield: number;
  peRatio: number;
  dps: number;
  netDebt: number;
  stockPriceHigh: number;
  stockPriceLow: number;
}

// ─── Build the lookup map ──────────────────────────────────────────────────

let _cache: Map<string, SegmentProportions> | null = null;

export function buildStaticSegmentMap(): Map<string, SegmentProportions> {
  if (_cache) return _cache;

  const map = new Map<string, SegmentProportions>();

  for (const d of historicalData) {
    const total =
      d.cigaretteRevenue + d.fmcgRevenue + d.hotelsRevenue + d.paperRevenue + d.agriRevenue;

    map.set(d.year, {
      cigPct: total > 0 ? d.cigaretteRevenue / total : 0,
      fmcgPct: total > 0 ? d.fmcgRevenue / total : 0,
      hotelsPct: total > 0 ? d.hotelsRevenue / total : 0,
      paperPct: total > 0 ? d.paperRevenue / total : 0,
      agriPct: total > 0 ? d.agriRevenue / total : 0,
      cigRev: d.cigaretteRevenue,
      fmcgRev: d.fmcgRevenue,
      hotelsRev: d.hotelsRevenue,
      paperRev: d.paperRevenue,
      agriRev: d.agriRevenue,
      cigEbitMargin: d.cigaretteEbitMargin,
      fmcgEbitdaMargin: d.fmcgEbitdaMargin,
      volumeIndex: d.cigaretteVolumeIndex,
      taxHikePct: d.taxHikePct,
      dividendYield: d.dividendYield,
      peRatio: d.peRatio,
      dps: d.dps,
      netDebt: d.netDebt,
      stockPriceHigh: d.stockPriceHigh,
      stockPriceLow: d.stockPriceLow,
    });
  }

  _cache = map;
  return map;
}

// ─── Look up segment proportions for a fiscal year ─────────────────────────

export function getSegmentProps(
  map: Map<string, SegmentProportions>,
  fiscalYear: string,
): SegmentProportions | undefined {
  const fyYear = fiscalYear.replace('FY', '');
  return map.get(fyYear) ?? map.get(String(Number(fyYear) - 1));
}

// ─── Blend a single ItcFinancialRow into a YearlyData-like object ─────────

export function blendFinancialRow(
  r: ItcFinancialRow,
  seg: SegmentProportions | undefined,
): YearlyData {
  const rev = r.revenue;
  return {
    year: r.fiscalYear.replace('FY', ''),
    fy: r.fiscalYear,
    revenue: rev,
    cigaretteRevenue: seg ? Math.round(rev * seg.cigPct) : r.cigaretteRevenue,
    fmcgRevenue: seg ? Math.round(rev * seg.fmcgPct) : r.fmcgRevenue,
    hotelsRevenue: seg ? Math.round(rev * seg.hotelsPct) : r.hotelsRevenue,
    paperRevenue: seg ? Math.round(rev * seg.paperPct) : r.paperRevenue,
    agriRevenue: seg ? Math.round(rev * seg.agriPct) : r.agriRevenue,
    ebitda: r.ebitda,
    ebitdaMargin: r.ebitdaMargin,
    netProfit: r.netProfit,
    netMargin: r.netMargin,
    eps: r.eps,
    dps: seg?.dps ?? r.dps,
    roe: r.roe,
    roce: r.roce,
    freeCashFlow: r.freeCashFlow,
    totalAssets: r.totalAssets,
    netDebt: seg?.netDebt ?? 0,
    cigaretteEbitMargin: seg?.cigEbitMargin ?? 0,
    fmcgEbitdaMargin: seg?.fmcgEbitdaMargin ?? 0,
    cigaretteVolumeIndex: seg?.volumeIndex ?? 0,
    taxHikePct: seg?.taxHikePct ?? 0,
    stockPriceHigh: seg?.stockPriceHigh ?? 0,
    stockPriceLow: seg?.stockPriceLow ?? 0,
    dividendYield: seg?.dividendYield ?? 0,
    peRatio: seg?.peRatio ?? 0,
  };
}

// ─── High-level hook: blend live financials or fall back to static ─────────

export function blendOrFallback(
  source: 'static' | 'live',
  financialsRows: ItcFinancialRow[] | null | undefined,
): YearlyData[] {
  if (source === 'live' && financialsRows && financialsRows.length > 0) {
    const map = buildStaticSegmentMap();
    return financialsRows.map(r => blendFinancialRow(r, getSegmentProps(map, r.fiscalYear)));
  }
  return historicalData;
}
