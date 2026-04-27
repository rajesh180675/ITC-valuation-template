import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, RadialBar,
  RadialBarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart,
  Legend,
} from 'recharts';
import {
  Activity, AlertTriangle, BookOpen, Briefcase, ChevronRight, Cpu,
  DollarSign, Factory, FileText, Flame, Gauge, Layers, LineChart as LineIcon,
  Microscope, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Users, Zap,
} from 'lucide-react';

import {
  AI_DISRUPTION_LAYERS, BIG5_FY24, COMPANIES, HEADCOUNT_TRANSITION,
  INDUSTRY_MACRO, INDUSTRY_SCENARIOS, KEY_METRICS_TO_TRACK,
  PHILOSOPHICAL_FUTURES, PLATFORM_BENCHMARK, RECOMMENDED_PORTFOLIO,
  REVENUE_COMPRESSION_SCENARIO, REVENUE_MIX_BY_VERTICAL, SERVICE_VULNERABILITY,
  STRUCTURAL_PILLARS, THREE_WAVES, TIER2, WAGE_POLARIZATION,
} from '@/data/indianITDeepDive';
import type { CompanyKey, CompanyAutopsy } from '@/data/indianITDeepDive';
import type { ReactElement } from 'react';
import { ChartTooltip, fmt } from '@/components/itc/shared';
import { ValuationLabV2 } from './ValuationLabV2';

/* ────────────────────────────────────────────────────────────────────────── */
/* Local helpers                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

const PALETTE = {
  gold:    '#d4a843',
  goldHi:  '#f5e6b5',
  blue:    '#3b82f6',
  blueHi:  '#60a5fa',
  green:   '#10b981',
  red:     '#ef4444',
  amber:   '#f59e0b',
  slate:   '#64748b',
  text:    '#e2e8f0',
  muted:   '#94a3b8',
};

const RISK_COLOR: Record<string, string> = {
  EXTREME:    '#ef4444',
  'VERY HIGH':'#f97316',
  HIGH:       '#f59e0b',
  MEDIUM:     '#eab308',
  LOW:        '#10b981',
  INVERSE:    '#3b82f6',
  VARIABLE:   '#94a3b8',
};

const RATING_COLOR: Record<string, string> = {
  BUY:           '#10b981',
  'CAUTIOUS BUY':'#22c55e',
  HOLD:          '#f59e0b',
  AVOID:         '#ef4444',
};

const fmtPct = (n: number, d = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`;
const fmtCurr = (n: number, currency: 'INR' | 'USD') =>
  currency === 'INR' ? `₹${n.toFixed(0)}` : `$${n.toFixed(2)}`;

function HealthBadge({ health }: { health: string }) {
  const colors: Record<string, string> = {
    SOLID:          'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    STRESSED:       'bg-amber-500/15 text-amber-300 border-amber-500/30',
    FRAGILE:        'bg-orange-500/15 text-orange-300 border-orange-500/30',
    CRACKING:       'bg-red-500/15 text-red-300 border-red-500/30',
    'UNDER ATTACK': 'bg-red-500/20 text-red-200 border-red-500/40',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border ${colors[health] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30'} font-semibold uppercase tracking-wider`}>
      {health}
    </span>
  );
}

function RiskPill({ risk }: { risk: string }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border"
          style={{ color: RISK_COLOR[risk], borderColor: `${RISK_COLOR[risk]}55`, background: `${RISK_COLOR[risk]}15` }}>
      {risk}
    </span>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-300 tracking-tight">
      {'★'.repeat(n)}
      <span className="text-slate-600">{'☆'.repeat(5 - n)}</span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Top-level section                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

type Tab =
  | 'overview' | 'disruption' | 'big5' | 'autopsy'
  | 'valuation' | 'scenarios' | 'philosophy';

const TABS: { id: Tab; label: string; icon: ReactElement }[] = [
  { id: 'overview',   label: 'Industry Overview', icon: <BookOpen size={14} /> },
  { id: 'disruption', label: 'AI Disruption',     icon: <Zap size={14} /> },
  { id: 'big5',       label: 'Big 5 + Tier 2',    icon: <Layers size={14} /> },
  { id: 'autopsy',    label: 'Company Autopsy',   icon: <Microscope size={14} /> },
  { id: 'valuation',  label: 'Valuation Lab',     icon: <Gauge size={14} /> },
  { id: 'scenarios',  label: 'Scenarios & Portfolio', icon: <Briefcase size={14} /> },
  { id: 'philosophy', label: 'The Recursive Question', icon: <Sparkles size={14} /> },
];

export function IndianITDeepDiveSection() {
  const [tab, setTab] = useState<Tab>('overview');
  const [autopsyKey, setAutopsyKey] = useState<CompanyKey>('infosys');
  const [valTicker, setValTicker] = useState<string>('TCS');

  return (
    <div className="animate-fadeIn space-y-6">
      <Hero />

      <div className="premium-card p-3 flex flex-wrap gap-2 items-center justify-between">
        <div className="segmented flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? 'active' : ''}>
              <span className="inline-flex items-center gap-1.5">{t.icon}{t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="ticker-dot" />
          <span className="uppercase tracking-widest">{INDUSTRY_MACRO.asOf}</span>
        </div>
      </div>

      {tab === 'overview'   && <OverviewTab />}
      {tab === 'disruption' && <DisruptionTab />}
      {tab === 'big5'       && <Big5Tab />}
      {tab === 'autopsy'    && <AutopsyTab activeKey={autopsyKey} onSelect={setAutopsyKey} />}
      {tab === 'valuation'  && <ValuationLabV2 activeTicker={valTicker} onSelect={setValTicker} />}
      {tab === 'scenarios'  && <ScenariosTab />}
      {tab === 'philosophy' && <PhilosophyTab />}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Hero                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <div className="premium-card p-6 lg:p-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 mb-3">
            <span className="pill"><Cpu size={11} /> Indian IT — Recursive Deep Dive</span>
            <span className="pill pill-muted">FY2024 baseline · 75K+ source words</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-serif text-amber-100 tracking-tight text-balance leading-tight">
            $254B export machine, three hammers of AI, and the&nbsp;
            <span className="text-amber-300">valuation question</span> that decides the next decade
          </h2>
          <p className="mt-3 text-slate-300 text-pretty max-w-3xl leading-relaxed">
            Productivity, agentic coding and business-logic automation are arriving simultaneously. The labour-arbitrage flywheel
            that built TCS, Infosys, HCLTech, Wipro and Tech Mahindra is structurally cracking — yet the survivors will be fewer,
            leaner, more IP-driven and possibly more profitable. This module models the industry, dissects the Big 3 surgically,
            and lets you stress-test each company&apos;s DCF, SOTP and probability-weighted fair value live.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-[280px]">
          <KpiBlock label="Industry Revenue" value={`$${INDUSTRY_MACRO.industryRevenueUSDb}B`} subtle="FY24 export" tone="gold" />
          <KpiBlock label="Direct Headcount" value={`${(INDUSTRY_MACRO.directHeadcount / 1e6).toFixed(1)}M`} subtle="indirect ~15M" tone="blue" />
          <KpiBlock label="Fortune 500 Penetration" value={`${INDUSTRY_MACRO.fortuneFiveHundredPenetrationPct}%`} subtle="≥1 IT vendor relationship" tone="green" />
          <KpiBlock label="Global Delivery Share" value={`${INDUSTRY_MACRO.globalServicesShare}%`} subtle="of global IT services delivery" tone="amber" />
        </div>
      </div>
    </div>
  );
}

function KpiBlock({ label, value, subtle, tone }: { label: string; value: string; subtle: string; tone: 'gold'|'blue'|'green'|'amber'|'red' }) {
  const tones: Record<string, string> = {
    gold:  'from-amber-500/15 to-amber-500/0   border-amber-500/30 text-amber-200',
    blue:  'from-blue-500/15  to-blue-500/0    border-blue-500/30  text-blue-200',
    green: 'from-emerald-500/15 to-emerald-500/0 border-emerald-500/30 text-emerald-200',
    amber: 'from-orange-500/15 to-orange-500/0 border-orange-500/30 text-orange-200',
    red:   'from-red-500/15   to-red-500/0     border-red-500/30   text-red-200',
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-3 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{label}</div>
      <div className="text-2xl font-serif tracking-tight mt-1">{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{subtle}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Tab 1 — Industry Overview                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Three (Now Four) Waves of Indian IT" icon={<LineIcon size={14} />}>
          <div className="space-y-3">
            {THREE_WAVES.map(w => (
              <div key={w.wave} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-amber-200 font-semibold">{w.wave} <span className="text-slate-500 font-normal">· {w.period}</span></div>
                    <div className="text-sm text-slate-200 mt-0.5">{w.label}</div>
                  </div>
                  <span className="pill pill-muted">GM {w.grossMargin}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {w.bullets.map((b, i) => (
                    <li key={i} className="text-xs text-slate-400 flex gap-2"><ChevronRight size={11} className="mt-0.5 text-amber-400/60 shrink-0" />{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Five Structural Pillars" icon={<ShieldCheck size={14} />}>
          <div className="space-y-2.5">
            {STRUCTURAL_PILLARS.map(p => (
              <div key={p.pillar} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-amber-100 font-semibold">{p.pillar}</div>
                  <HealthBadge health={p.health} />
                </div>
                <div className="text-xs text-slate-400 mt-1">{p.description}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="The Labor Arbitrage Engine" icon={<Factory size={14} />}>
          <FormulaBlock label="Revenue" formula="Headcount × Utilization × Blended Billing Rate" />
          <FormulaBlock label="Cost"    formula="Headcount × Blended CTC" />
          <FormulaBlock label="Gross Margin" formula="≈ 32 - 38%" />
          <FormulaBlock label="Op Margin"   formula="≈ 15 - 22%" />
          <div className="hairline-divider my-3" />
          <p className="text-xs text-slate-400 leading-relaxed">
            A senior Java developer in Bangalore costs <span className="text-amber-200">$18/hour fully loaded</span> versus
            <span className="text-amber-200"> $120/hour in New York</span>. That 6-8x cost arbitrage funded the entire industry&apos;s
            profit pool — and is exactly what the AI hammers compress.
          </p>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="FY24 Revenue Mix by Vertical" icon={<Layers size={14} />}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={REVENUE_MIX_BY_VERTICAL} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="vertical" tick={{ fill: PALETTE.muted, fontSize: 10 }} angle={-15} dy={6} />
                <YAxis yAxisId="L" tick={{ fill: PALETTE.muted, fontSize: 10 }} label={{ value: '% Share', angle: -90, position: 'insideLeft', fill: PALETTE.muted, fontSize: 10 }} />
                <YAxis yAxisId="R" orientation="right" tick={{ fill: PALETTE.muted, fontSize: 10 }} domain={[-3, 8]} label={{ value: 'Growth %', angle: 90, position: 'insideRight', fill: PALETTE.muted, fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar yAxisId="L" dataKey="share" fill={PALETTE.gold} radius={[3, 3, 0, 0]}>
                  {REVENUE_MIX_BY_VERTICAL.map((_, i) => <Cell key={i} fill={PALETTE.gold} />)}
                </Bar>
                <Line yAxisId="R" dataKey="growth" stroke={PALETTE.blue} strokeWidth={2} dot={{ r: 3, fill: PALETTE.blue }} />
                <ReferenceLine yAxisId="R" y={0} stroke="#475569" strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            BFSI (34%) and Comms (10%) dominate the revenue base — both are the two slowest-growing or shrinking verticals.
            Healthcare and &quot;Others&quot; are the only meaningful pockets growing above 5%.
          </p>
        </SectionCard>

        <SectionCard title="Tier-1 Roster — FY24 Snapshot" icon={<Users size={14} />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm sensex-table">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1.5">Company</th>
                  <th className="text-right px-2 py-1.5">Rev ($B)</th>
                  <th className="text-right px-2 py-1.5">Headcount (K)</th>
                  <th className="text-right px-2 py-1.5">M.Cap ($B)</th>
                  <th className="text-right px-2 py-1.5">Op M%</th>
                  <th className="text-right px-2 py-1.5">P/E</th>
                  <th className="text-right px-2 py-1.5">Growth</th>
                  <th className="text-right px-2 py-1.5">Rating</th>
                </tr>
              </thead>
              <tbody>
                {BIG5_FY24.map(r => (
                  <tr key={r.co} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                    <td className="px-2 py-1.5 font-semibold text-amber-100">{r.co}</td>
                    <td className="px-2 py-1.5 text-right">{r.revenue.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right">{r.headcount}</td>
                    <td className="px-2 py-1.5 text-right">{r.mcap}</td>
                    <td className="px-2 py-1.5 text-right">{r.opMargin.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right">{r.pe}x</td>
                    <td className={`px-2 py-1.5 text-right ${r.growth >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtPct(r.growth)}</td>
                    <td className="px-2 py-1.5 text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold tracking-wider"
                            style={{ color: RATING_COLOR[r.rating], background: `${RATING_COLOR[r.rating]}15`, border: `1px solid ${RATING_COLOR[r.rating]}40` }}>
                        {r.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Tier-2 — Hidden Opportunities & Cognizant" icon={<Microscope size={14} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TIER2.map(t => (
            <div key={t.co} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-amber-100 font-semibold">{t.co}</div>
                <span className="text-slate-500 text-xs">P/E {t.pe}x</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <Stat label="Rev" value={`$${t.revenue}B`} />
                <Stat label="HC"  value={`${t.headcount}K`} />
                <Stat label="MCap" value={`$${t.mcap}B`} />
              </div>
              <div className="text-[11px] text-slate-400 mt-2 leading-relaxed">{t.note}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function FormulaBlock({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="rounded-md border border-slate-700/60 bg-slate-900/40 p-2 mb-2">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="font-mono text-[12px] text-amber-200 mt-0.5">{formula}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-slate-100 font-semibold">{value}</div>
    </div>
  );
}

function SectionCard({ title, icon, children, action }: { title: string; icon?: ReactElement; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="premium-card p-4 lg:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-amber-100">
          {icon && <span className="text-amber-300">{icon}</span>}
          <h3 className="font-serif text-base tracking-tight">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Tab 2 — AI Disruption                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

function DisruptionTab() {
  const [view, setView] = useState<'risk' | 'compression' | 'jobs' | 'wages'>('risk');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {AI_DISRUPTION_LAYERS.map((l, i) => (
          <div key={l.layer} className="premium-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 text-[120px] font-serif text-amber-500/5 leading-none select-none">
              {i + 1}
            </div>
            <div className="relative">
              <div className="pill mb-3"><Flame size={11} /> {l.horizon}</div>
              <div className="font-serif text-amber-200 text-xl tracking-tight mb-2">{l.layer}</div>
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Examples</div>
              <div className="text-sm text-slate-200 mb-3">{l.examples}</div>
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Impact</div>
              <div className="text-sm text-amber-100 mb-3 font-semibold">{l.impact}</div>
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Status</div>
              <div className="text-sm text-slate-200">{l.status}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="premium-card p-3 flex flex-wrap gap-2 items-center">
        <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mr-1">View</span>
        <div className="segmented">
          <button className={view === 'risk' ? 'active' : ''} onClick={() => setView('risk')}>Service-line Risk</button>
          <button className={view === 'compression' ? 'active' : ''} onClick={() => setView('compression')}>Revenue Compression</button>
          <button className={view === 'jobs' ? 'active' : ''} onClick={() => setView('jobs')}>Headcount Transition</button>
          <button className={view === 'wages' ? 'active' : ''} onClick={() => setView('wages')}>Wage Polarisation</button>
        </div>
      </div>

      {view === 'risk' && <ServiceRiskChart />}
      {view === 'compression' && <CompressionChart />}
      {view === 'jobs' && <JobsChart />}
      {view === 'wages' && <WagesChart />}

      <SectionCard title="The Productivity Math the Models Won't Let You Ignore" icon={<Activity size={14} />}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            {
              era: 'Before AI (2023 baseline)',
              cost: '$4.16M',
              revenue: '$10.4M',
              margin: '60% gross',
              note: '100 developers · 12 months · $50/hr blended',
              tone: 'border-slate-600/40',
            },
            {
              era: 'AI Coding Assistants (2025)',
              cost: '$1.66M',
              revenue: '$5.6M',
              margin: '70% gross — but revenue −46%',
              note: '60 developers + AI · 8 months · $45/hr (client demands discount)',
              tone: 'border-amber-500/40',
            },
            {
              era: 'Agentic AI (2028)',
              cost: '$0.20M',
              revenue: '$0.66M',
              margin: '70% gross — revenue −94%',
              note: '15 developers + agents · 3 months · $35/hr',
              tone: 'border-red-500/40',
            },
          ].map(c => (
            <div key={c.era} className={`rounded-lg border ${c.tone} bg-slate-900/40 p-3`}>
              <div className="text-amber-100 font-semibold text-sm mb-2">{c.era}</div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Cost"    value={c.cost} />
                <Stat label="Revenue" value={c.revenue} />
              </div>
              <div className="text-xs text-slate-300 mt-2"><span className="text-slate-500">Margin: </span>{c.margin}</div>
              <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">{c.note}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-200 leading-relaxed">
          <div className="font-semibold mb-1 flex items-center gap-2"><AlertTriangle size={14} />This is not a margin problem.</div>
          This is a <span className="font-semibold">revenue destruction</span> problem. Margins improve while the absolute revenue base shrinks — and it&apos;s the absolute base that pays the dividend.
        </div>
      </SectionCard>
    </div>
  );
}

function ServiceRiskChart() {
  const sorted = [...SERVICE_VULNERABILITY].sort((a, b) => b.risk - a.risk);
  return (
    <SectionCard title="Service-Line Automation Risk (0-100)" icon={<AlertTriangle size={14} />}>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 60, left: 140, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: PALETTE.muted, fontSize: 10 }} />
            <YAxis type="category" dataKey="service" tick={{ fill: PALETTE.muted, fontSize: 11 }} width={140} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="risk" radius={[0, 4, 4, 0]}>
              {sorted.map((d, i) => <Cell key={i} fill={RISK_COLOR[d.band]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
        {(['HIGH', 'MEDIUM', 'LOW'] as const).map(band => {
          const items = sorted.filter(s => s.band === band);
          return (
            <div key={band} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-100 font-semibold">{band} risk</span>
                <RiskPill risk={band} />
              </div>
              <ul className="space-y-1">
                {items.map(it => (
                  <li key={it.service} className="flex items-center justify-between gap-2 text-slate-300">
                    <span className="truncate">{it.service}</span>
                    <span className="text-slate-500 text-[10px]">{it.timeline}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function CompressionChart() {
  return (
    <SectionCard title="Industry Revenue / Headcount / Margin — Managed-Decline Scenario" icon={<TrendingDown size={14} />}>
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={REVENUE_COMPRESSION_SCENARIO} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="fy" tick={{ fill: PALETTE.muted, fontSize: 10 }} />
            <YAxis yAxisId="L" tick={{ fill: PALETTE.muted, fontSize: 10 }} domain={['dataMin - 10', 'dataMax + 10']} label={{ value: 'Revenue $B', angle: -90, position: 'insideLeft', fill: PALETTE.muted, fontSize: 10 }} />
            <YAxis yAxisId="R" orientation="right" tick={{ fill: PALETTE.muted, fontSize: 10 }} domain={[0, 30]} label={{ value: 'HC (M) / Margin %', angle: 90, position: 'insideRight', fill: PALETTE.muted, fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
            <Bar yAxisId="L" dataKey="revenue" fill={PALETTE.gold} radius={[3, 3, 0, 0]} name="Revenue ($B)" />
            <Line yAxisId="R" type="monotone" dataKey="headcount" stroke={PALETTE.blue} strokeWidth={2} dot={{ r: 3 }} name="Headcount (M)" />
            <Line yAxisId="R" type="monotone" dataKey="margin" stroke={PALETTE.green} strokeWidth={2} dot={{ r: 3 }} name="Op Margin %" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-slate-400 mt-2 leading-relaxed">
        Revenue dips from <span className="text-amber-200">$254B → $240B</span> by FY27 (a 5% absolute decline), then recovers to
        <span className="text-amber-200"> $290B</span> by FY30 as new AI-native services pick up. Headcount, however, falls from
        <span className="text-amber-200"> 5.8M → 3.8M</span> permanently — a 2M-job reset.
      </div>
    </SectionCard>
  );
}

function JobsChart() {
  return (
    <SectionCard title="Job Mix Transition — FY24 → FY30 (millions)" icon={<Users size={14} />}>
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={HEADCOUNT_TRANSITION} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="segment" tick={{ fill: PALETTE.muted, fontSize: 10 }} angle={-15} dy={8} />
            <YAxis tick={{ fill: PALETTE.muted, fontSize: 10 }} label={{ value: 'Millions', angle: -90, position: 'insideLeft', fill: PALETTE.muted, fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
            <Bar dataKey="current" fill={PALETTE.blue} name="FY24" radius={[3, 3, 0, 0]} />
            <Bar dataKey="fy30"    fill={PALETTE.gold} name="FY30 (proj)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
        AI/ML and Cybersecurity headcount expands. Application maintenance, testing/QA and BPO collapse together by ~3.3M jobs.
        Net employment shrinks by <span className="text-red-300 font-semibold">2.4M</span> over 6 years — that is 400K/year of skilled workers
        with mortgages, families, and career expectations.
      </p>
    </SectionCard>
  );
}

function WagesChart() {
  return (
    <SectionCard title="Wage Polarisation — 2023 → 2028 (₹L CTC)" icon={<DollarSign size={14} />}>
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={WAGE_POLARIZATION} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="role" tick={{ fill: PALETTE.muted, fontSize: 10 }} angle={-12} dy={8} />
            <YAxis tick={{ fill: PALETTE.muted, fontSize: 10 }} label={{ value: '₹ Lakhs CTC', angle: -90, position: 'insideLeft', fill: PALETTE.muted, fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
            <Bar dataKey="y2023" fill={PALETTE.slate} name="2023" radius={[3, 3, 0, 0]} />
            <Bar dataKey="y2028" fill={PALETTE.gold}  name="2028 (proj)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
        AI engineers (+60%), AI architects (+60%) and cyber leads (+44%) command premium. Junior developer pay collapses
        (<span className="text-red-300 font-semibold">−33%</span>). The pyramid&apos;s base — historically 50% of headcount — is
        the casualty of agentic coding.
      </p>
    </SectionCard>
  );
}

/* ────────────────────────────���─────────��─────────────────────────────────── */
/* Tab 3 — Big 5 + Tier 2                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function Big5Tab() {
  const peerData = useMemo(() => BIG5_FY24.map(c => ({
    co: c.co,
    Margin: c.opMargin,
    PE: c.pe,
    DivYield: c.divYield * 5,           // amplify to chart scale
    FCFYield: c.fcfYield * 5,
    Growth: c.growth + 10,              // shift positive
  })), []);

  return (
    <div className="space-y-6">
      <SectionCard title="Big 5 — Composite Strategic Radar" icon={<Layers size={14} />}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={peerData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="co" tick={{ fill: PALETTE.text, fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: PALETTE.muted, fontSize: 9 }} angle={30} />
                <Radar name="Op Margin"  dataKey="Margin"   stroke={PALETTE.gold}  fill={PALETTE.gold}  fillOpacity={0.25} />
                <Radar name="P/E"        dataKey="PE"       stroke={PALETTE.blue}  fill={PALETTE.blue}  fillOpacity={0.10} />
                <Radar name="Div Yield ×5" dataKey="DivYield" stroke={PALETTE.green} fill={PALETTE.green} fillOpacity={0.10} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BIG5_FY24} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="co" tick={{ fill: PALETTE.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: PALETTE.muted, fontSize: 10 }} label={{ value: 'Revenue ($B) / HC (K)', angle: -90, position: 'insideLeft', fill: PALETTE.muted, fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
                <Bar dataKey="revenue"   fill={PALETTE.gold} name="Revenue ($B)" radius={[3,3,0,0]} />
                <Bar dataKey="headcount" fill={PALETTE.blue} name="Headcount (K)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="AI Platform Benchmark" icon={<Cpu size={14} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm sensex-table">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5">Platform</th>
                <th className="text-left px-2 py-1.5">Owner</th>
                <th className="text-right px-2 py-1.5">Revenue ($M)</th>
                <th className="text-right px-2 py-1.5">Practitioners</th>
                <th className="text-right px-2 py-1.5">Maturity</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_BENCHMARK.map(p => (
                <tr key={p.platform} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                  <td className="px-2 py-1.5 font-semibold text-amber-100">{p.platform}</td>
                  <td className="px-2 py-1.5 text-slate-300">{p.owner}</td>
                  <td className="px-2 py-1.5 text-right">{fmt(p.revenueM)}</td>
                  <td className="px-2 py-1.5 text-right">{fmt(p.employees)}</td>
                  <td className="px-2 py-1.5 text-right"><Stars n={p.maturity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Big 5 Side-by-Side — All FY24 Metrics" icon={<FileText size={14} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm sensex-table">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5">Metric</th>
                {BIG5_FY24.map(c => <th key={c.co} className="text-right px-2 py-1.5">{c.co}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { k: 'revenue',   label: 'Revenue ($B)',   fmt: (v: number) => v.toFixed(1) },
                { k: 'headcount', label: 'Headcount (K)',  fmt: (v: number) => v.toString() },
                { k: 'mcap',      label: 'Market Cap ($B)',fmt: (v: number) => v.toString() },
                { k: 'opMargin',  label: 'Op Margin %',    fmt: (v: number) => v.toFixed(1) + '%' },
                { k: 'fcfYield',  label: 'FCF Yield %',    fmt: (v: number) => v.toFixed(1) + '%' },
                { k: 'divYield',  label: 'Div Yield %',    fmt: (v: number) => v.toFixed(1) + '%' },
                { k: 'pe',        label: 'P/E',            fmt: (v: number) => `${v}x` },
                { k: 'growth',    label: 'Revenue Growth', fmt: (v: number) => fmtPct(v) },
              ].map(row => (
                <tr key={row.k} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                  <td className="px-2 py-1.5 text-slate-400 uppercase tracking-widest text-[11px] font-semibold">{row.label}</td>
                  {BIG5_FY24.map(c => (
                    <td key={c.co} className="px-2 py-1.5 text-right text-slate-100">{row.fmt((c as any)[row.k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Tab 4 — Company Autopsy                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function AutopsyTab({ activeKey, onSelect }: { activeKey: CompanyKey; onSelect: (k: CompanyKey) => void }) {
  const co = COMPANIES[activeKey];

  return (
    <div className="space-y-6">
      <CompanySwitcher activeKey={activeKey} onSelect={onSelect} />

      <div className="premium-card p-5 lg:p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="pill"><Microscope size={11} /> Recursive Autopsy</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold tracking-wider"
                    style={{ color: RATING_COLOR[co.rating], background: `${RATING_COLOR[co.rating]}15`, border: `1px solid ${RATING_COLOR[co.rating]}40` }}>
                {co.rating}
              </span>
              <span className="text-amber-300 text-sm"><Stars n={co.conviction} /></span>
            </div>
            <h2 className="text-3xl font-serif text-amber-100 tracking-tight">{co.name}</h2>
            <p className="mt-2 text-slate-300 text-pretty max-w-3xl leading-relaxed">{co.thesisLine}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 min-w-[260px] text-xs">
            <Stat label="Founded"    value={co.founded} />
            <Stat label="CEO"        value={co.ceo} />
            <Stat label="Promoter"   value={co.promoter} />
            <Stat label="Governance" value={co.governance} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Bull Case" icon={<TrendingUp size={14} />}>
          <ul className="space-y-2">
            {co.bullCase.map((b, i) => (
              <li key={i} className="text-sm text-slate-200 flex gap-2 leading-relaxed">
                <span className="text-emerald-400 mt-0.5"><ChevronRight size={12} /></span>
                {b}
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Bear Case" icon={<TrendingDown size={14} />}>
          <ul className="space-y-2">
            {co.bearCase.map((b, i) => (
              <li key={i} className="text-sm text-slate-200 flex gap-2 leading-relaxed">
                <span className="text-red-400 mt-0.5"><ChevronRight size={12} /></span>
                {b}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Recursive Take" icon={<Sparkles size={14} />}>
        <p className="text-sm text-slate-200 leading-relaxed text-pretty italic border-l-2 border-amber-500/40 pl-4">
          {co.recursive}
        </p>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Vertical Mix" icon={<Layers size={14} />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm sensex-table">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1.5">Vertical</th>
                  <th className="text-right px-2 py-1.5">Rev ($B)</th>
                  <th className="text-right px-2 py-1.5">Share %</th>
                  <th className="text-right px-2 py-1.5">Growth</th>
                  <th className="text-right px-2 py-1.5">Margin</th>
                  <th className="text-right px-2 py-1.5">AI Risk</th>
                </tr>
              </thead>
              <tbody>
                {co.verticals.map(v => (
                  <tr key={v.vertical} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                    <td className="px-2 py-1.5 text-amber-100">{v.vertical}</td>
                    <td className="px-2 py-1.5 text-right">{v.revUSDb.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right">{v.share.toFixed(1)}%</td>
                    <td className={`px-2 py-1.5 text-right ${v.growth >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtPct(v.growth)}</td>
                    <td className="px-2 py-1.5 text-right">{v.margin}%</td>
                    <td className="px-2 py-1.5 text-right"><RiskPill risk={v.aiRisk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Service-Line Mix" icon={<Cpu size={14} />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm sensex-table">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1.5">Service Line</th>
                  <th className="text-right px-2 py-1.5">Rev ($B)</th>
                  <th className="text-right px-2 py-1.5">Growth</th>
                  <th className="text-right px-2 py-1.5">AI Risk</th>
                </tr>
              </thead>
              <tbody>
                {co.serviceLines.map(s => (
                  <tr key={s.line} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                    <td className="px-2 py-1.5 text-amber-100">{s.line}</td>
                    <td className="px-2 py-1.5 text-right">{s.revUSDb.toFixed(2)}</td>
                    <td className={`px-2 py-1.5 text-right ${s.growth >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtPct(s.growth)}</td>
                    <td className="px-2 py-1.5 text-right"><RiskPill risk={s.aiRisk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Top 10 Clients" icon={<Users size={14} />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm sensex-table">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1.5">Client</th>
                  <th className="text-right px-2 py-1.5">Rev ($M)</th>
                  <th className="text-right px-2 py-1.5">Trend</th>
                  <th className="text-right px-2 py-1.5">Risk</th>
                </tr>
              </thead>
              <tbody>
                {co.topClients.map(c => (
                  <tr key={c.client} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                    <td className="px-2 py-1.5 text-amber-100">{c.client}</td>
                    <td className="px-2 py-1.5 text-right">{c.revUSDm}</td>
                    <td className={`px-2 py-1.5 text-right ${c.trend === 'Growing' ? 'text-emerald-300' : c.trend === 'Declining' ? 'text-red-300' : 'text-slate-300'}`}>{c.trend}</td>
                    <td className="px-2 py-1.5 text-right">{c.risk && <RiskPill risk={c.risk} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Margin Bridge — FY23 → FY24" icon={<Activity size={14} />}>
          <MarginBridgeChart co={co} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Threat Map" icon={<AlertTriangle size={14} />}>
          <div className="space-y-2">
            {co.threats.map(t => (
              <div key={t.threat} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-amber-100 font-semibold text-sm">{t.threat}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{t.timeline}</span>
                    <SeverityDot severity={t.severity} />
                  </div>
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Mitigation: <span className="text-slate-200">{t.mitigation}</span> · Residual risk: <span className="text-amber-200 font-semibold">{t.residual}/10</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Balance Sheet" icon={<DollarSign size={14} />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm sensex-table">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1.5">Metric</th>
                  <th className="text-right px-2 py-1.5">FY24</th>
                  <th className="text-right px-2 py-1.5">FY23</th>
                  <th className="text-right px-2 py-1.5">FY22</th>
                </tr>
              </thead>
              <tbody>
                {co.balanceSheet.map(b => (
                  <tr key={b.metric} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                    <td className="px-2 py-1.5 text-amber-100">{b.metric}</td>
                    <td className="px-2 py-1.5 text-right">{b.fy24}</td>
                    <td className="px-2 py-1.5 text-right">{b.fy23}</td>
                    <td className="px-2 py-1.5 text-right">{b.fy22}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function CompanySwitcher({ activeKey, onSelect }: { activeKey: CompanyKey; onSelect: (k: CompanyKey) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {(Object.keys(COMPANIES) as CompanyKey[]).map(k => {
        const co = COMPANIES[k];
        const active = activeKey === k;
        return (
          <button
            key={k}
            onClick={() => onSelect(k)}
            className={`text-left rounded-xl border p-4 transition-all ${active
              ? 'border-amber-500/60 bg-amber-500/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
              : 'border-slate-700/60 bg-slate-900/40 hover:border-amber-500/30 hover:bg-slate-800/40'}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="font-serif text-lg text-amber-100 tracking-tight">{co.name}</div>
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold tracking-wider"
                    style={{ color: RATING_COLOR[co.rating], background: `${RATING_COLOR[co.rating]}15`, border: `1px solid ${RATING_COLOR[co.rating]}40` }}>
                {co.rating}
              </span>
            </div>
            <div className="text-xs text-slate-400 line-clamp-2">{co.thesisLine}</div>
          </button>
        );
      })}
    </div>
  );
}

function SeverityDot({ severity }: { severity: number }) {
  const color = severity >= 8 ? '#ef4444' : severity >= 6 ? '#f59e0b' : severity >= 4 ? '#eab308' : '#10b981';
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-mono" style={{ color }}>{severity}/10</span>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    </div>
  );
}

function MarginBridgeChart({ co }: { co: CompanyAutopsy }) {
  // Build waterfall data
  const data = useMemo(() => {
    let running = co.marginBridgeStart.value;
    const arr: { name: string; base: number; delta: number; running: number; }[] = [
      { name: co.marginBridgeStart.label, base: 0, delta: running, running },
    ];
    for (const r of co.marginBridge) {
      const next = running + r.bps / 100;
      arr.push({ name: r.factor, base: r.bps >= 0 ? running : next, delta: Math.abs(r.bps / 100), running: next });
      running = next;
    }
    arr.push({ name: co.marginBridgeEnd.label, base: 0, delta: running, running });
    return arr;
  }, [co]);

  return (
    <>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: PALETTE.muted, fontSize: 9 }} angle={-15} dy={10} interval={0} />
            <YAxis tick={{ fill: PALETTE.muted, fontSize: 10 }} domain={[Math.min(co.marginBridgeStart.value, co.marginBridgeEnd.value) - 1, Math.max(co.marginBridgeStart.value, co.marginBridgeEnd.value) + 1]} label={{ value: 'Op Margin %', angle: -90, position: 'insideLeft', fill: PALETTE.muted, fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="base"  stackId="a" fill="transparent" />
            <Bar dataKey="delta" stackId="a" radius={[3, 3, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === 0 || i === data.length - 1 ? PALETTE.gold : co.marginBridge[i - 1].bps >= 0 ? PALETTE.green : PALETTE.red} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-slate-400 mt-2 leading-relaxed">
        Bridge from <span className="text-amber-200">{co.marginBridgeStart.value.toFixed(1)}%</span> ({co.marginBridgeStart.label}) to
        <span className="text-amber-200"> {co.marginBridgeEnd.value.toFixed(1)}%</span> ({co.marginBridgeEnd.label}).
      </div>
    </>
  );
}


/* ────────────────────────────────────────────────────────────────────────── */
/* Tab 6 — Scenarios & Portfolio                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function ScenariosTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {INDUSTRY_SCENARIOS.map((s, i) => {
          const tones = ['border-emerald-500/40', 'border-amber-500/40', 'border-blue-500/40'];
          return (
            <div key={s.name} className={`premium-card border ${tones[i]} p-5`}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-serif text-lg text-amber-100">{s.name}</div>
                <span className="pill">{s.probability}%</span>
              </div>
              <div className="text-sm text-slate-200 mb-3 leading-relaxed">{s.headline}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat label="Revenue (FY27)"  value={s.revenueFY27USDb} />
                <Stat label="Headcount FY27" value={`${s.headcountFY27M}M`} />
                <Stat label="Margin FY27"    value={`${s.marginFY27Pct}%`} />
                <Stat label="Multiple Range" value={s.multipleRange} />
              </div>
              <div className="hairline-divider my-3" />
              <div className="text-[11px] text-slate-400 leading-relaxed">
                <span className="text-slate-500">Suggested portfolio:</span> {s.portfolio}
              </div>
            </div>
          );
        })}
      </div>

      <SectionCard title="Recommended Long-Form Portfolio" icon={<Briefcase size={14} />}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="20%" outerRadius="100%" data={RECOMMENDED_PORTFOLIO} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 50]} tick={false} />
                <RadialBar background={{ fill: '#1e293b' }} dataKey="allocation" cornerRadius={6}>
                  {RECOMMENDED_PORTFOLIO.map((_, i) => (
                    <Cell key={i} fill={[PALETTE.gold, PALETTE.blue, PALETTE.green, PALETTE.amber, PALETTE.slate][i % 5]} />
                  ))}
                </RadialBar>
                <Tooltip content={<ChartTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {RECOMMENDED_PORTFOLIO.map((p, i) => (
              <div key={p.ticker} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 flex items-start gap-3">
                <div className="w-1.5 h-12 rounded-full shrink-0" style={{ background: [PALETTE.gold, PALETTE.blue, PALETTE.green, PALETTE.amber, PALETTE.slate][i % 5] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-amber-100 font-semibold">{p.ticker}</div>
                    <span className="text-amber-300 font-mono text-sm">{p.allocation}%</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{p.rationale}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hairline-divider my-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <Stat label="Expected 5Y CAGR" value="12-18%" />
          <Stat label="Vs Nifty 50"      value="8-10% benchmark" />
          <Stat label="Downside (Scenario B)" value="−30% (cushioned by 15% cash)" />
        </div>
      </SectionCard>

      <SectionCard title="Quarterly Metrics to Track" icon={<Activity size={14} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {KEY_METRICS_TO_TRACK.map((m, i) => (
            <div key={i} className="rounded-md border border-slate-700/60 bg-slate-900/40 p-2.5 text-sm text-slate-300 flex items-start gap-2">
              <ChevronRight size={14} className="text-amber-400/70 mt-0.5 shrink-0" />
              <span>{m}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Tab 7 — Philosophy / Recursive Question                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function PhilosophyTab() {
  return (
    <div className="space-y-6">
      <SectionCard title="The Recursive Question" icon={<Sparkles size={14} />}>
        <p className="text-base text-slate-200 leading-relaxed text-pretty italic border-l-2 border-amber-500/40 pl-4">
          If a large language model can write code, design systems, test software, and deploy to cloud — what exactly is a
          &ldquo;software services company&rdquo; selling?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-sm">
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Old Answer</div>
            <div className="text-amber-200 font-serif mt-1">Human time × skill × domain knowledge</div>
          </div>
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="text-[10px] uppercase tracking-widest text-amber-300">New Answer</div>
            <div className="text-amber-100 font-serif mt-1">??? — being rewritten in real time</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Four Possible Futures" icon={<BookOpen size={14} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PHILOSOPHICAL_FUTURES.map(f => (
            <div key={f.name} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-amber-100 font-semibold">{f.name}</div>
                <span className="pill">{f.probability}%</span>
              </div>
              <div className="text-sm text-slate-300 leading-relaxed">{f.summary}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="The Textile Industry Analogy" icon={<Activity size={14} />}>
        <p className="text-sm text-slate-200 leading-relaxed text-pretty">
          The Indian IT industry is experiencing what the textile industry experienced in the 1800s: <span className="text-amber-200 font-semibold">mechanisation of the core skill</span>.
          Spinning jenny → power loom → automated weaving destroyed handloom weavers. AI coding → agentic AI → autonomous systems destroys junior developers.
          But the textile industry didn&apos;t disappear. It transformed into fast fashion, luxury brands, and technical textiles.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-sm">
          {[
            ['AI Governance & Ethics', 'the luxury brand'],
            ['AI Training & Fine-tuning', 'the technical textile'],
            ['Complex System Integration', 'the custom tailoring'],
            ['Change Management & Adoption', 'the retail chain'],
          ].map(([a, b]) => (
            <div key={a} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
              <div className="text-amber-100 font-semibold">{a}</div>
              <div className="text-xs text-slate-400">{b}</div>
            </div>
          ))}
        </div>
        <div className="hairline-divider my-4" />
        <p className="text-sm text-slate-200 leading-relaxed text-pretty italic">
          &ldquo;The Indian IT industry is not dead. It&apos;s not even dying. It&apos;s undergoing metamorphosis. The caterpillar
          (labour arbitrage) is becoming a butterfly (AI-native services). Most won&apos;t survive the cocoon. But those that do will
          fly higher than ever.&rdquo;
        </p>
      </SectionCard>
    </div>
  );
}
