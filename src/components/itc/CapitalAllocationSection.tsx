import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Area, Line, ReferenceLine, CartesianGrid,
} from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { Scale } from 'lucide-react';
import { historicalData, capitalAllocationData, type CapitalAllocationEntry, sharesOutstanding } from '@/data/itcData';
import { calculateCapitalAllocationMetrics, type CapitalAllocationMetrics } from '@/utils/itcModel';
import { SectionHeader, MetricCard, ChartTooltip, fmtN } from './shared';

const ALLOCATION_COLORS = {
  capex: '#3b82f6',
  dividends: '#10b981',
  buybacks: '#f59e0b',
  acquisitions: '#8b5cf6',
  debtRepayment: '#ef4444',
};

export function CapitalAllocationSection() {
  // Compute metrics
  const fcfs = historicalData.map(d => d.freeCashFlow);
  const revenues = historicalData.map(d => d.revenue);
  const metrics: CapitalAllocationMetrics = calculateCapitalAllocationMetrics(
    capitalAllocationData,
    fcfs,
    revenues,
    sharesOutstanding,
    420,
  );

  // Panel 1: Stacked bar data
  const stackedBarData = capitalAllocationData.map(d => ({
    year: d.year,
    Capex: d.capex,
    Dividends: d.dividendsPaid,
    Buybacks: d.buybacks,
    Acquisitions: d.acquisitions,
    'Debt Repayment': d.debtRepayment,
  }));

  // Panel 2: FCF vs Total Allocated
  const fcfVsAllocatedData = capitalAllocationData.map((d, i) => ({
    year: d.year,
    'Free Cash Flow': i < fcfs.length ? fcfs[i] : 0,
    'Total Allocated': d.capex + d.dividendsPaid + d.buybacks + d.acquisitions + d.debtRepayment,
  }));

  // Panel 3: Current year allocation mix (latest year)
  const latestAlloc: CapitalAllocationEntry = capitalAllocationData[capitalAllocationData.length - 1];
  const pieData = [
    { name: 'Capex', value: latestAlloc.capex, color: ALLOCATION_COLORS.capex },
    { name: 'Dividends', value: latestAlloc.dividendsPaid, color: ALLOCATION_COLORS.dividends },
    { name: 'Buybacks', value: latestAlloc.buybacks, color: ALLOCATION_COLORS.buybacks },
    { name: 'Acquisitions', value: latestAlloc.acquisitions, color: ALLOCATION_COLORS.acquisitions },
    { name: 'Debt Repayment', value: latestAlloc.debtRepayment, color: ALLOCATION_COLORS.debtRepayment },
  ].filter(d => d.value > 0);

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader
        title="Capital Allocation"
        subtitle="How ITC deploys its free cash flow — capex, dividends, buybacks, acquisitions & deleveraging"
        icon={<Scale size={22} />}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Avg Capex/Revenue"
          value={`${fmtN(metrics.avgCapexRatio)}%`}
          subtitle="Capex intensity"
          color="blue"
        />
        <MetricCard
          title="Dividend Payout Share"
          value={`${fmtN(metrics.avgDividendPayoutRatio)}%`}
          subtitle="Of total allocated"
          color="green"
        />
        <MetricCard
          title="Buyback Yield"
          value={`${fmtN(metrics.avgBuybackYield)}%`}
          subtitle="Avg annual yield"
          color="gold"
        />
        <MetricCard
          title="FCF Yield"
          value={`${fmtN(metrics.fcfYield)}%`}
          subtitle="Latest year"
          color="purple"
        />
        <MetricCard
          title="Dividend Coverage"
          value={`${fmtN(metrics.dividendCoverageRatio)}x`}
          subtitle="FCF / Dividends"
          color="green"
        />
        <MetricCard
          title="Capex Intensity Score"
          value={`${metrics.capexIntensityScore}`}
          subtitle="0-100 scale"
          color="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel 1: Capital Allocation Stacked Bar */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Capital Allocation by Year</h3>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={stackedBarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Capex" stackId="alloc" fill={ALLOCATION_COLORS.capex} />
              <Bar dataKey="Dividends" stackId="alloc" fill={ALLOCATION_COLORS.dividends} />
              <Bar dataKey="Buybacks" stackId="alloc" fill={ALLOCATION_COLORS.buybacks} />
              <Bar dataKey="Acquisitions" stackId="alloc" fill={ALLOCATION_COLORS.acquisitions} />
              <Bar dataKey="Debt Repayment" stackId="alloc" fill={ALLOCATION_COLORS.debtRepayment} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Panel 2: FCF vs Total Allocated */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Free Cash Flow vs Total Allocated</h3>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={fcfVsAllocatedData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="Free Cash Flow" fill="#10b981" fillOpacity={0.3} stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Total Allocated" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Panel 3: Current Year Allocation Mix */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Current Year Allocation Mix (FY{latestAlloc.year})</h3>
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={130}
              innerRadius={60}
              dataKey="value"
              labelLine={true}
              label={({ name, value }: any) => `${name} ${((value / pieTotal) * 100).toFixed(1)}%`}
            >
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default CapitalAllocationSection;