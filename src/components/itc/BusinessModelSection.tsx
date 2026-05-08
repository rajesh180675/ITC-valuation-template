import { PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Grid3x3 } from 'lucide-react';
import { businessModelCanvas, moatScores } from '@/data/itcData';
import type { BusinessModelCanvas } from '@/data/itcData';
import { SectionHeader } from './shared';

const canvas: BusinessModelCanvas = businessModelCanvas;

const revenuePieData = canvas.revenueStreams.map(s => ({ name: s.name, value: s.share, color: s.color }));

const radarData = moatScores.map(m => ({
  dimension: m.dimension,
  ITC: m.itc,
  HUL: m.hul,
  Nestle: m.nestle,
}));

const moatBarData = moatScores.map(m => ({
  dimension: m.dimension,
  ITC: m.itc,
  HUL: m.hul,
  Nestle: m.nestle,
}));

export function BusinessModelSection() {
  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Business Model Canvas" subtitle="ITC's strategic architecture — value propositions, moats, and competitive positioning" icon={<Grid3x3 size={22} />} />

      {/* 3x3 Business Model Canvas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Top Row */}
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Key Partners</h4>
          <ul className="space-y-1">
            {canvas.keyPartners.map((item, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">&#8226;</span>{item}</li>
            ))}
          </ul>
        </div>
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Key Activities</h4>
          <ul className="space-y-1">
            {canvas.keyActivities.map((item, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">&#8226;</span>{item}</li>
            ))}
          </ul>
        </div>
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Value Propositions</h4>
          <ul className="space-y-1">
            {canvas.valuePropositions.map((item, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5"><span className="text-yellow-400 mt-0.5">&#8226;</span>{item}</li>
            ))}
          </ul>
        </div>

        {/* Middle Row */}
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Key Resources</h4>
          <ul className="space-y-1">
            {canvas.keyResources.map((item, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">&#8226;</span>{item}</li>
            ))}
          </ul>
        </div>
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Revenue Streams</h4>
          <div className="mb-2">
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={revenuePieData} cx="50%" cy="50%" outerRadius={50} innerRadius={25} dataKey="value">
                  {revenuePieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: any) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-0.5">
            {canvas.revenueStreams.map((item, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                {item.name} ({item.share}%)
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Customer Segments</h4>
          <ul className="space-y-1">
            {canvas.customerSegments.map((item, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5"><span className="text-cyan-400 mt-0.5">&#8226;</span>{item}</li>
            ))}
          </ul>
        </div>

        {/* Bottom Row */}
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Cost Structure</h4>
          <div className="space-y-1.5">
            {canvas.costStructure.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-28 flex-shrink-0">{item.name}</span>
                <div className="flex-1 bg-gray-700/40 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${item.share}%` }} />
                </div>
                <span className="text-xs text-gray-300 w-8 text-right">{item.share}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Channels</h4>
          <ul className="space-y-1">
            {canvas.channels.map((item, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">&#8226;</span>{item}</li>
            ))}
          </ul>
        </div>
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Competitive Moats</h4>
          <ul className="space-y-1">
            {canvas.competitiveMoats.map((item, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5"><span className="text-red-400 mt-0.5">&#8226;</span>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Chart Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Revenue Mix Pie */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenue Mix</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={revenuePieData} cx="50%" cy="50%" outerRadius={110} innerRadius={55} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {revenuePieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(value: any) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Competitive Moat Radar */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Competitive Moat Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#1c2940" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 9 }} domain={[0, 100]} />
              <Radar name="ITC" dataKey="ITC" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              <Radar name="HUL" dataKey="HUL" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={1.5} />
              <Radar name="Nestle" dataKey="Nestle" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={1.5} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: ITC vs Peers Moat Bar */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">ITC vs Peers — Moat Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={moatBarData} layout="vertical" margin={{ left: 40, right: 20, top: 10, bottom: 10 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis type="category" dataKey="dimension" tick={{ fill: '#94a3b8', fontSize: 10 }} width={100} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ITC" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="HUL" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="Nestle" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}