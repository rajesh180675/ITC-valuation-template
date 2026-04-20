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
  Menu, X, Layers, Zap, Info, AlertTriangle, Brain, Building2
} from 'lucide-react';
import {
  historicalData, taxEvents, segmentDataFY24, defaultAssumptions,
  globalTobaccoComparison, budgetCheatSheet, sharesOutstanding, sotpData,
  type ProjectionAssumptions
} from './data/itcData';
import { sensexConstituents, SENSEX_FISCAL_YEARS } from './data/sensexData';
import {
  buildSensexIndexTimeSeries,
  buildSensexSectorSummary,
  calculateCagr,
  calculateDCF,
  calculateSotpSummary,
  generateProjections,
  getLatestSensexFinancial,
  getPrimaryValuationLabel,
  simulateTaxImpact,
} from './utils/itcModel';

// ─── Types ───────────────────────────────────────────────────────────────────
type Section = 'dashboard' | 'financials' | 'segments' | 'tax' | 'valuation' | 'projections' | 'playbook' | 'global' | 'sensex';

interface NavItem { id: Section; label: string; icon: React.ReactNode; }

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Activity size={18} /> },
  { id: 'financials', label: 'Financials', icon: <BarChart3 size={18} /> },
  { id: 'segments', label: 'Segments', icon: <PieIcon size={18} /> },
  { id: 'tax', label: 'Tax Analyzer', icon: <Shield size={18} /> },
  { id: 'valuation', label: 'Valuation', icon: <Calculator size={18} /> },
  { id: 'advanced', label: 'Advanced Lab', icon: <Brain size={18} /> },
  { id: 'universe', label: 'Company Universe', icon: <Building2 size={18} /> },
  { id: 'projections', label: 'Projections', icon: <TrendingUp size={18} /> },
  { id: 'playbook', label: 'Budget Playbook', icon: <Target size={18} /> },
  { id: 'global', label: 'Global Compare', icon: <Globe size={18} /> },
  { id: 'sensex', label: 'Sensex Universe', icon: <Layers size={18} /> },
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

// ━━━━━━━��━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GLOBAL COMPARISON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type SensexFilter = 'all' | 'financial' | 'nonFinancial';
type SortKey = 'weight' | 'mcap' | 'topline' | 'toplineCagr' | 'profitCagr' | 'roe' | 'valuation';

function SensexUniverse() {
  const [filter, setFilter] = useState<SensexFilter>('all');
  const [selectedId, setSelectedId] = useState(sensexConstituents[0]?.id ?? '');
  const [sortKey, setSortKey] = useState<SortKey>('weight');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const years = SENSEX_FISCAL_YEARS;
  const totalYears = years.length;
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(totalYears - 1);

  const filteredCompanies = useMemo(() => {
    if (filter === 'all') return sensexConstituents;
    return sensexConstituents.filter(company => company.reportingType === filter);
  }, [filter]);

  const selectedCompany = useMemo(
    () => filteredCompanies.find(company => company.id === selectedId) ?? filteredCompanies[0] ?? sensexConstituents[0],
    [filteredCompanies, selectedId],
  );

  const sectorSummary = useMemo(() => buildSensexSectorSummary(filteredCompanies), [filteredCompanies]);
  const indexSeries = useMemo(() => buildSensexIndexTimeSeries(filteredCompanies), [filteredCompanies]);

  const totalMarketCap = filteredCompanies.reduce((sum, company) => sum + company.marketCapCr, 0);
  const bfsiWeight = filteredCompanies
    .filter(company => company.reportingType === 'financial')
    .reduce((sum, company) => sum + company.weightPct, 0);
  const corpWeight = 100 - bfsiWeight;
  const largestSector = sectorSummary[0];

  const startFy = years[rangeStart];
  const endFy = years[rangeEnd];
  const rangePeriods = Math.max(1, rangeEnd - rangeStart);

  const companyRows = useMemo(() => {
    return filteredCompanies.map((company) => {
      const start = company.history[rangeStart];
      const end = company.history[rangeEnd];
      return {
        company,
        latest: end,
        first: start,
        toplineCagr: calculateCagr(start.toplineCr, end.toplineCr, rangePeriods),
        profitCagr: calculateCagr(start.netProfitCr, end.netProfitCr, rangePeriods),
        valuationLabel: getPrimaryValuationLabel(company),
      };
    });
  }, [filteredCompanies, rangeStart, rangeEnd, rangePeriods]);

  const sortedRows = useMemo(() => {
    const rows = [...companyRows];
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const getVal = (r: typeof a) => {
        switch (sortKey) {
          case 'weight': return r.company.weightPct;
          case 'mcap': return r.company.marketCapCr;
          case 'topline': return r.latest.toplineCr;
          case 'toplineCagr': return r.toplineCagr;
          case 'profitCagr': return r.profitCagr;
          case 'roe': return r.latest.roePct;
          case 'valuation': return r.company.valuationMultiple;
          default: return 0;
        }
      };
      return (getVal(a) - getVal(b)) * dir;
    });
    return rows;
  }, [companyRows, sortKey, sortDir]);

  const medianPatCagr = useMemo(() => {
    const values = companyRows.map(r => r.profitCagr).sort((a, b) => a - b);
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
  }, [companyRows]);

  const averageRoe = useMemo(() => {
    if (filteredCompanies.length === 0) return 0;
    return filteredCompanies.reduce((sum, company) => sum + getLatestSensexFinancial(company).roePct, 0) / filteredCompanies.length;
  }, [filteredCompanies]);

  const topWeightData = useMemo(() => [...filteredCompanies]
    .sort((a, b) => b.weightPct - a.weightPct)
    .slice(0, 12)
    .map((company) => ({ name: company.ticker, weightPct: company.weightPct, color: company.color })), [filteredCompanies]);

  const scatterData = useMemo(() => companyRows.map(r => ({
    name: r.company.ticker,
    x: r.profitCagr,
    y: r.company.valuationMultiple,
    z: Math.log(r.company.marketCapCr) * 10,
    color: r.company.color,
    sector: r.company.sector,
    metric: r.valuationLabel,
  })), [companyRows]);

  const indexStart = indexSeries[rangeStart];
  const indexEnd = indexSeries[rangeEnd];
  const universeToplineCagr = indexStart && indexEnd ? calculateCagr(indexStart.toplineCr, indexEnd.toplineCr, rangePeriods) : 0;
  const universeProfitCagr = indexStart && indexEnd ? calculateCagr(indexStart.netProfitCr, indexEnd.netProfitCr, rangePeriods) : 0;

  const selectedLatest = selectedCompany ? getLatestSensexFinancial(selectedCompany) : null;
  const selectedFirst = selectedCompany?.history[rangeStart];
  const selectedEnd = selectedCompany?.history[rangeEnd];
  const selectedPatCagr = selectedCompany && selectedFirst && selectedEnd
    ? calculateCagr(selectedFirst.netProfitCr, selectedEnd.netProfitCr, rangePeriods)
    : 0;
  const selectedHistoryChart = selectedCompany?.history.slice(rangeStart, rangeEnd + 1).map((item) => ({
    fy: item.fy,
    Topline: item.toplineCr,
    'Net Profit': item.netProfitCr,
  })) ?? [];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortCaret = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const setQuickRange = (years: number) => {
    const newStart = Math.max(0, totalYears - 1 - years);
    setRangeStart(newStart);
    setRangeEnd(totalYears - 1);
  };

  const rangeLabel = `${startFy}–${endFy}`;

  return (
    <div className="animate-fadeIn space-y-6">
      {/* ─── Hero Banner ──────────────────────────────────────── */}
      <div className="premium-card p-6 md:p-7">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 mb-3">
              <span className="pill"><span className="ticker-dot" /> Live Universe</span>
              <span className="pill pill-muted">BSE SENSEX · 30 Constituents</span>
              <span className="pill pill-muted">{rangeLabel}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Sensex <span className="text-[color:var(--color-gold-light)]">Universe</span>
            </h2>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl leading-relaxed">
              Institutional-grade view of India&apos;s benchmark 30 — 14 years of fiscal history (FY2011–FY2024), index weight mechanics, sector rotation and valuation dispersion in one cohesive lens.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="segmented">
              {([
                { id: 'all' as const, label: 'All 30' },
                { id: 'nonFinancial' as const, label: 'Corporates' },
                { id: 'financial' as const, label: 'BFSI' },
              ]).map(option => (
                <button key={option.id} onClick={() => setFilter(option.id)} className={filter === option.id ? 'active' : ''}>
                  {option.label}
                </button>
              ))}
            </div>
            <div className="segmented">
              {[5, 10, 14].map(n => {
                const isActive = rangeStart === Math.max(0, totalYears - 1 - n) && rangeEnd === totalYears - 1;
                return (
                  <button key={n} onClick={() => setQuickRange(n)} className={isActive ? 'active' : ''}>
                    {n}Y
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="hairline-divider my-5" />

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
          <div>
            <div className="kpi-eyebrow">Constituents</div>
            <div className="kpi-value text-2xl text-white mt-1">{filteredCompanies.length}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">of 30 total</div>
          </div>
          <div>
            <div className="kpi-eyebrow">Market Cap</div>
            <div className="kpi-value text-2xl text-white mt-1">{fmt(totalMarketCap)}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">aggregate float</div>
          </div>
          <div>
            <div className="kpi-eyebrow">BFSI / Corp Mix</div>
            <div className="kpi-value text-2xl text-white mt-1 tabular-nums">{fmtN(bfsiWeight, 1)}<span className="text-gray-500 text-base"> / </span>{fmtN(corpWeight, 1)}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">by index weight</div>
          </div>
          <div>
            <div className="kpi-eyebrow">Lead Sector</div>
            <div className="kpi-value text-lg text-white mt-1 truncate">{largestSector?.sector ?? '—'}</div>
            <div className="text-[11px] text-[color:var(--color-gold-light)] mt-0.5">{largestSector ? `${fmtN(largestSector.weightPct, 1)}% weight` : '—'}</div>
          </div>
          <div>
            <div className="kpi-eyebrow">Universe PAT CAGR</div>
            <div className={`kpi-value text-2xl mt-1 ${universeProfitCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(universeProfitCagr, 1)}%</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{rangeLabel}</div>
          </div>
          <div>
            <div className="kpi-eyebrow">Median Co. PAT CAGR</div>
            <div className={`kpi-value text-2xl mt-1 ${medianPatCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(medianPatCagr, 1)}%</div>
            <div className="text-[11px] text-gray-500 mt-0.5">constituent median</div>
          </div>
        </div>
      </div>

      {/* ─── Range Selector ──────────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <div>
            <div className="kpi-eyebrow">Analysis Window</div>
            <div className="text-lg font-semibold text-white mt-1">
              {startFy} <span className="text-gray-500 mx-2">→</span> {endFy}
              <span className="ml-3 text-sm font-normal text-[color:var(--color-gold-light)]">{rangePeriods}Y lookback</span>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 flex items-center gap-2">
            <Info size={13} /> CAGR and history charts update live with the window.
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
              <span>Start FY</span>
              <span className="text-[color:var(--color-gold-light)] font-semibold tabular-nums">{startFy}</span>
            </div>
            <input
              type="range" min={0} max={totalYears - 2} value={rangeStart}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRangeStart(v);
                if (v >= rangeEnd) setRangeEnd(Math.min(totalYears - 1, v + 1));
              }}
              className="range-slider w-full"
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
              <span>End FY</span>
              <span className="text-[color:var(--color-gold-light)] font-semibold tabular-nums">{endFy}</span>
            </div>
            <input
              type="range" min={1} max={totalYears - 1} value={rangeEnd}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRangeEnd(v);
                if (v <= rangeStart) setRangeStart(Math.max(0, v - 1));
              }}
              className="range-slider w-full"
            />
          </div>
        </div>
      </div>

      {/* ─── Universe Performance Chart ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="premium-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Universe Earnings Power</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Aggregate topline & net profit across {filteredCompanies.length} constituents</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#3b82f6' }} />Topline</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#d4a843' }} />Net Profit</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={indexSeries}>
              <defs>
                <linearGradient id="gradTopline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4a843" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#d4a843" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="fy" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine yAxisId="left" x={startFy} stroke="#d4a843" strokeDasharray="3 3" opacity={0.6} />
              <ReferenceLine yAxisId="left" x={endFy} stroke="#d4a843" strokeDasharray="3 3" opacity={0.6} />
              <Area yAxisId="left" type="monotone" dataKey="toplineCr" name="Topline" stroke="#3b82f6" strokeWidth={2} fill="url(#gradTopline)" />
              <Area yAxisId="right" type="monotone" dataKey="netProfitCr" name="Net Profit" stroke="#d4a843" strokeWidth={2} fill="url(#gradProfit)" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
            <div>
              <div className="kpi-eyebrow">Topline CAGR</div>
              <div className={`text-lg font-bold mt-1 ${universeToplineCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(universeToplineCagr, 1)}%</div>
            </div>
            <div>
              <div className="kpi-eyebrow">PAT CAGR</div>
              <div className={`text-lg font-bold mt-1 ${universeProfitCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(universeProfitCagr, 1)}%</div>
            </div>
            <div>
              <div className="kpi-eyebrow">Avg ROE (last FY)</div>
              <div className="text-lg font-bold text-white mt-1 tabular-nums">{fmtN(averageRoe, 1)}%</div>
            </div>
          </div>
        </div>

        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Sector Composition</h3>
          <p className="text-[11px] text-gray-500 mb-4">Weight distribution across the filtered set</p>
          <div className="space-y-2">
            {sectorSummary.map((sector, i) => {
              const pct = sector.weightPct;
              const topCompany = filteredCompanies
                .filter(c => c.sector === sector.sector)
                .sort((a, b) => b.weightPct - a.weightPct)[0];
              return (
                <div key={sector.sector} className="sector-chip">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-gray-500 w-4">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-sm font-semibold text-gray-100">{sector.sector}</span>
                    </div>
                    <span className="text-sm font-bold text-[color:var(--color-gold-light)] tabular-nums">{fmtN(pct, 1)}%</span>
                  </div>
                  <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct * 2.5)}%`, background: `linear-gradient(90deg, ${topCompany?.color ?? '#3b82f6'}, ${topCompany?.color ?? '#3b82f6'}aa)` }} />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">{sector.count} {sector.count === 1 ? 'company' : 'companies'} · {fmt(sector.marketCapCr)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Weights & Scatter ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-1">Top Weights</h3>
          <p className="text-[11px] text-gray-500 mb-4">Index weight leaderboard</p>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={topWeightData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }} width={80} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="weightPct" name="Weight %" radius={[0, 4, 4, 0]}>
                {topWeightData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">Growth × Valuation Map</h3>
            <span className="text-[10px] text-gray-500">Bubble = log(market cap)</span>
          </div>
          <p className="text-[11px] text-gray-500 mb-4">X: {rangePeriods}Y PAT CAGR · Y: P/E or P/B multiple</p>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
              <XAxis type="number" dataKey="x" name="PAT CAGR" unit="%" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis type="number" dataKey="y" name="Multiple" unit="x" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <ZAxis type="number" dataKey="z" range={[40, 400]} />
              <ReferenceLine x={medianPatCagr} stroke="#d4a843" strokeDasharray="3 3" opacity={0.5} label={{ value: 'Median CAGR', fill: '#d4a843', fontSize: 9, position: 'insideTopRight' }} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }: any) => {
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
                }}
              />
              <Scatter data={scatterData}>
                {scatterData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} fillOpacity={0.75} stroke={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Constituent Table ──────────────────────────────────────── */}
      <div className="premium-card overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Constituent Ledger</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Sortable · CAGR computed across {rangeLabel} · Click any row for drill-down</p>
          </div>
          <div className="text-[11px] text-gray-400 flex items-center gap-2">
            <span className="pill pill-muted">{sortedRows.length} rows</span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[540px]">
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
                <th className="text-right">ROCE</th>
                <th className="text-right sort-header" onClick={() => toggleSort('valuation')}>Valuation{sortCaret('valuation')}</th>
                <th className="text-right">Div Yield</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(({ company, latest, toplineCagr, profitCagr, valuationLabel }) => {
                const isSelected = company.id === selectedCompany?.id;
                return (
                  <tr key={company.id} onClick={() => setSelectedId(company.id)} className={`cursor-pointer ${isSelected ? 'selected' : ''}`}>
                    <td className="sticky left-0 z-10" style={{ background: isSelected ? 'rgba(28, 41, 64, 0.98)' : 'rgba(15, 23, 41, 0.96)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-8 rounded-sm shrink-0" style={{ backgroundColor: company.color }} />
                        <div>
                          <div className="text-gray-100 font-semibold text-[13px]">{company.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono tracking-wider">{company.ticker}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-gray-300 text-[11px]">{company.sector}</td>
                    <td className="text-center">
                      <span className={`pill ${company.reportingType === 'financial' ? '' : 'pill-muted'}`}>
                        {company.reportingType === 'financial' ? 'BFSI' : 'Corp'}
                      </span>
                    </td>
                    <td className="text-right text-gray-200 font-semibold">{fmtN(company.weightPct, 1)}%</td>
                    <td className="text-right text-gray-300">{fmt(company.marketCapCr)}</td>
                    <td className="text-right text-gray-300">{fmt(latest.toplineCr)}</td>
                    <td className={`text-right font-semibold ${toplineCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(toplineCagr, 1)}%</td>
                    <td className={`text-right font-semibold ${profitCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(profitCagr, 1)}%</td>
                    <td className="text-right text-gray-200">{fmtN(latest.roePct, 1)}%</td>
                    <td className="text-right text-gray-300">{latest.rocePct !== undefined ? `${fmtN(latest.rocePct, 1)}%` : '—'}</td>
                    <td className="text-right text-[color:var(--color-gold-light)] font-semibold">{valuationLabel} {fmtN(company.valuationMultiple, 1)}x</td>
                    <td className="text-right text-gray-300">{fmtN(company.dividendYieldPct, 1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Drill-down ──────────────────────────────────────── */}
      {selectedCompany && selectedLatest && selectedEnd && (
        <div className="premium-card p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-16 rounded" style={{ backgroundColor: selectedCompany.color }} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="pill pill-muted font-mono">{selectedCompany.ticker}</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">{selectedCompany.sector}</span>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{selectedCompany.name}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  CMP ₹{selectedCompany.cmp.toLocaleString()} · {selectedCompany.reportingType === 'financial' ? 'Financial reporting profile' : 'Operating company profile'} · {getPrimaryValuationLabel(selectedCompany)} {fmtN(selectedCompany.valuationMultiple, 1)}x
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="kpi-eyebrow">Drill-down</div>
              <div className="text-[11px] text-gray-400 mt-1">Select another row to refresh</div>
            </div>
          </div>

          <div className="hairline-divider" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="kpi-eyebrow">Market Cap</div>
              <div className="kpi-value text-xl text-white mt-1">{fmt(selectedCompany.marketCapCr)}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">CMP ₹{selectedCompany.cmp}</div>
            </div>
            <div>
              <div className="kpi-eyebrow">Index Weight</div>
              <div className="kpi-value text-xl text-[color:var(--color-gold-light)] mt-1">{fmtN(selectedCompany.weightPct, 1)}%</div>
              <div className="text-[11px] text-gray-500 mt-0.5">of Sensex</div>
            </div>
            <div>
              <div className="kpi-eyebrow">{rangePeriods}Y PAT CAGR</div>
              <div className={`kpi-value text-xl mt-1 ${selectedPatCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(selectedPatCagr, 1)}%</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{selectedFirst?.fy} → {selectedEnd.fy}</div>
            </div>
            <div>
              <div className="kpi-eyebrow">Latest ROE</div>
              <div className="kpi-value text-xl text-white mt-1">{fmtN(selectedLatest.roePct, 1)}%</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Div yield {fmtN(selectedCompany.dividendYieldPct, 1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="glass-card p-5 lg:col-span-3">
              <h4 className="text-sm font-semibold text-white mb-1">Topline vs Net Profit</h4>
              <p className="text-[11px] text-gray-500 mb-4">{selectedFirst?.fy} – {selectedEnd.fy}</p>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={selectedHistoryChart}>
                  <defs>
                    <linearGradient id="coGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={selectedCompany.color} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={selectedCompany.color} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
                  <XAxis dataKey="fy" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
                  <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#d4a843', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area yAxisId="left" type="monotone" dataKey="Topline" stroke={selectedCompany.color} strokeWidth={2} fill="url(#coGrad)" />
                  <Line yAxisId="right" type="monotone" dataKey="Net Profit" stroke="#d4a843" strokeWidth={2.5} dot={{ r: 3, fill: '#d4a843' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card lg:col-span-2 overflow-hidden">
              <div className="p-5 pb-3">
                <h4 className="text-sm font-semibold text-white">Annual History</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Full FY2011–FY2024 view</p>
              </div>
              <div className="overflow-x-auto max-h-[340px]">
                <table className="w-full sensex-table tabular-nums">
                  <thead>
                    <tr>
                      <th className="text-left">FY</th>
                      <th className="text-right">Topline</th>
                      <th className="text-right">PAT</th>
                      <th className="text-right">ROE</th>
                      <th className="text-right">Op Mgn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCompany.history.map((item, i) => {
                      const inRange = i >= rangeStart && i <= rangeEnd;
                      return (
                        <tr key={item.fy} className={inRange ? '' : 'opacity-40'}>
                          <td className="text-gray-200 font-semibold">{item.fy}</td>
                          <td className="text-right text-gray-300">{fmt(item.toplineCr)}</td>
                          <td className="text-right text-[color:var(--color-gold-light)]">{fmt(item.netProfitCr)}</td>
                          <td className="text-right text-gray-300">{fmtN(item.roePct, 1)}%</td>
                          <td className="text-right text-gray-300">{item.operatingMarginPct !== undefined ? `${fmtN(item.operatingMarginPct, 1)}%` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
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
      case 'projections': return <Projections assumptions={assumptions} setAssumptions={setAssumptions} />;
      case 'playbook': return <Playbook />;
      case 'global': return <GlobalCompare />;
      case 'sensex': return <SensexUniverse />;
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
