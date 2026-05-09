#!/usr/bin/env node
/**
 * Build the Nifty 750 JSON feed from local official/licensed source-pack files.
 *
 * This script deliberately does not scrape websites and does not synthesize
 * missing values. Provide source files under scripts/nifty750/source-pack/:
 *
 * - constituents.json
 * - financials.json
 * - market_data.json
 *
 * The emitted dataset uses schemaVersion 2 and sourcePolicy "official-only".
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(__dirname, 'nifty750', 'source-pack');
const OUT_PATH = path.join(ROOT, 'public', 'data', 'nifty_750_10y.json');

const REQUIRED_BATCHES = ['niftylargemidcap250', 'niftysmallcap250', 'niftymicrocap250'];

function readJson(fileName, required = true) {
  const filePath = path.join(SOURCE_DIR, fileName);
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (!required && error?.code === 'ENOENT') return null;
    throw new Error(`Unable to read ${filePath}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function fiscalYearFromPeriodEnd(periodEndDate) {
  const year = Number(String(periodEndDate).slice(0, 4));
  const month = Number(String(periodEndDate).slice(5, 7));
  assert(Number.isFinite(year) && Number.isFinite(month), `Invalid periodEndDate ${periodEndDate}`);
  return `FY${month > 3 ? year + 1 : year}`;
}

function sourceRef(sourceName, extras = {}) {
  return {
    sourceName,
    sourceType: extras.sourceType ?? 'official_source_pack',
    url: extras.url,
    documentId: extras.documentId,
    asOfDate: extras.asOfDate,
    downloadedAt: extras.downloadedAt,
    checksum: extras.checksum,
    licenseBasis: extras.licenseBasis,
    extractionMethod: extras.extractionMethod,
    notes: extras.notes,
  };
}

function key(symbol, fiscalYear) {
  return `${symbol.toUpperCase()}::${fiscalYear}`;
}

function normalizeConstituents(input) {
  assert(input && Array.isArray(input.batches), 'constituents.json must contain batches[]');
  const batches = input.batches.map((batch) => {
    assert(REQUIRED_BATCHES.includes(batch.indexSlug), `Unexpected batch slug ${batch.indexSlug}`);
    assert(Array.isArray(batch.companies), `Batch ${batch.indexSlug} must contain companies[]`);
    return {
      indexSlug: batch.indexSlug,
      indexName: batch.indexName,
      asOfDate: batch.asOfDate ?? input.asOfDate,
      constituentCount: batch.companies.length,
      constituentSource: sourceRef(batch.sourceName ?? input.sourceName ?? 'NSE Indices', {
        sourceType: 'official_index_constituent_file',
        url: batch.sourceUrl ?? input.sourceUrl,
        documentId: batch.documentId ?? input.documentId,
        asOfDate: batch.asOfDate ?? input.asOfDate,
        downloadedAt: batch.downloadedAt ?? input.downloadedAt,
        checksum: batch.checksum ?? input.checksum,
        licenseBasis: batch.licenseBasis ?? input.licenseBasis,
      }),
      companies: batch.companies.map((company) => {
        assert(company.symbol && company.name && company.sector && company.reportingType, `Incomplete company in ${batch.indexSlug}`);
        return {
          symbol: String(company.symbol).toUpperCase(),
          name: company.name,
          isin: company.isin,
          sector: company.sector,
          industry: company.industry,
          reportingType: company.reportingType,
          listingExchange: company.listingExchange ?? 'NSE',
          source: 'real',
          officialProfileSource: sourceRef(company.sourceName ?? batch.sourceName ?? input.sourceName ?? 'NSE Indices', {
            sourceType: 'official_index_constituent_file',
            url: company.sourceUrl ?? batch.sourceUrl ?? input.sourceUrl,
            documentId: company.documentId ?? batch.documentId ?? input.documentId,
            asOfDate: batch.asOfDate ?? input.asOfDate,
            downloadedAt: company.downloadedAt ?? batch.downloadedAt ?? input.downloadedAt,
            checksum: company.checksum ?? batch.checksum ?? input.checksum,
            licenseBasis: company.licenseBasis ?? batch.licenseBasis ?? input.licenseBasis,
          }),
          qualityFlags: company.qualityFlags ?? [],
          financials: [],
        };
      }),
    };
  });
  assert(batches.length === REQUIRED_BATCHES.length, `Expected ${REQUIRED_BATCHES.length} batches`);
  return batches;
}

function normalizeFinancials(input) {
  if (!input) return new Map();
  assert(Array.isArray(input.rows), 'financials.json must contain rows[]');
  const byKey = new Map();
  for (const row of input.rows) {
    assert(row.symbol, 'financial row requires symbol');
    const fiscalYear = row.fiscalYear ?? fiscalYearFromPeriodEnd(row.periodEndDate);
    const mapKey = key(row.symbol, fiscalYear);
    byKey.set(mapKey, {
      fiscalYear,
      periodEndDate: row.periodEndDate,
      statementType: row.statementType ?? 'consolidated',
      revenueCr: row.revenueCr ?? null,
      netProfitCr: row.netProfitCr ?? null,
      shareholdersEquityCr: row.shareholdersEquityCr ?? null,
      totalDebtCr: row.totalDebtCr ?? null,
      source: sourceRef(row.sourceName ?? input.sourceName ?? 'Official financial filing', {
        sourceType: row.sourceType ?? 'official_financial_filing',
        url: row.sourceUrl,
        documentId: row.documentId,
        asOfDate: row.periodEndDate,
        downloadedAt: row.downloadedAt ?? input.downloadedAt,
        checksum: row.checksum,
        licenseBasis: row.licenseBasis ?? input.licenseBasis,
        extractionMethod: row.extractionMethod,
      }),
      qualityFlags: row.qualityFlags ?? [],
    });
  }
  return byKey;
}

function normalizeMarketData(input) {
  if (!input) return new Map();
  assert(Array.isArray(input.rows), 'market_data.json must contain rows[]');
  const byKey = new Map();
  for (const row of input.rows) {
    assert(row.symbol && row.fiscalYear, 'market row requires symbol and fiscalYear');
    byKey.set(key(row.symbol, row.fiscalYear), {
      marketCapCr: row.marketCapCr ?? null,
      marketDataAsOfDate: row.marketDataAsOfDate,
      source: sourceRef(row.sourceName ?? input.sourceName ?? 'Official market data', {
        sourceType: row.sourceType ?? 'official_market_data',
        url: row.sourceUrl,
        documentId: row.documentId,
        asOfDate: row.marketDataAsOfDate,
        downloadedAt: row.downloadedAt ?? input.downloadedAt,
        checksum: row.checksum,
        licenseBasis: row.licenseBasis ?? input.licenseBasis,
      }),
      qualityFlags: row.qualityFlags ?? [],
    });
  }
  return byKey;
}

function buildRows(company, fiscalYears, financialByKey, marketByKey) {
  return fiscalYears.map((fiscalYear) => {
    const financial = financialByKey.get(key(company.symbol, fiscalYear));
    const market = marketByKey.get(key(company.symbol, fiscalYear));
    const flags = new Set([...(financial?.qualityFlags ?? []), ...(market?.qualityFlags ?? [])]);

    if (!financial) flags.add('financial_row_unavailable');
    if (!market) flags.add('market_data_unavailable');
    if (financial?.statementType === 'standalone') flags.add('standalone_fallback');

    const equity = financial?.shareholdersEquityCr ?? null;
    const debt = financial?.totalDebtCr ?? null;
    const profit = financial?.netProfitCr ?? null;
    const marketCap = market?.marketCapCr ?? null;

    // Build source refs — always provide at least a placeholder for schema v2 compliance
    const financialSource = financial?.source ?? {
        sourceName: 'Not available',
        sourceType: 'unavailable',
        notes: 'Financial data not available from source pack for this fiscal year.',
    };
    const marketSource = market?.source ?? {
        sourceName: 'Not available',
        sourceType: 'unavailable',
        notes: 'Market data not available from source pack for this fiscal year.',
    };

    const roePct = equity && profit !== null ? round((profit / equity) * 100, 2) : null;
    const debtToEquity = company.reportingType === 'financial' || !equity || debt === null ? null : round(debt / equity, 2);
    const pe = marketCap && profit && profit > 0 ? round(marketCap / profit, 2) : null;
    const pb = marketCap && equity && equity > 0 ? round(marketCap / equity, 2) : null;

    if (roePct === null) flags.add('roe_unavailable');
    if (company.reportingType === 'financial' && pb === null) flags.add('pb_unavailable');
    if (company.reportingType === 'nonFinancial' && pe === null) flags.add('pe_unavailable');

    return {
      fiscalYear,
      periodEndDate: financial?.periodEndDate,
      statementType: financial?.statementType,
      revenueCr: financial?.revenueCr ?? null,
      netProfitCr: profit,
      shareholdersEquityCr: equity,
      totalDebtCr: debt,
      roePct,
      debtToEquity,
      marketCapCr: marketCap,
      pe,
      pb,
      marketDataAsOfDate: market?.marketDataAsOfDate,
      sources: {
        financial: financialSource,
        marketData: marketSource,
        computed: sourceRef('Internal ratio computation', {
          sourceType: 'computed_from_official_inputs',
          notes: 'ROE, debt-to-equity, PE and PB computed from official financial and market-data inputs where available.',
        }),
      },
      qualityFlags: Array.from(flags).sort(),
    };
  });
}

function summarize(dataset) {
  const rows = dataset.batches.flatMap((batch) => batch.companies.flatMap((company) => company.financials));
  const missingFinancialRows = rows.filter((row) => row.qualityFlags.includes('financial_row_unavailable')).length;
  const missingMarketRows = rows.filter((row) => row.qualityFlags.includes('market_data_unavailable')).length;
  return {
    companies: dataset.batches.reduce((sum, batch) => sum + batch.companies.length, 0),
    rows: rows.length,
    missingFinancialRows,
    missingMarketRows,
  };
}

const constituents = readJson('constituents.json');
const financials = readJson('financials.json', false);
const marketData = readJson('market_data.json', false);
const batches = normalizeConstituents(constituents);
const financialByKey = normalizeFinancials(financials);
const marketByKey = normalizeMarketData(marketData);
const fiscalYears = Array.from(new Set([
  ...(constituents.fiscalYears ?? []),
  ...(financials?.rows ?? []).map((row) => row.fiscalYear ?? fiscalYearFromPeriodEnd(row.periodEndDate)),
  ...(marketData?.rows ?? []).map((row) => row.fiscalYear),
])).sort();

assert(fiscalYears.length > 0, 'At least one fiscal year is required from source-pack data');

for (const batch of batches) {
  for (const company of batch.companies) {
    company.financials = buildRows(company, fiscalYears, financialByKey, marketByKey);
  }
}

const dataset = {
  generatedAt: new Date().toISOString(),
  asOfDate: constituents.asOfDate,
  source: 'real',
  sourcePolicy: 'official-only',
  schemaVersion: 2,
  fiscalYears,
  provenance: {
    universe: sourceRef(constituents.sourceName ?? 'NSE Indices', {
      sourceType: 'official_index_constituent_file',
      url: constituents.sourceUrl,
      asOfDate: constituents.asOfDate,
      downloadedAt: constituents.downloadedAt,
      checksum: constituents.checksum,
      licenseBasis: constituents.licenseBasis,
    }),
    financials: financials ? [sourceRef(financials.sourceName ?? 'Official financial filings', {
      sourceType: 'official_financial_source_pack',
      downloadedAt: financials.downloadedAt,
      checksum: financials.checksum,
      licenseBasis: financials.licenseBasis,
    })] : [],
    marketData: marketData ? [sourceRef(marketData.sourceName ?? 'Official market data', {
      sourceType: 'official_market_data_source_pack',
      downloadedAt: marketData.downloadedAt,
      checksum: marketData.checksum,
      licenseBasis: marketData.licenseBasis,
    })] : [],
    notes: 'Built from local official/licensed source-pack files. Missing values are flagged, not synthesized.',
  },
  batches,
};

mkdirSync(path.dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`);

const audit = summarize(dataset);
console.log(`Wrote ${OUT_PATH}`);
console.log(`Companies: ${audit.companies}`);
console.log(`Rows: ${audit.rows}`);
console.log(`Missing financial rows: ${audit.missingFinancialRows}`);
console.log(`Missing market rows: ${audit.missingMarketRows}`);
