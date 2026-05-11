import { describe, expect, it } from 'vitest';
import {
  costOfEquity,
  earningsVolatility,
  impliedPerpetualGrowth,
  computeDuPont,
  computeConcentration,
  buildFactorScores,
  buildMagicFormulaRanks,
  buildValuationZScores,
  buildSectorAnalytics,
  buildSectorMomentumGrid,
  computeValuationBuckets,
  MARKET_PARAMS,
} from './sensexAnalytics';
import type { SensexConstituent, SensexYearFinancial } from '@/data/sensexData';

function makeCompany(overrides: Partial<SensexConstituent> & { id: string }): SensexConstituent {
  const defaults: SensexConstituent = {
    name: 'Test',
    ticker: 'TEST',
    sector: 'Technology',
    reportingType: 'nonFinancial',
    weightPct: 5,
    marketCapCr: 100000,
    cmp: 1000,
    valuationMetric: 'pe',
    valuationMultiple: 25,
    dividendYieldPct: 1,
    color: '#000',
    beta: 1.0,
    netDebtToEbitda: 0.5,
    history: [
      { fy: 'FY2021', toplineCr: 100, netProfitCr: 10, roePct: 15, operatingMarginPct: 12, rocePct: 18 },
      { fy: 'FY2022', toplineCr: 120, netProfitCr: 14, roePct: 16, operatingMarginPct: 13, rocePct: 19 },
      { fy: 'FY2023', toplineCr: 140, netProfitCr: 18, roePct: 17, operatingMarginPct: 14, rocePct: 20 },
      { fy: 'FY2024', toplineCr: 165, netProfitCr: 22, roePct: 18, operatingMarginPct: 15, rocePct: 21 },
    ],
    ...overrides,
  };
  return defaults;
}

function makeFinancial(overrides: Partial<SensexConstituent> & { id: string }): SensexConstituent {
  return makeCompany({
    ...overrides,
    reportingType: 'financial',
    valuationMetric: 'pb',
    valuationMultiple: 2.5,
    netDebtToEbitda: undefined,
    history: [
      { fy: 'FY2021', toplineCr: 500, netProfitCr: 50, roePct: 12 },
      { fy: 'FY2022', toplineCr: 550, netProfitCr: 58, roePct: 13 },
      { fy: 'FY2023', toplineCr: 600, netProfitCr: 65, roePct: 14 },
      { fy: 'FY2024', toplineCr: 680, netProfitCr: 72, roePct: 15 },
    ],
  });
}

// ─── costOfEquity ────────────────────────────────────────────────────────

describe('costOfEquity', () => {
  it('computes CAPM: Rf + β × ERP', () => {
    expect(costOfEquity(1.0)).toBe(12.6); // 7.1 + 1.0 × 5.5
  });

  it('returns Rf when beta is 0', () => {
    expect(costOfEquity(0)).toBe(7.1);
  });

  it('scales with high beta', () => {
    expect(costOfEquity(2.0)).toBe(18.1); // 7.1 + 2.0 × 5.5
  });
});

// ─── earningsVolatility ──────────────────────────────────────────────────

describe('earningsVolatility', () => {
  it('returns 0 for < 3 years of history', () => {
    expect(earningsVolatility([
      { fy: 'FY2024', toplineCr: 100, netProfitCr: 10, roePct: 15 },
    ])).toBe(0);
  });

  it('returns 0 for flat earnings', () => {
    const flat: SensexYearFinancial[] = [
      { fy: 'FY2021', toplineCr: 100, netProfitCr: 10, roePct: 15 },
      { fy: 'FY2022', toplineCr: 110, netProfitCr: 10, roePct: 15 },
      { fy: 'FY2023', toplineCr: 120, netProfitCr: 10, roePct: 15 },
    ];
    expect(earningsVolatility(flat)).toBe(0);
  });

  it('returns positive number for volatile earnings', () => {
    const volatile: SensexYearFinancial[] = [
      { fy: 'FY2021', toplineCr: 100, netProfitCr: 10, roePct: 15 },
      { fy: 'FY2022', toplineCr: 120, netProfitCr: 30, roePct: 20 },
      { fy: 'FY2023', toplineCr: 140, netProfitCr: 5, roePct: 10 },
    ];
    const vol = earningsVolatility(volatile);
    expect(vol).toBeGreaterThan(0);
  });

  it('skips deltas where prev year had negative PAT (loss-making company)', () => {
    const lossThenProfit: SensexYearFinancial[] = [
      { fy: 'FY2021', toplineCr: 100, netProfitCr: -10, roePct: -5 },
      { fy: 'FY2022', toplineCr: 120, netProfitCr: 15, roePct: 10 },
      { fy: 'FY2023', toplineCr: 140, netProfitCr: 20, roePct: 12 },
    ];
    // prev > 0 check skips FY2021→FY2022 since prev = -10
    // Only FY2022→FY2023 (prev = 15 > 0) contributes a delta
    const vol = earningsVolatility(lossThenProfit);
    expect(vol).toBeGreaterThanOrEqual(0);
    // With only 1 delta, stddev = 0 (single value has no variance)
    expect(vol).toBe(0);
  });

  it('returns 0 when all prior years have negative PAT', () => {
    const allLoss: SensexYearFinancial[] = [
      { fy: 'FY2021', toplineCr: 100, netProfitCr: -10, roePct: -5 },
      { fy: 'FY2022', toplineCr: 110, netProfitCr: -8, roePct: -4 },
      { fy: 'FY2023', toplineCr: 120, netProfitCr: -5, roePct: -2 },
    ];
    expect(earningsVolatility(allLoss)).toBe(0);
  });
});

// ─── impliedPerpetualGrowth ──────────────────────────────────────────────

describe('impliedPerpetualGrowth', () => {
  it('computes positive growth for a typical PE-based company', () => {
    const c = makeCompany({ id: 'test', valuationMetric: 'pe', valuationMultiple: 25, dividendYieldPct: 1.5, beta: 1.0 });
    const g = impliedPerpetualGrowth(c);
    // r = 12.6%, payout = min(0.95, 0.015 * 25) = 0.375
    // g = 12.6 - 0.375/25*100 = 12.6 - 1.5 = 11.1, clamped to min(7.0, 12.6-0.5=12.1) = 7.0
    expect(g).toBe(7.0);
  });

  it('returns minImpliedGrowth for PB near 1 (degenerate)', () => {
    // PB within 1% of 1.0 → degenerate case for PB-route formula
    const c = makeCompany({ id: 'test', valuationMetric: 'pb', valuationMultiple: 1.001, beta: 1.0, reportingType: 'financial' });
    expect(impliedPerpetualGrowth(c)).toBe(MARKET_PARAMS.minImpliedGrowthPct);
  });

  it('returns minImpliedGrowth for PE ≤ 0', () => {
    const c = makeCompany({ id: 'test', valuationMetric: 'pe', valuationMultiple: 0, beta: 1.0 });
    expect(impliedPerpetualGrowth(c)).toBe(MARKET_PARAMS.minImpliedGrowthPct);
  });

  it('clamps growth to ceiling = min(maxTerminalGrowth, r - 0.5)', () => {
    // Low beta = low r, so clamp ceiling should bind
    const c = makeCompany({ id: 'test', valuationMetric: 'pe', valuationMultiple: 100, dividendYieldPct: 0, beta: 0.5 });
    // r = 7.1 + 0.5*5.5 = 9.85
    // g = 9.85 - 0/100*100 = 9.85, clamped to min(7.0, 9.85-0.5=9.35) = 7.0
    expect(impliedPerpetualGrowth(c)).toBe(7.0);
  });
});

// ─── computeDuPont ───────────────────────────────────────────────────────

describe('computeDuPont', () => {
  it('decomposes ROE into NPM and leverage/turnover for nonFinancial', () => {
    const c = makeCompany({ id: 'test', reportingType: 'nonFinancial' });
    const d = computeDuPont(c);
    expect(d.applicable).toBe(true);
    expect(d.roe).toBe(18);
    // NPM = 22/165 = 13.33...%
    expect(d.npm).toBeCloseTo(13.3, 0);
    // Leverage = roe - npm = 18 - 13.3 = 4.7
    expect(d.leverageAndTurnover).toBeCloseTo(4.7, 0);
  });

  it('returns not applicable for financial companies', () => {
    const c = makeFinancial({ id: 'test' });
    const d = computeDuPont(c);
    expect(d.applicable).toBe(false);
    expect(d.npm).toBe(0);
    expect(d.leverageAndTurnover).toBe(0);
  });
});

// ─── computeConcentration ────────────────────────────────────────────────

describe('computeConcentration', () => {
  it('computes HHI for equal-weighted companies', () => {
    const a = makeCompany({ id: 'a', weightPct: 25 });
    const b = makeCompany({ id: 'b', weightPct: 25 });
    const c = makeCompany({ id: 'c', weightPct: 25 });
    const d = makeCompany({ id: 'd', weightPct: 25 });
    const result = computeConcentration([a, b, c, d]);
    // Each is 25% of total: 25^2 * 4 = 2500
    expect(result.hhi).toBe(2500);
    expect(result.effectiveN).toBe(4);
  });

  it('returns zeros for empty array', () => {
    const result = computeConcentration([]);
    expect(result.hhi).toBe(0);
    expect(result.effectiveN).toBe(0);
    expect(result.top3Pct).toBe(0);
  });

  it('single company has HHI = 10000', () => {
    const c = makeCompany({ id: 'a', weightPct: 100 });
    expect(computeConcentration([c]).hhi).toBe(10000);
  });

  it('top3Pct < top5Pct < top10Pct for real-world-like weight distribution', () => {
    // Create 20 companies with declining weights (paretto-like)
    const companies = Array.from({ length: 20 }, (_, i) =>
      makeCompany({ id: `c${i}`, weightPct: Math.max(0.5, 30 - i * 1.5) })
    );
    const result = computeConcentration(companies);
    expect(result.top3Pct).toBeGreaterThan(0);
    expect(result.top5Pct).toBeGreaterThan(result.top3Pct);
    expect(result.top10Pct).toBeGreaterThan(result.top5Pct);
    expect(result.hhi).toBeGreaterThan(0);
  });
});

// ─── buildFactorScores ───────────────────────────────────────────────────

describe('buildFactorScores', () => {
  it('returns empty map for empty companies', () => {
    expect(buildFactorScores([], 0, 3).size).toBe(0);
  });

  it('produces quality/value/growth/momentum scores for each company', () => {
    const a = makeCompany({ id: 'a', beta: 0.8, valuationMultiple: 30, dividendYieldPct: 0.5 });
    const b = makeFinancial({ id: 'b', beta: 1.2, valuationMultiple: 2, dividendYieldPct: 2.0 });
    const scores = buildFactorScores([a, b], 0, 3);
    expect(scores.size).toBe(2);
    for (const score of scores.values()) {
      expect(score.quality).toBeGreaterThanOrEqual(0);
      expect(score.quality).toBeLessThanOrEqual(100);
      expect(score.value).toBeGreaterThanOrEqual(0);
      expect(score.growth).toBeGreaterThanOrEqual(0);
      expect(score.momentum).toBeGreaterThanOrEqual(0);
      expect(score.composite).toBeGreaterThanOrEqual(0);
    }
  });

  it('BFSI company with undefined operatingMarginPct still gets non-zero momentum (ROE-delta branch)', () => {
    const finCo = makeFinancial({
      id: 'bfsi-test',
      beta: 1.0,
      valuationMultiple: 2.0,
      history: [
        { fy: 'FY2021', toplineCr: 500, netProfitCr: 50, roePct: 14 },
        { fy: 'FY2022', toplineCr: 550, netProfitCr: 58, roePct: 15 },
        { fy: 'FY2023', toplineCr: 600, netProfitCr: 65, roePct: 16 },
        { fy: 'FY2024', toplineCr: 650, netProfitCr: 72, roePct: 17 },
      ],
    });
    // operatingMarginPct is undefined in all years (as is typical for banks)
    // If BFSI branch were broken, momentum would be 0 (marginDelta = 0 for all undefined).
    // With correct ROE-delta branch, momentum should be > 0 since ROE steadily improves.
    const scores = buildFactorScores([finCo], 0, 3);
    const score = scores.get('bfsi-test');
    expect(score).toBeDefined();
    expect(score!.momentum).toBeGreaterThan(0);
  });

  it('nonFinancial company momentum uses margin delta', () => {
    const nonFin = makeCompany({
      id: 'margin-test',
      history: [
        { fy: 'FY2021', toplineCr: 100, netProfitCr: 10, roePct: 15, operatingMarginPct: 10 },
        { fy: 'FY2022', toplineCr: 120, netProfitCr: 14, roePct: 16, operatingMarginPct: 12 },
        { fy: 'FY2023', toplineCr: 140, netProfitCr: 18, roePct: 17, operatingMarginPct: 14 },
        { fy: 'FY2024', toplineCr: 165, netProfitCr: 22, roePct: 18, operatingMarginPct: 16 },
      ],
    });
    const scores = buildFactorScores([nonFin], 0, 3);
    const score = scores.get('margin-test');
    expect(score).toBeDefined();
    // Margin expanded every year, so momentum > 50 (above median)
    expect(score!.momentum).toBeGreaterThan(0);
  });
});

// ─── buildMagicFormulaRanks ──────────────────────────────────────────────

describe('buildMagicFormulaRanks', () => {
  it('returns sorted results with rankCombined', () => {
    const a = makeCompany({ id: 'a', reportingType: 'nonFinancial' });
    a.history[a.history.length - 1].rocePct = 30;
    const b = makeCompany({ id: 'b', reportingType: 'nonFinancial' });
    b.history[b.history.length - 1].rocePct = 10;
    b.valuationMultiple = 50;
    const results = buildMagicFormulaRanks([a, b]);
    expect(results.length).toBe(2);
    expect(results[0].rankCombined).toBeLessThan(results[1].rankCombined);
  });

  it('handles financial companies via ROE', () => {
    const a = makeFinancial({ id: 'a' });
    const b = makeFinancial({ id: 'b' });
    const results = buildMagicFormulaRanks([a, b]);
    expect(results.length).toBe(2);
    expect(results[0].id).toBeDefined();
  });

  it('returns empty for empty input', () => {
    expect(buildMagicFormulaRanks([])).toEqual([]);
  });
});

// ─── buildValuationZScores ───────────────────────────────────────────────

describe('buildValuationZScores', () => {
  it('returns empty map for empty input', () => {
    expect(buildValuationZScores([]).size).toBe(0);
  });

  it('computes z-scores within sector×metric buckets', () => {
    const a = makeCompany({ id: 'a', sector: 'Tech', valuationMetric: 'pe', valuationMultiple: 20 });
    const b = makeCompany({ id: 'b', sector: 'Tech', valuationMetric: 'pe', valuationMultiple: 40 });
    const c = makeCompany({ id: 'c', sector: 'Tech', valuationMetric: 'pb', valuationMultiple: 3 });
    const scores = buildValuationZScores([a, b, c]);
    expect(scores.size).toBe(3);
    const scoreA = scores.get('a')!;
    expect(scoreA.zScore).toBeLessThan(0); // below median
    const scoreB = scores.get('b')!;
    expect(scoreB.zScore).toBeGreaterThan(0); // above median
  });
});

// ─── buildSectorAnalytics ────────────────────────────────────────────────

describe('buildSectorAnalytics', () => {
  it('returns empty for empty input', () => {
    expect(buildSectorAnalytics([], 0, 3)).toEqual([]);
  });

  it('aggregates sector-level weighted means', () => {
    const a = makeCompany({ id: 'a', sector: 'Tech', weightPct: 10 });
    const b = makeCompany({ id: 'b', sector: 'Tech', weightPct: 20 });
    const result = buildSectorAnalytics([a, b], 0, 3);
    expect(result.length).toBe(1);
    expect(result[0].sector).toBe('Tech');
    expect(result[0].count).toBe(2);
    expect(result[0].weightPct).toBe(30);
  });
});

// ─── buildSectorMomentumGrid ─────────────────────────────────────────────

describe('buildSectorMomentumGrid', () => {
  it('returns empty for empty input', () => {
    expect(buildSectorMomentumGrid([])).toEqual([]);
  });

  it('returns YoY PAT growth rows sorted by weight', () => {
    const a = makeCompany({ id: 'a', sector: 'Tech', weightPct: 30 });
    const b = makeCompany({ id: 'b', sector: 'Energy', weightPct: 10 });
    const grid = buildSectorMomentumGrid([a, b]);
    expect(grid.length).toBe(2);
    expect(grid[0].sector).toBe('Tech'); // higher weight first
    expect(grid[1].sector).toBe('Energy');
    expect(grid[0].cells.length).toBeGreaterThan(0);
    expect(grid[0].cells[0].fy).toBeDefined();
  });
});

// ─── computeValuationBuckets ──────────────────────────────────────────────

describe('computeValuationBuckets', () => {
  it('classifies companies into cheap / fair / expensive by sector', () => {
    // Companies across 2 sectors with deliberately spread z-scores
    const companies: SensexConstituent[] = [
      makeCompany({ id: 'tech1', sector: 'Technology' }),
      makeCompany({ id: 'tech2', sector: 'Technology' }),
      makeCompany({ id: 'tech3', sector: 'Technology' }),
      makeCompany({ id: 'fin1', sector: 'Financials' }),
      makeCompany({ id: 'fin2', sector: 'Financials' }),
    ];
    const zScores = new Map([
      ['tech1', { zScore: -1.5 }],  // cheap
      ['tech2', { zScore: 0.2 }],   // fair
      ['tech3', { zScore: 2.1 }],   // expensive
      ['fin1', { zScore: -0.5 }],   // fair
      ['fin2', { zScore: 1.5 }],    // expensive
    ]);

    const buckets = computeValuationBuckets(companies, zScores);
    expect(buckets).toHaveLength(2);

    const tech = buckets.find(b => b.sector === 'Technology');
    expect(tech).toBeDefined();
    expect(tech!.total).toBe(3);
    expect(tech!.cheap).toBe(1);
    expect(tech!.fair).toBe(1);
    expect(tech!.expensive).toBe(1);

    const fin = buckets.find(b => b.sector === 'Financials');
    expect(fin).toBeDefined();
    expect(fin!.total).toBe(2);
    expect(fin!.cheap).toBe(0);
    expect(fin!.fair).toBe(1);
    expect(fin!.expensive).toBe(1);
  });

  it('returns empty array when no companies match zScores', () => {
    const result = computeValuationBuckets([], new Map());
    expect(result).toEqual([]);
  });

  it('computes market cap sums for each bucket', () => {
    const companies = [makeCompany({ id: 'a', sector: 'Energy', marketCapCr: 100000 })];
    const zScores = new Map([['a', { zScore: -2 }]]);
    const buckets = computeValuationBuckets(companies, zScores);
    expect(buckets[0].cheapMcapCr).toBe(100000);
    expect(buckets[0].fairMcapCr).toBe(0);
    expect(buckets[0].expensiveMcapCr).toBe(0);
  });
});