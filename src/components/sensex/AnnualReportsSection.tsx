import { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, PieChart, Layers, BarChart3, DollarSign, Activity } from 'lucide-react';
import { fmt, fmtN } from '@/components/itc/shared';
import { Kpi } from './shared';

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

interface ARDataset {
  ticker: string; years: Record<string, YearData>; metadata: Record<string, string>;
}

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'pnl', label: 'P&L', icon: TrendingUp },
  { id: 'balanceSheet', label: 'Balance Sheet', icon: PieChart },
  { id: 'cashFlow', label: 'Cash Flow', icon: DollarSign },
  { id: 'segments', label: 'Segments', icon: Layers },
];

const ROW_GROUPS: Record<string, { label: string; keys: string[] }[]> = {
  pnl: [
    { label: 'REVENUE', keys: ['revenue from operations', 'other income', 'total income'] },
    { label: 'EXPENSES', keys: ['cost of materials consumed', 'purchases of stock-in-trade',
      'changes in inventories of finished goods', 'excise duty', 'employee benefits expense',
      'finance costs', 'depreciation and amortization', 'other expenses', 'total expenses'] },
    { label: 'PROFITABILITY', keys: ['profit before exceptional', 'exceptional items',
      'profit before tax', 'current tax', 'deferred tax', 'tax expense',
      'profit for the year from continuing', 'profit for the year'] },
    { label: 'PER SHARE', keys: ['earning per share'] },
  ],
  cashFlow: [
    { label: 'OPERATING', keys: ['profit before tax', 'depreciation', 'working capital',
      'cash generated from operations', 'net cash from operating', 'net cash flow from operating'] },
    { label: 'INVESTING', keys: ['purchase of fixed assets', 'sale of fixed assets',
      'net cash used in investing', 'net cash flow from investing'] },
    { label: 'FINANCING', keys: ['proceeds from borrowings', 'repayment of borrowings',
      'dividend paid', 'net cash from financing', 'net cash flow from financing'] },
    { label: 'SUMMARY', keys: ['net increase in cash', 'cash and cash equivalents at the end',
      'cash and cash equivalents at beginning'] },
  ],
};

export function AnnualReportsSection() {
  const [data, setData] = useState<ARDataset | null>(null);
  const [segData, setSegData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('pnl');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/data/ar/ITC.json').then(r => r.json()),
      fetch('/data/segment_data_itc.json').then(r => r.json()),
    ]).then(([ar, seg]) => {
      setData(ar);
      setSegData(seg);
      setSelectedYears(Object.keys(ar.years).sort().slice(-5));
    });
  }, []);

  if (!data) {
    return <div className="glass-card p-8 text-center text-gray-400 animate-pulse">Loading annual report data…</div>;
  }

  const years = Object.keys(data.years).sort();
  const displayYears = selectedYears.length > 0 ? selectedYears : years.slice(-5);

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
            <p className="text-xs text-gray-400">
              ITC Limited · {data.metadata.source} · {years.length} years · {tab.toUpperCase()} view
            </p>
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
      {tab === 'pnl' && <StatementTable data={data} years={displayYears} stmtType="profitLoss" groups={ROW_GROUPS.pnl} />}
      {tab === 'balanceSheet' && <StatementTable data={data} years={displayYears} stmtType="balanceSheet" groups={[]} />}
      {tab === 'cashFlow' && <StatementTable data={data} years={displayYears} stmtType="cashFlow" groups={ROW_GROUPS.cashFlow} />}
      {tab === 'segments' && <SegmentsView segData={segData} />}
    </div>
  );
}

/* ── Reusable Statement Table ─────────────────────────────────────────────── */
function StatementTable({ data, years, stmtType, groups }: {
  data: ARDataset; years: string[]; stmtType: string; groups: { label: string; keys: string[] }[];
}) {
  const columnLabel = stmtType === 'profitLoss' ? 'P&L Item' : stmtType === 'balanceSheet' ? 'Balance Sheet Item' : 'Cash Flow Item';

  // KPI cards
  const kpiKeys = data.years[years[years.length - 1]]?.[stmtType as keyof YearData]?.kpIs;
  const kpiCards = kpiKeys ? Object.entries(kpiKeys).filter(([k, v]) => v !== null && k !== 'epsRs').slice(0, 4) : [];

  if (!kpiCards.length && !groups.length) {
    // BS mode: show all section items
    return <BsView data={data} years={years} />;
  }

  // KPI cards row
  return (
    <div className="space-y-4">
      {kpiCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCards.map(([key, val]) => (
            <Kpi key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/Cr$/, ' (Cr)').trim()}
              value={fmt(val ?? 0)} smallValue />
          ))}
        </div>
      )}

      <div className="glass-card p-5 overflow-x-auto">
        <table className="w-full text-xs sensex-table tabular-nums" style={{ minWidth: 600 }}>
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 text-gray-400 font-medium">{columnLabel}</th>
              {years.map(fy => (
                <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "FY '")}</th>
              ))}
              <th className="text-right py-2 pl-2 text-gray-400 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <>{group.label !== groups[0]?.label && <tr><td colSpan={years.length + 2} className="h-2" /></tr>}
                <tr key={group.label}>
                  <td className="text-[11px] font-bold text-gray-300 pt-3 pb-1" colSpan={years.length + 2}>{group.label}</td>
                </tr>
                {group.keys.map(key => {
                  const vals = years.map(fy => {
                    const stmt = data.years[fy]?.[stmtType as keyof YearData];
                    if (!stmt) return null;
                    const item = (stmt as Statement).items.find((i: Item) => i.label.toLowerCase().includes(key));
                    return item?.current ?? null;
                  });
                  const hasData = vals.some(v => v !== null);
                  if (!hasData) return null;
                  const first = vals.find(v => v !== null && v !== 0) ?? 0;
                  const last = [...vals].reverse().find(v => v !== null && v !== 0) ?? 0;
                  const trend = first !== 0 ? ((last - first) / Math.abs(first) * 100) : 0;
                  return (
                    <tr key={key} className="hover:bg-white/5">
                      <td className="py-1.5 pr-4 text-gray-300 capitalize">{key}</td>
                      {vals.map((v, i) => (
                        <td key={i} className={`text-right py-1.5 px-2 ${v !== null ? 'text-white' : 'text-gray-600'}`}>
                          {v !== null ? fmtN(v, 0) : '—'}
                        </td>
                      ))}
                      <td className={`text-right py-1.5 pl-2 ${
                        trend > 5 ? 'text-emerald-400' : trend < -5 ? 'text-rose-400' : 'text-gray-500'
                      }`}>
                        {trend !== 0 ? `${trend > 0 ? '▲' : '▼'} ${Math.abs(trend).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Balance Sheet (section-based) ────────────────────────────────────────── */
function BsView({ data, years }: { data: ARDataset; years: string[] }) {
  const lastYear = years[years.length - 1];
  const lastBs = data.years[lastYear]?.balanceSheet;
  const totalAssets = lastBs?.kpIs?.totalAssetsCr;

  // Extract unique sections
  const sections: { label: string; itemKeys: { label: string }[] }[] = [];
  if (lastBs) {
    let currentSection: { label: string; itemKeys: { label: string }[] } | null = null;
    for (const item of lastBs.items) {
      if (item.type === 'section') {
        currentSection = { label: item.label, itemKeys: [] };
        sections.push(currentSection);
      } else if (currentSection && item.current !== null) {
        currentSection.itemKeys.push({ label: item.label });
      }
    }
  }

  return (
    <div className="space-y-4">
      {totalAssets && (
        <div className="flex gap-4">
          <Kpi label={`Total Assets (${lastYear})`} value={fmt(totalAssets)} smallValue />
        </div>
      )}

      <div className="glass-card p-5 overflow-x-auto">
        <table className="w-full text-xs sensex-table tabular-nums" style={{ minWidth: 600 }}>
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 text-gray-400 font-medium">Line Item</th>
              {years.map(fy => (
                <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "'")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map(sec => (
              <>
                <tr key={sec.label}>
                  <td className="text-[11px] font-bold text-gray-300 pt-3 pb-1" colSpan={years.length + 1}>{sec.label}</td>
                </tr>
                {sec.itemKeys.map((ik, idx) => {
                  const vals = years.map(fy => {
                    const bs = data.years[fy]?.balanceSheet;
                    if (!bs) return null;
                    const item = bs.items.find((i: Item) =>
                      i.label.includes(ik.label.slice(0, Math.max(15, ik.label.length))) &&
                      i.type === 'item'
                    );
                    return item?.current ?? null;
                  });
                  return (
                    <tr key={`${sec.label}-${idx}`} className="hover:bg-white/5">
                      <td className="py-1 pr-4 text-gray-300 text-[11px]">{ik.label}</td>
                      {vals.map((v, i) => (
                        <td key={i} className={`text-right py-1 px-2 text-[11px] ${v !== null ? 'text-white' : 'text-gray-600'}`}>
                          {v !== null ? fmtN(v, 0) : '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Segments Tab ─────────────────────────────────────────────────────────── */
function SegmentsView({ segData }: { segData: any }) {
  const series = segData?.segment_time_series;
  if (!series || Object.keys(series).length === 0) {
    return <div className="glass-card p-5 text-center text-gray-400">No segment data available. Run <code className="text-emerald-400">python scripts/extract_itc_segments.py</code> first.</div>;
  }

  const sectionLabels: Record<string, string> = {
    'revenue': 'Segment Revenue',
    'results': 'Segment Results',
    'assets': 'Segment Assets',
    'liabilities': 'Segment Liabilities',
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
            <table className="w-full text-xs sensex-table tabular-nums" style={{ minWidth: 500 }}>
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 text-gray-400 font-medium">Segment</th>
                  {fys.map(fy => (
                    <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "'")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(([key, vals]) => {
                  const name = key.split('|').slice(1).join('|');
                  return (
                    <tr key={key} className="hover:bg-white/5">
                      <td className="py-1.5 pr-4 text-gray-300">{name}</td>
                      {fys.map(fy => (
                        <td key={fy} className={`text-right py-1.5 px-2 ${vals[fy] ? 'text-white' : 'text-gray-600'}`}>
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
