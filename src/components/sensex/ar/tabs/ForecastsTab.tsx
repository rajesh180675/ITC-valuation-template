import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import type { AnnualReportYearData } from '@/utils/annualReportCashFlow';
import { buildDerivedFinancials } from '@/utils/ar/derivedKPIs';
import { buildProjection, type ProjectionAssumptions } from '@/utils/ar/projection';

interface ForecastsTabProps {
  yearsData: Record<string, AnnualReportYearData>;
  years: string[];
}

const fmt = (v: number | null | undefined, d = 0) => v == null || !Number.isFinite(v) ? '—' : v.toLocaleString('en-IN', { maximumFractionDigits: d });
const pct = (v: number | null | undefined, d = 1) => v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(d)}%`;

function defaultAssumptions(): ProjectionAssumptions {
  return {
    revenueGrowthYears: [8, 7, 6, 5, 4],
    terminalGrowth: 4,
    forecastYears: 5,
    ebitdaMargin: [25, 25, 25, 25, 25],
    daPctOfRevenue: [3, 3, 3, 3, 3],
    taxRate: 25.17,
    capexPctOfRevenue: [5, 5, 5, 5, 5],
    nwcPctOfRevenue: [2, 2, 2, 2, 2],
    netDebtToEbitdaTarget: 1,
    payoutRatio: 35,
    riskFreeRate: 7,
    equityRiskPremium: 5.5,
    beta: 1,
    costOfDebt: 8.5,
    targetDebtWeight: 0.3,
  };
}

export function ForecastsTab({ yearsData, years }: ForecastsTabProps) {
  const history = useMemo(() => buildDerivedFinancials(yearsData, years), [yearsData, years]);
  const assumptions = useMemo(() => defaultAssumptions(), []);
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
        <div className="glass-card p-4"><div className="text-xs text-gray-500">Base EBITDA Margin</div><div className="text-xl text-white font-semibold">{pct(projection.startingValues.ebitdaMargin)}</div></div>
        <div className="glass-card p-4"><div className="text-xs text-gray-500">Cost of Equity</div><div className="text-xl text-white font-semibold">{pct(projection.costOfEquity)}</div></div>
        <div className="glass-card p-4"><div className="text-xs text-gray-500">Terminal Growth</div><div className="text-xl text-white font-semibold">{pct(assumptions.terminalGrowth)}</div></div>
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
              ['Revenue', projection.years.map(y => `₹${fmt(y.revenue)} Cr`)],
              ['EBITDA', projection.years.map(y => `₹${fmt(y.ebitda)} Cr`)],
              ['EBIT', projection.years.map(y => `₹${fmt(y.ebit)} Cr`)],
              ['NOPAT', projection.years.map(y => `₹${fmt(y.nopat)} Cr`)],
              ['FCFF', projection.years.map(y => `₹${fmt(y.fcff)} Cr`)],
              ['ROIC', projection.years.map(y => pct(y.roic))],
              ['Reinvestment Rate', projection.years.map(y => pct(y.reinvestmentRate))],
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
