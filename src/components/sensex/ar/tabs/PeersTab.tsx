import { Users } from 'lucide-react';
import type { AnnualReportYearData } from '@/utils/annualReportCashFlow';
import { buildDerivedFinancials } from '@/utils/ar/derivedKPIs';
import { useMemo } from 'react';

interface PeersTabProps {
  ticker: string;
  yearsData: Record<string, AnnualReportYearData>;
  years: string[];
  sector?: string | null;
}

const fmt = (v: number | null | undefined, d = 1) => v == null || !Number.isFinite(v) ? '—' : v.toLocaleString('en-IN', { maximumFractionDigits: d });

export function PeersTab({ ticker, yearsData, years, sector }: PeersTabProps) {
  const rows = useMemo(() => buildDerivedFinancials(yearsData, years), [yearsData, years]);
  const latest = rows[rows.length - 1];

  if (!latest) return <div className="glass-card p-5 text-gray-400">No peer metrics available.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-300"><Users size={16} className="text-blue-400" /> Peer comparison scaffold · {sector ?? 'sector unknown'}</div>
      <div className="glass-card p-4 overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead><tr className="border-b border-gray-800 text-gray-400"><th className="text-left py-2">Ticker</th><th className="text-right py-2">Revenue</th><th className="text-right py-2">EBITDA Margin</th><th className="text-right py-2">ROE</th><th className="text-right py-2">ROCE</th><th className="text-right py-2">Debt/Equity</th><th className="text-right py-2">FCF Yield</th></tr></thead>
          <tbody>
            <tr className="border-b border-gray-900 bg-emerald-500/5">
              <td className="py-2 text-emerald-300 font-mono">{ticker}</td>
              <td className="py-2 text-right text-white">₹{fmt(latest.revenue, 0)} Cr</td>
              <td className="py-2 text-right text-white">{fmt(latest.ebitdaMargin)}%</td>
              <td className="py-2 text-right text-white">{fmt(latest.roe)}%</td>
              <td className="py-2 text-right text-white">{fmt(latest.roce)}%</td>
              <td className="py-2 text-right text-white">{fmt(latest.debtToEquity)}x</td>
              <td className="py-2 text-right text-white">{fmt(latest.fcfYield)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="glass-card p-4 text-xs text-gray-400">
        Peer-set ingestion is ready for <code className="text-emerald-300">public/data/peers_data.json</code>. The active-company row is wired now; batch peer loading can be expanded without changing the tab contract.
      </div>
    </div>
  );
}
