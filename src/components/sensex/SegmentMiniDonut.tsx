import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Percent } from 'lucide-react';

export function SegmentMiniDonut({ segData }: { segData: any }) {
  const series = segData?.segment_time_series;
  if (!series) return null;

  const allFys = [...new Set(Object.values(series as Record<string, Record<string, number>>).flatMap(v => Object.keys(v)))].sort();
  if (allFys.length === 0) return null;

  const latestFy = allFys[allFys.length - 1];

  const data = Object.entries(series)
    .filter(([k]) => k.startsWith('revenue|'))
    .map(([k, v]) => ({ name: k.split('|')[1], value: (v as any)[latestFy] || 0 }))
    .filter(d => d.value > 0 && !d.name.toLowerCase().includes('total'))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  const COLORS = ['#10b981', '#34d399', '#f59e0b', '#f97316', '#8b5cf6'];

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Percent size={14} className="text-emerald-400" /> Revenue Mix ({latestFy.replace('FY', "FY '")})
      </h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
