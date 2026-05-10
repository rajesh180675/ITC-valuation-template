import { Area, ComposedChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts';
import { ChartTooltip, fmtN } from '@/components/itc/shared';
import { SmallStat } from './SmallStat';

export function UniverseEarningsPower(props: {
  indexSeries: { fy: string; toplineCr: number; netProfitCr: number }[];
  startFy: string; endFy: string;
  filteredCount: number;
  universeToplineCagr: number; universeProfitCagr: number; averageRoe: number;
}) {
  const { indexSeries, startFy, endFy, filteredCount, universeToplineCagr, universeProfitCagr, averageRoe } = props;
  return (
    <div className="premium-card p-5 xl:col-span-2">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Universe Earnings Power</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Aggregate topline &amp; net profit across {filteredCount} constituents</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={indexSeries}>
          <defs>
            <linearGradient id="gradTopline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4a843" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#d4a843" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
          <XAxis dataKey="fy" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
          <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <ReferenceLine yAxisId="left" x={startFy} stroke="#d4a843" strokeDasharray="3 3" opacity={0.6} />
          <ReferenceLine yAxisId="left" x={endFy} stroke="#d4a843" strokeDasharray="3 3" opacity={0.6} />
          <Area yAxisId="left" type="monotone" dataKey="toplineCr" name="Topline" stroke="#3b82f6" strokeWidth={2} fill="url(#gradTopline)" isAnimationActive={true} />
          <Area yAxisId="right" type="monotone" dataKey="netProfitCr" name="Net Profit" stroke="#d4a843" strokeWidth={2} fill="url(#gradProfit)" isAnimationActive={true} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
        <SmallStat label="Topline CAGR" value={`${fmtN(universeToplineCagr, 1)}%`} positive={universeToplineCagr >= 0} />
        <SmallStat label="PAT CAGR" value={`${fmtN(universeProfitCagr, 1)}%`} positive={universeProfitCagr >= 0} />
        <SmallStat label="Avg ROE (last FY)" value={`${fmtN(averageRoe, 1)}%`} />
      </div>
    </div>
  );
}
