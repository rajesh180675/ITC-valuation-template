import React, { useEffect, useState, useMemo } from 'react';
import {
  BookOpen, TrendingUp, PieChart, Layers, DollarSign, LineChart,
  BarChart3, Percent
} from 'lucide-react';
import {
  Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Legend, Pie, Cell
} from 'recharts';
import { fmt, fmtN } from '@/components/itc/shared';

type Tab = 'pnl' | 'balanceSheet' | 'cashFlow' | 'segments' | 'charts';

interface Item { type: string; label: string; note_ref: string; current: number | null; prior: number | null; section: string | null; }
interface Statement { fy: string; items: Item[]; kpIs: Record<string, number | null>; }
interface YearData { profitLoss?: Statement; balanceSheet?: Statement; cashFlow?: Statement; }

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'pnl', label: 'P&L', icon: TrendingUp },
  { id: 'balanceSheet', label: 'Balance Sheet', icon: PieChart },
  { id: 'cashFlow', label: 'Cash Flow', icon: DollarSign },
  { id: 'segments', label: 'Segments', icon: Layers },
  { id: 'charts', label: 'Charts', icon: LineChart },
];

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899'];
const COMPANY_MAP: Record<string, string> = {
  ITC: 'ITC Limited', RELIANCE: 'Reliance Industries', TCS: 'Tata Consultancy Services',
  HDFCBANK: 'HDFC Bank', INFY: 'Infosys', ICICIBANK: 'ICICI Bank', SBIN: 'SBI', WIPRO: 'Wipro',
};

function findItem(items: Item[], key: string): number | null {
  const m = items.find(i => i.label.toLowerCase().includes(key.toLowerCase()) && i.current !== null);
  return m?.current ?? null;
}

/** Safe percentage helper - never returns 0 caused by null/0 division */
function safePct(num: number | null, den: number | null): number | null {
  if (num == null || den == null || den === 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

/** Safe subtraction - returns null if either operand is null */
function safeSub(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return a - b;
}

function KpiCard({ label, value, trend, suffix }: { label: string; value: number | null; trend?: number | null; suffix?: string; }) {
  const valStr = value != null ? fmt(value) : '\u2014';
  let trendEl = null;
  if (trend != null && trend !== 0) {
    trendEl = (
      <span className={`text-[10px] font-mono ${trend > 5 ? 'text-emerald-400' : trend < -5 ? 'text-rose-400' : 'text-gray-500'}`}>
        {trend > 0 ? '\u25B2' : '\u25BC'} {Math.abs(trend).toFixed(1)}%
      </span>
    );
  }
  return (
    <div className="glass-card p-3 flex flex-col gap-0.5 min-w-[130px]">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-lg font-bold text-white tabular-nums">{valStr}{suffix || ''}</span>
      {trendEl}
    </div>
  );
}

/* ── Main Component (stable hook tree, no key-remount) ──────────────────── */
export function AnnualReportsSection() {
  const [tab, setTab] = useState<Tab>('charts');
  const [yearsData, setYearsData] = useState<Record<string, YearData> | null>(null);
  const [segData, setSegData] = useState<any>(null);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [commonSize, setCommonSize] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTicker, setActiveTicker] = useState('ITC');

  const getStmtType = (t: Tab): keyof YearData =>
    t === 'pnl' ? 'profitLoss' : t === 'balanceSheet' ? 'balanceSheet' : 'cashFlow';

  // Fetch on ticker change or mount
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setYearsData(null);
    Promise.all([
      fetch(`/data/ar/${activeTicker}.json`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} - run python scripts/extract_ar.py --ticker ${activeTicker}`); return r.json(); }),
      fetch('/data/segment_data_itc.json').then(r => r.ok ? r.json() : { segment_time_series: {} }).catch(() => ({ segment_time_series: {} })),
    ]).then(([ar, seg]) => {
      if (cancelled) return;
      if (!ar.years) throw new Error('Missing .years in AR data');
      setYearsData(ar.years);
      setSegData(seg);
      setSelectedYears(Object.keys(ar.years).sort().slice(-5));
    }).catch(err => {
      if (!cancelled) setError(err.message);
    });
    return () => { cancelled = true; };
  }, [activeTicker]);

  const years = useMemo(() => yearsData ? Object.keys(yearsData).sort() : [], [yearsData]);
  const displayYears = selectedYears.length > 0 ? selectedYears : years.slice(-5);

  const kpiData = useMemo(() => displayYears.map(fy => {
    const y = yearsData?.[fy];
    const pnl = y?.profitLoss;
    const bs = y?.balanceSheet;
    const cf = y?.cashFlow;
    const rev = pnl?.kpIs?.revenueCr ?? findItem(pnl?.items ?? [], 'Revenue From Operations');
    const pat = pnl?.kpIs?.patCr ?? findItem(pnl?.items ?? [], 'Profit for the year');
    const ta = bs?.kpIs?.totalAssetsCr ?? findItem(bs?.items ?? [], 'TOTAL');
    const cfo = findItem(cf?.items ?? [], 'NET CASH FROM OPERATING');
    const pbt = findItem(pnl?.items ?? [], 'Profit before tax');
    const empCost = findItem(pnl?.items ?? [], 'Employee benefits');
    const depr = findItem(pnl?.items ?? [], 'Depreciation');
    const finCost = findItem(pnl?.items ?? [], 'Finance costs');
    return { fy, rev, pat, ta, cfo, pbt, empCost, depr, finCost };
  }).filter((d): d is typeof d & { rev: number } => d.rev !== null), [yearsData, displayYears]);

  const latest = kpiData[kpiData.length - 1];
  const first = kpiData[0];

  const yoy = (v: number | null, p: number | null): number | null =>
    v != null && p != null && p !== 0 ? ((v - p) / Math.abs(p)) * 100 : null;
  const cagr = (v: number | null, p: number | null, n: number): number | null =>
    v != null && p != null && p > 0 && n > 1 ? ((v / p) ** (1 / (n - 1)) - 1) * 100 : null;

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header — always visible, even on error */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 border border-emerald-500/20 flex items-center justify-center">
            <BookOpen size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Annual Reports</h1>
            <p className="text-xs text-gray-400">
              <select value={activeTicker} onChange={e => setActiveTicker(e.target.value)}
                className="bg-gray-800 text-emerald-300 border border-gray-700 rounded px-1.5 py-0.5 text-[11px] font-mono cursor-pointer">
                {Object.entries(COMPANY_MAP).map(([t, n]) => (
                  <option key={t} value={t}>{n} ({t})</option>
                ))}
              </select>
              {(years.length > 0 && !error) && <>{' \u00B7 '}{years.length} years{' \u00B7 '}{tab.toUpperCase()}</>}
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

      {/* Error or Loading */}
      {error && (
        <div className="glass-card p-6 text-center">
          <p className="text-rose-400 mb-2">Could not load data for {activeTicker}</p>
          <p className="text-gray-500 text-xs mb-4">{error}</p>
          <p className="text-gray-500 text-xs">Select another company from the dropdown above, or run:<br/>
            <code className="text-emerald-400">python scripts/extract_ar.py --ticker {activeTicker} --years 2019-2025</code></p>
        </div>
      )}

      {!error && !yearsData && (
        <div className="glass-card p-8 text-center text-gray-400 animate-pulse">Loading annual report data...</div>
      )}

      {/* Main content — only when data is loaded */}
      {!error && yearsData && (
        <>
          {/* KPI cards */}
          {latest && (
            <div className="flex gap-3 flex-wrap">
              <KpiCard label="Revenue" value={latest.rev} trend={kpiData.length > 1 ? yoy(latest.rev, kpiData[kpiData.length - 2]?.rev) : null} />
              <KpiCard label="PAT" value={latest.pat} trend={kpiData.length > 1 ? yoy(latest.pat, kpiData[kpiData.length - 2]?.pat) : null} />
              <KpiCard label="Total Assets" value={latest.ta} />
              <KpiCard label="CFO" value={latest.cfo} />
              <KpiCard label="PBT Margin" value={safePct(latest.pbt, latest.rev)} suffix="%" />
              <KpiCard label="CAGR Rev" value={cagr(latest.rev, first?.rev, kpiData.length)} suffix="%" />
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-gray-800">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  tab === t.id ? 'text-emerald-300 border-emerald-500' : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}>
                <t.icon size={16} /> {t.label}
              </button>
            ))}
            {tab !== 'segments' && tab !== 'charts' && (
              <button onClick={() => setCommonSize(!commonSize)}
                className={`ml-auto flex items-center gap-1.5 px-3 py-2 text-[11px] rounded-t-md transition-all ${
                  commonSize ? 'text-purple-300 bg-purple-500/10 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'
                }`}>
                <Percent size={13} /> {commonSize ? 'Absolute' : 'Common-Size'}
              </button>
            )}
          </div>

          {/* Tab content */}
          {tab === 'segments' ? <SegmentsView segData={segData} /> :
           tab === 'charts' ? <ChartsView kpiData={kpiData} /> :
           <DataDrivenTable data={yearsData} years={displayYears} stmtType={getStmtType(tab)} commonSize={commonSize} />}
        </>
      )}
    </div>
  );
}

/* ── Charts (safe null math) ─────────────────────────────────────────────── */
function ChartsView({ kpiData }: { kpiData: any[] }) {
  if (kpiData.length < 2) return <div className="glass-card p-5 text-gray-400">Need at least 2 years of data for charts.</div>;

  const marginData = kpiData.map((d: any) => ({
    fy: d.fy,
    'PBT %': safePct(d.pbt, d.rev),
    'PAT %': safePct(d.pat, d.rev),
    'Emp Cost %': safePct(d.empCost, d.rev),
    'Depr %': safePct(d.depr, d.rev),
  }));

  const cashConvData = kpiData.map((d: any) => ({
    fy: d.fy, CFO: d.cfo ?? null, PAT: d.pat ?? null,
    'CFO/PAT %': safePct(d.cfo, d.pat),
  }));

  const yoyData: any[] = [];
  for (let i = 1; i < kpiData.length; i++) {
    const prev = kpiData[i - 1];
    const curr = kpiData[i];
    const revDiff = safeSub(curr.rev, prev.rev);
    const patDiff = safeSub(curr.pat, prev.pat);
    yoyData.push({
      fy: curr.fy,
      'Rev Growth': safePct(revDiff, prev.rev),
      'PAT Growth': safePct(patDiff, prev.pat),
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartPanel title="Revenue & Profit Trend" icon={<TrendingUp size={14} className="text-emerald-400" />}>
        <ComposedChart data={kpiData}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="rev" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Line dataKey="pat" name="PAT" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ChartPanel>

      <ChartPanel title="Margin Analysis (% of Revenue)" icon={<Percent size={14} className="text-emerald-400" />}>
        <ComposedChart data={marginData}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[-5, 45]} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="PBT %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line dataKey="PAT %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line dataKey="Emp Cost %" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} connectNulls />
          <Line dataKey="Depr %" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} connectNulls />
        </ComposedChart>
      </ChartPanel>

      <ChartPanel title="CFO vs PAT (Cash Conversion)" icon={<DollarSign size={14} className="text-emerald-400" />}>
        <ComposedChart data={cashConvData}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis yAxisId="L" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis yAxisId="R" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[0, 150]} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="L" dataKey="CFO" name="CFO" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="L" dataKey="PAT" name="PAT" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Line yAxisId="R" dataKey="CFO/PAT %" name="Cash Conv %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ChartPanel>

      <ChartPanel title="YoY Growth (%)" icon={<BarChart3 size={14} className="text-emerald-400" />}>
        <ComposedChart data={yoyData}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[-10, 30]} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Rev Growth" name="Revenue Growth" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Line dataKey="PAT Growth" name="PAT Growth" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ChartPanel>
    </div>
  );
}

function ChartPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">{icon} {title}</h3>
      <ResponsiveContainer width="100%" height={260}>{children}</ResponsiveContainer>
    </div>
  );
}

/* ── Data-Driven Table ───────────────────────────────────────────────────── */
function DataDrivenTable({ data, years, stmtType, commonSize }: {
  data: Record<string, YearData>; years: string[]; stmtType: keyof YearData; commonSize: boolean;
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
          const match = stmt.items.find((i: Item) => i.label === label);
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
            {years.map(fy => (
              <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "FY '")}</th>
            ))}
            <th className="text-right py-2 pl-2 text-gray-400 font-medium">CAGR</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gi) => (
            <React.Fragment key={`g${gi}`}>
              {group.header && group.header !== 'OTHER' && (
                <tr><td className="text-[11px] font-bold text-emerald-300 pt-3 pb-1 border-b border-emerald-500/20" colSpan={years.length + 2}>{group.header}</td></tr>
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

/* ── Segments Tab ─────────────────────────────────────────────────────────── */
function SegmentsView({ segData }: { segData: any }) {
  const series = segData?.segment_time_series;
  if (!series || Object.keys(series).length === 0) {
    return <div className="glass-card p-5 text-center text-gray-400">No segment data.</div>;
  }

  const sectionLabels: Record<string, string> = { revenue: 'Segment Revenue', results: 'Segment Results', assets: 'Segment Assets', liabilities: 'Segment Liabilities' };
  const allFys = [...new Set(Object.values(series as Record<string, Record<string, number>>).flatMap(v => Object.keys(v)))].sort();

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Segment Revenue Mix (Latest Year)</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={(() => {
                const latest = allFys[allFys.length - 1];
                return Object.entries(series).filter(([k]) => k.startsWith('revenue|'))
                  .map(([k, v]) => ({ name: k.split('|')[1], value: (v as any)[latest] || 0 }))
                  .filter(d => d.value > 0 && d.value !== Infinity && !Number.isNaN(d.value));
              })()} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, value }: any) => `${name} (${fmtN(value, 0)})`} labelLine
              >
                {Object.keys(series).filter(k => k.startsWith('revenue|')).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {Object.entries(sectionLabels).map(([prefix, title]) => {
        const items = Object.entries(series).filter(([k]) => k.startsWith(prefix + '|')).sort();
        if (items.length === 0) return null;
        return (
          <div key={prefix} className="glass-card p-5 overflow-x-auto">
            <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
            <table className="w-full text-xs tabular-nums" style={{ minWidth: 500 }}>
              <thead>
                <tr><th className="text-left py-2 pr-4 text-gray-400 font-medium">Segment</th>
                  {allFys.map(fy => <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "'")}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map(([key, vals]) => {
                  const name = key.split('|').slice(1).join('|');
                  const vmap = vals as Record<string, number>;
                  return (
                    <tr key={key} className="hover:bg-white/[0.03]">
                      <td className="py-1.5 pr-4 text-gray-300 text-[11px]">{name}</td>
                      {allFys.map(fy => (
                        <td key={fy} className={`text-right py-1.5 px-2 text-[11px] ${vmap[fy] ? 'text-white' : 'text-gray-600'}`}>
                          {vmap[fy] ? fmtN(vmap[fy], 0) : '\u2014'}
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
