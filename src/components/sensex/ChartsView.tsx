import { TrendingUp, DollarSign, BarChart3, Percent } from 'lucide-react';
import {
  Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart, Legend,
} from 'recharts';
import { ChartPanel } from './ChartPanel';
import { safePct, safeSub } from './utils';

export function ChartsView({ kpiData }: { kpiData: any[] }) {
  if (kpiData.length < 2) return <div className="glass-card p-5 text-gray-400">Need at least 2 years of data for charts.</div>;

  const marginData = kpiData.map((d: any) => ({
    fy: d.fy,
    'PBT %': safePct(d.pbt, d.rev),
    'PAT %': safePct(d.pat, d.rev),
    'Emp Cost %': safePct(d.empCost, d.rev),
    'Depr %': safePct(d.depr, d.rev),
  }));

  const cashConvData = kpiData.map((d: any) => ({
    fy: d.fy, CFO: d.cfo ?? null, PAT: d.pat ?? null,
    'CFO/PAT %': safePct(d.cfo, d.pat),
  }));

  const yoyData: any[] = [];
  for (let i = 1; i < kpiData.length; i++) {
    const prev = kpiData[i - 1];
    const curr = kpiData[i];
    const revDiff = safeSub(curr.rev, prev.rev);
    const patDiff = safeSub(curr.pat, prev.pat);
    yoyData.push({
      fy: curr.fy,
      'Rev Growth': safePct(revDiff, prev.rev),
      'PAT Growth': safePct(patDiff, prev.pat),
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartPanel title="Revenue & Profit Trend" icon={<TrendingUp size={14} className="text-emerald-400" />}>
        <ComposedChart data={kpiData}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="rev" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Line dataKey="pat" name="PAT" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ChartPanel>

      <ChartPanel title="Margin Analysis (% of Revenue)" icon={<Percent size={14} className="text-emerald-400" />}>
        <ComposedChart data={marginData}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[-5, 45]} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="PBT %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line dataKey="PAT %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line dataKey="Emp Cost %" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} connectNulls />
          <Line dataKey="Depr %" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} connectNulls />
        </ComposedChart>
      </ChartPanel>

      <ChartPanel title="CFO vs PAT (Cash Conversion)" icon={<DollarSign size={14} className="text-emerald-400" />}>
        <ComposedChart data={cashConvData}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis yAxisId="L" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis yAxisId="R" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[0, 150]} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="L" dataKey="CFO" name="CFO" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="L" dataKey="PAT" name="PAT" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Line yAxisId="R" dataKey="CFO/PAT %" name="Cash Conv %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ChartPanel>

      <ChartPanel title="YoY Growth (%)" icon={<BarChart3 size={14} className="text-emerald-400" />}>
        <ComposedChart data={yoyData}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[-10, 30]} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Rev Growth" name="Revenue Growth" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Line dataKey="PAT Growth" name="PAT Growth" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ChartPanel>
    </div>
  );
}
