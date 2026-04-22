/**
 * Runtime validator for the Nifty 750 × 10Y dataset shipped at
 * public/data/nifty_750_10y.json.
 *
 * We deliberately avoid a runtime schema library (zod/valibot) to keep the
 * bundle lean — the schema is small and stable. If the shape ever grows, swap
 * this out for zod without touching call sites.
 */

export type ReportingType = 'nonFinancial' | 'financial';
export type DataSource = 'synthetic' | 'real' | 'hybrid';

export interface FinancialYearRow {
  fiscalYear: string;
  revenueCr: number;
  netProfitCr: number;
  roePct: number;
  /** Present for non-financial companies. Banks/NBFCs/insurers use `pb` instead. */
  pe?: number;
  /** Present for financial-sector companies (reportingType === 'financial'). */
  pb?: number;
  /** Not meaningful for banks/NBFCs (capital adequacy applies there). */
  debtToEquity?: number;
}

export interface NiftyCompany {
  symbol: string;
  name: string;
  sector: string;
  reportingType: ReportingType;
  source?: DataSource;
  financials: FinancialYearRow[];
}

export interface NiftyBatch {
  indexName: string;
  indexSlug: string;
  companies: NiftyCompany[];
}

export interface NiftyDataset {
  generatedAt: string;
  source: DataSource;
  sourceNote?: string;
  schemaVersion: number;
  fiscalYears: string[];
  batches: NiftyBatch[];
}

export class NiftyDatasetValidationError extends Error {
  constructor(message: string, public readonly path: string) {
    super(`${message} at ${path}`);
    this.name = 'NiftyDatasetValidationError';
  }
}

const REQUIRED_BATCHES = ['niftylargemidcap250', 'niftysmallcap250', 'niftymicrocap250'] as const;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function assert(cond: unknown, msg: string, path: string): asserts cond {
  if (!cond) throw new NiftyDatasetValidationError(msg, path);
}

function validateRow(row: unknown, path: string): FinancialYearRow {
  assert(row && typeof row === 'object', 'expected object', path);
  const r = row as Record<string, unknown>;
  assert(typeof r.fiscalYear === 'string' && /^FY\d{4}$/.test(r.fiscalYear), 'fiscalYear must match FYYYYY', path);
  assert(isFiniteNumber(r.revenueCr) && r.revenueCr >= 0, 'revenueCr must be a non-negative finite number', path);
  assert(isFiniteNumber(r.netProfitCr), 'netProfitCr must be a finite number', path);
  assert(isFiniteNumber(r.roePct), 'roePct must be a finite number', path);

  // Valuation: non-financials report pe, financials report pb. At least one is required.
  const hasPe = r.pe !== undefined;
  const hasPb = r.pb !== undefined;
  assert(hasPe || hasPb, 'row must have either pe or pb', path);
  if (hasPe) assert(isFiniteNumber(r.pe) && (r.pe as number) > 0, 'pe must be a positive finite number', path);
  if (hasPb) assert(isFiniteNumber(r.pb) && (r.pb as number) > 0, 'pb must be a positive finite number', path);

  if (r.debtToEquity !== undefined) {
    assert(isFiniteNumber(r.debtToEquity) && (r.debtToEquity as number) >= 0, 'debtToEquity must be non-negative', path);
  }

  return {
    fiscalYear: r.fiscalYear,
    revenueCr: r.revenueCr,
    netProfitCr: r.netProfitCr,
    roePct: r.roePct,
    pe: hasPe ? (r.pe as number) : undefined,
    pb: hasPb ? (r.pb as number) : undefined,
    debtToEquity: r.debtToEquity === undefined ? undefined : (r.debtToEquity as number),
  };
}

function validateCompany(c: unknown, path: string, fiscalYears: string[]): NiftyCompany {
  assert(c && typeof c === 'object', 'expected object', path);
  const company = c as Record<string, unknown>;
  assert(typeof company.symbol === 'string' && company.symbol.length > 0, 'symbol required', path);
  assert(typeof company.name === 'string' && company.name.length > 0, 'name required', path);
  assert(typeof company.sector === 'string' && company.sector.length > 0, 'sector required', path);
  assert(company.reportingType === 'nonFinancial' || company.reportingType === 'financial', 'reportingType invalid', path);
  assert(Array.isArray(company.financials), 'financials must be an array', path);
  assert(company.financials.length === fiscalYears.length, `expected ${fiscalYears.length} rows`, path);

  const rows = company.financials.map((row, i) => {
    const parsed = validateRow(row, `${path}.financials[${i}]`);
    assert(parsed.fiscalYear === fiscalYears[i], `fiscalYear mismatch (expected ${fiscalYears[i]})`, `${path}.financials[${i}]`);
    return parsed;
  });

  return {
    symbol: company.symbol,
    name: company.name,
    sector: company.sector,
    reportingType: company.reportingType as ReportingType,
    source: company.source as DataSource | undefined,
    financials: rows,
  };
}

export function validateNiftyDataset(input: unknown): NiftyDataset {
  assert(input && typeof input === 'object', 'dataset must be an object', '$');
  const d = input as Record<string, unknown>;

  assert(typeof d.generatedAt === 'string', 'generatedAt required', '$.generatedAt');
  assert(d.source === 'synthetic' || d.source === 'real' || d.source === 'hybrid', 'source must be synthetic|real|hybrid', '$.source');
  assert(typeof d.schemaVersion === 'number', 'schemaVersion required', '$.schemaVersion');
  assert(Array.isArray(d.fiscalYears) && d.fiscalYears.length > 0, 'fiscalYears required', '$.fiscalYears');
  (d.fiscalYears as unknown[]).forEach((y, i) => assert(typeof y === 'string' && /^FY\d{4}$/.test(y), 'invalid FY', `$.fiscalYears[${i}]`));
  assert(Array.isArray(d.batches), 'batches required', '$.batches');

  const batches = (d.batches as unknown[]).map((b, i) => {
    const path = `$.batches[${i}]`;
    assert(b && typeof b === 'object', 'batch must be an object', path);
    const batch = b as Record<string, unknown>;
    assert(typeof batch.indexName === 'string', 'indexName required', `${path}.indexName`);
    assert(typeof batch.indexSlug === 'string', 'indexSlug required', `${path}.indexSlug`);
    assert(Array.isArray(batch.companies), 'companies required', `${path}.companies`);

    const companies = (batch.companies as unknown[]).map((c, j) =>
      validateCompany(c, `${path}.companies[${j}]`, d.fiscalYears as string[]),
    );
    return {
      indexName: batch.indexName,
      indexSlug: batch.indexSlug,
      companies,
    } as NiftyBatch;
  });

  // Structural guarantee: all three canonical Nifty cohorts must be present.
  const slugs = new Set(batches.map(b => b.indexSlug));
  for (const required of REQUIRED_BATCHES) {
    assert(slugs.has(required), `missing required batch ${required}`, '$.batches');
  }

  return {
    generatedAt: d.generatedAt,
    source: d.source as DataSource,
    sourceNote: typeof d.sourceNote === 'string' ? d.sourceNote : undefined,
    schemaVersion: d.schemaVersion,
    fiscalYears: d.fiscalYears as string[],
    batches,
  };
}
