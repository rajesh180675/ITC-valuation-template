import { describe, expect, it } from 'vitest';
import { getDisplayYears } from './AnnualReportsSection';

describe('AnnualReportsSection year selection', () => {
  const years = ['FY2016', 'FY2017', 'FY2018', 'FY2019', 'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025'];

  it('defaults cash flow to the full history when no years are selected', () => {
    expect(getDisplayYears([], years, 'cashFlow')).toEqual(years);
  });

  it('keeps other tabs on the recent window when no years are selected', () => {
    expect(getDisplayYears([], years, 'pnl')).toEqual(['FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025']);
  });

  it('preserves an explicit selection across tabs', () => {
    expect(getDisplayYears(['FY2018', 'FY2020'], years, 'cashFlow')).toEqual(['FY2018', 'FY2020']);
  });
});
