import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { Database, AlertTriangle, Search, Download, Info, ArrowUpDown } from 'lucide-react';

import { ChartTooltip, fmtN } from '@/components/itc/shared';
import {
  validateNiftyDataset,
  type NiftyDataset,
  type NiftyBatch,
  type NiftyCompany,
  type FinancialYearRow,
} from '@/utils/niftyDatasetSchema';

const DATA_URL = '/data/nifty_750_10y.json';
const ALL_SECTORS = '__all__';
const DEFAULT_PAGE_SIZE = 50;

type SortKey = 'symbol' | 'sector' | 'revenueCr' | 'netProfitCr' | 'roePct' | 'pe' | 'pb' | 'coveragePct';
type SortDir = 'asc' | 'desc';

interface RankedRow {
  symbol: string;
  name: string;
  sector: string;
  reportingType: string;
  revenueCr: number | null;
  netProfitCr: number | null;
  roePct: number | null;
  pe: number | null;
  pb: number | null;
  coveragePct: number;
  qualityFlags: string[];
}

interface SectorRow {
  sector: string;
  count: number;
  totalRevenue: number;
  totalProfit: number;
  medianRoe: number | null;
  medianPe: number | null;
  medianPb: number | null;
  coveragePct: number;
}

export function NiftyIndexDataSection() {
  const [dataset, setDataset] = useState<NiftyDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBatchSlug, setSelectedBatchSlug] = useState<string>('niftysmallcap250');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>(ALL_SECTORS);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('revenueCr');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(DATA_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${DATA_URL}`);
        const json: unknown = await res.json();
        return validateNiftyDataset(json);
      })
      .then((data) => {
        if (!mounted) return;
        setDataset(data);
        const first = data.batches[0];
        if (first) {
          setSelectedBatchSlug(first.indexSlug);
          setSelectedSymbol(first.companies[0]?.symbol ?? '');
        }
        setSelectedFiscalYear(data.fiscalYears[data.fiscalYears.length - 1] ?? '');
        setError(null);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const selectedBatch: NiftyBatch | undefined = useMemo(
    () => dataset?.batches.find((b) => b.indexSlug === selectedBatchSlug) ?? dataset?.batches[0],
    [dataset, selectedBatchSlug],
  );

  const sectorsInBatch = useMemo(() => {
    if (!selectedBatch) return [] as string[];
    return Array.from(new Set(selectedBatch.companies.map((c) => c.sector))).sort();
  }, [selectedBatch]);

  const filteredCompanies = useMemo(() => {
    if (!selectedBatch) return [] as NiftyCompany[];
    const q = search.trim().toLowerCase();
    return selectedBatch.companies.filter((c) => {
      if (sectorFilter !== ALL_SECTORS && c.sector !== sectorFilter) return false;
      if (!q) return true;
      return c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    });
  }, [selectedBatch, search, sectorFilter]);

  const rankedRows = useMemo(() => {
    const rows: RankedRow[] = filteredCompanies.map((c) => {
      const row = rowForYear(c, selectedFiscalYear);
      return {
        symbol: c.symbol,
        name: c.name,
        sector: c.sector,
        reportingType: c.reportingType,
        revenueCr: row?.revenueCr ?? null,
        netProfitCr: row?.netProfitCr ?? null,
        roePct: row?.roePct ?? null,
        pe: row?.pe ?? null,
        pb: row?.pb ?? null,
        coveragePct: coveragePct(c.financials, dataset?.fiscalYears.length ?? 0),
        qualityFlags: [...(c.qualityFlags ?? []), ...(row?.qualityFlags ?? [])],
      };
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => compareValues(a[sortKey], b[sortKey]) * dir);
    return rows;
  }, [dataset?.fiscalYears.length, filteredCompanies, selectedFiscalYear, sortKey, sortDir]);

  const selectedCompany = useMemo(() => {
    if (!selectedBatch) return undefined;
    return (
      filteredCompanies.find((c) => c.symbol === selectedSymbol)
      ?? filteredCompanies[0]
      ?? selectedBatch.companies[0]
    );
  }, [selectedBatch, selectedSymbol, filteredCompanies]);

  const trendData = useMemo(() => selectedCompany?.financials.map((f) => ({
    fiscalYear: f.fiscalYear,
    Revenue: f.revenueCr,
    'Net Profit': f.netProfitCr,
    ROE: f.roePct,
  })) ?? [], [selectedCompany]);

  const summary = useMemo(() => {
    const rows = filteredCompanies.map((c) => rowForYear(c, selectedFiscalYear)).filter(isRow);
    const revenueRows = rows.filter((r) => typeof r.revenueCr === 'number');
    const profitRows = rows.filter((r) => typeof r.netProfitCr === 'number');
    const roeValues = rows.map((r) => r.roePct).filter(isNumber);
    return {
      companyCount: filteredCompanies.length,
      coveragePct: filteredCompanies.length ? (rows.length / filteredCompanies.length) * 100 : 0,
      avgRoe: average(roeValues),
      totalRevenue: revenueRows.reduce((s, f) => s + (f.revenueCr ?? 0), 0),
      totalProfit: profitRows.reduce((s, f) => s + (f.netProfitCr ?? 0), 0),
    };
  }, [filteredCompanies, selectedFiscalYear]);

  const sectorRows = useMemo(() => {
    const bySector = new Map<string, RankedRow[]>();
    for (const row of rankedRows) {
      const rows = bySector.get(row.sector) ?? [];
      rows.push(row);
      bySector.set(row.sector, rows);
    }
    return Array.from(bySector.entries()).map(([sector, rows]): SectorRow => ({
      sector,
      count: rows.length,
      totalRevenue: rows.reduce((sum, row) => sum + (row.revenueCr ?? 0), 0),
      totalProfit: rows.reduce((sum, row) => sum + (row.netProfitCr ?? 0), 0),
      medianRoe: median(rows.map((row) => row.roePct).filter(isNumber)),
      medianPe: median(rows.map((row) => row.pe).filter(isNumber)),
      medianPb: median(rows.map((row) => row.pb).filter(isNumber)),
      coveragePct: average(rows.map((row) => row.coveragePct)) ?? 0,
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [rankedRows]);

  const maxPage = Math.max(1, Math.ceil(rankedRows.length / pageSize));
  const pagedRows = rankedRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [selectedBatchSlug, search, sectorFilter, selectedFiscalYear, sortKey, sortDir, pageSize]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'symbol' || key === 'sector' ? 'asc' : 'desc');
    }
  };

  const handleExportCsv = () => {
    if (!selectedBatch || !dataset) return;
    const header = [
      'indexSlug', 'indexName', 'datasetSource', 'sourcePolicy', 'symbol', 'name', 'sector', 'industry', 'reportingType',
      'fiscalYear', 'periodEndDate', 'statementType', 'revenueCr', 'netProfitCr', 'roePct', 'pe', 'pb', 'debtToEquity',
      'marketDataAsOfDate', 'qualityFlags', 'financialSource', 'marketDataSource',
    ];
    const lines = [header.map(csv).join(',')];
    for (const c of filteredCompanies) {
      for (const f of c.financials) {
        lines.push([
          selectedBatch.indexSlug,
          selectedBatch.indexName,
          dataset.source,
          dataset.sourcePolicy ?? '',
          c.symbol,
          c.name,
          c.sector,
          c.industry ?? '',
          c.reportingType,
          f.fiscalYear,
          f.periodEndDate ?? '',
          f.statementType ?? '',
          valueForCsv(f.revenueCr),
          valueForCsv(f.netProfitCr),
          valueForCsv(f.roePct),
          valueForCsv(f.pe),
          valueForCsv(f.pb),
          valueForCsv(f.debtToEquity),
          f.marketDataAsOfDate ?? '',
          [...(c.qualityFlags ?? []), ...(f.qualityFlags ?? [])].join('|'),
          f.sources?.financial?.sourceName ?? '',
          f.sources?.marketData?.sourceName ?? '',
        ].map((value) => csv(String(value))).join(','));
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBatch.indexSlug}_${selectedFiscalYear || 'all-years'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Database size={18} className="text-blue-400" /> Nifty 750 Data Hub
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Current Nifty LargeMidcap 250, Smallcap 250, and Microcap 250 constituents with official-source financial panels,
          provenance, quality flags, and exportable company records.
        </p>
        {dataset && (
          <div className="mt-3 grid md:grid-cols-4 gap-2 text-[11px] text-gray-400">
            <Meta label="Dataset source" value={dataset.sourcePolicy ? `${dataset.source} · ${dataset.sourcePolicy}` : dataset.source} />
            <Meta label="Generated" value={new Date(dataset.generatedAt).toLocaleDateString()} />
            <Meta label="As of" value={dataset.asOfDate ?? selectedBatch?.asOfDate ?? '—'} />
            <Meta label="Schema" value={`v${dataset.schemaVersion}`} />
          </div>
        )}
      </div>

      {loading && <div className="glass-card p-5 text-sm text-gray-300">Loading dataset…</div>}

      {!loading && error && (
        <div className="glass-card p-5 border border-red-500/40">
          <div className="text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle size={15} /> Could not load dataset: {error}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Build an official-source feed with <code className="px-1">npm run generate:nifty750</code>, or place a
            schema-valid file at <code className="px-1">public/data/nifty_750_10y.json</code>.
          </p>
        </div>
      )}

      {!loading && dataset && selectedBatch && (
        <>
          {dataset.source !== 'real' && (
            <div className="glass-card p-4 border border-yellow-500/40 flex items-start gap-3">
              <Info size={16} className="text-yellow-300 mt-0.5 shrink-0" />
              <div className="text-xs text-yellow-100">
                <p className="font-semibold">
                  {dataset.source === 'synthetic' ? 'Synthetic demo data' : 'Hybrid data (real + synthetic)'}
                </p>
                <p className="text-yellow-200/80 mt-0.5">
                  {dataset.sourceNote
                    ?? 'Figures are generated deterministically from sector archetypes. Do not use for investment decisions.'}
                </p>
              </div>
            </div>
          )}

          <div className="glass-card p-5 space-y-4">
            <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-3">
              <label className="text-xs text-gray-400">
                Index cohort
                <select
                  className="mt-1 w-full rounded-lg bg-surface-3 border border-border px-2 py-2 text-sm text-white"
                  value={selectedBatch.indexSlug}
                  onChange={(e) => {
                    const next = dataset.batches.find((b) => b.indexSlug === e.target.value);
                    setSelectedBatchSlug(e.target.value);
                    setSectorFilter(ALL_SECTORS);
                    setSearch('');
                    setSelectedSymbol(next?.companies[0]?.symbol ?? '');
                  }}
                >
                  {dataset.batches.map((batch) => (
                    <option key={batch.indexSlug} value={batch.indexSlug}>
                      {batch.indexName} ({batch.companies.length})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-gray-400">
                Fiscal year
                <select
                  className="mt-1 w-full rounded-lg bg-surface-3 border border-border px-2 py-2 text-sm text-white"
                  value={selectedFiscalYear}
                  onChange={(e) => setSelectedFiscalYear(e.target.value)}
                >
                  {dataset.fiscalYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>

              <label className="text-xs text-gray-400">
                Sector filter
                <select
                  className="mt-1 w-full rounded-lg bg-surface-3 border border-border px-2 py-2 text-sm text-white"
                  value={sectorFilter}
                  onChange={(e) => {
                    setSectorFilter(e.target.value);
                    setSelectedSymbol('');
                  }}
                >
                  <option value={ALL_SECTORS}>All sectors ({sectorsInBatch.length})</option>
                  {sectorsInBatch.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label className="text-xs text-gray-400">
                Search
                <div className="relative mt-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    className="w-full rounded-lg bg-surface-3 border border-border pl-8 pr-2 py-2 text-sm text-white"
                    placeholder="Symbol or company name"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedSymbol('');
                    }}
                  />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <Metric label="Filtered companies" value={`${summary.companyCount}`} />
              <Metric label={`${selectedFiscalYear} coverage`} value={`${fmtN(summary.coveragePct, 1)}%`} />
              <Metric label="Avg ROE" value={formatPct(summary.avgRoe)} />
              <Metric label="Revenue (₹ Cr)" value={fmtN(summary.totalRevenue, 0)} />
              <Metric label="Net Profit (₹ Cr)" value={fmtN(summary.totalProfit, 0)} />
            </div>

            <div className="grid md:grid-cols-2 gap-3 text-[11px] text-gray-400">
              <Meta label="Constituent source" value={selectedBatch.constituentSource?.sourceName ?? dataset.provenance?.universe?.sourceName ?? '—'} />
              <Meta label="Batch as of" value={selectedBatch.asOfDate ?? dataset.asOfDate ?? '—'} />
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Sector analytics — {selectedFiscalYear}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-border">
                    <th className="py-2 pr-3 text-left font-medium">Sector</th>
                    <th className="py-2 pr-3 text-right font-medium">Count</th>
                    <th className="py-2 pr-3 text-right font-medium">Coverage</th>
                    <th className="py-2 pr-3 text-right font-medium">Revenue</th>
                    <th className="py-2 pr-3 text-right font-medium">Profit</th>
                    <th className="py-2 pr-3 text-right font-medium">Median ROE</th>
                    <th className="py-2 pr-3 text-right font-medium">Median PE</th>
                    <th className="py-2 pr-3 text-right font-medium">Median PB</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorRows.map((row) => (
                    <tr key={row.sector} className="border-b border-border/40">
                      <td className="py-1.5 pr-3 text-white">{row.sector}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-300">{row.count}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-300">{formatPct(row.coveragePct)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-300">{fmtN(row.totalRevenue, 0)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-300">{fmtN(row.totalProfit, 0)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-300">{formatPct(row.medianRoe)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-300">{formatNumber(row.medianPe, 1)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-300">{formatNumber(row.medianPb, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-gray-300">
                {selectedFiscalYear} ranking — showing {pagedRows.length} / {rankedRows.length} filtered companies
              </h3>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-lg bg-surface-3 border border-border px-2 py-1.5 text-xs text-white"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[25, 50, 100, 250].map((size) => <option key={size} value={size}>{size} rows</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-200 px-3 py-1.5 transition-colors"
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-border">
                    <Th label="Symbol" k="symbol" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                    <th className="text-left font-medium py-2 pr-3">Name</th>
                    <Th label="Sector" k="sector" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                    <Th label="Revenue" k="revenueCr" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <Th label="Net Profit" k="netProfitCr" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <Th label="ROE" k="roePct" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <Th label="PE" k="pe" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <Th label="PB" k="pb" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <Th label="Coverage" k="coveragePct" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r) => (
                    <tr
                      key={r.symbol}
                      onClick={() => setSelectedSymbol(r.symbol)}
                      className={`border-b border-border/40 cursor-pointer hover:bg-surface-3/60 ${
                        selectedCompany?.symbol === r.symbol ? 'bg-blue-500/10' : ''
                      }`}
                    >
                      <td className="py-1.5 pr-3 text-white font-medium">{r.symbol}</td>
                      <td className="py-1.5 pr-3 text-gray-200 truncate max-w-[240px]">
                        {r.name}
                        {r.qualityFlags.length > 0 && <span className="ml-2 text-[10px] text-yellow-300">flagged</span>}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-400">{r.sector}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{formatNumber(r.revenueCr, 0)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{formatNumber(r.netProfitCr, 0)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{formatPct(r.roePct)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{formatNumber(r.pe, 1)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{formatNumber(r.pb, 1)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{formatPct(r.coveragePct)}</td>
                    </tr>
                  ))}
                  {rankedRows.length === 0 && (
                    <tr><td colSpan={9} className="py-6 text-center text-gray-500">No companies match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {rankedRows.length > pageSize && (
              <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-border px-3 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <span>Page {page} of {maxPage}</span>
                <button
                  type="button"
                  disabled={page >= maxPage}
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  className="rounded-lg border border-border px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                Available trend: {selectedCompany?.name} ({selectedCompany?.symbol}) · {selectedCompany?.sector}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
                  <XAxis dataKey="fiscalYear" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                  <Line yAxisId="left" type="monotone" dataKey="Net Profit" stroke="#22c55e" strokeWidth={2} dot={false} connectNulls />
                  <Line yAxisId="right" type="monotone" dataKey="ROE" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-5 text-xs space-y-3">
              <h3 className="text-sm font-semibold text-gray-300">Company provenance</h3>
              <Meta label="ISIN" value={selectedCompany?.isin ?? '—'} />
              <Meta label="Industry" value={selectedCompany?.industry ?? '—'} />
              <Meta label="Listing" value={selectedCompany?.listingExchange ?? '—'} />
              <Meta label="Profile source" value={selectedCompany?.officialProfileSource?.sourceName ?? '—'} />
              <Meta label="Quality flags" value={selectedCompany?.qualityFlags?.join(', ') || 'None'} />
              <div>
                <p className="text-gray-400">Selected FY row flags</p>
                <p className="text-white mt-1">
                  {rowForYear(selectedCompany, selectedFiscalYear)?.qualityFlags?.join(', ') || 'None'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-3/60 border border-border rounded-lg px-3 py-2">
      <p className="text-gray-400">{label}</p>
      <p className="text-white font-semibold mt-1">{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-3/40 border border-border rounded-lg px-3 py-2">
      <p className="text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-gray-200 mt-1 break-words">{value}</p>
    </div>
  );
}

function Th({
  label, k, sortKey, sortDir, onSort, align,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  align: 'left' | 'right';
}) {
  const active = k === sortKey;
  return (
    <th className={`font-medium py-2 pr-3 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 hover:text-white ${active ? 'text-white' : 'text-gray-400'}`}
      >
        {label}
        <ArrowUpDown size={10} className={active ? 'opacity-100' : 'opacity-40'} />
        {active && <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

function rowForYear(company: NiftyCompany | undefined, fiscalYear: string): FinancialYearRow | undefined {
  if (!company) return undefined;
  return company.financials.find((row) => row.fiscalYear === fiscalYear) ?? company.financials[company.financials.length - 1];
}

function isRow(row: FinancialYearRow | undefined): row is FinancialYearRow {
  return Boolean(row);
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function compareValues(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function coveragePct(rows: FinancialYearRow[], expectedYears: number): number {
  if (!expectedYears) return 0;
  const sourcedRows = rows.filter((row) => !row.qualityFlags?.includes('financial_row_unavailable'));
  return (sourcedRows.length / expectedYears) * 100;
}

function formatNumber(value: number | null | undefined, digits: number): string {
  return typeof value === 'number' && Number.isFinite(value) ? fmtN(value, digits) : '—';
}

function formatPct(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${fmtN(value, 1)}%` : '—';
}

function valueForCsv(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function csv(v: string): string {
  const neutralized = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  if (/[",\n]/.test(neutralized)) return `"${neutralized.replace(/"/g, '""')}"`;
  return neutralized;
}
