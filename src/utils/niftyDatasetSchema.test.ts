import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateNiftyDataset, NiftyDatasetValidationError } from './niftyDatasetSchema';

const DATASET_PATH = resolve(__dirname, '../../public/data/nifty_750_10y.json');

describe('niftyDatasetSchema.validateNiftyDataset', () => {
  it('rejects non-objects', () => {
    expect(() => validateNiftyDataset(null)).toThrow(NiftyDatasetValidationError);
    expect(() => validateNiftyDataset(42)).toThrow(NiftyDatasetValidationError);
  });

  it('requires all three canonical batches', () => {
    const bad = {
      generatedAt: 'now', source: 'synthetic', schemaVersion: 1,
      fiscalYears: ['FY2017'],
      batches: [{ indexName: 'X', indexSlug: 'niftylargemidcap250', companies: [] }],
    };
    expect(() => validateNiftyDataset(bad)).toThrow(/missing required batch/);
  });

  it('rejects fiscalYear mismatches between header and rows', () => {
    const bad = {
      generatedAt: 'now', source: 'synthetic', schemaVersion: 1,
      fiscalYears: ['FY2017', 'FY2018'],
      batches: ['niftylargemidcap250', 'niftysmallcap250', 'niftymicrocap250'].map((slug) => ({
        indexName: slug, indexSlug: slug,
        companies: [{
          symbol: 'X', name: 'X', sector: 'Energy', reportingType: 'nonFinancial',
          financials: [
            { fiscalYear: 'FY2017', revenueCr: 1, netProfitCr: 1, roePct: 1, pe: 10, debtToEquity: 0.1 },
            { fiscalYear: 'FY2099', revenueCr: 1, netProfitCr: 1, roePct: 1, pe: 10, debtToEquity: 0.1 },
          ],
        }],
      })),
    };
    expect(() => validateNiftyDataset(bad)).toThrow(/fiscalYear mismatch/);
  });

  it('requires at least one of pe or pb', () => {
    const bad = {
      generatedAt: 'now', source: 'synthetic', schemaVersion: 1,
      fiscalYears: ['FY2017'],
      batches: ['niftylargemidcap250', 'niftysmallcap250', 'niftymicrocap250'].map((slug) => ({
        indexName: slug, indexSlug: slug,
        companies: [{
          symbol: 'X', name: 'X', sector: 'Energy', reportingType: 'nonFinancial',
          financials: [{ fiscalYear: 'FY2017', revenueCr: 1, netProfitCr: 1, roePct: 1 }],
        }],
      })),
    };
    expect(() => validateNiftyDataset(bad)).toThrow(/pe or pb/);
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

  it('covers 10 fiscal years FY2017-FY2026', () => {
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

  it('keeps metrics in plausible ranges', () => {
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
