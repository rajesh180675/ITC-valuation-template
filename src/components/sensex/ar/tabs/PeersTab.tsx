import { Users, Info } from 'lucide-react';
import type { AnnualReportYearData } from '@/utils/annualReportCashFlow';
import { buildDerivedFinancials } from '@/utils/ar/derivedKPIs';
import { useMemo } from 'react';

interface PeersTabProps {
  ticker: string;
  yearsData: Record<string, AnnualReportYearData>;
  years: string[];
  sector?: string | null;
}

const fmtN = (v: number | null | undefined, d = 1) => v == null || !Number.isFinite(v) ? '—' : v.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (v: number | null | undefined, d = 1) => v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(d)}%`;
const mul = (v: number | null | undefined, d = 1) => v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(d)}x`;

const METRICS: { key: keyof ReturnType<typeof buildDerivedFinancials>[0]; label: string; fmt: (v: any) => string }[] = [
  { key: 'revenue',      label: 'Revenue (₹ Cr)',   fmt: v => v == null ? '—' : `₹${fmtN(v, 0)}` },
  { key: 'ebitdaMargin', label: 'EBITDA Margin',    fmt: pct },
  { key: 'patMargin',    label: 'PAT Margin',       fmt: pct },
  { key: 'roe',          label: 'ROE',              fmt: pct },
  { key: 'roce',         label: 'ROCE',             fmt: pct },
  { key: 'debtToEquity', label: 'Debt / Equity',    fmt: mul },
  { key: 'cashConversion', label: 'Cash Conversion', fmt: v => pct(v) },
  { key: 'fcfYield',     label: 'FCF Yield',        fmt: pct },
];

export function PeersTab({ ticker, yearsData, years, sector }: PeersTabProps) {
  const rows = useMemo(() => buildDerivedFinancials(yearsData, years), [yearsData, years]);

  if (rows.length === 0) {
    return <div className="glass-card p-5 text-gray-400">No peer metrics available.</div>;
  }

  // Show last 5 years for the trend table
  const trendYears = rows.slice(-5);
  const latest = trendYears[trendYears.length - 1];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <Users size={16} className="text-blue-400" />
        <span className="font-medium">{ticker}</span>
        {sector && <span className="text-gray-500">· {sector}</span>}
        <span className="text-gray-600">· Peer comparison</span>
      </div>

      {/* Active company summary card */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Revenue (latest)', val: latest.revenue != null ? `₹${fmtN(latest.revenue, 0)} Cr` : '—' },
          { label: 'EBITDA Margin',    val: pct(latest.ebitdaMargin) },
          { label: 'ROE',              val: pct(latest.roe) },
          { label: 'Debt / Equity',    val: mul(latest.debtToEquity) },
        ].map(({ label, val }) => (
          <div key={label} className="glass-card p-4">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-xl text-white font-semibold mt-1">{val}</div>
          </div>
        ))}
      </div>

      {/* Multi-year trend table for the active company */}
      <div className="glass-card p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-white mb-3">{ticker} — Key Metric Trend</h3>
        <table className="w-full text-xs tabular-nums" style={{ minWidth: 500 }}>
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left py-2 pr-4 font-medium">Metric</th>
              {trendYears.map(r => (
                <th key={r.fy} className="text-right py-2 px-2 font-medium whitespace-nowrap">
                  {r.fy.replace('FY', "'")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map(({ key, label, fmt }) => {
              const vals = trendYears.map(r => r[key] as number | null);
              if (vals.every(v => v == null)) return null;
              return (
                <tr key={key} className="hover:bg-white/[0.03] border-b border-gray-900">
                  <td className="py-1.5 pr-4 text-gray-300 text-[11px]">{label}</td>
                  {vals.map((v, i) => (
                    <td key={i} className={`text-right py-1.5 px-2 text-[11px] ${v != null ? 'text-white' : 'text-gray-600'}`}>
                      {fmt(v)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Honest placeholder for cross-company peers */}
      <div className="glass-card p-4 flex items-start gap-3 text-xs text-gray-400">
        <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <div className="text-gray-300 font-medium">Cross-company peer data not loaded</div>
          <div>
            To enable peer comparison, place a <code className="text-emerald-300">public/data/peers_data.json</code> file
            with entries keyed by sector. Each entry should follow the same AR JSON schema.
            The active-company row above is live; peer rows will populate automatically once the file exists.
          </div>
          <div className="text-gray-500 mt-2">
            Sector: <span className="text-gray-300">{sector ?? 'unknown'}</span> · Ticker: <span className="text-emerald-300 font-mono">{ticker}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
