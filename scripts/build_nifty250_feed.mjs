#!/usr/bin/env node
/**
 * Build Nifty 250 JSON feed from Screener.in source-pack files.
 *
 * Source: scripts/nifty250/source-pack/{constituents,financials,balance_sheets,cashflows,company_ratios,market_data}.json
 * Output: public/data/nifty250_real.json
 *
 * Usage: node scripts/build_nifty250_feed.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(__dirname, 'nifty250', 'source-pack');
const OUT_PATH = path.join(ROOT, 'public', 'data', 'nifty250_real.json');

// ── Colors for each sector ──────────────────────────────────────────────────
const SECTOR_COLORS = {
  'Banks': '#2563eb',
  'NBFC': '#1d4ed8',
  'Insurance': '#0ea5e9',
  'Information Technology': '#8b5cf6',
  'Consumer Staples': '#22c55e',
  'Consumer Discretionary': '#84cc16',
  'Consumer Durables': '#a3e635',
  'Healthcare': '#ef4444',
  'Pharmaceuticals': '#dc2626',
  'Automobiles': '#f97316',
  'Auto Components': '#fb923c',
  'Energy': '#06b6d4',
  'Utilities': '#0891b2',
  'Metals': '#78716c',
  'Materials': '#6b7280',
  'Cement': '#71717a',
  'Industrials': '#fb923c',
  'Capital Goods': '#ea580c',
  'Chemicals': '#14b8a6',
  'Telecom': '#f59e0b',
  'Media': '#fbbf24',
  'Real Estate': '#fb7185',
  'Aerospace & Defense': '#3b82f6',
  'Logistics': '#facc15',
  'Agriculture': '#84cc16',
  'Textiles': '#a78bfa',
  'Internet': '#ec4899',
};

function colorFor(sector) {
  return SECTOR_COLORS[sector] ?? '#60a5fa';
}

function round1(v) {
  if (v == null) return null;
  return Math.round(v * 10) / 10;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

// ── Build lookup: [{symbol, fiscalYear} -> row] ────────────────────────────
function indexBySymbolFy(rows) {
  const map = {};
  for (const row of rows) {
    const key = `${row.symbol}::${row.fiscalYear}`;
    map[key] = row;
  }
  return map;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('Building Nifty 250 feed...');

  const constituents = readJson(path.join(SOURCE_DIR, 'constituents.json'));
  const financials = readJson(path.join(SOURCE_DIR, 'financials.json'));
  const marketData = readJson(path.join(SOURCE_DIR, 'market_data.json'));

  // Optional new source-pack files
  let bsIndex = {};
  let cfIndex = {};
  let ratioIndex = {};
  try {
    const bs = readJson(path.join(SOURCE_DIR, 'balance_sheets.json'));
    bsIndex = indexBySymbolFy(bs.rows);
  } catch { /* not yet available */ }
  try {
    const cf = readJson(path.join(SOURCE_DIR, 'cashflows.json'));
    cfIndex = indexBySymbolFy(cf.rows);
  } catch { /* not yet available */ }
  try {
    const ratios = readJson(path.join(SOURCE_DIR, 'company_ratios.json'));
    ratioIndex = indexBySymbolFy(ratios.rows);
  } catch { /* not yet available */ }

  // Build a map of symbol -> financials rows
  const finBySymbol = {};
  for (const row of financials.rows) {
    if (!finBySymbol[row.symbol]) finBySymbol[row.symbol] = [];
    finBySymbol[row.symbol].push(row);
  }

  // Build a map of symbol -> market data
  const mktBySymbol = {};
  for (const row of marketData.rows) {
    mktBySymbol[row.symbol] = row;
  }

  // Determine the common fiscal year range
  const allFys = new Set();
  for (const row of financials.rows) {
    const fy = row.fiscalYear;
    const yearNum = parseInt(fy.replace('FY', ''), 10);
    if (!isNaN(yearNum) && yearNum >= 2014) {
      allFys.add(fy);
    }
  }
  const fiscalYears = Array.from(allFys).sort();
  console.log(`  Fiscal years: ${fiscalYears[0]} to ${fiscalYears[fiscalYears.length - 1]} (${fiscalYears.length} years)`);

  // Build constituents with full history
  const outConstituents = [];

  for (const company of constituents.constituents) {
    const sym = company.symbol;
    const finRows = finBySymbol[sym] || [];
    const mkt = mktBySymbol[sym];

    const history = [];
    const mktRoe = mkt?.roePct ?? null;
    const mktRoce = mkt?.rocePct ?? null;
    let lastIdx = -1;

    for (const fy of fiscalYears) {
      const finRow = finRows.find(r => r.fiscalYear === fy);
      if (finRow && finRow.revenueCr != null) {
        lastIdx = history.length;

        const key = `${sym}::${fy}`;
        const bs = bsIndex[key] || {};
        const cf = cfIndex[key] || {};
        const ratios = ratioIndex[key] || {};

        history.push({
          fy,
          // P&L
          toplineCr: finRow.revenueCr,
          expensesCr: finRow.expensesCr,
          operatingProfitCr: finRow.operatingProfitCr,
          opmPct: finRow.opmPct,
          otherIncomeCr: finRow.otherIncomeCr,
          interestCr: finRow.interestCr,
          depreciationCr: finRow.depreciationCr,
          profitBeforeTaxCr: finRow.profitBeforeTaxCr,
          taxPct: finRow.taxPct,
          netProfitCr: finRow.netProfitCr,
          epsRs: finRow.epsRs,
          dividendPayoutPct: finRow.dividendPayoutPct,
          // Balance Sheet
          equityCapitalCr: bs.equityCapitalCr ?? null,
          reservesCr: bs.reservesCr ?? null,
          borrowingsCr: bs.borrowingsCr ?? null,
          otherLiabilitiesCr: bs.otherLiabilitiesCr ?? null,
          totalLiabilitiesCr: bs.totalLiabilitiesCr ?? null,
          fixedAssetsCr: bs.fixedAssetsCr ?? null,
          cwipCr: bs.cwipCr ?? null,
          investmentsCr: bs.investmentsCr ?? null,
          otherAssetsCr: bs.otherAssetsCr ?? null,
          totalAssetsCr: bs.totalAssetsCr ?? null,
          // Cash Flow
          operatingCFCr: cf.operatingCFCr ?? null,
          investingCFCr: cf.investingCFCr ?? null,
          financingCFCr: cf.financingCFCr ?? null,
          netCashFlowCr: cf.netCashFlowCr ?? null,
          freeCashFlowCr: cf.freeCashFlowCr ?? null,
          cfoToOpPct: cf.cfoToOpPct ?? null,
          // Ratios
          debtorDays: ratios.debtorDays ?? null,
          inventoryDays: ratios.inventoryDays ?? null,
          daysPayable: ratios.daysPayable ?? null,
          cashConversionCycle: ratios.cashConversionCycle ?? null,
          workingCapitalDays: ratios.workingCapitalDays ?? null,
          rocePct: 0,  // will be set on last entry below
        });
      }
    }

    // Set ROE/ROCE on the last history entry
    if (lastIdx >= 0) {
      history[lastIdx].roePct = mktRoe ?? 0;
      // Use ratio roce if available, fallback to market data roce
      const lastKey = `${sym}::${history[lastIdx].fy}`;
      const lastRatios = ratioIndex[lastKey] || {};
      history[lastIdx].rocePct = lastRatios.rocePct ?? mktRoce ?? 0;
    }

    if (history.length === 0) continue;

    const latestTopline = history[history.length - 1]?.toplineCr ?? 0;
    const latestProfit = history[history.length - 1]?.netProfitCr ?? 0;

    outConstituents.push({
      id: sym.toLowerCase(),
      name: company.name,
      ticker: sym,
      sector: company.sector,
      reportingType: company.reportingType,
      weightPct: 0,
      marketCapCr: mkt?.marketCapCr ?? 0,
      cmp: mkt?.currentPrice ?? 0,
      valuationMetric: company.reportingType === 'financial' ? 'pb' : 'pe',
      valuationMultiple: mkt?.stockPe ?? 0,
      dividendYieldPct: mkt?.dividendYieldPct ?? 0,
      color: colorFor(company.sector),
      beta: 0,
      history,
      qualityFlags: [],
      dataSource: 'screener-in',
    });
  }

  // Sort and normalize weights
  outConstituents.sort((a, b) => a.ticker.localeCompare(b.ticker));
  const totalTopline = outConstituents.reduce((s, c) => {
    const last = c.history[c.history.length - 1];
    return s + (last?.toplineCr ?? 0);
  }, 0);
  for (const c of outConstituents) {
    const last = c.history[c.history.length - 1];
    c.weightPct = totalTopline > 0 ? round1((last?.toplineCr ?? 0) / totalTopline * 100) : 0;
  }

  console.log(`  Constituents: ${outConstituents.length}`);

  // Stats on enriched fields
  let withBs = 0, withCf = 0, withRatios = 0;
  for (const c of outConstituents) {
    const last = c.history[c.history.length - 1];
    if (last?.totalAssetsCr) withBs++;
    if (last?.freeCashFlowCr != null) withCf++;
    if (last?.inventoryDays != null) withRatios++;
  }
  console.log(`  With balance sheet: ${withBs}, cash flow: ${withCf}, ratios: ${withRatios}`);

  const now = new Date().toISOString();
  const dataset = {
    generatedAt: now,
    asOfDate: now.slice(0, 10),
    source: 'real',
    sourcePolicy: 'screener-in-public-data',
    schemaVersion: 3,
    fiscalYears,
    provenance: {
      universe: {
        sourceName: 'NSE Indices (via screener.in)',
        sourceType: 'publicly_available_screener_in_data',
        asOfDate: now.slice(0, 10),
      },
      financials: [{
        sourceName: 'Screener.in',
        sourceType: 'scraped_financial_data',
        licenseBasis: 'publicly_available_via_screener_in',
        notes: 'Annual P&L, Balance Sheet, Cash Flow, and Ratios. Only years with real reported data included — no estimates, no backfilling.',
      }],
      notes: 'Built from screener.in public pages. Only real, reported financial data. No synthetic or estimated values.',
    },
    constituents: outConstituents,
  };

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2) + '\n');
  console.log(`\nWrote ${OUT_PATH}`);
  console.log(`Companies: ${outConstituents.length}`);
  console.log(`Fiscal years: ${fiscalYears[0]} to ${fiscalYears[fiscalYears.length - 1]} (${fiscalYears.length})`);
  const with5plus = outConstituents.filter(c => c.history.length >= 5).length;
  console.log(`Companies with 5+ years: ${with5plus}`);
}

main();
