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
} from '@/utils/niftyDatasetSchema';

const DATA_URL = '/data/nifty_750_10y.json';
const ALL_SECTORS = '__all__';

type SortKey = 'symbol' | 'sector' | 'revenueCr' | 'netProfitCr' | 'roePct' | 'valuation';
type SortDir = 'asc' | 'desc';

export function NiftyIndexDataSection() {
  const [dataset, setDataset] = useState<NiftyDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBatchSlug, setSelectedBatchSlug] = useState<string>('niftysmallcap250');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>(ALL_SECTORS);
  const [sortKey, setSortKey] = useState<SortKey>('revenueCr');
  // 'valuation' means pe for non-financials, pb for financials — unified column.
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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
    const rows = filteredCompanies.map((c) => {
      const last = c.financials[c.financials.length - 1];
      return {
        symbol: c.symbol,
        name: c.name,
        sector: c.sector,
        reportingType: c.reportingType,
        revenueCr: last?.revenueCr ?? 0,
        netProfitCr: last?.netProfitCr ?? 0,
        roePct: last?.roePct ?? 0,
        valuation: last?.pe ?? last?.pb ?? 0,
        valuationKind: last?.pe !== undefined ? 'PE' : last?.pb !== undefined ? 'PB' : '—',
      };
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows;
  }, [filteredCompanies, sortKey, sortDir]);

  const selectedCompany = useMemo(() => {
    if (!selectedBatch) return undefined;
    return (
      selectedBatch.companies.find((c) => c.symbol === selectedSymbol)
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
    if (!selectedBatch) return null;
    const latest = selectedBatch.companies
      .map((c) => c.financials[c.financials.length - 1])
      .filter((r): r is NonNullable<typeof r> => Boolean(r));
    if (!latest.length) {
      return { companyCount: selectedBatch.companies.length, avgRoe: 0, totalRevenue: 0, totalProfit: 0 };
    }
    return {
      companyCount: selectedBatch.companies.length,
      avgRoe: latest.reduce((s, f) => s + f.roePct, 0) / latest.length,
      totalRevenue: latest.reduce((s, f) => s + f.revenueCr, 0),
      totalProfit: latest.reduce((s, f) => s + f.netProfitCr, 0),
    };
  }, [selectedBatch]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'symbol' || key === 'sector' ? 'asc' : 'desc');
    }
  };

  const handleExportCsv = () => {
    if (!selectedBatch || !dataset) return;
    const years = dataset.fiscalYears;
    const header = [
      'symbol', 'name', 'sector', 'reportingType', 'fiscalYear',
      'revenueCr', 'netProfitCr', 'roePct', 'pe', 'pb', 'debtToEquity',
    ];
    const lines = [header.join(',')];
    for (const c of filteredCompanies) {
      for (const f of c.financials) {
        if (!years.includes(f.fiscalYear)) continue;
        lines.push([
          c.symbol, csv(c.name), csv(c.sector), c.reportingType, f.fiscalYear,
          f.revenueCr, f.netProfitCr, f.roePct,
          f.pe ?? '', f.pb ?? '', f.debtToEquity ?? '',
        ].join(','));
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBatch.indexSlug}_10y.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Database size={18} className="text-blue-400" /> Nifty 750 Data Hub (10Y)
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Panel data for NIFTY LargeMidcap 250, Smallcap 250, and Microcap 250 — 10 fiscal years of revenue, profit, ROE,
          PE, and leverage per company.
        </p>
      </div>

      {loading && <div className="glass-card p-5 text-sm text-gray-300">Loading dataset…</div>}

      {!loading && error && (
        <div className="glass-card p-5 border border-red-500/40">
          <div className="text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle size={15} /> Could not load dataset: {error}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Regenerate with <code className="px-1">node scripts/generate_nifty_750_10y.mjs</code> or place a schema-valid
            file at <code className="px-1">public/data/nifty_750_10y.json</code>.
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
            <div className="grid md:grid-cols-3 gap-3">
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
                Sector filter
                <select
                  className="mt-1 w-full rounded-lg bg-surface-3 border border-border px-2 py-2 text-sm text-white"
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
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
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </label>
            </div>

            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <Metric label="Companies in cohort" value={`${summary.companyCount}`} />
                <Metric label="Avg ROE (latest FY)" value={`${fmtN(summary.avgRoe, 1)}%`} />
                <Metric label="Total Revenue (₹ Cr)" value={fmtN(summary.totalRevenue, 0)} />
                <Metric label="Total Net Profit (₹ Cr)" value={fmtN(summary.totalProfit, 0)} />
              </div>
            )}
          </div>

          <div className="glass-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-gray-300">
                Latest FY ranking — showing {rankedRows.length} / {selectedBatch.companies.length}
              </h3>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-200 px-3 py-1.5 transition-colors"
              >
                <Download size={13} /> Export CSV (10Y)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-border">
                    <Th label="Symbol" k="symbol" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                    <th className="text-left font-medium py-2 pr-3">Name</th>
                    <Th label="Sector" k="sector" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                    <Th label="Revenue (₹ Cr)" k="revenueCr" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <Th label="Net Profit (₹ Cr)" k="netProfitCr" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <Th label="ROE %" k="roePct" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <Th label="PE / PB" k="valuation" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {rankedRows.slice(0, 100).map((r) => (
                    <tr
                      key={r.symbol}
                      onClick={() => setSelectedSymbol(r.symbol)}
                      className={`border-b border-border/40 cursor-pointer hover:bg-surface-3/60 ${
                        selectedCompany?.symbol === r.symbol ? 'bg-blue-500/10' : ''
                      }`}
                    >
                      <td className="py-1.5 pr-3 text-white font-medium">{r.symbol}</td>
                      <td className="py-1.5 pr-3 text-gray-200 truncate max-w-[240px]">{r.name}</td>
                      <td className="py-1.5 pr-3 text-gray-400">{r.sector}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{fmtN(r.revenueCr, 0)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{fmtN(r.netProfitCr, 0)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{fmtN(r.roePct, 1)}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">
                        <span className="text-[10px] text-gray-500 mr-1">{r.valuationKind}</span>
                        {fmtN(r.valuation, 1)}
                      </td>
                    </tr>
                  ))}
                  {rankedRows.length === 0 && (
                    <tr><td colSpan={7} className="py-6 text-center text-gray-500">No companies match these filters.</td></tr>
                  )}
                </tbody>
              </table>
              {rankedRows.length > 100 && (
                <p className="text-[11px] text-gray-500 mt-2">
                  Showing top 100 of {rankedRows.length}. Narrow the filter or export CSV for the full set.
                </p>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              10Y trend: {selectedCompany?.name} ({selectedCompany?.symbol}) · {selectedCompany?.sector}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
                <XAxis dataKey="fiscalYear" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="Net Profit" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="ROE" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
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
    <th
      className={`font-medium py-2 pr-3 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
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

function csv(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
