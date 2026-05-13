/**
 * ROCE Distribution Chart — histogram of ROCE across the universe, color-coded by sector.
 * Useful for quickly spotting quality clusters and outliers.
 */
import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { SensexConstituent } from '@/data/sensexData';
import { ChartTooltip } from '@/components/itc/shared';

interface ROCEDistributionProps {
  companies: SensexConstituent[];
  height?: number;
}

const BUCKET_RANGES = [
  { label: '< 0%', min: -Infinity, max: 0 },
  { label: '0–10%', min: 0, max: 10 },
  { label: '10–15%', min: 10, max: 15 },
  { label: '15–20%', min: 15, max: 20 },
  { label: '20–25%', min: 20, max: 25 },
  { label: '25–30%', min: 25, max: 30 },
  { label: '> 30%', min: 30, max: Infinity },
];

const BUCKET_COLORS: Record<string, string> = {
  '< 0%': '#ef4444',
  '0–10%': '#f59e0b',
  '10–15%': '#84cc16',
  '15–20%': '#22c55e',
  '20–25%': '#10b981',
  '25–30%': '#06b6d4',
  '> 30%': '#3b82f6',
};

export function ROCEDistribution({ companies, height: _height = 280 }: ROCEDistributionProps) {
  const bucketData = useMemo(() => {
    const roces = companies
      .map(c => c.history[c.history.length - 1]?.rocePct ?? c.history[0]?.rocePct ?? null)
      .filter((v): v is number => v !== null);

    if (roces.length === 0) {
      const roeProxies = companies
        .map(c => c.history[c.history.length - 1]?.roePct * 0.85)
        .filter(v => v !== null && isFinite(v));
      return BUCKET_RANGES.map(br => {
        const count = roeProxies.filter(r => r >= br.min && r < br.max).length;
        return { name: br.label, count, color: BUCKET_COLORS[br.label] ?? '#60a5fa' };
      });
    }

    return BUCKET_RANGES.map(br => {
      const count = roces.filter(r => r >= br.min && r < br.max).length;
      return { name: br.label, count, color: BUCKET_COLORS[br.label] ?? '#60a5fa' };
    });
  }, [companies]);

  const avgROCE = useMemo(() => {
    const roces = companies
      .map(c => c.history[c.history.length - 1]?.rocePct ?? c.history[0]?.rocePct ?? null)
      .filter((v): v is number => v !== null);
    if (roces.length === 0) return 0;
    return roces.reduce((s, v) => s + v, 0) / roces.length;
  }, [companies]);

  const totalCompanyCount = companies.length;
  const profitableCount = bucketData.reduce((s, b) => s + (b.name !== '< 0%' ? b.count : 0), 0);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-white">ROCE Distribution</span>
        </div>
        <div className="flex gap-4 text-[10px]">
          <span className="text-gray-400">Avg: <span className="text-white font-mono">{avgROCE.toFixed(1)}%</span></span>
          <span className="text-gray-400">Profitable: <span className="text-emerald-400">{profitableCount}/{totalCompanyCount}</span></span>
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bucketData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={{ stroke: '#374151' }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={{ stroke: '#374151' }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Companies" radius={[4, 4, 0, 0]} barSize={40}>
              {bucketData.map((entry, index) => (
                <rect key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
