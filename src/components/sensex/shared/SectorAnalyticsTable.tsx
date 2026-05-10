import { fmt, fmtN } from '@/components/itc/shared';

export function SectorAnalyticsTable({ data }: {
  data: {
    sector: string; count: number; weightPct: number; marketCapCr: number;
    weightedRoePct: number; weightedValuationMultiple: number; weightedBeta: number;
    weightedCostOfEquityPct: number; weightedPatCagrPct: number;
    valuationLabel: string; internalHHI: number; topConstituent: string;
  }[];
}) {
  return (
    <div className="premium-card overflow-hidden">
      <div className="p-5 pb-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Sector Analytics</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Weight-weighted fundamentals &middot; CAPM cost of equity &middot; intra-sector concentration
          </p>
        </div>
        <span className="pill pill-muted">{data.length} sectors</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full sensex-table tabular-nums">
          <thead>
            <tr>
              <th className="text-left">Sector</th>
              <th className="text-right">Companies</th>
              <th className="text-right">Weight</th>
              <th className="text-right">Market Cap</th>
              <th className="text-right">Wt. ROE</th>
              <th className="text-right">Wt. PAT CAGR</th>
              <th className="text-right">Wt. β</th>
              <th className="text-right">CoE (CAPM)</th>
              <th className="text-right">Wt. Multiple</th>
              <th className="text-right">Intra HHI</th>
              <th className="text-left">Leader</th>
            </tr>
          </thead>
          <tbody>
            {data.map(s => (
              <tr key={s.sector}>
                <td className="text-gray-100 font-semibold">{s.sector}</td>
                <td className="text-right text-gray-300">{s.count}</td>
                <td className="text-right text-[color:var(--color-gold-light)] font-semibold">{fmtN(s.weightPct, 1)}%</td>
                <td className="text-right text-gray-300">{fmt(s.marketCapCr)}</td>
                <td className="text-right text-gray-200">{fmtN(s.weightedRoePct, 1)}%</td>
                <td className={`text-right font-semibold ${s.weightedPatCagrPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {fmtN(s.weightedPatCagrPct, 1)}%
                </td>
                <td className="text-right text-gray-300">{s.weightedBeta.toFixed(2)}</td>
                <td className="text-right text-gray-300">{fmtN(s.weightedCostOfEquityPct, 1)}%</td>
                <td className="text-right text-gray-300">
                  {s.valuationLabel} {fmtN(s.weightedValuationMultiple, 1)}x
                </td>
                <td className="text-right text-gray-400">{s.internalHHI}</td>
                <td className="text-gray-400 text-[11px] font-mono tracking-wider">{s.topConstituent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
