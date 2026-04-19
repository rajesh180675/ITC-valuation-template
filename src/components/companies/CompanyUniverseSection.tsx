import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend, ReferenceLine, ScatterChart, Scatter, ZAxis,
  ComposedChart, Area, Cell,
} from 'recharts';
import { Building2, TrendingUp, AlertTriangle, Activity, Target, Crown, Layers } from 'lucide-react';
import { COMPANY_PROFILES, getCompany, type CompanyProfile } from '@/data/companies';
import { buildCompanySnapshot, runMonteCarlo, valueWithAssumptions, type CompanySnapshot } from '@/utils/genericModel';
import { SectionHeader, MetricCard, ChartTooltip, fmt, fmtN } from '@/components/itc/shared';

interface CompanyUniverseSectionProps {
  initialCompanyId?: string;
}

export function CompanyUniverseSection({ initialCompanyId = 'itc' }: CompanyUniverseSectionProps) {
  const [selectedId, setSelectedId] = useState<string>(initialCompanyId);
  const profile = useMemo(() => getCompany(selectedId), [selectedId]);
  const snapshot = useMemo(() => buildCompanySnapshot(profile), [profile]);

  return (
    <div>
      <SectionHeader
        title="Company Universe Lab"
        subtitle="Apply the same DCF, scenarios, Monte Carlo, reverse DCF, relative valuation, DDM and EVA framework to ITC, TCS, HUL, Kansai Nerolac, VST Industries, Reliance, HDFC Bank, Infosys, Maruti Suzuki and Sun Pharma."
        icon={<Building2 size={22} />}
      />

      <CompanySwitcher selectedId={selectedId} onSelect={setSelectedId} />
      <CompanyHero profile={profile} snapshot={snapshot} />

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
        <ComparativeMatrix />
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
// Switcher
// =============================================================================

function CompanySwitcher({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {COMPANY_PROFILES.map(c => {
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              active
                ? 'text-white shadow-lg'
                : 'bg-surface border-border text-gray-300 hover:border-blue-500/50'
            }`}
            style={active ? { backgroundColor: c.accentColor, borderColor: c.accentColor } : undefined}
          >
            <span className="flex items-center gap-2">
              <Building2 size={14} />
              <span>{c.ticker}</span>
              <span className="text-xs opacity-75 hidden sm:inline">&middot; {c.sector.split('/')[0].trim()}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Hero metrics row
// =============================================================================

function CompanyHero({ profile, snapshot }: { profile: CompanyProfile; snapshot: CompanySnapshot }) {
  const last = profile.historical[profile.historical.length - 1]!;
  const first = profile.historical[0]!;
  const years = profile.historical.length - 1;
  const revCagr = (Math.pow(last.revenue / first.revenue, 1 / years) - 1) * 100;
  const patCagr = (Math.pow(last.pat / Math.max(1, first.pat), 1 / years) - 1) * 100;

  const upsideBlended = snapshot.bridge.upside;
  const toneColor =
    upsideBlended > 15 ? 'green' : upsideBlended > 0 ? 'blue' : upsideBlended > -10 ? 'gold' : 'red';

  return (
    <div>
      <div className="rounded-lg border border-border bg-surface p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: profile.accentColor }}
                aria-hidden
              />
              {profile.name}
              <span className="text-sm font-normal text-gray-400 px-2 py-0.5 rounded bg-black/30 border border-border">
                {profile.ticker}
              </span>
            </h3>
            <p className="text-gray-400 text-sm mt-1 max-w-2xl">{profile.tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Current Price</p>
            <p className="text-3xl font-bold text-white">₹{profile.currentMarketPrice.toFixed(0)}</p>
            <p className="text-xs text-gray-400">
              Mkt-cap {fmt(profile.currentMarketPrice * profile.sharesOutstandingCr)} &middot; Shares {fmtN(profile.sharesOutstandingCr)} Cr
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="FY25 Revenue"
          value={fmt(last.revenue)}
          subtitle={`${years}y CAGR: ${revCagr >= 0 ? '+' : ''}${revCagr.toFixed(1)}%`}
          trend={revCagr}
          color="blue"
        />
        <MetricCard
          title="FY25 PAT"
          value={fmt(last.pat)}
          subtitle={`${years}y CAGR: ${patCagr >= 0 ? '+' : ''}${patCagr.toFixed(1)}%`}
          trend={patCagr}
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
  // Build a perShare vs CAGR curve for visualization
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
// Comparative matrix (all companies)
// =============================================================================

function ComparativeMatrix() {
  const rows = useMemo(() => COMPANY_PROFILES.map(p => {
    const snap = buildCompanySnapshot(p);
    const last = p.historical[p.historical.length - 1]!;
    const first = p.historical[0]!;
    const years = p.historical.length - 1;
    const revCagr = (Math.pow(last.revenue / first.revenue, 1 / years) - 1) * 100;
    const ebitdaMargin = (last.ebitda / last.revenue) * 100;
    return {
      ticker: p.ticker,
      name: p.name,
      cmp: p.currentMarketPrice,
      blended: snap.bridge.blendedPerShare,
      upside: snap.bridge.upside,
      dcf: snap.dcf.perShareValue,
      prob: snap.scenarios.upsideVsMarket,
      revCagr,
      ebitdaMargin,
      wacc: p.assumptions.wacc,
      color: p.accentColor,
    };
  }), []);

  const compareData = rows.map(r => ({
    name: r.ticker,
    CMP: r.cmp,
    DCF: r.dcf,
    Blended: r.blended,
    color: r.color,
  }));

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
        <Crown size={18} className="text-amber-400" /> Universe Comparative Matrix
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-border">
              <th className="text-left py-2 px-2">Ticker</th>
              <th className="text-right py-2 px-2">CMP (₹)</th>
              <th className="text-right py-2 px-2">DCF</th>
              <th className="text-right py-2 px-2">Blended</th>
              <th className="text-right py-2 px-2">Upside</th>
              <th className="text-right py-2 px-2">Prob-wtd</th>
              <th className="text-right py-2 px-2">Rev CAGR</th>
              <th className="text-right py-2 px-2">EBITDA %</th>
              <th className="text-right py-2 px-2">WACC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.ticker} className="border-b border-border/60 hover:bg-black/20 transition-colors">
                <td className="py-2 px-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-white font-medium">{r.ticker}</span>
                  </span>
                </td>
                <td className="py-2 px-2 text-right text-gray-200">{r.cmp.toFixed(0)}</td>
                <td className="py-2 px-2 text-right text-gray-200">{r.dcf.toFixed(0)}</td>
                <td className="py-2 px-2 text-right text-white font-semibold">{r.blended.toFixed(0)}</td>
                <td className={`py-2 px-2 text-right font-medium ${r.upside > 15 ? 'text-emerald-400' : r.upside > 0 ? 'text-gray-200' : 'text-red-400'}`}>
                  {r.upside >= 0 ? '+' : ''}{r.upside.toFixed(1)}%
                </td>
                <td className={`py-2 px-2 text-right ${r.prob >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {r.prob >= 0 ? '+' : ''}{r.prob.toFixed(1)}%
                </td>
                <td className="py-2 px-2 text-right text-gray-300">{r.revCagr.toFixed(1)}%</td>
                <td className="py-2 px-2 text-right text-gray-300">{r.ebitdaMargin.toFixed(1)}%</td>
                <td className="py-2 px-2 text-right text-gray-300">{r.wacc.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <p className="text-xs text-gray-500 mt-3 italic">
        Accent colors map to each company. Blended = weighted across DCF + scenario EV + peer EV/EBITDA + peer P/E + two-stage DDM.
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

