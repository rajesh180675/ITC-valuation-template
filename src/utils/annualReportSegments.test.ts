import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type SegmentData = {
  basis: string;
  segment_time_series: Record<string, Record<string, number>>;
  warnings?: string[];
};

const data = JSON.parse(
  readFileSync(join(process.cwd(), 'public/data/segment_data_itc.json'), 'utf8'),
) as SegmentData;

const donutExcluded = (name: string) => {
  const lower = name.toLowerCase();
  return lower.includes('total') || lower.includes('elimination') || lower.includes('unallocated') || lower.includes('discontinued');
};
const donutOrder = ['FMCG - Cigarettes', 'FMCG - Others', 'Agri Business', 'Paperboards, Paper and Packaging', 'Others'];

describe('ITC annual report segment data', () => {
  it('uses standalone segment reporting with no extractor warnings', () => {
    expect(data.basis).toBe('standalone');
    expect(data.warnings ?? []).toEqual([]);
  });

  it('does not misclassify gross revenue rows into segment sections', () => {
    const keys = Object.keys(data.segment_time_series);
    expect(keys.some(k => /^revenue\|Gross Revenue/i.test(k))).toBe(false);
    expect(keys.some(k => /^assets\|Gross Revenue/i.test(k))).toBe(false);
    expect(keys.some(k => /^liabilities\|Gross Revenue/i.test(k))).toBe(false);
  });

  it('contains finite values and broad coverage for core segment rows', () => {
    for (const [key, values] of Object.entries(data.segment_time_series)) {
      for (const [fy, value] of Object.entries(values)) {
        expect(Number.isFinite(value), `${key} ${fy}`).toBe(true);
      }
    }

    for (const key of [
      'revenue|FMCG - Cigarettes',
      'revenue|FMCG - Others',
      'revenue|Agri Business',
      'revenue|Paperboards, Paper and Packaging',
      'results|FMCG - Cigarettes',
      'assets|FMCG - Cigarettes',
      'liabilities|FMCG - Cigarettes',
    ]) {
      expect(Object.keys(data.segment_time_series[key] ?? {}).length, key).toBeGreaterThanOrEqual(10);
    }
  });

  it('keeps latest-year donut candidates to operating revenue segments only', () => {
    const latestFy = 'FY2025';
    const candidates = Object.entries(data.segment_time_series)
      .filter(([key]) => key.startsWith('revenue|'))
      .map(([key, values]) => ({ name: key.split('|')[1]!, value: values[latestFy] ?? 0 }))
      .filter(d => !donutExcluded(d.name))
      .filter(d => d.value > 0)
      .sort((a, b) => donutOrder.indexOf(a.name) - donutOrder.indexOf(b.name));

    expect(candidates.map(d => d.name)).toEqual([
      'FMCG - Cigarettes',
      'FMCG - Others',
      'Agri Business',
      'Paperboards, Paper and Packaging',
      'Others',
    ]);
  });
});
