import { describe, expect, it } from 'vitest';
import { COMPANY_PROFILES } from '@/data/companies';
import { buildScreenerRows } from '@/utils/ralphScreener';

describe('buildScreenerRows', () => {
  it('returns a row for every company profile', () => {
    expect(buildScreenerRows()).toHaveLength(COMPANY_PROFILES.length);
  });

  it('keeps composite scores inside 0-100', () => {
    for (const row of buildScreenerRows()) {
      expect(row.compositeScore).toBeGreaterThanOrEqual(0);
      expect(row.compositeScore).toBeLessThanOrEqual(100);
    }
  });

  it('assigns contiguous ranks', () => {
    const rows = buildScreenerRows();
    const ranks = rows.map(row => row.rank).sort((a, b) => a - b);
    expect(ranks[0]).toBe(1);
    expect(ranks.at(-1)).toBe(rows.length);
  });
});
