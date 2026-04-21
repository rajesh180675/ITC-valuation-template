import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { COMPANY_PROFILES, getCompany } from '@/data/companies';
import { compareAllocations, type AllocationMethod } from '@/utils/ralphAllocator';
import { getRalphBeta } from '@/utils/ralphScreener';
import { RalphCard } from '@/components/ralph/shared/RalphCard';

export function CapitalAllocatorTab() {
  const [companyIds, setCompanyIds] = useState<string[]>(['itc', 'hul', 'tcs', 'hdfcbank', 'reliance', 'infosys', 'asianpaints', 'titan']);
  const [highlightMethod, setHighlightMethod] = useState<AllocationMethod>('max_sharpe');
  const results = useMemo(() => compareAllocations(companyIds), [companyIds]);
  const highlighted = results.find(result => result.method === highlightMethod) ?? results[0]!;
  const weightRows = companyIds.map(id => {
    const row: Record<string, string | number> = { ticker: getCompany(id).ticker };
    for (const result of results) row[result.label] = (result.allocations.find(item => item.companyId === id)?.weight ?? 0) * 100;
    return row;
  });
  const frontier = results.map(result => ({ method: result.label, volatility: result.portfolioVolatility, sharpe: result.portfolioSharpe, beta: result.portfolioBeta }));

  const toggle = (id: string) => {
    setCompanyIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : prev.length < 15 ? [...prev, id] : prev);
  };

  return (
    <div className="space-y-6">
      <RalphCard title="Company Selector" subtitle="Select up to 15 companies for allocation model comparison.">
        <div className="flex flex-wrap gap-2">
          {COMPANY_PROFILES.map(company => (
            <button key={company.id} onClick={() => toggle(company.id)} className={`rounded-lg border px-3 py-2 text-xs ${companyIds.includes(company.id) ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-border bg-surface text-gray-400'}`}>{company.ticker}</button>
          ))}
        </div>
      </RalphCard>

      <RalphCard title="Method Comparison">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left uppercase text-gray-500"><tr><th className="p-2">Method</th><th className="p-2">Top Holding</th><th className="p-2 text-right">Vol</th><th className="p-2 text-right">Sharpe</th><th className="p-2 text-right">Beta</th><th className="p-2 text-right">Gini</th><th className="p-2">Comment</th></tr></thead>
            <tbody>
              {results.map(result => {
                const top = [...result.allocations].sort((a, b) => b.weight - a.weight)[0]!;
                return (
                  <tr key={result.method} onClick={() => setHighlightMethod(result.method)} className={`cursor-pointer border-t border-border/60 ${result.method === highlightMethod ? 'bg-blue-500/10' : ''}`}>
                    <td className="p-2 text-gray-100">{result.label}</td>
                    <td className="p-2 text-gray-300">{getCompany(top.companyId).ticker} {(top.weight * 100).toFixed(1)}%</td>
                    <td className="p-2 text-right">{result.portfolioVolatility}%</td>
                    <td className="p-2 text-right">{result.portfolioSharpe}</td>
                    <td className="p-2 text-right">{result.portfolioBeta}</td>
                    <td className="p-2 text-right">{result.giniCoefficient}</td>
                    <td className="p-2 text-gray-400">{result.comments}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </RalphCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RalphCard title="Weight Comparison">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={weightRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="ticker" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937' }} />
              <Legend />
              {results.map((result, index) => <Bar key={result.method} dataKey={result.label} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'][index]} />)}
            </BarChart>
          </ResponsiveContainer>
        </RalphCard>
        <RalphCard title="Risk / Sharpe Map">
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis type="number" dataKey="volatility" name="Volatility" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis type="number" dataKey="sharpe" name="Sharpe" tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937' }} />
              <Scatter data={frontier} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </RalphCard>
      </div>

      <RalphCard title={`${highlighted.label} Deep Dive`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {highlighted.allocations.map(item => {
            const profile = getCompany(item.companyId);
            return (
              <div key={item.companyId} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between"><span className="font-medium text-white">{profile.name}</span><span className="text-blue-300">{(item.weight * 100).toFixed(1)}%</span></div>
                <p className="mt-1 text-xs text-gray-400">Beta {getRalphBeta(profile).toFixed(2)}. Risk contribution proxy {(item.weight * getRalphBeta(profile) * 100).toFixed(1)}.</p>
              </div>
            );
          })}
        </div>
      </RalphCard>
    </div>
  );
}
