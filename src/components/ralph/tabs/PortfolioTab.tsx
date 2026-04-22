import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Plus, Trash2 } from 'lucide-react';
import { COMPANY_PROFILES, getCompany } from '@/data/companies';
import { MACRO_FACTORS } from '@/data/ralphData';
import { calcPortfolioMacroImpact, calcPortfolioMetrics, type PortfolioHolding } from '@/utils/ralphPortfolio';
import { getRalphDividendYield, getRalphPe } from '@/utils/ralphScreener';
import { MetricCard, fmtN } from '@/components/itc/shared';
import { RalphCard } from '@/components/ralph/shared/RalphCard';

const DEFAULT_HOLDINGS: PortfolioHolding[] = [
  { companyId: 'itc', allocationPct: 20 },
  { companyId: 'tcs', allocationPct: 20 },
  { companyId: 'hdfcbank', allocationPct: 15 },
  { companyId: 'hul', allocationPct: 15 },
  { companyId: 'reliance', allocationPct: 15 },
  { companyId: 'infy', allocationPct: 15 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];

export function PortfolioTab() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(DEFAULT_HOLDINGS);
  const [shockMult, setShockMult] = useState(1);
  const metrics = useMemo(() => calcPortfolioMetrics(holdings), [holdings]);
  const macroImpacts = useMemo(() => calcPortfolioMacroImpact(holdings, MACRO_FACTORS, shockMult), [holdings, shockMult]);
  const totalWeight = holdings.reduce((sum, h) => sum + h.allocationPct, 0);
  const isBalanced = Math.abs(totalWeight - 100) < 0.5;
  const sectorData = Object.entries(metrics.sectorConcentration).map(([sector, weight]) => ({ sector, weight: Number(weight.toFixed(1)) }));

  const updateHolding = (index: number, patch: Partial<PortfolioHolding>) => {
    setHoldings(prev => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  };

  return (
    <div className="space-y-6">
      <RalphCard
        title="Portfolio Composer"
        subtitle="Set weights, then use the live diagnostics below for concentration, factor and macro exposure."
        action={<span className={`text-xs font-semibold ${isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>Total {totalWeight.toFixed(1)}%</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="p-2">Company</th>
                <th className="p-2">Weight</th>
                <th className="p-2">Slider</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding, index) => (
                <tr key={`${holding.companyId}-${index}`} className="border-t border-border/60">
                  <td className="p-2">
                    <select value={holding.companyId} onChange={event => updateHolding(index, { companyId: event.target.value })} className="w-full">
                      {COMPANY_PROFILES.map(company => <option key={company.id} value={company.id}>{company.ticker} - {company.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={holding.allocationPct}
                      onChange={event => updateHolding(index, { allocationPct: Number(event.target.value) })}
                      className="w-24 rounded border border-border bg-surface-3 px-2 py-1 text-gray-100"
                    />
                  </td>
                  <td className="p-2 min-w-[220px]">
                    <input type="range" min={0} max={60} step={1} value={holding.allocationPct} onChange={event => updateHolding(index, { allocationPct: Number(event.target.value) })} className="w-full" />
                  </td>
                  <td className="p-2 text-right">
                    <button onClick={() => setHoldings(prev => prev.filter((_, i) => i !== index))} className="rounded border border-border p-2 text-gray-400 hover:text-red-300">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => setHoldings(prev => [...prev, { companyId: COMPANY_PROFILES.find(c => !prev.some(h => h.companyId === c.id))?.id ?? 'itc', allocationPct: 0 }])}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-3 px-3 py-2 text-xs text-gray-200 hover:border-blue-500/50"
        >
          <Plus size={14} /> Add holding
        </button>
      </RalphCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="Weighted P/E" value={`${fmtN(metrics.totalWeightedPE)}x`} subtitle="blended valuation" color="blue" />
        <MetricCard title="Weighted ROE" value={`${fmtN(metrics.totalWeightedROE)}%`} subtitle="profitability proxy" color="green" />
        <MetricCard title="Dividend Yield" value={`${fmtN(metrics.totalWeightedDivYield, 2)}%`} subtitle="cash return" color="gold" />
        <MetricCard title="Blended Upside" value={`${metrics.blendedFairValueUpside >= 0 ? '+' : ''}${fmtN(metrics.blendedFairValueUpside)}%`} subtitle="bridge fair value" trend={metrics.blendedFairValueUpside} color="purple" />
        <MetricCard title="EBITDA Margin" value={`${fmtN(metrics.totalWeightedEbitdaMargin)}%`} subtitle="weighted FY25" color="blue" />
        <MetricCard title="3Y Rev CAGR" value={`${fmtN(metrics.totalWeightedRevCagr3)}%`} subtitle="weighted history" color="green" />
        <MetricCard title="Beta" value={fmtN(metrics.totalWeightedBeta, 2)} subtitle="market sensitivity" color="gold" />
        <MetricCard title="Diversification" value={`${metrics.diversificationScore}`} subtitle={`${getCompany(metrics.topHolding || 'itc').ticker} top ${metrics.topHoldingWeight}%`} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RalphCard title="Sector Concentration">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sectorData} dataKey="weight" nameKey="sector" innerRadius={55} outerRadius={95} label={({ sector, weight }) => `${sector}: ${weight}%`}>
                {sectorData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937' }} />
            </PieChart>
          </ResponsiveContainer>
        </RalphCard>
        <RalphCard title="Holding Detail">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500"><tr><th className="p-2 text-left">Company</th><th className="p-2 text-right">Wt</th><th className="p-2 text-right">P/E</th><th className="p-2 text-right">DY</th></tr></thead>
              <tbody>
                {holdings.map(holding => {
                  const profile = getCompany(holding.companyId);
                  return <tr key={holding.companyId} className="border-t border-border/60"><td className="p-2 text-gray-200">{profile.ticker}</td><td className="p-2 text-right">{holding.allocationPct}%</td><td className="p-2 text-right">{fmtN(getRalphPe(profile))}x</td><td className="p-2 text-right">{fmtN(getRalphDividendYield(profile), 2)}%</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </RalphCard>
      </div>

      <RalphCard
        title="Portfolio Macro Sensitivity"
        subtitle="Weighted EPS impact by factor. Use the shock slider to scale one-unit stress assumptions."
        action={<span className="text-xs text-gray-300">Shock {shockMult.toFixed(1)}x</span>}
      >
        <input type="range" min={0.5} max={2} step={0.1} value={shockMult} onChange={event => setShockMult(Number(event.target.value))} className="mb-5 w-full" />
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={macroImpacts} layout="vertical" margin={{ left: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis type="category" dataKey="factorLabel" tick={{ fill: '#94a3b8', fontSize: 11 }} width={130} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937' }} />
            <ReferenceLine x={0} stroke="#94a3b8" />
            <Bar dataKey="portfolioEpsImpactPct" name="EPS impact">
              {macroImpacts.map(row => <Cell key={row.factorId} fill={row.portfolioEpsImpactPct >= 0 ? '#10b981' : '#ef4444'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </RalphCard>
    </div>
  );
}
