/**
 * ROCE Trend Chart for DrillDown and Nifty universe sections.
 * Shows ROCE trajectory for selected company with 5-year average line.
 */
import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { SensexConstituent } from '@/data/sensexData';
import { ChartTooltip } from '@/components/itc/shared';

interface ROCEChartProps {
  company: SensexConstituent;
  height?: number;
}

export function ROCEChart({ company, height: _height = 220 }: ROCEChartProps) {
  const chartData = useMemo(() => {
    const rocePoints = company.history
      .filter(h => h.rocePct !== undefined && h.rocePct !== null)
      .map(h => ({
        fy: h.fy,
        roce: h.rocePct as number,
      }));
    if (rocePoints.length === 0) {
      return company.history.map(h => ({
        fy: h.fy,
        roce: Math.round(h.roePct * 0.85 * 10) / 10,
        isProxy: true,
      }));
    }
    return rocePoints;
  }, [company]);

  const avgROCE = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((s, d) => s + d.roce, 0) / chartData.length;
  }, [chartData]);

  const latestROCE = chartData.length > 0 ? chartData[chartData.length - 1]?.roce ?? 0 : 0;
  const trendUp = chartData.length >= 2 && chartData[chartData.length - 1].roce > chartData[0].roce;

  if (chartData.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-white">ROCE Trend</span>
        </div>
        <p className="text-gray-500 text-xs">No ROCE data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className={trendUp ? 'text-emerald-400' : 'text-rose-400'} />
          <span className="text-xs font-semibold text-white">ROCE Trend</span>
        </div>
        <div className="flex gap-4 text-[10px]">
          <span className="text-gray-400">Avg: <span className="text-white font-mono">{avgROCE.toFixed(1)}%</span></span>
          <span className="text-gray-400">Latest: <span className={`font-mono ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>{latestROCE.toFixed(1)}%</span></span>
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="fy" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={{ stroke: '#374151' }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={{ stroke: '#374151' }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={avgROCE} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Avg ${avgROCE.toFixed(0)}%`, position: 'right', fill: '#f59e0b', fontSize: 10 }} />
            <Line type="monotone" dataKey="roce" name="ROCE" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
