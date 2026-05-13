import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, Percent, PieChart as PieChartIcon } from 'lucide-react';
import { Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Legend, Pie, Cell } from 'recharts';
import { fmt, fmtN } from '@/components/itc/shared';
import type { AnnualReportYearData } from '@/utils/annualReportCashFlow';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface SparkKPI {
  label: string;
  value: number | null;
  key: string; // data key for sparkline
  suffix?: string;
  color: string;
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function safePct(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null;
  return Math.round((a / b) * 1000) / 10;
}

function safeDiv(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null;
  return Math.round((a / b) * 1000) / 10;
}

function cagr(first: number | null, last: number | null, n: number): number | null {
  if (first == null || last == null || first <= 0 || n <= 1) return null;
  return ((last / first) ** (1 / (n - 1)) - 1) * 100;
}

/* ─── Sparkline (inline SVG, no deps) ──────────────────────────────────── */
function Sparkline({ data, color, height = 40, strokeWidth = 2 }: { data: (number | null)[]; color: string; height?: number; strokeWidth?: number }) {
  const valid = data.filter((d): d is number => d != null && Number.isFinite(d));
  if (valid.length < 2) return <div className="text-gray-600 text-[10px]">—</div>;

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const pad = 4;
  const w = 120;
  const h = height;

  const points = valid.map((v, i) => {
    const x = pad + (i / (valid.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  const lastPoint = (() => {
    const v = valid[valid.length - 1];
    const i = valid.length - 1;
    const x = pad + (i / (valid.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return { cx: x, cy: y };
  })();

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" height={h} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth={strokeWidth} points={points} />
      <circle cx={lastPoint.cx} cy={lastPoint.cy} r={3} fill={color} />
    </svg>
  );
}

/* ─── KPI Card with Sparkline ─────────────────────────────────────────── */
function OverviewKpiCard({ label, value, trend, sparkData, color, icon: Icon, suffix = '' }: {
  label: string; value: number | null; trend?: number | null; sparkData: (number | null)[]; color: string; icon: any; suffix?: string;
}) {
  const valStr = value != null ? (suffix === '%' ? `${value.toFixed(1)}%` : fmt(value)) : '—';
  const trendSign = trend != null ? (trend > 0 ? '+' : '') : '';
  const trendColor = trend != null ? (trend > 5 ? 'text-emerald-400' : trend < -5 ? 'text-rose-400' : 'text-gray-500') : '';

  return (
    <div className="glass-card p-3 flex flex-col gap-2 min-w-[160px] flex-1">
      <div className="flex items-center gap-2">
        <Icon size={14} className={color.replace('bg-', 'text-').replace('500', '400')} style={{ color }} />
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-lg font-bold text-white tabular-nums">{valStr}</span>
        {trend != null && (
          <span className={`text-[10px] font-mono ${trendColor}`}>
            {trendSign}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="h-[40px] opacity-80">
        <Sparkline data={sparkData} color={color} />
      </div>
    </div>
  );
}

/* ─── Ratio Table ──────────────────────────────────────────────────────── */
function RatioTable({ data, years }: { data: Record<string, AnnualReportYearData>; years: string[] }) {
  const ratios = useMemo(() => {
    return years.map(fy => {
      const y = data[fy];
      const pnl = y?.profitLoss?.kpIs ?? {};
      const bs = y?.balanceSheet?.kpIs ?? {};
      const cf = y?.cashFlow?.kpIs ?? {};

      const rev = pnl.revenueCr ?? null;
      const pat = pnl.patCr ?? null;
      const pbt = pnl.pbtCr ?? null;
      const ta = bs.totalAssetsCr ?? null;
      const eq = bs.equityCr ?? null;
      const tel = bs.totalEquityLiabCr ?? null;
      const cfo = cf.cfoCr ?? null;
      const fcf = cf.fcfCr ?? null;

      // Estimate EBITDA = PBT + Finance Cost + Depreciation
      const ebitda = pbt != null && pnl.financeCostCr != null && pnl.depreciationCr != null
        ? pbt + pnl.financeCostCr + pnl.depreciationCr : null;

      return {
        fy,
        'PBT Margin': safePct(pbt, rev),
        'PAT Margin': safePct(pat, rev),
        'EBITDA Margin': safePct(ebitda, rev),
        'ROE': safePct(pat, eq),
        'ROA': safePct(pat, ta),
        'Asset Turnover': safeDiv(rev, ta),
        'Cash Conversion': cfo != null && pat != null && pat !== 0 ? Math.round((cfo / pat) * 1000) / 10 : null,
        'FCF/PAT': safePct(fcf, pat),
        'Equity Ratio': safePct(eq, ta),
      };
    });
  }, [data, years]);

  const metrics = ['PBT Margin', 'PAT Margin', 'EBITDA Margin', 'ROE', 'ROA', 'Asset Turnover', 'Cash Conversion', 'FCF/PAT', 'Equity Ratio'];

  return (
    <div className="glass-card p-4 overflow-x-auto">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Percent size={14} className="text-emerald-400" /> Key Ratios
      </h3>
      <table className="w-full text-xs tabular-nums" style={{ minWidth: 500 }}>
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 text-gray-400 font-medium">Ratio</th>
            {years.map(fy => (
              <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "'")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => (
            <tr key={metric} className="hover:bg-white/[0.03]">
              <td className="py-1.5 pr-4 text-gray-300 text-[11px]">{metric}</td>
              {ratios.map((r, i) => {
                const v = r[metric as keyof typeof r] as number | null;
                return (
                  <td key={i} className={`text-right py-1.5 px-2 text-[11px] ${v != null ? 'text-white' : 'text-gray-600'}`}>
                    {v != null ? `${v.toFixed(1)}%` : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Segment Donut (mini, for Overview) ───────────────────────────────── */
function SegmentMiniDonut({ segData }: { segData: any }) {
  const series = segData?.segment_time_series;
  if (!series) return null;

  const allFys = [...new Set(Object.values(series as Record<string, Record<string, number>>).flatMap(v => Object.keys(v)))].sort();
  const latestFy = allFys[allFys.length - 1];

  const data = Object.entries(series)
    .filter(([k]) => k.startsWith('revenue|'))
    .map(([k, v]) => ({ name: k.split('|')[1], value: (v as any)[latestFy] || 0 }))
    .filter(d => d.value > 0 && !d.name.toLowerCase().includes('total'))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#10b981', '#34d399', '#f59e0b', '#f97316', '#8b5cf6'];

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <PieChartIcon size={14} className="text-emerald-400" /> Revenue Mix ({latestFy.replace('FY', "FY '")})
      </h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Revenue vs PAT Trend Chart ──────────────────────────────────────── */
function TrendChart({ kpiData }: { kpiData: any[] }) {
  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <TrendingUp size={14} className="text-emerald-400" /> Revenue & PAT Trend
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={kpiData}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="rev" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Line dataKey="pat" name="PAT" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Main Overview Tab ────────────────────────────────────────────────── */
export function OverviewTab({
  yearsData,
  years,
  segData,
}: {
  yearsData: Record<string, AnnualReportYearData>;
  years: string[];
  segData: any;
}) {
  // Build KPI time-series
  const kpiTimeSeries = useMemo(() => {
    return years.map(fy => {
      const y = yearsData[fy];
      const pnl = y?.profitLoss?.kpIs ?? {};
      const bs = y?.balanceSheet?.kpIs ?? {};
      const cf = y?.cashFlow?.kpIs ?? {};

      const rev = pnl.revenueCr ?? null;
      const pat = pnl.patCr ?? null;
      const pbt = pnl.pbtCr ?? null;
      const ta = bs.totalAssetsCr ?? null;
      const eq = bs.equityCr ?? null;
      const cfo = cf.cfoCr ?? null;
      const fcf = cf.fcfCr ?? null;

      return { fy, rev, pat, pbt, ta, eq, cfo, fcf };
    });
  }, [yearsData, years]);

  const latest = kpiTimeSeries[kpiTimeSeries.length - 1];
  const first = kpiTimeSeries[0];
  const prev = kpiTimeSeries.length > 1 ? kpiTimeSeries[kpiTimeSeries.length - 2] : null;

  const yoy = (v: number | null, p: number | null): number | null =>
    v != null && p != null && p !== 0 ? ((v - p) / Math.abs(p)) * 100 : null;

  // Build chart data for recharts
  const chartData = kpiTimeSeries.map(d => ({
    fy: d.fy,
    rev: d.rev,
    pat: d.pat,
  }));

  return (
    <div className="space-y-4">
      {/* KPI Sparkline Cards */}
      <div className="flex gap-3 flex-wrap">
        <OverviewKpiCard
          label="Revenue" icon={TrendingUp} color="#10b981"
          value={latest?.rev ?? null} trend={yoy(latest?.rev ?? null, prev?.rev ?? null)}
          sparkData={kpiTimeSeries.map(d => d.rev)} suffix="Cr"
        />
        <OverviewKpiCard
          label="PAT" icon={DollarSign} color="#f59e0b"
          value={latest?.pat ?? null} trend={yoy(latest?.pat ?? null, prev?.pat ?? null)}
          sparkData={kpiTimeSeries.map(d => d.pat)} suffix="Cr"
        />
        <OverviewKpiCard
          label="CFO" icon={DollarSign} color="#3b82f6"
          value={latest?.cfo ?? null} trend={yoy(latest?.cfo ?? null, prev?.cfo ?? null)}
          sparkData={kpiTimeSeries.map(d => d.cfo)} suffix="Cr"
        />
        <OverviewKpiCard
          label="FCF" icon={DollarSign} color="#8b5cf6"
          value={latest?.fcf ?? null} trend={yoy(latest?.fcf ?? null, prev?.fcf ?? null)}
          sparkData={kpiTimeSeries.map(d => d.fcf)} suffix="Cr"
        />
        <OverviewKpiCard
          label="ROE" icon={Percent} color="#f97316"
          value={safePct(latest?.pat ?? null, latest?.eq ?? null)} trend={null}
          sparkData={kpiTimeSeries.map(d => safePct(d.pat, d.eq))} suffix="%"
        />
        <OverviewKpiCard
          label="PAT Margin" icon={Percent} color="#ec4899"
          value={safePct(latest?.pat ?? null, latest?.rev ?? null)} trend={null}
          sparkData={kpiTimeSeries.map(d => safePct(d.pat, d.rev))} suffix="%"
        />
      </div>

      {/* Charts + Ratio Table Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendChart kpiData={chartData} />
        <RatioTable data={yearsData} years={years} />
      </div>

      {/* Segment Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <SegmentMiniDonut segData={segData} />
        </div>
        <div className="lg:col-span-2">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-400" /> 10-Year Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Revenue CAGR', val: cagr(first?.rev ?? null, latest?.rev ?? null, kpiTimeSeries.length) },
                { label: 'PAT CAGR', val: cagr(first?.pat ?? null, latest?.pat ?? null, kpiTimeSeries.length) },
                { label: 'CFO CAGR', val: cagr(first?.cfo ?? null, latest?.cfo ?? null, kpiTimeSeries.length) },
                { label: 'FCF CAGR', val: cagr(first?.fcf ?? null, latest?.fcf ?? null, kpiTimeSeries.length) },
                { label: 'Latest ROE', val: safePct(latest?.pat ?? null, latest?.eq ?? null) },
                { label: 'Latest PAT Margin', val: safePct(latest?.pat ?? null, latest?.rev ?? null) },
                { label: 'Latest Cash Conv', val: latest?.cfo != null && latest?.pat != null && latest.pat !== 0 ? Math.round((latest.cfo / latest.pat) * 1000) / 10 : null },
                { label: 'Asset Turnover', val: safeDiv(latest?.rev ?? null, latest?.ta ?? null) },
              ].map(({ label, val }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
                  <span className="text-lg font-bold text-white tabular-nums">{val != null ? `${val.toFixed(1)}${label.includes('CAGR') || label.includes('ROE') || label.includes('Margin') || label.includes('Conv') || label.includes('Turnover') ? '%' : ''}` : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
