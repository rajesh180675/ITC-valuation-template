import { BarChart, Bar, Cell, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { BookOpen, Target } from 'lucide-react';
import { budgetCheatSheet, taxEvents } from '@/data/itcData';
import { ChartTooltip, SectionHeader } from './shared';

export function PlaybookSection() {
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
