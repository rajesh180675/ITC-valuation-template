import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { ChartTooltip } from '@/components/itc/shared';

export function TopWeightsChart({ data }: { data: { name: string; weightPct: number; color: string }[] }) {
  return (
    <div className="glass-card p-5 lg:col-span-2">
      <h3 className="text-sm font-semibold text-white mb-1">Top Weights</h3>
      <p className="text-[11px] text-gray-500 mb-4">Index weight leaderboard</p>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
          <YAxis dataKey="name" type="category" tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }} width={80} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Bar dataKey="weightPct" name="Weight %" radius={[0, 4, 4, 0]} isAnimationActive={true}>
            <LabelList dataKey="weightPct" position="right" formatter={(v: any) => `${Number(v).toFixed(1)}%`} style={{ fill: '#cbd5e1', fontSize: 10 }} />
            {data.map(e => <Cell key={e.name} fill={e.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
