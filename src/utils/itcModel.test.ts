import { describe, expect, it } from 'vitest';

import { historicalData, type YearlyData, defaultAssumptions } from '@/data/itcData';
import {
  calculateDCF,
  generateProjections,
  MODEL_ASSUMPTIONS,
  simulateTaxImpact,
} from './itcModel';

function makeYearlyData(overrides: Partial<YearlyData> = {}): YearlyData {
  const base = historicalData[historicalData.length - 1];

  return {
    ...base,
    ...overrides,
  };
}

describe('generateProjections', () => {
  it('creates a seven-year projection with explicit tax and margin assumptions', () => {
    const projections = generateProjections(defaultAssumptions, historicalData[historicalData.length - 1]);

    expect(projections).toHaveLength(MODEL_ASSUMPTIONS.projectionYears);
    expect(projections[0].year).toBe('2025');
    expect(projections[0].fy).toBe('FY2025E');
    expect(projections[0].cigaretteRevenue).toBe(36439);
    expect(projections[0].cigaretteVolumeIndex).toBe(96);
  });

  it('applies the cigarette margin floor when tax pressure is severe', () => {
    const projections = generateProjections(
      {
        ...defaultAssumptions,
        annualNccdHike: 40,
        cigaretteEbitMargin: 58,
      },
      historicalData[historicalData.length - 1],
    );

    expect(projections[0].cigaretteEbitMargin).toBe(55);
  });
});

describe('calculateDCF', () => {
  it('returns a valid discounted cash flow valuation for finite inputs', () => {
    const projections = [
      makeYearlyData({ year: '2025', fy: 'FY2025E', freeCashFlow: 1000, netDebt: -500 }),
    ];

    const result = calculateDCF(projections, 10, 0);

    expect(result.isValid).toBe(true);
    expect(result.validationErrors).toEqual([]);
    expect(result.pvCashFlows).toEqual([909]);
    expect(result.enterpriseValue).toBe(10000);
    expect(result.equityValue).toBe(10500);
    expect(result.perShareValue).toBe(8.43);
  });

  it('rejects empty projections and terminal growth that exceeds WACC', () => {
    const invalidEmpty = calculateDCF([], 10, 0);
    const invalidGrowth = calculateDCF([makeYearlyData({ freeCashFlow: 1000 })], 8, 8);

    expect(invalidEmpty.isValid).toBe(false);
    expect(invalidEmpty.validationErrors).toContain('At least one projection year is required.');

    expect(invalidGrowth.isValid).toBe(false);
    expect(invalidGrowth.validationErrors).toContain('Terminal growth must stay below WACC.');
  });
});

describe('simulateTaxImpact', () => {
  it('models pass-through, elasticity, and margin compression explicitly', () => {
    const result = simulateTaxImpact(40, historicalData[historicalData.length - 1]);

    expect(result.priceIncrease).toBeCloseTo(34);
    expect(result.volumeImpactShort).toBeCloseTo(-13.6);
    expect(result.volumeImpactLong).toBeCloseTo(-20.4);
    expect(result.revenueImpact).toBeCloseTo(20.4);
    expect(result.newCigRevenue).toBeCloseTo(39130);
    expect(result.newEbitMargin).toBe(55);
    expect(result.newCigEbit).toBeCloseTo(21521.5);
    expect(result.stockReactionEstimate).toBe(-8);
  });
});
