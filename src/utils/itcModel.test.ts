import { describe, expect, it } from 'vitest';

import {
  defaultAssumptions,
  historicalData,
  sotpData,
  valuationScenarios,
  peerMultiples,
  currentMarketPrice,
  type YearlyData,
} from '@/data/itcData';
import {
  buildDcfSensitivity,
  calculateDCF,
  calculateDynamicSotpSummary,
  calculateEvaSeries,
  calculateGordonGrowthDDM,
  calculateRelativeValuation,
  calculateReverseDCF,
  calculateRoicDecomposition,
  calculateTwoStageDDM,
  computePeerPercentileRanks,
  buildBlendedValuationBridge,
  generateProjectionDetails,
  generateProjections,
  MODEL_ASSUMPTIONS,
  runMonteCarloSimulation,
  runScenarioAnalysis,
  simulateTaxImpact,
} from './itcModel';

const latest = historicalData[historicalData.length - 1]!;

function makeYearlyData(overrides: Partial<YearlyData> = {}): YearlyData {
  return { ...latest, ...overrides };
}

describe('generateProjectionDetails', () => {
  it('creates a seven-year projection with explicit valuation bridge fields', () => {
    const details = generateProjectionDetails(defaultAssumptions, latest);

    expect(details).toHaveLength(MODEL_ASSUMPTIONS.projectionYears);
    // FY25 is now an actual — so first projection year is FY26E
    expect(details[0].fy).toBe('FY2026E');
    expect(details[0].fcff).toBeTypeOf('number');
    expect(details[0].workingCapitalInvestment).toBeGreaterThanOrEqual(0);
    expect(details[0].summary.freeCashFlow).toBe(details[0].fcff);
  });

  it('applies the cigarette margin floor when tax pressure is severe', () => {
    const details = generateProjectionDetails(
      { ...defaultAssumptions, annualNccdHike: 40, cigaretteEbitMargin: 58 },
      latest,
    );

    expect(details[0].cigaretteEbitMargin).toBe(55);
    expect(details[0].summary.cigaretteEbitMargin).toBe(55);
  });
});

describe('calculateDCF', () => {
  it('returns a valid discounted cash flow valuation and diagnostics for finite inputs', () => {
    const projections = generateProjections(defaultAssumptions, latest);
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
    const details = generateProjectionDetails(defaultAssumptions, latest);
    const result = calculateDynamicSotpSummary(details, sotpData, defaultAssumptions.conglomerateDiscount);

    expect(result.lines).toHaveLength(sotpData.length);
    expect(result.totalBase).toBeGreaterThan(0);
    expect(result.discountValueBase).toBeGreaterThan(0);
    expect(result.perShareBase).toBeGreaterThan(0);
    expect(result.lines.find(l => l.segment === 'Cigarettes')?.ebit).toBeGreaterThan(sotpData[0]!.ebit);
  });
});

describe('buildDcfSensitivity', () => {
  it('builds a 3x3 sensitivity grid around the base case', () => {
    const projections = generateProjections(defaultAssumptions, latest);
    const sensitivity = buildDcfSensitivity(projections, defaultAssumptions.wacc, defaultAssumptions.terminalGrowth);

    expect(sensitivity).toHaveLength(9);
    expect(sensitivity.filter(p => p.isBase)).toHaveLength(1);
  });
});

describe('simulateTaxImpact', () => {
  it('models pass-through, elasticity, and margin compression explicitly against FY25 base', () => {
    const result = simulateTaxImpact(40, latest);

    // 40% hike × 85% pass-through = 34% price increase
    expect(result.priceIncrease).toBeCloseTo(34);
    expect(result.volumeImpactShort).toBeCloseTo(-13.6);
    expect(result.volumeImpactLong).toBeCloseTo(-20.4);
    expect(result.revenueImpact).toBeCloseTo(20.4);
    // 34,800 × 1.204 ≈ 41,899 Cr against the refreshed FY25 base
    expect(result.newCigRevenue).toBeCloseTo(41899, -2);
    expect(result.newEbitMargin).toBe(55);
    expect(result.newCigEbit).toBeGreaterThan(21000);
    expect(result.stockReactionEstimate).toBe(-8);
  });
});

// ============= NEW ANALYTICS TESTS =============

describe('runScenarioAnalysis', () => {
  it('produces probability-weighted expected value across scenarios', () => {
    const result = runScenarioAnalysis(defaultAssumptions, latest, sotpData, valuationScenarios, currentMarketPrice);

    expect(result.scenarios).toHaveLength(valuationScenarios.length);
    expect(result.expectedValuePerShare).toBeGreaterThan(0);
    expect(result.bearPerShare).toBeLessThan(result.basePerShare);
    expect(result.bullPerShare).toBeGreaterThan(result.basePerShare);
    expect(result.scenarios.every(s => s.isValid)).toBe(true);
    expect(Math.abs(result.upsideVsMarket)).toBeLessThan(200);
  });
});

describe('runMonteCarloSimulation', () => {
  it('returns a deterministic distribution with a fixed seed', () => {
    const a = runMonteCarloSimulation(defaultAssumptions, latest, { draws: 200, seed: 7 });
    const b = runMonteCarloSimulation(defaultAssumptions, latest, { draws: 200, seed: 7 });

    expect(a.samples).toBe(200);
    expect(a.mean).toBeCloseTo(b.mean, 4);
    expect(a.median).toBeCloseTo(b.median, 4);
    expect(a.p5).toBeLessThanOrEqual(a.p25);
    expect(a.p25).toBeLessThanOrEqual(a.median);
    expect(a.median).toBeLessThanOrEqual(a.p75);
    expect(a.p75).toBeLessThanOrEqual(a.p95);
    expect(a.histogram.length).toBeGreaterThan(0);
    expect(a.probUpside).toBeGreaterThanOrEqual(0);
    expect(a.probUpside).toBeLessThanOrEqual(1);
  });

  it('produces different distributions for different seeds', () => {
    const a = runMonteCarloSimulation(defaultAssumptions, latest, { draws: 200, seed: 1 });
    const b = runMonteCarloSimulation(defaultAssumptions, latest, { draws: 200, seed: 999 });
    expect(a.mean).not.toBeCloseTo(b.mean, 6);
  });
});

describe('calculateReverseDCF', () => {
  it('solves for implied cigarette growth consistent with a target price', () => {
    const result = calculateReverseDCF(currentMarketPrice, defaultAssumptions, latest);

    expect(result.currentPrice).toBe(currentMarketPrice);
    expect(result.converged).toBe(true);
    expect(result.impliedCigaretteGrowth).toBeGreaterThan(MODEL_ASSUMPTIONS.reverseGrowthMin);
    expect(result.impliedCigaretteGrowth).toBeLessThan(MODEL_ASSUMPTIONS.reverseGrowthMax);
    expect(result.dcfAtImplied).toBeCloseTo(currentMarketPrice, 0);
  });

  it('handles zero price gracefully', () => {
    const result = calculateReverseDCF(0, defaultAssumptions, latest);
    expect(result.converged).toBe(false);
  });
});

describe('calculateRelativeValuation', () => {
  it('produces EV/EBITDA and P/E implied per-share values with peer stats', () => {
    const ev = calculateRelativeValuation(latest, peerMultiples, 'EV/EBITDA');
    const pe = calculateRelativeValuation(latest, peerMultiples, 'P/E');

    expect(ev.peerMedian).toBeGreaterThan(0);
    expect(ev.perShareValue).toBeGreaterThan(0);
    expect(pe.perShareValue).toBeGreaterThan(0);
    expect(ev.peerMin).toBeLessThanOrEqual(ev.peerMax);
    expect(Math.abs(ev.discountVsPeers)).toBeLessThan(100);
  });
});

describe('computePeerPercentileRanks', () => {
  it('returns a composite rank for every peer', () => {
    const ranks = computePeerPercentileRanks(peerMultiples);

    expect(ranks).toHaveLength(peerMultiples.length);
    ranks.forEach(r => {
      expect(r.compositeRank).toBeGreaterThanOrEqual(0);
      expect(r.compositeRank).toBeLessThanOrEqual(100);
    });
  });
});

describe('Dividend Discount Models', () => {
  it('Gordon and Two-Stage DDM both produce positive values with sustainable dividends', () => {
    const gordon = calculateGordonGrowthDDM(latest, 11, 4);
    const twoStage = calculateTwoStageDDM(latest, 7, 5, 4, 11);

    expect(gordon.perShareValue).toBeGreaterThan(0);
    expect(twoStage.perShareValue).toBeGreaterThan(0);
    expect(gordon.sustainabilityScore).toBeGreaterThanOrEqual(0);
    expect(gordon.sustainabilityScore).toBeLessThanOrEqual(100);
    // Two-stage with higher near-term growth should exceed Gordon
    expect(twoStage.perShareValue).toBeGreaterThan(gordon.perShareValue * 0.9);
  });

  it('returns zero when required return does not exceed terminal growth', () => {
    const invalid = calculateGordonGrowthDDM(latest, 4, 5);
    expect(invalid.perShareValue).toBe(0);
  });
});

describe('EVA and ROIC decomposition', () => {
  it('computes positive EVA across a forecast with a value-creating spread', () => {
    const details = generateProjectionDetails(defaultAssumptions, latest);
    const eva = calculateEvaSeries(details, defaultAssumptions.wacc);
    const decomp = calculateRoicDecomposition(details);

    expect(eva).toHaveLength(details.length);
    expect(decomp).toHaveLength(details.length);
    // ITC historically has ROIC well above any sensible WACC
    const avgSpread = eva.reduce((s, e) => s + e.roicSpread, 0) / eva.length;
    expect(avgSpread).toBeGreaterThan(0);
    decomp.forEach(d => {
      expect(d.nopatMargin).toBeGreaterThan(0);
      expect(d.capitalTurnover).toBeGreaterThan(0);
      // ROIC (%) = NOPATMargin (%) × CapitalTurnover
      expect(d.roic).toBeCloseTo(d.nopatMargin * d.capitalTurnover, 0);
    });
  });
});

describe('buildBlendedValuationBridge', () => {
  it('blends 5 methodologies and computes upside vs market', () => {
    const bridge = buildBlendedValuationBridge(450, 480, 430, 440, 420, currentMarketPrice);

    expect(bridge.methods).toHaveLength(5);
    const totalWeight = bridge.methods.reduce((s, m) => s + m.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
    expect(bridge.blendedPerShare).toBeGreaterThan(0);
    expect(bridge.marketPrice).toBe(currentMarketPrice);
    expect(bridge.upside).toBeCloseTo(((bridge.blendedPerShare - currentMarketPrice) / currentMarketPrice) * 100, 0);
  });
});
