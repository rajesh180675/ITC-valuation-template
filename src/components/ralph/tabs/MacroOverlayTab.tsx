import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { MACRO_FACTORS } from '@/data/ralphData';
import { MACRO_SCENARIOS, runMacroScenario, sectorRotationMatrix, type MacroScenario } from '@/utils/ralphMacro';
import { RalphCard } from '@/components/ralph/shared/RalphCard';

export function MacroOverlayTab() {
  const [scenario, setScenario] = useState<MacroScenario>(MACRO_SCENARIOS[0]!);
  const results = useMemo(() => runMacroScenario(scenario), [scenario]);
  const sectorRows = useMemo(() => Object.entries(sectorRotationMatrix(scenario)).sort((a, b) => b[1] - a[1]), [scenario]);
  const winners = results.slice(0, 5);
  const losers = results.slice(-5).reverse();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {MACRO_SCENARIOS.map(item => (
          <button key={item.id} onClick={() => setScenario(item)} className={`rounded-lg border p-3 text-left transition ${scenario.id === item.id ? 'border-blue-500 bg-blue-500/10' : 'border-border bg-surface hover:border-blue-500/40'}`}>
            <p className="text-sm font-semibold text-white">{item.label}</p>
            <p className="mt-1 text-xs text-gray-400">{item.description}</p>
          </button>
        ))}
      </div>

      <RalphCard title="Scenario Shock Parameters">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MACRO_FACTORS.slice(0, 6).map(factor => (
            <div key={factor.id} className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-gray-400">{factor.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{scenario.shocks[factor.id] ?? 0} {factor.unit}</p>
            </div>
          ))}
        </div>
      </RalphCard>

      <RalphCard title="Company EPS Impact Waterfall" subtitle="Positive bars are estimated EPS tailwinds; negative bars are headwinds.">
        <ResponsiveContainer width="100%" height={520}>
          <BarChart data={results} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis type="category" dataKey="companyName" tick={{ fill: '#94a3b8', fontSize: 10 }} width={155} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937' }} />
            <ReferenceLine x={0} stroke="#94a3b8" />
            <Bar dataKey="epsImpactPct" name="EPS impact">
              {results.map(row => <Cell key={row.companyId} fill={row.epsImpactPct >= 0 ? '#10b981' : '#ef4444'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </RalphCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RalphCard title="Sector Rotation">
          <div className="space-y-2">
            {sectorRows.map(([sector, impact]) => (
              <div key={sector} className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2 text-xs">
                <span className="text-gray-300">{sector}</span>
                <span className={impact >= 0 ? 'text-emerald-300' : 'text-red-300'}>{impact >= 0 ? '+' : ''}{impact}%</span>
              </div>
            ))}
          </div>
        </RalphCard>
        <ImpactList title="Top Winners" rows={winners} />
        <ImpactList title="Top Losers" rows={losers} />
      </div>
    </div>
  );
}

function ImpactList({ title, rows }: { title: string; rows: ReturnType<typeof runMacroScenario> }) {
  return (
    <RalphCard title={title}>
      <div className="space-y-2">
        {rows.map(row => (
          <div key={row.companyId} className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2 text-xs">
            <span className="text-gray-200">{row.companyName}</span>
            <span className={row.epsImpactPct >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.epsImpactPct >= 0 ? '+' : ''}{row.epsImpactPct}%</span>
          </div>
        ))}
      </div>
    </RalphCard>
  );
}
