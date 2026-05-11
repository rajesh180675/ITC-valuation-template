import { CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';

import type { SensexConstituent } from '@/data/sensexData';
import { buildSectorAnalytics } from '@/utils/sensexAnalytics';
import { fmt, fmtN } from '@/components/itc/shared';
import { FactorBar } from './shared';

/* ── Typed scatter data shapes (P3.2) ───────────────────────────────────── */
export interface GrowthValuationPoint {
  name: string; x: number; y: number; z: number;
  color: string; sector: string; metric: string;
}
export interface ImpliedVsRealizedPoint {
  name: string; x: number; y: number; z: number;
  color: string; sector: string; gap: number; coe: number;
  gordonUnreliable?: boolean;
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function SectorAnalyticsTable({ data }: { data: ReturnType<typeof buildSectorAnalytics> }) {
  return (
    <div className="premium-card overflow-hidden">
      <div className="p-5 pb-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Sector Analytics</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Weight-weighted fundamentals &middot; CAPM cost of equity &middot; intra-sector concentration
          </p>
        </div>
        <span className="pill pill-muted">{data.length} sectors</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full sensex-table tabular-nums">
          <thead>
            <tr>
              <th className="text-left">Sector</th>
              <th className="text-right">Companies</th>
              <th className="text-right">Weight</th>
              <th className="text-right">Market Cap</th>
              <th className="text-right">Wt. ROE</th>
              <th className="text-right">Wt. PAT CAGR</th>
              <th className="text-right">Wt. β</th>
              <th className="text-right">CoE (CAPM)</th>
              <th className="text-right">Wt. Multiple</th>
              <th className="text-right">Intra HHI</th>
              <th className="text-left">Leader</th>
            </tr>
          </thead>
          <tbody>
            {data.map(s => (
              <tr key={s.sector}>
                <td className="text-gray-100 font-semibold">{s.sector}</td>
                <td className="text-right text-gray-300">{s.count}</td>
                <td className="text-right text-[color:var(--color-gold-light)] font-semibold">{fmtN(s.weightPct, 1)}%</td>
                <td className="text-right text-gray-300">{fmt(s.marketCapCr)}</td>
                <td className="text-right text-gray-200">{fmtN(s.weightedRoePct, 1)}%</td>
                <td className={`text-right font-semibold ${s.weightedPatCagrPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {fmtN(s.weightedPatCagrPct, 1)}%
                </td>
                <td className="text-right text-gray-300">{s.weightedBeta.toFixed(2)}</td>
                <td className="text-right text-gray-300">{fmtN(s.weightedCostOfEquityPct, 1)}%</td>
                <td className="text-right text-gray-300">
                  {s.valuationLabel} {fmtN(s.weightedValuationMultiple, 1)}x
                </td>
                <td className="text-right text-gray-400">{s.internalHHI}</td>
                <td className="text-gray-400 text-[11px] font-mono tracking-wider">{s.topConstituent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function GrowthValuationScatter(props: {
  data: GrowthValuationPoint[]; medianPatCagr: number; rangePeriods: number;
}) {
  const avgMultiple = props.data.length
    ? props.data.reduce((s, d) => s + d.y, 0) / props.data.length
    : 0;
  return (
    <div className="glass-card p-5 lg:col-span-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">Growth × Valuation Map</h3>
        <span className="text-[10px] text-gray-500">Bubble = log(market cap)</span>
      </div>
      <p className="text-[11px] text-gray-500 mb-4">X: {props.rangePeriods}Y PAT CAGR · Y: P/E or P/B multiple</p>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
          <XAxis type="number" dataKey="x" name="PAT CAGR" unit="%" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'PAT CAGR (%)', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name="Multiple" unit="x" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'Valuation Multiple (x)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <ReferenceLine x={props.medianPatCagr} stroke="#d4a843" strokeDasharray="3 3" opacity={0.5}
            label={{ value: 'Median CAGR', fill: '#d4a843', fontSize: 9, position: 'insideTopRight' }} />
          <ReferenceLine y={avgMultiple} stroke="#3b82f6" strokeDasharray="3 3" opacity={0.5}
            label={{ value: 'Avg Multiple', fill: '#3b82f6', fontSize: 9, position: 'insideTopLeft' }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-xs">
                <p className="text-white font-semibold">{d.name}</p>
                <p className="text-gray-400">{d.sector}</p>
                <p className="text-gray-300 mt-1">CAGR: <span className="tabular-nums text-emerald-300">{fmtN(d.x, 1)}%</span></p>
                <p className="text-gray-300">{d.metric}: <span className="tabular-nums text-[color:var(--color-gold-light)]">{fmtN(d.y, 1)}x</span></p>
              </div>
            );
          }} />
          <Scatter data={props.data} isAnimationActive={true}>
            {props.data.map(e => <Cell key={e.name} fill={e.color} fillOpacity={0.75} stroke={e.color} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function ImpliedVsRealizedScatter({ data, rangePeriods }: { data: ImpliedVsRealizedPoint[]; rangePeriods: number }) {
  const xMin = Math.min(...data.map(d => Math.min(d.x, d.y)), -2);
  const xMax = Math.max(...data.map(d => Math.max(d.x, d.y)), 20);

  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Market-Implied vs Delivered Growth</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            X: perpetual growth implied by today&apos;s valuation (reverse Gordon, CAPM CoE) &middot; Y: {rangePeriods}Y realized PAT CAGR
          </p>
        </div>
        <div className="text-[10px] text-gray-500 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[color:var(--color-gold-light)] rounded" />y = x (fair)</span>
          <span>Above = market under-pricing</span>
          <span className="text-amber-400/80">⚠ = Gordon model unreliable (zero-payout)</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
          <XAxis type="number" dataKey="x" name="Implied g" unit="%" domain={[Math.floor(xMin), Math.ceil(xMax)]} tickFormatter={(v: number) => Math.round(v).toString()} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'Implied Perpetual Growth (%)', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name="Delivered CAGR" unit="%" domain={[Math.floor(xMin), Math.ceil(xMax)]} tickFormatter={(v: number) => Math.round(v).toString()} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'Realized PAT CAGR (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <ReferenceLine segment={[{ x: xMin, y: xMin }, { x: xMax, y: xMax }]} stroke="#d4a843" strokeDasharray="4 4" opacity={0.7} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as ImpliedVsRealizedPoint;
            const verdict = d.gap > 3 ? 'Historically outran implied growth' : d.gap < -3 ? 'Expectation above track record' : 'Priced near historical pace';
            const verdictColor = d.gap > 3 ? 'text-emerald-300' : d.gap < -3 ? 'text-red-300' : 'text-gray-300';
            return (
              <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-xs">
                <p className="text-white font-semibold">{d.name}</p>
                <p className="text-gray-400">{d.sector}</p>
                <div className="h-px bg-border my-1.5" />
                <p className="text-gray-300">Implied g: <span className="tabular-nums text-[color:var(--color-gold-light)]">{fmtN(d.x, 1)}%</span></p>
                <p className="text-gray-300">Delivered: <span className="tabular-nums text-emerald-300">{fmtN(d.y, 1)}%</span></p>
                <p className="text-gray-300">CoE: <span className="tabular-nums text-white">{fmtN(d.coe, 1)}%</span></p>
                <p className={`mt-1 ${verdictColor}`}>{verdict}</p>
                {d.gordonUnreliable && (
                  <p className="mt-1 text-amber-400 text-[10px]">⚠ Gordon model unreliable — near-zero payout ratio. Implied growth is not meaningful.</p>
                )}
              </div>
            );
          }} />
          <Scatter data={data} isAnimationActive={true}>
            {data.map(e => <Cell key={e.name} fill={e.gordonUnreliable ? '#f59e0b' : e.color} fillOpacity={e.gordonUnreliable ? 0.5 : 0.78} stroke={e.color} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function FactorScorecard({ rows, selectedId, onSelect }: {
  rows: { company: SensexConstituent; scores: { quality: number; value: number; growth: number; momentum: number; composite: number } }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const top = [...rows].sort((a, b) => b.scores.composite - a.scores.composite).slice(0, 12);
  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Factor Scorecard</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Percentile-ranked across the filtered universe &middot; Quality / Value / Growth / Momentum
          </p>
        </div>
        <div className="text-[10px] text-gray-500 flex items-center gap-3">
          <InlineLegend color="#60a5fa" label="Quality" />
          <InlineLegend color="#22c55e" label="Value" />
          <InlineLegend color="#d4a843" label="Growth" />
          <InlineLegend color="#a855f7" label="Momentum" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {top.map(r => {
          const s = r.scores;
          const isSelected = r.company.id === selectedId;
          return (
            <button
              key={r.company.id}
              onClick={() => onSelect(r.company.id)}
              className={`sector-chip text-left w-full ${isSelected ? 'ring-1 ring-[color:var(--color-gold-light)]/50' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-6 rounded-sm" style={{ backgroundColor: r.company.color }} />
                  <div>
                    <div className="text-[13px] font-semibold text-gray-100">{r.company.ticker}</div>
                    <div className="text-[10px] text-gray-500">{r.company.sector}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-widest text-gray-500">Composite</div>
                  <div className="text-base font-bold text-[color:var(--color-gold-light)] tabular-nums">{fmtN(s.composite, 0)}</div>
                </div>
              </div>
              <FactorBar label="Quality" value={s.quality} color="#60a5fa" />
              <FactorBar label="Value" value={s.value} color="#22c55e" />
              <FactorBar label="Growth" value={s.growth} color="#d4a843" />
              <FactorBar label="Momentum" value={s.momentum} color="#a855f7" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* FactorBar — imported from ./shared.tsx (P3.1) */

/* ══════════════════════════════════════════════════════════════════════════ */

export function InlineLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}