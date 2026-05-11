import { describe, expect, it } from 'vitest';
import {
  nifty250Constituents,
  NIFTY250_FISCAL_YEARS,
} from './nifty250Data';

describe('nifty250Data', () => {
  describe('nifty250Constituents', () => {
    it('contains ~250 constituents', () => {
      expect(nifty250Constituents.length).toBeGreaterThanOrEqual(200);
      expect(nifty250Constituents.length).toBeLessThanOrEqual(400);
    });

    it('sorts constituents by weightPct descending', () => {
      for (let i = 1; i < nifty250Constituents.length; i++) {
        expect(nifty250Constituents[i].weightPct)
          .toBeLessThanOrEqual(nifty250Constituents[i - 1].weightPct);
      }
    });

    it('every constituent has required fields', () => {
      for (const c of nifty250Constituents) {
        expect(c.id).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(c.ticker).toBeTruthy();
        expect(c.sector).toBeTruthy();
        expect(c.reportingType).toMatch(/^(financial|nonFinancial)$/);
        expect(c.weightPct).toBeGreaterThanOrEqual(0);
        expect(c.marketCapCr).toBeGreaterThan(0);
        expect(c.cmp).toBeGreaterThan(0);
        expect(c.valuationMetric).toMatch(/^(pe|pb)$/);
        expect(c.valuationMultiple).toBeGreaterThan(0);
        expect(c.beta).toBeGreaterThan(0);
        expect(c.color).toMatch(/^#/);
        expect(c.history.length).toBeGreaterThan(0);
      }
    });

    it('has unique tickers', () => {
      const tickers = nifty250Constituents.map(c => c.ticker);
      expect(new Set(tickers).size).toBe(tickers.length);
    });
  });

  describe('NIFTY250_FISCAL_YEARS', () => {
    it('starts at FY2015 and ends at FY2024', () => {
      expect(NIFTY250_FISCAL_YEARS[0]).toBe('FY2015');
      expect(NIFTY250_FISCAL_YEARS[NIFTY250_FISCAL_YEARS.length - 1]).toBe('FY2024');
    });

    it('contains 10 years', () => {
      expect(NIFTY250_FISCAL_YEARS.length).toBe(10);
    });

    it('each year matches the FY pattern', () => {
      for (const y of NIFTY250_FISCAL_YEARS) {
        expect(y).toMatch(/^FY\d{4}$/);
      }
    });
  });

  describe('history reconstruction', () => {
    it('no NaN, Infinity or negative values in history', () => {
      for (const c of nifty250Constituents) {
        for (const h of c.history) {
          expect(h.fy).toBeTruthy();
          expect(Number.isFinite(h.toplineCr)).toBe(true);
          expect(h.toplineCr).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(h.netProfitCr)).toBe(true);
          expect(Number.isFinite(h.roePct)).toBe(true);
          if (h.operatingMarginPct !== undefined) {
            expect(Number.isFinite(h.operatingMarginPct)).toBe(true);
          }
        }
      }
    });
  });

  describe('sector color consistency', () => {
    it('same sector has same color across all constituents', () => {
      const sectorColors = new Map<string, string>();
      for (const c of nifty250Constituents) {
        if (sectorColors.has(c.sector)) {
          expect(c.color).toBe(sectorColors.get(c.sector));
        } else {
          sectorColors.set(c.sector, c.color);
        }
      }
    });
  });

  describe('weight integrity', () => {
    it('total weightPct sums to approximately 100%', () => {
      const total = nifty250Constituents.reduce((s, c) => s + c.weightPct, 0);
      expect(total).toBeGreaterThan(95);
      expect(total).toBeLessThan(105);
    });

    it('≥ 80% of constituents have at least 1 year of positive netProfitCr', () => {
      const withPositive = nifty250Constituents.filter(c =>
        c.history.some(h => h.netProfitCr > 0)
      ).length;
      expect(withPositive / nifty250Constituents.length).toBeGreaterThanOrEqual(0.8);
    });
  });
});