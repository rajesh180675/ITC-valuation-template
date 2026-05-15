import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

export function TrendChart({ kpiData }: { kpiData: any[] }) {
  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <TrendingUp size={14} className="text-emerald-400" /> Revenue & PAT Trend
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={kpiData}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="rev" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Line dataKey="pat" name="PAT" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
