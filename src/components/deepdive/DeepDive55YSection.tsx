import { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  BookOpen, TrendingUp, Activity, Calculator, PieChart as PieIcon, Target,
  Globe, Layers, AlertTriangle, Scale, Compass,
} from 'lucide-react';

import {
  indexSnapshots, regimes, distributionStats, calendarMonths, drawdowns, rollingReturns,
  roeDecades, dupontHistory, sectorRoe, peCycles, peRegimeDrivers, peMeanReversion,
  capeHistory, pbHistory, bvepsGrowth, divYieldHistory, payoutEvolution, evEbitdaHistory,
  roicSpread, decadeWinners, sectorPeDispersion, marketCapSegments, qualityFactor,
  rateCorrelations, realRateHistory, fiiSignals, fiiOwnership, fxImpact,
  expectedReturnModel, expectedReturn10YPct, scenarios, probabilityWeightedCagrPct,
  strategicAllocation, tacticalOverlay, regimeMap, immutableLaws,
  sensexLongPath, decadeCagr, extremeMonths,
} from '@/data/deepDive55Y';
import { ChartTooltip, fmtN } from '@/components/itc/shared';

/* ───────── Sub-tabs ───────── */
type DeepTab =
  | 'overview' | 'regimes' | 'returns' | 'roe' | 'valuation'
  | 'sectors' | 'macro' | 'forecast' | 'playbook';

interface TabDef { id: DeepTab; label: string; icon: React.ReactNode; }

const TABS: TabDef[] = [
  { id: 'overview',  label: 'Overview',         icon: <BookOpen size={14} /> },
  { id: 'regimes',   label: 'Regimes',          icon: <Layers size={14} /> },
  { id: 'returns',   label: 'Return Anatomy',   icon: <Activity size={14} /> },
  { id: 'roe',       label: 'ROE & DuPont',     icon: <Compass size={14} /> },
  { id: 'valuation', label: 'Valuation Cycles', icon: <Calculator size={14} /> },
  { id: 'sectors',   label: 'Sector Rotation',  icon: <PieIcon size={14} /> },
  { id: 'macro',     label: 'Macro Drivers',    icon: <Globe size={14} /> },
  { id: 'forecast',  label: '10Y Forecast',     icon: <TrendingUp size={14} /> },
  { id: 'playbook',  label: 'Playbook',         icon: <Target size={14} /> },
];

/* ════════════════════════════════════════════════════════════════════════
 * MAIN SECTION
 * ══════════════════════════════════════════════════════════════════════ */
export function DeepDive55YSection() {
  const [tab, setTab] = useState<DeepTab>('overview');

  return (
    <div className="animate-fadeIn space-y-6">
      <HeroBanner />

      <div className="glass-card p-2">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-gradient-to-b from-[rgba(212,168,67,0.22)] to-[rgba(212,168,67,0.08)] text-[color:var(--color-gold-light)] shadow-inner'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[rgba(59,130,246,0.08)]'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview'  && <OverviewTab />}
      {tab === 'regimes'   && <RegimesTab />}
      {tab === 'returns'   && <ReturnsTab />}
      {tab === 'roe'       && <RoeTab />}
      {tab === 'valuation' && <ValuationTab />}
      {tab === 'sectors'   && <SectorsTab />}
      {tab === 'macro'     && <MacroTab />}
      {tab === 'forecast'  && <ForecastTab />}
      {tab === 'playbook'  && <PlaybookTab />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * HERO BANNER
 * ══════════════════════════════════════════════════════════════════════ */
function HeroBanner() {
  const totalMonths = regimes.reduce((s, r) => s + r.months, 0);
  return (
    <div className="premium-card p-6 md:p-7">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="pill"><span className="ticker-dot" /> 55-Year Deep Dive</span>
            <span className="pill pill-muted">1970 – 2025</span>
            <span className="pill pill-muted">{totalMonths} months observed</span>
            <span className="pill pill-muted">10 structural regimes</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Indian Equities <span className="text-[color:var(--color-gold-light)]">Long Arc</span>
          </h2>
          <p className="text-sm text-gray-400 mt-2 max-w-3xl leading-relaxed">
            Monthly-resolution archive of the Sensex and successor benchmarks from the License Raj through the
            AI era. CAPM-anchored cost of equity, Shiller CAPE percentiles, DuPont ROE decomposition, FII flow
            signals, and a forward 10-year scenario engine — all stitched together as a single workbook.
          </p>
        </div>
      </div>
      <div className="hairline-divider my-5" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-5">
        <Kpi label="Sensex CAGR (55Y)"      value="16.2%"   sub="nominal, total return" tone="up" />
        <Kpi label="Sensex CAGR (real)"     value="8.5%"    sub="CPI-adjusted"          tone="up" />
        <Kpi label="Worst Drawdown"         value="-68.5%"  sub="Apr–Sep 1992"          tone="down" />
        <Kpi label="Best Month"             value="+28.7%"  sub="Apr 1992"              tone="up" />
        <Kpi label="Worst Month"            value="-32.4%"  sub="Oct 2008"              tone="down" />
        <Kpi label="% Positive Months"      value="58.3%"   sub="of 660 months"          />
        <Kpi label="Current Regime"         value="R10"     sub="COVID → AI era"        gold smallValue />
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone, gold, smallValue }: {
  label: string; value: string; sub: string;
  tone?: 'up' | 'down'; gold?: boolean; smallValue?: boolean;
}) {
  const color = tone === 'up' ? 'text-emerald-300'
    : tone === 'down' ? 'text-red-300'
    : gold ? 'text-[color:var(--color-gold-light)]' : 'text-white';
  const valueSize = smallValue ? 'text-base' : 'text-2xl';
  return (
    <div>
      <div className="kpi-eyebrow">{label}</div>
      <div className={`kpi-value ${valueSize} mt-1 ${color} tabular-nums truncate`}>{value}</div>
      <div className={`text-[11px] mt-0.5 ${gold ? 'text-[color:var(--color-gold-light)]' : 'text-gray-500'}`}>{sub}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * OVERVIEW TAB
 * ══════════════════════════════════════════════════════════════════════ */
function OverviewTab() {
  const sensexLog = useMemo(() => sensexLongPath.map(p => ({ year: p.year, sensex: p.sensex, log: Math.log10(p.sensex) })), []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Long-arc chart spans 2 cols */}
        <div className="premium-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Sensex 55-Year Log Path</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">100 in 1979 → 83,450 in Jun 2025 · 16.2% nominal CAGR</p>
            </div>
            <span className="pill pill-muted">Decadal anchors</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={sensexLog}>
              <defs>
                <linearGradient id="ddGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#d4a843" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#d4a843" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis
                yAxisId="log"
                scale="log"
                domain={[40, 100000]}
                ticks={[50, 100, 500, 1000, 5000, 10000, 50000, 100000]}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(v) => v >= 1000 ? `${v/1000}K` : `${v}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine yAxisId="log" x={1992} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} label={{ value: 'Harshad', fill: '#fca5a5', fontSize: 10, position: 'top' }} />
              <ReferenceLine yAxisId="log" x={2008} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} label={{ value: 'GFC', fill: '#fca5a5', fontSize: 10, position: 'top' }} />
              <ReferenceLine yAxisId="log" x={2020} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} label={{ value: 'COVID', fill: '#fca5a5', fontSize: 10, position: 'top' }} />
              <Area yAxisId="log" type="monotone" dataKey="sensex" name="Sensex" stroke="#d4a843" strokeWidth={2.4} fill="url(#ddGold)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Index family card */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Indian Index Family</h3>
          <div className="space-y-2.5">
            {indexSnapshots.map(ix => (
              <div key={ix.index} className="flex items-center justify-between p-2.5 rounded-lg bg-[rgba(28,41,64,0.5)] border border-[rgba(42,58,82,0.5)]">
                <div>
                  <div className="text-xs font-semibold text-white">{ix.index}</div>
                  <div className="text-[10px] text-gray-500">Base {ix.baseYear} @ {ix.baseValue.toLocaleString('en-IN')}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold tabular-nums text-[color:var(--color-gold-light)]">{ix.current.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-emerald-300 tabular-nums">{ix.cagrPct.toFixed(1)}% CAGR</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regime map (current snapshot) */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Where Are We Now? — Regime Map</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Snapshot of valuation, profitability and positioning vs. the 55-year average</p>
          </div>
          <span className="pill pill-muted">Late-cycle, expensive but not bubble</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {regimeMap.map(r => {
            const tone =
              r.regime === 'Cheap' || r.regime === 'Accommodative' ? 'text-emerald-300 border-emerald-500/30' :
              r.regime === 'Expensive' || r.regime === 'Stretched' || r.regime === 'High' ? 'text-amber-300 border-amber-500/30' :
              r.regime === 'Low' ? 'text-red-300 border-red-500/30' :
              'text-gray-300 border-gray-500/30';
            return (
              <div key={r.indicator} className={`p-3 rounded-lg bg-[rgba(28,41,64,0.5)] border ${tone}`}>
                <div className="kpi-eyebrow">{r.indicator}</div>
                <div className="text-lg font-bold tabular-nums mt-1">{r.current}</div>
                <div className="text-[10px] text-gray-500">avg: {r.historicalAvg}</div>
                <div className="text-[10px] mt-1 font-semibold uppercase tracking-wider">{r.regime}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decadal CAGR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Decadal CAGR vs Forecast</h3>
          <p className="text-[11px] text-gray-500 mb-3">Realised compounding by decade plus the model 2025–2035E</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={decadeCagr.map(d => ({ ...d, isForecast: d.period.includes('E') }))}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={14.1} stroke="#d4a843" strokeDasharray="3 3" label={{ value: '55Y avg 14.1%', fill: '#e8c96a', fontSize: 10, position: 'right' }} />
              <Bar dataKey="actualCagr" name="CAGR" radius={[4, 4, 0, 0]}>
                {decadeCagr.map((d, i) => (
                  <Cell key={i} fill={d.period.includes('E') ? '#d4a843' : (d.actualCagr! >= 14.1 ? '#10b981' : '#3b82f6')} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">10 Immutable Laws</h3>
          <p className="text-[11px] text-gray-500 mb-3">Patterns that have survived every regime shift</p>
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-2">
            {immutableLaws.map(l => (
              <div key={l.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-[rgba(212,168,67,0.04)]">
                <div className="w-6 h-6 rounded-full bg-[rgba(212,168,67,0.15)] border border-[rgba(212,168,67,0.4)] text-[color:var(--color-gold-light)] text-[11px] font-bold flex items-center justify-center shrink-0">{l.id}</div>
                <div>
                  <div className="text-xs font-semibold text-white">{l.law}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{l.evidence}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * REGIMES TAB
 * ══════════════════════════════════════════════════════════════════════ */
function RegimesTab() {
  const monthlyChart = regimes.map(r => ({
    id: r.id,
    label: `${r.id} · ${r.startYear}`,
    avgMonthly: r.avgMonthlyPct,
    annualised: (Math.pow(1 + r.avgMonthlyPct / 100, 12) - 1) * 100,
    volatility: r.volatilityPct,
    sharpe: r.volatilityPct > 0 ? r.avgMonthlyPct / r.volatilityPct : 0,
    color: r.color,
  }));

  return (
    <div className="space-y-5">
      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">10 Structural Regimes (Bai-Perron breaks)</h3>
        <p className="text-[11px] text-gray-500 mb-4">Annualised return, volatility and risk-adjusted score for each regime</p>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={monthlyChart}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis yAxisId="ret" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <YAxis yAxisId="vol" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine yAxisId="ret" y={0} stroke="#475569" />
            <Bar yAxisId="ret" dataKey="annualised" name="Annualised return">
              {monthlyChart.map((d, i) => (
                <Cell key={i} fill={d.annualised >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
            <Line yAxisId="vol" type="monotone" dataKey="volatility" name="Volatility (monthly σ)" stroke="#d4a843" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full sensex-table">
          <thead>
            <tr>
              <th className="text-left">Regime</th>
              <th className="text-left">Period</th>
              <th className="text-right">Months</th>
              <th className="text-right">Avg Monthly</th>
              <th className="text-right">Annualised</th>
              <th className="text-right">Volatility</th>
              <th className="text-right">Sharpe (m)</th>
              <th className="text-left">Character</th>
            </tr>
          </thead>
          <tbody>
            {regimes.map(r => {
              const annualised = (Math.pow(1 + r.avgMonthlyPct / 100, 12) - 1) * 100;
              const sharpe = r.volatilityPct > 0 ? r.avgMonthlyPct / r.volatilityPct : 0;
              return (
                <tr key={r.id}>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                      <span className="font-semibold text-white">{r.id}</span>
                    </span>
                  </td>
                  <td className="text-gray-300">{r.period}</td>
                  <td className="text-right tabular-nums text-gray-300">{r.months}</td>
                  <td className={`text-right tabular-nums font-semibold ${r.avgMonthlyPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{r.avgMonthlyPct >= 0 ? '+' : ''}{r.avgMonthlyPct.toFixed(2)}%</td>
                  <td className={`text-right tabular-nums font-semibold ${annualised >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{annualised >= 0 ? '+' : ''}{annualised.toFixed(1)}%</td>
                  <td className="text-right tabular-nums text-gray-300">{r.volatilityPct.toFixed(1)}%</td>
                  <td className={`text-right tabular-nums ${sharpe >= 0 ? 'text-gray-200' : 'text-red-300'}`}>{sharpe.toFixed(3)}</td>
                  <td className="text-gray-400 text-[11px]">{r.character}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * RETURNS TAB — distribution, seasonality, drawdowns, rolling
 * ══════════════════════════════════════════════════════════════════════ */
function ReturnsTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Kpi label="Mean (m)"          value={`${distributionStats.meanMonthlyPct.toFixed(2)}%`}     sub="660 months" />
        <Kpi label="Median (m)"        value={`${distributionStats.medianMonthlyPct.toFixed(2)}%`}   sub="bias-free" />
        <Kpi label="σ Monthly"          value={`${distributionStats.stdDevPct.toFixed(2)}%`}          sub="≈27% annualised" />
        <Kpi label="Skewness"          value={distributionStats.skewness.toFixed(2)}                 sub="left-skewed" tone="down" />
        <Kpi label="Kurtosis"          value={distributionStats.kurtosis.toFixed(2)}                 sub="fat tails" />
        <Kpi label="Sharpe (m)"        value={distributionStats.sharpeMonthly.toFixed(3)}            sub="raw, no Rf adj" />
        <Kpi label="Sortino (m)"       value={distributionStats.sortino.toFixed(3)}                  sub="downside-aware" />
        <Kpi label="% Positive"        value={`${distributionStats.pctPositive.toFixed(1)}%`}        sub="hit rate"        tone="up" />
        <Kpi label="Max Month"         value={`+${distributionStats.maxMonthPct.toFixed(1)}%`}        sub="Apr 1992"        tone="up" />
        <Kpi label="Min Month"         value={`${distributionStats.minMonthPct.toFixed(1)}%`}         sub="Oct 2008"        tone="down" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="premium-card p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-1">Calendar-Month Seasonality</h3>
          <p className="text-[11px] text-gray-500 mb-3">Average monthly return + hit-rate band by calendar month (1970–2025)</p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={calendarMonths}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis yAxisId="ret" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
              <YAxis yAxisId="hit" orientation="right" domain={[40, 70]} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine yAxisId="ret" y={0} stroke="#475569" />
              <Bar yAxisId="ret" dataKey="avgPct" name="Avg return" radius={[4, 4, 0, 0]}>
                {calendarMonths.map((d, i) => (
                  <Cell key={i} fill={d.avgPct >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
              <Line yAxisId="hit" type="monotone" dataKey="pctPositive" name="% positive" stroke="#d4a843" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Rolling Returns</h3>
          <p className="text-[11px] text-gray-500 mb-3">Compounding never goes negative over 10Y</p>
          <div className="space-y-3">
            {rollingReturns.map(r => (
              <div key={r.period} className="p-3 rounded-lg bg-[rgba(28,41,64,0.5)] border border-[rgba(42,58,82,0.5)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">{r.period} window</span>
                  <span className="pill pill-muted text-[9px]">{r.bestRange.split('–')[0]}–today</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Best</div>
                    <div className="text-lg font-bold text-emerald-300 tabular-nums">+{r.bestCagrPct.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-500">{r.bestRange}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Worst</div>
                    <div className="text-lg font-bold text-amber-300 tabular-nums">+{r.worstCagrPct.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-500">{r.worstRange}</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-3 rounded-lg bg-[rgba(16,185,129,0.07)] border border-emerald-500/30">
              <div className="text-[11px] text-emerald-200 font-semibold flex items-center gap-2">
                <Activity size={12} /> Worst 10Y still +8.2% CAGR — compounding survives every regime.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawdowns */}
      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Major Drawdowns &amp; Recoveries</h3>
        <p className="text-[11px] text-gray-500 mb-3">Each bar = peak-to-trough decline; line = recovery duration in months</p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={drawdowns}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
            <XAxis dataKey="peak" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
            <YAxis yAxisId="dd" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[-80, 0]} />
            <YAxis yAxisId="dur" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}m`} />
            <Tooltip content={<ChartTooltip />} />
            <Bar yAxisId="dd" dataKey="declinePct" name="Drawdown" radius={[0, 0, 6, 6]}>
              {drawdowns.map((d, i) => (
                <Cell key={i} fill={d.declinePct < -50 ? '#dc2626' : d.declinePct < -30 ? '#ef4444' : '#f59e0b'} />
              ))}
            </Bar>
            <Line yAxisId="dur" type="monotone" dataKey="durationMonths" name="Recovery (m)" stroke="#d4a843" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card overflow-x-auto">
          <table className="w-full sensex-table">
            <thead>
              <tr>
                <th className="text-left">#</th>
                <th className="text-left">Peak</th>
                <th className="text-left">Trough</th>
                <th className="text-right">Decline</th>
                <th className="text-left">Recovery</th>
                <th className="text-right">Months</th>
                <th className="text-left">Catalyst</th>
              </tr>
            </thead>
            <tbody>
              {drawdowns.map(d => (
                <tr key={d.rank}>
                  <td className="text-gray-400">{d.rank}</td>
                  <td className="text-gray-300">{d.peak}</td>
                  <td className="text-gray-300">{d.trough}</td>
                  <td className="text-right tabular-nums font-semibold text-red-300">{d.declinePct.toFixed(1)}%</td>
                  <td className="text-gray-300">{d.recovery}</td>
                  <td className="text-right tabular-nums text-gray-300">{d.durationMonths}</td>
                  <td className="text-[11px] text-gray-400">{d.catalyst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-card overflow-x-auto">
          <table className="w-full sensex-table">
            <thead>
              <tr>
                <th className="text-left">Rank</th>
                <th className="text-left">Month</th>
                <th className="text-right">Return</th>
                <th className="text-left">Cause</th>
              </tr>
            </thead>
            <tbody>
              {extremeMonths.map(m => (
                <tr key={`${m.rank}-${m.month}`}>
                  <td className="text-gray-400">#{m.rank}</td>
                  <td className="text-gray-200 font-medium">{m.month}</td>
                  <td className={`text-right tabular-nums font-semibold ${m.returnPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {m.returnPct >= 0 ? '+' : ''}{m.returnPct.toFixed(1)}%
                  </td>
                  <td className="text-[11px] text-gray-400">{m.cause}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * ROE TAB — DuPont decomposition
 * ══════════════════════════════════════════════════════════════════════ */
function RoeTab() {
  const dupontChart = dupontHistory.map(d => ({
    year: String(d.year),
    'Net Margin': d.netMargin,
    'Asset Turnover x10': d.assetTurnover * 10,
    'Equity Mult x10': d.equityMultiplier * 10,
    ROE: d.roe,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Aggregate Market ROE — Decadal</h3>
          <p className="text-[11px] text-gray-500 mb-3">Average, peak and trough trailing-12M ROE for the listed universe</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={roeDecades}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="avgRoe" name="Avg ROE" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="peakRoe" name="Peak" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="troughRoe" name="Trough" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">DuPont Decomposition — Nifty 50</h3>
          <p className="text-[11px] text-gray-500 mb-3">Margin × Turnover × Leverage ⇒ ROE (turnover &amp; multiplier scaled ×10 for visibility)</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={dupontChart}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Net Margin" stackId="a" fill="#10b981" />
              <Bar dataKey="Asset Turnover x10" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Equity Mult x10" stackId="a" fill="#8b5cf6" />
              <Line type="monotone" dataKey="ROE" stroke="#d4a843" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full sensex-table">
          <thead>
            <tr>
              <th className="text-left">Year</th>
              <th className="text-right">ROE</th>
              <th className="text-right">Net Margin</th>
              <th className="text-right">Asset Turnover</th>
              <th className="text-right">Equity Multiplier</th>
              <th className="text-left">Interpretation</th>
            </tr>
          </thead>
          <tbody>
            {dupontHistory.map(d => (
              <tr key={d.year}>
                <td className="text-white font-semibold">{d.year}</td>
                <td className="text-right tabular-nums font-semibold text-[color:var(--color-gold-light)]">{d.roe.toFixed(1)}%</td>
                <td className="text-right tabular-nums text-gray-300">{d.netMargin.toFixed(1)}%</td>
                <td className="text-right tabular-nums text-gray-300">{d.assetTurnover.toFixed(2)}</td>
                <td className="text-right tabular-nums text-gray-300">{d.equityMultiplier.toFixed(2)}</td>
                <td className="text-[11px] text-gray-400">{d.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Sector ROE — 20-Year Evolution</h3>
        <p className="text-[11px] text-gray-500 mb-3">2004 → 2014 → 2024. FMCG widens its moat; IT compresses; PSU banks reset.</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={sectorRoe}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
            <XAxis dataKey="sector" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={0} stroke="#475569" />
            <Bar dataKey="roe2004" name="2004" fill="#64748b" radius={[3, 3, 0, 0]} />
            <Bar dataKey="roe2014" name="2014" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="roe2024" name="2024" fill="#d4a843" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full sensex-table">
          <thead>
            <tr>
              <th className="text-left">Sector</th>
              <th className="text-right">ROE 2004</th>
              <th className="text-right">ROE 2014</th>
              <th className="text-right">ROE 2024</th>
              <th className="text-left">Trend</th>
              <th className="text-left">AI Disruption</th>
            </tr>
          </thead>
          <tbody>
            {sectorRoe.map(s => {
              const aiTone =
                s.aiImpact === 'Very High' ? 'text-red-300 border-red-500/40 bg-red-500/10'
                : s.aiImpact === 'High'    ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                : s.aiImpact === 'Medium'  ? 'text-blue-300 border-blue-500/40 bg-blue-500/10'
                : 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10';
              return (
                <tr key={s.sector}>
                  <td className="text-white font-medium">{s.sector}</td>
                  <td className="text-right tabular-nums text-gray-300">{s.roe2004 || '—'}%</td>
                  <td className="text-right tabular-nums text-gray-300">{s.roe2014 || '—'}%</td>
                  <td className="text-right tabular-nums font-semibold text-[color:var(--color-gold-light)]">{s.roe2024}%</td>
                  <td className="text-[11px] text-gray-400">{s.trend}</td>
                  <td>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${aiTone}`}>{s.aiImpact}</span>
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

/* ════════════════════════════════════════════════════════════════════════
 * VALUATION TAB — P/E, P/B, Dividend Yield, EV/EBITDA, CAPE
 * ══════════════════════════════════════════════════════════════════════ */
function ValuationTab() {
  const peEnvelope = peCycles.map(p => ({
    period: p.period,
    avgPe: p.avgPe,
    minPe: p.minPe,
    maxPe: p.maxPe,
    range: p.maxPe - p.minPe,
  }));

  const capeChart = capeHistory.map(c => ({ ...c, label: c.date }));

  const payoutChart = payoutEvolution.map(p => ({
    sector: p.sector,
    '1990': p.y1990, '2000': p.y2000, '2010': p.y2010, '2025': p.y2025,
  }));

  return (
    <div className="space-y-5">
      {/* P/E Envelope + CAPE side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">P/E Envelope by Decade</h3>
          <p className="text-[11px] text-gray-500 mb-3">Average trailing P/E + min-to-max range — valuations expanded with falling rates &amp; FII flows</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={peEnvelope}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="range" name="Min–Max range" fill="#1c2940" stackId="band" />
              <Bar dataKey="minPe" name="Min P/E" fill="transparent" stackId="band" />
              <Line type="monotone" dataKey="avgPe" name="Avg P/E" stroke="#d4a843" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="maxPe" name="Max P/E" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              <Line type="monotone" dataKey="minPe" name="Min P/E" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Shiller CAPE — Percentile Map</h3>
          <p className="text-[11px] text-gray-500 mb-3">Cyclically adjusted P/E vs implied 10-year forward return</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={capeChart}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis yAxisId="cape" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="ret" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine yAxisId="cape" y={20} stroke="#d4a843" strokeDasharray="3 3" label={{ value: 'long-run avg', fill: '#e8c96a', fontSize: 10, position: 'right' }} />
              <Bar yAxisId="cape" dataKey="cape" name="CAPE" radius={[4, 4, 0, 0]}>
                {capeChart.map((d, i) => (
                  <Cell key={i} fill={d.percentile >= 80 ? '#ef4444' : d.percentile >= 50 ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
              <Line yAxisId="ret" type="monotone" dataKey="expected10YPct" name="Implied 10Y CAGR" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P/E Mean Reversion + Regime Drivers */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="glass-card p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-1">P/E → Forward Return Buckets</h3>
          <p className="text-[11px] text-gray-500 mb-3">Starting P/E predicts forward CAGR (5Y vs 10Y)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={peMeanReversion}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="startingPe" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="fwd5YrCagr" name="5Y Fwd" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fwd10YrCagr" name="10Y Fwd" fill="#d4a843" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 p-2.5 rounded-md bg-[rgba(212,168,67,0.08)] border border-[rgba(212,168,67,0.25)]">
            <div className="text-[11px] text-[color:var(--color-gold-light)] font-semibold flex items-center gap-2">
              <AlertTriangle size={12} /> At today's 22.5x trailing → model implies +6% over 5Y, +10% over 10Y.
            </div>
          </div>
        </div>

        <div className="glass-card p-5 xl:col-span-3">
          <h3 className="text-sm font-semibold text-white mb-3">Why P/Es Re-Rated Structurally</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-[rgba(42,58,82,0.7)]">
                <th className="text-left py-2">Driver</th>
                <th className="text-right">1970–90</th>
                <th className="text-right">1990–00</th>
                <th className="text-right">2000–10</th>
                <th className="text-right">2010–25</th>
              </tr>
            </thead>
            <tbody>
              {peRegimeDrivers.map(r => (
                <tr key={r.driver} className="border-b border-[rgba(42,58,82,0.35)] hover:bg-[rgba(212,168,67,0.04)]">
                  <td className="py-2 text-gray-300 font-medium">{r.driver}</td>
                  <td className="text-right tabular-nums text-gray-400">{r.v1}</td>
                  <td className="text-right tabular-nums text-gray-400">{r.v2}</td>
                  <td className="text-right tabular-nums text-gray-300">{r.v3}</td>
                  <td className="text-right tabular-nums font-semibold text-[color:var(--color-gold-light)]">{r.v4}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* P/B & Yield row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">P/B vs ROE — Implied Cost of Equity</h3>
          <p className="text-[11px] text-gray-500 mb-3">Sustainable P/B = ROE / CoE. Bubbles always show extreme P/B.</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={pbHistory}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis yAxisId="pb" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="pct" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar yAxisId="pb" dataKey="pb" name="P/B" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Line yAxisId="pct" type="monotone" dataKey="roe" name="ROE" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="pct" type="monotone" dataKey="impliedCoe" name="Implied CoE" stroke="#d4a843" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Dividend Yield — Structural Decline</h3>
          <p className="text-[11px] text-gray-500 mb-3">Yields fell from 4.5% → 1.1% as valuations re-rated &amp; buybacks rose</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={divYieldHistory}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="peakYield" name="Peak" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="avgYield" name="Average" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="troughYield" name="Trough" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BVPS & EPS growth + Payout heatmap */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">BVPS vs EPS Growth (decadal)</h3>
          <p className="text-[11px] text-gray-500 mb-3">Post-2010 EPS lagged BVPS — companies pivoted to dividends/buybacks</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bvepsGrowth}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="bvpsCagr" name="BVPS CAGR" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="epsCagr" name="EPS CAGR" fill="#d4a843" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payout" name="Payout %" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Dividend Payout — Sectoral Maturation</h3>
          <p className="text-[11px] text-gray-500 mb-3">IT payout: 10% (1990) → 75% (2025). FMCG: 40% → 70%. Markets are getting older.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={payoutChart}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="sector" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="1990" fill="#64748b" />
              <Bar dataKey="2000" fill="#3b82f6" />
              <Bar dataKey="2010" fill="#10b981" />
              <Bar dataKey="2025" fill="#d4a843" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EV/EBITDA & ROIC spread */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">EV / EBITDA — Cleanest Multiple</h3>
          <p className="text-[11px] text-gray-500 mb-3">Capital structure-neutral. Crisis bargains @ 5.8x → bubble territory @ 16.5x.</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={evEbitdaHistory}>
              <defs>
                <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#8b5cf6" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={11} stroke="#d4a843" strokeDasharray="3 3" label={{ value: '30Y avg ~11x', fill: '#e8c96a', fontSize: 10, position: 'right' }} />
              <Area type="monotone" dataKey="multiple" name="EV/EBITDA" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#evGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card overflow-x-auto">
          <table className="w-full sensex-table">
            <thead>
              <tr>
                <th className="text-left">Year</th>
                <th className="text-right">ROIC</th>
                <th className="text-right">WACC</th>
                <th className="text-right">Spread</th>
                <th className="text-right">EV/EBITDA</th>
                <th className="text-left">Signal</th>
              </tr>
            </thead>
            <tbody>
              {roicSpread.map(r => (
                <tr key={r.year}>
                  <td className="text-white font-semibold">{r.year}</td>
                  <td className="text-right tabular-nums text-gray-300">{r.roic}%</td>
                  <td className="text-right tabular-nums text-gray-300">{r.wacc}%</td>
                  <td className={`text-right tabular-nums font-semibold ${r.spread > 5 ? 'text-emerald-300' : 'text-amber-300'}`}>+{r.spread}%</td>
                  <td className="text-right tabular-nums text-[color:var(--color-gold-light)]">{r.evEbitda.toFixed(1)}x</td>
                  <td className="text-[11px] text-gray-300">{r.signal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * SECTORS TAB
 * ══════════════════════════════════════════════════════════════════════ */
function SectorsTab() {
  const sectorScatter = sectorPeDispersion.map(s => ({
    name: s.sector,
    x: s.avg20Y,
    y: s.currentPe,
    z: Math.abs(s.zScore) * 100 + 50,
    sector: s.sector,
    z_score: s.zScore,
    color: s.signal === 'Cheap' ? '#10b981'
      : s.signal === 'Neutral' ? '#3b82f6'
      : s.signal === 'Slightly Over' ? '#f59e0b'
      : s.signal === 'Overvalued' ? '#ef4444'
      : '#dc2626',
  }));

  return (
    <div className="space-y-5">
      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Decadal Sector Leaders &amp; Laggards</h3>
        <p className="text-[11px] text-gray-500 mb-3">CAGR spread = winner − loser. Mean leadership flips every decade.</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={decadeWinners} layout="vertical">
            <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="decade" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine x={0} stroke="#475569" />
            <Bar dataKey="bestCagr" name="Best sector" fill="#10b981" radius={[0, 6, 6, 0]} />
            <Bar dataKey="worstCagr" name="Worst sector" fill="#ef4444" radius={[6, 0, 0, 6]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full sensex-table">
          <thead>
            <tr>
              <th className="text-left">Decade</th>
              <th className="text-left">Best Sector</th>
              <th className="text-right">CAGR</th>
              <th className="text-left">Worst Sector</th>
              <th className="text-right">CAGR</th>
              <th className="text-right">Spread</th>
            </tr>
          </thead>
          <tbody>
            {decadeWinners.map(d => (
              <tr key={d.decade}>
                <td className="text-white font-semibold">{d.decade}</td>
                <td className="text-emerald-300 font-medium">{d.bestSector}</td>
                <td className="text-right tabular-nums text-emerald-300">+{d.bestCagr}%</td>
                <td className="text-red-300 font-medium">{d.worstSector}</td>
                <td className={`text-right tabular-nums ${d.worstCagr >= 0 ? 'text-gray-300' : 'text-red-300'}`}>{d.worstCagr >= 0 ? '+' : ''}{d.worstCagr}%</td>
                <td className="text-right tabular-nums font-bold text-[color:var(--color-gold-light)]">{d.spread}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sector P/E dispersion scatter */}
      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Sector P/E Dispersion vs 20-Year Average</h3>
        <p className="text-[11px] text-gray-500 mb-3">Diagonal = fair value. Above diagonal = expensive vs history. Bubble size = |z-score|.</p>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
            <XAxis type="number" dataKey="x" name="20Y avg P/E" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}x`} label={{ value: '20Y average P/E', position: 'insideBottom', offset: -8, fill: '#94a3b8', fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="Current P/E" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}x`} label={{ value: 'Current P/E', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-xs">
                    <div className="font-semibold text-white mb-1">{d.sector}</div>
                    <div className="text-gray-400">Avg 20Y: <span className="tabular-nums text-gray-200">{d.x}x</span></div>
                    <div className="text-gray-400">Current: <span className="tabular-nums text-[color:var(--color-gold-light)]">{d.y}x</span></div>
                    <div className="text-gray-400">Z-score: <span className={`tabular-nums ${d.z_score > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{d.z_score >= 0 ? '+' : ''}{d.z_score.toFixed(1)}σ</span></div>
                  </div>
                );
              }}
            />
            <ReferenceLine segment={[{ x: 8, y: 8 }, { x: 50, y: 50 }]} stroke="#d4a843" strokeDasharray="4 4" />
            <Scatter data={sectorScatter}>
              {sectorScatter.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Cap-Tier CAGR &amp; Quality Premium</h3>
          <p className="text-[11px] text-gray-500 mb-3">Small caps always outperform; high-ROE always beats low-ROE</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={marketCapSegments}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="large" name="Large Cap" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="mid" name="Mid Cap" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="small" name="Small Cap" fill="#d4a843" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Quality Factor Spread (High − Low ROE)</h3>
          <p className="text-[11px] text-gray-500 mb-3">High-ROE basket has compounded ~8% faster than low-ROE for two decades</p>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={qualityFactor}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="highRoe" name="High ROE" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="lowRoe" name="Low ROE" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="spread" name="Spread" stroke="#d4a843" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * MACRO TAB
 * ══════════════════════════════════════════════════════════════════════ */
function MacroTab() {
  const fxChart = fxImpact.map(f => ({
    period: f.period,
    'Nifty INR': f.nseInr,
    'INR/USD Δ': f.inrUsd,
    'Nifty USD': f.nseUsd,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Real Rates vs Equity CAGR</h3>
          <p className="text-[11px] text-gray-500 mb-3">When real rates fall below 3%, equities thrive — every regime confirms this</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={realRateHistory}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis yAxisId="rr" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis yAxisId="ret" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine yAxisId="rr" y={3} stroke="#d4a843" strokeDasharray="3 3" label={{ value: '3% threshold', fill: '#e8c96a', fontSize: 10, position: 'right' }} />
              <Bar yAxisId="rr" dataKey="realRate" name="Real rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Line yAxisId="ret" type="monotone" dataKey="marketCagr" name="Market CAGR" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">10Y G-Sec ↔ Nifty P/E Correlation</h3>
          <p className="text-[11px] text-gray-500 mb-3">Inverse relationship has weakened post-QE — rate sensitivity is muted</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rateCorrelations}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} domain={[-1, 0]} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={0} stroke="#475569" />
              <Bar dataKey="correlation" name="Correlation ρ" radius={[6, 6, 0, 0]}>
                {rateCorrelations.map((d, i) => (
                  <Cell key={i} fill={d.correlation < -0.6 ? '#dc2626' : d.correlation < -0.4 ? '#f59e0b' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 p-2.5 rounded-md bg-[rgba(59,130,246,0.07)] border border-blue-500/30">
            <div className="text-[11px] text-blue-200 font-semibold flex items-center gap-2">
              <Scale size={12} /> Gordon-implied fair P/E at 10% CoE, 5% g = 20x. Today's 22.5x ⇒ ~12% premium.
            </div>
          </div>
        </div>
      </div>

      {/* FII signals */}
      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">FII Flow Signals — Next-Month Predictive Power</h3>
        <p className="text-[11px] text-gray-500 mb-3">Extreme outflows (&lt; -50K Cr) → 78% hit-rate next-month-positive. Capitulation = opportunity.</p>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={fiiSignals}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
            <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
            <YAxis yAxisId="ret" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
            <YAxis yAxisId="hit" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine yAxisId="ret" y={0} stroke="#475569" />
            <Bar yAxisId="ret" dataKey="nextMonthAvg" name="Next-month avg" radius={[4, 4, 0, 0]}>
              {fiiSignals.map((d, i) => (
                <Cell key={i} fill={d.nextMonthAvg >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
            <Line yAxisId="hit" type="monotone" dataKey="hitRate" name="Hit rate" stroke="#d4a843" strokeWidth={2.5} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="glass-card p-5 xl:col-span-1">
          <h3 className="text-sm font-semibold text-white mb-3">FII Sector Ownership</h3>
          <div className="space-y-2">
            {fiiOwnership.map(f => (
              <div key={f.sector} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-300 font-medium">{f.sector}</span>
                  <span className="tabular-nums text-[color:var(--color-gold-light)] font-semibold">{f.ownershipPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(28,41,64,0.8)] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#3b82f6] to-[#d4a843]"
                    style={{ width: `${(f.ownershipPct / 50) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-500">{f.trend}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-1">Currency Drag — INR vs USD Returns</h3>
          <p className="text-[11px] text-gray-500 mb-3">INR depreciates ~4% p.a. — USD investors lose 30–40% of INR returns</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={fxChart}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={0} stroke="#475569" />
              <Bar dataKey="Nifty INR" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="INR/USD Δ" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Nifty USD" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * FORECAST TAB
 * ══════════════════════════════════════════════════════════════════════ */
function ForecastTab() {
  const scenarioChart = scenarios.map(s => ({
    scenario: s.scenario,
    cagr10Y: s.cagr10Y,
    earningsGrowth: s.earningsGrowth,
    endPe: s.endPe,
    probability: s.probability,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Base 10Y CAGR"            value={`${expectedReturn10YPct.toFixed(1)}%`}   sub="building-block model" gold smallValue />
        <Kpi label="Probability-Weighted"     value={`${probabilityWeightedCagrPct.toFixed(1)}%`} sub="across 4 scenarios"  gold smallValue />
        <Kpi label="55Y Historical CAGR"      value="14.1%"                                    sub="for context"            />
        <Kpi label="Forecast vs Historical"   value={`${(probabilityWeightedCagrPct - 14.1).toFixed(1)}%`} sub="below long-run avg" tone="down" smallValue />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">10-Year Building-Block Model</h3>
          <p className="text-[11px] text-gray-500 mb-3">Starting yield + earnings growth + valuation change ⇒ total return</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-[rgba(42,58,82,0.7)]">
                <th className="text-left py-2">Component</th>
                <th className="text-right">Current</th>
                <th className="text-right">10Y assumption</th>
              </tr>
            </thead>
            <tbody>
              {expectedReturnModel.map(c => (
                <tr key={c.component} className="border-b border-[rgba(42,58,82,0.35)] hover:bg-[rgba(212,168,67,0.04)]">
                  <td className="py-2 text-gray-300 font-medium">{c.component}</td>
                  <td className="text-right tabular-nums text-gray-300">{c.current}</td>
                  <td className="text-right tabular-nums text-[color:var(--color-gold-light)] font-semibold">{c.assumption}</td>
                </tr>
              ))}
              <tr className="bg-[rgba(212,168,67,0.06)]">
                <td className="py-2 text-white font-bold">Total Expected Return</td>
                <td className="text-right">—</td>
                <td className="text-right tabular-nums text-[color:var(--color-gold-light)] font-bold text-base">{expectedReturn10YPct.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Scenario Tree</h3>
          <p className="text-[11px] text-gray-500 mb-3">Earnings × ending P/E ⇒ 10Y CAGR. Bubble = subjective probability.</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
              <XAxis type="number" dataKey="earningsGrowth" name="EPS growth" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 16]} label={{ value: 'Earnings growth', position: 'insideBottom', offset: -8, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="number" dataKey="cagr10Y" name="10Y CAGR" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[-5, 18]} label={{ value: '10Y CAGR', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <ZAxis type="number" dataKey="probability" range={[80, 600]} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={0} stroke="#475569" />
              <Scatter data={scenarioChart}>
                {scenarioChart.map((d, i) => (
                  <Cell key={i} fill={d.cagr10Y >= 10 ? '#10b981' : d.cagr10Y >= 5 ? '#3b82f6' : d.cagr10Y >= 0 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full sensex-table">
          <thead>
            <tr>
              <th className="text-left">Scenario</th>
              <th className="text-right">EPS growth</th>
              <th className="text-right">End P/E</th>
              <th className="text-right">10Y CAGR</th>
              <th className="text-right">Probability</th>
              <th className="text-right">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map(s => {
              const contribution = (s.cagr10Y * s.probability) / 100;
              const tone = s.scenario === 'Bull' ? 'text-emerald-300'
                : s.scenario === 'Base' ? 'text-blue-300'
                : s.scenario === 'Bear' ? 'text-amber-300'
                : 'text-red-300';
              return (
                <tr key={s.scenario}>
                  <td><span className={`font-bold ${tone}`}>{s.scenario}</span></td>
                  <td className="text-right tabular-nums text-gray-300">{s.earningsGrowth}%</td>
                  <td className="text-right tabular-nums text-gray-300">{s.endPe}x</td>
                  <td className={`text-right tabular-nums font-semibold ${s.cagr10Y >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{s.cagr10Y >= 0 ? '+' : ''}{s.cagr10Y.toFixed(1)}%</td>
                  <td className="text-right tabular-nums text-gray-300">{s.probability}%</td>
                  <td className="text-right tabular-nums font-semibold text-[color:var(--color-gold-light)]">{contribution.toFixed(2)}%</td>
                </tr>
              );
            })}
            <tr className="bg-[rgba(212,168,67,0.06)]">
              <td colSpan={5} className="text-right text-white font-semibold">Probability-weighted</td>
              <td className="text-right tabular-nums font-bold text-[color:var(--color-gold-light)]">{probabilityWeightedCagrPct.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * PLAYBOOK TAB — strategic + tactical allocation
 * ══════════════════════════════════════════════════════════════════════ */
function PlaybookTab() {
  const radarData = strategicAllocation.map(a => ({
    asset: a.asset.length > 16 ? a.asset.split(' ')[0] : a.asset,
    weight: a.weight,
    expectedReturn: a.expectedReturn * 5, // scale for radar
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Strategic Allocation (2025)</h3>
          <p className="text-[11px] text-gray-500 mb-3">Multi-asset blueprint for the next decade — quality core + crisis hedges</p>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2a3a52" />
              <PolarAngleAxis dataKey="asset" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 9 }} stroke="#2a3a52" />
              <Radar name="Weight %" dataKey="weight" stroke="#d4a843" fill="#d4a843" fillOpacity={0.3} strokeWidth={2} />
              <Radar name="Expected Return ×5" dataKey="expectedReturn" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Allocation Detail</h3>
          <div className="space-y-2">
            {strategicAllocation.map(a => {
              const blended = (a.weight * a.expectedReturn) / 100;
              return (
                <div key={a.asset} className="p-3 rounded-lg bg-[rgba(28,41,64,0.5)] border border-[rgba(42,58,82,0.5)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-white">{a.asset}</span>
                    <span className="pill text-[9px]">{a.weight}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(15,23,41,0.85)] overflow-hidden mb-1.5">
                    <div className="h-full bg-gradient-to-r from-[#3b82f6] to-[#d4a843]" style={{ width: `${a.weight * 2.5}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>{a.rationale}</span>
                    <span className="text-emerald-300 font-semibold tabular-nums">+{a.expectedReturn}% · contrib {blended.toFixed(2)}%</span>
                  </div>
                </div>
              );
            })}
            <div className="p-2.5 rounded-md bg-[rgba(212,168,67,0.08)] border border-[rgba(212,168,67,0.25)] mt-2">
              <div className="text-[11px] text-[color:var(--color-gold-light)] font-semibold flex items-center justify-between">
                <span>Blended expected return</span>
                <span className="tabular-nums">
                  +{strategicAllocation.reduce((s, a) => s + (a.weight * a.expectedReturn) / 100, 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Tactical Overlay (next 12 months)</h3>
        <p className="text-[11px] text-gray-500 mb-3">Active tilts vs the strategic core. Sized in percentage points.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tacticalOverlay.map(t => {
            const dirTone = t.direction === 'OW' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : t.direction === 'UW' ? 'border-red-500/40 bg-red-500/10 text-red-300'
              : 'border-gray-500/30 bg-gray-500/5 text-gray-300';
            return (
              <div key={t.position} className="p-3 rounded-lg bg-[rgba(28,41,64,0.5)] border border-[rgba(42,58,82,0.5)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">{t.position}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dirTone}`}>
                    {t.direction} {t.sizePct !== 0 ? `${t.sizePct > 0 ? '+' : ''}${t.sizePct}%` : ''}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400">{t.catalyst}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-2">Expected Portfolio</h3>
          <div className="kpi-eyebrow">Return target</div>
          <div className="text-3xl font-bold text-[color:var(--color-gold-light)] tabular-nums">11–12%</div>
          <div className="text-[11px] text-gray-500 mb-4">CAGR · 2025–2035</div>
          <div className="kpi-eyebrow">Max drawdown risk</div>
          <div className="text-2xl font-bold text-red-300 tabular-nums">-35%</div>
          <div className="text-[11px] text-gray-500">if crash scenario hits</div>
        </div>

        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-3">Verdict — Where Are We?</h3>
          <p className="text-xs text-gray-300 leading-relaxed mb-3">
            Late-cycle, expensive but <span className="text-[color:var(--color-gold-light)] font-semibold">not bubble</span>.
            P/E z-score similar to 2017 or 2006 &mdash; not 2007. ROE quality is structurally higher
            (margin-led, deleveraged) yet starting valuation caps the next decade's CAGR near
            <span className="text-[color:var(--color-gold-light)] font-semibold"> 10–12%</span>, well below the 55-year average of 14.1%.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <Verdict label="Stay invested" tone="up"   detail="No 10Y window has been negative" />
            <Verdict label="Quality bias" tone="up"   detail="High-ROE compounds 8% faster" />
            <Verdict label="Hold dry powder" tone="warn" detail="Wait for 20% correction to deploy cash" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Verdict({ label, detail, tone }: { label: string; detail: string; tone: 'up' | 'warn' | 'down' }) {
  const styles = tone === 'up' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
    : tone === 'warn' ? 'border-amber-500/30 bg-amber-500/5 text-amber-200'
    : 'border-red-500/30 bg-red-500/5 text-red-200';
  return (
    <div className={`p-3 rounded-lg border ${styles}`}>
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{detail}</div>
    </div>
  );
}

/* keep fmtN referenced for parity with shared util */
void fmtN;
