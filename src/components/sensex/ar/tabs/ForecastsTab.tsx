import { useMemo } from 'react';
import { BarChart3, Info } from 'lucide-react';
import type { AnnualReportYearData } from '@/utils/annualReportCashFlow';
import { buildDerivedFinancials } from '@/utils/ar/derivedKPIs';
import { buildProjection } from '@/utils/ar/projection';
import { deriveAssumptions } from '@/utils/ar/assumptions';

interface ForecastsTabProps {
  yearsData: Record<string, AnnualReportYearData>;
  years: string[];
}

const fmt = (v: number | null | undefined, d = 0) => v == null || !Number.isFinite(v) ? '—' : v.toLocaleString('en-IN', { maximumFractionDigits: d });
const pct = (v: number | null | undefined, d = 1) => v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(d)}%`;

export function ForecastsTab({ yearsData, years }: ForecastsTabProps) {
  const history = useMemo(() => buildDerivedFinancials(yearsData, years), [yearsData, years]);
  const assumptions = useMemo(() => deriveAssumptions(history), [history]);
  const projection = useMemo(() => buildProjection(history, assumptions), [history, assumptions]);

  if (history.length === 0 || projection.years.length === 0) {
    return <div className="glass-card p-5 text-gray-400">Forecast model needs revenue and base-year financials.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <BarChart3 size={16} className="text-purple-400" />
        <span>Three-statement forecast model · WACC {pct(projection.wacc)}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4"><div className="text-xs text-gray-500">Base Revenue</div><div className="text-xl text-white font-semibold">₹{fmt(projection.startingValues.revenue)} Cr</div></div>
        <div className="glass-card p-4"><div className="text-xs text-gray-500">Hist. EBITDA Margin</div><div className="text-xl text-white font-semibold">{pct(assumptions.ebitdaMargin[0])}</div><div className="text-[10px] text-gray-500 mt-1">5Y avg from actuals</div></div>
        <div className="glass-card p-4"><div className="text-xs text-gray-500">Rev Growth Y1→Y5</div><div className="text-xl text-white font-semibold">{pct(assumptions.revenueGrowthYears[0])} → {pct(assumptions.revenueGrowthYears[4])}</div><div className="text-[10px] text-gray-500 mt-1">Tapered from hist. CAGR</div></div>
        <div className="glass-card p-4"><div className="text-xs text-gray-500">Cost of Equity</div><div className="text-xl text-white font-semibold">{pct(projection.costOfEquity)}</div></div>
      </div>

      {/* Assumption summary */}
      <div className="glass-card p-4 flex flex-wrap gap-3 text-[11px]">
        <div className="flex items-center gap-1.5 text-gray-400"><Info size={12} className="text-blue-400" /> Assumptions seeded from {Math.min(5, history.length)}Y actuals:</div>
        {[
          ['Tax Rate', pct(assumptions.taxRate)],
          ['Capex/Rev', pct(assumptions.capexPctOfRevenue[0])],
          ['D&A/Rev', pct(assumptions.daPctOfRevenue[0])],
          ['Terminal g', pct(assumptions.terminalGrowth)],
          ['WACC', pct(projection.wacc)],
        ].map(([k, v]) => (
          <span key={k} className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">
            {k}: <span className="text-white font-mono">{v}</span>
          </span>
        ))}
      </div>

      <div className="glass-card p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-white mb-3">Projected Financials</h3>
        <table className="w-full text-xs tabular-nums min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left py-2">Metric</th>
              {projection.years.map(y => <th key={y.fy} className="text-right py-2">{y.fy}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              ['Revenue (₹ Cr)', projection.years.map(y => fmt(y.revenue))],
              ['EBITDA (₹ Cr)', projection.years.map(y => fmt(y.ebitda))],
              ['EBIT (₹ Cr)', projection.years.map(y => fmt(y.ebit))],
              ['NOPAT (₹ Cr)', projection.years.map(y => fmt(y.nopat))],
              ['FCFF (₹ Cr)', projection.years.map(y => fmt(y.fcff))],
              ['ROIC (%)', projection.years.map(y => pct(y.roic))],
              ['Reinvestment Rate (%)', projection.years.map(y => pct(y.reinvestmentRate))],
            ].map(([label, values]) => (
              <tr key={label as string} className="border-b border-gray-900 hover:bg-white/[0.03]">
                <td className="py-2 text-gray-300">{label}</td>
                {(values as string[]).map((v, i) => <td key={i} className="py-2 text-right text-gray-200">{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {projection.warnings.length > 0 && (
        <div className="glass-card p-4 text-xs text-amber-300 border border-amber-500/20">
          {projection.warnings.join(' · ')}
        </div>
      )}
    </div>
  );
}
