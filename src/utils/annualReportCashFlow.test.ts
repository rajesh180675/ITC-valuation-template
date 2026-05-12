import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Item = {
  type: 'item' | 'section';
  label: string;
  current?: number | null;
  section?: string | null;
};

type Statement = {
  items: Item[];
  kpIs: Record<string, number | null>;
};

type AnnualReportData = {
  years: Record<string, { cashFlow: Statement }>;
};

const data = JSON.parse(
  readFileSync(join(process.cwd(), 'public/data/ar/ITC.json'), 'utf8'),
) as AnnualReportData;

const years = Array.from({ length: 10 }, (_, idx) => `FY${2016 + idx}`);
const requiredKpis = [
  'cfoCr',
  'cfiCr',
  'cffCr',
  'capexCr',
  'fcfCr',
  'dividendCr',
  'netChangeCr',
  'openingCashCr',
  'closingCashCr',
];

describe('ITC annual report cash flow data', () => {
  it('has complete core cash-flow KPIs for FY2016-FY2025', () => {
    expect(Object.keys(data.years).sort()).toEqual(years);

    for (const fy of years) {
      const kpis = data.years[fy]?.cashFlow?.kpIs ?? {};
      for (const key of requiredKpis) {
        expect(kpis[key], `${fy} ${key}`).not.toBeNull();
        expect(Number.isFinite(kpis[key]), `${fy} ${key}`).toBe(true);
      }
      expect(kpis.fcfCr, `${fy} fcf`).toBeCloseTo((kpis.cfoCr ?? 0) + (kpis.capexCr ?? 0), 2);
    }
  });

  it('captures FY2025 continuation-page financing and cash reconciliation rows', () => {
    const kpis = data.years.FY2025.cashFlow.kpIs;

    expect(kpis.cfoCr).toBeCloseTo(16751.01, 2);
    expect(kpis.cffCr).toBeCloseTo(-16765.62, 2);
    expect(kpis.dividendCr).toBeCloseTo(17496.65, 2);
    expect(kpis.netChangeCr).toBeCloseTo(126.87, 2);
    expect(kpis.openingCashCr).toBeCloseTo(197.63, 2);
    expect(kpis.closingCashCr).toBeCloseTo(222.06, 2);
  });

  it('groups each cash-flow statement into the expected sections', () => {
    for (const fy of years) {
      const sections = data.years[fy].cashFlow.items
        .filter(item => item.type === 'section')
        .map(item => item.label);

      expect(sections, fy).toEqual([
        'Operating Activities',
        'Investing Activities',
        'Financing Activities',
        'Summary',
      ]);
    }
  });
});
