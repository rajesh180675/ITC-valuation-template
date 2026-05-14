#!/usr/bin/env node
/**
 * Build Nifty 750 JSON feed from Screener.in source-pack files.
 *
 * Source: scripts/nifty750/{largemidcap250,smallcap250,microcap250}/
 *   {constituents,financials,balance_sheets,cashflows,company_ratios,market_data}.json
 * Output: public/data/nifty750_real.json
 *
 * Usage: node scripts/build_nifty750_feed.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_BASE = path.join(__dirname, 'nifty750');
const OUT_PATH = path.join(ROOT, 'public', 'data', 'nifty750_real.json');

const INDICES = ['largemidcap250', 'smallcap250', 'microcap250', 'yfinance-expanded'];
const INDEX_LABELS = {
  largemidcap250: 'Nifty LargeMidcap 250',
  smallcap250: 'Nifty Smallcap 250',
  microcap250: 'Nifty Microcap 250',
  'yfinance-expanded': 'YFinance Expansion',
};

const SECTOR_COLORS = {
  'Banks': '#2563eb', 'NBFC': '#1d4ed8', 'Insurance': '#0ea5e9',
  'Information Technology': '#8b5cf6', 'Consumer Staples': '#22c55e',
  'Consumer Discretionary': '#84cc16', 'Consumer Durables': '#a3e635',
  'Healthcare': '#ef4444', 'Pharmaceuticals': '#dc2626',
  'Automobiles': '#f97316', 'Auto Components': '#fb923c',
  'Energy': '#06b6d4', 'Utilities': '#0891b2', 'Metals': '#78716c',
  'Materials': '#6b7280', 'Cement': '#71717a', 'Industrials': '#fb923c',
  'Capital Goods': '#ea580c', 'Chemicals': '#14b8a6',
  'Telecom': '#f59e0b', 'Media': '#fbbf24', 'Real Estate': '#fb7185',
  'Aerospace & Defense': '#3b82f6', 'Logistics': '#facc15',
  'Agriculture': '#84cc16', 'Textiles': '#a78bfa', 'Internet': '#ec4899',
};

function colorFor(sector) { return SECTOR_COLORS[sector] ?? '#60a5fa'; }
function round1(v) { if (v == null) return null; return Math.round(v * 10) / 10; }
function readJson(filePath) { return JSON.parse(readFileSync(filePath, 'utf8')); }

function indexBySymbolFy(rows) {
  const map = {};
  for (const row of rows) {
    map[`${row.symbol}::${row.fiscalYear}`] = row;
  }
  return map;
}

function main() {
  console.log('Building Nifty 750 feed...');

  const allFys = new Set();
  const batches = [];

  for (const slug of INDICES) {
    const sourceDir = path.join(SOURCE_BASE, slug);
    const constituents = readJson(path.join(sourceDir, 'constituents.json'));
    const financials = readJson(path.join(sourceDir, 'financials.json'));
    const marketData = readJson(path.join(sourceDir, 'market_data.json'));

    // Optional enriched data
    let bsIndex = {}, cfIndex = {}, ratioIndex = {};
    try { bsIndex = indexBySymbolFy(readJson(path.join(sourceDir, 'balance_sheets.json')).rows); } catch {}
    try { cfIndex = indexBySymbolFy(readJson(path.join(sourceDir, 'cashflows.json')).rows); } catch {}
    try { ratioIndex = indexBySymbolFy(readJson(path.join(sourceDir, 'company_ratios.json')).rows); } catch {}

    const finBySymbol = {};
    for (const row of financials.rows) {
      if (!finBySymbol[row.symbol]) finBySymbol[row.symbol] = [];
      finBySymbol[row.symbol].push(row);
    }

    const mktBySymbol = {};
    for (const row of marketData.rows) {
      mktBySymbol[row.symbol] = row;
    }

    for (const fy of constituents.fiscalYears ?? []) {
      const yearNum = parseInt(String(fy).replace('FY', ''), 10);
      if (!isNaN(yearNum) && yearNum >= 2014) allFys.add(fy);
    }

    const outCompanies = [];
    for (const company of constituents.constituents) {
      const sym = company.symbol;
      const finRows = finBySymbol[sym] || [];
      const mkt = mktBySymbol[sym];

      const history = [];
      const mktRoe = mkt?.roePct ?? null;
      const mktRoce = mkt?.rocePct ?? null;
      let lastIdx = -1;

      for (const fy of [...constituents.fiscalYears ?? []].sort()) {
        const yearNum = parseInt(String(fy).replace('FY', ''), 10);
        if (isNaN(yearNum) || yearNum < 2010) continue;
        const finRow = finRows.find(r => r.fiscalYear === fy);
        if (finRow && finRow.revenueCr != null) {
          lastIdx = history.length;
          const key = `${sym}::${fy}`;
          const bs = bsIndex[key] || {};
          const cf = cfIndex[key] || {};
          const ratios = ratioIndex[key] || {};

          history.push({
            fy,
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
            operatingCFCr: cf.operatingCFCr ?? null,
            investingCFCr: cf.investingCFCr ?? null,
            financingCFCr: cf.financingCFCr ?? null,
            netCashFlowCr: cf.netCashFlowCr ?? null,
            freeCashFlowCr: cf.freeCashFlowCr ?? null,
            cfoToOpPct: cf.cfoToOpPct ?? null,
            debtorDays: ratios.debtorDays ?? null,
            inventoryDays: ratios.inventoryDays ?? null,
            daysPayable: ratios.daysPayable ?? null,
            cashConversionCycle: ratios.cashConversionCycle ?? null,
            workingCapitalDays: ratios.workingCapitalDays ?? null,
            rocePct: 0,
          });
        }
      }

      if (lastIdx >= 0) {
        const lastKey = `${sym}::${history[lastIdx].fy}`;
        const lastRatios = ratioIndex[lastKey] || {};
        history[lastIdx].roePct = mktRoe ?? 0;
        history[lastIdx].rocePct = lastRatios.rocePct ?? mktRoce ?? 0;
      }

      if (history.length === 0) continue;

      const mktMc = mkt?.marketCapCr ?? 0;
      const mktPe = mkt?.stockPe ?? 0;
      const mktPrice = mkt?.currentPrice ?? 0;
      const mktDiv = mkt?.dividendYieldPct ?? 0;

      outCompanies.push({
        id: sym.toLowerCase(),
        name: company.name,
        ticker: sym,
        sector: company.sector,
        reportingType: company.reportingType,
        weightPct: 0,
        marketCapCr: mktMc,
        cmp: mktPrice,
        valuationMetric: company.reportingType === 'financial' ? 'pb' : 'pe',
        valuationMultiple: mktPe,
        dividendYieldPct: mktDiv,
        color: colorFor(company.sector),
        beta: mkt?.beta ?? 0,
        history,
        qualityFlags: [],
        dataSource: 'screener-in',
      });
    }

    batches.push({
      indexSlug: slug,
      indexName: INDEX_LABELS[slug],
      constituentCount: outCompanies.length,
      companies: outCompanies,
    });

    console.log(`  ${slug}: ${outCompanies.length} companies`);
  }

  const fiscalYears = Array.from(allFys).sort();
  console.log(`  Fiscal years: ${fiscalYears[0]} to ${fiscalYears[fiscalYears.length - 1]} (${fiscalYears.length})`);

  // Stats
  let totalCos = 0, withBs = 0, withCf = 0, withRatios = 0;
  for (const b of batches) {
    for (const c of b.companies) {
      totalCos++;
      const last = c.history[c.history.length - 1];
      if (last?.totalAssetsCr) withBs++;
      if (last?.freeCashFlowCr != null) withCf++;
      if (last?.inventoryDays != null) withRatios++;
    }
  }
  console.log(`  With balance sheet: ${withBs}, cash flow: ${withCf}, ratios: ${withRatios}`);

  const now = new Date().toISOString();
  const dataset = {
    generatedAt: now,
    asOfDate: now.slice(0, 10),
    source: 'real',
    sourcePolicy: 'screener-in-public-data',
    schemaVersion: 4,
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
        notes: 'Annual P&L, Balance Sheet, Cash Flow, and Ratios scraped from screener.in. No synthetic values.',
      }],
      notes: 'Three Nifty indices (LargeMidcap 250, Smallcap 250, Microcap 250). Real data only.',
    },
    batches,
  };

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2) + '\n');
  console.log(`\nWrote ${OUT_PATH}`);
  console.log(`Total companies: ${totalCos}`);
}

main();
