import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Download } from 'lucide-react';

import type { SensexConstituent } from '@/data/sensexData';
import {
  computeDuPont,
  earningsVolatility,
} from '@/utils/sensexAnalytics';
import { ChartTooltip, fmt, fmtN } from '@/components/itc/shared';
import type { SortKey } from './Nifty250AnalyticsCards';

/* ══════════════════════════════════════════════════════════════════════════ */

export function ConstituentLedger(props: {
  rows: {
    company: SensexConstituent;
    last: { toplineCr: number; roePct: number; rocePct?: number };
    toplineCagr: number; profitCagr: number; valuationLabel: string;
    coe: number; impliedG: number; scores: { composite: number };
    valuationZ: number; sectorMedianMultiple: number;
  }[];
  selectedId: string;
  onSelect: (id: string) => void;
  rangeLabel: string;
  endFy: string;
  sortCaret: (key: SortKey) => string;
  toggleSort: (key: SortKey) => void;
}) {
  const { rows, selectedId, onSelect, rangeLabel, endFy, sortCaret, toggleSort } = props;

  const handleExport = () => {
    const header = [
      'Ticker', 'Name', 'Sector', 'Type', 'WeightPct', 'MarketCapCr', 'CMP',
      `Topline_${endFy}_Cr`, 'ToplineCAGR_pct', 'PATCAGR_pct',
      `ROE_${endFy}_pct`, 'Beta', 'CoE_pct', 'ValuationMetric',
      'Multiple', 'SectorMedianMultiple', 'Z_vs_sector',
      'ImpliedGrowth_pct', 'CompositeScore',
    ];
    const lines = rows.map((r) => [
      r.company.ticker,
      JSON.stringify(r.company.name),
      JSON.stringify(r.company.sector),
      r.company.reportingType === 'financial' ? 'BFSI' : 'Corp',
      r.company.weightPct.toFixed(3),
      r.company.marketCapCr,
      r.company.cmp,
      r.last?.toplineCr ?? 0,
      Number.isFinite(r.toplineCagr) ? r.toplineCagr.toFixed(2) : '',
      Number.isFinite(r.profitCagr) ? r.profitCagr.toFixed(2) : '',
      r.last?.roePct != null ? r.last.roePct.toFixed(2) : '',
      r.company.beta.toFixed(3),
      r.coe.toFixed(2),
      r.company.valuationMetric,
      r.company.valuationMultiple.toFixed(2),
      r.sectorMedianMultiple.toFixed(2),
      r.valuationZ.toFixed(3),
      Number.isFinite(r.impliedG) ? r.impliedG.toFixed(2) : '',
      r.scores.composite.toFixed(0),
    ].join(','));
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nifty250-ledger-${endFy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="premium-card overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Constituent Ledger</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Sortable · CAGR across {rangeLabel} · CAPM CoE · reverse-Gordon implied growth · valuation z-score vs sector · composite factor score
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-200 bg-black/40 hover:bg-black/60 border border-border rounded-md px-3 py-1.5 transition"
            aria-label="Download constituent ledger as CSV"
          >
            <Download size={12} /> CSV
          </button>
          <span className="pill pill-muted">{rows.length} rows</span>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[560px]">
        <table className="w-full sensex-table tabular-nums">
          <thead>
            <tr>
              <th className="text-left sticky left-0 z-20" style={{ minWidth: 220, background: 'linear-gradient(180deg, rgba(15,23,41,0.98), rgba(22,32,51,0.95))' }}>Company</th>
              <th className="text-left">Sector</th>
              <th className="text-center">Type</th>
              <th className="text-right sort-header" onClick={() => toggleSort('weight')}>Weight{sortCaret('weight')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('mcap')}>Market Cap{sortCaret('mcap')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('topline')}>{endFy} Topline{sortCaret('topline')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('toplineCagr')}>Topline CAGR{sortCaret('toplineCagr')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('profitCagr')}>PAT CAGR{sortCaret('profitCagr')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('roe')}>ROE{sortCaret('roe')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('beta')}>β{sortCaret('beta')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('coe')}>CoE{sortCaret('coe')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('valuation')}>Mult{sortCaret('valuation')}</th>
              <th className="text-right" title="Z-score of valuation multiple vs sector peers (median, MAD scaled). Negative = cheaper than peers.">Z vs sector</th>
              <th className="text-right sort-header" onClick={() => toggleSort('impliedG')}>Impl. g{sortCaret('impliedG')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('composite')}>Score{sortCaret('composite')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isSelected = r.company.id === selectedId;
              return (
                <tr key={r.company.id} onClick={() => onSelect(r.company.id)} className={`cursor-pointer ${isSelected ? 'selected' : ''}`}>
                  <td className="sticky left-0 z-10" style={{ background: isSelected ? 'rgba(28, 41, 64, 0.98)' : 'rgba(15, 23, 41, 0.96)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-8 rounded-sm shrink-0" style={{ backgroundColor: r.company.color }} />
                      <div>
                        <div className="text-gray-100 font-semibold text-[13px]">{r.company.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono tracking-wider">{r.company.ticker}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-300 text-[11px]">{r.company.sector}</td>
                  <td className="text-center">
                    <span className={`pill ${r.company.reportingType === 'financial' ? '' : 'pill-muted'}`}>
                      {r.company.reportingType === 'financial' ? 'BFSI' : 'Corp'}
                    </span>
                  </td>
                  <td className="text-right text-gray-200 font-semibold">{fmtN(r.company.weightPct, 1)}%</td>
                  <td className="text-right text-gray-300">{fmt(r.company.marketCapCr)}</td>
                  <td className="text-right text-gray-300">{fmt(r.last.toplineCr)}</td>
                  <td className={`text-right font-semibold ${r.toplineCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(r.toplineCagr, 1)}%</td>
                  <td className={`text-right font-semibold ${r.profitCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(r.profitCagr, 1)}%</td>
                  <td className="text-right text-gray-200">{fmtN(r.last.roePct, 1)}%</td>
                  <td className="text-right text-gray-300">{r.company.beta.toFixed(2)}</td>
                  <td className="text-right text-gray-300">{fmtN(r.coe, 1)}%</td>
                  <td className="text-right text-[color:var(--color-gold-light)] font-semibold">{r.valuationLabel} {fmtN(r.company.valuationMultiple, 1)}x</td>
                  <td className={`text-right font-semibold ${r.valuationZ <= -0.5 ? 'text-emerald-300' : r.valuationZ >= 0.5 ? 'text-red-300' : 'text-gray-300'}`} title={`Sector median ${r.valuationLabel} ${r.sectorMedianMultiple.toFixed(1)}x`}>
                    {r.valuationZ >= 0 ? '+' : ''}{r.valuationZ.toFixed(2)}σ
                  </td>
                  <td className={`text-right font-semibold ${r.impliedG >= 4 ? 'text-amber-200' : 'text-gray-300'}`}>{fmtN(r.impliedG, 1)}%</td>
                  <td className="text-right">
                    <ScoreChip score={r.scores.composite} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function ScoreChip({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#d4a843' : score >= 30 ? '#94a3b8' : '#ef4444';
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums font-semibold" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {Math.round(score)}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function DrillDown({ row, rangeStart, rangeEnd, rangePeriods }: {
  row: {
    company: SensexConstituent;
    first: { fy: string }; last: { fy: string; roePct: number; toplineCr: number; netProfitCr: number };
    profitCagr: number; coe: number; impliedG: number; gap: number; valuationLabel: string;
    scores: { quality: number; value: number; growth: number; momentum: number; composite: number };
  };
  rangeStart: number; rangeEnd: number; rangePeriods: number;
}) {
  const { company, first, last, profitCagr, coe, impliedG, gap, scores, valuationLabel } = row;
  const dp = computeDuPont(company);
  const vol = earningsVolatility(company.history);

  const historyChart = company.history.slice(rangeStart, rangeEnd + 1).map(h => ({
    fy: h.fy,
    Topline: h.toplineCr,
    'Net Profit': h.netProfitCr,
  }));

  return (
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-16 rounded" style={{ backgroundColor: company.color }} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="pill pill-muted font-mono">{company.ticker}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">{company.sector}</span>
              <span className="pill pill-muted">β {company.beta.toFixed(2)}</span>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">{company.name}</h3>
            <p className="text-xs text-gray-400 mt-1">
              CMP ₹{company.cmp.toLocaleString()} · {company.reportingType === 'financial' ? 'Financial reporting profile' : 'Operating company profile'} · {valuationLabel} {fmtN(company.valuationMultiple, 1)}x
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="kpi-eyebrow">Composite Score</div>
          <div className="text-3xl font-bold text-[color:var(--color-gold-light)] mt-1 tabular-nums">{Math.round(scores.composite)}</div>
          <div className="text-[11px] text-gray-400">of 100</div>
        </div>
      </div>

      <div className="hairline-divider" />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Kpi label="Market Cap" value={fmt(company.marketCapCr)} sub={`CMP ₹${company.cmp}`} smallValue />
        <Kpi label="Index Weight" value={`${fmtN(company.weightPct, 1)}%`} sub="of Nifty 250" gold smallValue />
        <Kpi label={`${rangePeriods}Y PAT CAGR`} value={`${fmtN(profitCagr, 1)}%`} sub={`${first.fy} → ${last.fy}`} tone={profitCagr >= 0 ? 'up' : 'down'} smallValue />
        <Kpi label="CoE (CAPM)" value={`${fmtN(coe, 1)}%`} sub={`β ${company.beta.toFixed(2)}`} tabular smallValue />
        <Kpi label="Implied g" value={`${fmtN(impliedG, 1)}%`} sub="Reverse Gordon" tabular smallValue />
        <Kpi label="Earnings Vol" value={`${fmtN(vol, 1)}%`} sub="stdev YoY PAT growth" tabular smallValue />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 lg:col-span-3">
          <h4 className="text-sm font-semibold text-white mb-1">Topline vs Net Profit</h4>
          <p className="text-[11px] text-gray-500 mb-4">{first.fy} – {last.fy}</p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={historyChart}>
              <defs>
                <linearGradient id="coGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={company.color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={company.color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="fy" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#d4a843', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Area yAxisId="left" type="monotone" dataKey="Topline" name="Topline" stroke={company.color} strokeWidth={2} fill="url(#coGrad)" isAnimationActive={true} />
              <Line yAxisId="right" type="monotone" dataKey="Net Profit" name="Net Profit" stroke="#d4a843" strokeWidth={2.5} dot={{ r: 3, fill: '#d4a843' }} isAnimationActive={true} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5 lg:col-span-2 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Factor Profile</h4>
            <p className="text-[11px] text-gray-500 mb-3">Universe-relative percentile on each pillar</p>
            <FactorBar label="Quality" value={scores.quality} color="#60a5fa" />
            <FactorBar label="Value" value={scores.value} color="#22c55e" />
            <FactorBar label="Growth" value={scores.growth} color="#d4a843" />
            <FactorBar label="Momentum" value={scores.momentum} color="#a855f7" />
          </div>

          <div className="hairline-divider" />

          {dp.applicable ? (
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">DuPont Decomposition</h4>
              <p className="text-[11px] text-gray-500 mb-3">ROE split into margin vs efficiency &amp; leverage</p>
              <DuPontStack dp={dp} />
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Capital Profile</h4>
              <p className="text-[11px] text-gray-500">Banking model &mdash; DuPont (NPM × turnover × leverage) not meaningful; ROE tracked directly at <span className="text-gray-200 tabular-nums">{fmtN(last.roePct, 1)}%</span>.</p>
            </div>
          )}

          <div className="hairline-divider" />

          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Reverse-Gordon Read</h4>
            <p className="text-[11px] text-gray-500 mb-2">
              The current {valuationLabel} implies the market expects ~<span className="tabular-nums text-[color:var(--color-gold-light)]">{fmtN(impliedG, 1)}%</span> perpetual growth at a <span className="tabular-nums text-white">{fmtN(coe, 1)}%</span> cost of equity.
            </p>
            <p className={`text-[11px] ${gap > 3 ? 'text-emerald-300' : gap < -3 ? 'text-red-300' : 'text-gray-400'}`}>
              Delivered {rangePeriods}Y PAT CAGR of <span className="tabular-nums font-semibold">{fmtN(profitCagr, 1)}%</span>
              {' '}&mdash; gap of <span className="tabular-nums font-semibold">{gap >= 0 ? '+' : ''}{fmtN(gap, 1)}pp</span>.
              {gap > 3 && ' Track record exceeds what the market is paying for.'}
              {gap < -3 && ' Market pricing in acceleration vs history.'}
              {Math.abs(gap) <= 3 && ' Price roughly matches history.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function DuPontStack({ dp }: { dp: { npm: number; leverageAndTurnover: number; roe: number } }) {
  const total = dp.roe || 1;
  const npmPct = (dp.npm / total) * 100;
  return (
    <div>
      <div className="flex w-full h-8 rounded-md overflow-hidden bg-black/40 border border-border">
        <div className="flex items-center justify-center text-[10px] font-semibold text-white" style={{ width: `${Math.max(4, npmPct)}%`, background: '#22c55e' }}>
          {npmPct > 12 && `NPM ${fmtN(dp.npm, 1)}%`}
        </div>
        <div className="flex items-center justify-center text-[10px] font-semibold text-white" style={{ width: `${Math.max(4, 100 - npmPct)}%`, background: '#3b82f6' }}>
          {100 - npmPct > 12 && `Eff. & Lev. ${fmtN(dp.leverageAndTurnover, 1)}%`}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
        <span>Net Margin contribution</span>
        <span>Efficiency + Leverage contribution</span>
      </div>
      <div className="mt-2 text-[11px] text-gray-300 flex items-center justify-between">
        <span>Reported ROE</span>
        <span className="tabular-nums font-semibold text-white">{fmtN(dp.roe, 1)}%</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="text-[10px] text-gray-400 w-16 shrink-0">{label}</div>
      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, value)}%`, background: color, opacity: 0.85 }} />
      </div>
      <div className="text-[10px] text-gray-200 tabular-nums w-8 text-right">{Math.round(value)}</div>
    </div>
  );
}

/* ─── local Kpi helper (same impl as in AnalyticsCards but kept as local duplicate) ─── */
function Kpi({ label, value, sub, tone, gold, tabular, smallValue }: {
  label: string; value: string; sub: string;
  tone?: 'up' | 'down'; gold?: boolean; tabular?: boolean; smallValue?: boolean;
}) {
  const color = tone === 'up' ? 'text-emerald-300' : tone === 'down' ? 'text-red-300' : gold ? 'text-[color:var(--color-gold-light)]' : 'text-white';
  const valueSize = smallValue ? 'text-base' : 'text-2xl';
  return (
    <div>
      <div className="kpi-eyebrow">{label}</div>
      <div className={`kpi-value ${valueSize} mt-1 ${color} ${tabular ? 'tabular-nums' : ''} truncate`}>{value}</div>
      <div className={`text-[11px] mt-0.5 ${gold ? 'text-[color:var(--color-gold-light)]' : 'text-gray-500'}`}>{sub}</div>
    </div>
  );
}