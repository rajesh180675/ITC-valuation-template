import { useState } from 'react';
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { Info, ShieldCheck } from 'lucide-react';

import {
  nifty250Constituents,
  NIFTY250_CONSTITUENT_COUNT,
  NIFTY250_INDEX_LABEL,
  NIFTY250_PROVENANCE,
} from '@/data/nifty250Data';
import type { SensexConstituent } from '@/data/sensexData';
import {
  buildSensexSectorSummary,
  buildSensexIndexTimeSeries,
} from '@/utils/itcModel';
import {
  MARKET_PARAMS,
  type MagicFormulaScore,
  type SectorMomentumRow,
} from '@/utils/sensexAnalytics';
import { ChartTooltip, fmt, fmtN } from '@/components/itc/shared';
import { Kpi } from './shared';

/* ────────────────────────────────────────────────────────────────────────── */

export type Filter = 'all' | 'financial' | 'nonFinancial';
export type SortKey =
  | 'weight' | 'mcap' | 'topline' | 'toplineCagr' | 'profitCagr'
  | 'roe' | 'valuation' | 'beta' | 'coe' | 'impliedG' | 'composite';

/* ══════════════════════════════════════════════════════════════════════════ */

export function HeroBanner(props: {
  filteredCount: number;
  filter: Filter;
  setFilter: (f: Filter) => void;
  rangeLabel: string;
  rangeStart: number;
  rangeEnd: number;
  totalYears: number;
  setQuickRange: (n: number) => void;
  totalMarketCap: number;
  bfsiWeight: number;
  corpWeight: number;
  largestSector?: { sector: string; weightPct: number };
  universeProfitCagr: number;
  medianPatCagr: number;
  weightedBeta: number;
  weightedCoe: number;
  concentration: { hhi: number; effectiveN: number; top5Pct: number };
  dataSource: 'loading' | 'screener-in' | 'reference';
}) {
  const {
    filteredCount, filter, setFilter, rangeLabel, rangeStart, rangeEnd, totalYears, setQuickRange,
    totalMarketCap, bfsiWeight, corpWeight, largestSector, universeProfitCagr, medianPatCagr,
    weightedBeta, weightedCoe, concentration, dataSource,
  } = props;

  return (
    <div className="premium-card p-6 md:p-7">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-3 mb-3">
            <span className="pill"><span className="ticker-dot" /> Live Universe</span>
            <span className="pill pill-muted">{NIFTY250_INDEX_LABEL} · {NIFTY250_CONSTITUENT_COUNT} Constituents</span>
            {dataSource === 'screener-in' && <span className="pill pill-muted text-[10px]" style={{ borderColor: '#22c55e', color: '#22c55e' }}>Real Data</span>}
            {dataSource === 'reference' && <span className="pill pill-muted text-[10px]" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>Reference</span>}
            <span className="pill pill-muted">{rangeLabel}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Nifty LargeMidcap 250 <span className="text-[color:var(--color-gold-light)]">Feature Universe</span>
          </h2>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl leading-relaxed">
            Institutional-grade cross-sectional view of {NIFTY250_CONSTITUENT_COUNT} real NSE-listed large &amp; mid-cap names &mdash;
            10 fiscal years (FY2015&ndash;FY2024) anchored to FY24 reported financials, CAPM cost of equity,
            reverse-Gordon implied growth, Greenblatt Magic Formula, sector momentum and valuation z-scores.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="segmented">
            {([
              { id: 'all' as const, label: `All ${NIFTY250_CONSTITUENT_COUNT}` },
              { id: 'nonFinancial' as const, label: 'Corporates' },
              { id: 'financial' as const, label: 'BFSI' },
            ]).map(opt => (
              <button key={opt.id} onClick={() => setFilter(opt.id)} className={filter === opt.id ? 'active' : ''}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="segmented">
            {[5, 10, 14].map(n => {
              const isActive = rangeStart === Math.max(0, totalYears - 1 - n) && rangeEnd === totalYears - 1;
              return (
                <button key={n} onClick={() => setQuickRange(n)} className={isActive ? 'active' : ''}>
                  {n}Y
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="hairline-divider my-5" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-5">
        <Kpi label="Constituents" value={String(filteredCount)} sub={`of ${nifty250Constituents.length} total`} />
        <Kpi label="Market Cap" value={fmt(totalMarketCap)} sub="aggregate float" />
        <Kpi label="BFSI / Corp Mix" value={`${fmtN(bfsiWeight, 1)} / ${fmtN(corpWeight, 1)}`} sub="by index weight" tabular />
        <Kpi label="Lead Sector" value={largestSector?.sector ?? '—'} sub={largestSector ? `${fmtN(largestSector.weightPct, 1)}% weight` : '—'} gold smallValue />
        <Kpi label="Universe PAT CAGR" value={`${fmtN(universeProfitCagr, 1)}%`} sub={rangeLabel} tone={universeProfitCagr >= 0 ? 'up' : 'down'} />
        <Kpi label="Median PAT CAGR" value={`${fmtN(medianPatCagr, 1)}%`} sub="constituent median" tone={medianPatCagr >= 0 ? 'up' : 'down'} />
        <Kpi label="Wt. β / CoE" value={`${weightedBeta.toFixed(2)} · ${fmtN(weightedCoe, 1)}%`} sub={`Rf ${MARKET_PARAMS.riskFreeRatePct}% + ERP ${MARKET_PARAMS.equityRiskPremiumPct}%`} tabular smallValue />
        <Kpi label="HHI / Effective N" value={`${concentration.hhi} · ${concentration.effectiveN}`} sub={`Top-5 holds ${fmtN(concentration.top5Pct, 1)}%`} tabular smallValue />
      </div>
    </div>
  );
}

/* The Kpi component is now in ./shared.tsx (P3.1 — removed duplicate) */


/* ══════════════════════════════════════════════════════════════════════════ */

export function RangeSelector(props: {
  startFy: string; endFy: string; rangePeriods: number;
  rangeStart: number; rangeEnd: number; totalYears: number;
  setRangeStart: (n: number) => void; setRangeEnd: (n: number) => void;
}) {
  const { startFy, endFy, rangePeriods, rangeStart, rangeEnd, totalYears, setRangeStart, setRangeEnd } = props;
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
        <div>
          <div className="kpi-eyebrow">Analysis Window</div>
          <div className="text-lg font-semibold text-white mt-1">
            {startFy} <span className="text-gray-500 mx-2">→</span> {endFy}
            <span className="ml-3 text-sm font-normal text-[color:var(--color-gold-light)]">{rangePeriods}Y lookback</span>
          </div>
        </div>
        <div className="text-[11px] text-gray-400 flex items-center gap-2">
          <Info size={13} /> CAGR, factor scores and implied growth all recompute live with the window.
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        <div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
            <span>Start FY</span>
            <span className="text-[color:var(--color-gold-light)] font-semibold tabular-nums">{startFy}</span>
          </div>
          <input type="range" min={0} max={totalYears - 2} value={rangeStart}
            onChange={e => {
              const v = Number(e.target.value);
              setRangeStart(v);
              if (v >= rangeEnd) setRangeEnd(Math.min(totalYears - 1, v + 1));
            }}
            className="range-slider w-full" />
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
            <span>End FY</span>
            <span className="text-[color:var(--color-gold-light)] font-semibold tabular-nums">{endFy}</span>
          </div>
          <input type="range" min={1} max={totalYears - 1} value={rangeEnd}
            onChange={e => {
              const v = Number(e.target.value);
              setRangeEnd(v);
              if (v <= rangeStart) setRangeStart(Math.max(0, v - 1));
            }}
            className="range-slider w-full" />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function UniverseEarningsPower(props: {
  indexSeries: ReturnType<typeof buildSensexIndexTimeSeries>;
  startFy: string; endFy: string;
  filteredCount: number;
  universeToplineCagr: number; universeProfitCagr: number; averageRoe: number;
}) {
  const { indexSeries, startFy, endFy, filteredCount, universeToplineCagr, universeProfitCagr, averageRoe } = props;
  return (
    <div className="premium-card p-5 xl:col-span-2">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Universe Earnings Power</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Aggregate topline &amp; net profit across {filteredCount} constituents</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={indexSeries}>
          <defs>
            <linearGradient id="gradTopline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4a843" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#d4a843" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
          <XAxis dataKey="fy" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
          <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <ReferenceLine yAxisId="left" x={startFy} stroke="#d4a843" strokeDasharray="3 3" opacity={0.6} />
          <ReferenceLine yAxisId="left" x={endFy} stroke="#d4a843" strokeDasharray="3 3" opacity={0.6} />
          <Area yAxisId="left" type="monotone" dataKey="toplineCr" name="Topline" stroke="#3b82f6" strokeWidth={2} fill="url(#gradTopline)" isAnimationActive={true} />
          <Area yAxisId="right" type="monotone" dataKey="netProfitCr" name="Net Profit" stroke="#d4a843" strokeWidth={2} fill="url(#gradProfit)" isAnimationActive={true} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
        <SmallStat label="Topline CAGR" value={`${fmtN(universeToplineCagr, 1)}%`} positive={universeToplineCagr >= 0} />
        <SmallStat label="PAT CAGR" value={`${fmtN(universeProfitCagr, 1)}%`} positive={universeProfitCagr >= 0} />
        <SmallStat label="Avg ROE (last FY)" value={`${fmtN(averageRoe, 1)}%`} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

function SmallStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const color = positive === undefined ? 'text-white' : positive ? 'text-emerald-300' : 'text-red-300';
  return (
    <div>
      <div className="kpi-eyebrow">{label}</div>
      <div className={`text-lg font-bold mt-1 tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function SectorComposition({ sectorSummary, filteredCompanies }: {
  sectorSummary: ReturnType<typeof buildSensexSectorSummary>;
  filteredCompanies: SensexConstituent[];
}) {
  return (
    <div className="premium-card p-5">
      <h3 className="text-sm font-semibold text-white mb-1">Sector Composition</h3>
      <p className="text-[11px] text-gray-500 mb-4">Weight distribution across the filtered set</p>
      <div className="space-y-2">
        {sectorSummary.map((sector, i) => {
          const topCompany = filteredCompanies
            .filter(c => c.sector === sector.sector)
            .sort((a, b) => b.weightPct - a.weightPct)[0];
          const pct = sector.weightPct;
          return (
            <div key={sector.sector} className="sector-chip">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500 w-4">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm font-semibold text-gray-100">{sector.sector}</span>
                </div>
                <span className="text-sm font-bold text-[color:var(--color-gold-light)] tabular-nums">{fmtN(pct, 1)}%</span>
              </div>
              <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(100, pct * 2.5)}%`,
                  background: `linear-gradient(90deg, ${topCompany?.color ?? '#3b82f6'}, ${topCompany?.color ?? '#3b82f6'}aa)`,
                }} />
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {sector.count} {sector.count === 1 ? 'company' : 'companies'} · {fmt(sector.marketCapCr)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function TopWeightsChart({ data }: { data: { name: string; weightPct: number; color: string }[] }) {
  return (
    <div className="glass-card p-5 lg:col-span-2">
      <h3 className="text-sm font-semibold text-white mb-1">Top Weights</h3>
      <p className="text-[11px] text-gray-500 mb-4">Index weight leaderboard</p>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
          <YAxis dataKey="name" type="category" tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }} width={80} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Bar dataKey="weightPct" name="Weight %" radius={[0, 4, 4, 0]} isAnimationActive={true}>
            <LabelList dataKey="weightPct" position="right" formatter={(v: any) => `${Number(v).toFixed(1)}%`} style={{ fill: '#cbd5e1', fontSize: 10 }} />
            {data.map(e => <Cell key={e.name} fill={e.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */



/* ══════════════════════════════════════════════════════════════════════════ */

export function MagicFormulaCard({
  rows,
  onSelect,
}: {
  rows: MagicFormulaScore[];
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  const top = rows.slice(0, 12);
  const chartData = top.map((r) => ({
    name: r.ticker,
    capEff: r.capitalEfficiencyPct,
    yld: r.earningsYieldPct,
    combined: r.rankCombined,
  }));

  return (
    <div className="premium-card p-5">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Magic Formula Screen — Top 12</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Greenblatt&apos;s combined rank of capital efficiency (ROCE / ROE) + earnings yield (E/P or ROE/PB).
            Lowest combined rank = best business at the fairest price.
          </p>
        </div>
        <span className="pill pill-muted">screened across {rows.length} names</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] tabular-nums">
            <thead>
              <tr className="text-gray-500 border-b border-border/50">
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Sector</th>
                <th className="text-right py-2">Cap. Eff.</th>
                <th className="text-right py-2">E/Yield</th>
                <th className="text-right py-2">Σ rank</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, idx) => (
                <tr
                  key={r.id}
                  className="border-b border-border/30 cursor-pointer hover:bg-white/5 transition"
                  onClick={() => onSelect(r.id)}
                >
                  <td className="py-1.5 text-[color:var(--color-gold-light)] font-bold">{idx + 1}</td>
                  <td className="py-1.5 text-gray-100">
                    <div className="font-semibold text-[12px]">{r.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{r.ticker}</div>
                  </td>
                  <td className="py-1.5 text-gray-400 text-[10px]">{r.sector}</td>
                  <td className="py-1.5 text-right text-emerald-300 font-semibold">{fmtN(r.capitalEfficiencyPct, 1)}%</td>
                  <td className="py-1.5 text-right text-amber-200 font-semibold">{fmtN(r.earningsYieldPct, 1)}%</td>
                  <td className="py-1.5 text-right text-white font-bold">{r.rankCombined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 12, right: 16, bottom: 36, left: 8 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
            <XAxis
              type="number" dataKey="capEff" name="Capital Efficiency"
              tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false}
              label={{ value: 'Capital Efficiency (ROCE / ROE %)', position: 'bottom', offset: 18, fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              type="number" dataKey="yld" name="Earnings Yield"
              tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false}
              label={{ value: 'Earnings Yield (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="combined" range={[280, 60]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
              content={<ChartTooltip />}
            />
            <Scatter data={chartData} fill="#d4a843">
              {chartData.map((_, i) => (
                <Cell key={i} fill="#d4a843" />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}