import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StrategyPayoff } from '@/utils/ralphOptions';
import { RalphCard } from '@/components/ralph/shared/RalphCard';

export function RalphPayoffChart({ payoff }: { payoff: StrategyPayoff }) {
  const data = payoff.payoffCurve.map(point => ({
    spot: point.spotPct,
    profit: point.profitLossPct > 0 ? point.profitLossPct : null,
    loss: point.profitLossPct <= 0 ? point.profitLossPct : null,
    pl: point.profitLossPct,
  }));

  return (
    <RalphCard
      title={`${payoff.strategy.name} Payoff`}
      subtitle={`Net premium ${payoff.netPremiumPct >= 0 ? 'paid' : 'received'} ${Math.abs(payoff.netPremiumPct)}% of spot`}
    >
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="ralphProfitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="ralphLossGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
          <XAxis dataKey="spot" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[payoff.maxLossPct - 2, payoff.maxProfitPct + 2]} />
          <Tooltip
            formatter={(value: number) => [`${Number(value).toFixed(2)}%`, 'P&L']}
            labelFormatter={label => `Spot: ${label}%`}
            contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
          <ReferenceLine x={100} stroke="#f59e0b" strokeDasharray="4 4" />
          {payoff.breakevenLow !== null && <ReferenceLine x={payoff.breakevenLow} stroke="#3b82f6" strokeDasharray="3 3" />}
          {payoff.breakevenHigh !== null && <ReferenceLine x={payoff.breakevenHigh} stroke="#3b82f6" strokeDasharray="3 3" />}
          <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#ralphProfitGrad)" strokeWidth={2} connectNulls />
          <Area type="monotone" dataKey="loss" stroke="#ef4444" fill="url(#ralphLossGrad)" strokeWidth={2} connectNulls />
          <Line type="monotone" dataKey="pl" stroke="transparent" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </RalphCard>
  );
}
