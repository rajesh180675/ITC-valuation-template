import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Database, AlertTriangle } from 'lucide-react';

import { ChartTooltip, fmtN } from '@/components/itc/shared';

interface AnnualFinancial {
  fiscalYear: string;
  revenueCr: number;
  netProfitCr: number;
  roePct: number;
  pe?: number;
  pb?: number;
  debtToEquity?: number;
}

interface CompanyFinancialRecord {
  symbol: string;
  companyName: string;
  sector: string;
  reportingType: 'financial' | 'nonFinancial';
  financials: AnnualFinancial[];
}

interface IndexFinancialBatch {
  indexSlug: string;
  indexName: string;
  asOfDate: string;
  companies: CompanyFinancialRecord[];
}

interface NiftyIndexDataset {
  generatedAt: string;
  batches: IndexFinancialBatch[];
}

const DATA_URL = '/data/nifty_750_10y.json';

export function NiftyIndexDataSection() {
  const [dataset, setDataset] = useState<NiftyIndexDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBatchSlug, setSelectedBatchSlug] = useState<string>('niftysmallcap250');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch ${DATA_URL} (${res.status})`);
        return res.json() as Promise<NiftyIndexDataset>;
      })
      .then((data) => {
        if (!mounted) return;
        setDataset(data);
        const firstBatch = data.batches[0];
        if (firstBatch) {
          setSelectedBatchSlug(firstBatch.indexSlug);
          setSelectedSymbol(firstBatch.companies[0]?.symbol ?? '');
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

    return () => {
      mounted = false;
    };
  }, []);

  const selectedBatch = useMemo(
    () => dataset?.batches.find((b) => b.indexSlug === selectedBatchSlug) ?? dataset?.batches[0],
    [dataset, selectedBatchSlug],
  );

  const selectedCompany = useMemo(
    () => selectedBatch?.companies.find((c) => c.symbol === selectedSymbol) ?? selectedBatch?.companies[0],
    [selectedBatch, selectedSymbol],
  );

  const trendData = selectedCompany?.financials.map((f) => ({
    fiscalYear: f.fiscalYear,
    Revenue: f.revenueCr,
    'Net Profit': f.netProfitCr,
    ROE: f.roePct,
  })) ?? [];

  const summary = useMemo(() => {
    if (!selectedBatch) return null;
    const allCompanies = selectedBatch.companies;
    const companyCount = allCompanies.length;
    const latest = allCompanies
      .map((c) => c.financials[c.financials.length - 1])
      .filter(Boolean) as AnnualFinancial[];

    if (!latest.length) return { companyCount, avgRoe: 0, totalRevenue: 0, totalProfit: 0 };

    return {
      companyCount,
      avgRoe: latest.reduce((s, f) => s + f.roePct, 0) / latest.length,
      totalRevenue: latest.reduce((s, f) => s + f.revenueCr, 0),
      totalProfit: latest.reduce((s, f) => s + f.netProfitCr, 0),
    };
  }, [selectedBatch]);

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Database size={18} className="text-blue-400" /> Nifty 750 Data Hub (10Y)
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          UI loader for Smallcap 250, LargeMidcap 250, and Microcap 250 financial panels. Drop your generated dataset at
          <code className="px-1">public/data/nifty_750_10y.json</code>.
        </p>
      </div>

      {loading && <div className="glass-card p-5 text-sm text-gray-300">Loading dataset…</div>}

      {!loading && error && (
        <div className="glass-card p-5 border border-yellow-500/40">
          <div className="text-yellow-300 text-sm flex items-center gap-2">
            <AlertTriangle size={15} /> Could not load dataset: {error}
          </div>
        </div>
      )}

      {!loading && dataset && selectedBatch && (
        <>
          <div className="glass-card p-5 space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-xs text-gray-400">
                Batch / Index
                <select
                  className="mt-1 w-full rounded-lg bg-surface-3 border border-border px-2 py-2 text-sm"
                  value={selectedBatch.indexSlug}
                  onChange={(e) => {
                    const next = dataset.batches.find((b) => b.indexSlug === e.target.value);
                    setSelectedBatchSlug(e.target.value);
                    setSelectedSymbol(next?.companies[0]?.symbol ?? '');
                  }}
                >
                  {dataset.batches.map((batch) => (
                    <option key={batch.indexSlug} value={batch.indexSlug}>
                      {batch.indexName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-gray-400">
                Company
                <select
                  className="mt-1 w-full rounded-lg bg-surface-3 border border-border px-2 py-2 text-sm"
                  value={selectedCompany?.symbol ?? ''}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                >
                  {selectedBatch.companies.map((company) => (
                    <option key={company.symbol} value={company.symbol}>
                      {company.symbol} — {company.companyName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <Metric label="Companies" value={`${summary.companyCount}`} />
                <Metric label="Avg ROE (latest FY)" value={`${fmtN(summary.avgRoe, 1)}%`} />
                <Metric label="Total Revenue (₹ Cr)" value={fmtN(summary.totalRevenue, 0)} />
                <Metric label="Total Net Profit (₹ Cr)" value={fmtN(summary.totalProfit, 0)} />
              </div>
            )}
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              10Y Trend: {selectedCompany?.companyName} ({selectedCompany?.symbol})
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
