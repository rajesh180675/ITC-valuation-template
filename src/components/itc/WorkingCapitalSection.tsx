import { LineChart, Line, BarChart, Bar, AreaChart, Area, ReferenceLine, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';
import { workingCapitalData } from '@/data/itcData';
import type { WorkingCapitalEntry } from '@/data/itcData';
import { calculateWorkingCapitalMetrics } from '@/utils/itcModel';
import { SectionHeader, MetricCard, ChartTooltip, fmtN } from './shared';

export function WorkingCapitalSection() {
  const metrics = calculateWorkingCapitalMetrics(workingCapitalData);
  const latest = workingCapitalData[workingCapitalData.length - 1];

  const cccData: (WorkingCapitalEntry & { 'Inventory Days': number; 'Receivable Days': number; 'Payable Days': number; CCC: number })[] = workingCapitalData.map(d => ({
    ...d,
    'Inventory Days': d.inventoryDays,
    'Receivable Days': d.receivableDays,
    'Payable Days': d.payableDays,
    CCC: d.cashConversionCycle,
  }));

  const wcPctData = workingCapitalData.map(d => ({
    year: d.year,
    'WC % Revenue': d.workingCapitalPctRevenue,
  }));

  const avgWC = metrics.workingCapitalIntensity;

  const cccAreaData = workingCapitalData.map(d => ({
    year: d.year,
    CCC: d.cashConversionCycle,
  }));

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Working Capital Analysis" subtitle="Cash conversion cycle, inventory & receivable days, and working capital intensity" icon={<Clock size={22} />} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Avg CCC" value={`${fmtN(metrics.avgCCC)} days`} subtitle={`${metrics.cccTrend.length}y trend`} color="red" />
        <MetricCard title="Inventory Days" value={`${fmtN(latest.inventoryDays)} days`} subtitle="Latest" color="blue" />
        <MetricCard title="Receivable Days" value={`${fmtN(latest.receivableDays)} days`} subtitle="Latest" color="green" />
        <MetricCard title="Payable Days" value={`${fmtN(latest.payableDays)} days`} subtitle="Latest" color="gold" />
        <MetricCard title="Efficiency Score" value={`${fmtN(metrics.efficiencyScore, 0)}/100`} subtitle="Higher is better" color="purple" />
        <MetricCard title="WC Intensity" value={`${fmtN(metrics.workingCapitalIntensity)}%`} subtitle="% of revenue" color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel 1: CCC Components Trend */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">CCC Components Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cccData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="Inventory Days" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Receivable Days" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Payable Days" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="CCC" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Panel 2: Working Capital % of Revenue */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Working Capital % of Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={wcPctData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={avgWC} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: `Avg ${fmtN(avgWC)}%`, fill: '#94a3b8', fontSize: 11 }} />
              <Bar dataKey="WC % Revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Panel 3: Cash Conversion Cycle Trend */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Cash Conversion Cycle Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cccAreaData}>
              <defs>
                <linearGradient id="gCCC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="CCC" stroke="#ef4444" fill="url(#gCCC)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}