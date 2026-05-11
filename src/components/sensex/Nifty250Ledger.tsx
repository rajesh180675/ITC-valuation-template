import * as React from 'react';
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { exportCsv, csvEscape } from '@/utils/export';

import type { SensexConstituent } from '@/data/sensexData';
import {
  computeDuPont,
  earningsVolatility,
} from '@/utils/sensexAnalytics';
import { ChartTooltip, fmt, fmtN } from '@/components/itc/shared';
import { Kpi, FactorBar, ScoreChip } from './shared';
import type { SortKey } from './Nifty250AnalyticsCards';

/* ══════════════════════════════════════════════════════════════════════════ */

export function ConstituentLedger(props: {
  rows: {
    company: SensexConstituent;
    last: { toplineCr: number; roePct: number; rocePct?: number };
    toplineCagr: number; profitCagr: number; valuationLabel: string;
    coe: number; impliedG: number; scores: { composite: number };
    valuationZ: number; sectorMedianMultiple: number;
    negPat?: boolean;
  }[];
  selectedId: string;
  onSelect: (id: string) => void;
  rangeLabel: string;
  endFy: string;
  sortCaret: (key: SortKey) => string;
  toggleSort: (key: SortKey) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  allSectors?: string[];
  sectorFilter?: string[];
  onSectorFilterChange?: (sectors: string[]) => void;
  pageSize?: number;
}) {
  const {
    rows, selectedId, onSelect, rangeLabel, endFy, sortCaret, toggleSort,
    searchQuery, setSearchQuery, allSectors, sectorFilter, onSectorFilterChange, pageSize,
  } = props;

  // P4.1: client-side search filter
  const visibleRows = searchQuery.trim()
    ? rows.filter(r =>
        r.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.company.ticker.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rows;

  const [page, setPage] = React.useState(0);
  const totalPages = pageSize ? Math.max(1, Math.ceil(visibleRows.length / pageSize)) : 1;
  const displayRows = pageSize ? visibleRows.slice(page * pageSize, (page + 1) * pageSize) : visibleRows;
  React.useEffect(() => { setPage(0); }, [visibleRows.length]);

  const handleExport = () => {
    const headers = [
      'Ticker', 'Name', 'Sector', 'Type', 'WeightPct', 'MarketCapCr', 'CMP',
      `Topline_${endFy}_Cr`, 'ToplineCAGR_pct', 'PATCAGR_pct',
      `ROE_${endFy}_pct`, 'Beta', 'CoE_pct', 'ValuationMetric',
      'Multiple', 'SectorMedianMultiple', 'Z_vs_sector',
      'ImpliedGrowth_pct', 'CompositeScore',
    ];
    const data = rows.map((r) => [
      csvEscape(r.company.ticker),
      csvEscape(r.company.name),
      csvEscape(r.company.sector),
      r.company.reportingType === 'financial' ? 'BFSI' : 'Corp',
      r.company.weightPct.toFixed(3),
      String(r.company.marketCapCr),
      String(r.company.cmp),
      String(r.last?.toplineCr ?? 0),
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
    ]);
    exportCsv(`nifty250-ledger-${endFy}.csv`, headers, data);
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
        <div className="flex items-center gap-2 flex-wrap">
          {/* P4.1: search bar */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name / ticker…"
              className="pl-7 pr-3 py-1.5 text-[11px] bg-black/40 border border-border rounded-md text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[color:var(--color-gold-light)]/50 w-44"
            />
          </div>
          {allSectors && sectorFilter !== undefined && onSectorFilterChange && (
            <div className="relative group">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-200 bg-black/40 hover:bg-black/60 border border-border rounded-md px-3 py-1.5 transition"
              >
                Sector {sectorFilter.length > 0 ? `(${sectorFilter.length})` : ''}
              </button>
              <div className="absolute right-0 top-full mt-1 z-50 bg-[#1a1f2e] border border-border rounded-lg shadow-xl p-2 min-w-[180px] hidden group-hover:block hover:block">
                <div className="max-h-[240px] overflow-y-auto space-y-0.5">
                  <label className="flex items-center gap-2 px-2 py-1 text-[11px] text-gray-300 hover:text-white cursor-pointer rounded hover:bg-black/40">
                    <input
                      type="checkbox"
                      checked={sectorFilter.length === 0}
                      onChange={() => onSectorFilterChange([])}
                      className="accent-[var(--color-gold-light)]"
                    />
                    All Sectors
                  </label>
                  <div className="border-t border-border/50 my-1" />
                  {allSectors.map(s => (
                    <label key={s} className="flex items-center gap-2 px-2 py-1 text-[11px] text-gray-300 hover:text-white cursor-pointer rounded hover:bg-black/40">
                      <input
                        type="checkbox"
                        checked={sectorFilter.includes(s)}
                        onChange={() => {
                          const next = sectorFilter.includes(s)
                            ? sectorFilter.filter(x => x !== s)
                            : [...sectorFilter, s];
                          onSectorFilterChange(next);
                        }}
                        className="accent-[var(--color-gold-light)]"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-200 bg-black/40 hover:bg-black/60 border border-border rounded-md px-3 py-1.5 transition"
            aria-label="Download constituent ledger as CSV"
          >
            <Download size={12} /> CSV
          </button>
          <span className="pill pill-muted">{visibleRows.length} / {rows.length} rows</span>
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
            {displayRows.map(r => {
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
                  {/* P1.2: show N/A for negative-PAT companies */}
                  <td className={`text-right font-semibold ${
                    r.negPat
                      ? 'text-amber-400'
                      : r.profitCagr >= 0 ? 'text-emerald-300' : 'text-red-300'
                  }`}>
                    {r.negPat
                      ? <span title="PAT was negative at start or end of window — CAGR is unreliable">⚠ N/A</span>
                      : `${fmtN(r.profitCagr, 1)}%`
                    }
                  </td>
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
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-2 border-t border-border/50">
          <span className="text-[11px] text-gray-500">
            Page {page + 1} of {totalPages} ({visibleRows.length} filtered)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-200 bg-black/40 hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed border border-border rounded-md px-2.5 py-1 transition"
              aria-label="Previous page"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-200 bg-black/40 hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed border border-border rounded-md px-2.5 py-1 transition"
              aria-label="Next page"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ScoreChip, FactorBar now live in ./shared.tsx (P3.1 — removed duplicates) */
/* ══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════ */

export function DrillDown({ row, rangeStart, rangeEnd, rangePeriods, peerScores }: {
  row: {
    company: SensexConstituent;
    first: { fy: string }; last: { fy: string; roePct: number; toplineCr: number; netProfitCr: number };
    profitCagr: number; coe: number; impliedG: number; gap: number; valuationLabel: string;
    scores: { quality: number; value: number; growth: number; momentum: number; composite: number };
  };
  rangeStart: number; rangeEnd: number; rangePeriods: number;
  peerScores?: { quality: number; value: number; growth: number; momentum: number };
}) {
  const { company, first, last, profitCagr, coe, impliedG, gap, scores, valuationLabel } = row;
  const [showPeers, setShowPeers] = React.useState(false);
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
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-white">Factor Profile</h4>
              {peerScores && (
                <button
                  type="button"
                  onClick={() => setShowPeers(v => !v)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition ${
                    showPeers
                      ? 'text-[var(--color-gold-light)] border-[var(--color-gold-light)]/50 bg-[var(--color-gold-light)]/10'
                      : 'text-gray-400 border-border bg-black/30 hover:bg-black/50'
                  }`}
                >
                  {showPeers ? 'Hide' : 'Show'} Peer Median
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mb-3">Universe-relative percentile on each pillar</p>
            <div className="space-y-2">
              {[
                { label: 'Quality', value: scores.quality, peerVal: peerScores?.quality, color: '#60a5fa' },
                { label: 'Value', value: scores.value, peerVal: peerScores?.value, color: '#22c55e' },
                { label: 'Growth', value: scores.growth, peerVal: peerScores?.growth, color: '#d4a843' },
                { label: 'Momentum', value: scores.momentum, peerVal: peerScores?.momentum, color: '#a855f7' },
              ].map(({ label, value, peerVal, color }) => (
                <div key={label} className="relative">
                  <FactorBar label={label} value={value} color={color} />
                  {showPeers && peerVal !== undefined && (
                    <div
                      className="absolute bottom-1 left-0 h-1 rounded bg-white/30 opacity-60"
                      style={{ width: `${Math.max(2, peerVal)}%` }}
                      title={`Sector median: ${Math.round(peerVal)}`}
                    />
                  )}
                </div>
              ))}
            </div>
            {showPeers && (
              <p className="text-[10px] text-gray-500 mt-1.5 italic">
                Solid bar = company · thin line = sector median
              </p>
            )}
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

/* FactorBar, Kpi, ScoreChip — imported from ./shared.tsx (P3.1) */