import { useMemo } from 'react';
import { Calculator } from 'lucide-react';
import type { AnnualReportYearData } from '@/utils/annualReportCashFlow';
import { buildDerivedFinancials } from '@/utils/ar/derivedKPIs';
import { buildProjection, type ProjectionAssumptions } from '@/utils/ar/projection';
import { calculateDCF } from '@/utils/ar/valuationDCF';
import { calculateRIM } from '@/utils/ar/valuationRIM';
import { calculateEVA } from '@/utils/ar/valuationEVA';
import { computeMultiples } from '@/utils/ar/valuationMultiples';

interface ValuationTabProps {
  yearsData: Record<string, AnnualReportYearData>;
  years: string[];
  marketCapCr?: number | null;
}

const fmt = (v: number | null | undefined, d = 0) => v == null || !Number.isFinite(v) ? '—' : v.toLocaleString('en-IN', { maximumFractionDigits: d });
const ratio = (v: number | null | undefined, d = 1) => v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(d)}x`;

function assumptions(): ProjectionAssumptions {
  return {
    revenueGrowthYears: [8, 7, 6, 5, 4], terminalGrowth: 4, forecastYears: 5,
    ebitdaMargin: [25, 25, 25, 25, 25], daPctOfRevenue: [3, 3, 3, 3, 3], taxRate: 25.17,
    capexPctOfRevenue: [5, 5, 5, 5, 5], nwcPctOfRevenue: [2, 2, 2, 2, 2],
    netDebtToEbitdaTarget: 1, payoutRatio: 35, riskFreeRate: 7, equityRiskPremium: 5.5,
    beta: 1, costOfDebt: 8.5, targetDebtWeight: 0.3,
  };
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="glass-card p-4"><div className="text-xs text-gray-500">{label}</div><div className="text-2xl text-white font-semibold mt-1">{value}</div>{sub && <div className="text-[11px] text-gray-500 mt-1">{sub}</div>}</div>;
}

export function ValuationTab({ yearsData, years, marketCapCr }: ValuationTabProps) {
  const history = useMemo(() => buildDerivedFinancials(yearsData, years), [yearsData, years]);
  const baseAssumptions = useMemo(() => assumptions(), []);
  const projection = useMemo(() => buildProjection(history, baseAssumptions), [history, baseAssumptions]);
  const latest = history[history.length - 1];

  const dcf = useMemo(() => calculateDCF({
    projection,
    midYearConvention: true,
    terminalMethod: 'gordon',
    netDebtAtValuationDate: latest?.netDebt ?? 0,
    sharesOutstandingMn: 100,
  }), [projection, latest]);

  const rim = useMemo(() => calculateRIM({
    projection,
    costOfEquity: projection.costOfEquity,
    terminalGrowth: projection.assumptions.terminalGrowth,
    startingBookValue: latest?.equity ?? 0,
    sharesOutstandingMn: 100,
  }), [projection, latest]);

  const eva = useMemo(() => calculateEVA({
    projection,
    startingIC: latest?.investedCapital ?? 0,
    sharesOutstandingMn: 100,
  }), [projection, latest]);

  const multiples = useMemo(() => latest ? computeMultiples(latest, marketCapCr) : null, [latest, marketCapCr]);

  if (!latest || projection.years.length === 0) {
    return <div className="glass-card p-5 text-gray-400">Valuation needs base-year financials.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-300"><Calculator size={16} className="text-emerald-400" /> Valuation suite · DCF / RIM / EVA / Multiples</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="DCF Equity Value" value={`₹${fmt(dcf.equityValue)} Cr`} sub={`Per share proxy ₹${fmt(dcf.perShareValueINR, 2)}`} />
        <Card label="RIM Equity Value" value={`₹${fmt(rim.equityValue)} Cr`} sub={`Per share proxy ₹${fmt(rim.perShareValueINR, 2)}`} />
        <Card label="EVA Implied EV" value={`₹${fmt(eva.impliedEnterpriseValue)} Cr`} sub={`Per share proxy ₹${fmt(eva.perShareValueINR, 2)}`} />
        <Card label="Terminal Weight" value={`${fmt(dcf.terminalValueWeight * 100, 1)}%`} sub={dcf.isValid ? 'DCF valid' : dcf.validationErrors.join(', ')} />
      </div>

      <div className="glass-card p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-white mb-3">Trailing Multiples</h3>
        <table className="w-full text-xs tabular-nums">
          <tbody>
            <tr className="border-b border-gray-900"><td className="py-2 text-gray-400">P/E</td><td className="py-2 text-right text-white">{ratio(multiples?.trailing.pe)}</td></tr>
            <tr className="border-b border-gray-900"><td className="py-2 text-gray-400">EV/EBITDA</td><td className="py-2 text-right text-white">{ratio(multiples?.trailing.evEbitda)}</td></tr>
            <tr className="border-b border-gray-900"><td className="py-2 text-gray-400">P/B</td><td className="py-2 text-right text-white">{ratio(multiples?.trailing.pb)}</td></tr>
            <tr><td className="py-2 text-gray-400">EV/Sales</td><td className="py-2 text-right text-white">{ratio(multiples?.trailing.evSales)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="glass-card p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-white mb-3">DCF Components</h3>
        <table className="w-full text-xs tabular-nums">
          <tbody>
            <tr className="border-b border-gray-900"><td className="py-2 text-gray-400">PV explicit FCFF</td><td className="py-2 text-right text-white">₹{fmt(dcf.pvFcffByYear.reduce((a, b) => a + b, 0))} Cr</td></tr>
            <tr className="border-b border-gray-900"><td className="py-2 text-gray-400">PV terminal value</td><td className="py-2 text-right text-white">₹{fmt(dcf.pvTerminalValue)} Cr</td></tr>
            <tr className="border-b border-gray-900"><td className="py-2 text-gray-400">Net debt adjustment</td><td className="py-2 text-right text-white">₹{fmt(latest.netDebt)} Cr</td></tr>
            <tr><td className="py-2 text-gray-400">Implied exit EBITDA multiple</td><td className="py-2 text-right text-white">{ratio(dcf.impliedExitEbitdaMultiple)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
