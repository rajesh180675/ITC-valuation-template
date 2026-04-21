import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BUDGET_EVENTS, OPTIONS_STRATEGIES, type OptionsStrategy } from '@/data/ralphData';
import { computePayoff } from '@/utils/ralphOptions';
import { RalphCard } from '@/components/ralph/shared/RalphCard';
import { RalphPayoffChart } from '@/components/ralph/shared/RalphPayoffChart';
import { RalphBulletBadge } from '@/components/ralph/shared/RalphBulletBadge';

export function EventPlaybookTab() {
  const [category, setCategory] = useState<OptionsStrategy['category']>('budget_hedge');
  const [selectedId, setSelectedId] = useState(OPTIONS_STRATEGIES[0]!.id);
  const [spotPrice, setSpotPrice] = useState(450);
  const strategies = OPTIONS_STRATEGIES.filter(strategy => strategy.category === category);
  const selected = OPTIONS_STRATEGIES.find(strategy => strategy.id === selectedId && strategy.category === category) ?? strategies[0] ?? OPTIONS_STRATEGIES[0]!;
  const payoff = useMemo(() => computePayoff(selected, spotPrice), [selected, spotPrice]);
  const timeline = BUDGET_EVENTS.map(event => ({ ...event, nccd: event.nccdHikePct ?? 0 })).reverse();

  const changeCategory = (next: OptionsStrategy['category']) => {
    setCategory(next);
    setSelectedId(OPTIONS_STRATEGIES.find(strategy => strategy.category === next)?.id ?? selectedId);
  };

  return (
    <div className="space-y-6">
      <RalphCard title="Budget Event Timeline" subtitle="Historical NCCD shock versus ITC day-one reaction.">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937' }} />
            <Bar dataKey="nccd" name="NCCD hike" fill="#f59e0b" />
            <Line type="monotone" dataKey="itcMoveDay" name="ITC move" stroke="#10b981" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </RalphCard>

      <RalphCard title="Strategy Selector">
        <div className="mb-4 flex flex-wrap gap-2">
          {(['budget_hedge', 'directional', 'neutral', 'income'] as OptionsStrategy['category'][]).map(item => (
            <button key={item} onClick={() => changeCategory(item)} className={`tab-btn px-3 py-2 text-xs ${category === item ? 'active' : ''}`}>{item.replace('_', ' ')}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {strategies.map(strategy => (
            <button key={strategy.id} onClick={() => setSelectedId(strategy.id)} className={`rounded-lg border p-3 text-left ${selected.id === strategy.id ? 'border-blue-500 bg-blue-500/10' : 'border-border bg-surface'}`}>
              <p className="font-semibold text-white">{strategy.name}</p>
              <p className="mt-1 text-xs text-gray-400">{strategy.description}</p>
            </button>
          ))}
        </div>
      </RalphCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><RalphPayoffChart payoff={payoff} /></div>
        <RalphCard title="Hedge Calculator">
          <label className="text-xs text-gray-400">Spot price</label>
          <input value={spotPrice} onChange={event => setSpotPrice(Number(event.target.value))} type="number" className="mb-4 mt-1 w-full rounded border border-border bg-surface-3 px-3 py-2 text-white" />
          <div className="space-y-3 text-sm">
            <p className="flex justify-between"><span className="text-gray-400">Net premium</span><span className="text-white">{payoff.netPremiumPct}%</span></p>
            <p className="flex justify-between"><span className="text-gray-400">Max loss</span><span className="text-red-300">{payoff.maxLossPct}%</span></p>
            <p className="flex justify-between"><span className="text-gray-400">Max profit in view</span><span className="text-emerald-300">{payoff.maxProfitPct}%</span></p>
            <p className="flex justify-between"><span className="text-gray-400">Breakeven</span><span className="text-blue-300">{payoff.breakevenLow ?? '-'} / {payoff.breakevenHigh ?? '-'}</span></p>
          </div>
        </RalphCard>
      </div>

      <RalphCard title="Strategy Detail">
        <div className="mb-3"><RalphBulletBadge label={selected.category.replace('_', ' ')} tone="blue" /></div>
        <p className="text-sm text-gray-300">{selected.bestFor}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left uppercase text-gray-500"><tr><th className="p-2">Type</th><th className="p-2">Position</th><th className="p-2">Strike</th><th className="p-2">Premium</th><th className="p-2">Qty</th></tr></thead>
            <tbody>{selected.legs.map((leg, index) => <tr key={index} className="border-t border-border/60"><td className="p-2">{leg.type}</td><td className="p-2">{leg.position}</td><td className="p-2">{leg.strike}%</td><td className="p-2">{leg.premium}%</td><td className="p-2">{leg.qty}</td></tr>)}</tbody>
          </table>
        </div>
      </RalphCard>
    </div>
  );
}
