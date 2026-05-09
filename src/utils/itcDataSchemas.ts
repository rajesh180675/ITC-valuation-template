/**
 * Runtime validators for ITC data JSON files shipped in public/data/.
 *
 * Four schemas: ItcLiveQuote, ItcPriceHistory, ItcFinancials, ItcDividendHistory.
 * Each validator takes `unknown` and returns a typed object or throws
 * ItcDataValidationError with a path string for debugging.
 *
 * Pattern follows niftyDatasetSchema.ts.
 */

// ─── Error class ────────────────────────────────────────────────────────────

export class ItcDataValidationError extends Error {
  constructor(message: string, public readonly path: string) {
    super(`${message} at ${path}`);
    this.name = 'ItcDataValidationError';
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function assert(cond: unknown, msg: string, path: string): asserts cond {
  if (!cond) throw new ItcDataValidationError(msg, path);
}

function assertString(v: unknown, msg: string, path: string): string {
  assert(typeof v === 'string' && v.length > 0, msg, path);
  return v;
}

function assertFiniteNumber(v: unknown, msg: string, path: string): number {
  assert(isFiniteNumber(v), msg, path);
  return v;
}

function assertDateString(v: unknown, path: string): string {
  assert(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v), 'must match YYYY-MM-DD', path);
  return v;
}

function assertIsoString(v: unknown, path: string): string {
  assert(typeof v === 'string' && !Number.isNaN(Date.parse(v)), 'must be a parseable ISO date', path);
  return v;
}

// ─── ItcLiveQuote ──────────────────────────────────────────────────────────

export interface ItcLiveQuote {
  symbol: string;
  exchange: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  marketCap: number;
  pe: number;
  pb: number;
  dividendYield: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  ttmRevenue: number;
  ttmNetProfit: number;
  source: string;
  fetchedAt: string;
}

export function validateItcLiveQuote(input: unknown): ItcLiveQuote {
  assert(input && typeof input === 'object', 'must be an object', '$');
  const d = input as Record<string, unknown>;

  return {
    symbol: assertString(d.symbol, 'symbol required', '$.symbol'),
    exchange: assertString(d.exchange, 'exchange required', '$.exchange'),
    lastPrice: assertFiniteNumber(d.lastPrice, 'lastPrice must be finite', '$.lastPrice'),
    change: assertFiniteNumber(d.change, 'change must be finite', '$.change'),
    changePercent: assertFiniteNumber(d.changePercent, 'changePercent must be finite', '$.changePercent'),
    open: assertFiniteNumber(d.open, 'open must be finite', '$.open'),
    high: assertFiniteNumber(d.high, 'high must be finite', '$.high'),
    low: assertFiniteNumber(d.low, 'low must be finite', '$.low'),
    previousClose: assertFiniteNumber(d.previousClose, 'previousClose must be finite', '$.previousClose'),
    volume: assertFiniteNumber(d.volume, 'volume must be finite', '$.volume'),
    marketCap: assertFiniteNumber(d.marketCap, 'marketCap must be finite', '$.marketCap'),
    pe: assertFiniteNumber(d.pe, 'pe must be finite', '$.pe'),
    pb: assertFiniteNumber(d.pb, 'pb must be finite', '$.pb'),
    dividendYield: assertFiniteNumber(d.dividendYield, 'dividendYield must be finite', '$.dividendYield'),
    fiftyTwoWeekHigh: assertFiniteNumber(d.fiftyTwoWeekHigh, 'fiftyTwoWeekHigh must be finite', '$.fiftyTwoWeekHigh'),
    fiftyTwoWeekLow: assertFiniteNumber(d.fiftyTwoWeekLow, 'fiftyTwoWeekLow must be finite', '$.fiftyTwoWeekLow'),
    ttmRevenue: assertFiniteNumber(d.ttmRevenue, 'ttmRevenue must be finite', '$.ttmRevenue'),
    ttmNetProfit: assertFiniteNumber(d.ttmNetProfit, 'ttmNetProfit must be finite', '$.ttmNetProfit'),
    source: assertString(d.source, 'source required', '$.source'),
    fetchedAt: assertIsoString(d.fetchedAt, '$.fetchedAt'),
  };
}

// ─── ItcPriceHistory ────────────────────────────────────────────────────────

export interface ItcPriceDay {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export interface ItcPriceHistory {
  symbol: string;
  source: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  schemaVersion: number;
  generatedAt: string;
  days: ItcPriceDay[];
}

function validatePriceDay(day: unknown, path: string): ItcPriceDay {
  assert(day && typeof day === 'object', 'expected object', path);
  const r = day as Record<string, unknown>;
  return {
    date: assertDateString(r.date, `${path}.date`),
    open: assertFiniteNumber(r.open, 'open must be finite', `${path}.open`),
    high: assertFiniteNumber(r.high, 'high must be finite', `${path}.high`),
    low: assertFiniteNumber(r.low, 'low must be finite', `${path}.low`),
    close: assertFiniteNumber(r.close, 'close must be finite', `${path}.close`),
    volume: assertFiniteNumber(r.volume, 'volume must be finite', `${path}.volume`),
    adjClose: assertFiniteNumber(r.adjClose, 'adjClose must be finite', `${path}.adjClose`),
  };
}

export function validateItcPriceHistory(input: unknown): ItcPriceHistory {
  assert(input && typeof input === 'object', 'must be an object', '$');
  const d = input as Record<string, unknown>;

  const symbol = assertString(d.symbol, 'symbol required', '$.symbol');
  const source = assertString(d.source, 'source required', '$.source');
  const startDate = assertDateString(d.startDate, '$.startDate');
  const endDate = assertDateString(d.endDate, '$.endDate');
  const totalDays = assertFiniteNumber(d.totalDays, 'totalDays must be finite', '$.totalDays');
  const schemaVersion = assertFiniteNumber(d.schemaVersion, 'schemaVersion must be finite', '$.schemaVersion');
  assert(schemaVersion === 1, 'schemaVersion must be 1', '$.schemaVersion');
  const generatedAt = assertIsoString(d.generatedAt, '$.generatedAt');

  assert(Array.isArray(d.days), 'days must be an array', '$.days');
  const days = (d.days as unknown[]).map((day, i) => validatePriceDay(day, `$.days[${i}]`));

  assert(days.length === totalDays, `totalDays (${totalDays}) must match days.length (${days.length})`, '$.totalDays');

  // Verify ascending date order
  for (let i = 1; i < days.length; i++) {
    assert(days[i].date >= days[i - 1].date, `days must be sorted ascending; ${days[i].date} < ${days[i - 1].date}`, `$.days[${i}].date`);
  }

  return { symbol, source, startDate, endDate, totalDays, schemaVersion, generatedAt, days };
}

// ─── ItcFinancials ──────────────────────────────────────────────────────────

export interface ItcFinancialRow {
  fiscalYear: string;
  periodEndDate: string;
  revenue: number;
  ebitda: number;
  ebit: number;
  netProfit: number;
  eps: number;
  dps: number;
  totalAssets: number;
  shareholdersEquity: number;
  grossDebt: number;
  freeCashFlow: number;
  operatingCashFlow: number;
  cigaretteRevenue: number;
  fmcgRevenue: number;
  hotelsRevenue: number;
  paperRevenue: number;
  agriRevenue: number;
  otherRevenue: number;
  ebitdaMargin: number;
  netMargin: number;
  roe: number;
  roce: number;
}

export interface ItcFinancials {
  symbol: string;
  source: string;
  schemaVersion: number;
  generatedAt: string;
  statementType: string;
  currency: string;
  unit: string;
  rows: ItcFinancialRow[];
}

function validateFinancialRow(row: unknown, path: string): ItcFinancialRow {
  assert(row && typeof row === 'object', 'expected object', path);
  const r = row as Record<string, unknown>;

  const fiscalYear = assertString(r.fiscalYear, 'fiscalYear required', `${path}.fiscalYear`);
  assert(/^FY\d{4}$/.test(fiscalYear), 'fiscalYear must match FY2025 format', `${path}.fiscalYear`);

  return {
    fiscalYear,
    periodEndDate: assertDateString(r.periodEndDate, `${path}.periodEndDate`),
    revenue: assertFiniteNumber(r.revenue, 'revenue must be finite', `${path}.revenue`),
    ebitda: assertFiniteNumber(r.ebitda, 'ebitda must be finite', `${path}.ebitda`),
    ebit: assertFiniteNumber(r.ebit, 'ebit must be finite', `${path}.ebit`),
    netProfit: assertFiniteNumber(r.netProfit, 'netProfit must be finite', `${path}.netProfit`),
    eps: assertFiniteNumber(r.eps, 'eps must be finite', `${path}.eps`),
    dps: assertFiniteNumber(r.dps, 'dps must be finite', `${path}.dps`),
    totalAssets: assertFiniteNumber(r.totalAssets, 'totalAssets must be finite', `${path}.totalAssets`),
    shareholdersEquity: assertFiniteNumber(r.shareholdersEquity, 'shareholdersEquity must be finite', `${path}.shareholdersEquity`),
    grossDebt: assertFiniteNumber(r.grossDebt, 'grossDebt must be finite', `${path}.grossDebt`),
    freeCashFlow: assertFiniteNumber(r.freeCashFlow, 'freeCashFlow must be finite', `${path}.freeCashFlow`),
    operatingCashFlow: assertFiniteNumber(r.operatingCashFlow, 'operatingCashFlow must be finite', `${path}.operatingCashFlow`),
    cigaretteRevenue: assertFiniteNumber(r.cigaretteRevenue, 'cigaretteRevenue must be finite', `${path}.cigaretteRevenue`),
    fmcgRevenue: assertFiniteNumber(r.fmcgRevenue, 'fmcgRevenue must be finite', `${path}.fmcgRevenue`),
    hotelsRevenue: assertFiniteNumber(r.hotelsRevenue, 'hotelsRevenue must be finite', `${path}.hotelsRevenue`),
    paperRevenue: assertFiniteNumber(r.paperRevenue, 'paperRevenue must be finite', `${path}.paperRevenue`),
    agriRevenue: assertFiniteNumber(r.agriRevenue, 'agriRevenue must be finite', `${path}.agriRevenue`),
    otherRevenue: assertFiniteNumber(r.otherRevenue, 'otherRevenue must be finite', `${path}.otherRevenue`),
    ebitdaMargin: assertFiniteNumber(r.ebitdaMargin, 'ebitdaMargin must be finite', `${path}.ebitdaMargin`),
    netMargin: assertFiniteNumber(r.netMargin, 'netMargin must be finite', `${path}.netMargin`),
    roe: assertFiniteNumber(r.roe, 'roe must be finite', `${path}.roe`),
    roce: assertFiniteNumber(r.roce, 'roce must be finite', `${path}.roce`),
  };
}

export function validateItcFinancials(input: unknown): ItcFinancials {
  assert(input && typeof input === 'object', 'must be an object', '$');
  const d = input as Record<string, unknown>;

  const symbol = assertString(d.symbol, 'symbol required', '$.symbol');
  const source = assertString(d.source, 'source required', '$.source');
  const schemaVersion = assertFiniteNumber(d.schemaVersion, 'schemaVersion must be finite', '$.schemaVersion');
  assert(schemaVersion === 1, 'schemaVersion must be 1', '$.schemaVersion');
  const generatedAt = assertIsoString(d.generatedAt, '$.generatedAt');
  const statementType = assertString(d.statementType, 'statementType required', '$.statementType');
  const currency = assertString(d.currency, 'currency required', '$.currency');
  const unit = assertString(d.unit, 'unit required', '$.unit');

  assert(Array.isArray(d.rows), 'rows must be an array', '$.rows');
  const rows = (d.rows as unknown[]).map((row, i) => validateFinancialRow(row, `$.rows[${i}]`));

  // Verify ascending fiscal year order
  for (let i = 1; i < rows.length; i++) {
    assert(rows[i].fiscalYear > rows[i - 1].fiscalYear, `rows must be sorted by fiscalYear; ${rows[i].fiscalYear} <= ${rows[i - 1].fiscalYear}`, `$.rows[${i}].fiscalYear`);
  }

  return { symbol, source, schemaVersion, generatedAt, statementType, currency, unit, rows };
}

// ─── ItcDividendHistory ─────────────────────────────────────────────────────

export interface ItcDividendRow {
  exDate: string;
  recordDate: string | null;
  dividendType: 'interim' | 'final' | 'special';
  amountPerShare: number;
  fiscalYear: string;
  source: string;
}

export interface ItcDividendHistory {
  symbol: string;
  source: string;
  schemaVersion: number;
  generatedAt: string;
  dividends: ItcDividendRow[];
}

function validateDividendRow(row: unknown, path: string): ItcDividendRow {
  assert(row && typeof row === 'object', 'expected object', path);
  const r = row as Record<string, unknown>;

  const fiscalYear = assertString(r.fiscalYear, 'fiscalYear required', `${path}.fiscalYear`);
  assert(/^FY\d{4}$/.test(fiscalYear), 'fiscalYear must match FY2025 format', `${path}.fiscalYear`);

  const dividendType = r.dividendType as string;
  assert(dividendType === 'interim' || dividendType === 'final' || dividendType === 'special', 'dividendType must be interim|final|special', `${path}.dividendType`);

  const recordDate = r.recordDate === null ? null : (typeof r.recordDate === 'string' ? r.recordDate : null);

  return {
    exDate: assertDateString(r.exDate, `${path}.exDate`),
    recordDate,
    dividendType: dividendType as 'interim' | 'final' | 'special',
    amountPerShare: assertFiniteNumber(r.amountPerShare, 'amountPerShare must be finite', `${path}.amountPerShare`),
    fiscalYear,
    source: assertString(r.source, 'source required', `${path}.source`),
  };
}

export function validateItcDividendHistory(input: unknown): ItcDividendHistory {
  assert(input && typeof input === 'object', 'must be an object', '$');
  const d = input as Record<string, unknown>;

  const symbol = assertString(d.symbol, 'symbol required', '$.symbol');
  const source = assertString(d.source, 'source required', '$.source');
  const schemaVersion = assertFiniteNumber(d.schemaVersion, 'schemaVersion must be finite', '$.schemaVersion');
  assert(schemaVersion === 1, 'schemaVersion must be 1', '$.schemaVersion');
  const generatedAt = assertIsoString(d.generatedAt, '$.generatedAt');

  assert(Array.isArray(d.dividends), 'dividends must be an array', '$.dividends');
  const dividends = (d.dividends as unknown[]).map((row, i) => validateDividendRow(row, `$.dividends[${i}]`));

  // Verify ascending exDate order
  for (let i = 1; i < dividends.length; i++) {
    assert(dividends[i].exDate >= dividends[i - 1].exDate, `dividends must be sorted by exDate; ${dividends[i].exDate} < ${dividends[i - 1].exDate}`, `$.dividends[${i}].exDate`);
  }

  return { symbol, source, schemaVersion, generatedAt, dividends };
}