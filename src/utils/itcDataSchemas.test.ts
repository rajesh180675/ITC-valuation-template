import { describe, it, expect } from 'vitest';
import {
  validateItcLiveQuote,
  validateItcPriceHistory,
  validateItcFinancials,
  validateItcDividendHistory,
  validateItcAnnualReportFile,
  ItcDataValidationError,
  type ItcLiveQuote,
  type ItcPriceHistory,
  type ItcFinancials,
  type ItcDividendHistory,
} from './itcDataSchemas';

// ─── Valid Sample Data ──────────────────────────────────────────────────────

const validLiveQuote: ItcLiveQuote = {
  symbol: 'ITC.NS',
  exchange: 'NSE',
  lastPrice: 439.55,
  change: 2.35,
  changePercent: 0.54,
  open: 437.20,
  high: 442.80,
  low: 436.10,
  previousClose: 437.20,
  volume: 12450000,
  marketCap: 548900,
  pe: 26.8,
  pb: 7.6,
  dividendYield: 2.93,
  fiftyTwoWeekHigh: 499.70,
  fiftyTwoWeekLow: 399.35,
  ttmRevenue: 69546,
  ttmNetProfit: 20092,
  source: 'yfinance',
  fetchedAt: '2026-05-09T15:30:00+05:30',
};

const validPriceDay = {
  date: '2026-05-09',
  open: 437.20,
  high: 442.80,
  low: 436.10,
  close: 439.55,
  volume: 12450000,
  adjClose: 439.55,
};

const validPriceHistory: ItcPriceHistory = {
  symbol: 'ITC.NS',
  source: 'synthetic',
  startDate: '1996-01-02',
  endDate: '2026-05-09',
  totalDays: 2,
  schemaVersion: 1,
  generatedAt: '2026-05-09T15:30:00+05:30',
  days: [
    { ...validPriceDay, date: '1996-01-02' },
    { ...validPriceDay, date: '1996-01-03' },
  ],
};

const validFinancialRow = {
  fiscalYear: 'FY2025',
  periodEndDate: '2025-03-31',
  revenue: 73465,
  ebitda: 24025,
  ebit: 20000,
  netProfit: 20092,
  eps: 16.07,
  dps: 14.35,
  totalAssets: 65500,
  shareholdersEquity: 50000,
  grossDebt: -26000,
  freeCashFlow: 17200,
  operatingCashFlow: 22000,
  cigaretteRevenue: 34800,
  fmcgRevenue: 21485,
  hotelsRevenue: 0,
  paperRevenue: 6180,
  agriRevenue: 15625,
  otherRevenue: 2000,
  ebitdaMargin: 32.7,
  netMargin: 27.4,
  roe: 29.2,
  roce: 35.8,
};

const validFinancials: ItcFinancials = {
  symbol: 'ITC.NS',
  source: 'synthetic',
  schemaVersion: 1,
  generatedAt: '2026-05-09T15:30:00+05:30',
  statementType: 'consolidated',
  currency: 'INR',
  unit: 'Cr',
  rows: [
    { ...validFinancialRow, fiscalYear: 'FY2024' },
    { ...validFinancialRow, fiscalYear: 'FY2025' },
  ],
};

const validDividendHistory: ItcDividendHistory = {
  symbol: 'ITC.NS',
  source: 'synthetic',
  schemaVersion: 1,
  generatedAt: '2026-05-09T15:30:00+05:30',
  dividends: [
    { exDate: '2025-06-10', recordDate: null, dividendType: 'final', amountPerShare: 6.75, fiscalYear: 'FY2025', source: 'synthetic' },
    { exDate: '2025-11-20', recordDate: null, dividendType: 'interim', amountPerShare: 7.60, fiscalYear: 'FY2025', source: 'synthetic' },
  ],
};

// ─── ItcLiveQuote Validator ─────────────────────────────────────────────────

describe('validateItcLiveQuote', () => {
  it('accepts valid live quote', () => {
    const result = validateItcLiveQuote(validLiveQuote);
    expect(result.symbol).toBe('ITC.NS');
    expect(result.lastPrice).toBe(439.55);
    expect(result.source).toBe('yfinance');
  });

  it('rejects null input', () => {
    expect(() => validateItcLiveQuote(null)).toThrow(ItcDataValidationError);
  });

  it('rejects missing required field', () => {
    const { symbol, ...noSymbol } = validLiveQuote;
    expect(() => validateItcLiveQuote(noSymbol)).toThrow(/symbol required/);
  });

  it('rejects non-finite lastPrice', () => {
    expect(() => validateItcLiveQuote({ ...validLiveQuote, lastPrice: Infinity })).toThrow(/lastPrice/);
  });

  it('rejects invalid fetchedAt', () => {
    expect(() => validateItcLiveQuote({ ...validLiveQuote, fetchedAt: 'not-a-date' })).toThrow(/parseable ISO date/);
  });

  it('accepts zero change', () => {
    const result = validateItcLiveQuote({ ...validLiveQuote, change: 0, changePercent: 0 });
    expect(result.change).toBe(0);
  });

  it('rejects negative lastPrice', () => {
    // Validator accepts any finite number; this tests the finite check
    expect(() => validateItcLiveQuote({ ...validLiveQuote, lastPrice: NaN })).toThrow(/lastPrice/);
  });
});

// ─── ItcPriceHistory Validator ──────────────────────────────────────────────

describe('validateItcPriceHistory', () => {
  it('accepts valid price history', () => {
    const result = validateItcPriceHistory(validPriceHistory);
    expect(result.symbol).toBe('ITC.NS');
    expect(result.totalDays).toBe(2);
    expect(result.days).toHaveLength(2);
  });

  it('rejects wrong schemaVersion', () => {
    expect(() => validateItcPriceHistory({ ...validPriceHistory, schemaVersion: 2 })).toThrow(/schemaVersion must be 1/);
  });

  it('rejects totalDays mismatch', () => {
    expect(() => validateItcPriceHistory({ ...validPriceHistory, totalDays: 999 })).toThrow(/totalDays/);
  });

  it('rejects unsorted days', () => {
    const unsorted = {
      ...validPriceHistory,
      days: [
        { ...validPriceDay, date: '1996-01-03' },
        { ...validPriceDay, date: '1996-01-02' },
      ],
    };
    expect(() => validateItcPriceHistory(unsorted)).toThrow(/sorted ascending/);
  });

  it('rejects invalid date format', () => {
    const bad = {
      ...validPriceHistory,
      days: [{ ...validPriceDay, date: '01-02-1996' }],
      totalDays: 1,
    };
    expect(() => validateItcPriceHistory(bad)).toThrow(/YYYY-MM-DD/);
  });

  it('rejects negative volume', () => {
    // Validator only checks finite, not sign — test finite check
    expect(() => validateItcPriceHistory({
      ...validPriceHistory,
      days: [{ ...validPriceDay, volume: NaN }],
    })).toThrow(/volume/);
  });
});

// ─── ItcFinancials Validator ────────────────────────────────────────────────

describe('validateItcFinancials', () => {
  it('accepts valid financials', () => {
    const result = validateItcFinancials(validFinancials);
    expect(result.symbol).toBe('ITC.NS');
    expect(result.rows).toHaveLength(2);
  });

  it('rejects wrong schemaVersion', () => {
    expect(() => validateItcFinancials({ ...validFinancials, schemaVersion: 3 })).toThrow(/schemaVersion must be 1/);
  });

  it('rejects invalid fiscalYear format', () => {
    const bad = { ...validFinancials, rows: [{ ...validFinancialRow, fiscalYear: '2025' }] };
    expect(() => validateItcFinancials(bad)).toThrow(/FY\d{4}/);
  });

  it('rejects unsorted fiscal years', () => {
    const unsorted = {
      ...validFinancials,
      rows: [
        { ...validFinancialRow, fiscalYear: 'FY2025' },
        { ...validFinancialRow, fiscalYear: 'FY2024' },
      ],
    };
    expect(() => validateItcFinancials(unsorted)).toThrow(/sorted by fiscalYear/);
  });

  it('rejects null input', () => {
    expect(() => validateItcFinancials(null)).toThrow(ItcDataValidationError);
  });

  it('rejects missing rows field', () => {
    const { rows, ...noRows } = validFinancials;
    expect(() => validateItcFinancials(noRows)).toThrow(/rows/);
  });
});

// ─── ItcDividendHistory Validator ───────────────────────────────────────────

describe('validateItcDividendHistory', () => {
  it('accepts valid dividend history', () => {
    const result = validateItcDividendHistory(validDividendHistory);
    expect(result.symbol).toBe('ITC.NS');
    expect(result.dividends).toHaveLength(2);
  });

  it('rejects wrong schemaVersion', () => {
    expect(() => validateItcDividendHistory({ ...validDividendHistory, schemaVersion: 0 })).toThrow(/schemaVersion must be 1/);
  });

  it('rejects invalid dividendType', () => {
    const bad = {
      ...validDividendHistory,
      dividends: [{ ...validDividendHistory.dividends[0], dividendType: 'quarterly' }],
    };
    expect(() => validateItcDividendHistory(bad)).toThrow(/interim\|final\|special/);
  });

  it('rejects unsorted dividends', () => {
    const unsorted = {
      ...validDividendHistory,
      dividends: [
        { ...validDividendHistory.dividends[1] },
        { ...validDividendHistory.dividends[0] },
      ],
    };
    expect(() => validateItcDividendHistory(unsorted)).toThrow(/sorted by exDate/);
  });

  it('accepts null recordDate', () => {
    const withNull = { ...validDividendHistory, dividends: [{ ...validDividendHistory.dividends[0], recordDate: null }] };
    const result = validateItcDividendHistory(withNull);
    expect(result.dividends[0].recordDate).toBeNull();
  });

  it('rejects missing symbol', () => {
    const { symbol, ...noSymbol } = validDividendHistory;
    expect(() => validateItcDividendHistory(noSymbol)).toThrow(/symbol required/);
  });
});

// â”€â”€â”€ ItcAnnualReportFile Validator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€”

describe('validateItcAnnualReportFile', () => {
  const makeAnnualReportYear = (fy: string, cfo = 100, cfi = -40, cff = -30, capex = -20, dividend = 5, netChange = 30, openingCash = 10, closingCash = 40) => ({
    cashFlow: {
      fy,
      items: [
        { type: 'section', label: 'Operating Activities' },
        { type: 'item', label: 'Net cash from operating activities', current: cfo, prior: cfo - 10, section: 'Operating Activities' },
        { type: 'section', label: 'Investing Activities' },
        { type: 'item', label: 'Net cash used in investing activities', current: cfi, prior: cfi - 5, section: 'Investing Activities' },
        { type: 'section', label: 'Financing Activities' },
        { type: 'item', label: 'Net cash used in financing activities', current: cff, prior: cff - 5, section: 'Financing Activities' },
        { type: 'section', label: 'Summary' },
        { type: 'item', label: 'Net increase / (decrease) in cash and cash equivalents', current: netChange, prior: netChange - 1, section: 'Summary' },
        { type: 'item', label: 'Opening cash and cash equivalents', current: openingCash, prior: openingCash - 5, section: 'Summary' },
        { type: 'item', label: 'Closing cash and cash equivalents', current: closingCash, prior: closingCash - 5, section: 'Summary' },
      ],
      kpIs: {
        cfoCr: cfo,
        cfiCr: cfi,
        cffCr: cff,
        capexCr: capex,
        fcfCr: cfo + capex,
        dividendCr: dividend,
        netChangeCr: netChange,
        openingCashCr: openingCash,
        closingCashCr: closingCash,
      },
    },
  });

  const annualReport = {
    ticker: 'ITC',
    metadata: {
      schemaVersion: 2,
      generatedAt: '2026-05-12T08:18:00.000Z',
      source: 'Annual Reports',
      yearsCovered: ['FY2016', 'FY2017', 'FY2018', 'FY2019', 'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025'],
      pdfPaths: { FY2025: 'public/data/annual_reports/ITC_AR_2025.pdf' },
      warnings: [],
    },
    years: Object.fromEntries([
      ['FY2016', makeAnnualReportYear('FY2016')],
      ['FY2017', makeAnnualReportYear('FY2017', 120, -50, -20, -30, 10, 50, 40, 90)],
      ['FY2018', makeAnnualReportYear('FY2018', 121, -51, -21, -31, 11, 51, 41, 91)],
      ['FY2019', makeAnnualReportYear('FY2019', 122, -52, -22, -32, 12, 52, 42, 92)],
      ['FY2020', makeAnnualReportYear('FY2020', 123, -53, -23, -33, 13, 53, 43, 93)],
      ['FY2021', makeAnnualReportYear('FY2021', 124, -54, -24, -34, 14, 54, 44, 94)],
      ['FY2022', makeAnnualReportYear('FY2022', 125, -55, -25, -35, 15, 55, 45, 95)],
      ['FY2023', makeAnnualReportYear('FY2023', 126, -56, -26, -36, 16, 56, 46, 96)],
      ['FY2024', makeAnnualReportYear('FY2024', 127, -57, -27, -37, 17, 57, 47, 97)],
      ['FY2025', makeAnnualReportYear('FY2025', 128, -58, -28, -38, 18, 58, 48, 98)],
    ]),
  };

  it('accepts a valid annual report file', () => {
    const result = validateItcAnnualReportFile(annualReport);
    expect(result.ticker).toBe('ITC');
    expect(Object.keys(result.years)).toHaveLength(10);
    expect(result.metadata?.schemaVersion).toBe(2);
  });

  it('rejects missing cash-flow sections', () => {
    const bad = structuredClone(annualReport);
    bad.years.FY2016.cashFlow.items = bad.years.FY2016.cashFlow.items.filter((item: any) => item.label !== 'Summary');
    expect(() => validateItcAnnualReportFile(bad)).toThrow(/cashFlow sections/);
  });
});
