import { describe, expect, it } from 'vitest';
import { defaultAssumptions, historicalData, taxEvents } from '@/data/itcData';
import { buildCatalystTimeline, buildIdeaLabReport, buildRiskRegister, summarizeFiveYearCagr } from '@/utils/ideaLab';

describe('ideaLab utilities', () => {
  it('creates a deterministic high-level report', () => {
    const report = buildIdeaLabReport(defaultAssumptions, historicalData, taxEvents);

    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(['Accumulate', 'Hold', 'Reduce']).toContain(report.recommendation);
    expect(report.pillarScores).toHaveLength(5);
    expect(report.riskRegister.length).toBeGreaterThan(0);
    expect(report.catalystTimeline.length).toBe(6);
  });

  it('ranks risk register by descending score', () => {
    const register = buildRiskRegister(defaultAssumptions);
    const scores = register.map((r) => r.score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
  });

  it('summarizes CAGR from trailing 5Y span', () => {
    const cagr = summarizeFiveYearCagr(historicalData);
    expect(cagr.revenueCagr).toBeGreaterThan(0);
    expect(cagr.profitCagr).toBeGreaterThan(0);
  });

  it('classifies catalyst impacts', () => {
    const catalysts = buildCatalystTimeline(taxEvents);
    expect(catalysts.some((c) => c.impact === 'Positive')).toBe(true);
    expect(catalysts.some((c) => c.impact === 'Negative')).toBe(true);
  });
});
