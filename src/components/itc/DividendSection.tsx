import { useMemo } from 'react';
import {
  ComposedChart, BarChart, LineChart,
  Area, Bar, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, CartesianGrid,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { dividendHistory } from '@/data/itcData';
import { calculateDividendMetrics } from '@/utils/itcModel';
import { SectionHeader, MetricCard, ChartTooltip, fmtN, pct } from './shared';

const CURRENT_PRICE = 442;

export function DividendSection() {
  const metrics = useMemo(() => calculateDividendMetrics(dividendHistory, CURRENT_PRICE), []);

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader
        title="Dividend Analysis"
        subtitle="Dividend history, sustainability, and yield trajectory across 14 years (FY2012-FY2025)"
        icon={<TrendingUp size={22} />}
      />

      {/* ── Metric Cards Row 1 ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="5Y DPS CAGR"
          value={`${pct(metrics.fiveYearDpsCagr)}`}
          subtitle="Compound dividend growth"
          color="green"
        />
        <MetricCard
          title="10Y DPS CAGR"
          value={`${pct(metrics.tenYearDpsCagr)}`}
          subtitle="Long-term dividend growth"
          color="blue"
        />
        <MetricCard
          title="Avg Payout Ratio"
          value={`${fmtN(metrics.avgPayoutRatio)}%`}
          subtitle="Historical average"
          color="purple"
        />
        <MetricCard
          title="Sustainability Score"
          value={`${fmtN(metrics.dividendSustainabilityScore, 0)}`}
          subtitle="Out of 100"
          color={metrics.dividendSustainabilityScore >= 70 ? 'green' : 'gold'}
        />
      </div>

      {/* ── Metric Cards Row 2 ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Current Yield"
          value={`${fmtN(metrics.currentYield)}%`}
          subtitle="Latest financial year"
          color="green"
        />
        <MetricCard
          title="Yield on Cost"
          value={`${fmtN(metrics.yieldOnCost)}%`}
          subtitle="10Y historical basis"
          color="gold"
        />
        <MetricCard
          title="DPS Growth Streak"
          value={`${metrics.dpsGrowthYears} yrs`}
          subtitle="Consecutive years"
          color="blue"
        />
        <MetricCard
          title="Special Dividends"
          value={`${metrics.specialDivCount}`}
          subtitle="Years with special payout"
          color="gold"
        />
      </div>

      {/* ── Panel 1: DPS vs EPS with Payout Ratio Overlay ──────────────────── */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">DPS vs EPS with Payout Ratio Overlay</h3>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={dividendHistory} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={(v: number) => `₹${v}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 120]}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#d1d5db' }} />
            <Bar yAxisId="left" dataKey="eps" fill="#3b82f6" name="EPS" barSize={18} />
            <Bar yAxisId="left" dataKey="dps" fill="#10b981" name="DPS" barSize={18} />
            <Line yAxisId="left" dataKey="specialDiv" stroke="#f59e0b" name="Special Div" dot={{ r: 3 }} />
            <Area
              yAxisId="right"
              dataKey="payoutRatio"
              fill="#8b5cf6"
              fillOpacity={0.2}
              stroke="#8b5cf6"
              name="Payout %"
            />
            <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '80% Threshold', position: 'right', fill: '#ef4444', fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Panel 2: Total Shareholder Return Decomposition ──────────────────── */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Total Shareholder Return Decomposition</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dividendHistory} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#d1d5db' }} />
            <Bar dataKey="divYield" stackId="return" fill="#10b981" name="Div Yield %" />
            <Bar dataKey="priceApprec" stackId="return" fill="#3b82f6" name="Price Apprec %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Panel 3: Payout Ratio Trend ─────────────────────────────────────── */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Payout Ratio Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dividendHistory} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#d1d5db' }} />
            <Line type="monotone" dataKey="payoutRatio" stroke="#8b5cf6" name="Payout Ratio %" strokeWidth={2} dot={{ r: 3 }} />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Sustainable Threshold', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}