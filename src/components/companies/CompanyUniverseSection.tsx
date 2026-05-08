import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend, ReferenceLine, ScatterChart, Scatter, ZAxis,
  ComposedChart, Area, Cell,
} from 'recharts';
import {
  Building2, TrendingUp, AlertTriangle, Activity, Target, Crown, Layers,
  Search, Download, ArrowUpDown, ArrowUp, ArrowDown, Coins, Sparkles, Gauge,
} from 'lucide-react';
import { COMPANY_PROFILES, getCompany, type CompanyProfile } from '@/data/companies';
import {
  buildCompanySnapshot, runMonteCarlo, valueWithAssumptions,
  type CompanySnapshot,
} from '@/utils/genericModel';
import { SectionHeader, MetricCard, ChartTooltip, fmt, fmtN } from '@/components/itc/shared';

interface CompanyUniverseSectionProps {
  initialCompanyId?: string;
}

// =============================================================================
// Universe-wide derived rows
// =============================================================================

interface UniverseRow {
  profile: CompanyProfile;
  snapshot: CompanySnapshot;
  ticker: string;
  name: string;
  sector: string;
  category: string;
  cmp: number;
  blended: number;
  upside: number;
  dcf: number;
  prob: number;
  revCagr: number;
  patCagr: number;
  ebitdaMargin: number;
  pe: number;
  divYield: number;
  roic: number;
  wacc: number;
  marketCap: number;
  color: string;
}

// Derive a coarse category from the verbose sector string (e.g. "FMCG - Personal Care & Foods" -> "FMCG").
function deriveCategory(sector: string): string {
  const head = sector.split(/[/\-—]/)[0]!.trim();
  // Group banking/NBFC variants together
  if (/bank/i.test(head)) return 'Banking';
  if (/nbfc|finance/i.test(head)) return 'NBFC';
  if (/insurance/i.test(head)) return 'Insurance';
  if (/it ?services|infotech|technolog/i.test(head)) return 'IT Services';
  if (/cement/i.test(head)) return 'Cement';
  if (/steel|metal/i.test(head)) return 'Metals';
  if (/auto/i.test(head)) return 'Autos';
  if (/pharma/i.test(head)) return 'Pharma';
  if (/oil|gas|refining/i.test(head)) return 'Oil & Gas';
  if (/telecom/i.test(head)) return 'Telecom';
  if (/utilit|power/i.test(head)) return 'Utilities';
  if (/paint/i.test(head)) return 'Paints';
  if (/jewel|retail/i.test(head)) return 'Consumer Disc';
  if (/port|infra/i.test(head)) return 'Infra & Ports';
  if (/fmcg|staples|tobacco|consumer/i.test(head)) return 'FMCG / Consumer';
  return head;
}

function buildUniverseRow(p: CompanyProfile): UniverseRow {
  const snap = buildCompanySnapshot(p);
  const last = p.historical[p.historical.length - 1]!;
  const first = p.historical[0]!;
  const years = Math.max(1, p.historical.length - 1);
  const revCagr = (Math.pow(last.revenue / first.revenue, 1 / years) - 1) * 100;
  const patCagr = (Math.pow(last.pat / Math.max(1, first.pat), 1 / years) - 1) * 100;
  const ebitdaMargin = (last.ebitda / Math.max(1, last.revenue)) * 100;
  const pe = p.currentMarketPrice / Math.max(0.01, last.eps);
  const divYield = (last.dps / Math.max(0.01, p.currentMarketPrice)) * 100;
  const roic = snap.eva[snap.eva.length - 1]?.roic ?? 0;
  return {
    profile: p,
    snapshot: snap,
    ticker: p.ticker,
    name: p.name,
    sector: p.sector,
    category: deriveCategory(p.sector),
    cmp: p.currentMarketPrice,
    blended: snap.bridge.blendedPerShare,
    upside: snap.bridge.upside,
    dcf: snap.dcf.perShareValue,
    prob: snap.scenarios.upsideVsMarket,
    revCagr,
    patCagr,
    ebitdaMargin,
    pe,
    divYield,
    roic,
    wacc: p.assumptions.wacc,
    marketCap: p.currentMarketPrice * p.sharesOutstandingCr,
    color: p.accentColor,
  };
}

// =============================================================================
// Main section
// =============================================================================

export function CompanyUniverseSection({ initialCompanyId = 'itc' }: CompanyUniverseSectionProps) {
  const [selectedId, setSelectedId] = useState<string>(initialCompanyId);
  const universe = useMemo(() => COMPANY_PROFILES.map(buildUniverseRow), []);
  const profile = useMemo(() => getCompany(selectedId), [selectedId]);
  const snapshot = useMemo(() => buildCompanySnapshot(profile), [profile]);
  const selectedRow = useMemo(
    () => universe.find(u => u.profile.id === selectedId) ?? universe[0]!,
    [universe, selectedId],
  );

  return (
    <div>
      <SectionHeader
        title="Company Universe Lab"
        subtitle="Apply the same DCF, scenarios, Monte Carlo, reverse DCF, relative valuation, DDM and EVA framework to all 30 Sensex constituents plus Kansai Nerolac and VST Industries - spanning FMCG, IT, paints, tobacco, oil & gas, banking, NBFC, insurance, autos, pharma, telecom, infrastructure, utilities, metals, cement, jewellery and ports - all on the same FY21-FY25 actuals + FY26E-FY32E projection grid."
        icon={<Building2 size={22} />}
      />

      <UniverseStatsRibbon universe={universe} />
      <TopPicksRibbon universe={universe} selectedId={selectedId} onSelect={setSelectedId} />
      <CompanySwitcher universe={universe} selectedId={selectedId} onSelect={setSelectedId} />
      <CompanyHero row={selectedRow} snapshot={snapshot} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <HistoricalPanel profile={profile} />
        <ProjectionPanel snapshot={snapshot} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ScenarioPanel snapshot={snapshot} />
        <MonteCarloPanel profile={profile} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ReverseDcfPanel profile={profile} snapshot={snapshot} />
        <RelativeValPanel snapshot={snapshot} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DDMPanel snapshot={snapshot} />
        <EvaPanel snapshot={snapshot} />
      </div>

      <div className="mt-6">
        <BridgePanel snapshot={snapshot} />
      </div>

      <div className="mt-6">
        <ComparativeMatrix universe={universe} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      <div className="mt-6">
        <SegmentsPanel profile={profile} />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <InsightCard
          title="Key Drivers"
          items={profile.keyDrivers}
          icon={<TrendingUp size={18} />}
          tone="emerald"
        />
        <InsightCard
          title="Key Risks"
          items={profile.keyRisks}
          icon={<AlertTriangle size={18} />}
          tone="red"
        />
        <InsightCard
          title="Recent Highlights"
          items={profile.recentHighlights}
          icon={<Activity size={18} />}
          tone="blue"
        />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-5">
        <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
          <Target size={18} className="text-yellow-400" /> Investment Thesis
        </h3>
        <p className="text-gray-300 leading-relaxed">{profile.thesisShort}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Universe stats ribbon - quick aggregate summary across all 32 companies
// =============================================================================

function UniverseStatsRibbon({ universe }: { universe: UniverseRow[] }) {
  const stats = useMemo(() => {
    const n = universe.length;
    const positiveUpside = universe.filter(u => u.upside > 0).length;
    const avgUpside = universe.reduce((s, u) => s + u.upside, 0) / Math.max(1, n);
    const totalMcap = universe.reduce((s, u) => s + u.marketCap, 0);
    const avgYield = universe.reduce((s, u) => s + u.divYield, 0) / Math.max(1, n);
    const avgPe = universe.reduce((s, u) => s + u.pe, 0) / Math.max(1, n);
    return { n, positiveUpside, avgUpside, totalMcap, avgYield, avgPe };
  }, [universe]);

  const items: { label: string; value: string; sub: string }[] = [
    { label: 'Companies covered', value: `${stats.n}`, sub: 'Sensex 30 + KNPL + VSTL' },
    {
      label: 'Showing upside',
      value: `${stats.positiveUpside} / ${stats.n}`,
      sub: `Avg blended ${stats.avgUpside >= 0 ? '+' : ''}${stats.avgUpside.toFixed(1)}%`,
    },
    {
      label: 'Aggregate market cap',
      value: fmt(stats.totalMcap),
      sub: 'Sum of CMP × shares',
    },
    {
      label: 'Avg dividend yield',
      value: `${stats.avgYield.toFixed(2)}%`,
      sub: `Avg trailing P/E ${stats.avgPe.toFixed(1)}x`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {items.map(it => (
        <div key={it.label} className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400">{it.label}</p>
          <p className="text-xl font-bold text-white mt-0.5">{it.value}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{it.sub}</p>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Top picks ribbon - quick discovery across upside, yield, growth
// =============================================================================

function TopPicksRibbon({
  universe,
  selectedId,
  onSelect,
}: {
  universe: UniverseRow[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const topUpside = useMemo(() => [...universe].sort((a, b) => b.upside - a.upside).slice(0, 3), [universe]);
  const topYield = useMemo(() => [...universe].sort((a, b) => b.divYield - a.divYield).slice(0, 3), [universe]);
  const topGrowth = useMemo(() => [...universe].sort((a, b) => b.revCagr - a.revCagr).slice(0, 3), [universe]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
      <PickCard
        title="Highest Implied Upside"
        icon={<Sparkles size={14} className="text-emerald-400" />}
        accent="border-emerald-500/30 bg-emerald-950/15"
        rows={topUpside}
        formatValue={r => `${r.upside >= 0 ? '+' : ''}${r.upside.toFixed(1)}%`}
        valueTone={r => (r.upside > 15 ? 'text-emerald-400' : r.upside > 0 ? 'text-emerald-300' : 'text-red-400')}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <PickCard
        title="Top Dividend Yield"
        icon={<Coins size={14} className="text-amber-400" />}
        accent="border-amber-500/30 bg-amber-950/15"
        rows={topYield}
        formatValue={r => `${r.divYield.toFixed(2)}%`}
        valueTone={() => 'text-amber-300'}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <PickCard
        title="Highest 5Y Revenue CAGR"
        icon={<TrendingUp size={14} className="text-blue-400" />}
        accent="border-blue-500/30 bg-blue-950/15"
        rows={topGrowth}
        formatValue={r => `${r.revCagr.toFixed(1)}%`}
        valueTone={() => 'text-blue-300'}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}

function PickCard({
  title, icon, accent, rows, formatValue, valueTone, selectedId, onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  rows: UniverseRow[];
  formatValue: (r: UniverseRow) => string;
  valueTone: (r: UniverseRow) => string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={`rounded-lg border ${accent} p-3`}>
      <div className="text-[10px] uppercase tracking-wider text-gray-300 font-semibold flex items-center gap-2 mb-2">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-1">
        {rows.map((r, i) => {
          const active = selectedId === r.profile.id;
          return (
            <button
              key={r.profile.id}
              onClick={() => onSelect(r.profile.id)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-left ${
                active ? 'bg-black/50 ring-1 ring-white/15' : 'hover:bg-black/30'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-gray-500 w-3 tabular-nums">{i + 1}</span>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                <span className="text-white text-sm font-medium truncate">{r.ticker}</span>
                <span className="text-[10px] text-gray-400 truncate hidden sm:inline">{r.category}</span>
              </span>
              <span className={`text-sm font-semibold tabular-nums ${valueTone(r)}`}>{formatValue(r)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Enhanced switcher with search, sector filter and sort
// =============================================================================

type SortKey = 'ticker' | 'upside' | 'mcap' | 'yield' | 'cagr';

function CompanySwitcher({
  universe,
  selectedId,
  onSelect,
}: {
  universe: UniverseRow[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortKey>('ticker');

  const categories = useMemo(() => {
    const set = new Set(universe.map(u => u.category));
    return ['All', ...Array.from(set).sort()];
  }, [universe]);

  const filtered = useMemo(() => {
    let rows = universe;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        r =>
          r.ticker.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.sector.toLowerCase().includes(q),
      );
    }
    if (category !== 'All') rows = rows.filter(r => r.category === category);
    rows = [...rows].sort((a, b) => {
      switch (sortBy) {
        case 'ticker': return a.ticker.localeCompare(b.ticker);
        case 'upside': return b.upside - a.upside;
        case 'mcap':   return b.marketCap - a.marketCap;
        case 'yield':  return b.divYield - a.divYield;
        case 'cagr':   return b.revCagr - a.revCagr;
        default:       return 0;
      }
    });
    return rows;
  }, [universe, search, category, sortBy]);

  return (
    <div className="rounded-lg border border-border bg-surface p-4 mb-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ticker, name or sector..."
            className="w-full bg-black/30 border border-border rounded px-9 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/60"
            aria-label="Search companies"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-black/30 border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60"
          aria-label="Filter by sector"
        >
          {categories.map(c => (
            <option key={c} value={c}>{c === 'All' ? 'All sectors' : c}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="bg-black/30 border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60"
          aria-label="Sort companies"
        >
          <option value="ticker">Sort: Ticker A→Z</option>
          <option value="upside">Sort: Upside ↓</option>
          <option value="mcap">Sort: Market cap ↓</option>
          <option value="yield">Sort: Div yield ↓</option>
          <option value="cagr">Sort: Revenue CAGR ↓</option>
        </select>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {filtered.length} / {universe.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-8">No companies match the current filters.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {filtered.map(r => {
            const active = r.profile.id === selectedId;
            const upTone =
              r.upside > 15 ? 'text-emerald-400'
              : r.upside > 0 ? 'text-blue-300'
              : r.upside > -10 ? 'text-amber-400'
              : 'text-red-400';
            return (
              <button
                key={r.profile.id}
                onClick={() => onSelect(r.profile.id)}
                className={`text-left p-2 rounded border transition-all ${
                  active
                    ? 'shadow-lg'
                    : 'bg-black/20 border-border hover:border-blue-500/50 hover:bg-black/30'
                }`}
                style={
                  active
                    ? { borderColor: r.color, backgroundColor: `${r.color}26`, borderWidth: 1.5 }
                    : undefined
                }
                aria-pressed={active}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-white text-xs font-bold truncate">{r.ticker}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 truncate">{r.category}</div>
                <div className="flex items-baseline justify-between mt-1 gap-1">
                  <span className="text-[10px] text-gray-300 tabular-nums">₹{r.cmp.toFixed(0)}</span>
                  <span className={`text-[10px] font-semibold tabular-nums ${upTone}`}>
                    {r.upside >= 0 ? '+' : ''}{r.upside.toFixed(0)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Hero metrics row - now driven by precomputed UniverseRow + CompanySnapshot
// =============================================================================

function CompanyHero({ row, snapshot }: { row: UniverseRow; snapshot: CompanySnapshot }) {
  const profile = row.profile;
  const last = profile.historical[profile.historical.length - 1]!;

  const upsideBlended = snapshot.bridge.upside;
  const toneColor =
    upsideBlended > 15 ? 'green' : upsideBlended > 0 ? 'blue' : upsideBlended > -10 ? 'gold' : 'red';

  return (
    <div>
      <div className="rounded-lg border border-border bg-surface p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3 flex-wrap">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: profile.accentColor }}
                aria-hidden
              />
              {profile.name}
              <span className="text-sm font-normal text-gray-400 px-2 py-0.5 rounded bg-black/30 border border-border">
                {profile.ticker}
              </span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded border"
                style={{ borderColor: `${profile.accentColor}66`, color: profile.accentColor, backgroundColor: `${profile.accentColor}14` }}
              >
                {row.category}
              </span>
            </h3>
            <p className="text-gray-400 text-sm mt-1 max-w-2xl">{profile.tagline}</p>
            <p className="text-[11px] text-gray-500 mt-1">{profile.sector}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Current Price</p>
            <p className="text-3xl font-bold text-white">₹{profile.currentMarketPrice.toFixed(0)}</p>
            <p className="text-xs text-gray-400">
              Mkt-cap {fmt(profile.currentMarketPrice * profile.sharesOutstandingCr)}
              {' \u00B7 '}Shares {fmtN(profile.sharesOutstandingCr)} Cr
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="FY25 Revenue"
          value={fmt(last.revenue)}
          subtitle={`5Y CAGR: ${row.revCagr >= 0 ? '+' : ''}${row.revCagr.toFixed(1)}%`}
          trend={row.revCagr}
          color="blue"
        />
        <MetricCard
          title="FY25 PAT"
          value={fmt(last.pat)}
          subtitle={`5Y CAGR: ${row.patCagr >= 0 ? '+' : ''}${row.patCagr.toFixed(1)}%`}
          trend={row.patCagr}
          color="green"
        />
        <MetricCard
          title="Blended Target"
          value={`₹${snapshot.bridge.blendedPerShare.toFixed(0)}`}
          subtitle={`Upside ${upsideBlended >= 0 ? '+' : ''}${upsideBlended.toFixed(1)}%`}
          trend={upsideBlended}
          color={toneColor}
        />
        <MetricCard
          title="DCF Fair Value"
          value={`₹${snapshot.dcf.perShareValue.toFixed(0)}`}
          subtitle={`TV ${snapshot.dcf.terminalValueWeight.toFixed(0)}% of EV`}
          color="purple"
        />
        <MetricCard
          title="Trailing P/E"
          value={`${row.pe.toFixed(1)}x`}
          subtitle={`EBITDA margin ${row.ebitdaMargin.toFixed(1)}%`}
          color="gold"
        />
        <MetricCard
          title="Dividend Yield"
          value={`${row.divYield.toFixed(2)}%`}
          subtitle={`Terminal ROIC ${row.roic.toFixed(0)}% vs WACC ${row.wacc.toFixed(1)}%`}
          color="green"
        />
      </div>
    </div>
  );
}

// =============================================================================
// Historical trend panel
// =============================================================================

function HistoricalPanel({ profile }: { profile: CompanyProfile }) {
  const data = profile.historical.map(h => ({
    fy: h.fy,
    Revenue: h.revenue,
    EBITDA: h.ebitda,
    PAT: h.pat,
    Margin: (h.ebitda / h.revenue) * 100,
    EPS: h.eps,
    DPS: h.dps,
  }));

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
        <Layers size={18} className="text-blue-400" /> Historical Trajectory (5Y)
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="fy" stroke="#9CA3AF" />
            <YAxis yAxisId="left" stroke="#9CA3AF" tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" domain={[0, 'dataMax + 5']} tickFormatter={v => `${v.toFixed(0)}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="Revenue" fill={profile.accentColor} opacity={0.85} />
            <Line yAxisId="left" type="monotone" dataKey="EBITDA" stroke="#10B981" strokeWidth={2} />
            <Line yAxisId="left" type="monotone" dataKey="PAT" stroke="#F59E0B" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="Margin" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="4 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-5 text-xs text-gray-300 mt-3 gap-2">
        {data.map(d => (
          <div key={d.fy} className="bg-black/20 rounded p-2 border border-border">
            <div className="text-gray-400">{d.fy}</div>
            <div className="font-medium text-white">EPS ₹{d.EPS.toFixed(1)}</div>
            <div className="text-gray-400">DPS ₹{d.DPS.toFixed(1)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Projection panel
// =============================================================================

function ProjectionPanel({ snapshot }: { snapshot: CompanySnapshot }) {
  const data = snapshot.projection.map(p => ({
    fy: p.fy,
    Revenue: p.revenue,
    EBITDA: p.ebitda,
    FCFF: p.fcff,
    Margin: (p.ebitda / p.revenue) * 100,
  }));

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-emerald-400" /> Forward Projection ({snapshot.projection.length}Y)
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="fy" stroke="#9CA3AF" />
            <YAxis yAxisId="left" stroke="#9CA3AF" tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" tickFormatter={v => `${v.toFixed(0)}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
            <Area yAxisId="left" type="monotone" dataKey="Revenue" fill={snapshot.profile.accentColor} fillOpacity={0.25} stroke={snapshot.profile.accentColor} strokeWidth={2} />
            <Line yAxisId="left" type="monotone" dataKey="EBITDA" stroke="#10B981" strokeWidth={2} />
            <Line yAxisId="left" type="monotone" dataKey="FCFF" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" />
            <Line yAxisId="right" type="monotone" dataKey="Margin" stroke="#8B5CF6" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Explicit PV {fmt(snapshot.dcf.pvExplicit)} &middot; Terminal PV {fmt(snapshot.dcf.pvTerminal)} &middot; Implied exit EV/EBITDA {snapshot.dcf.impliedExitEbitdaMultiple.toFixed(1)}x
      </p>
    </div>
  );
}

// =============================================================================
// Scenario panel
// =============================================================================

function ScenarioPanel({ snapshot }: { snapshot: CompanySnapshot }) {
  const data = snapshot.scenarios.scenarios.map(s => ({
    label: s.label,
    perShare: s.perShareValue,
    prob: (s.probability * 100).toFixed(0) + '%',
    color: s.color,
  }));
  const market = snapshot.profile.currentMarketPrice;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-white font-semibold text-lg mb-1 flex items-center gap-2">
        <Layers size={18} className="text-purple-400" /> Scenario Analysis
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Expected value ₹{snapshot.scenarios.expectedValue.toFixed(0)} &middot; Upside vs market {snapshot.scenarios.upsideVsMarket >= 0 ? '+' : ''}{snapshot.scenarios.upsideVsMarket.toFixed(1)}%
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis type="number" stroke="#9CA3AF" />
            <YAxis type="category" dataKey="label" stroke="#9CA3AF" width={140} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine x={market} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: `CMP ₹${market.toFixed(0)}`, fill: '#F59E0B', fontSize: 10, position: 'top' }} />
            <Bar dataKey="perShare" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-gray-300 mt-3 space-y-1">
        {snapshot.scenarios.scenarios.map(s => (
          <div key={s.id} className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="flex-1">
              <span className="font-medium text-white">{s.label}</span>
              <span className="text-gray-400"> ({(s.probability * 100).toFixed(0)}%): </span>
              <span className="text-gray-300">{s.description}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Monte Carlo panel
// =============================================================================

function MonteCarloPanel({ profile }: { profile: CompanyProfile }) {
  const mc = useMemo(() => runMonteCarlo(profile), [profile]);

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-white font-semibold text-lg mb-1 flex items-center gap-2">
        <Activity size={18} className="text-yellow-400" /> Monte Carlo Distribution ({mc.samples} draws)
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Triangular over 5 drivers &middot; P(fair &gt; CMP) = {(mc.probUpside * 100).toFixed(1)}%
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mc.histogram}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="bucket" stroke="#9CA3AF" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" height={60} />
            <YAxis stroke="#9CA3AF" />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" fill={profile.accentColor} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-5 gap-2 text-xs text-center mt-3">
        {[{ l: 'P5', v: mc.p5 }, { l: 'P25', v: mc.p25 }, { l: 'Median', v: mc.median }, { l: 'P75', v: mc.p75 }, { l: 'P95', v: mc.p95 }].map(k => (
          <div key={k.l} className="bg-black/30 rounded p-2 border border-border">
            <div className="text-gray-400">{k.l}</div>
            <div className="text-white font-semibold">₹{k.v.toFixed(0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Reverse DCF panel
// =============================================================================

function ReverseDcfPanel({ profile, snapshot }: { profile: CompanyProfile; snapshot: CompanySnapshot }) {
  const r = snapshot.reverseDCF;
  const gap = r.impliedRevenueCAGR - r.baseCAGR;
  const verdict = Math.abs(gap) < 1
    ? `Market roughly aligned with base expectations.`
    : gap > 0
      ? `Market is pricing ${gap.toFixed(1)}pp HIGHER growth than base - aggressive assumptions embedded.`
      : `Market is pricing ${Math.abs(gap).toFixed(1)}pp LOWER growth than base - potential mispricing.`;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
        <Target size={18} className="text-blue-400" /> Reverse DCF
      </h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-black/30 rounded-lg p-3 border border-border">
          <p className="text-xs text-gray-400">Current price</p>
          <p className="text-xl font-semibold text-white">₹{r.currentPrice.toFixed(0)}</p>
        </div>
        <div className="bg-black/30 rounded-lg p-3 border border-border">
          <p className="text-xs text-gray-400">Base CAGR</p>
          <p className="text-xl font-semibold text-white">{r.baseCAGR.toFixed(1)}%</p>
        </div>
        <div className={`rounded-lg p-3 border ${gap > 1 ? 'border-red-500/40 bg-red-950/30' : gap < -1 ? 'border-emerald-500/40 bg-emerald-950/30' : 'border-border bg-black/30'}`}>
          <p className="text-xs text-gray-400">Implied CAGR</p>
          <p className="text-xl font-semibold text-white">{r.impliedRevenueCAGR.toFixed(1)}%</p>
        </div>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={buildReverseCurve(profile)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="cagr" stroke="#9CA3AF" tickFormatter={v => `${v}%`} />
            <YAxis stroke="#9CA3AF" tickFormatter={v => `₹${v}`} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={r.currentPrice} stroke="#F59E0B" strokeDasharray="4 4" />
            <ReferenceLine x={r.impliedRevenueCAGR} stroke="#10B981" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="value" stroke={profile.accentColor} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-gray-300 mt-3 leading-relaxed">{verdict}</p>
    </div>
  );
}

function buildReverseCurve(profile: CompanyProfile) {
  const points: { cagr: number; value: number }[] = [];
  for (let g = -5; g <= 22; g += 1) {
    const r = valueWithAssumptions(profile, { revenueGrowthCAGR: g, revenueGrowthY1: g });
    if (r.isValid) points.push({ cagr: g, value: Math.max(0, r.perShareValue) });
  }
  return points;
}

// =============================================================================
// Relative valuation panel
// =============================================================================

function RelativeValPanel({ snapshot }: { snapshot: CompanySnapshot }) {
  const rows = snapshot.relative;
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
        <Crown size={18} className="text-yellow-400" /> Peer Relative Valuation
      </h3>
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.method} className="bg-black/20 rounded p-3 border border-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">{r.method}</span>
              <span className="text-2xl font-bold" style={{ color: snapshot.profile.accentColor }}>₹{r.perShareValue.toFixed(0)}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs text-gray-300">
              <div>Min: {r.peerMin.toFixed(1)}x</div>
              <div>Med: {r.peerMedian.toFixed(1)}x</div>
              <div>Avg: {r.peerAverage.toFixed(1)}x</div>
              <div>Max: {r.peerMax.toFixed(1)}x</div>
            </div>
          </div>
        ))}
      </div>
      <PeerScatter profile={snapshot.profile} />
    </div>
  );
}

function PeerScatter({ profile }: { profile: CompanyProfile }) {
  const data = profile.peers.map(p => ({ x: p.evEbitda, y: p.roic, z: p.marketCapCr, name: p.name, cat: p.category }));
  return (
    <div>
      <p className="text-xs text-gray-400 mt-4 mb-1">Peer ROIC vs EV/EBITDA (bubble = market cap)</p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 10, right: 10, bottom: 10, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis type="number" dataKey="x" stroke="#9CA3AF" tickFormatter={v => `${v}x`} name="EV/EBITDA" />
            <YAxis type="number" dataKey="y" stroke="#9CA3AF" tickFormatter={v => `${v}%`} name="ROIC" />
            <ZAxis dataKey="z" range={[60, 300]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const p: any = payload[0]!.payload;
                return (
                  <div className="bg-surface border border-border rounded p-2 text-xs">
                    <div className="text-white font-medium">{p.name}</div>
                    <div className="text-gray-400">EV/EBITDA: {p.x.toFixed(1)}x &middot; ROIC: {p.y.toFixed(0)}%</div>
                    <div className="text-gray-400">Mkt-cap: {fmt(p.z)}</div>
                  </div>
                );
              }}
            />
            <Scatter data={data} fill={profile.accentColor} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// =============================================================================
// DDM panel
// =============================================================================

function DDMPanel({ snapshot }: { snapshot: CompanySnapshot }) {
  const { ddmGordon: g, ddmTwoStage: t, profile } = snapshot;
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
        <Activity size={18} className="text-green-400" /> Dividend Discount Models
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {[g, t].map(m => (
          <div key={m.method} className="bg-black/30 rounded-lg p-3 border border-border">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{m.method}</p>
            <p className="text-2xl font-bold text-white">₹{m.perShareValue.toFixed(0)}</p>
            <p className="text-xs text-gray-300">
              DPS ₹{m.currentDps.toFixed(1)} &middot; g {m.nearTermGrowth.toFixed(1)}%/{m.terminalGrowth.toFixed(1)}% &middot; Ke {m.requiredReturn.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">Payout {m.payoutRatio.toFixed(0)}% &middot; Sustainability {m.sustainabilityScore.toFixed(0)}/100</p>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-300 mt-3 bg-black/20 rounded p-2 border border-border leading-relaxed">
        {t.notes} Market prices ₹{profile.currentMarketPrice.toFixed(0)} &middot; Gordon discount {(((g.perShareValue - profile.currentMarketPrice) / profile.currentMarketPrice) * 100).toFixed(1)}%.
      </div>
    </div>
  );
}

// =============================================================================
// EVA panel
// =============================================================================

function EvaPanel({ snapshot }: { snapshot: CompanySnapshot }) {
  const data = snapshot.eva.map(e => ({ fy: e.fy, EVA: e.eva, ROIC: e.roic, WACC: snapshot.profile.assumptions.wacc }));
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
        <Activity size={18} className="text-pink-400" /> EVA Trajectory &amp; ROIC vs WACC
      </h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="fy" stroke="#9CA3AF" />
            <YAxis yAxisId="left" stroke="#9CA3AF" tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" tickFormatter={v => `${v.toFixed(0)}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="EVA" fill="#EC4899" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="ROIC" stroke="#10B981" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="WACC" stroke="#EF4444" strokeDasharray="4 4" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Terminal ROIC {snapshot.eva[snapshot.eva.length - 1]?.roic.toFixed(0)}% vs WACC {snapshot.profile.assumptions.wacc.toFixed(1)}% &rarr; {((snapshot.eva[snapshot.eva.length - 1]?.roicSpread ?? 0) > 0 ? 'value-accretive' : 'value-destroying')} at terminal.
      </p>
    </div>
  );
}

// =============================================================================
// Blended bridge
// =============================================================================

function BridgePanel({ snapshot }: { snapshot: CompanySnapshot }) {
  const data = snapshot.bridge.methods.map(m => ({ label: m.label, perShare: m.perShareValue, color: m.color, weight: m.weight }));
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <Target size={18} className="text-emerald-400" /> Blended Valuation Bridge
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Weighted across 5 methods &middot; Market ₹{snapshot.bridge.marketPrice.toFixed(0)} &middot; Implied upside {snapshot.bridge.upside >= 0 ? '+' : ''}{snapshot.bridge.upside.toFixed(1)}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Blended target</p>
          <p className="text-3xl font-bold" style={{ color: snapshot.profile.accentColor }}>₹{snapshot.bridge.blendedPerShare.toFixed(0)}</p>
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis type="number" stroke="#9CA3AF" />
            <YAxis type="category" dataKey="label" stroke="#9CA3AF" width={130} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine x={snapshot.bridge.marketPrice} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: `CMP ₹${snapshot.bridge.marketPrice.toFixed(0)}`, fill: '#F59E0B', fontSize: 10, position: 'top' }} />
            <ReferenceLine x={snapshot.bridge.blendedPerShare} stroke="#10B981" strokeDasharray="4 4" label={{ value: `Blend ₹${snapshot.bridge.blendedPerShare.toFixed(0)}`, fill: '#10B981', fontSize: 10, position: 'top' }} />
            <Bar dataKey="perShare" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-5 gap-2 mt-3 text-xs">
        {data.map(m => (
          <div key={m.label} className="bg-black/20 rounded p-2 border border-border text-center">
            <div className="text-gray-400 truncate">{m.label}</div>
            <div className="text-white font-semibold">₹{m.perShare.toFixed(0)}</div>
            <div className="text-gray-500">{(m.weight * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Segments panel
// =============================================================================

function SegmentsPanel({ profile }: { profile: CompanyProfile }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
        <Layers size={18} className="text-indigo-400" /> Segment Mix &amp; Outlook
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-border">
              <th className="text-left py-2 px-2">Segment</th>
              <th className="text-right py-2 px-2">Revenue</th>
              <th className="text-right py-2 px-2">Share</th>
              <th className="text-right py-2 px-2">EBIT</th>
              <th className="text-right py-2 px-2">Margin</th>
              <th className="text-right py-2 px-2">Multiple</th>
              <th className="text-left py-2 px-2">Outlook</th>
            </tr>
          </thead>
          <tbody>
            {profile.segments.map(s => (
              <tr key={s.name} className="border-b border-border/60 hover:bg-black/20 transition-colors">
                <td className="py-2 px-2 text-white font-medium">{s.name}</td>
                <td className="py-2 px-2 text-right text-gray-200">{fmt(s.fy25Revenue)}</td>
                <td className="py-2 px-2 text-right text-gray-400">{s.share.toFixed(1)}%</td>
                <td className="py-2 px-2 text-right text-gray-200">{fmt(s.fy25Ebit)}</td>
                <td className="py-2 px-2 text-right text-gray-300">{s.fy25Margin.toFixed(1)}%</td>
                <td className="py-2 px-2 text-right text-gray-300">{s.multipleLow}-{s.multipleHigh}x</td>
                <td className="py-2 px-2 text-xs text-gray-400">{s.growthOutlook}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// Comparative matrix - sortable, sector-filterable, CSV-exportable
// =============================================================================

type MatrixSortKey =
  | 'ticker'
  | 'cmp'
  | 'dcf'
  | 'blended'
  | 'upside'
  | 'prob'
  | 'revCagr'
  | 'ebitdaMargin'
  | 'pe'
  | 'divYield'
  | 'roic';

const MATRIX_COLUMNS: { key: MatrixSortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'ticker',       label: 'Ticker',     align: 'left' },
  { key: 'cmp',          label: 'CMP (₹)',    align: 'right' },
  { key: 'dcf',          label: 'DCF',        align: 'right' },
  { key: 'blended',      label: 'Blended',    align: 'right' },
  { key: 'upside',       label: 'Upside',     align: 'right' },
  { key: 'prob',         label: 'Prob-wtd',   align: 'right' },
  { key: 'revCagr',      label: 'Rev CAGR',   align: 'right' },
  { key: 'ebitdaMargin', label: 'EBITDA %',   align: 'right' },
  { key: 'pe',           label: 'P/E',        align: 'right' },
  { key: 'divYield',     label: 'Div Yld',    align: 'right' },
  { key: 'roic',         label: 'ROIC %',     align: 'right' },
];

function toCsvCell(v: string | number): string {
  if (typeof v === 'number') return v.toFixed(2);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadCsv(filename: string, lines: string[]) {
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function ComparativeMatrix({
  universe,
  selectedId,
  onSelect,
}: {
  universe: UniverseRow[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<MatrixSortKey>('upside');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set(universe.map(u => u.category));
    return ['All', ...Array.from(set).sort()];
  }, [universe]);

  const filtered = useMemo(() => {
    let rows = filterCategory === 'All' ? universe : universe.filter(r => r.category === filterCategory);
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av);
      const bn = Number(bv);
      return sortDir === 'asc' ? an - bn : bn - an;
    });
    return rows;
  }, [universe, sortKey, sortDir, filterCategory]);

  const handleSort = (key: MatrixSortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'ticker' ? 'asc' : 'desc');
    }
  };

  const handleExport = () => {
    const headers = ['Ticker', 'Company', 'Sector', 'Category', 'CMP', 'DCF', 'Blended', 'Upside %',
      'ProbWtd %', 'Rev CAGR %', 'EBITDA %', 'P/E', 'Div Yield %', 'ROIC %', 'WACC %'];
    const lines = [headers.join(',')];
    for (const r of filtered) {
      lines.push([
        toCsvCell(r.ticker),
        toCsvCell(r.name),
        toCsvCell(r.sector),
        toCsvCell(r.category),
        toCsvCell(r.cmp),
        toCsvCell(r.dcf),
        toCsvCell(r.blended),
        toCsvCell(r.upside),
        toCsvCell(r.prob),
        toCsvCell(r.revCagr),
        toCsvCell(r.ebitdaMargin),
        toCsvCell(r.pe),
        toCsvCell(r.divYield),
        toCsvCell(r.roic),
        toCsvCell(r.wacc),
      ].join(','));
    }
    downloadCsv('company-universe-matrix.csv', lines);
  };

  const compareData = filtered.map(r => ({
    name: r.ticker,
    CMP: r.cmp,
    DCF: r.dcf,
    Blended: r.blended,
    color: r.color,
  }));

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <Crown size={18} className="text-amber-400" /> Universe Comparative Matrix
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-black/30 border border-border rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/60"
            aria-label="Filter matrix by sector"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All sectors' : c}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">{filtered.length} rows</span>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 bg-black/30 hover:bg-black/50 border border-border rounded px-3 py-1.5 text-xs text-white transition-colors"
            aria-label="Export matrix as CSV"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-border">
              {MATRIX_COLUMNS.map(col => {
                const isSorted = sortKey === col.key;
                const Icon = isSorted ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`py-2 px-2 cursor-pointer select-none hover:text-white transition-colors text-${col.align}`}
                    aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                      <span>{col.label}</span>
                      <Icon size={11} className={isSorted ? 'text-blue-400' : 'opacity-40'} />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const active = r.profile.id === selectedId;
              return (
                <tr
                  key={r.ticker}
                  onClick={() => onSelect(r.profile.id)}
                  className={`border-b border-border/60 cursor-pointer transition-colors ${
                    active ? 'bg-blue-950/30' : 'hover:bg-black/20'
                  }`}
                >
                  <td className="py-2 px-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="text-white font-medium">{r.ticker}</span>
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-gray-200 tabular-nums">{r.cmp.toFixed(0)}</td>
                  <td className="py-2 px-2 text-right text-gray-200 tabular-nums">{r.dcf.toFixed(0)}</td>
                  <td className="py-2 px-2 text-right text-white font-semibold tabular-nums">{r.blended.toFixed(0)}</td>
                  <td className={`py-2 px-2 text-right font-medium tabular-nums ${
                    r.upside > 15 ? 'text-emerald-400' : r.upside > 0 ? 'text-gray-200' : 'text-red-400'
                  }`}>
                    {r.upside >= 0 ? '+' : ''}{r.upside.toFixed(1)}%
                  </td>
                  <td className={`py-2 px-2 text-right tabular-nums ${r.prob >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {r.prob >= 0 ? '+' : ''}{r.prob.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2 text-right text-gray-300 tabular-nums">{r.revCagr.toFixed(1)}%</td>
                  <td className="py-2 px-2 text-right text-gray-300 tabular-nums">{r.ebitdaMargin.toFixed(1)}%</td>
                  <td className="py-2 px-2 text-right text-gray-300 tabular-nums">{r.pe.toFixed(1)}x</td>
                  <td className="py-2 px-2 text-right text-amber-300 tabular-nums">{r.divYield.toFixed(2)}%</td>
                  <td className={`py-2 px-2 text-right tabular-nums ${r.roic - r.wacc > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {r.roic.toFixed(0)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-6">No companies in this sector.</div>
        )}
      </div>

      {compareData.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
              <Bar dataKey="CMP" fill="#6B7280" radius={[4, 4, 0, 0]} />
              <Bar dataKey="DCF" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Blended" radius={[4, 4, 0, 0]}>
                {compareData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3 italic flex items-center gap-1.5">
        <Gauge size={12} /> Click any column header to sort &middot; click any row to switch the active company &middot; CSV export respects active filters.
      </p>
    </div>
  );
}

// =============================================================================
// Insight card
// =============================================================================

function InsightCard({ title, items, icon, tone }: { title: string; items: string[]; icon: React.ReactNode; tone: 'emerald' | 'red' | 'blue' }) {
  const toneClass = {
    emerald: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
    red: 'border-red-500/30 bg-red-950/20 text-red-300',
    blue: 'border-blue-500/30 bg-blue-950/20 text-blue-300',
  }[tone];
  return (
    <div className={`rounded-lg border ${toneClass} p-4`}>
      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
        {icon} {title}
      </h4>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-gray-200 leading-relaxed">
            <span className="opacity-60 mr-1.5">{String(i + 1).padStart(2, '0')}</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
