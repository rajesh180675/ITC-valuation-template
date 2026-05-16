import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BalanceSheetSideBySide } from './BalanceSheetSideBySide';
import type { AnnualReportYearData } from '@/utils/annualReportCashFlow';

function flatYear(): AnnualReportYearData {
  return {
    fy: 'FY2026',
    profitLoss: { fy: 'FY2026', kpIs: {}, items: [] },
    cashFlow: { fy: 'FY2026', kpIs: {}, items: [] },
    balanceSheet: {
      fy: 'FY2026',
      kpIs: {},
      items: [
        { type: 'item', label: 'Equity Capital', current: 13532 },
        { type: 'item', label: 'Reserves', current: 890498 },
        { type: 'item', label: 'Borrowings+', current: 398000 },
        { type: 'item', label: 'Other Liabilities+', current: 876110 },
        { type: 'item', label: 'Total Liabilities', current: 2178140 },
        { type: 'item', label: 'Fixed Assets+', current: 1170194 },
        { type: 'item', label: 'CWIP', current: 192287 },
        { type: 'item', label: 'Investments', current: 248332 },
        { type: 'item', label: 'Other Assets+', current: 567327 },
        { type: 'item', label: 'Total Assets', current: 2178140 },
      ],
    },
    kpIs: {},
  } as AnnualReportYearData;
}

function sectionedYear(): AnnualReportYearData {
  return {
    fy: 'FY2025',
    profitLoss: { fy: 'FY2025', kpIs: {}, items: [] },
    cashFlow: { fy: 'FY2025', kpIs: {}, items: [] },
    balanceSheet: {
      fy: 'FY2025',
      kpIs: {},
      items: [
        { type: 'section', label: 'ASSETS' },
        { type: 'item', label: 'Inventories', current: 100 },
        { type: 'item', label: 'Total Assets', current: 100 },
        { type: 'section', label: 'EQUITY AND LIABILITIES' },
        { type: 'item', label: 'Equity Share Capital', current: 10 },
        { type: 'item', label: 'Total Equity and Liabilities', current: 100 },
      ],
    },
    kpIs: {},
  } as AnnualReportYearData;
}

describe('BalanceSheetSideBySide', () => {
  it('renders flat Screener-style balance sheets for non-ITC companies', () => {
    const html = renderToStaticMarkup(
      <BalanceSheetSideBySide data={{ FY2026: flatYear() }} years={['FY2026']} commonSize={false} />,
    );

    expect(html).not.toContain('No balance sheet data');
    expect(html).toContain('Assets');
    expect(html).toContain('Equity &amp; Liabilities');
    expect(html).toContain('Fixed Assets+');
    expect(html).toContain('Total Assets');
    expect(html).toContain('Equity Capital');
    expect(html).toContain('Total Liabilities');
  });

  it('continues to render sectioned ITC-style balance sheets', () => {
    const html = renderToStaticMarkup(
      <BalanceSheetSideBySide data={{ FY2025: sectionedYear() }} years={['FY2025']} commonSize={false} />,
    );

    expect(html).not.toContain('No balance sheet data');
    expect(html).toContain('Inventories');
    expect(html).toContain('Equity Share Capital');
  });
});
