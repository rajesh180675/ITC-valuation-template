import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateNiftyDataset, NiftyDatasetValidationError } from './niftyDatasetSchema';

const DATASET_PATH = resolve(__dirname, '../../public/data/nifty_750_10y.json');
const BATCH_SLUGS = ['niftylargemidcap250', 'niftysmallcap250', 'niftymicrocap250'];

function sourceRef(sourceName = 'NSE Indices') {
  return {
    sourceName,
    sourceType: 'official_source_pack',
    asOfDate: '2026-03-31',
    licenseBasis: 'official/licensed source pack',
  };
}

function schemaV2Dataset(): any {
  return {
    generatedAt: '2026-05-06T00:00:00.000Z',
    asOfDate: '2026-03-31',
    source: 'real',
    sourcePolicy: 'official-only',
    schemaVersion: 2,
    fiscalYears: ['FY2024', 'FY2025'],
    provenance: {
      universe: sourceRef(),
      financials: [sourceRef('NSE/BSE filings')],
      marketData: [sourceRef('NSE/BSE official EOD')],
    },
    batches: BATCH_SLUGS.map((slug, idx) => ({
      indexName: slug,
      indexSlug: slug,
      asOfDate: '2026-03-31',
      constituentCount: 1,
      constituentSource: sourceRef(),
      companies: [{
        symbol: `REAL${idx}`,
        name: `Real Company ${idx}`,
        isin: `INE000A01${idx}23`,
        sector: 'Industrials',
        industry: 'Capital Goods',
        reportingType: 'nonFinancial',
        source: 'real',
        listingExchange: 'NSE',
        officialProfileSource: sourceRef(),
        qualityFlags: [],
        financials: [{
          fiscalYear: 'FY2025',
          periodEndDate: '2025-03-31',
          statementType: 'consolidated',
          revenueCr: 100,
          netProfitCr: 10,
          shareholdersEquityCr: 50,
          totalDebtCr: 15,
          roePct: 20,
          debtToEquity: 0.3,
          marketCapCr: 250,
          pe: 25,
          pb: 5,
          marketDataAsOfDate: '2025-03-31',
          sources: {
            financial: sourceRef('NSE financial filing'),
            marketData: sourceRef('NSE bhavcopy'),
            computed: sourceRef('Internal ratio computation'),
          },
          qualityFlags: [],
        }],
      }],
    })),
  };
}

describe('niftyDatasetSchema.validateNiftyDataset', () => {
  it('rejects non-objects', () => {
    expect(() => validateNiftyDataset(null)).toThrow(NiftyDatasetValidationError);
    expect(() => validateNiftyDataset(42)).toThrow(NiftyDatasetValidationError);
  });

  it('requires all three canonical batches', () => {
    const bad = {
      generatedAt: '2026-05-06T00:00:00.000Z', source: 'synthetic', schemaVersion: 1,
      fiscalYears: ['FY2017'],
      batches: [{ indexName: 'X', indexSlug: 'niftylargemidcap250', companies: [] }],
    };
    expect(() => validateNiftyDataset(bad)).toThrow(/expected exactly|missing required batch/);
  });

  it('rejects fiscalYear mismatches between header and rows for legacy schema v1', () => {
    const bad = {
      generatedAt: '2026-05-06T00:00:00.000Z', source: 'synthetic', schemaVersion: 1,
      fiscalYears: ['FY2017', 'FY2018'],
      batches: BATCH_SLUGS.map((slug) => ({
        indexName: slug, indexSlug: slug,
        companies: [{
          symbol: slug, name: slug, sector: 'Energy', reportingType: 'nonFinancial',
          financials: [
            { fiscalYear: 'FY2017', revenueCr: 1, netProfitCr: 1, roePct: 1, pe: 10, debtToEquity: 0.1 },
            { fiscalYear: 'FY2099', revenueCr: 1, netProfitCr: 1, roePct: 1, pe: 10, debtToEquity: 0.1 },
          ],
        }],
      })),
    };
    expect(() => validateNiftyDataset(bad)).toThrow(/not declared|fiscalYear mismatch/);
  });

  it('requires at least one of pe or pb for legacy schema v1', () => {
    const bad = {
      generatedAt: '2026-05-06T00:00:00.000Z', source: 'synthetic', schemaVersion: 1,
      fiscalYears: ['FY2017'],
      batches: BATCH_SLUGS.map((slug) => ({
        indexName: slug, indexSlug: slug,
        companies: [{
          symbol: slug, name: slug, sector: 'Energy', reportingType: 'nonFinancial',
          financials: [{ fiscalYear: 'FY2017', revenueCr: 1, netProfitCr: 1, roePct: 1 }],
        }],
      })),
    };
    expect(() => validateNiftyDataset(bad)).toThrow(/pe or pb/);
  });

  it('accepts schema v2 official datasets with partial history and provenance', () => {
    const parsed = validateNiftyDataset(schemaV2Dataset());
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.source).toBe('real');
    expect(parsed.sourcePolicy).toBe('official-only');
    expect(parsed.batches[0].companies[0].financials).toHaveLength(1);
  });

  it('rejects schema v2 synthetic datasets', () => {
    const bad = { ...schemaV2Dataset(), source: 'synthetic' };
    expect(() => validateNiftyDataset(bad)).toThrow(/source real/);
  });

  it('rejects schema v2 rows without official financial sources', () => {
    const bad = schemaV2Dataset();
    delete bad.batches[0].companies[0].financials[0].sources.financial;
    expect(() => validateNiftyDataset(bad)).toThrow(/source reference required/);
  });

  it('allows unavailable schema v2 values when flagged instead of synthesized', () => {
    const partial = schemaV2Dataset();
    const row = partial.batches[0].companies[0].financials[0];
    row.revenueCr = null;
    row.netProfitCr = null;
    row.roePct = null;
    row.pe = null;
    row.pb = null;
    row.marketCapCr = null;
    row.qualityFlags = ['financial_metric_unavailable', 'market_data_unavailable'];
    delete row.sources.marketData;
    expect(validateNiftyDataset(partial).batches[0].companies[0].financials[0].revenueCr).toBeNull();
  });

  it('rejects duplicate symbols globally', () => {
    const bad = schemaV2Dataset();
    bad.batches[1].companies[0].symbol = bad.batches[0].companies[0].symbol;
    expect(() => validateNiftyDataset(bad)).toThrow(/duplicate symbol/);
  });

  it('rejects unsorted fiscal years', () => {
    const bad = schemaV2Dataset();
    bad.fiscalYears = ['FY2025', 'FY2024'];
    expect(() => validateNiftyDataset(bad)).toThrow(/sorted ascending/);
  });
});

describe('shipped nifty_750_10y.json', () => {
  const raw = JSON.parse(readFileSync(DATASET_PATH, 'utf8'));
  const dataset = validateNiftyDataset(raw);

  it('exposes exactly three cohorts of 250 companies each', () => {
    expect(dataset.batches).toHaveLength(3);
    for (const batch of dataset.batches) {
      expect(batch.companies.length).toBe(250);
    }
  });

  it('covers 10 fiscal years FY2017-FY2026 for the legacy shipped feed', () => {
    expect(dataset.fiscalYears).toEqual([
      'FY2017', 'FY2018', 'FY2019', 'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025', 'FY2026',
    ]);
    for (const batch of dataset.batches) {
      for (const c of batch.companies) {
        expect(c.financials).toHaveLength(10);
      }
    }
  });

  it('has no duplicate symbols globally', () => {
    const seen = new Set<string>();
    for (const batch of dataset.batches) {
      for (const c of batch.companies) {
        expect(seen.has(c.symbol)).toBe(false);
        seen.add(c.symbol);
      }
    }
    expect(seen.size).toBe(750);
  });

  it('keeps metrics in plausible ranges when legacy rows are fully populated', () => {
    for (const batch of dataset.batches) {
      for (const c of batch.companies) {
        const isFinancial = c.reportingType === 'financial';
        for (const f of c.financials) {
          expect(f.revenueCr).toBeGreaterThan(0);
          expect(f.roePct).toBeGreaterThan(-50);
          expect(f.roePct).toBeLessThan(80);
          if (isFinancial) {
            expect(f.pb).toBeGreaterThan(0);
            expect(f.pb).toBeLessThan(20);
          } else {
            expect(f.pe).toBeGreaterThan(0);
            expect(f.pe).toBeLessThan(300);
            expect(f.debtToEquity).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it('labels source provenance so UI can warn users', () => {
    expect(['synthetic', 'real', 'hybrid']).toContain(dataset.source);
  });
});
