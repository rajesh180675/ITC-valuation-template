import { useState, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, ReferenceLine
} from 'recharts';
import {
  BarChart3, TrendingUp, PieChart as PieIcon, Shield, Calculator,
  Target, Globe, BookOpen, Activity, ArrowUpRight, ArrowDownRight,
  Menu, X, Layers, Zap, Info, AlertTriangle, Brain, Building2, Briefcase
} from 'lucide-react';
import {
  historicalData, taxEvents, segmentDataFY24, defaultAssumptions,
  globalTobaccoComparison, budgetCheatSheet, sharesOutstanding, sotpData,
  type ProjectionAssumptions
} from './data/itcData';
import {
  calculateDCF,
  calculateSotpSummary,
  generateProjections,
  simulateTaxImpact,
} from './utils/itcModel';
import { SensexUniverseSection } from './components/sensex/SensexUniverseSection';
import { AdvancedValuationSection } from './components/itc/AdvancedValuationSection';
import { CompanyUniverseSection } from './components/companies/CompanyUniverseSection';
import { RalphSection } from './components/ralph/RalphSection';
import { IdeaLabSection } from './components/itc/IdeaLabSection';

// ─── Types ───────────────────────────────────────────────────────────────────
type Section = 'dashboard' | 'financials' | 'segments' | 'tax' | 'valuation' | 'advanced' | 'ideaLab' | 'universe' | 'projections' | 'playbook' | 'global' | 'sensex' | 'ralph';

interface NavItem { id: Section; label: string; icon: React.ReactNode; }

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Activity size={18} /> },
  { id: 'financials', label: 'Financials', icon: <BarChart3 size={18} /> },
  { id: 'segments', label: 'Segments', icon: <PieIcon size={18} /> },
  { id: 'tax', label: 'Tax Analyzer', icon: <Shield size={18} /> },
  { id: 'valuation', label: 'Valuation', icon: <Calculator size={18} /> },
  { id: 'advanced', label: 'Advanced Lab', icon: <Brain size={18} /> },
  { id: 'ideaLab', label: 'Idea Lab', icon: <Zap size={18} /> },
  { id: 'universe', label: 'Company Universe', icon: <Building2 size={18} /> },
  { id: 'projections', label: 'Projections', icon: <TrendingUp size={18} /> },
  { id: 'playbook', label: 'Budget Playbook', icon: <Target size={18} /> },
  { id: 'global', label: 'Global Compare', icon: <Globe size={18} /> },
  { id: 'sensex', label: 'Sensex Universe', icon: <Layers size={18} /> },
  { id: 'ralph', label: 'Ralph Lab', icon: <Briefcase size={18} /> },
];



// ─── Format Helpers ──────────────────────────────────────────────────────────
const fmt = (n: number) => {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L Cr`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};
const fmtN = (n: number, d = 1) => n.toFixed(d);
const pct = (n: number, d = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`;
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DASHBOARD SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Dashboard() {
  const latest = historicalData[historicalData.length - 1];
  const prev = historicalData[historicalData.length - 2];
  const revGrowth = ((latest.revenue - prev.revenue) / prev.revenue) * 100;
  const profitGrowth = ((latest.netProfit - prev.netProfit) / prev.netProfit) * 100;
  const epsGrowth = ((latest.eps - prev.eps) / prev.eps) * 100;

  const revenueData = historicalData.map(d => ({
    year: d.year,
    Revenue: d.revenue,
    Cigarettes: d.cigaretteRevenue,
    FMCG: d.fmcgRevenue,
  }));

  const profitData = historicalData.map(d => ({
    year: d.year,
    EBITDA: d.ebitda,
    'Net Profit': d.netProfit,
    'FCF': d.freeCashFlow,
  }));

  const marginData = historicalData.map(d => ({
    year: d.year,
    'EBITDA Margin': d.ebitdaMargin,
    'Net Margin': d.netMargin,
    'ROE': d.roe,
    'Cig EBIT Margin': d.cigaretteEbitMargin,
  }));

  const epsData = historicalData.map(d => ({
    year: d.year,
    EPS: d.eps,
    DPS: d.dps,
  }));

  const volumeData = historicalData.map(d => ({
    year: d.year,
    'Volume Index': d.cigaretteVolumeIndex,
    'Tax Hike %': d.taxHikePct,
  }));

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="ITC Limited — Dashboard" subtitle="Comprehensive financial overview of India's largest diversified conglomerate" icon={<Activity size={22} />} />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Market Cap" value="~₹5.5L Cr" subtitle="Large Cap" color="blue" />
        <MetricCard title="Revenue" value={fmt(latest.revenue)} subtitle={pct(revGrowth) + ' YoY'} trend={revGrowth} color="green" />
        <MetricCard title="Net Profit" value={fmt(latest.netProfit)} subtitle={pct(profitGrowth) + ' YoY'} trend={profitGrowth} color="gold" />
        <MetricCard title="EPS" value={rupee(latest.eps)} subtitle={pct(epsGrowth) + ' YoY'} trend={epsGrowth} color="purple" />
        <MetricCard title="Dividend Yield" value={fmtN(latest.dividendYield) + '%'} subtitle={`DPS: ₹${latest.dps}`} color="blue" />
        <MetricCard title="P/E Ratio" value={fmtN(latest.peRatio) + 'x'} subtitle="Forward" color="green" />
      </div>

      {/* Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenue Trajectory (₹ Cr)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" fill="url(#gRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Segment Revenue Split</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Cigarettes" stackId="a" fill="#10b981" />
              <Bar dataKey="FMCG" stackId="a" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profitability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Profitability Metrics (₹ Cr)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="EBITDA" fill="#8b5cf6" opacity={0.7} />
              <Line type="monotone" dataKey="Net Profit" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="FCF" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Margins & Returns (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 70]} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="EBITDA Margin" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Net Margin" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ROE" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Cig EBIT Margin" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EPS/DPS & Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">EPS & DPS Trend (₹)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={epsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="EPS" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="DPS" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Cigarette Volume Index vs Tax Hike %</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} domain={[60, 120]} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 30]} />
              <Tooltip content={<ChartTooltip />} />
              <Area yAxisId="left" type="monotone" dataKey="Volume Index" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
              <Bar yAxisId="right" dataKey="Tax Hike %" fill="#ef4444" opacity={0.6} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FINANCIALS SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Financials() {
  const [view, setView] = useState<'income' | 'balance' | 'returns'>('income');
  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Financial Statements" subtitle="Historical financial data across 13 years (FY2012–FY2024)" icon={<BarChart3 size={22} />} />

      <div className="flex gap-2 border-b border-border pb-0">
        {(['income', 'balance', 'returns'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} className={`tab-btn px-4 py-2 text-sm font-medium ${view === v ? 'active' : 'text-gray-400'}`}>
            {v === 'income' ? 'Income Statement' : v === 'balance' ? 'Balance Sheet' : 'Returns & Ratios'}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-gray-400 font-medium sticky left-0 bg-surface-2 z-10 min-w-[100px]">Metric</th>
              {historicalData.map(d => (
                <th key={d.year} className="text-right p-3 text-gray-400 font-medium min-w-[80px]">{d.fy}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view === 'income' && (
              <>
                {[
                  { label: 'Total Revenue', key: 'revenue', fmt: fmt },
                  { label: 'Cigarette Revenue', key: 'cigaretteRevenue', fmt: fmt },
                  { label: 'FMCG Revenue', key: 'fmcgRevenue', fmt: fmt },
                  { label: 'Hotels Revenue', key: 'hotelsRevenue', fmt: fmt },
                  { label: 'Paper & Packaging', key: 'paperRevenue', fmt: fmt },
                  { label: 'Agri-Business', key: 'agriRevenue', fmt: fmt },
                  { label: 'EBITDA', key: 'ebitda', fmt: fmt },
                  { label: 'Net Profit', key: 'netProfit', fmt: fmt },
                  { label: 'EPS (₹)', key: 'eps', fmt: (n: number) => `₹${n.toFixed(2)}` },
                  { label: 'DPS (₹)', key: 'dps', fmt: (n: number) => `₹${n.toFixed(2)}` },
                  { label: 'Free Cash Flow', key: 'freeCashFlow', fmt: fmt },
                ].map(row => (
                  <tr key={row.key} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium sticky left-0 bg-surface-2 z-10">{row.label}</td>
                    {historicalData.map(d => (
                      <td key={d.year} className="text-right p-3 text-gray-300">
                        {row.fmt(d[row.key as keyof typeof d] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
            {view === 'balance' && (
              <>
                {[
                  { label: 'Total Assets', key: 'totalAssets', fmt: fmt },
                  { label: 'Net Debt (Cash)', key: 'netDebt', fmt: (n: number) => n < 0 ? `${fmt(Math.abs(n))} (Cash)` : fmt(n) },
                  { label: 'EBITDA Margin (%)', key: 'ebitdaMargin', fmt: (n: number) => `${n.toFixed(1)}%` },
                  { label: 'Net Margin (%)', key: 'netMargin', fmt: (n: number) => `${n.toFixed(1)}%` },
                  { label: 'Cig EBIT Margin (%)', key: 'cigaretteEbitMargin', fmt: (n: number) => `${n.toFixed(0)}%` },
                  { label: 'FMCG EBITDA Margin (%)', key: 'fmcgEbitdaMargin', fmt: (n: number) => `${n.toFixed(0)}%` },
                  { label: 'P/E Ratio (x)', key: 'peRatio', fmt: (n: number) => `${n.toFixed(0)}x` },
                  { label: 'Dividend Yield (%)', key: 'dividendYield', fmt: (n: number) => `${n.toFixed(1)}%` },
                  { label: 'Price High (₹)', key: 'stockPriceHigh', fmt: (n: number) => `₹${n}` },
                  { label: 'Price Low (₹)', key: 'stockPriceLow', fmt: (n: number) => `₹${n}` },
                ].map(row => (
                  <tr key={row.key} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium sticky left-0 bg-surface-2 z-10">{row.label}</td>
                    {historicalData.map(d => (
                      <td key={d.year} className="text-right p-3 text-gray-300">
                        {row.fmt(d[row.key as keyof typeof d] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
            {view === 'returns' && (
              <>
                {[
                  { label: 'ROE (%)', key: 'roe', fmt: (n: number) => `${n.toFixed(1)}%` },
                  { label: 'ROCE (%)', key: 'roce', fmt: (n: number) => `${n.toFixed(1)}%` },
                  { label: 'EBITDA Margin (%)', key: 'ebitdaMargin', fmt: (n: number) => `${n.toFixed(1)}%` },
                  { label: 'Net Margin (%)', key: 'netMargin', fmt: (n: number) => `${n.toFixed(1)}%` },
                  { label: 'Volume Index', key: 'cigaretteVolumeIndex', fmt: (n: number) => n.toFixed(0) },
                  { label: 'Tax Hike (%)', key: 'taxHikePct', fmt: (n: number) => `${n}%` },
                  { label: 'EPS (₹)', key: 'eps', fmt: (n: number) => `₹${n.toFixed(2)}` },
                  { label: 'DPS (₹)', key: 'dps', fmt: (n: number) => `₹${n.toFixed(2)}` },
                  { label: 'P/E Ratio', key: 'peRatio', fmt: (n: number) => `${n}x` },
                  { label: 'Div Yield (%)', key: 'dividendYield', fmt: (n: number) => `${n.toFixed(1)}%` },
                ].map(row => (
                  <tr key={row.key} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium sticky left-0 bg-surface-2 z-10">{row.label}</td>
                    {historicalData.map(d => (
                      <td key={d.year} className="text-right p-3 text-gray-300">
                        {row.fmt(d[row.key as keyof typeof d] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEGMENT ANALYSIS SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Segments() {
  const segRevPie = segmentDataFY24.map(s => ({ name: s.name, value: s.revenue, color: s.color }));
  const segEbitPie = segmentDataFY24.map(s => ({ name: s.name, value: s.ebit, color: s.color }));

  const segTrend = historicalData.map(d => {
    const total = d.cigaretteRevenue + d.fmcgRevenue + d.hotelsRevenue + d.paperRevenue + d.agriRevenue;
    return {
      year: d.year,
      Cigarettes: Math.round((d.cigaretteRevenue / total) * 100),
      FMCG: Math.round((d.fmcgRevenue / total) * 100),
      Hotels: Math.round((d.hotelsRevenue / total) * 100),
      Paper: Math.round((d.paperRevenue / total) * 100),
      Agri: Math.round((d.agriRevenue / total) * 100),
    };
  });

  const fmcgMarginTrend = historicalData.map(d => ({
    year: d.year,
    'FMCG EBITDA Margin': d.fmcgEbitdaMargin,
    'Cig EBIT Margin': d.cigaretteEbitMargin,
  }));

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Business Segment Analysis" subtitle="Deep dive into ITC's five business verticals — FY2024" icon={<Layers size={22} />} />

      {/* Segment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {segmentDataFY24.map((s) => (
          <div key={s.name} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-sm font-medium text-gray-200">{s.name}</span>
            </div>
            <p className="text-lg font-bold text-white">{fmt(s.revenue)}</p>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div><span className="text-gray-400">EBIT Margin</span><br /><span className="text-white font-medium">{s.ebitMargin}%</span></div>
              <div><span className="text-gray-400">Rev Share</span><br /><span className="text-white font-medium">{s.revenueShare}%</span></div>
              <div><span className="text-gray-400">EBIT</span><br /><span className="text-white font-medium">{fmt(s.ebit)}</span></div>
              <div><span className="text-gray-400">EBIT Share</span><br /><span className="text-white font-medium">{s.ebitShare}%</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenue Share by Segment</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={segRevPie} cx="50%" cy="50%" outerRadius={110} innerRadius={55} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {segRevPie.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">EBIT Share by Segment</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={segEbitPie} cx="50%" cy="50%" outerRadius={110} innerRadius={55} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {segEbitPie.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenue Mix Evolution (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={segTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Cigarettes" stackId="a" fill="#10b981" />
              <Bar dataKey="FMCG" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Hotels" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Paper" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="Agri" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Cigarette vs FMCG Margin Trajectory (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={fmcgMarginTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="Cig EBIT Margin" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="FMCG EBITDA Margin" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAX IMPACT ANALYZER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TaxAnalyzer() {
  const [simHike, setSimHike] = useState(12);

  const latest = historicalData[historicalData.length - 1];
  const taxImpact = useMemo(() => simulateTaxImpact(simHike, latest), [simHike, latest]);
  const {
    priceIncrease,
    volumeImpactShort,
    volumeImpactLong,
    revenueImpact,
    newCigEbit,
    newEbitMargin,
    stockReactionEstimate,
    passThroughPct,
    elasticityShort,
    elasticityLong,
  } = taxImpact;

  const priorCigEbit = latest.cigaretteRevenue * (latest.cigaretteEbitMargin / 100);
  const ebitImpact = ((newCigEbit - priorCigEbit) / priorCigEbit) * 100;


  const stockReactionData = taxEvents.map(e => ({
    year: e.year,
    'NCCD Hike %': e.nccdHike,
    'Stock Day %': e.stockReactionDay,
    'Stock Week %': e.stockReactionWeek,
    'Volume Impact %': e.volumeImpact,
  }));

  const taxHikeVsVolume = taxEvents.filter(e => e.nccdHike > 0).map(e => ({
    x: e.nccdHike,
    y: e.volumeImpact,
    z: Math.abs(e.stockReactionDay),
    year: e.year,
  }));

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Tax Impact Analyzer" subtitle="Simulate the impact of cigarette tax hikes on ITC's financials" icon={<Shield size={22} />} />

      {/* Simulator */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-yellow-400" />
          <h3 className="text-lg font-bold text-white">Tax Hike Simulator</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">NCCD Hike: <span className="text-yellow-400 font-bold">{simHike}%</span></label>
              <input type="range" min={0} max={30} step={1} value={simHike} onChange={e => setSimHike(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-gray-500 mt-1"><span>0%</span><span>15%</span><span>30%</span></div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Pass-through Rate</span><span className="text-white">{passThroughPct}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Short-term Elasticity</span><span className="text-white">{elasticityShort}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Long-term Elasticity</span><span className="text-white">{elasticityLong}</span></div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard title="Price Increase" value={`${priceIncrease.toFixed(1)}%`} subtitle="Passed to consumers" color="gold" trend={priceIncrease} />
            <MetricCard title="Volume Impact (Short)" value={`${volumeImpactShort.toFixed(1)}%`} subtitle="Decline expected" color="red" trend={volumeImpactShort} />
            <MetricCard title="Volume Impact (Long)" value={`${volumeImpactLong.toFixed(1)}%`} subtitle="Long-term effect" color="red" trend={volumeImpactLong} />
            <MetricCard title="Revenue Impact" value={`${revenueImpact.toFixed(1)}%`} subtitle="Cigarette segment" color={revenueImpact >= 0 ? 'green' : 'red'} trend={revenueImpact} />
            <MetricCard title="New EBIT Margin" value={`${newEbitMargin.toFixed(1)}%`} subtitle={`vs ${latest.cigaretteEbitMargin}% prior`} color={newEbitMargin >= latest.cigaretteEbitMargin ? 'green' : 'red'} trend={newEbitMargin - latest.cigaretteEbitMargin} />
            <MetricCard title="New Cig EBIT" value={fmt(newCigEbit)} subtitle="Post-hike estimate" color={ebitImpact >= 0 ? 'green' : 'red'} trend={ebitImpact} />
            <MetricCard title="EBIT Impact" value={`${ebitImpact >= 0 ? '+' : ''}${ebitImpact.toFixed(1)}%`} subtitle="vs prior EBIT" color={ebitImpact >= 0 ? 'green' : 'red'} trend={ebitImpact} />
            <MetricCard title="Est. Stock Reaction" value={`${stockReactionEstimate >= 0 ? '+' : ''}${stockReactionEstimate}%`} subtitle="Budget day est." color={stockReactionEstimate >= 0 ? 'green' : 'red'} trend={stockReactionEstimate} />
          </div>
        </div>
      </div>

      {/* Historical Tax Events */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Historical Tax Events & Stock Reactions</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={stockReactionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
            <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar yAxisId="left" dataKey="NCCD Hike %" fill="#ef4444" opacity={0.6} radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="Stock Day %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="Volume Impact %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Scatter: Tax vs Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Tax Hike % vs Volume Impact (Scatter)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="x" name="NCCD %" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Tax Hike %', position: 'bottom', fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="y" name="Volume %" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Volume %', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <ZAxis dataKey="z" range={[50, 400]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-xs">
                    <p className="text-gray-300">Year: {d.year}</p>
                    <p className="text-red-400">Tax Hike: {d.x}%</p>
                    <p className="text-blue-400">Volume Impact: {d.y}%</p>
                  </div>
                );
              }} />
              <Scatter data={taxHikeVsVolume} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card overflow-x-auto">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 p-4 pb-0">Tax Event History</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-gray-400">Year</th>
                <th className="text-left p-3 text-gray-400">Change</th>
                <th className="text-right p-3 text-gray-400">Day %</th>
                <th className="text-right p-3 text-gray-400">Week %</th>
                <th className="text-right p-3 text-gray-400">Vol %</th>
              </tr>
            </thead>
            <tbody>
              {taxEvents.map(e => (
                <tr key={e.year} className="border-b border-border/50 hover:bg-surface-3/50">
                  <td className="p-3 text-gray-300">{e.year}</td>
                  <td className="p-3 text-gray-300">{e.taxChange}</td>
                  <td className={`text-right p-3 ${e.stockReactionDay >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pct(e.stockReactionDay)}</td>
                  <td className={`text-right p-3 ${e.stockReactionWeek >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pct(e.stockReactionWeek)}</td>
                  <td className={`text-right p-3 ${e.volumeImpact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pct(e.volumeImpact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VALUATION TOOL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Valuation({ assumptions }: { assumptions: ProjectionAssumptions }) {
  const [tab, setTab] = useState<'sotp' | 'dcf'>('sotp');
  const [dcfWacc, setDcfWacc] = useState(10.5);
  const [dcfTerminal, setDcfTerminal] = useState(5.5);

  const latest = historicalData[historicalData.length - 1];
  const projections = useMemo(() => generateProjections(assumptions, latest), [assumptions, latest]);
  const dcfResult = useMemo(() => calculateDCF(projections, dcfWacc, dcfTerminal), [projections, dcfWacc, dcfTerminal]);
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
            <MetricCard title="Bear Case" value={rupee(sotpPerShareLow)} subtitle="₹3 L Cr off mcap" color="red" />
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
                <Bar dataKey="Low" fill="#ef4444" opacity={0.6} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Base" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                <Bar dataKey="High" fill="#10b981" opacity={0.6} />
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
              <MetricCard title="Fair Value / Share" value={dcfResult.isValid ? rupee(dcfResult.perShareValue) : '—'} subtitle={`₹{${sharesOutstanding} Cr shares}`} color="gold" />
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
                <Bar dataKey="FCF" fill="#3b82f6" opacity={0.7} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="PV of FCF" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
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
    { key: 'annualNccdHike', label: 'Annual NCCD Hike %', min: 0, max: 25, step: 1, color: 'text-red-400' },
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
              <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" fill="url(#gRevP)" strokeWidth={2} />
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
              <Bar dataKey="EBITDA" fill="#8b5cf6" opacity={0.6} radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="Net Profit" stroke="#f59e0b" strokeWidth={2} dot={false} />
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
              <Line type="monotone" dataKey="EBITDA %" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="FMCG Margin %" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Cig Margin %" stroke="#ef4444" strokeWidth={2} dot={false} />
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
              <Area type="monotone" dataKey="Cig Rev %" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              <Area type="monotone" dataKey="FMCG Rev %" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
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
              <Bar dataKey="Expected Move %" radius={[4, 4, 0, 0]}>
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
              <Bar dataKey="Budget Day %" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="1 Week %" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              <Bar dataKey="1 Month %" fill="#10b981" radius={[2, 2, 0, 0]} />
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
              <Bar dataKey="taxPctRetail" name="Tax %" radius={[0, 4, 4, 0]}>
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
              <Bar dataKey="perCapitaSticks" name="Sticks/Year" radius={[0, 4, 4, 0]}>
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
            <Radar name="Tax %" dataKey="Tax %" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
            <Radar name="Pack Price" dataKey="Pack Price" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
            <Radar name="Per Capita" dataKey="Per Capita" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
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
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assumptions, setAssumptions] = useState<ProjectionAssumptions>(defaultAssumptions);

  const renderSection = useCallback(() => {
    switch (section) {
      case 'dashboard': return <Dashboard />;
      case 'financials': return <Financials />;
      case 'segments': return <Segments />;
      case 'tax': return <TaxAnalyzer />;
      case 'valuation': return <Valuation assumptions={assumptions} />;
      case 'advanced': return <AdvancedValuationSection assumptions={assumptions} />;
      case 'ideaLab': return <IdeaLabSection assumptions={assumptions} />;
      case 'universe': return <CompanyUniverseSection />;
      case 'projections': return <Projections assumptions={assumptions} setAssumptions={setAssumptions} />;
      case 'playbook': return <Playbook />;
      case 'global': return <GlobalCompare />;
      case 'sensex': return <SensexUniverseSection />;
      case 'ralph': return <RalphSection />;
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
