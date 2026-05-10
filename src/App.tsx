import { useState, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ReferenceLine
} from 'recharts';
import {
  BarChart3, TrendingUp, PieChart as PieIcon, Shield, Calculator,
  Target, Globe, BookOpen, Activity, ArrowUpRight, ArrowDownRight,
  Menu, X, Layers, Zap, Info, AlertTriangle, Brain, Building2, Briefcase, Database,
  Cpu, Coins, Scale, Clock, Grid3x3
  } from 'lucide-react';
import {
  historicalData, taxEvents, defaultAssumptions,
  globalTobaccoComparison, budgetCheatSheet, sharesOutstanding, sotpData,
  type ProjectionAssumptions
} from './data/itcData';
import {
  calculateDCF,
  calculateSotpSummary,
  generateProjections,
} from './utils/itcModel';
import { DashboardSection } from './components/itc/DashboardSection';
import { FinancialsSection } from './components/itc/FinancialsSection';
import { SegmentsSection } from './components/itc/SegmentsSection';
import { TaxAnalyzerSection } from './components/itc/TaxAnalyzerSection';
import { SensexUniverseSection } from './components/sensex/SensexUniverseSection';
import { Nifty250UniverseSection } from './components/sensex/Nifty250UniverseSection';
import { NiftyIndexDataSection } from './components/sensex/NiftyIndexDataSection';
import { AdvancedValuationSection } from './components/itc/AdvancedValuationSection';
import { CompanyUniverseSection } from './components/companies/CompanyUniverseSection';
import { RalphSection } from './components/ralph/RalphSection';
import { IdeaLabSection } from './components/itc/IdeaLabSection';
import { DeepDive55YSection } from './components/deepdive/DeepDive55YSection';
import { IndianITDeepDiveSection } from './components/itservices/IndianITDeepDiveSection';
import { DividendSection } from './components/itc/DividendSection';
import { CapitalAllocationSection } from './components/itc/CapitalAllocationSection';
import { WorkingCapitalSection } from './components/itc/WorkingCapitalSection';
import { BusinessModelSection } from './components/itc/BusinessModelSection';
import { StockPerfSection } from './components/itc/StockPerfSection';

// ─── Types ───────────────────────────────────────────────────────────────────
type Section = 'dashboard' | 'financials' | 'segments' | 'tax' | 'valuation' | 'advanced' | 'ideaLab' | 'universe' | 'projections' | 'playbook' | 'global' | 'sensex' | 'nifty250' | 'nifty750data' | 'ralph' | 'deepdive55y' | 'itDeepDive' | 'stockPerf' | 'businessModel' | 'dividend' | 'capitalAllocation' | 'workingCapital';

interface NavItem { id: Section; label: string; icon: React.ReactNode; }

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Activity size={18} /> },
  { id: 'stockPerf', label: 'Stock Performance', icon: <TrendingUp size={18} /> },
  { id: 'financials', label: 'Financials', icon: <BarChart3 size={18} /> },
  { id: 'segments', label: 'Segments', icon: <PieIcon size={18} /> },
  { id: 'businessModel', label: 'Business Model', icon: <Grid3x3 size={18} /> },
  { id: 'tax', label: 'Tax Analyzer', icon: <Shield size={18} /> },
  { id: 'dividend', label: 'Dividends', icon: <Coins size={18} /> },
  { id: 'capitalAllocation', label: 'Capital Allocation', icon: <Scale size={18} /> },
  { id: 'workingCapital', label: 'Working Capital', icon: <Clock size={18} /> },
  { id: 'valuation', label: 'Valuation', icon: <Calculator size={18} /> },
  { id: 'advanced', label: 'Advanced Lab', icon: <Brain size={18} /> },
  { id: 'ideaLab', label: 'Idea Lab', icon: <Zap size={18} /> },
  { id: 'universe', label: 'Company Universe', icon: <Building2 size={18} /> },
  { id: 'projections', label: 'Projections', icon: <TrendingUp size={18} /> },
  { id: 'playbook', label: 'Budget Playbook', icon: <Target size={18} /> },
  { id: 'global', label: 'Global Compare', icon: <Globe size={18} /> },
  { id: 'sensex', label: 'Sensex Universe', icon: <Layers size={18} /> },
  { id: 'nifty250', label: 'Nifty 250 Universe', icon: <Layers size={18} /> },
  { id: 'nifty750data', label: 'Nifty 750 Data Hub', icon: <Database size={18} /> },
  { id: 'ralph', label: 'Ralph Lab', icon: <Briefcase size={18} /> },
  { id: 'deepdive55y', label: '55Y Deep Dive', icon: <BookOpen size={18} /> },
  { id: 'itDeepDive', label: 'IT Services Lab', icon: <Cpu size={18} /> },
];



// ─── Format Helpers ──────────────────────────────────────────────────────────
const fmt = (n: number) => {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L Cr`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};
const fmtN = (n: number, d = 1) => n.toFixed(d);
const rupee = (n: number) => `₹${n.toFixed(2)}`;

// ─── Tooltip Component ───────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-sm">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmt(p.value) : fmtN(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ title, value, subtitle, trend, color = 'blue' }: {
  title: string; value: string; subtitle: string; trend?: number; color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
    green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
    gold: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30',
    red: 'from-red-500/20 to-red-600/5 border-red-500/30',
  };
  return (
    <div className={`metric-card p-4 bg-gradient-to-br ${colorMap[color] || colorMap.blue}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {trend !== undefined && (
          trend >= 0 ? <ArrowUpRight size={14} className="text-emerald-400" /> :
            <ArrowDownRight size={14} className="text-red-400" />
        )}
        <span className={`text-xs ${trend !== undefined ? (trend >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-400'}`}>
          {subtitle}
        </span>
      </div>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">{icon}</div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <p className="text-gray-400 text-sm ml-12">{subtitle}</p>
    </div>
  );
}

// DASHBOARD SECTION (moved to DashboardSection.tsx)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FINANCIALS SECTION (moved to FinancialsSection.tsx)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VALUATION TOOL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Valuation({ assumptions }: { assumptions: ProjectionAssumptions }) {
  const [tab, setTab] = useState<'sotp' | 'dcf'>('sotp');
  const [dcfWacc, setDcfWacc] = useState(assumptions.wacc);
  const [dcfTerminal, setDcfTerminal] = useState(assumptions.terminalGrowth);

  const latest = historicalData[historicalData.length - 1];
  const projections = useMemo(() => generateProjections(assumptions, latest), [assumptions, latest]);
  const dcfResult = useMemo(() => calculateDCF(projections, dcfWacc, dcfTerminal, { valuationDateNetDebt: latest.netDebt }), [projections, dcfWacc, dcfTerminal, latest.netDebt]);
  const sotpSummary = useMemo(() => calculateSotpSummary(sotpData, latest), [latest]);
  const {
    totalBase: totalSotpBase,
    totalLow: totalSotpLow,
    totalHigh: totalSotpHigh,
    netCash,
    perShareBase: sotpPerShareBase,
    perShareLow: sotpPerShareLow,
    perShareHigh: sotpPerShareHigh,
  } = sotpSummary;

  const dcfError = !dcfResult.isValid ? 'Terminal growth must stay below WACC.' : null;

  const sotpBarData = sotpData.map(s => ({
    name: s.segment.replace(/ \(.*\)/, ''),
    'Low': s.valueLow / 1000,
    'Base': s.value / 1000,
    'High': s.valueHigh / 1000,
  }));

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Valuation Tools" subtitle="Sum-of-the-Parts (SOTP) and Discounted Cash Flow (DCF) analysis" icon={<Calculator size={22} />} />

      <div className="flex gap-2 border-b border-border pb-0">
        <button onClick={() => setTab('sotp')} className={`tab-btn px-4 py-2 text-sm font-medium ${tab === 'sotp' ? 'active' : 'text-gray-400'}`}>SOTP Valuation</button>
        <button onClick={() => setTab('dcf')} className={`tab-btn px-4 py-2 text-sm font-medium ${tab === 'dcf' ? 'active' : 'text-gray-400'}`}>DCF Model</button>
      </div>

      {tab === 'sotp' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard title="Bear Case" value={rupee(sotpPerShareLow)} subtitle="��3 L Cr off mcap" color="red" />
            <MetricCard title="Base Case" value={rupee(sotpPerShareBase)} subtitle={`${totalSotpBase + netCash > 550000 ? 'Upside' : 'Downside'}`} color="blue" />
            <MetricCard title="Bull Case" value={rupee(sotpPerShareHigh)} subtitle="Premium valuations" color="green" />
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Segment Valuation Range (₹'000 Cr)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sotpBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Bar dataKey="Low" fill="#ef4444" opacity={0.6} radius={[0, 0, 0, 0]} isAnimationActive={true} />
                <Bar dataKey="Base" fill="#3b82f6" radius={[0, 3, 3, 0]} isAnimationActive={true} />
                <Bar dataKey="High" fill="#10b981" opacity={0.6} isAnimationActive={true} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-gray-400">Segment</th>
                  <th className="text-right p-3 text-gray-400">EBIT (₹ Cr)</th>
                  <th className="text-right p-3 text-gray-400">Multiple (x)</th>
                  <th className="text-right p-3 text-gray-400">Bear (₹ Cr)</th>
                  <th className="text-right p-3 text-gray-400">Base (₹ Cr)</th>
                  <th className="text-right p-3 text-gray-400">Bull (₹ Cr)</th>
                  <th className="text-left p-3 text-gray-400">Basis</th>
                </tr>
              </thead>
              <tbody>
                {sotpData.map(s => (
                  <tr key={s.segment} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium">{s.segment}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(s.ebit)}</td>
                    <td className="text-right p-3 text-gray-300">{s.multiple}x</td>
                    <td className="text-right p-3 text-red-300">{fmt(s.valueLow)}</td>
                    <td className="text-right p-3 text-blue-300 font-medium">{fmt(s.value)}</td>
                    <td className="text-right p-3 text-emerald-300">{fmt(s.valueHigh)}</td>
                    <td className="p-3 text-gray-400 text-xs">{s.basis}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold">
                  <td className="p-3 text-white">Total Enterprise</td>
                  <td className="p-3" /><td className="p-3" />
                  <td className="text-right p-3 text-red-300">{fmt(totalSotpLow)}</td>
                  <td className="text-right p-3 text-blue-300">{fmt(totalSotpBase)}</td>
                  <td className="text-right p-3 text-emerald-300">{fmt(totalSotpHigh)}</td>
                  <td className="p-3" />
                </tr>
                <tr>
                  <td className="p-3 text-gray-300">+ Net Cash</td>
                  <td /><td />
                  <td className="text-right p-3 text-gray-300">{fmt(netCash)}</td>
                  <td className="text-right p-3 text-gray-300">{fmt(netCash)}</td>
                  <td className="text-right p-3 text-gray-300">{fmt(netCash)}</td>
                  <td />
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 text-white font-bold">Per Share</td>
                  <td /><td />
                  <td className="text-right p-3 text-red-300 font-bold">{rupee(sotpPerShareLow)}</td>
                  <td className="text-right p-3 text-blue-300 font-bold">{rupee(sotpPerShareBase)}</td>
                  <td className="text-right p-3 text-emerald-300 font-bold">{rupee(sotpPerShareHigh)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'dcf' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-300">DCF Assumptions</h3>
              <div>
                <label className="text-sm text-gray-400 block mb-2">WACC: <span className="text-blue-400 font-bold">{dcfWacc}%</span></label>
                <input type="range" min={7} max={14} step={0.5} value={dcfWacc} onChange={e => setDcfWacc(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">Terminal Growth: <span className="text-blue-400 font-bold">{dcfTerminal}%</span></label>
                <input type="range" min={3} max={8} step={0.5} value={dcfTerminal} onChange={e => setDcfTerminal(Number(e.target.value))} className="w-full" />
              </div>
              {dcfError && <p className="text-xs text-red-400">{dcfError}</p>}
            </div>

            <div className="lg:col-span-2 grid grid-cols-3 gap-3">
              <MetricCard title="Enterprise Value" value={dcfResult.isValid ? fmt(dcfResult.enterpriseValue) : '—'} subtitle="PV of all cash flows" color="blue" />
              <MetricCard title="Equity Value" value={dcfResult.isValid ? fmt(dcfResult.equityValue) : '—'} subtitle="+ Net cash" color="green" />
              <MetricCard title="Fair Value / Share" value={dcfResult.isValid ? rupee(dcfResult.perShareValue) : '—'} subtitle={`${sharesOutstanding} Cr shares`} color="gold" />
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Projected Free Cash Flow & PV (₹ Cr)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={projections.map((p, i) => ({ year: p.year, FCF: p.freeCashFlow, 'PV of FCF': dcfResult.pvCashFlows[i] }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                <Bar dataKey="FCF" fill="#3b82f6" opacity={0.7} radius={[3, 3, 0, 0]} isAnimationActive={true} />
                <Line type="monotone" dataKey="PV of FCF" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={true} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-gray-400">Year</th>
                  <th className="text-right p-3 text-gray-400">Revenue</th>
                  <th className="text-right p-3 text-gray-400">EBITDA</th>
                  <th className="text-right p-3 text-gray-400">Net Profit</th>
                  <th className="text-right p-3 text-gray-400">EPS</th>
                  <th className="text-right p-3 text-gray-400">FCF</th>
                  <th className="text-right p-3 text-gray-400">PV of FCF</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p, i) => (
                  <tr key={p.year} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium">{p.fy}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(p.revenue)}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(p.ebitda)}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(p.netProfit)}</td>
                    <td className="text-right p-3 text-gray-300">{rupee(p.eps)}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(p.freeCashFlow)}</td>
                    <td className="text-right p-3 text-yellow-300">{dcfResult.isValid ? fmt(dcfResult.pvCashFlows[i]) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━��━━━━━━━━━━━━━━━━━━━��━━━━━━━━━━━━━━━━━━━
// FUTURE PROJECTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Projections({ assumptions, setAssumptions }: {
  assumptions: ProjectionAssumptions;
  setAssumptions: React.Dispatch<React.SetStateAction<ProjectionAssumptions>>;
}) {
  const latest = historicalData[historicalData.length - 1];
  const projections = useMemo(() => generateProjections(assumptions, latest), [assumptions, latest]);

  const allData = [...historicalData, ...projections];
  const projStartIdx = historicalData.length;

  const revProjData = allData.map(d => ({
    year: d.year,
    Revenue: d.revenue,
    Cigarettes: d.cigaretteRevenue,
    FMCG: d.fmcgRevenue,
    projected: allData.indexOf(d) >= projStartIdx,
  }));

  const profitProjData = allData.map(d => ({
    year: d.year,
    EBITDA: d.ebitda,
    'Net Profit': d.netProfit,
  }));

  const marginProjData = allData.map(d => ({
    year: d.year,
    'EBITDA %': d.ebitdaMargin,
    'FMCG Margin %': d.fmcgEbitdaMargin,
    'Cig Margin %': d.cigaretteEbitMargin,
  }));

  const mixProjData = allData.map(d => {
    const total = d.cigaretteRevenue + d.fmcgRevenue + d.hotelsRevenue + d.paperRevenue + d.agriRevenue;
    return {
      year: d.year,
      'Cig Rev %': Math.round((d.cigaretteRevenue / total) * 100),
      'FMCG Rev %': Math.round((d.fmcgRevenue / total) * 100),
      'Cig EBIT %': Math.round((d.cigaretteRevenue * d.cigaretteEbitMargin / 100) / (d.ebitda / 1.05) * 100),
    };
  });

  const update = (key: keyof ProjectionAssumptions, val: number) => {
    setAssumptions(prev => ({ ...prev, [key]: val }));
  };

  const sliders: { key: keyof ProjectionAssumptions; label: string; min: number; max: number; step: number; color: string }[] = [
    { key: 'cigaretteRevenueGrowth', label: 'Cigarette Rev Growth %', min: 0, max: 12, step: 0.5, color: 'text-emerald-400' },
    { key: 'fmcgRevenueGrowth', label: 'FMCG Rev Growth %', min: 5, max: 20, step: 0.5, color: 'text-blue-400' },
    { key: 'cigaretteEbitMargin', label: 'Cigarette EBIT Margin %', min: 55, max: 72, step: 1, color: 'text-yellow-400' },
    { key: 'fmcgEbitdaMargin', label: 'FMCG EBITDA Margin %', min: 5, max: 22, step: 0.5, color: 'text-purple-400' },
    { key: 'annualNccdHike', label: 'Annual NCCD Hike Impact %', min: 0, max: 25, step: 1, color: 'text-red-400' },
    { key: 'taxRate', label: 'Effective Tax Rate %', min: 20, max: 30, step: 0.5, color: 'text-orange-400' },
  ];

  const lastProj = projections[projections.length - 1];
  const lastHist = historicalData[historicalData.length - 1];
  const cigRevShareFinal = Math.round((lastProj.cigaretteRevenue / lastProj.revenue) * 100);
  const fmcgRevShareFinal = Math.round((lastProj.fmcgRevenue / lastProj.revenue) * 100);

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Future Projections" subtitle="Interactive 7-year financial projections (FY2025E – FY2031E)" icon={<TrendingUp size={22} />} />

      {/* Assumption Sliders */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Zap size={16} className="text-yellow-400" /> Adjust Assumptions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {sliders.map(s => (
            <div key={s.key}>
              <label className="text-xs text-gray-400 block mb-1">{s.label}: <span className={`${s.color} font-bold`}>{assumptions[s.key]}%</span></label>
              <input type="range" min={s.min} max={s.max} step={s.step} value={assumptions[s.key]}
                onChange={e => update(s.key, Number(e.target.value))} className="w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Key Milestones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="FY2031E Revenue" value={fmt(lastProj.revenue)} subtitle={`CAGR from FY24`} color="blue" />
        <MetricCard title="FY2031E Net Profit" value={fmt(lastProj.netProfit)} subtitle={`EPS: ${rupee(lastProj.eps)}`} color="green" />
        <MetricCard title="Cig Rev Share (FY31E)" value={`${cigRevShareFinal}%`} subtitle={`vs ${Math.round((lastHist.cigaretteRevenue / lastHist.revenue) * 100)}% FY24`} color="gold" />
        <MetricCard title="FMCG Rev Share (FY31E)" value={`${fmcgRevShareFinal}%`} subtitle={`vs ${Math.round((lastHist.fmcgRevenue / lastHist.revenue) * 100)}% FY24`} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenue Trajectory — Historical + Projected</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revProjData}>
              <defs>
                <linearGradient id="gRevP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" fill="url(#gRevP)" strokeWidth={2} isAnimationActive={true} />
              <ReferenceLine x={historicalData[historicalData.length - 1].year} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '→ Projected', fill: '#f59e0b', fontSize: 10, position: 'top' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">EBITDA & Net Profit</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={profitProjData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="EBITDA" fill="#8b5cf6" opacity={0.6} radius={[3, 3, 0, 0]} isAnimationActive={true} />
              <Line type="monotone" dataKey="Net Profit" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={true} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Margin Evolution (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={marginProjData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Line type="monotone" dataKey="EBITDA %" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={true} />
              <Line type="monotone" dataKey="FMCG Margin %" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={true} />
              <Line type="monotone" dataKey="Cig Margin %" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenue Mix Shift — Cigarette vs FMCG (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={mixProjData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Area type="monotone" dataKey="Cig Rev %" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} isAnimationActive={true} />
              <Area type="monotone" dataKey="FMCG Rev %" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} isAnimationActive={true} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full Projection Table */}
      <div className="glass-card overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-300 p-4 pb-0 mb-2">Detailed Projections (₹ Crore)</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-gray-400">Year</th>
              <th className="text-right p-3 text-gray-400">Revenue</th>
              <th className="text-right p-3 text-gray-400">Cig Rev</th>
              <th className="text-right p-3 text-gray-400">FMCG Rev</th>
              <th className="text-right p-3 text-gray-400">EBITDA</th>
              <th className="text-right p-3 text-gray-400">Net Profit</th>
              <th className="text-right p-3 text-gray-400">EPS</th>
              <th className="text-right p-3 text-gray-400">DPS</th>
              <th className="text-right p-3 text-gray-400">FCF</th>
              <th className="text-right p-3 text-gray-400">ROE %</th>
            </tr>
          </thead>
          <tbody>
            {projections.map(p => (
              <tr key={p.year} className="border-b border-border/50 hover:bg-surface-3/50">
                <td className="p-3 text-gray-300 font-medium">{p.fy}</td>
                <td className="text-right p-3 text-gray-300">{fmt(p.revenue)}</td>
                <td className="text-right p-3 text-gray-300">{fmt(p.cigaretteRevenue)}</td>
                <td className="text-right p-3 text-gray-300">{fmt(p.fmcgRevenue)}</td>
                <td className="text-right p-3 text-gray-300">{fmt(p.ebitda)}</td>
                <td className="text-right p-3 text-gray-300">{fmt(p.netProfit)}</td>
                <td className="text-right p-3 text-gray-300">{rupee(p.eps)}</td>
                <td className="text-right p-3 text-gray-300">{rupee(p.dps)}</td>
                <td className="text-right p-3 text-gray-300">{fmt(p.freeCashFlow)}</td>
                <td className="text-right p-3 text-gray-300">{p.roe}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUDGET PLAYBOOK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Playbook() {
  const cheatSheetChart = budgetCheatSheet.map(b => ({
    name: b.hikePct,
    'Expected Move %': b.stockMove,
    action: b.action,
  }));

  const eventTimeline = taxEvents.map(e => ({
    year: e.year,
    'Budget Day %': e.stockReactionDay,
    '1 Week %': e.stockReactionWeek,
    '1 Month %': e.stockReactionMonth,
  }));

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Budget Season Playbook" subtitle="Professional trader's guide to ITC around Union Budget events" icon={<Target size={22} />} />

      {/* Quick Action Guide */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <BookOpen size={16} className="text-yellow-400" /> Tax Hike Cheat Sheet
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-gray-400">NCCD Hike</th>
                <th className="text-left p-3 text-gray-400">Trader's Action</th>
                <th className="text-right p-3 text-gray-400">Expected Impact</th>
                <th className="text-center p-3 text-gray-400">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {budgetCheatSheet.map(b => (
                <tr key={b.hikePct} className="border-b border-border/50 hover:bg-surface-3/50">
                  <td className="p-3 text-white font-medium">{b.hikePct}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      b.action.includes('BUY') ? 'bg-emerald-500/20 text-emerald-300' :
                      b.action.includes('SELL') ? 'bg-red-500/20 text-red-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>{b.action}</span>
                  </td>
                  <td className={`text-right p-3 ${b.expectedImpact.startsWith('+') ? 'text-emerald-400' : b.expectedImpact.startsWith('-') ? 'text-red-400' : 'text-gray-300'}`}>
                    {b.expectedImpact}
                  </td>
                  <td className="text-center p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      b.confidence === 'HIGH' ? 'bg-emerald-500/20 text-emerald-300' :
                      b.confidence === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>{b.confidence}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Expected Stock Move by Tax Hike Level</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cheatSheetChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <ReferenceLine y={0} stroke="#64748b" />
              <Bar dataKey="Expected Move %" radius={[4, 4, 0, 0]} isAnimationActive={true}>
                {cheatSheetChart.map((entry, i) => (
                  <Cell key={i} fill={entry['Expected Move %'] >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Historical Stock Reactions (Day / Week / Month)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={eventTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="Budget Day %" fill="#3b82f6" radius={[2, 2, 0, 0]} isAnimationActive={true} />
              <Bar dataKey="1 Week %" fill="#f59e0b" radius={[2, 2, 0, 0]} isAnimationActive={true} />
              <Bar dataKey="1 Month %" fill="#10b981" radius={[2, 2, 0, 0]} isAnimationActive={true} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            title: 'Pre-Budget Fade',
            risk: 'Moderate',
            winRate: '65-70%',
            desc: 'Short ITC 3-4 weeks pre-budget as stock typically weakens 2-4%. Cover 1-2 days before budget.',
            color: 'border-yellow-500/40',
          },
          {
            title: 'Post-Budget Relief Rally',
            risk: 'Low',
            winRate: '75%',
            desc: 'If hike is ≤10% or absent, buy on budget day. Hold 2-4 weeks for 5-8% return.',
            color: 'border-emerald-500/40',
          },
          {
            title: 'Earnings Confirmation',
            risk: 'Moderate',
            winRate: '60%',
            desc: 'Post steep hike, wait for Q1 results. If vol decline <3% and margins hold → buy aggressively.',
            color: 'border-blue-500/40',
          },
          {
            title: 'FMCG Re-Rating',
            risk: 'Low',
            winRate: '70%',
            desc: 'Build long-term position on dips. Target 30-50% over 2-3 years as FMCG margins improve.',
            color: 'border-purple-500/40',
          },
          {
            title: 'Budget Day Straddle',
            risk: 'High',
            winRate: '60%',
            desc: 'Buy ATM straddle 1-2 days pre-budget. Profit if move exceeds premium paid (typically 3-5%).',
            color: 'border-red-500/40',
          },
          {
            title: 'Dividend Floor Buy',
            risk: 'Low',
            winRate: '80%',
            desc: 'Buy when dividend yield exceeds 4.5%. Historical floor with strong support at this level.',
            color: 'border-cyan-500/40',
          },
        ].map(s => (
          <div key={s.title} className={`glass-card p-5 border ${s.color}`}>
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-white font-bold text-sm">{s.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded ${s.risk === 'Low' ? 'bg-emerald-500/20 text-emerald-300' : s.risk === 'High' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                {s.risk} Risk
              </span>
            </div>
            <p className="text-gray-400 text-xs mb-3">{s.desc}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Historical Win Rate</span>
              <span className="text-sm font-bold text-blue-400">{s.winRate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function GlobalCompare() {
  const radarData = globalTobaccoComparison.map(c => ({
    country: c.country,
    'Tax %': c.taxPctRetail,
    'Pack Price': Math.min(c.packPriceINR / 22, 100),
    'Per Capita': Math.min(c.perCapitaSticks / 18, 100),
    'Market Share': c.marketShare,
  }));

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Global Tobacco Tax Comparison" subtitle="How India's cigarette taxation compares internationally" icon={<Globe size={22} />} />

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-gray-400">Country</th>
              <th className="text-right p-3 text-gray-400">Tax % of Retail</th>
              <th className="text-right p-3 text-gray-400">Pack Price (₹ equiv.)</th>
              <th className="text-right p-3 text-gray-400">Per Capita Sticks/yr</th>
              <th className="text-right p-3 text-gray-400">Top Co. Market Share</th>
            </tr>
          </thead>
          <tbody>
            {globalTobaccoComparison.map(c => (
              <tr key={c.country} className={`border-b border-border/50 hover:bg-surface-3/50 ${c.country.includes('India') ? 'bg-blue-500/10' : ''}`}>
                <td className="p-3 text-gray-300 font-medium">{c.country}</td>
                <td className="text-right p-3 text-gray-300">{c.taxPctRetail}%</td>
                <td className="text-right p-3 text-gray-300">₹{c.packPriceINR.toLocaleString()}</td>
                <td className="text-right p-3 text-gray-300">{c.perCapitaSticks}</td>
                <td className="text-right p-3 text-gray-300">{c.marketShare}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Tax as % of Retail Price</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={globalTobaccoComparison} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} />
              <YAxis dataKey="country" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="taxPctRetail" name="Tax %" radius={[0, 4, 4, 0]} isAnimationActive={true}>
                {globalTobaccoComparison.map((entry, i) => (
                  <Cell key={i} fill={entry.country.includes('India') ? '#f59e0b' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Per Capita Consumption (Sticks/Year)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={globalTobaccoComparison} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="country" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="perCapitaSticks" name="Sticks/Year" radius={[0, 4, 4, 0]} isAnimationActive={true}>
                {globalTobaccoComparison.map((entry, i) => (
                  <Cell key={i} fill={entry.country.includes('India') ? '#f59e0b' : '#8b5cf6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Multi-Dimensional Comparison (Normalized)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={130}>
            <PolarGrid stroke="#1c2940" />
            <PolarAngleAxis dataKey="country" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 9 }} />
            <Radar name="Tax %" dataKey="Tax %" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} isAnimationActive={true} />
            <Radar name="Pack Price" dataKey="Pack Price" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} isAnimationActive={true} />
            <Radar name="Per Capita" dataKey="Per Capita" stroke="#10b981" fill="#10b981" fillOpacity={0.15} isAnimationActive={true} />
            <Legend />
            <Tooltip content={<ChartTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Insights */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Info size={16} className="text-blue-400" /> Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-gray-300">
          <div className="p-3 bg-surface-3/50 rounded-lg">
            <AlertTriangle size={14} className="text-yellow-400 mb-2" />
            <p className="font-medium text-white mb-1">India's per-capita consumption is the lowest</p>
            <p>At ~90 sticks/year, India has the lowest per-capita cigarette consumption among major markets — but only because bidis dominate tobacco use.</p>
          </div>
          <div className="p-3 bg-surface-3/50 rounded-lg">
            <AlertTriangle size={14} className="text-yellow-400 mb-2" />
            <p className="font-medium text-white mb-1">Tax incidence is mid-range globally</p>
            <p>At 50-65% of retail price, India is below WHO's recommended 75%. This suggests room for further hikes, but the bidi-illicit trade dynamic complicates policy.</p>
          </div>
          <div className="p-3 bg-surface-3/50 rounded-lg">
            <AlertTriangle size={14} className="text-yellow-400 mb-2" />
            <p className="font-medium text-white mb-1">ITC's market share is exceptionally high</p>
            <p>At ~80%, ITC has among the highest market shares globally. This supports extraordinary pricing power but also means regulatory actions disproportionately impact ITC.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━��━━━
export default function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assumptions, setAssumptions] = useState<ProjectionAssumptions>(defaultAssumptions);

  const renderSection = useCallback(() => {
    switch (section) {
      case 'dashboard': return <DashboardSection />;
      case 'stockPerf': return <StockPerfSection />;
      case 'financials': return <FinancialsSection />;
      case 'segments': return <SegmentsSection />;
      case 'businessModel': return <BusinessModelSection />;
      case 'tax': return <TaxAnalyzerSection />;
      case 'dividend': return <DividendSection />;
      case 'capitalAllocation': return <CapitalAllocationSection />;
      case 'workingCapital': return <WorkingCapitalSection />;
      case 'valuation': return <Valuation assumptions={assumptions} />;
      case 'advanced': return <AdvancedValuationSection assumptions={assumptions} />;
      case 'ideaLab': return <IdeaLabSection assumptions={assumptions} />;
      case 'universe': return <CompanyUniverseSection />;
      case 'projections': return <Projections assumptions={assumptions} setAssumptions={setAssumptions} />;
      case 'playbook': return <Playbook />;
      case 'global': return <GlobalCompare />;
      case 'sensex': return <SensexUniverseSection />;
      case 'nifty250': return <Nifty250UniverseSection />;
      case 'nifty750data': return <NiftyIndexDataSection />;
      case 'ralph': return <RalphSection />;
      case 'deepdive55y': return <DeepDive55YSection />;
      case 'itDeepDive': return <IndianITDeepDiveSection />;
    }
  }, [section, assumptions]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0f1a]">
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-300 bg-surface border-r border-border flex flex-col shrink-0`}>
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0">
            I
          </div>
          {sidebarOpen && (
            <div className="animate-fadeIn">
              <h1 className="text-sm font-bold text-white leading-tight">ITC Limited</h1>
              <p className="text-[10px] text-gray-400">Data & Valuation Tool</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`sidebar-link w-full flex items-center gap-3 px-4 py-3 text-sm ${section === item.id ? 'active' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {item.icon}
              {sidebarOpen && <span className="animate-fadeIn">{item.label}</span>}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 border-t border-border text-gray-400 hover:text-white transition-colors flex items-center justify-center"
        >
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {renderSection()}
        <div className="glass-card mt-6 p-4 text-xs text-gray-400">
          <p className="text-gray-200 font-medium mb-1">Data Guardrails</p>
          <p>
            Historical figures and valuation assumptions are embedded in the repository for a reproducible,
            offline analytical workbook. Review the source data and methodology before using outputs as an
            investment decision.
          </p>
        </div>
      </main>
    </div>
  );
}
