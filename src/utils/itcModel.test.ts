import { describe, expect, it } from 'vitest';

import { defaultAssumptions, historicalData, sotpData, type YearlyData } from '@/data/itcData';
import {
  buildDcfSensitivity,
  calculateDCF,
  calculateDynamicSotpSummary,
  generateProjectionDetails,
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

describe('generateProjectionDetails', () => {
  it('creates a seven-year projection with explicit valuation bridge fields', () => {
    const details = generateProjectionDetails(defaultAssumptions, historicalData[historicalData.length - 1]);

    expect(details).toHaveLength(MODEL_ASSUMPTIONS.projectionYears);
    expect(details[0].fy).toBe('FY2025E');
    expect(details[0].fcff).toBeTypeOf('number');
    expect(details[0].workingCapitalInvestment).toBeGreaterThanOrEqual(0);
    expect(details[0].summary.freeCashFlow).toBe(details[0].fcff);
  });

  it('applies the cigarette margin floor when tax pressure is severe', () => {
    const details = generateProjectionDetails(
      {
        ...defaultAssumptions,
        annualNccdHike: 40,
        cigaretteEbitMargin: 58,
      },
      historicalData[historicalData.length - 1],
    );

    expect(details[0].cigaretteEbitMargin).toBe(55);
    expect(details[0].summary.cigaretteEbitMargin).toBe(55);
  });
});

describe('calculateDCF', () => {
  it('returns a valid discounted cash flow valuation and diagnostics for finite inputs', () => {
    const projections = generateProjections(defaultAssumptions, historicalData[historicalData.length - 1]);
    const result = calculateDCF(projections, defaultAssumptions.wacc, defaultAssumptions.terminalGrowth);

    expect(result.isValid).toBe(true);
    expect(result.validationErrors).toEqual([]);
    expect(result.pvCashFlows).toHaveLength(MODEL_ASSUMPTIONS.projectionYears);
    expect(result.enterpriseValue).toBeGreaterThan(0);
    expect(result.terminalValue).toBeGreaterThan(result.pvTerminalValue);
    expect(result.terminalValueWeight).toBeGreaterThan(0);
    expect(result.impliedExitEbitdaMultiple).toBeGreaterThan(0);
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

describe('calculateDynamicSotpSummary', () => {
  it('revalues SOTP lines off the projected terminal-year segment economics', () => {
    const details = generateProjectionDetails(defaultAssumptions, historicalData[historicalData.length - 1]);
    const result = calculateDynamicSotpSummary(details, sotpData, defaultAssumptions.conglomerateDiscount);

    expect(result.lines).toHaveLength(sotpData.length);
    expect(result.totalBase).toBeGreaterThan(0);
    expect(result.discountValueBase).toBeGreaterThan(0);
    expect(result.perShareBase).toBeGreaterThan(0);
    expect(result.lines.find(line => line.segment === 'Cigarettes')?.ebit).toBeGreaterThan(sotpData[0].ebit);
  });
});

describe('buildDcfSensitivity', () => {
  it('builds a 3x3 sensitivity grid around the base case', () => {
    const projections = generateProjections(defaultAssumptions, historicalData[historicalData.length - 1]);
    const sensitivity = buildDcfSensitivity(projections, defaultAssumptions.wacc, defaultAssumptions.terminalGrowth);

    expect(sensitivity).toHaveLength(9);
    expect(sensitivity.filter(point => point.isBase)).toHaveLength(1);
  });
});

describe('simulateTaxImpact', () => {
  it('models pass-through, elasticity, and margin compression explicitly', () => {
    const result = simulateTaxImpact(40, historicalData[historicalData.length - 1]);

    expect(result.priceIncrease).toBeCloseTo(34);
    expect(result.volumeImpactShort).toBeCloseTo(-13.6);
    expect(result.volumeImpactLong).toBeCloseTo(-20.4);
    expect(result.revenueImpact).toBeCloseTo(20.4);
    expect(result.newCigRevenue).toBeCloseTo(39130, -1);
    expect(result.newEbitMargin).toBe(55);
    expect(result.newCigEbit).toBeGreaterThan(21000);
    expect(result.stockReactionEstimate).toBe(-8);
  });
});
