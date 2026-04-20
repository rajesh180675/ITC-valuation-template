import { useMemo, useState } from 'react';
import {
  ComposedChart, ScatterChart, Scatter, Bar, Line,
  CartesianGrid, Tooltip, XAxis, YAxis, ZAxis, ResponsiveContainer,
} from 'recharts';
import { Shield, Zap } from 'lucide-react';
import { historicalData, taxEvents } from '@/data/itcData';
import { MODEL_ASSUMPTIONS, simulateTaxImpact } from '@/utils/itcModel';
import { ChartTooltip, MetricCard, SectionHeader, pct, fmt } from './shared';

export function TaxAnalyzerSection() {
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
  } = taxImpact;

  const passThroughPct = Math.round(MODEL_ASSUMPTIONS.cigarettePassThroughRate * 100);
  const elasticityShort = MODEL_ASSUMPTIONS.cigaretteShortTermElasticity;
  const elasticityLong = MODEL_ASSUMPTIONS.cigaretteLongTermElasticity;
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

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-yellow-400" />
          <h3 className="text-lg font-bold text-white">Tax Hike Simulator</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
