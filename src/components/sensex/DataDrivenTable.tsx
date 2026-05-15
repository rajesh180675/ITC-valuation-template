import React, { useMemo } from 'react';
import { fmtN } from '@/components/itc/shared';
import { type AnnualReportYearData } from '@/utils/annualReportCashFlow';

/* ── Data-Driven Table ───────────────────────────────────────────────────── */
export function DataDrivenTable({ data, years, stmtType, commonSize }: {
  data: Record<string, AnnualReportYearData>; years: string[]; stmtType: 'profitLoss' | 'balanceSheet' | 'cashFlow'; commonSize: boolean;
}) {
  const { groups, itemIndex, baseValues } = useMemo(() => {
    const latestYear = years[years.length - 1];
    const latestStmt = data[latestYear]?.[stmtType];
    const latestLabels = latestStmt?.items ?? [];

    const groups: { header: string; rows: string[] }[] = [];
    let currentHeader = '';
    let currentRows: string[] = [];
    const seenLabels = new Set<string>();

    for (const item of latestLabels) {
      if (item.type === 'section') {
        if (currentRows.length) groups.push({ header: currentHeader, rows: currentRows });
        currentHeader = item.label;
        currentRows = [];
      } else {
        seenLabels.add(item.label);
        currentRows.push(item.label);
      }
    }
    if (currentRows.length) groups.push({ header: currentHeader, rows: currentRows });

    for (const fy of years) {
      const stmt = data[fy]?.[stmtType];
      if (!stmt) continue;
      let activeSection = '';
      for (const item of stmt.items) {
        if (item.type === 'section') {
          activeSection = item.label;
        } else if (!seenLabels.has(item.label)) {
          seenLabels.add(item.label);
          const groupIdx = groups.findIndex(g => g.header === activeSection);
          if (groupIdx >= 0) {
            groups[groupIdx].rows.push(item.label);
          } else {
            groups.push({ header: activeSection || 'OTHER', rows: [item.label] });
          }
        }
      }
    }

    const index: Record<string, (number | null)[]> = {};
    for (const group of groups) {
      for (const label of group.rows) {
        index[label] = years.map(fy => {
          const stmt = data[fy]?.[stmtType];
          if (!stmt) return null;
          const match = stmt.items.find(i => i.label === label);
          return match?.current ?? null;
        });
      }
    }

    const baseVals: (number | null)[] = years.map(fy => {
      const stmt = data[fy]?.[stmtType];
      if (!stmt) return null;
      if (stmtType === 'profitLoss') {
        const rev = stmt.items.find(i => i.label.toLowerCase().includes('revenue from operations'));
        return rev?.current ?? null;
      } else if (stmtType === 'balanceSheet') {
        const ta = stmt.items.find(i => i.label.toLowerCase().includes('total assets') || i.label === 'TOTAL');
        return ta?.current ?? null;
      }
      return null;
    });

    return { groups, itemIndex: index, baseValues: baseVals };
  }, [data, years, stmtType]);

  const hasData = groups.some(g => g.rows.length > 0);
  if (!hasData) return <div className="glass-card p-5 text-gray-400">No data for selected years.</div>;

  const colLabel = stmtType === 'profitLoss' ? 'Income Statement' :
                  stmtType === 'balanceSheet' ? 'Balance Sheet' : 'Cash Flow';

  const formatVal = (v: number | null, isBase: boolean): string => {
    if (v == null) return '\u2014';
    if (commonSize && !isBase) return (v * 100).toFixed(1) + '%';
    return v >= 100 ? fmtN(v, 0) : fmtN(v, 1);
  };

  // Compute YoY growth for a value relative to its previous year
  const yoyGrowth = (curr: number | null, prev: number | null): number | null => {
    if (curr == null || prev == null || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  // Style for YoY values
  const yoyClass = (g: number | null): string => {
    if (g == null) return 'text-gray-600';
    if (g > 5) return 'text-emerald-400';
    if (g < -5) return 'text-rose-400';
    return 'text-gray-400';
  };

  const showYoy = stmtType === 'profitLoss' && years.length >= 2 && !commonSize;

  return (
    <div className="glass-card p-5 overflow-x-auto">
      {commonSize && (
        <div className="text-[10px] text-purple-400 mb-3">
          Common-size: Items shown as % of {stmtType === 'profitLoss' ? 'Revenue' : 'Total Assets'}
        </div>
      )}
      <table className="w-full text-xs tabular-nums" style={{ minWidth: 600 }}>
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 text-gray-400 font-medium">{colLabel}</th>
            {years.map(fy => {
              const yd = data[fy];
              const qFlags = (yd as any)?.metadata?.qualityFlags;
              return (
                <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">
                  {fy.replace('FY', "FY '")}
                  {qFlags?.length > 0 && <span className="text-amber-500 ml-0.5" title={qFlags.join('; ')}>⚠</span>}
                </th>
              );
            })}
            {showYoy && years.slice(1).map(fy => (
              <th key={`yoy-${fy}`} className="text-right py-2 px-2 text-gray-400 font-medium">YoY</th>
            ))}
            {years.length >= 2 && <th className="text-right py-2 pl-2 text-gray-400 font-medium">CAGR</th>}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gi) => (
            <React.Fragment key={`g${gi}`}>
              {group.header && group.header !== 'OTHER' && (
                <tr><td className="text-[11px] font-bold text-emerald-300 pt-3 pb-1 border-b border-emerald-500/20" colSpan={years.length + (showYoy ? years.length - 1 : 0) + 2}>{group.header}</td></tr>
              )}
              {group.rows.map((label, ri) => {
                const vals = itemIndex[label];
                if (!vals || vals.every(v => v == null)) return null;

                const validVals = vals.filter(v => v != null && v !== 0) as number[];
                const first = validVals[0];
                const last = validVals[validVals.length - 1];
                const numYears = vals.filter(v => v != null).length;
                let cagrStr = '';
                if (first && last && first > 0 && numYears >= 2) {
                  cagrStr = (((Math.abs(last / first)) ** (1 / (numYears - 1)) - 1) * (last >= first ? 1 : -1) * 100).toFixed(1) + '%';
                }

                const isBase = label.toLowerCase().includes('revenue from operations') || label.toLowerCase().includes('total assets') || label === 'TOTAL';
                const needsBaseDiv = commonSize && !isBase;

                return (
                  <tr key={`${gi}-${ri}`} className="hover:bg-white/[0.03]">
                    <td className="py-1 pr-4 text-gray-300 text-[11px] truncate max-w-[200px]">{label}</td>
                    {vals.map((v, i) => {
                      const div = needsBaseDiv ? baseValues[i] : null;
                      const displayVal = v != null && div != null && div !== 0 ? v / div : v;
                      return (
                        <td key={i} className={`text-right py-1 px-2 text-[11px] ${v != null ? 'text-white' : 'text-gray-600'}`}>
                          {v != null && v !== 0 ? formatVal(displayVal, isBase) : '\u2014'}
                        </td>
                      );
                    })}
                    {showYoy && vals.slice(1).map((v, i) => {
                      const prevVal = vals[i];
                      const growth = yoyGrowth(v, prevVal);
                      return (
                        <td key={`yoy-${i}`} className={`text-right py-1 px-2 text-[11px] ${yoyClass(growth)}`}>
                          {growth != null ? `${growth > 0 ? '\u25B2' : '\u25BC'} ${Math.abs(growth).toFixed(1)}%` : '\u2014'}
                        </td>
                      );
                    })}
                    <td className={`text-right py-1 pl-2 text-[11px] ${cagrStr.startsWith('-') ? 'text-rose-400' : cagrStr ? 'text-emerald-400' : 'text-gray-600'}`}>
                      {cagrStr}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
