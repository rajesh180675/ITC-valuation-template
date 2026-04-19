import { useMemo, type Dispatch, type SetStateAction } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp, Zap } from 'lucide-react';
import { historicalData, type ProjectionAssumptions } from '@/data/itcData';
import { generateProjections, MODEL_ASSUMPTIONS } from '@/utils/itcModel';
import { ChartTooltip, MetricCard, SectionHeader, fmt, rupee } from './shared';

export function ProjectionsSection({
  assumptions,
  setAssumptions,
}: {
  assumptions: ProjectionAssumptions;
  setAssumptions: Dispatch<SetStateAction<ProjectionAssumptions>>;
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
      'Cig EBIT %': Math.round(
        (d.cigaretteRevenue * d.cigaretteEbitMargin / 100) /
          (d.ebitda / MODEL_ASSUMPTIONS.operatingEbitdaMultiplier) *
          100,
      ),
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="FY2031E Revenue" value={fmt(lastProj.revenue)} subtitle={`CAGR from FY24`} color="blue" />
        <MetricCard title="FY2031E Net Profit" value={fmt(lastProj.netProfit)} subtitle={`EPS: ${rupee(lastProj.eps)}`} color="green" />
        <MetricCard title="Cig Rev Share (FY31E)" value={`${cigRevShareFinal}%`} subtitle={`vs ${Math.round((lastHist.cigaretteRevenue / lastHist.revenue) * 100)}% FY24`} color="gold" />
        <MetricCard title="FMCG Rev Share (FY31E)" value={`${fmcgRevShareFinal}%`} subtitle={`vs ${Math.round((lastHist.fmcgRevenue / lastHist.revenue) * 100)}% FY24`} color="purple" />
      </div>

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
