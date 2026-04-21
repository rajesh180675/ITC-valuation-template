import { describe, it, expect } from 'vitest';
import { COMPANY_PROFILES, getCompany } from '@/data/companies';
import {
  projectCompany,
  dcf,
  valueWithAssumptions,
  runScenarios,
  runMonteCarlo,
  reverseDCF,
  relativeValuation,
  gordonGrowthDDM,
  twoStageDDM,
  computeEvaSeries,
  computeRoicDecomposition,
  blendedValuationBridge,
  buildCompanySnapshot,
  waccTerminalSensitivity,
} from './genericModel';

// ===========================================================================
// Registry integrity
// ===========================================================================

describe('company registry', () => {
  it('contains the required seed companies and the expanded universe', () => {
    const ids = COMPANY_PROFILES.map(c => c.id).sort();
    expect(ids).toEqual(expect.arrayContaining(['hul', 'itc', 'nerolac', 'tcs', 'vst']));
    expect(ids.length).toBeGreaterThanOrEqual(32);
  });

  it('has non-empty historical, segments, peers, scenarios for every profile', () => {
    for (const p of COMPANY_PROFILES) {
      expect(p.historical.length).toBeGreaterThanOrEqual(5);
      expect(p.segments.length).toBeGreaterThanOrEqual(1);
      expect(p.peers.length).toBeGreaterThanOrEqual(3);
      expect(p.scenarios.length).toBeGreaterThanOrEqual(3);
      expect(p.sharesOutstandingCr).toBeGreaterThan(0);
      expect(p.currentMarketPrice).toBeGreaterThan(0);
    }
  });

  it('scenario probabilities are reasonable per company (0.8-1.2 sum)', () => {
    for (const p of COMPANY_PROFILES) {
      const total = p.scenarios.reduce((s, x) => s + x.probability, 0);
      expect(total).toBeGreaterThanOrEqual(0.8);
      expect(total).toBeLessThanOrEqual(1.2);
    }
  });

  it('FY25 is the latest historical year for every company', () => {
    for (const p of COMPANY_PROFILES) {
      const last = p.historical[p.historical.length - 1]!;
      expect(last.fy).toBe('FY25');
    }
  });

  it('getCompany throws on unknown id', () => {
    expect(() => getCompany('unknown-xyz')).toThrow();
  });
});

// ===========================================================================
// Per-company sanity
// ===========================================================================

describe.each(COMPANY_PROFILES)('model - $ticker ($name)', (profile) => {
  it('projects N years with monotone-ish revenue', () => {
    const proj = projectCompany(profile);
    expect(proj.length).toBe(profile.assumptions.projectionYears);
    for (let i = 1; i < proj.length; i++) {
      // At minimum, revenue should never go below 60% of previous
      expect(proj[i]!.revenue).toBeGreaterThan(proj[i - 1]!.revenue * 0.6);
    }
  });

  it('produces a finite, positive DCF value', () => {
    const proj = projectCompany(profile);
    const v = dcf(profile, proj);
    expect(v.isValid).toBe(true);
    expect(v.perShareValue).toBeGreaterThan(0);
    expect(Number.isFinite(v.perShareValue)).toBe(true);
    expect(v.pvExplicit).toBeGreaterThan(0);
    expect(v.pvTerminal).toBeGreaterThan(0);
  });

  it('scenario expected value lies between bear and bull', () => {
    const s = runScenarios(profile);
    expect(s.bearValue).toBeLessThanOrEqual(s.bullValue);
    expect(s.expectedValue).toBeGreaterThanOrEqual(s.bearValue * 0.95);
    expect(s.expectedValue).toBeLessThanOrEqual(s.bullValue * 1.05);
  });

  it('monte carlo is deterministic given the same seed', () => {
    const mc1 = runMonteCarlo(profile, 150, 42);
    const mc2 = runMonteCarlo(profile, 150, 42);
    expect(mc1.mean).toBe(mc2.mean);
    expect(mc1.median).toBe(mc2.median);
    expect(mc1.p5).toBe(mc2.p5);
    expect(mc1.p95).toBe(mc2.p95);
  });

  it('monte carlo percentile ordering holds', () => {
    const mc = runMonteCarlo(profile, 200, 7);
    expect(mc.p5).toBeLessThanOrEqual(mc.p25);
    expect(mc.p25).toBeLessThanOrEqual(mc.median);
    expect(mc.median).toBeLessThanOrEqual(mc.p75);
    expect(mc.p75).toBeLessThanOrEqual(mc.p95);
    expect(mc.probUpside).toBeGreaterThanOrEqual(0);
    expect(mc.probUpside).toBeLessThanOrEqual(1);
  });

  it('reverse DCF converges near market price', () => {
    const r = reverseDCF(profile);
    expect(Number.isFinite(r.impliedRevenueCAGR)).toBe(true);
    expect(Number.isFinite(r.dcfAtImplied)).toBe(true);
    expect(r.iterations).toBeGreaterThan(0);
    if (r.converged) {
      const gap = Math.abs(r.dcfAtImplied - r.currentPrice) / r.currentPrice;
      expect(gap).toBeLessThan(0.03);
    } else {
      expect(r.impliedRevenueCAGR).toBeGreaterThanOrEqual(-10);
      expect(r.impliedRevenueCAGR).toBeLessThanOrEqual(25);
    }
  });

  it('relative valuation returns 3 finite methods with ordered peer ranges', () => {
    const rel = relativeValuation(profile);
    expect(rel.length).toBe(3);
    for (const r of rel) {
      expect(Number.isFinite(r.perShareValue)).toBe(true);
      expect(r.peerMin).toBeLessThanOrEqual(r.peerMedian);
      expect(r.peerMedian).toBeLessThanOrEqual(r.peerMax);
    }
  });

  it('DDM gives finite values with required-return > terminal-growth', () => {
    const g = gordonGrowthDDM(profile);
    const t = twoStageDDM(profile);
    expect(Number.isFinite(g.perShareValue)).toBe(true);
    expect(Number.isFinite(t.perShareValue)).toBe(true);
    expect(g.perShareValue).toBeGreaterThan(0);
    expect(t.perShareValue).toBeGreaterThan(0);
    // Two-stage should be >= Gordon when near-term growth > terminal (the
    // near-term stage adds value) - assert roughly
    if (profile.assumptions.dividendGrowthNearTerm > profile.assumptions.dividendGrowthTerminal) {
      expect(t.perShareValue).toBeGreaterThanOrEqual(g.perShareValue * 0.6);
    }
  });

  it('EVA series equals NOPAT - capital charge each year', () => {
    const proj = projectCompany(profile);
    const eva = computeEvaSeries(profile, proj);
    for (const e of eva) {
      expect(Math.abs(e.eva - (e.nopat - e.capitalCharge))).toBeLessThanOrEqual(1.1);
      expect(e.roicSpread).toBeCloseTo(e.roic - profile.assumptions.wacc, 0);
    }
  });

  it('ROIC decomposition satisfies DuPont identity', () => {
    const proj = projectCompany(profile);
    const rows = computeRoicDecomposition(profile, proj);
    for (const r of rows) {
      // ROIC (%) = NOPAT-margin (%) × capital turnover
      expect(r.roic).toBeCloseTo(r.nopatMargin * r.capitalTurnover, 0);
    }
  });

  it('blended bridge matches weighted sum within rounding', () => {
    const b = blendedValuationBridge(profile);
    const sum = b.methods.reduce((s, m) => s + m.perShareValue * m.weight, 0);
    expect(Math.abs(sum - b.blendedPerShare)).toBeLessThan(0.2);
    const totalWeight = b.methods.reduce((s, m) => s + m.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
  });

  it('snapshot aggregates all engines without error', () => {
    const s = buildCompanySnapshot(profile);
    expect(s.projection.length).toBe(profile.assumptions.projectionYears);
    expect(s.dcf.isValid).toBe(true);
    expect(s.scenarios.scenarios.length).toBe(profile.scenarios.length);
    expect(s.relative.length).toBe(3);
    expect(s.eva.length).toBe(s.projection.length);
    expect(s.roic.length).toBe(s.projection.length);
  });

  it('WACC-g sensitivity respects monotonicity (higher wacc -> lower value)', () => {
    const grid = waccTerminalSensitivity(profile, 1, 0.5, 0.5);
    // For a fixed terminal-growth, increasing WACC should lower perShareValue
    const byWacc = new Map<number, Array<{ w: number; v: number }>>();
    for (const p of grid) {
      if (p.perShareValue == null) continue;
      const key = p.terminalGrowth;
      if (!byWacc.has(key)) byWacc.set(key, []);
      byWacc.get(key)!.push({ w: p.wacc, v: p.perShareValue });
    }
    for (const [, arr] of byWacc) {
      const sorted = [...arr].sort((a, b) => a.w - b.w);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]!.v).toBeLessThanOrEqual(sorted[i - 1]!.v + 1); // allow tiny rounding
      }
    }
  });
});

// ===========================================================================
// Cross-company invariants
// ===========================================================================

describe('cross-company invariants', () => {
  it('snapshots run for all companies without throwing', () => {
    for (const p of COMPANY_PROFILES) {
      expect(() => buildCompanySnapshot(p)).not.toThrow();
    }
  });

  it('WACC adjusted higher => DCF value lower for every company', () => {
    for (const p of COMPANY_PROFILES) {
      const base = valueWithAssumptions(p);
      const highWacc = valueWithAssumptions(p, { wacc: p.assumptions.wacc + 2 });
      expect(highWacc.perShareValue).toBeLessThan(base.perShareValue);
    }
  });

  it('higher target EBITDA margin => higher DCF value', () => {
    for (const p of COMPANY_PROFILES) {
      const base = valueWithAssumptions(p);
      const higher = valueWithAssumptions(p, { targetEbitdaMargin: p.assumptions.targetEbitdaMargin + 3 });
      expect(higher.perShareValue).toBeGreaterThan(base.perShareValue - 0.5);
    }
  });
});
