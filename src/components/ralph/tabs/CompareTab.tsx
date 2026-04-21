import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COMPANY_PROFILES, getCompany } from '@/data/companies';
import { buildCompanySnapshot } from '@/utils/genericModel';
import { buildScreenerRows, getRalphDividendYield, getRalphPe } from '@/utils/ralphScreener';
import { RalphCard } from '@/components/ralph/shared/RalphCard';
import { fmtN } from '@/components/itc/shared';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

export function CompareTab() {
  const [selected, setSelected] = useState<string[]>(['itc', 'hul', 'tcs']);
  const screener = useMemo(() => new Map(buildScreenerRows().map(row => [row.companyId, row])), []);
  const profiles = selected.map(getCompany);
  const financialData = ['revenue', 'ebitda', 'pat'].map(metric => {
    const row: Record<string, string | number> = { metric: metric.toUpperCase() };
    for (const profile of profiles) row[profile.ticker] = profile.historical.at(-1)![metric as 'revenue' | 'ebitda' | 'pat'];
    return row;
  });

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : prev.length < 5 ? [...prev, id] : prev);
  };

  return (
    <div className="space-y-6">
      <RalphCard title="Company Picker" subtitle="Select two to five companies for a side-by-side research comparison.">
        <div className="flex flex-wrap gap-2">
          {COMPANY_PROFILES.map(company => (
            <button key={company.id} onClick={() => toggle(company.id)} className={`rounded-lg border px-3 py-2 text-xs ${selected.includes(company.id) ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-border bg-surface text-gray-400'}`}>
              {company.ticker}
            </button>
          ))}
        </div>
      </RalphCard>

      <RalphCard title="Summary Matrix">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left uppercase text-gray-500"><th className="p-2">Metric</th>{profiles.map(profile => <th key={profile.id} className="p-2 text-right">{profile.ticker}</th>)}</tr></thead>
            <tbody>
              {[
                ['P/E', (id: string) => `${fmtN(getRalphPe(getCompany(id)))}x`],
                ['ROE', (id: string) => `${fmtN(screener.get(id)?.roe ?? 0)}%`],
                ['EBITDA Margin', (id: string) => `${fmtN(screener.get(id)?.ebitda_mgn ?? 0)}%`],
                ['3Y Revenue CAGR', (id: string) => `${fmtN(screener.get(id)?.rev_cagr3 ?? 0)}%`],
                ['Dividend Yield', (id: string) => `${fmtN(getRalphDividendYield(getCompany(id)), 2)}%`],
                ['Composite Score', (id: string) => `${screener.get(id)?.compositeScore ?? 0}`],
                ['DCF Upside', (id: string) => {
                  const profile = getCompany(id);
                  const snapshot = buildCompanySnapshot(profile);
                  return `${fmtN(snapshot.bridge.upside)}%`;
                }],
              ].map(([label, getter]) => (
                <tr key={String(label)} className="border-t border-border/60">
                  <td className="p-2 text-gray-400">{String(label)}</td>
                  {profiles.map(profile => <td key={profile.id} className="p-2 text-right text-gray-100">{(getter as (id: string) => string)(profile.id)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RalphCard>

      <RalphCard title="FY25 Financial Scale">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={financialData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
            <XAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937' }} />
            <Legend />
            {profiles.map((profile, index) => <Bar key={profile.id} dataKey={profile.ticker} fill={COLORS[index % COLORS.length]} />)}
          </BarChart>
        </ResponsiveContainer>
      </RalphCard>
    </div>
  );
}
