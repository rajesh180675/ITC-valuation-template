import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, TrendingUp, PieChart, Layers, DollarSign } from 'lucide-react';
import { fmt, fmtN } from '@/components/itc/shared';

type Tab = 'pnl' | 'balanceSheet' | 'cashFlow' | 'segments';

interface Item {
  type: string; label: string; note_ref: string;
  current: number | null; prior: number | null; section: string | null;
}

interface Statement {
  fy: string; items: Item[]; kpIs: Record<string, number | null>;
}

interface YearData {
  profitLoss?: Statement;
  balanceSheet?: Statement;
  cashFlow?: Statement;
}

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'pnl', label: 'P&L', icon: TrendingUp },
  { id: 'balanceSheet', label: 'Balance Sheet', icon: PieChart },
  { id: 'cashFlow', label: 'Cash Flow', icon: DollarSign },
  { id: 'segments', label: 'Segments', icon: Layers },
];

// ── Group rows by sections found in the actual data ────────────────────────
function useRowGroups(items: Item[]) {
  return useMemo(() => {
    const groups: { header: string; rows: Item[] }[] = [];
    let currentHeader = 'GENERAL';
    let currentRows: Item[] = [];

    for (const item of items) {
      if (item.type === 'section') {
        if (currentRows.length) groups.push({ header: currentHeader, rows: currentRows });
        currentHeader = item.label;
        currentRows = [];
      } else {
        currentRows.push(item);
      }
    }
    if (currentRows.length) groups.push({ header: currentHeader, rows: currentRows });
    return groups;
  }, [items]);
}

// ── Component ───────────────────────────────────────────────────────────────
export function AnnualReportsSection() {
  const [data, setData] = useState<Record<string, YearData> | null>(null);
  const [segData, setSegData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('pnl');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/data/ar/ITC.json').then(r => r.json()),
      fetch('/data/segment_data_itc.json').then(r => r.json()),
    ]).then(([ar, seg]) => {
      setData(ar.years);
      setSegData(seg);
      setSelectedYears(Object.keys(ar.years).sort().slice(-5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="glass-card p-8 text-center text-gray-400">Loading annual report data…</div>;
  if (!data) return <div className="glass-card p-8 text-center text-gray-400">No data available. Run <code className="text-emerald-400">python scripts/extract_ar.py</code> first.</div>;

  const years = Object.keys(data).sort();
  const displayYears = selectedYears.length > 0 ? selectedYears : years.slice(-5);

  // Get items for current tab from latest year to determine row groups
  const getStmtType = (t: Tab): keyof YearData =>
    t === 'pnl' ? 'profitLoss' : t === 'balanceSheet' ? 'balanceSheet' : 'cashFlow';

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 border border-emerald-500/20 flex items-center justify-center">
            <BookOpen size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Annual Reports</h1>
            <p className="text-xs text-gray-400">ITC Limited · {years.length} years · {tab.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {years.map(fy => (
            <button key={fy} onClick={() => setSelectedYears(prev =>
              prev.includes(fy) ? prev.filter(y => y !== fy) : [...prev, fy].sort()
            )}
              className={`px-2.5 py-1 text-[11px] rounded-md font-mono transition-all ${
                selectedYears.includes(fy)
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-gray-800/50 text-gray-400 border border-transparent hover:text-gray-200'
              }`}
            >{fy.replace('FY', "'")}</button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                tab === t.id ? 'text-emerald-300 border-emerald-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
            ><Icon size={16} /> {t.label}</button>
          );
        })}
      </div>

      {/* Content */}
      {tab === 'segments'
        ? <SegmentsView segData={segData} />
        : <DataDrivenTable data={data} years={displayYears} stmtType={getStmtType(tab)} />
      }
    </div>
  );
}

// ── Data-Driven Table (shows EVERYTHING from the JSON) ─────────────────────
function DataDrivenTable({ data, years, stmtType }: {
  data: Record<string, YearData>; years: string[]; stmtType: keyof YearData;
}) {
  // Build row groups from the union of all items across all years
  const { groups, itemIndex } = useMemo(() => {
    // Collect all unique labels (preserving order from the latest year)
    const latestYear = years[years.length - 1];
    const latestStmt = data[latestYear]?.[stmtType];
    const allItems = latestStmt?.items ?? [];

    // Build groups from latest year's structure
    const groups: { header: string; rows: string[] }[] = [];
    let currentHeader = '';
    let currentRows: string[] = [];

    for (const item of allItems) {
      if (item.type === 'section') {
        if (currentRows.length) groups.push({ header: currentHeader, rows: currentRows });
        currentHeader = item.label;
        currentRows = [];
      } else {
        currentRows.push(item.label);
      }
    }
    if (currentRows.length) groups.push({ header: currentHeader, rows: currentRows });

    // Build index: label -> per-year values
    const index: Record<string, (number | null)[]> = {};
    for (const group of groups) {
      for (const label of group.rows) {
        const vals = years.map(fy => {
          const stmt = data[fy]?.[stmtType];
          if (!stmt) return null;
          const match = stmt.items.find((i: Item) => i.label === label);
          return match?.current ?? null;
        });
        index[label] = vals;
      }
    }

    return { groups, itemIndex: index };
  }, [data, years, stmtType]);

  const hasData = groups.some(g => g.rows.length > 0);
  if (!hasData) return <div className="glass-card p-5 text-gray-400">No data for this statement in selected years.</div>;

  const colLabel = stmtType === 'profitLoss' ? 'Income Statement' :
                  stmtType === 'balanceSheet' ? 'Balance Sheet' : 'Cash Flow';

  return (
    <div className="glass-card p-5 overflow-x-auto">
      <table className="w-full text-xs tabular-nums" style={{ minWidth: 600 }}>
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 text-gray-400 font-medium">{colLabel}</th>
            {years.map(fy => (
              <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "FY '")}</th>
            ))}
            <th className="text-right py-2 pl-2 text-gray-400 font-medium">CAGR</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gi) => (
            <React.Fragment key={`${group.header}-${gi}`}>
              {/* Section header row */}
              {group.header && group.header !== 'GENERAL' && (
                <tr>
                  <td className="text-[11px] font-bold text-emerald-300 pt-3 pb-1 border-b border-emerald-500/20" colSpan={years.length + 2}>
                    {group.header}
                  </td>
                </tr>
              )}
              {group.rows.map((label, ri) => {
                const vals = itemIndex[label];
                if (!vals || vals.every(v => v === null || v === undefined)) return null;

                // CAGR from first non-null to last non-null
                const validVals = vals.filter(v => v !== null && v !== 0) as number[];
                const first = validVals[0];
                const last = validVals[validVals.length - 1];
                const numYears = vals.filter(v => v !== null).length;
                let cagr = '';
                if (first && last && first > 0 && numYears >= 2) {
                  cagr = (((Math.abs(last / first)) ** (1 / (numYears - 1)) - 1) * (last >= first ? 1 : -1) * 100).toFixed(1) + '%';
                }

                return (
                  <tr key={`${gi}-${ri}`} className="hover:bg-white/[0.03]">
                    <td className="py-1 pr-4 text-gray-300 text-[11px] truncate max-w-[200px]">{label}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={`text-right py-1 px-2 text-[11px] ${
                        v !== null ? 'text-white' : 'text-gray-600'
                      }`}>
                        {v !== null ? fmtN(Math.abs(v), v >= 100 ? 0 : 1) : '—'}
                      </td>
                    ))}
                    <td className={`text-right py-1 pl-2 text-[11px] ${
                      cagr.startsWith('-') ? 'text-rose-400' : cagr ? 'text-emerald-400' : 'text-gray-600'
                    }`}>
                      {cagr}
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

// ── Segments Tab ───────────────────────────────────────────────────────────
function SegmentsView({ segData }: { segData: any }) {
  const series = segData?.segment_time_series;
  if (!series || Object.keys(series).length === 0) {
    return <div className="glass-card p-5 text-center text-gray-400">
      No segment data. Run <code className="text-emerald-400">python scripts/extract_itc_segments.py</code>.
    </div>;
  }

  const sectionLabels: Record<string, string> = {
    revenue: 'Segment Revenue', results: 'Segment Results',
    assets: 'Segment Assets', liabilities: 'Segment Liabilities',
  };

  const allFys = new Set<string>();
  Object.values(series as Record<string, Record<string, number>>).forEach(v =>
    Object.keys(v).forEach(fy => allFys.add(fy))
  );
  const fys = [...allFys].sort();

  return (
    <div className="space-y-6">
      {Object.entries(sectionLabels).map(([prefix, title]) => {
        const items = Object.entries(series as Record<string, Record<string, number>>)
          .filter(([k]) => k.startsWith(prefix + '|'))
          .sort();
        if (items.length === 0) return null;
        return (
          <div key={prefix} className="glass-card p-5 overflow-x-auto">
            <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
            <table className="w-full text-xs tabular-nums" style={{ minWidth: 500 }}>
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 text-gray-400 font-medium">Segment</th>
                  {fys.map(fy => (
                    <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">
                      {fy.replace('FY', "'")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(([key, vals]) => {
                  const name = key.split('|').slice(1).join('|');
                  return (
                    <tr key={key} className="hover:bg-white/[0.03]">
                      <td className="py-1.5 pr-4 text-gray-300 text-[11px]">{name}</td>
                      {fys.map(fy => (
                        <td key={fy} className={`text-right py-1.5 px-2 text-[11px] ${vals[fy] ? 'text-white' : 'text-gray-600'}`}>
                          {vals[fy] ? fmtN(vals[fy], 0) : '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}