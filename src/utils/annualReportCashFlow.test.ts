import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildCashFlowTableModel,
  canonicalizeCashFlowLabel,
  formatCashFlowValue,
} from './annualReportCashFlow';

type Item = {
  type: 'item' | 'section';
  label: string;
  current?: number | null;
  section?: string | null;
};

type Statement = {
  fy: string;
  items: Item[];
  kpIs: Record<string, number | null>;
};

type YearWithMetadata = {
  cashFlow: Statement;
  metadata: Record<string, unknown>;
};

type AnnualReportData = {
  years: Record<string, YearWithMetadata>;
  metadata: {
    schemaVersion?: number;
    generatedAt?: string;
    source?: string;
    warnings?: string[];
    pdfPaths?: Record<string, string>;
  };
};

const data = JSON.parse(
  readFileSync(join(process.cwd(), 'public/data/ar/ITC.json'), 'utf8'),
) as AnnualReportData;

const years = Array.from({ length: 10 }, (_, idx) => `FY${2016 + idx}`);
const requiredKpis: string[] = [
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
  it('includes extraction metadata with provenance', () => {
    expect(data.metadata?.schemaVersion).toBeGreaterThanOrEqual(1);
    expect(data.metadata?.generatedAt).toBeTruthy();
    expect(data.metadata?.source).toBe('Annual Reports');
    expect(data.metadata?.pdfPaths?.FY2025).toContain('ITC_AR_2025.pdf');
    expect(data.years.FY2025.metadata?.cashFlowPages).toEqual([160, 161]);
  });

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

  it('normalizes label variants into stable cash-flow keys', () => {
    expect(canonicalizeCashFlowLabel('NET CASH FROM OPERATING ACTIVITIES')).toBe('Net cash from operating activities');
    expect(canonicalizeCashFlowLabel('cash and cash equivalents at the end')).toBe('Closing cash and cash equivalents');
    expect(formatCashFlowValue(-1234)).toBe('(1,234)');
  });

  it('builds a stable cash-flow table model from the extracted data', () => {
    const model = buildCashFlowTableModel(data.years as Record<string, any>, years);
    expect(model.groups.map(group => group.header)).toEqual([
      'Operating Activities',
      'Investing Activities',
      'Financing Activities',
      'Summary',
    ]);
    expect(model.groups[0].rows.some(row => row.label.toLowerCase().includes('net cash from operating activities'))).toBe(true);
  });
});
