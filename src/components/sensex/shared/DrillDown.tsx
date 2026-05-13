import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { ChartTooltip, fmt, fmtN } from '@/components/itc/shared';
import { Kpi, FactorBar } from './index';
import { computeDuPont, earningsVolatility } from '@/utils/sensexAnalytics';
import type { SensexConstituent } from '@/data/sensexData';
import { PeerComparison } from './PeerComparison';

export function DrillDown({ row, rangeStart, rangeEnd, rangePeriods, arAvailable }: {
  row: {
    company: SensexConstituent;
    first: { fy: string }; last: { fy: string; roePct: number; toplineCr: number; netProfitCr: number };
    profitCagr: number; coe: number; impliedG: number; gap: number; valuationLabel: string;
    scores: { quality: number; value: number; growth: number; momentum: number; composite: number };
  };
  rangeStart: number; rangeEnd: number; rangePeriods: number;
  arAvailable?: boolean;
}) {
  const { company, first, last, profitCagr, coe, impliedG, gap, scores, valuationLabel } = row;
  const dp = computeDuPont(company);
  const vol = earningsVolatility(company.history);

  const historyChart = company.history.slice(rangeStart, rangeEnd + 1).map(h => ({
    fy: h.fy,
    Topline: h.toplineCr,
    'Net Profit': h.netProfitCr,
  }));

  const goToAnnualReport = () => {
    try {
      localStorage.setItem('arTicker', company.ticker);
      const navEvent = new CustomEvent('navigate-to', { detail: { section: 'annualReports' } });
      window.dispatchEvent(navEvent);
    } catch {}
  };

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
            {arAvailable && (
              <button onClick={goToAnnualReport}
                className="mt-2 px-3 py-1.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all whitespace-nowrap flex items-center gap-1">
                📊 Annual Report →
              </button>
            )}
          </div>
      </div>

      <div className="hairline-divider" />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Kpi label="Market Cap" value={fmt(company.marketCapCr)} sub={`CMP ₹${company.cmp}`} smallValue />
        <Kpi label="Index Weight" value={`${fmtN(company.weightPct, 1)}%`} sub="of index" gold smallValue />
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
              <p className="text-[11px] text-gray-500">Banking model &mdash; DuPont not meaningful; ROE tracked directly at <span className="text-gray-200 tabular-nums">{fmtN(last.roePct, 1)}%</span>.</p>
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

      <div className="hairline-divider my-5" />
      <PeerComparison ticker={company.ticker} currentPe={company.valuationMultiple} />
    </div>
  );
}

function DuPontStack({ dp }: { dp: { npm: number; leverageAndTurnover: number; roe: number } }) {
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
