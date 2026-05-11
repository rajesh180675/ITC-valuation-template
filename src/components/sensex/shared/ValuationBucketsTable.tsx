import type { ValuationBuckets } from '@/utils/sensexAnalytics';

export function ValuationBucketsTable({ buckets }: { buckets: ValuationBuckets[] }) {
  if (buckets.length === 0) return null;

  const fmtPct = (v: number) => `${v.toFixed(1)}%`;
  const fmtCr = (v: number) => v >= 10000 ? `₹${(v / 10000).toFixed(1)}L Cr` : `₹${v.toFixed(0)} Cr`;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Valuation Buckets by Sector</h3>
      <p className="text-[11px] text-gray-500">
        Companies classified as <span className="text-emerald-400">Cheap</span> (z &lt; −1),{' '}
        <span className="text-gray-300">Fair</span> (−1 ≤ z ≤ 1), or{' '}
        <span className="text-rose-400">Expensive</span> (z &gt; 1) relative to sector median.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] sensex-table tabular-nums">
          <thead>
            <tr>
              <th className="text-left">Sector</th>
              <th className="text-right">Total</th>
              <th className="text-right text-emerald-400">Cheap</th>
              <th className="text-right text-emerald-400">Cheap %</th>
              <th className="text-right text-gray-300">Fair</th>
              <th className="text-right text-gray-300">Fair %</th>
              <th className="text-right text-rose-400">Expensive</th>
              <th className="text-right text-rose-400">Exp %</th>
              <th className="text-right">Cheap Mcap</th>
              <th className="text-right">Fair Mcap</th>
              <th className="text-right">Exp Mcap</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.sector}>
                <td className="text-left font-medium text-gray-200">{b.sector}</td>
                <td className="text-right">{b.total}</td>
                <td className="text-right text-emerald-400">{b.cheap}</td>
                <td className="text-right text-emerald-400">{fmtPct(b.cheapPct)}</td>
                <td className="text-right">{b.fair}</td>
                <td className="text-right">{fmtPct(b.fairPct)}</td>
                <td className="text-right text-rose-400">{b.expensive}</td>
                <td className="text-right text-rose-400">{fmtPct(b.expensivePct)}</td>
                <td className="text-right">{fmtCr(b.cheapMcapCr)}</td>
                <td className="text-right">{fmtCr(b.fairMcapCr)}</td>
                <td className="text-right">{fmtCr(b.expensiveMcapCr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}