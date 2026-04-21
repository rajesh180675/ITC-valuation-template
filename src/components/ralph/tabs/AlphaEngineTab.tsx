import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { buildAlphaSignals } from '@/utils/ralphAlpha';
import { RalphCard } from '@/components/ralph/shared/RalphCard';
import { RalphBulletBadge } from '@/components/ralph/shared/RalphBulletBadge';
import { RalphFactorBar } from '@/components/ralph/shared/RalphFactorBar';

const RATINGS = ['Strong Buy', 'Buy', 'Hold', 'Reduce', 'Sell'] as const;

export function AlphaEngineTab() {
  const signals = useMemo(() => buildAlphaSignals(), []);
  const distribution = RATINGS.map(rating => ({ rating, count: signals.filter(signal => signal.ratingCategory === rating).length }));
  const scatter = signals.map(signal => ({ ...signal, x: signal.qualityScore, y: signal.growthScore, z: signal.compositeScore }));
  const bestQuality = signals.filter(s => s.alphaBucket === 'Quality Compounder').slice(0, 3);
  const bestValue = signals.filter(s => s.alphaBucket === 'Value Opportunity').slice(0, 3);
  const bestGrowth = signals.filter(s => s.alphaBucket === 'Growth Accelerator').slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RalphCard title="Rating Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="rating" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937' }} />
              <Bar dataKey="count">{distribution.map((_, i) => <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#991b1b'][i]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </RalphCard>
        <RalphCard title="Quality vs Growth Map">
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis type="number" dataKey="x" name="Quality" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="Growth" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <ZAxis type="number" dataKey="z" range={[50, 260]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#111827', border: '1px solid #1f2937' }} />
              <Scatter data={scatter} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </RalphCard>
      </div>

      <RalphCard title="Alpha Signal Table">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left uppercase text-gray-500"><tr><th className="p-2">Company</th><th className="p-2">Composite</th><th className="p-2">Rating</th><th className="p-2">Bucket</th><th className="p-2">Trap</th><th className="p-2">GARP</th><th className="p-2">Strength</th><th className="p-2">Weakness</th></tr></thead>
            <tbody>
              {signals.map(signal => (
                <tr key={signal.companyId} className="border-t border-border/60">
                  <td className="p-2 text-gray-100">{signal.name}</td>
                  <td className="p-2 min-w-[130px]"><RalphFactorBar label="" value={signal.compositeScore} color="#3b82f6" /></td>
                  <td className="p-2"><RalphBulletBadge label={signal.ratingCategory} tone={signal.ratingCategory.includes('Buy') ? 'green' : signal.ratingCategory === 'Hold' ? 'gold' : 'red'} /></td>
                  <td className="p-2"><RalphBulletBadge label={signal.alphaBucket} tone="purple" /></td>
                  <td className="p-2"><RalphBulletBadge label={signal.valueTrapRisk} tone={signal.valueTrapRisk === 'low' ? 'green' : signal.valueTrapRisk === 'medium' ? 'gold' : 'red'} /></td>
                  <td className="p-2 text-right">{signal.growthAtReasonablePrice}</td>
                  <td className="p-2 text-gray-300">{signal.primaryStrength}</td>
                  <td className="p-2 text-gray-400">{signal.primaryWeakness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RalphCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <IdeaBoard title="Quality Compounders" rows={bestQuality} />
        <IdeaBoard title="Value Opportunities" rows={bestValue} />
        <IdeaBoard title="Growth Accelerators" rows={bestGrowth} />
      </div>
    </div>
  );
}

function IdeaBoard({ title, rows }: { title: string; rows: ReturnType<typeof buildAlphaSignals> }) {
  return (
    <RalphCard title={title}>
      <div className="space-y-3">
        {rows.map(row => (
          <div key={row.companyId} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2"><p className="font-medium text-white">{row.name}</p><span className="text-blue-300">{row.compositeScore}</span></div>
            <p className="mt-1 text-xs text-gray-400">{row.primaryStrength} with {row.primaryWeakness.toLowerCase()}.</p>
          </div>
        ))}
      </div>
    </RalphCard>
  );
}
