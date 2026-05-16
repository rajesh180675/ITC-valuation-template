import { BookOpen, TrendingUp } from 'lucide-react';
import { fmtN } from '@/components/itc/shared';
import { type AnnualReportYearData } from '@/utils/annualReportCashFlow';

/* ── Balance Sheet Side-by-Side View ──────────────────────────────────────── */
type BalanceSheetSide = 'assets' | 'equityLiabilities';
type SideRow = { label: string; vals: (number | null)[]; isSection: boolean; indent: number };

function classifyFlatBalanceSheetRow(label: string): BalanceSheetSide | null {
  const lower = label.toLowerCase().replace(/\s+/g, ' ').trim();

  if (
    lower.includes('asset') ||
    lower.includes('fixed asset') ||
    lower === 'cwip' ||
    lower.includes('capital work') ||
    lower.includes('investment') ||
    lower.includes('cash') ||
    lower.includes('bank') ||
    lower.includes('inventor') ||
    lower.includes('receivable') ||
    lower.includes('loan') ||
    lower.includes('advance')
  ) {
    return 'assets';
  }

  if (
    lower.includes('liabilit') ||
    lower.includes('equity') ||
    lower.includes('capital') ||
    lower.includes('reserve') ||
    lower.includes('borrowing') ||
    lower.includes('borrowings') ||
    lower.includes('debt') ||
    lower.includes('deposit') ||
    lower.includes('payable') ||
    lower.includes('provision')
  ) {
    return 'equityLiabilities';
  }

  return null;
}

function inferFlatBalanceSheetSide(items: { label: string }[], index: number): BalanceSheetSide | null {
  const direct = classifyFlatBalanceSheetRow(items[index]?.label ?? '');
  if (direct) return direct;

  const totalLiabIdx = items.findIndex(i => /total\s+liabilit/i.test(i.label));
  const totalAssetsIdx = items.findIndex(i => /total\s+assets?/i.test(i.label));

  // Screener-style flat AR data usually orders: liabilities block, total liabilities,
  // assets block, total assets. Use those sentinel rows when labels are generic.
  if (totalLiabIdx >= 0 && totalAssetsIdx >= 0) {
    if (index <= totalLiabIdx) return 'equityLiabilities';
    if (index > totalLiabIdx && index <= totalAssetsIdx) return 'assets';
  }

  return null;
}

function sectionSide(label: string): BalanceSheetSide | null {
  const lower = label.toLowerCase();
  if (lower.includes('asset') && !lower.includes('liabilit')) return 'assets';
  if (lower.includes('equity') || (lower.includes('liabilit') && !lower.includes('asset'))) return 'equityLiabilities';
  return null;
}

export function BalanceSheetSideBySide({ data, years, commonSize }: { data: Record<string, AnnualReportYearData>; years: string[]; commonSize: boolean; }) {
  const getItemsSimple = (side: BalanceSheetSide): SideRow[] => {
    const result: SideRow[] = [];
    const seenLabels = new Set<string>();

    for (const fy of years) {
      const stmt = data[fy]?.balanceSheet;
      if (!stmt?.items?.length) continue;
      const hasSections = stmt.items.some(item => item.type === 'section');
      let indent = 0;
      let currentSide: BalanceSheetSide | null = null;
      let afterTotal = false;

      for (let itemIdx = 0; itemIdx < stmt.items.length; itemIdx++) {
        const item = stmt.items[itemIdx];
        const lower = item.label.toLowerCase();
        const yearIdx = years.indexOf(fy);

        if (item.type === 'section') {
          currentSide = sectionSide(item.label) ?? currentSide;
          if (sectionSide(item.label)) indent = 0;
          if (lower.includes('total')) afterTotal = true;

          if (currentSide === side && !seenLabels.has(item.label)) {
            seenLabels.add(item.label);
            result.push({ label: item.label, vals: years.map(() => null), isSection: true, indent });
          }
          continue;
        }

        const rowSide = hasSections ? currentSide : inferFlatBalanceSheetSide(stmt.items, itemIdx);
        if (rowSide !== side) continue;

        const existingIdx = result.findIndex(i => i.label === item.label);
        if (existingIdx >= 0) {
          result[existingIdx].vals[yearIdx] = item.current ?? null;
        } else {
          const vals: (number | null)[] = years.map(() => null);
          vals[yearIdx] = item.current ?? null;
          result.push({ label: item.label, vals, isSection: false, indent: hasSections && !afterTotal ? 1 : 0 });
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
    if (v == null) return '—';
    if (commonSize) return (v * 100).toFixed(1) + '%';
    return v >= 100 ? fmtN(v, 0) : fmtN(v, 1);
  };

  const showCagr = years.length >= 2;
  // colSpan = label col + one col per year + optional CAGR col
  const totalCols = 1 + years.length + (showCagr ? 1 : 0);

  const renderSideTable = (items: SideRow[], title: string) => (
    <div className="glass-card p-4 overflow-x-auto flex-1 min-w-[300px]">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        {title === 'ASSETS' ? <BookOpen size={14} className="text-emerald-400" /> : <TrendingUp size={14} className="text-blue-400" />}
        {title}
      </h3>
      <table className="w-full text-xs tabular-nums" style={{ minWidth: Math.max(360, 160 + years.length * 80) }}>
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 text-gray-400 font-medium">Item</th>
            {years.map(fy => (
              <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium whitespace-nowrap">
                {fy.replace('FY', "FY '")}
              </th>
            ))}
            {showCagr && <th className="text-right py-2 pl-2 text-gray-400 font-medium">CAGR</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((row, ri) => {
            if (row.isSection) {
              return (
                <tr key={ri}>
                  <td
                    className="text-[11px] font-bold text-emerald-300 pt-3 pb-1 border-b border-emerald-500/20"
                    colSpan={totalCols}
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            // Skip rows with no data at all
            if (row.vals.every(v => v == null)) return null;

            // CAGR across years that have data
            const validVals = row.vals.filter((v): v is number => v != null && v !== 0);
            const firstVal = validVals[0];
            const lastVal = validVals[validVals.length - 1];
            const numYears = row.vals.filter(v => v != null).length;
            let cagrStr = '';
            if (firstVal && lastVal && firstVal > 0 && numYears >= 2) {
              const rate = ((Math.abs(lastVal / firstVal)) ** (1 / (numYears - 1)) - 1) * (lastVal >= firstVal ? 1 : -1) * 100;
              cagrStr = rate.toFixed(1) + '%';
            }

            return (
              <tr key={ri} className="hover:bg-white/[0.03]">
                <td
                  className="py-1 pr-4 text-gray-300 text-[11px] truncate max-w-[200px]"
                  style={{ paddingLeft: row.indent * 12 }}
                >
                  {row.label}
                </td>
                {row.vals.map((v, i) => (
                  <td key={i} className={`text-right py-1 px-2 text-[11px] ${v != null ? 'text-white' : 'text-gray-600'}`}>
                    {v != null ? formatVal(v) : '—'}
                  </td>
                ))}
                {showCagr && (
                  <td className={`text-right py-1 pl-2 text-[11px] ${cagrStr.startsWith('-') ? 'text-rose-400' : cagrStr ? 'text-emerald-400' : 'text-gray-600'}`}>
                    {cagrStr || '—'}
                  </td>
                )}
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
