import { useMemo, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { buildScreenerRows, type ScreenerRow } from '@/utils/ralphScreener';
import { RalphCard } from '@/components/ralph/shared/RalphCard';
import { RalphHeatmap } from '@/components/ralph/shared/RalphHeatmap';
import { RalphFactorBar } from '@/components/ralph/shared/RalphFactorBar';
import { fmtN } from '@/components/itc/shared';

type View = 'table' | 'heatmap' | 'radar';

const FACTOR_KEYS: Array<keyof ScreenerRow> = ['roe', 'roce', 'ebitda_mgn', 'fcf_yield', 'pe', 'ev_ebitda', 'div_yield', 'rev_cagr3', 'pat_cagr3', 'beta'];
const FACTOR_LABELS = ['ROE', 'ROCE', 'Margin', 'FCF Yld', 'P/E', 'EV/EBITDA', 'DY', 'Rev CAGR', 'PAT CAGR', 'Beta'];

export function ScreenerTab() {
  const [view, setView] = useState<View>('table');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [sortKey, setSortKey] = useState<keyof ScreenerRow>('compositeScore');
  const [selectedId, setSelectedId] = useState('itc');
  const rows = useMemo(() => buildScreenerRows(), []);
  const sectors = useMemo(() => ['All', ...Array.from(new Set(rows.map(r => r.sector))).sort()], [rows]);
  const filtered = useMemo(() => {
    return rows
      .filter(row => sectorFilter === 'All' || row.sector === sectorFilter)
      .sort((a, b) => Number(b[sortKey]) - Number(a[sortKey]));
  }, [rows, sectorFilter, sortKey]);
  const selected = rows.find(row => row.companyId === selectedId) ?? rows[0]!;
  const radarData = [
    { factor: 'Quality', company: selected.qualityScore, median: 50 },
    { factor: 'Value', company: selected.valueScore, median: 50 },
    { factor: 'Growth', company: selected.growthScore, median: 50 },
    { factor: 'Momentum', company: selected.momentumScore, median: 50 },
    { factor: 'Safety', company: selected.safetyScore, median: 50 },
  ];

  return (
    <div className="space-y-6">
      <RalphCard title="Factor Screener" subtitle="Rank the 32-company universe across quality, value, growth, momentum and safety factors.">
        <div className="flex flex-wrap items-center gap-3">
          <div className="segmented">
            {(['table', 'heatmap', 'radar'] as View[]).map(item => <button key={item} onClick={() => setView(item)} className={view === item ? 'active' : ''}>{item}</button>)}
          </div>
          <select value={sectorFilter} onChange={event => setSectorFilter(event.target.value)}>{sectors.map(sector => <option key={sector}>{sector}</option>)}</select>
          {view === 'radar' && <select value={selectedId} onChange={event => setSelectedId(event.target.value)}>{rows.map(row => <option key={row.companyId} value={row.companyId}>{row.name}</option>)}</select>}
        </div>
      </RalphCard>

      {view === 'table' && (
        <RalphCard title="Ranked Factor Table">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left uppercase text-gray-500">
                  {['rank', 'name', 'sector', 'qualityScore', 'valueScore', 'growthScore', 'safetyScore', 'compositeScore', 'roe', 'pe', 'div_yield'].map(col => (
                    <th key={col} onClick={() => setSortKey(col as keyof ScreenerRow)} className="cursor-pointer p-2 hover:text-blue-300">{col.replace('Score', '').replace('_', ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.companyId} className="border-t border-border/60">
                    <td className="p-2 text-gray-400">#{row.rank}</td>
                    <td className="p-2 font-medium text-gray-100">{row.name}</td>
                    <td className="p-2 text-gray-400">{row.sector}</td>
                    <td className="p-2 min-w-[120px]"><RalphFactorBar label="" value={row.qualityScore} color="#10b981" /></td>
                    <td className="p-2 min-w-[120px]"><RalphFactorBar label="" value={row.valueScore} color="#3b82f6" /></td>
                    <td className="p-2 min-w-[120px]"><RalphFactorBar label="" value={row.growthScore} color="#f59e0b" /></td>
                    <td className="p-2 min-w-[120px]"><RalphFactorBar label="" value={row.safetyScore} color="#8b5cf6" /></td>
                    <td className="p-2 font-semibold text-white">{row.compositeScore}</td>
                    <td className="p-2 text-right">{fmtN(row.roe)}%</td>
                    <td className="p-2 text-right">{fmtN(row.pe)}x</td>
                    <td className="p-2 text-right">{fmtN(row.div_yield, 2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RalphCard>
      )}

      {view === 'heatmap' && <RalphCard title="Raw Factor Heatmap"><RalphHeatmap rows={filtered} factorKeys={FACTOR_KEYS} factorLabels={FACTOR_LABELS} /></RalphCard>}

      {view === 'radar' && (
        <RalphCard title={`${selected.name} Factor Radar`} subtitle="Company score versus universe midpoint.">
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2a3a52" />
              <PolarAngleAxis dataKey="factor" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar name={selected.ticker} dataKey="company" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
              <Radar name="Median" dataKey="median" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.08} />
            </RadarChart>
          </ResponsiveContainer>
        </RalphCard>
      )}
    </div>
  );
}
