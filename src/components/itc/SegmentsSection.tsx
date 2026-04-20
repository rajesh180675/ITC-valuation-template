import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';
import { Layers } from 'lucide-react';
import { historicalData, segmentDataFY24 } from '@/data/itcData';
import { ChartTooltip, SectionHeader, fmt } from './shared';

export function SegmentsSection() {
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
