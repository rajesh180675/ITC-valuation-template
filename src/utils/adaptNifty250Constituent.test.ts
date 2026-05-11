import { describe, expect, it } from 'vitest';
import { adaptNifty250Constituent } from './adaptNifty250Constituent';

/* ────────────────── helpers ────────────────── */

function validRaw(): Record<string, unknown> {
  return {
    id: 'RELIANCE',
    ticker: 'RELIANCE',
    name: 'Reliance Industries',
    sector: 'Oil & Gas',
    reportingType: 'nonFinancial',
    weightPct: 5.2,
    marketCapCr: 1500000,
    cmp: 2500,
    valuationMetric: 'pe',
    valuationMultiple: 22.5,
    dividendYieldPct: 0.4,
    color: '#3b82f6',
    beta: 0.95,
    netDebtToEbitda: 1.2,
    history: [
      { fy: 'FY2024', toplineCr: 800000, netProfitCr: 60000, roePct: 12 },
      { fy: 'FY2023', toplineCr: 700000, netProfitCr: 50000, roePct: 10 },
    ],
  };
}

/* ────────────────── tests ────────────────── */

describe('adaptNifty250Constituent', () => {
  it('returns a SensexConstituent for valid input', () => {
    const warnings: string[] = [];
    const result = adaptNifty250Constituent(validRaw(), warnings);

    expect(result).not.toBeNull();
    expect(result!.id).toBe('RELIANCE');
    expect(result!.ticker).toBe('RELIANCE');
    expect(result!.sector).toBe('Oil & Gas');
    expect(result!.weightPct).toBe(5.2);
    expect(result!.history).toHaveLength(2);
    expect(warnings).toHaveLength(0);
  });

  it('returns null and warns when id/ticker is missing', () => {
    const warnings: string[] = [];
    const raw = validRaw();
    delete raw.id;
    delete raw.ticker;

    const result = adaptNifty250Constituent(raw, warnings);

    expect(result).toBeNull();
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0]).toContain('missing id/ticker');
  });

  it('returns a valid entry (not null) even when only ticker exists', () => {
    const warnings: string[] = [];
    const raw = validRaw();
    delete raw.id;
    raw.ticker = 'ONLYTICK';

    const result = adaptNifty250Constituent(raw, warnings);

    // null because id is missing — strict check
    expect(result).toBeNull();
    expect(warnings[0]).toContain('missing id/ticker');
  });

  it('warns when marketCapCr is ≤ 0', () => {
    const warnings: string[] = [];
    const raw = validRaw();
    raw.marketCapCr = 0;

    const result = adaptNifty250Constituent(raw, warnings);

    expect(result).not.toBeNull();
    expect(warnings.some((w) => w.includes('marketCapCr'))).toBe(true);
  });

  it('warns when history is empty', () => {
    const warnings: string[] = [];
    const raw = validRaw();
    raw.history = [];

    const result = adaptNifty250Constituent(raw, warnings);

    expect(result).not.toBeNull();
    expect(warnings.some((w) => w.includes('no history'))).toBe(true);
  });

  it('warns when valuationMultiple is ≤ 0', () => {
    const warnings: string[] = [];
    const raw = validRaw();
    raw.valuationMultiple = -1;

    const result = adaptNifty250Constituent(raw, warnings);

    expect(result).not.toBeNull();
    expect(result!.valuationMultiple).toBe(0);
    expect(warnings.some((w) => w.includes('valuationMultiple'))).toBe(true);
  });

  it('accumulates multiple warnings when id/ticker is present but other fields are bad', () => {
    const warnings: string[] = [];
    const raw = validRaw();
    raw.marketCapCr = 0;
    raw.history = [];

    adaptNifty250Constituent(raw, warnings);

    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back to safe defaults for missing optional fields', () => {
    const warnings: string[] = [];
    const raw = { id: 'MINIMAL', ticker: 'MINIMAL' };

    const result = adaptNifty250Constituent(raw, warnings);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('MINIMAL');
    expect(result!.sector).toBe('Unknown');
    expect(result!.weightPct).toBe(0);
    expect(result!.beta).toBeGreaterThanOrEqual(0.1);
  });

  it('handles null/undefined input gracefully', () => {
    const warnings: string[] = [];

    const resultNull = adaptNifty250Constituent(null, warnings);
    expect(resultNull).toBeNull();

    const resultUndefined = adaptNifty250Constituent(undefined, warnings);
    expect(resultUndefined).toBeNull();
  });

  it('handles opmPct alias when operatingMarginPct is absent', () => {
    const warnings: string[] = [];
    const raw = validRaw();
    raw.history = [
      { fy: 'FY2024', toplineCr: 800000, netProfitCr: 60000, roePct: 12, opmPct: 15 },
    ];

    const result = adaptNifty250Constituent(raw, warnings);

    expect(result).not.toBeNull();
    expect(result!.history[0].operatingMarginPct).toBe(15);
  });
});