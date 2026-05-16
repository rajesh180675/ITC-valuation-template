import { fmtN } from '@/components/itc/shared';
import { type AnnualReportYearData } from '@/utils/annualReportCashFlow';

/* ── Types ───────────────────────────────────────────────────────────────── */
type BSide = 'assets' | 'liabilities';

interface BSRow {
  label: string;
  vals: (number | null)[];
  isSection: boolean;
  indent: number;
  isTotal: boolean;
}

/* ── Classify flat screener-style rows into Assets vs Liabilities ────────── */
function classifyLabel(label: string): BSide | null {
  const l = label.toLowerCase().replace(/\s+/g, ' ').trim();

  // Assets
  if (
    l.includes('fixed asset') ||
    l === 'cwip' ||
    l.includes('capital work') ||
    l.includes('right of use') ||
    l.includes('goodwill') ||
    l.includes('intangible') ||
    l.includes('investment') ||
    l.includes('deferred tax asset') ||
    l.includes('cash') ||
    l.includes('bank balance') ||
    l.includes('inventor') ||
    l.includes('receivable') ||
    l.includes('trade receiv') ||
    l.includes('prepaid') ||
    l.includes('advance') ||
    l.includes('other assets') ||
    l.includes('other current assets') ||
    l.includes('other non-current assets') ||
    l === 'total assets'
  ) return 'assets';

  // Liabilities
  if (
    l.includes('equity capital') ||
    l === 'equity capital' ||
    l.includes('share capital') ||
    l.includes('reserve') ||
    l.includes('surplus') ||
    l.includes('shareholders') ||
    l.includes('borrowing') ||
    l.includes('long-term liabilit') ||
    l.includes('short-term liabilit') ||
    l.includes('deferred tax liabilit') ||
    l.includes('debt') ||
    l.includes('deposit') ||
    l.includes('payable') ||
    l.includes('trade payable') ||
    l.includes('provision') ||
    l.includes('other liabilit') ||
    l.includes('other current liabilit') ||
    l.includes('other non-current liabilit') ||
    l === 'total liabilities' ||
    l.includes('total equity') ||
    l.includes('net worth') ||
    l.includes('minority interest') ||
    l.includes('non-controlling')
  ) return 'liabilities';

  // Equity capital is commonly just "Equity Capital"
  if (l === 'equity capital') return 'liabilities';

  return null;
}

/* ── Infer side from position using sentinel rows ────────────────────────── */
function inferSide(items: { label: string; type?: string }[], idx: number): BSide | null {
  const direct = classifyLabel(items[idx]?.label ?? '');
  if (direct) return direct;

  const totalLiabIdx = items.findIndex(i => /total\s+liabilit/i.test(i.label));
  const totalAssetsIdx = items.findIndex(i => /total\s+assets?/i.test(i.label));

  if (totalLiabIdx >= 0 && totalAssetsIdx >= 0) {
    if (idx <= totalLiabIdx) return 'liabilities';
    if (idx > totalLiabIdx && idx <= totalAssetsIdx) return 'assets';
  }

  return null;
}

/* ── Build rows for one section ──────────────────────────────────────────── */
function buildRows(
  side: BSide,
  data: Record<string, AnnualReportYearData>,
  years: string[],
): BSRow[] {
  const result: BSRow[] = [];
  const labelToIdx = new Map<string, number>();

  for (const fy of years) {
    const stmt = data[fy]?.balanceSheet;
    if (!stmt?.items?.length) continue;

    const items = stmt.items;
    const hasSections = items.some(i => (i as any).type === 'section');
    const fyIdx = years.indexOf(fy);
    let currentSide: BSide | null = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as any;
      const isSectionRow = item.type === 'section';
      const lower = (item.label as string).toLowerCase();

      if (isSectionRow) {
        // Update current side from section header
        const s = lower.includes('asset') && !lower.includes('liabilit') ? 'assets'
          : lower.includes('equity') || (lower.includes('liabilit') && !lower.includes('asset')) ? 'liabilities'
          : null;
        if (s) currentSide = s;

        if (currentSide === side) {
          if (!labelToIdx.has(item.label)) {
            labelToIdx.set(item.label, result.length);
            result.push({
              label: item.label,
              vals: years.map(() => null),
              isSection: true,
              indent: 0,
              isTotal: false,
            });
          }
        }
        continue;
      }

      // Determine which side this row belongs to
      const rowSide = hasSections ? currentSide : inferSide(items, i);
      if (rowSide !== side) continue;

      const val: number | null = item.current ?? null;
      const isTotal = /^total/i.test(item.label);

      if (labelToIdx.has(item.label)) {
        result[labelToIdx.get(item.label)!].vals[fyIdx] = val;
      } else {
        const vals: (number | null)[] = years.map(() => null);
        vals[fyIdx] = val;
        labelToIdx.set(item.label, result.length);
        result.push({
          label: item.label,
          vals,
          isSection: false,
          indent: hasSections ? 1 : 0,
          isTotal,
        });
      }
    }
  }

  return result;
}

/* ── CAGR helper ─────────────────────────────────────────────────────────── */
function calcCagr(vals: (number | null)[]): string {
  const nonNull = vals.filter((v): v is number => v != null && v !== 0);
  if (nonNull.length < 2) return '';
  const first = nonNull[0];
  const last = nonNull[nonNull.length - 1];
  if (first <= 0) return '';
  const n = vals.filter(v => v != null).length;
  const rate = ((Math.abs(last / first)) ** (1 / (n - 1)) - 1) * (last >= first ? 1 : -1) * 100;
  return (rate >= 0 ? '+' : '') + rate.toFixed(1) + '%';
}

/* ── Format a cell value ─────────────────────────────────────────────────── */
function fmt(v: number | null, commonSize: boolean, base: number | null): string {
  if (v == null) return '—';
  if (commonSize && base != null && base !== 0) {
    return ((v / base) * 100).toFixed(1) + '%';
  }
  return v >= 100 ? fmtN(v, 0) : fmtN(v, 1);
}

/* ── Main component ──────────────────────────────────────────────────────── */
export function BalanceSheetSideBySide({
  data,
  years,
  commonSize,
}: {
  data: Record<string, AnnualReportYearData>;
  years: string[];
  commonSize: boolean;
}) {
  const assetRows = buildRows('assets', data, years);
  const liabRows = buildRows('liabilities', data, years);

  if (assetRows.length === 0 && liabRows.length === 0) {
    return (
      <div className="glass-card p-5 text-gray-400 text-sm text-center">
        No balance sheet data available for the selected years.
      </div>
    );
  }

  // Base values per year for common-size (total assets)
  const baseVals: (number | null)[] = years.map(fy => {
    const items = data[fy]?.balanceSheet?.items ?? [];
    const ta = (items as any[]).find(
      i => /^total\s+assets?$/i.test(i.label) || i.label === 'TOTAL'
    );
    return ta?.current ?? null;
  });

  // Balance check: Total Assets == Total Liabilities per year
  const balanceCheck: (boolean | null)[] = years.map((fy, i) => {
    const items = data[fy]?.balanceSheet?.items ?? [] as any[];
    const ta = (items as any[]).find(i => /^total\s+assets?$/i.test(i.label) || i.label === 'TOTAL');
    const tl = (items as any[]).find(i => /^total\s+liabilit/i.test(i.label));
    if (ta?.current == null || tl?.current == null) return null;
    return Math.abs(ta.current - tl.current) < 1; // within ₹1 Cr tolerance
  });

  const showCagr = years.length >= 2;
  const totalCols = 1 + years.length + (showCagr ? 1 : 0);

  const renderTable = (rows: BSRow[], title: string, accent: string) => {
    if (rows.length === 0) return null;
    return (
      <div>
        <div className={`text-[11px] font-bold tracking-widest uppercase ${accent} mb-2 pl-1`}>
          {title}
        </div>
        <table className="w-full text-xs tabular-nums">
          <colgroup>
            <col style={{ width: '220px', minWidth: '180px' }} />
            {years.map(fy => <col key={fy} style={{ width: '80px', minWidth: '70px' }} />)}
            {showCagr && <col style={{ width: '60px' }} />}
          </colgroup>
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 pr-3 text-gray-500 font-medium text-[11px]">Line Item</th>
              {years.map(fy => (
                <th key={fy} className="text-right py-2 px-1.5 text-gray-500 font-medium text-[11px] whitespace-nowrap">
                  {fy.replace('FY', "'")}
                </th>
              ))}
              {showCagr && (
                <th className="text-right py-2 pl-2 text-gray-500 font-medium text-[11px]">CAGR</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              if (row.isSection) {
                return (
                  <tr key={ri}>
                    <td
                      colSpan={totalCols}
                      className="pt-3 pb-1 text-[11px] font-semibold text-emerald-400 border-b border-emerald-500/20"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              if (row.vals.every(v => v == null)) return null;

              const cagrStr = showCagr ? calcCagr(row.vals) : '';
              const isPositiveCagr = cagrStr.startsWith('+');
              const isNegativeCagr = cagrStr.startsWith('-');

              return (
                <tr
                  key={ri}
                  className={`hover:bg-white/[0.03] transition-colors ${row.isTotal ? 'border-t border-gray-700 font-semibold' : ''}`}
                >
                  <td
                    className={`py-1 pr-3 text-[11px] truncate max-w-[220px] ${row.isTotal ? 'text-white' : 'text-gray-300'}`}
                    style={{ paddingLeft: row.indent * 14 }}
                    title={row.label}
                  >
                    {row.label}
                  </td>
                  {row.vals.map((v, ci) => (
                    <td
                      key={ci}
                      className={`text-right py-1 px-1.5 text-[11px] ${
                        v != null
                          ? row.isTotal ? 'text-white font-semibold' : 'text-gray-200'
                          : 'text-gray-700'
                      }`}
                    >
                      {fmt(v, commonSize, baseVals[ci])}
                    </td>
                  ))}
                  {showCagr && (
                    <td className={`text-right py-1 pl-2 text-[11px] font-medium ${
                      isPositiveCagr ? 'text-emerald-400' :
                      isNegativeCagr ? 'text-rose-400' :
                      'text-gray-600'
                    }`}>
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
  };

  return (
    <div className="glass-card p-5 overflow-x-auto">
      {/* Balance check banner */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[11px] text-gray-500">Balance check:</span>
        {years.map((fy, i) => {
          const ok = balanceCheck[i];
          if (ok === null) return null;
          return (
            <span
              key={fy}
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                ok
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
              title={ok ? 'Assets = Liabilities ✓' : 'Assets ≠ Liabilities — data may be incomplete'}
            >
              {fy.replace('FY', "'")} {ok ? '✓' : '✗'}
            </span>
          );
        })}
        {commonSize && (
          <span className="ml-auto text-[10px] text-purple-400">
            Common-size: % of Total Assets
          </span>
        )}
      </div>

      {/* Equity & Liabilities first (screener data order) */}
      {renderTable(liabRows, 'Equity & Liabilities', 'text-blue-400')}

      {liabRows.length > 0 && assetRows.length > 0 && (
        <div className="border-t border-gray-800 my-5" />
      )}

      {/* Assets */}
      {renderTable(assetRows, 'Assets', 'text-emerald-400')}
    </div>
  );
}
