/**
 * Runtime validator for the Nifty 750 dataset shipped at
 * public/data/nifty_750_10y.json.
 *
 * Schema v1 is the legacy deterministic synthetic 10Y feed. Schema v2 is the
 * official-source contract: provenance-aware, partial-history capable, and
 * nullable where an official value is not available.
 */

export type ReportingType = 'nonFinancial' | 'financial';
export type DataSource = 'synthetic' | 'real' | 'hybrid';
export type SourcePolicy = 'official-only';
export type StatementType = 'consolidated' | 'standalone';
export type ListingExchange = 'NSE' | 'BSE' | 'NSE+BSE';

export interface NiftySourceRef {
  sourceName: string;
  sourceType?: string;
  url?: string;
  documentId?: string;
  asOfDate?: string;
  downloadedAt?: string;
  checksum?: string;
  licenseBasis?: string;
  extractionMethod?: string;
  notes?: string;
}

export interface FinancialYearSources {
  financial?: NiftySourceRef;
  marketData?: NiftySourceRef;
  computed?: NiftySourceRef;
}

export interface NiftyDatasetProvenance {
  universe?: NiftySourceRef;
  financials?: NiftySourceRef[];
  marketData?: NiftySourceRef[];
  notes?: string;
}

export interface FinancialYearRow {
  fiscalYear: string;
  revenueCr: number | null;
  netProfitCr: number | null;
  roePct: number | null;
  /** Present when earnings-based valuation is meaningful and officially computable. */
  pe?: number | null;
  /** Present when book-value valuation is meaningful and officially computable. */
  pb?: number | null;
  /** Not meaningful for banks/NBFCs (capital adequacy applies there). */
  debtToEquity?: number | null;
  periodEndDate?: string;
  statementType?: StatementType;
  shareholdersEquityCr?: number | null;
  totalDebtCr?: number | null;
  marketCapCr?: number | null;
  marketDataAsOfDate?: string;
  sources?: FinancialYearSources;
  qualityFlags?: string[];
}

export interface NiftyCompany {
  symbol: string;
  name: string;
  sector: string;
  reportingType: ReportingType;
  source?: DataSource;
  isin?: string;
  industry?: string;
  listingExchange?: ListingExchange;
  officialProfileSource?: NiftySourceRef;
  qualityFlags?: string[];
  financials: FinancialYearRow[];
}

export interface NiftyBatch {
  indexName: string;
  indexSlug: string;
  asOfDate?: string;
  constituentCount?: number;
  constituentSource?: NiftySourceRef;
  companies: NiftyCompany[];
}

export interface NiftyDataset {
  generatedAt: string;
  source: DataSource;
  sourceNote?: string;
  sourcePolicy?: SourcePolicy;
  schemaVersion: number;
  asOfDate?: string;
  fiscalYears: string[];
  provenance?: NiftyDatasetProvenance;
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

function isNullableFiniteNumber(v: unknown): v is number | null | undefined {
  return v === null || v === undefined || isFiniteNumber(v);
}

function assert(cond: unknown, msg: string, path: string): asserts cond {
  if (!cond) throw new NiftyDatasetValidationError(msg, path);
}

function validateFiscalYear(value: unknown, path: string): string {
  assert(typeof value === 'string' && /^FY\d{4}$/.test(value), 'fiscalYear must match FY2026 format', path);
  return value;
}

function validateDateString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'date must match YYYY-MM-DD format', path);
  return value;
}

function validateQualityFlags(value: unknown, path: string): string[] | undefined {
  if (value === undefined) return undefined;
  assert(Array.isArray(value), 'qualityFlags must be an array', path);
  value.forEach((flag, i) => assert(typeof flag === 'string' && flag.length > 0, 'quality flag must be a non-empty string', `${path}[${i}]`));
  return value as string[];
}

function validateSourceRef(value: unknown, path: string, required: boolean): NiftySourceRef | undefined {
  if (value === undefined) {
    assert(!required, 'source reference required', path);
    return undefined;
  }
  assert(value && typeof value === 'object', 'source reference must be an object', path);
  const ref = value as Record<string, unknown>;
  assert(typeof ref.sourceName === 'string' && ref.sourceName.length > 0, 'sourceName required', `${path}.sourceName`);

  const optionalStrings = ['sourceType', 'url', 'documentId', 'asOfDate', 'downloadedAt', 'checksum', 'licenseBasis', 'extractionMethod', 'notes'] as const;
  for (const key of optionalStrings) {
    if (ref[key] !== undefined) assert(typeof ref[key] === 'string', `${key} must be a string`, `${path}.${key}`);
  }

  return {
    sourceName: ref.sourceName,
    sourceType: ref.sourceType as string | undefined,
    url: ref.url as string | undefined,
    documentId: ref.documentId as string | undefined,
    asOfDate: ref.asOfDate as string | undefined,
    downloadedAt: ref.downloadedAt as string | undefined,
    checksum: ref.checksum as string | undefined,
    licenseBasis: ref.licenseBasis as string | undefined,
    extractionMethod: ref.extractionMethod as string | undefined,
    notes: ref.notes as string | undefined,
  };
}

function validateSources(value: unknown, path: string, schemaVersion: number, hasMarketMetric: boolean): FinancialYearSources | undefined {
  if (value === undefined) {
    assert(schemaVersion < 2, 'sources required for schema v2 rows', path);
    return undefined;
  }
  assert(value && typeof value === 'object', 'sources must be an object', path);
  const sources = value as Record<string, unknown>;
  return {
    financial: validateSourceRef(sources.financial, `${path}.financial`, schemaVersion >= 2),
    marketData: validateSourceRef(sources.marketData, `${path}.marketData`, schemaVersion >= 2 && hasMarketMetric),
    computed: validateSourceRef(sources.computed, `${path}.computed`, false),
  };
}

function validateRow(row: unknown, path: string, schemaVersion: number): FinancialYearRow {
  assert(row && typeof row === 'object', 'expected object', path);
  const r = row as Record<string, unknown>;
  const fiscalYear = validateFiscalYear(r.fiscalYear, `${path}.fiscalYear`);

  if (schemaVersion >= 2) {
    assert(isNullableFiniteNumber(r.revenueCr), 'revenueCr must be finite or null', `${path}.revenueCr`);
    assert(isNullableFiniteNumber(r.netProfitCr), 'netProfitCr must be finite or null', `${path}.netProfitCr`);
    assert(isNullableFiniteNumber(r.roePct), 'roePct must be finite or null', `${path}.roePct`);
    if (isFiniteNumber(r.revenueCr)) assert(r.revenueCr >= 0, 'revenueCr must be non-negative', `${path}.revenueCr`);
  } else {
    assert(isFiniteNumber(r.revenueCr) && r.revenueCr >= 0, 'revenueCr must be a non-negative finite number', `${path}.revenueCr`);
    assert(isFiniteNumber(r.netProfitCr), 'netProfitCr must be a finite number', `${path}.netProfitCr`);
    assert(isFiniteNumber(r.roePct), 'roePct must be a finite number', `${path}.roePct`);
  }

  const hasPe = r.pe !== undefined;
  const hasPb = r.pb !== undefined;
  if (schemaVersion >= 2) {
    if (hasPe) assert(r.pe === null || (isFiniteNumber(r.pe) && r.pe > 0), 'pe must be positive, null, or omitted', `${path}.pe`);
    if (hasPb) assert(r.pb === null || (isFiniteNumber(r.pb) && r.pb > 0), 'pb must be positive, null, or omitted', `${path}.pb`);
  } else {
    assert(hasPe || hasPb, 'row must have either pe or pb', path);
    if (hasPe) assert(isFiniteNumber(r.pe) && r.pe > 0, 'pe must be a positive finite number', `${path}.pe`);
    if (hasPb) assert(isFiniteNumber(r.pb) && r.pb > 0, 'pb must be a positive finite number', `${path}.pb`);
  }

  if (r.debtToEquity !== undefined) {
    if (schemaVersion >= 2) assert(r.debtToEquity === null || (isFiniteNumber(r.debtToEquity) && r.debtToEquity >= 0), 'debtToEquity must be non-negative or null', `${path}.debtToEquity`);
    else assert(isFiniteNumber(r.debtToEquity) && r.debtToEquity >= 0, 'debtToEquity must be non-negative', `${path}.debtToEquity`);
  }

  if (r.shareholdersEquityCr !== undefined) assert(isNullableFiniteNumber(r.shareholdersEquityCr), 'shareholdersEquityCr must be finite or null', `${path}.shareholdersEquityCr`);
  if (r.totalDebtCr !== undefined) assert(isNullableFiniteNumber(r.totalDebtCr), 'totalDebtCr must be finite or null', `${path}.totalDebtCr`);
  if (r.marketCapCr !== undefined) assert(isNullableFiniteNumber(r.marketCapCr), 'marketCapCr must be finite or null', `${path}.marketCapCr`);
  if (r.statementType !== undefined) assert(r.statementType === 'consolidated' || r.statementType === 'standalone', 'statementType invalid', `${path}.statementType`);

  const peValue = hasPe ? (r.pe as number | null) : undefined;
  const pbValue = hasPb ? (r.pb as number | null) : undefined;
  const hasMarketMetric = isFiniteNumber(peValue) || isFiniteNumber(pbValue) || isFiniteNumber(r.marketCapCr);

  return {
    fiscalYear,
    revenueCr: r.revenueCr as number | null,
    netProfitCr: r.netProfitCr as number | null,
    roePct: r.roePct as number | null,
    pe: peValue,
    pb: pbValue,
    debtToEquity: r.debtToEquity === undefined ? undefined : (r.debtToEquity as number | null),
    periodEndDate: validateDateString(r.periodEndDate, `${path}.periodEndDate`),
    statementType: r.statementType as StatementType | undefined,
    shareholdersEquityCr: r.shareholdersEquityCr as number | null | undefined,
    totalDebtCr: r.totalDebtCr as number | null | undefined,
    marketCapCr: r.marketCapCr as number | null | undefined,
    marketDataAsOfDate: validateDateString(r.marketDataAsOfDate, `${path}.marketDataAsOfDate`),
    sources: validateSources(r.sources, `${path}.sources`, schemaVersion, hasMarketMetric),
    qualityFlags: validateQualityFlags(r.qualityFlags, `${path}.qualityFlags`),
  };
}

function validateCompany(c: unknown, path: string, fiscalYears: string[], schemaVersion: number): NiftyCompany {
  assert(c && typeof c === 'object', 'expected object', path);
  const company = c as Record<string, unknown>;
  assert(typeof company.symbol === 'string' && company.symbol.length > 0, 'symbol required', `${path}.symbol`);
  assert(typeof company.name === 'string' && company.name.length > 0, 'name required', `${path}.name`);
  assert(typeof company.sector === 'string' && company.sector.length > 0, 'sector required', `${path}.sector`);
  assert(company.reportingType === 'nonFinancial' || company.reportingType === 'financial', 'reportingType invalid', `${path}.reportingType`);
  assert(Array.isArray(company.financials), 'financials must be an array', `${path}.financials`);
  if (schemaVersion < 2) assert(company.financials.length === fiscalYears.length, `expected ${fiscalYears.length} rows`, `${path}.financials`);
  else assert(company.financials.length <= fiscalYears.length, 'financials cannot exceed fiscalYears length', `${path}.financials`);

  if (company.source !== undefined) assert(company.source === 'synthetic' || company.source === 'real' || company.source === 'hybrid', 'source invalid', `${path}.source`);
  if (company.isin !== undefined) assert(typeof company.isin === 'string' && company.isin.length > 0, 'isin must be a non-empty string', `${path}.isin`);
  if (company.industry !== undefined) assert(typeof company.industry === 'string', 'industry must be a string', `${path}.industry`);
  if (company.listingExchange !== undefined) assert(company.listingExchange === 'NSE' || company.listingExchange === 'BSE' || company.listingExchange === 'NSE+BSE', 'listingExchange invalid', `${path}.listingExchange`);

  const seenYears = new Set<string>();
  const rows = company.financials.map((row, i) => {
    const parsed = validateRow(row, `${path}.financials[${i}]`, schemaVersion);
    assert(fiscalYears.includes(parsed.fiscalYear), `fiscalYear ${parsed.fiscalYear} is not declared`, `${path}.financials[${i}]`);
    assert(!seenYears.has(parsed.fiscalYear), `duplicate fiscalYear ${parsed.fiscalYear}`, `${path}.financials[${i}]`);
    seenYears.add(parsed.fiscalYear);
    if (schemaVersion < 2) assert(parsed.fiscalYear === fiscalYears[i], `fiscalYear mismatch (expected ${fiscalYears[i]})`, `${path}.financials[${i}]`);
    return parsed;
  });

  return {
    symbol: company.symbol,
    name: company.name,
    sector: company.sector,
    reportingType: company.reportingType as ReportingType,
    source: company.source as DataSource | undefined,
    isin: company.isin as string | undefined,
    industry: company.industry as string | undefined,
    listingExchange: company.listingExchange as ListingExchange | undefined,
    officialProfileSource: validateSourceRef(company.officialProfileSource, `${path}.officialProfileSource`, schemaVersion >= 2),
    qualityFlags: validateQualityFlags(company.qualityFlags, `${path}.qualityFlags`),
    financials: rows,
  };
}

function validateProvenance(value: unknown, path: string, schemaVersion: number): NiftyDatasetProvenance | undefined {
  if (value === undefined) {
    assert(schemaVersion < 2, 'provenance required for schema v2', path);
    return undefined;
  }
  assert(value && typeof value === 'object', 'provenance must be an object', path);
  const provenance = value as Record<string, unknown>;
  const financials = provenance.financials === undefined ? undefined : provenance.financials;
  const marketData = provenance.marketData === undefined ? undefined : provenance.marketData;
  if (financials !== undefined) assert(Array.isArray(financials), 'financials provenance must be an array', `${path}.financials`);
  if (marketData !== undefined) assert(Array.isArray(marketData), 'marketData provenance must be an array', `${path}.marketData`);
  if (provenance.notes !== undefined) assert(typeof provenance.notes === 'string', 'notes must be a string', `${path}.notes`);

  return {
    universe: validateSourceRef(provenance.universe, `${path}.universe`, schemaVersion >= 2),
    financials: Array.isArray(financials) ? financials.map((ref, i) => validateSourceRef(ref, `${path}.financials[${i}]`, true)!) : undefined,
    marketData: Array.isArray(marketData) ? marketData.map((ref, i) => validateSourceRef(ref, `${path}.marketData[${i}]`, true)!) : undefined,
    notes: provenance.notes as string | undefined,
  };
}

function validateFiscalYears(value: unknown): string[] {
  assert(Array.isArray(value) && value.length > 0, 'fiscalYears required', '$.fiscalYears');
  const years = value.map((y, i) => validateFiscalYear(y, `$.fiscalYears[${i}]`));
  const seen = new Set<string>();
  for (const year of years) {
    assert(!seen.has(year), `duplicate fiscalYear ${year}`, '$.fiscalYears');
    seen.add(year);
  }
  const sorted = [...years].sort();
  assert(years.every((year, i) => year === sorted[i]), 'fiscalYears must be sorted ascending', '$.fiscalYears');
  return years;
}

export function validateNiftyDataset(input: unknown): NiftyDataset {
  assert(input && typeof input === 'object', 'dataset must be an object', '$');
  const d = input as Record<string, unknown>;

  assert(typeof d.generatedAt === 'string', 'generatedAt required', '$.generatedAt');
  assert(!Number.isNaN(Date.parse(d.generatedAt)), 'generatedAt must be parseable as a date', '$.generatedAt');
  assert(d.source === 'synthetic' || d.source === 'real' || d.source === 'hybrid', 'source must be synthetic|real|hybrid', '$.source');
  assert(typeof d.schemaVersion === 'number', 'schemaVersion required', '$.schemaVersion');
  assert(d.schemaVersion === 1 || d.schemaVersion === 2, 'schemaVersion must be 1 or 2', '$.schemaVersion');
  const schemaVersion = d.schemaVersion;
  if (schemaVersion >= 2) {
    assert(d.source === 'real', 'schema v2 production datasets must use source real', '$.source');
    assert(d.sourcePolicy === 'official-only', 'schema v2 requires official-only sourcePolicy', '$.sourcePolicy');
  }

  const fiscalYears = validateFiscalYears(d.fiscalYears);
  assert(Array.isArray(d.batches), 'batches required', '$.batches');

  const seenSymbols = new Set<string>();
  const seenIsins = new Set<string>();
  const batches = (d.batches as unknown[]).map((b, i) => {
    const path = `$.batches[${i}]`;
    assert(b && typeof b === 'object', 'batch must be an object', path);
    const batch = b as Record<string, unknown>;
    assert(typeof batch.indexName === 'string', 'indexName required', `${path}.indexName`);
    assert(typeof batch.indexSlug === 'string', 'indexSlug required', `${path}.indexSlug`);
    assert(Array.isArray(batch.companies), 'companies required', `${path}.companies`);
    if (batch.constituentCount !== undefined) assert(isFiniteNumber(batch.constituentCount), 'constituentCount must be a number', `${path}.constituentCount`);

    const companies = (batch.companies as unknown[]).map((c, j) => {
      const company = validateCompany(c, `${path}.companies[${j}]`, fiscalYears, schemaVersion);
      assert(!seenSymbols.has(company.symbol), `duplicate symbol ${company.symbol}`, `${path}.companies[${j}].symbol`);
      seenSymbols.add(company.symbol);
      if (company.isin) {
        assert(!seenIsins.has(company.isin), `duplicate isin ${company.isin}`, `${path}.companies[${j}].isin`);
        seenIsins.add(company.isin);
      }
      return company;
    });

    if (batch.constituentCount !== undefined) assert(batch.constituentCount === companies.length, 'constituentCount must match companies length', `${path}.constituentCount`);
    if (schemaVersion >= 2) assert(companies.length > 0, 'schema v2 batches must include companies', `${path}.companies`);

    return {
      indexName: batch.indexName,
      indexSlug: batch.indexSlug,
      asOfDate: validateDateString(batch.asOfDate, `${path}.asOfDate`),
      constituentCount: batch.constituentCount as number | undefined,
      constituentSource: validateSourceRef(batch.constituentSource, `${path}.constituentSource`, schemaVersion >= 2),
      companies,
    } as NiftyBatch;
  });

  assert(batches.length === REQUIRED_BATCHES.length, `expected exactly ${REQUIRED_BATCHES.length} batches`, '$.batches');
  const slugs = new Set(batches.map(b => b.indexSlug));
  for (const required of REQUIRED_BATCHES) {
    assert(slugs.has(required), `missing required batch ${required}`, '$.batches');
  }

  return {
    generatedAt: d.generatedAt,
    source: d.source as DataSource,
    sourceNote: typeof d.sourceNote === 'string' ? d.sourceNote : undefined,
    sourcePolicy: d.sourcePolicy as SourcePolicy | undefined,
    schemaVersion,
    asOfDate: validateDateString(d.asOfDate, '$.asOfDate'),
    fiscalYears,
    provenance: validateProvenance(d.provenance, '$.provenance', schemaVersion),
    batches,
  };
}
