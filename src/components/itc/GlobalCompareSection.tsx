import {
  BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Legend,
} from 'recharts';
import { AlertTriangle, Globe, Info } from 'lucide-react';
import { globalTobaccoComparison } from '@/data/itcData';
import { ChartTooltip, SectionHeader } from './shared';

export function GlobalCompareSection() {
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
