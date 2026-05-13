import { useMemo } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Legend,
  Bar,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Scale } from 'lucide-react';
import { calculateRatios } from '@/utils/annualReportRatios';
import type { AnnualReportYearData } from '@/utils/annualReportCashFlow';

/* ── Chart Panel ───────────────────────────────────────────────────────── */
function ChartPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">{icon} {title}</h3>
      <ResponsiveContainer width="100%" height={260}>{children}</ResponsiveContainer>
    </div>
  );
}

/* ── Tab ──────────────────────────────────────────────────────────────────── */
interface RatiosTabProps {
  yearsData: Record<string, AnnualReportYearData>;
  years: string[];
}

export function RatiosTab({ yearsData, years }: RatiosTabProps) {
  const ratios = useMemo(() => calculateRatios(yearsData, years), [yearsData, years]);

  if (ratios.length === 0) {
    return <div className="glass-card p-5 text-gray-400">No data for ratio analysis.</div>;
  }

  const latest = ratios[ratios.length - 1];

  // Prepare chart data
  const marginData = ratios.map(r => ({
    fy: r.fy,
    'EBITDA Margin': r.ebitdaMargin,
    'PBT Margin': r.pbtMargin,
    'PAT Margin': r.patMargin,
  }));

  const returnData = ratios.map(r => ({
    fy: r.fy,
    'ROE': r.roe,
    'ROA': r.roa,
    'ROCE': r.roce,
  }));

  const dupontData = ratios.map(r => ({
    fy: r.fy,
    'Net Margin': r.dupontMargin,
    'Asset Turnover': r.dupontTurnover,
    'Financial Leverage': r.dupontLeverage,
  }));

  // Latest KPI snap
  const kpiCards = [
    { label: 'EBITDA Margin', val: latest.ebitdaMargin },
    { label: 'PAT Margin', val: latest.patMargin },
    { label: 'ROE', val: latest.roe },
    { label: 'ROCE', val: latest.roce },
    { label: 'Asset Turnover', val: latest.assetTurnover, suffix: 'x' },
    { label: 'Debt/Equity', val: latest.debtToEquity, suffix: 'x' },
  ];

  // Bank-specific cards
  if (latest.isFinancial) {
    kpiCards.push(
      { label: 'Cost/Income', val: latest.costToIncome },
      { label: 'Provisions/Rev', val: latest.provisionsRatio },
    );
  }

  return (
    <div className="space-y-4">
      {/* Company Type Badge */}
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
          latest.isFinancial
            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
        }`}>
          {latest.isFinancial ? 'Financial' : 'Non-Financial'}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="flex gap-3 flex-wrap">
        {kpiCards.map(({ label, val, suffix }) => (
          <div key={label} className="glass-card p-3 flex flex-col gap-0.5 min-w-[130px]">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
            <span className={`text-lg font-bold tabular-nums ${val != null && val < 0 ? 'text-rose-400' : 'text-white'}`}>
              {val != null ? `${val.toFixed(1)}${suffix || '%'}` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPanel title="Margin Trends" icon={<TrendingUp size={14} className="text-emerald-400" />}>
          <ComposedChart data={marginData}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[-5, 50]} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line dataKey="EBITDA Margin" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line dataKey="PBT Margin" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line dataKey="PAT Margin" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ChartPanel>

        <ChartPanel title="Return Metrics" icon={<Activity size={14} className="text-emerald-400" />}>
          <ComposedChart data={returnData}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[-10, 40]} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line dataKey="ROE" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line dataKey="ROA" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line dataKey="ROCE" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ChartPanel>

        <ChartPanel title="DuPont Components" icon={<Scale size={14} className="text-emerald-400" />}>
          <ComposedChart data={dupontData}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line dataKey="Net Margin" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line dataKey="Asset Turnover" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line dataKey="Financial Leverage" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ChartPanel>

        <ChartPanel title="Leverage & Cash" icon={<TrendingDown size={14} className="text-emerald-400" />}>
          <ComposedChart data={ratios}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="debtToEquity" name="Debt/Equity (x)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Line dataKey="cashConversion" name="Cash Conv (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line dataKey="fcfYield" name="FCF Yield (%)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ChartPanel>
      </div>

      {/* DuPont Table */}
      <div className="glass-card p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Scale size={14} className="text-emerald-400" /> DuPont Decomposition
        </h3>
        <table className="w-full text-xs tabular-nums" style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 text-gray-400 font-medium">Component</th>
              {ratios.map(r => (
                <th key={r.fy} className="text-right py-2 px-2 text-gray-400 font-medium">{r.fy.replace('FY', "FY '")}</th>
              ))}
              <th className="text-right py-2 px-2 text-gray-400 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Net Profit Margin', values: ratios.map(r => r.dupontMargin) },
              { label: 'Asset Turnover', values: ratios.map(r => r.dupontTurnover) },
              { label: 'Financial Leverage', values: ratios.map(r => r.dupontLeverage) },
            ].map((row, i) => {
              const firstValid = row.values.find(v => v != null);
              const lastValid = [...row.values].reverse().find(v => v != null);
              const trend = firstValid != null && lastValid != null ? lastValid - firstValid : null;
              return (
                <tr key={i} className="hover:bg-white/[0.03]">
                  <td className="py-1.5 pr-4 text-gray-300 text-[11px] font-medium">{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} className={`text-right py-1.5 px-2 text-[11px] ${v != null ? 'text-white' : 'text-gray-600'}`}>
                      {v != null ? (row.label.includes('Turnover') || row.label.includes('Leverage') ? `${v.toFixed(2)}x` : `${v.toFixed(1)}%`) : '—'}
                    </td>
                  ))}
                  <td className={`text-right py-1.5 px-2 text-[11px] ${trend != null && trend < 0 ? 'text-rose-400' : trend != null && trend > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
                    {trend != null ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)}pp` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Efficiency & Leverage Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5 overflow-x-auto">
          <h3 className="text-sm font-semibold text-white mb-3">Efficiency & Leverage</h3>
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-gray-400 font-medium">Metric</th>
                {ratios.map(r => (
                  <th key={r.fy} className="text-right py-2 px-2 text-gray-400 font-medium">{r.fy.replace('FY', "FY '")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Asset Turnover', values: ratios.map(r => r.assetTurnover), suffix: 'x' },
                { label: 'Equity Turnover', values: ratios.map(r => r.equityTurnover), suffix: 'x' },
                { label: 'Debt / Equity', values: ratios.map(r => r.debtToEquity), suffix: 'x' },
                { label: 'Debt / Assets', values: ratios.map(r => r.debtToAssets), suffix: '%' },
                { label: 'Equity Ratio', values: ratios.map(r => r.equityRatio), suffix: '%' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.03]">
                  <td className="py-1.5 pr-4 text-gray-300 text-[11px]">{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} className={`text-right py-1.5 px-2 text-[11px] ${v != null ? 'text-white' : 'text-gray-600'}`}>
                      {v != null ? `${v.toFixed(1)}${row.suffix}` : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-card p-5 overflow-x-auto">
          <h3 className="text-sm font-semibold text-white mb-3">Cash Ratios</h3>
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-gray-400 font-medium">Metric</th>
                {ratios.map(r => (
                  <th key={r.fy} className="text-right py-2 px-2 text-gray-400 font-medium">{r.fy.replace('FY', "FY '")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Cash Conversion', values: ratios.map(r => r.cashConversion), suffix: '%' },
                { label: 'FCF Yield', values: ratios.map(r => r.fcfYield), suffix: '%' },
                { label: 'Dividend Payout', values: ratios.map(r => r.dividendPayout), suffix: '%' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.03]">
                  <td className="py-1.5 pr-4 text-gray-300 text-[11px]">{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} className={`text-right py-1.5 px-2 text-[11px] ${v != null ? 'text-white' : 'text-gray-600'}`}>
                      {v != null ? `${v.toFixed(1)}${row.suffix}` : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
