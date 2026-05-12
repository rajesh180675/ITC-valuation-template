import { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, PieChart, Layers, BarChart3, Table2 } from 'lucide-react';
import { fmt, fmtN } from '@/components/itc/shared';
import { Kpi } from './shared';

type Tab = 'pnl' | 'balanceSheet' | 'segments';

interface PlItem {
  type: string;
  label: string;
  note_ref: string;
  current: number | null;
  prior: number | null;
  section: string | null;
}

interface YearData {
  profitLoss?: { fy: string; items: PlItem[]; kpIs: Record<string, number | null> };
  balanceSheet?: { fy: string; items: PlItem[]; kpIs: Record<string, number | null> };
}

interface ARDataset {
  ticker: string;
  years: Record<string, YearData>;
  metadata: { source: string };
}

const TABS: { id: Tab; label: string; icon: typeof Table2 }[] = [
  { id: 'pnl', label: 'P&L', icon: TrendingUp },
  { id: 'balanceSheet', label: 'Balance Sheet', icon: PieChart },
  { id: 'segments', label: 'Segments', icon: Layers },
];

function guessPnlTotal(items: PlItem[], field: string): number {
  const item = items.find(i => i.label.toLowerCase().includes(field));
  return item?.current ?? 0;
}

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
      const years = Object.keys(ar.years).sort();
      setSelectedYears(years.slice(-5)); // default: last 5 years
    });
  }, []);

  if (!data) return <div className="glass-card p-8 text-center text-gray-400 animate-pulse">Loading annual report data…</div>;

  const years = Object.keys(data.years).sort();
  const allYears = selectedYears.length > 0 ? selectedYears : years.slice(-5);

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
            <p className="text-xs text-gray-400">ITC Limited • {data.metadata.source} • 10 years</p>
          </div>
        </div>
        {/* Year selector */}
        <div className="flex gap-1.5 flex-wrap">
          {years.map(fy => (
            <button
              key={fy}
              onClick={() => {
                setSelectedYears(prev =>
                  prev.includes(fy) ? prev.filter(y => y !== fy) : [...prev, fy].sort()
                );
              }}
              className={`px-2.5 py-1 text-[11px] rounded-md font-mono transition-all ${
                selectedYears.includes(fy)
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-gray-800/50 text-gray-400 border border-transparent hover:text-gray-200'
              }`}
            >
              {fy.replace('FY', "'")}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                tab === t.id
                  ? 'text-emerald-300 border-emerald-500'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'pnl' && <PnLView data={data} years={allYears} />}
      {tab === 'balanceSheet' && <BalanceSheetView data={data} years={allYears} />}
      {tab === 'segments' && <SegmentsView segData={segData} />}
    </div>
  );
}

/* ── P&L Tab ──────────────────────────────────────────────────────────────── */
function PnLView({ data, years }: { data: ARDataset; years: string[] }) {
  const yearData = years.map(fy => data.years[fy]?.profitLoss).filter(Boolean);

  // Build multi-year table: rows = items, cols = FYs
  const allLabels = new Set<string>();
  yearData.forEach(yd => yd!.items.forEach((i: PlItem) => { if (i.type === 'item') allLabels.add(i.label); }));

  const rowGroups = [
    { label: 'REVENUE', keys: ['revenue from operations', 'other income', 'total income'] },
    { label: 'EXPENSES', keys: ['cost of materials', 'purchases of stock', 'changes in inventories',
      'excise duty', 'employee benefits', 'finance costs', 'depreciation', 'other expenses', 'total expenses'] },
    { label: 'PROFITABILITY', keys: ['profit before exceptional', 'exceptional items', 'profit before tax',
      'tax expense', 'profit for the year'] },
  ];

  return (
    <div className="glass-card p-5 overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-emerald-400" />
        <h2 className="text-sm font-semibold text-white">Income Statement — Multi-Year Comparison</h2>
        <span className="text-[10px] text-gray-500 ml-auto">* in Rs. Crores</span>
      </div>

      <table className="w-full text-xs sensex-table tabular-nums" style={{ minWidth: 600 }}>
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 text-gray-400 font-medium">Item</th>
            {years.map(fy => (
              <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "FY ")}</th>
            ))}
            <th className="text-right py-2 pl-2 text-gray-400 font-medium">Trend</th>
          </tr>
        </thead>
        <tbody>
          {rowGroups.map(group => (
            <>
              <tr key={group.label}>
                <td className="text-[11px] font-bold text-gray-300 pt-4 pb-1" colSpan={years.length + 2}>
                  {group.label}
                </td>
              </tr>
              {group.keys.map(key => {
                const vals = years.map(fy => {
                  const yd = data.years[fy]?.profitLoss;
                  if (!yd) return null;
                  const item = yd.items.find((i: PlItem) => i.label.toLowerCase().includes(key));
                  return item?.current ?? null;
                });
                const hasData = vals.some(v => v !== null);
                if (!hasData) return null;
                const first = vals.find(v => v !== null && v !== 0) ?? 0;
                const last = [...vals].reverse().find(v => v !== null && v !== 0) ?? 0;
                const trend = first !== 0 ? ((last - first) / Math.abs(first) * 100).toFixed(1) : '—';
                const trendNum = parseFloat(trend);
                return (
                  <tr key={key} className="hover:bg-white/5">
                    <td className="py-1.5 pr-4 text-gray-300 capitalize">{key}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={`text-right py-1.5 px-2 ${v !== null ? 'text-white' : 'text-gray-600'}`}>
                        {v !== null ? fmtN(v, 0) : '—'}
                      </td>
                    ))}
                    <td className={`text-right py-1.5 pl-2 ${trendNum > 5 ? 'text-emerald-400' : trendNum < -5 ? 'text-rose-400' : 'text-gray-500'}`}>
                      {trend !== '—' ? `${trendNum > 0 ? '▲' : '▼'} ${Math.abs(trendNum).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Balance Sheet Tab ────────────────────────────────────────────────────── */
function BalanceSheetView({ data, years }: { data: ARDataset; years: string[] }) {
  const allItems = years.map(fy => data.years[fy]?.balanceSheet?.items ?? []).flat();
  const totalAssets = years.map(fy => data.years[fy]?.balanceSheet?.kpIs?.totalAssetsCr ?? null);
  const totalAssetsExists = totalAssets.some(v => v !== null);

  return (
    <div className="glass-card p-5 overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <PieChart size={16} className="text-emerald-400" />
        <h2 className="text-sm font-semibold text-white">Balance Sheet — Multi-Year Comparison</h2>
        <span className="text-[10px] text-gray-500 ml-auto">* in Rs. Crores</span>
      </div>

      {totalAssetsExists && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {years.map((fy, i) => (
            totalAssets[i] ? (
              <Kpi key={fy} label={`Total Assets ${fy.replace('FY', "'")}`} value={fmt(totalAssets[i]!)} smallValue />
            ) : null
          ))}
        </div>
      )}

      <table className="w-full text-xs sensex-table tabular-nums" style={{ minWidth: 500 }}>
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 text-gray-400 font-medium">Item</th>
            {years.map(fy => (
              <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "FY ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {['TOTAL ASSETS', 'EQUITY AND LIABILITIES', 'Non-current assets', 'Current assets',
            'Equity', 'Non-current liabilities', 'Current liabilities'].map(sectionLabel => {
            // Find matching items across years
            const rows = years.map(fy => {
              const items = data.years[fy]?.balanceSheet?.items ?? [];
              const matching = items.filter((i: PlItem) => i.type === 'section' && i.label.toLowerCase().includes(sectionLabel.toLowerCase()));
              return matching.length > 0 ? matching[0] : null;
            });
            const hasData = rows.some(r => r !== null);
            if (!hasData) return null;
            return (
              <tr key={sectionLabel} className="bg-gray-800/30">
                <td className="py-1.5 pr-4 text-gray-300 font-medium text-[11px]">{sectionLabel}</td>
                {years.map((fy, i) => (
                  <td key={fy} className="text-right py-1.5 px-2 text-gray-400">—</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Segments Tab ─────────────────────────────────────────────────────────── */
function SegmentsView({ segData }: { segData: any }) {
  if (!segData?.segment_time_series) {
    return <div className="glass-card p-5 text-center text-gray-400">No segment data available.</div>;
  }

  const series = segData.segment_time_series;
  const sectionLabels: Record<string, string> = {
    'revenue': 'Segment Revenue',
    'results': 'Segment Results',
    'assets': 'Segment Assets',
    'liabilities': 'Segment Liabilities',
  };

  // Find all FYs
  const allFys = new Set<string>();
  Object.values(series as Record<string, Record<string, number>>).forEach(v => Object.keys(v).forEach(fy => allFys.add(fy)));
  const fys = [...allFys].sort().reverse();

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
                  const name = key.split('|')[1];
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
