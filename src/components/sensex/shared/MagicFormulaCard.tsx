import { CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { ChartTooltip, fmtN } from '@/components/itc/shared';
import type { MagicFormulaScore } from '@/utils/sensexAnalytics';

export function MagicFormulaCard({
  rows,
  onSelect,
}: {
  rows: MagicFormulaScore[];
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  const top = rows.slice(0, 12);
  const chartData = top.map((r) => ({
    name: r.ticker,
    capEff: r.capitalEfficiencyPct,
    yld: r.earningsYieldPct,
    combined: r.rankCombined,
  }));

  return (
    <div className="premium-card p-5">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Magic Formula Screen — Top 12</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Greenblatt&apos;s combined rank of capital efficiency (ROCE / ROE) + earnings yield (E/P or ROE/PB).
            Lowest combined rank = best business at the fairest price.
          </p>
        </div>
        <span className="pill pill-muted">screened across {rows.length} names</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] tabular-nums">
            <thead>
              <tr className="text-gray-500 border-b border-border/50">
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Sector</th>
                <th className="text-right py-2">Cap. Eff.</th>
                <th className="text-right py-2">E/Yield</th>
                <th className="text-right py-2">Σ rank</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, idx) => (
                <tr
                  key={r.id}
                  className="border-b border-border/30 cursor-pointer hover:bg-white/5 transition"
                  onClick={() => onSelect(r.id)}
                >
                  <td className="py-1.5 text-[color:var(--color-gold-light)] font-bold">{idx + 1}</td>
                  <td className="py-1.5 text-gray-100">
                    <div className="font-semibold text-[12px]">{r.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{r.ticker}</div>
                  </td>
                  <td className="py-1.5 text-gray-400 text-[10px]">{r.sector}</td>
                  <td className="py-1.5 text-right text-emerald-300 font-semibold">{fmtN(r.capitalEfficiencyPct, 1)}%</td>
                  <td className="py-1.5 text-right text-amber-200 font-semibold">{fmtN(r.earningsYieldPct, 1)}%</td>
                  <td className="py-1.5 text-right text-white font-bold">{r.rankCombined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 12, right: 16, bottom: 36, left: 8 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
            <XAxis
              type="number" dataKey="capEff" name="Capital Efficiency"
              tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false}
              label={{ value: 'Capital Efficiency (ROCE / ROE %)', position: 'bottom', offset: 18, fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              type="number" dataKey="yld" name="Earnings Yield"
              tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false}
              label={{ value: 'Earnings Yield (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="combined" range={[280, 60]} />
            <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} content={<ChartTooltip />} />
            <Scatter data={chartData} fill="#d4a843">
              {chartData.map((_, i) => (<Cell key={i} fill="#d4a843" />))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
