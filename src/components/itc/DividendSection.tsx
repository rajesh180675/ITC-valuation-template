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
import { useItcDividendHistory, useItcCurrentPrice } from '@/utils/dataFeeds';
import type { ItcDividendHistory } from '@/utils/itcDataSchemas';
import { SectionHeader, MetricCard, ChartTooltip, fmtN, pct } from './shared';

function aggregateLiveDividends(live: ItcDividendHistory | null): Map<string, { dps: number; specialDiv: number; totalDps: number }> {
  if (!live) return new Map();
  const map = new Map<string, { dps: number; specialDiv: number; totalDps: number }>();
  for (const row of live.dividends) {
    const curr = map.get(row.fiscalYear) || { dps: 0, specialDiv: 0, totalDps: 0 };
    if (row.dividendType === 'special') {
      curr.specialDiv += row.amountPerShare;
    } else {
      curr.dps += row.amountPerShare;
    }
    curr.totalDps = curr.dps + curr.specialDiv;
    map.set(row.fiscalYear, curr);
  }
  return map;
}

export function DividendSection() {
  const { data: liveDividendData } = useItcDividendHistory();
  const { price: currentPrice } = useItcCurrentPrice();

  // Merge live dividend data into static entries when available
  const mergedDividendHistory = useMemo(() => {
    const liveMap = aggregateLiveDividends(liveDividendData);
    if (liveMap.size === 0) return dividendHistory;
    return dividendHistory.map(entry => {
      const live = liveMap.get(entry.fy);
      if (live) {
        const totalDps = live.totalDps;
        const payoutRatio = entry.eps > 0 ? (totalDps / entry.eps) * 100 : entry.payoutRatio;
        return {
          ...entry,
          dps: live.dps,
          specialDiv: live.specialDiv,
          totalDps,
          payoutRatio: Math.round(payoutRatio * 10) / 10,
        };
      }
      return entry;
    });
  }, [liveDividendData]);

  const metrics = useMemo(() => calculateDividendMetrics(mergedDividendHistory, currentPrice), [mergedDividendHistory, currentPrice]);

  const avgDps = useMemo(() => mergedDividendHistory.length > 0 ? mergedDividendHistory.reduce((sum, d) => sum + d.dps, 0) / mergedDividendHistory.length : 0, [mergedDividendHistory]);
  const avgDivYield = useMemo(() => mergedDividendHistory.length > 0 ? mergedDividendHistory.reduce((sum, d) => sum + d.divYield, 0) / mergedDividendHistory.length : 0, [mergedDividendHistory]);
  const avgPayoutRatio = useMemo(() => mergedDividendHistory.length > 0 ? mergedDividendHistory.reduce((sum, d) => sum + d.payoutRatio, 0) / mergedDividendHistory.length : 0, [mergedDividendHistory]);

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader
        title="Dividend Analysis"
        subtitle={`Dividend history, sustainability, and yield trajectory across ${mergedDividendHistory.length} years (${mergedDividendHistory[0]?.fy || ''}–${mergedDividendHistory[mergedDividendHistory.length - 1]?.fy || ''})`}
        icon={<TrendingUp size={22} />}
      />

      {/* Live data indicator */}
      {liveDividendData && (
        <div className="flex justify-end text-[10px] text-gray-600">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
            📡 Live: {liveDividendData.dividends.length} dividend records from {liveDividendData.source}
          </span>
        </div>
      )}

      {/* —— Metric Cards Row 1 —————————————————————————————————————————————————————————————————— */}
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

      {/* —— Metric Cards Row 2 —————————————————————————————————————————————————————————————————— */}
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

      {/* —— Panel 1: DPS vs EPS with Payout Ratio Overlay —————————————————————— */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">DPS vs EPS with Payout Ratio Overlay</h3>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={mergedDividendHistory} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
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
            <Bar yAxisId="left" dataKey="eps" fill="#3b82f6" name="EPS" barSize={18} isAnimationActive={true} />
            <Bar yAxisId="left" dataKey="dps" fill="#10b981" name="DPS" barSize={18} isAnimationActive={true} />
            <Line yAxisId="left" dataKey="specialDiv" stroke="#f59e0b" name="Special Div" dot={{ r: 3 }} isAnimationActive={true} />
            <Area
              yAxisId="right"
              dataKey="payoutRatio"
              fill="#8b5cf6"
              fillOpacity={0.2}
              stroke="#8b5cf6"
              name="Payout %"
              isAnimationActive={true}
            />
            <ReferenceLine yAxisId="left" y={avgDps} stroke="#10b981" strokeDasharray="4 4" label={{ value: `Avg DPS ₹${avgDps.toFixed(1)}`, position: 'insideTopLeft', fill: '#10b981', fontSize: 10 }} />
            <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '80% Threshold', position: 'right', fill: '#ef4444', fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* —— Panel 2: Total Shareholder Return Decomposition ————————————————— */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Total Shareholder Return Decomposition</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={mergedDividendHistory} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#d1d5db' }} />
            <Bar dataKey="divYield" stackId="return" fill="#10b981" name="Div Yield %" isAnimationActive={true} />
            <Bar dataKey="priceApprec" stackId="return" fill="#3b82f6" name="Price Apprec %" isAnimationActive={true} />
            <ReferenceLine y={avgDivYield} stroke="#10b981" strokeDasharray="4 4" label={{ value: `Avg Div Yield ${avgDivYield.toFixed(1)}%`, position: 'insideTopLeft', fill: '#10b981', fontSize: 10 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* —— Panel 3: Payout Ratio Trend ——————————————————————————————————————————— */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Payout Ratio Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={mergedDividendHistory} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#d1d5db' }} />
            <Line type="monotone" dataKey="payoutRatio" stroke="#8b5cf6" name="Payout Ratio %" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={true} />
            <ReferenceLine y={avgPayoutRatio} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: `Avg Payout ${avgPayoutRatio.toFixed(1)}%`, position: 'insideTopLeft', fill: '#8b5cf6', fontSize: 10 }} />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Sustainable Threshold', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
