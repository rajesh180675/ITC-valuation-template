import { BookOpen, TrendingUp } from 'lucide-react';
import { fmtN } from '@/components/itc/shared';
import { type AnnualReportYearData } from '@/utils/annualReportCashFlow';

/* ── Balance Sheet Side-by-Side View ──────────────────────────────────────── */
export function BalanceSheetSideBySide({ data, years, commonSize }: { data: Record<string, AnnualReportYearData>; years: string[]; commonSize: boolean; }) {
  // Alternative simpler approach: two-pass scan (used instead of getSideItems above)
  const getItemsSimple = (side: 'assets' | 'equityLiabilities') => {
    const result: { label: string; vals: (number | null)[]; isSection: boolean; indent: number }[] = [];
    const seenLabels = new Set<string>();

    for (const fy of years) {
      const stmt = data[fy]?.balanceSheet;
      if (!stmt) continue;
      let indent = 0;
      let currentSide: 'assets' | 'equityLiabilities' | null = null;
      let afterTotal = false;

      for (const item of stmt.items) {
        const lower = item.label.toLowerCase();

        // Detect which side we're on based on section headers
        if (item.type === 'section') {
          if (lower.includes('asset') && !lower.includes('liabilit')) {
            currentSide = 'assets';
            indent = 0;
          } else if (lower.includes('equity') || (lower.includes('liabilit') && !lower.includes('asset'))) {
            currentSide = 'equityLiabilities';
            indent = 0;
          } else if (lower.includes('total')) {
            // Keep current side, just track that it's a total row
            afterTotal = true;
          }

          if (currentSide === side) {
            if (!seenLabels.has(item.label)) {
              seenLabels.add(item.label);
              result.push({ label: item.label, vals: years.map(() => null), isSection: true, indent });
            }
          }
          continue;
        }

        if (currentSide !== side) continue;

        const existingIdx = result.findIndex(i => i.label === item.label);
        const yearIdx = years.indexOf(fy);
        if (existingIdx >= 0) {
          result[existingIdx].vals[yearIdx] = item.current ?? null;
        } else {
          const vals: (number | null)[] = years.map(() => null);
          vals[yearIdx] = item.current ?? null;
          result.push({ label: item.label, vals, isSection: false, indent: afterTotal ? 0 : 1 });
        }
        afterTotal = false;
      }
    }
    return result;
  };

  const assetItems = getItemsSimple('assets');
  const equityLiabItems = getItemsSimple('equityLiabilities');

  if (assetItems.length === 0 && equityLiabItems.length === 0) {
    return <div className="glass-card p-5 text-gray-400">No balance sheet data.</div>;
  }

  const formatVal = (v: number | null): string => {
    if (v == null) return '\u2014';
    if (commonSize) return (v * 100).toFixed(1) + '%';
    return v >= 100 ? fmtN(v, 0) : fmtN(v, 1);
  };

  const renderSideTable = (items: typeof assetItems, title: string) => (
    <div className="glass-card p-4 overflow-x-auto flex-1 min-w-[300px]">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        {title === 'ASSETS' ? <BookOpen size={14} className="text-emerald-400" /> : <TrendingUp size={14} className="text-blue-400" />}
        {title}
      </h3>
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 text-gray-400 font-medium">Item</th>
            {items[0]?.vals.map((_, i) => {
              if (i !== items[0].vals.length - 1) return null;
              return <th key={i} className="text-right py-2 px-2 text-gray-400 font-medium">{years[i]?.replace('FY', "FY '")}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((row, ri) => {
            if (row.isSection) {
              return <tr key={ri}><td className="text-[11px] font-bold text-emerald-300 pt-3 pb-1 border-b border-emerald-500/20" colSpan={2}>{row.label}</td></tr>;
            }
            const lastVal = row.vals[row.vals.length - 1];
            // Skip rows with no data in latest year
            if (lastVal == null) return null;
            return (
              <tr key={ri} className="hover:bg-white/[0.03]">
                <td className="py-1 pr-4 text-gray-300 text-[11px] truncate max-w-[200px]" style={{ paddingLeft: (row.indent * 12) + 0 }}>{row.label}</td>
                <td className="text-right py-1 px-2 text-[11px] text-white">{formatVal(lastVal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {renderSideTable(assetItems, 'ASSETS')}
      {renderSideTable(equityLiabItems, 'EQUITY & LIABILITIES')}
    </div>
  );
}
