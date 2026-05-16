import { useMemo } from 'react';
import { Gift } from 'lucide-react';
import type { AnnualReportYearData } from '@/utils/annualReportCashFlow';
import { buildDerivedFinancials } from '@/utils/ar/derivedKPIs';

interface DividendsTabProps {
  yearsData: Record<string, AnnualReportYearData>;
  years: string[];
}

const fmt = (v: number | null | undefined, d = 0) => v == null || !Number.isFinite(v) ? '—' : v.toLocaleString('en-IN', { maximumFractionDigits: d });
const pct = (v: number | null | undefined, d = 1) => v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(d)}%`;

export function DividendsTab({ yearsData, years }: DividendsTabProps) {
  const rows = useMemo(() => buildDerivedFinancials(yearsData, years), [yearsData, years]);
  const latest = rows[rows.length - 1];
  const coveredYears = rows.filter(r => r.dividendsPaid != null && r.fcf != null && Math.abs(r.fcf) >= Math.abs(r.dividendsPaid)).length;
  const latestFive = rows.slice(-5);
  const sustainability = latestFive.length === 0 ? 'unknown' : latestFive.filter(r => r.dividendsPaid != null && r.fcf != null && Math.abs(r.fcf) >= Math.abs(r.dividendsPaid)).length;

  if (rows.length === 0) return <div className="glass-card p-5 text-gray-400">No dividend analytics available.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-300"><Gift size={16} className="text-amber-400" /> Dividend payout and sustainability</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4"><div className="text-xs text-gray-500">Latest Dividend Paid</div><div className="text-xl text-white font-semibold">₹{fmt(latest?.dividendsPaid == null ? null : Math.abs(latest.dividendsPaid))} Cr</div></div>
        <div className="glass-card p-4"><div className="text-xs text-gray-500">Payout Ratio</div><div className="text-xl text-white font-semibold">{pct(latest?.dividendPayout)}</div></div>
        <div className="glass-card p-4"><div className="text-xs text-gray-500">FCF Coverage Years</div><div className="text-xl text-white font-semibold">{coveredYears}/{rows.length}</div></div>
        <div className="glass-card p-4"><div className="text-xs text-gray-500">5Y Sustainability</div><div className="text-xl text-white font-semibold">{sustainability === 'unknown' ? '—' : `${sustainability}/5`}</div></div>
      </div>

      <div className="glass-card p-4 overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead><tr className="border-b border-gray-800 text-gray-400"><th className="text-left py-2">FY</th><th className="text-right py-2">Dividend Paid</th><th className="text-right py-2">PAT</th><th className="text-right py-2">FCF</th><th className="text-right py-2">Payout</th><th className="text-right py-2">FCF Covered</th></tr></thead>
          <tbody>{rows.map(r => {
            const covered = r.dividendsPaid != null && r.fcf != null ? Math.abs(r.fcf) >= Math.abs(r.dividendsPaid) : null;
            return <tr key={r.fy} className="border-b border-gray-900 hover:bg-white/[0.03]"><td className="py-2 text-gray-300">{r.fy}</td><td className="py-2 text-right text-white">₹{fmt(r.dividendsPaid == null ? null : Math.abs(r.dividendsPaid))}</td><td className="py-2 text-right text-white">₹{fmt(r.pat)}</td><td className="py-2 text-right text-white">₹{fmt(r.fcf)}</td><td className="py-2 text-right text-white">{pct(r.dividendPayout)}</td><td className={`py-2 text-right ${covered === true ? 'text-emerald-300' : covered === false ? 'text-rose-300' : 'text-gray-500'}`}>{covered == null ? '—' : covered ? 'yes' : 'no'}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
