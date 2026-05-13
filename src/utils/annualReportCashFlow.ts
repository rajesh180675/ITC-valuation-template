export type AnnualReportTab = 'overview' | 'pnl' | 'balanceSheet' | 'cashFlow' | 'segments' | 'charts' | 'ratios';

export interface AnnualReportItem {
  type: 'item' | 'section';
  label: string;
  note_ref?: string;
  current?: number | null;
  prior?: number | null;
  section?: string | null;
}

export interface AnnualReportStatement {
  fy: string;
  items: AnnualReportItem[];
  kpIs: Record<string, number | null>;
}

export interface AnnualReportYearMetadata {
  pdfName?: string;
  pdfPath?: string;
  cashFlowPages?: number[];
  warnings?: string[];
}

export interface AnnualReportYearData {
  profitLoss?: AnnualReportStatement;
  balanceSheet?: AnnualReportStatement;
  cashFlow?: AnnualReportStatement;
  metadata?: AnnualReportYearMetadata;
}

export interface AnnualReportFileMetadata {
  schemaVersion?: number;
  generatedAt?: string;
  source?: string;
  yearsCovered?: string[];
  warnings?: string[];
  pdfPaths?: Record<string, string>;
}

export interface AnnualReportDataFile {
  ticker: string;
  years: Record<string, AnnualReportYearData>;
  metadata?: AnnualReportFileMetadata;
}

export interface CashFlowTableRow {
  key: string;
  label: string;
  section: string;
  values: (number | null)[];
  isTotal: boolean;
}

export interface CashFlowTableGroup {
  header: string;
  rows: CashFlowTableRow[];
}

export interface CashFlowYearSummary {
  fy: string;
  cfo: number | null;
  cfi: number | null;
  cff: number | null;
  capex: number | null;
  dividend: number | null;
  netChange: number | null;
  openingCash: number | null;
  closingCash: number | null;
  fcf: number | null;
  pat: number | null;
  cashConversion: number | null;
  dividendPayout: number | null;
}

export type CashFlowPreset = 'all' | '5y' | '3y' | 'reset';

const CASH_FLOW_SECTION_ORDER = ['Operating Activities', 'Investing Activities', 'Financing Activities', 'Summary'];

const CASH_FLOW_LABEL_ALIASES: Array<[RegExp, string]> = [
  [/^net cash from operating activities$/i, 'Net cash from operating activities'],
  [/^net cash used in operating activities$/i, 'Net cash used in operating activities'],
  [/^net cash from investing activities$/i, 'Net cash from investing activities'],
  [/^net cash used in investing activities$/i, 'Net cash used in investing activities'],
  [/^net cash from financing activities$/i, 'Net cash from financing activities'],
  [/^net cash used in financing activities$/i, 'Net cash used in financing activities'],
  [/^net increase \/ \(decrease\) in cash and cash equivalents$/i, 'Net increase / (decrease) in cash and cash equivalents'],
  [/^net increase in cash and cash equivalents$/i, 'Net increase in cash and cash equivalents'],
  [/^opening cash and cash equivalents$/i, 'Opening cash and cash equivalents'],
  [/^closing cash and cash equivalents$/i, 'Closing cash and cash equivalents'],
  [/^cash and cash equivalents at the beginning$/i, 'Opening cash and cash equivalents'],
  [/^cash and cash equivalents at the end$/i, 'Closing cash and cash equivalents'],
  [/^dividend paid$/i, 'Dividend paid'],
  [/^dividend income$/i, 'Dividend income'],
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function canonicalizeCashFlowLabel(label: string): string {
  const cleanLabel = normalizeWhitespace(label);
  for (const [pattern, replacement] of CASH_FLOW_LABEL_ALIASES) {
    if (pattern.test(cleanLabel)) return replacement;
  }
  return cleanLabel;
}

export function cashFlowLabelKey(label: string): string {
  return canonicalizeCashFlowLabel(label).toLowerCase();
}

export function getDisplayYears(selectedYears: string[], years: string[], tab: AnnualReportTab): string[] {
  if (selectedYears.length > 0) return selectedYears;
  return tab === 'cashFlow' ? years : years.slice(-5);
}

export function getYearPresetYears(preset: CashFlowPreset, years: string[]): string[] {
  if (preset === 'all') return years;
  if (preset === '5y') return years.slice(-5);
  if (preset === '3y') return years.slice(-3);
  return [];
}

export function formatCashFlowValue(value: number | null): string {
  if (value == null) return '\u2014';
  // Explicit 0 is meaningful in CF (e.g. no financing outflows) — show '0' not dash
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  const body = magnitude >= 100
    ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(magnitude)
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(magnitude);
  return value < 0 ? `(${body})` : body;
}

function getCashFlowSection(item: AnnualReportItem, currentSection: string): string {
  if (item.type === 'section') return item.label;
  const explicit = item.section?.trim();
  if (explicit) return explicit;
  return currentSection;
}

export function buildCashFlowTableModel(data: Record<string, AnnualReportYearData>, years: string[]): {
  groups: CashFlowTableGroup[];
  warnings: string[];
} {
  const rowsBySection = new Map<string, CashFlowTableRow[]>();
  const rowsByKey = new Map<string, CashFlowTableRow>();
  const warnings: string[] = [];

  for (const section of CASH_FLOW_SECTION_ORDER) rowsBySection.set(section, []);

  years.forEach((fy, yearIndex) => {
    const stmt = data[fy]?.cashFlow;
    if (!stmt) return;
    let currentSection = 'Operating Activities';
    for (const item of stmt.items) {
      currentSection = getCashFlowSection(item, currentSection);
      if (item.type === 'section') {
        if (!rowsBySection.has(currentSection)) rowsBySection.set(currentSection, []);
        continue;
      }

      const key = cashFlowLabelKey(item.label);
      const displayLabel = canonicalizeCashFlowLabel(item.label);
      const section = currentSection || 'Operating Activities';
      if (!rowsBySection.has(section)) rowsBySection.set(section, []);

      let row = rowsByKey.get(key);
      if (!row) {
        row = {
          key,
          label: displayLabel,
          section,
          values: years.map(() => null),
          isTotal: key.includes('net cash') || key.includes('closing cash') || key.includes('opening cash'),
        };
        rowsByKey.set(key, row);
        rowsBySection.get(section)?.push(row);
      } else if (row.section !== section && row.values.every(v => v == null)) {
        row.section = section;
      }

      row.values[yearIndex] = item.current ?? null;
      if (row.label === item.label) continue;
      if (row.label.toLowerCase() === item.label.toLowerCase()) continue;
      if (displayLabel.length > row.label.length) row.label = displayLabel;
    }
  });

  const groups = CASH_FLOW_SECTION_ORDER
    .filter(section => (rowsBySection.get(section)?.length ?? 0) > 0)
    .map(section => ({
      header: section,
      rows: (rowsBySection.get(section) ?? []).filter(row => row.values.some(value => value != null)),
    }));

  for (const [section, rows] of rowsBySection.entries()) {
    if (CASH_FLOW_SECTION_ORDER.includes(section)) continue;
    if (rows.length > 0) {
      groups.push({ header: section, rows: rows.filter(row => row.values.some(value => value != null)) });
    }
  }

  if (groups.length === 0) warnings.push('cash flow table has no rows');
  return { groups, warnings };
}

export function buildCashFlowYearSummaries(data: Record<string, AnnualReportYearData>, years: string[]): CashFlowYearSummary[] {
  return years.map(fy => {
    const y = data[fy];
    const cf = y?.cashFlow?.kpIs ?? {};
    const pnl = y?.profitLoss?.kpIs ?? {};
    const pat = pnl.patCr ?? null;
    const cfo = cf.cfoCr ?? null;
    const fcf = cf.fcfCr ?? null;
    const cashConversion = cfo != null && pat != null && pat !== 0 ? Math.round((cfo / pat) * 1000) / 10 : null;
    const dividendPayout = cf.dividendCr != null && fcf != null && fcf !== 0 ? Math.round((Math.abs(cf.dividendCr) / Math.abs(fcf)) * 1000) / 10 : null;

    return {
      fy,
      cfo,
      cfi: cf.cfiCr ?? null,
      cff: cf.cffCr ?? null,
      capex: cf.capexCr ?? null,
      dividend: cf.dividendCr ?? null,
      netChange: cf.netChangeCr ?? null,
      openingCash: cf.openingCashCr ?? null,
      closingCash: cf.closingCashCr ?? null,
      fcf,
      pat,
      cashConversion,
      dividendPayout,
    };
  });
}
