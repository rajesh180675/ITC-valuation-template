import { useMemo } from 'react';
import { Calculator, Info } from 'lucide-react';
import type { AnnualReportYearData } from '@/utils/annualReportCashFlow';
import { buildDerivedFinancials } from '@/utils/ar/derivedKPIs';
import { buildProjection } from '@/utils/ar/projection';
import { deriveAssumptions } from '@/utils/ar/assumptions';
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
const pct = (v: number | null | undefined, d = 1) => v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(d)}%`;

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="glass-card p-4"><div className="text-xs text-gray-500">{label}</div><div className="text-2xl text-white font-semibold mt-1">{value}</div>{sub && <div className="text-[11px] text-gray-500 mt-1">{sub}</div>}</div>;
}

export function ValuationTab({ yearsData, years, marketCapCr }: ValuationTabProps) {
  const history = useMemo(() => buildDerivedFinancials(yearsData, years), [yearsData, years]);
  const baseAssumptions = useMemo(() => deriveAssumptions(history), [history]);
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

      {/* Assumption summary */}
      <div className="glass-card p-3 flex flex-wrap gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-gray-400"><Info size={12} className="text-blue-400" /> Seeded from actuals:</div>
        {[
          ['EBITDA Margin', pct(baseAssumptions.ebitdaMargin[0])],
          ['Rev Growth Y1', pct(baseAssumptions.revenueGrowthYears[0])],
          ['Terminal g', pct(baseAssumptions.terminalGrowth)],
          ['Tax Rate', pct(baseAssumptions.taxRate)],
          ['WACC', pct(projection.wacc)],
          ['Capex/Rev', pct(baseAssumptions.capexPctOfRevenue[0])],
        ].map(([k, v]) => (
          <span key={k} className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">
            {k}: <span className="text-white font-mono">{v}</span>
          </span>
        ))}
      </div>

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
