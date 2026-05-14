import React, { useEffect, useState, useMemo } from 'react';
import {
 BookOpen, TrendingUp, PieChart, Layers, DollarSign, LineChart,
 BarChart3, Percent, Scale, Shield, AlertTriangle, Building2, Tag, Filter
} from 'lucide-react';
import {
  Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Legend, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import { fmt, fmtN } from '@/components/itc/shared';
import { OverviewTab } from './OverviewTab';
import { RatiosTab } from './RatiosTab';
import {
  type AnnualReportDataFile,
  type AnnualReportFileMetadata,
  type AnnualReportYearData,
  type CashFlowPreset,
  type CashFlowTableGroup,
  type CashFlowYearSummary,
  buildCashFlowTableModel,
  buildCashFlowYearSummaries,
  formatCashFlowValue,
  getDisplayYears,
  getYearPresetYears,
} from '@/utils/annualReportCashFlow';

type Tab = 'overview' | 'pnl' | 'balanceSheet' | 'cashFlow' | 'segments' | 'charts' | 'ratios';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'pnl', label: 'P&L', icon: TrendingUp },
  { id: 'balanceSheet', label: 'Balance Sheet', icon: PieChart },
  { id: 'cashFlow', label: 'Cash Flow', icon: DollarSign },
  { id: 'segments', label: 'Segments', icon: Layers },
  { id: 'charts', label: 'Charts', icon: LineChart },
  { id: 'ratios', label: 'Ratios', icon: Scale },
];

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899'];
const SEGMENT_DONUT_ORDER = ['FMCG - Cigarettes', 'FMCG - Others', 'Agri Business', 'Paperboards, Paper and Packaging', 'Others'];

/* ── Company index types ──────────────────────────────────────────────────── */
interface CompanyIndexEntry {
 ticker: string;
 name: string;
 indexSlug: string;
 sector: string;
 reportingType: string;
 hasAr: boolean;
 fyCount: number;
 firstFy: string | null;
 lastFy: string | null;
 source: string;
 qualityFlags: number;
 marketCapCr: number;
 /** Legacy compat — some index files still use 'years' */
 years?: number;
 fyRange?: string | null;
}
interface CompanyIndex {
 companies: CompanyIndexEntry[];
 byTicker: Record<string, CompanyIndexEntry>;
 count: number;
 scrapedCount: number;
 verificationSummary?: {
 totalFlags: number;
 flaggedCompanies: number;
 itemsGenerated: number;
 };
}

function findItem(items: { label: string; current?: number | null }[], key: string): number | null {
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
  const [tab, setTab] = useState<Tab>('overview');
  const [yearsData, setYearsData] = useState<Record<string, AnnualReportYearData> | null>(null);
  const [segData, setSegData] = useState<any>(null);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [reportMeta, setReportMeta] = useState<AnnualReportFileMetadata | null>(null);
  const [commonSize, setCommonSize] = useState(false);
  const [error, setError] = useState<string | null>(null);
 const [activeTicker, setActiveTicker] = useState('ITC');
 const [companyIndex, setCompanyIndex] = useState<CompanyIndex | null>(null);
 const [searchQuery, setSearchQuery] = useState('');
 const [showDropdown, setShowDropdown] = useState(false);
 const [indexLoading, setIndexLoading] = useState(true);
 const [sectorFilter, setSectorFilter] = useState<string>('all');

  const getStmtType = (t: Tab): 'profitLoss' | 'balanceSheet' | 'cashFlow' => {
    if (t === 'pnl') return 'profitLoss';
    if (t === 'balanceSheet') return 'balanceSheet';
    if (t === 'cashFlow') return 'cashFlow';
    return 'profitLoss'; // default for overview/charts/segments/ratios
  };

  // Fetch company index on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/data/ar/company_index.json')
      .then(r => r.ok ? r.json() : null)
      .then(idx => {
        if (!cancelled && idx) {
          setCompanyIndex(idx);
          setIndexLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setIndexLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Check for a pending ticker from localStorage (set by universe drill-down)
  useEffect(() => {
    try {
      const pending = localStorage.getItem('arTicker');
      if (pending) {
        localStorage.removeItem('arTicker');
        if (companyIndex?.byTicker[pending]) {
          setActiveTicker(pending);
        }
      }
    } catch {}
  }, [companyIndex]);

  // Fetch AR data on ticker change or mount
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setYearsData(null);
    Promise.all([
      fetch(`/data/ar/${activeTicker}.json`).then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} - run python scripts/extract_ar.py --ticker ${activeTicker}`);
        return r.json() as Promise<AnnualReportDataFile>;
      }),
      activeTicker === 'ITC' ? fetch('/data/segment_data_itc.json').then(r => r.ok ? r.json() : { segment_time_series: {} }).catch(() => ({ segment_time_series: {} })) : Promise.resolve(null),
    ]).then(([ar, seg]) => {
      if (cancelled) return;
      if (!ar.years) throw new Error('Missing .years in AR data');
      setYearsData(ar.years);
      setReportMeta(ar.metadata ?? null);
      setSegData(seg);
      setSelectedYears([]);
    }).catch(err => {
      if (!cancelled) setError(err.message);
    });
    return () => { cancelled = true; };
  }, [activeTicker]);

  const years = useMemo(() => yearsData ? Object.keys(yearsData).sort() : [], [yearsData]);
  const displayYears = getDisplayYears(selectedYears, years, tab);

 // Search + filter for company selector
 const activeCompanyName = useMemo(() => {
 if (companyIndex?.byTicker[activeTicker]) return companyIndex.byTicker[activeTicker].name;
 return activeTicker;
 }, [companyIndex, activeTicker]);

 // Active company's entry from index
 const activeCompanyEntry = useMemo(() => companyIndex?.byTicker[activeTicker] ?? null, [companyIndex, activeTicker]);

 // Sector list for filter
 const sectorList = useMemo(() => {
 if (!companyIndex) return [];
 const s = new Map<string, number>();
 for (const c of companyIndex.companies) {
 if (c.sector && c.sector !== 'Unknown') {
 s.set(c.sector, (s.get(c.sector) || 0) + 1);
 }
 }
 return Array.from(s.entries())
 .sort((a, b) => b[1] - a[1])
 .map(([name, count]) => ({ name, count }));
 }, [companyIndex]);

 const filteredCompanies = useMemo(() => {
 if (!companyIndex) return [];
 let list = companyIndex.companies;
 // Sector filter
 if (sectorFilter !== 'all') {
 list = list.filter(c => c.sector === sectorFilter);
 }
 // Text search
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 list = list.filter(c =>
 c.ticker.toLowerCase().includes(q) ||
 c.name.toLowerCase().includes(q) ||
 c.sector.toLowerCase().includes(q)
 );
 }
 // Default: show first 100; with filter/search: up to 200
 return list.slice(0, searchQuery.trim() || sectorFilter !== 'all' ? 200 : 100);
 }, [companyIndex, searchQuery, sectorFilter]);

  const handleSelectCompany = (ticker: string) => {
    setActiveTicker(ticker);
    setSearchQuery('');
    setShowDropdown(false);
  };
  const cashFlowTable = useMemo(() => buildCashFlowTableModel(yearsData ?? {}, displayYears), [yearsData, displayYears]);
  const cashFlowSummaries = useMemo(() => buildCashFlowYearSummaries(yearsData ?? {}, displayYears), [yearsData, displayYears]);
  const latestCashFlow = cashFlowSummaries[cashFlowSummaries.length - 1];

  const kpiData = useMemo(() => displayYears.map(fy => {
    const y = yearsData?.[fy];
    const pnl = y?.profitLoss;
    const bs = y?.balanceSheet;
    const cf = y?.cashFlow;
    const cfk = cf?.kpIs || {};
    const rev = pnl?.kpIs?.revenueCr ?? findItem(pnl?.items ?? [], 'Revenue From Operations');
    const pat = pnl?.kpIs?.patCr ?? findItem(pnl?.items ?? [], 'Profit for the year');
    const ta = bs?.kpIs?.totalAssetsCr ?? findItem(bs?.items ?? [], 'TOTAL');
    const cfo = cfk.cfoCr ?? findItem(cf?.items ?? [], 'NET CASH FROM OPERATING');
    const pbt = pnl?.kpIs?.pbtCr ?? findItem(pnl?.items ?? [], 'Profit before tax');
    const empCost = findItem(pnl?.items ?? [], 'Employee benefits');
    const depr = findItem(pnl?.items ?? [], 'Depreciation');
    const finCost = findItem(pnl?.items ?? [], 'Finance costs');
    const cfi = cfk.cfiCr ?? null;
    const capex = cfk.capexCr ?? null;
    const fcf = cfk.fcfCr ?? null;
    return { fy, rev, pat, ta, cfo, pbt, empCost, depr, finCost, cfi, capex, fcf };
  }).filter((d): d is typeof d & { rev: number } => d.rev !== null), [yearsData, displayYears]);

  const latest = kpiData[kpiData.length - 1];
  const first = kpiData[0];

  const yoy = (v: number | null, p: number | null): number | null =>
    v != null && p != null && p !== 0 ? ((v - p) / Math.abs(p)) * 100 : null;
  const cagr = (v: number | null, p: number | null, n: number): number | null =>
    v != null && p != null && p > 0 && n > 1 ? ((v / p) ** (1 / (n - 1)) - 1) * 100 : null;
  const setCashFlowPreset = (preset: CashFlowPreset) => {
    if (preset === 'reset') {
      setSelectedYears([]);
      return;
    }
    setSelectedYears(getYearPresetYears(preset, years));
  };

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
 <span className="relative">
 <input
 type="text"
 value={searchQuery}
 onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
 onFocus={() => setShowDropdown(true)}
 placeholder={indexLoading ? 'Loading...' : `${activeCompanyName} (${activeTicker})`}
 className="bg-gray-800 text-emerald-300 border border-gray-700 rounded px-2 py-0.5 text-[11px] font-mono w-[240px] outline-none focus:border-emerald-500/50"
 />
 {showDropdown && companyIndex && (
 <>
 <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
 <div className="absolute top-full left-0 mt-1 z-20 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-[400px] overflow-y-auto min-w-[380px]">
 {/* Sector filter bar */}
 <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-3 py-2 flex items-center gap-1.5 flex-wrap">
 <Filter size={11} className="text-gray-500" />
 <button
 onClick={() => setSectorFilter('all')}
 className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${sectorFilter === 'all' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-gray-800 text-gray-400 border border-transparent hover:text-gray-200'}`}
 >All ({companyIndex.count})</button>
 {sectorList.slice(0, 10).map(s => (
 <button
 key={s.name}
 onClick={() => setSectorFilter(sectorFilter === s.name ? 'all' : s.name)}
 className={`px-2 py-0.5 text-[10px] rounded-full transition-colors truncate max-w-[120px] ${sectorFilter === s.name ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-gray-800 text-gray-400 border border-transparent hover:text-gray-200'}`}
 >{s.name} ({s.count})</button>
 ))}
 </div>
 {filteredCompanies.length === 0 ? (
 <div className="px-3 py-2 text-gray-500 text-xs">No matches found</div>
 ) : filteredCompanies.map(c => (
 <button
 key={c.ticker}
 onClick={() => handleSelectCompany(c.ticker)}
 className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-800 transition-colors ${
 c.ticker === activeTicker ? 'bg-emerald-500/10 text-emerald-300' : 'text-gray-300'
 }`}
 >
 <span className="flex items-center gap-2">
 <span className="font-mono">{c.ticker}</span>
 <span className="text-gray-500 truncate max-w-[140px]">{c.name}</span>
 {c.sector && c.sector !== 'Unknown' && (
 <span className="text-[9px] px-1.5 py-0 rounded bg-gray-800 text-gray-500">{c.sector}</span>
 )}
 </span>
 <span className="flex items-center gap-1.5">
 {c.qualityFlags > 0 && (
 <span className="text-[9px] text-amber-500" title={`${c.qualityFlags} quality flags`}>⚠</span>
 )}
 <span className={`text-[10px] ${c.hasAr ? 'text-emerald-500' : 'text-gray-600'}`}>
 {c.hasAr ? `${c.fyCount || c.years || '?'}y` : 'no data'}
 </span>
 </span>
 </button>
 ))}
 {searchQuery.trim() === '' && sectorFilter === 'all' && companyIndex.count > 100 && (
 <div className="px-3 py-1.5 text-gray-600 text-[10px] border-t border-gray-800">
 Showing first 100 of {companyIndex.count} companies — type to search
 </div>
 )}
 {(searchQuery.trim() !== '' || sectorFilter !== 'all') && filteredCompanies.length >= 200 && (
 <div className="px-3 py-1.5 text-gray-600 text-[10px] border-t border-gray-800">
 Showing top 200 matches — refine your search
 </div>
 )}
 </div>
 </>
 )}
 </span>
 {(years.length > 0 && !error) && <>{' · '}{years.length} years{' · '}{tab.toUpperCase()}</>}
 </p>
 {/* Company metadata badges */}
 {activeCompanyEntry && !error && (
 <div className="flex items-center gap-1.5 mt-1 flex-wrap">
 {activeCompanyEntry.sector && activeCompanyEntry.sector !== 'Unknown' && (
 <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
 <Building2 size={10} /> {activeCompanyEntry.sector}
 </span>
 )}
 {activeCompanyEntry.reportingType === 'financial' && (
 <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
 <Tag size={10} /> Financial
 </span>
 )}
 {activeCompanyEntry.source && (
 <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400 border border-gray-600/30">
 <Shield size={10} /> {activeCompanyEntry.source}
 </span>
 )}
 {activeCompanyEntry.qualityFlags > 0 && (
 <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title={`${activeCompanyEntry.qualityFlags} data quality flags — see cross-checks`}>
 <AlertTriangle size={10} /> {activeCompanyEntry.qualityFlags} flags
 </span>
 )}
 {activeCompanyEntry.qualityFlags === 0 && (
 <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
 <Shield size={10} /> Verified
 </span>
 )}
 {activeCompanyEntry.marketCapCr > 0 && (
 <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
 MCap ₹{(activeCompanyEntry.marketCapCr / 1000).toFixed(0)}K Cr
 </span>
 )}
 </div>
 )}
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
            <code className="text-emerald-400">python scripts/extract_ar.py --ticker {activeTicker} --years 2016-2025</code></p>
        </div>
      )}

      {!error && !yearsData && (
        <div className="glass-card p-8 text-center text-gray-400 animate-pulse">Loading annual report data...</div>
      )}

      {/* Main content — only when data is loaded */}
      {!error && yearsData && (
        <>
          {/* KPI cards — skip on overview and ratios (have their own) */}
          {tab !== 'overview' && tab !== 'ratios' && latest && (
            <div className="flex gap-3 flex-wrap">
              {tab === 'cashFlow' ? (
                <>
                  <KpiCard label="CFO" value={latestCashFlow?.cfo ?? null} trend={cashFlowSummaries.length > 1 ? yoy(latestCashFlow?.cfo ?? null, cashFlowSummaries[cashFlowSummaries.length - 2]?.cfo ?? null) : null} />
                  <KpiCard label="CFI" value={latestCashFlow?.cfi ?? null} />
                  <KpiCard label="FCF" value={latestCashFlow?.fcf ?? null} trend={cashFlowSummaries.length > 1 ? yoy(latestCashFlow?.fcf ?? null, cashFlowSummaries[cashFlowSummaries.length - 2]?.fcf ?? null) : null} />
                  <KpiCard label="Capex Outflow" value={latestCashFlow?.capex == null ? null : Math.abs(latestCashFlow.capex)} />
                  <KpiCard label="Cash Conv" value={latestCashFlow?.cashConversion ?? null} suffix="%" />
                  <KpiCard label="CFO CAGR" value={cagr(latestCashFlow?.cfo ?? null, cashFlowSummaries[0]?.cfo ?? null, cashFlowSummaries.length)} suffix="%" />
                </>
 ) : (
 <>
 {activeCompanyEntry?.reportingType === 'financial' ? (
 <>
 <KpiCard label="Total Income" value={latest.rev} trend={kpiData.length > 1 ? yoy(latest.rev, kpiData[kpiData.length - 2]?.rev) : null} />
 <KpiCard label="PAT" value={latest.pat} trend={kpiData.length > 1 ? yoy(latest.pat, kpiData[kpiData.length - 2]?.pat) : null} />
 <KpiCard label="Total Assets" value={latest.ta} />
 <KpiCard label="CFO" value={latest.cfo} />
 <KpiCard label="NIM" value={safePct(latest.pbt, latest.ta)} suffix="%" />
 <KpiCard label="CAGR Income" value={cagr(latest.rev, first?.rev, kpiData.length)} suffix="%" />
 </>
 ) : (
 <>
 <KpiCard label="Revenue" value={latest.rev} trend={kpiData.length > 1 ? yoy(latest.rev, kpiData[kpiData.length - 2]?.rev) : null} />
 <KpiCard label="PAT" value={latest.pat} trend={kpiData.length > 1 ? yoy(latest.pat, kpiData[kpiData.length - 2]?.pat) : null} />
 <KpiCard label="Total Assets" value={latest.ta} />
 <KpiCard label="CFO" value={latest.cfo} />
 <KpiCard label="PBT Margin" value={safePct(latest.pbt, latest.rev)} suffix="%" />
 <KpiCard label="CAGR Rev" value={cagr(latest.rev, first?.rev, kpiData.length)} suffix="%" />
 </>
 )}
 </>
 )}
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
            {tab !== 'segments' && tab !== 'charts' && tab !== 'ratios' && (
              <button onClick={() => setCommonSize(!commonSize)}
                className={`ml-auto flex items-center gap-1.5 px-3 py-2 text-[11px] rounded-t-md transition-all ${
                  commonSize ? 'text-purple-300 bg-purple-500/10 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'
                }`}>
                <Percent size={13} /> {commonSize ? 'Absolute' : 'Common-Size'}
              </button>
            )}
          </div>

          {/* Tab content */}
          {tab === 'overview' && <OverviewTab yearsData={yearsData ?? {}} years={years} segData={segData} />}
          {tab === 'ratios' && <RatiosTab yearsData={yearsData ?? {}} years={years} />}
          {tab === 'segments' && <SegmentsView segData={segData} activeTicker={activeTicker} />}
          {tab === 'charts' && <ChartsView kpiData={kpiData} />}
          {tab === 'cashFlow' && <CashFlowView
            data={yearsData}
            years={displayYears}
            allYears={years}
            reportMeta={reportMeta}
            tableModel={cashFlowTable}
            summaries={cashFlowSummaries}
            selectedYears={selectedYears}
            onPresetSelect={setCashFlowPreset}
          />}
          {(tab === 'pnl' || tab === 'balanceSheet') && (tab === 'balanceSheet' ? (
            <BalanceSheetSideBySide data={yearsData} years={displayYears} commonSize={commonSize} />
          ) : (
            <DataDrivenTable data={yearsData} years={displayYears} stmtType={getStmtType(tab)} commonSize={commonSize} />
          ))}
        </>
      )}
    </div>
  );
}

/* ── Cash Flow Waterfall Bridge ──────────────────────────────────────────── */
interface WaterfallItem {
  label: string;
  value: number;
  color: string;
  isNet?: boolean;
}

function buildWaterfallData(summary: CashFlowYearSummary | null): WaterfallItem[] {
  if (!summary) return [];
  const items: WaterfallItem[] = [];
  if (summary.cfo != null) items.push({ label: 'CFO', value: summary.cfo, color: '#10b981' });
  if (summary.capex != null) items.push({ label: 'Capex', value: summary.capex, color: '#ef4444' });
  if (summary.cfi != null && summary.capex != null) {
    // Net investing excluding capex
    const nonCapexInvesting = summary.cfi - summary.capex;
    if (Math.abs(nonCapexInvesting) > 0.1) {
      items.push({ label: 'Other CFI', value: nonCapexInvesting, color: '#f97316' });
    }
  }
  if (summary.dividend != null) items.push({ label: 'Dividend', value: -Math.abs(summary.dividend), color: '#8b5cf6' });
  if (summary.cff != null) {
    const otherCff = summary.cff;
    if (Math.abs(otherCff) > 0.1) {
      items.push({ label: 'Other CFF', value: otherCff, color: '#ec4899' });
    }
  }
  if (summary.netChange != null) {
    items.push({ label: 'Net Change', value: summary.netChange, color: '#3b82f6', isNet: true });
  }
  if (summary.closingCash != null) {
    items.push({ label: 'Closing Cash', value: summary.closingCash, color: '#06b6d4', isNet: true });
  }
  return items;
}

function CashFlowWaterfall({ summary, summaries: _summaries }: { summary: CashFlowYearSummary | null; summaries: CashFlowYearSummary[] }) {
  if (!summary) return <div className="text-center text-gray-400 text-xs">No cash flow data</div>;

  // Build waterfall from the summary for the latest year
  const waterfallItems = buildWaterfallData(summary);
  if (waterfallItems.length === 0) return <div className="text-center text-gray-400 text-xs">No waterfall data</div>;

  // Compute running totals for proper waterfall rendering
  let runningTotal = 0;
  const chartData = waterfallItems.map((item, _index) => {
    const prevTotal = runningTotal;
    if (item.isNet) {
      // Net items start from 0 and grow to their value
      runningTotal = item.value;
      return {
        label: item.label,
        value: item.value,
        base: 0,
        color: item.color,
        isNet: true,
      };
    }
    // Regular items: show from current running total to running total + value
    const newTotal = prevTotal + item.value;
    const barBase = Math.min(prevTotal, newTotal);
    const barValue = Math.abs(item.value);
    runningTotal = newTotal;
    return {
      label: item.label,
      value: barValue,
      base: barBase,
      color: item.color,
      isNet: false,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} tickFormatter={(v: number) => fmtN(v, 0)} />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }}
          formatter={(v: any, n: any, props: any) => {
            const item = chartData[props?.payload?.index ?? 0];
            if (!item) return [fmtN(v, 0), n];
            if (item.isNet) return [fmtN(item.value, 0), 'Value'];
            const actualValue = props?.payload?.value;
            return [fmtN(actualValue, 0), 'Value'];
          }}
        />
        {/* Invisible base bars */}
        <Bar dataKey="base" fill="transparent" stackId="waterfall" barSize={50} />
        {/* Visible value bars */}
        <Bar dataKey="value" stackId="waterfall" barSize={50} radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ── Charts (safe null math) ─────────────────────────────────────────────── */
function CashFlowView({
  data,
  years,
  allYears,
  reportMeta,
  tableModel,
  summaries,
  selectedYears,
  onPresetSelect,
}: {
  data: Record<string, AnnualReportYearData> | null;
  years: string[];
  allYears: string[];
  reportMeta: AnnualReportFileMetadata | null;
  tableModel: { groups: CashFlowTableGroup[]; warnings: string[] };
  summaries: CashFlowYearSummary[];
  selectedYears: string[];
  onPresetSelect: (preset: CashFlowPreset) => void;
}) {
  if (!data) return <div className="glass-card p-5 text-gray-400">No cash flow data for selected years.</div>;
  if (tableModel.groups.length === 0) return <div className="glass-card p-5 text-gray-400">No cash flow data for selected years.</div>;

  const latest = summaries[summaries.length - 1];
  const yearsCovered = allYears.length > 0 ? `${allYears[0]} to ${allYears[allYears.length - 1]}` : 'N/A';
  const generatedAt = reportMeta?.generatedAt ? new Date(reportMeta.generatedAt).toLocaleString() : 'N/A';
  const warningsCount = (reportMeta?.warnings?.length ?? 0) + tableModel.warnings.length;

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button className={`px-3 py-1.5 text-[11px] rounded-md border ${selectedYears.length === 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-gray-800/60 text-gray-300 border-gray-700'}`} onClick={() => onPresetSelect('reset')}>Reset</button>
          <button className={`px-3 py-1.5 text-[11px] rounded-md border ${selectedYears.length === allYears.length ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-gray-800/60 text-gray-300 border-gray-700'}`} onClick={() => onPresetSelect('all')}>All</button>
          <button className="px-3 py-1.5 text-[11px] rounded-md border bg-gray-800/60 text-gray-300 border-gray-700" onClick={() => onPresetSelect('5y')}>5Y</button>
          <button className="px-3 py-1.5 text-[11px] rounded-md border bg-gray-800/60 text-gray-300 border-gray-700" onClick={() => onPresetSelect('3y')}>3Y</button>
        </div>
        <div className="text-[11px] text-gray-400 flex flex-wrap gap-3">
          <span>Years: <span className="text-gray-200">{yearsCovered}</span></span>
          <span>Source: <span className="text-gray-200">Standalone annual reports</span></span>
          <span>Generated: <span className="text-gray-200">{generatedAt}</span></span>
          <span>Warnings: <span className="text-gray-200">{warningsCount}</span></span>
        </div>
      </div>

      <div className="glass-card p-4 overflow-x-auto">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 mb-4">
          <KpiCard label="CFO" value={latest?.cfo ?? null} />
          <KpiCard label="FCF" value={latest?.fcf ?? null} />
          <KpiCard label="Capex" value={latest?.capex == null ? null : Math.abs(latest.capex)} />
          <KpiCard label="Cash Conv" value={latest?.cashConversion ?? null} suffix="%" />
          <KpiCard label="Dividend / FCF" value={latest?.dividendPayout ?? null} suffix="%" />
          <KpiCard label="Closing Cash" value={latest?.closingCash ?? null} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ChartPanel title="Cash Conversion Trend" icon={<LineChart size={14} className="text-emerald-400" />}>
            <ComposedChart data={summaries}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="cashConversion" name="Cash Conversion %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line dataKey="dividendPayout" name="Dividend / FCF %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ChartPanel>

          <ChartPanel title="CFO vs FCF" icon={<DollarSign size={14} className="text-emerald-400" />}>
            <ComposedChart data={summaries}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cfo" name="CFO" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fcf" name="FCF" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ChartPanel>
        </div>

        {/* Cash Flow Waterfall Chart — latest year bridge */}
        <div className="glass-card p-4 mb-4">
          <h3 className="text-sm font-semibold text-white mb-3">Cash Flow Bridge ({latest?.fy ?? ''} — Cr)</h3>
          <div className="h-[280px]">
            <CashFlowWaterfall summary={latest} summaries={summaries} />
          </div>
        </div>

        <table className="w-full text-xs tabular-nums" style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 text-gray-400 font-medium">Cash Flow Statement</th>
              {years.map(fy => (
                <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "FY '")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableModel.groups.map(group => (
              <React.Fragment key={group.header}>
                <tr>
                  <td className="text-[11px] font-bold text-emerald-300 pt-4 pb-1 border-b border-emerald-500/20" colSpan={years.length + 1}>
                    {group.header}
                  </td>
                </tr>
                {group.rows.map(row => (
                  <tr key={`${group.header}-${row.key}`} className={`hover:bg-white/[0.03] ${row.isTotal ? 'border-t border-gray-800/80' : ''}`}>
                    <td className={`py-1.5 pr-4 text-[11px] max-w-[280px] ${row.isTotal ? 'text-white font-semibold' : 'text-gray-300'}`}>{row.label}</td>
                    {row.values.map((value, idx) => (
                      <td key={idx} className={`text-right py-1.5 px-2 text-[11px] ${
                        value == null || value === 0 ? 'text-gray-600' : value < 0 ? 'text-rose-300' : 'text-white'
                      }`}>
                        {formatCashFlowValue(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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

/* ── Balance Sheet Side-by-Side View ──────────────────────────────────────── */
function BalanceSheetSideBySide({ data, years, commonSize }: { data: Record<string, AnnualReportYearData>; years: string[]; commonSize: boolean; }) {
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

/* ── Data-Driven Table ───────────────────────────────────────────────────── */
function DataDrivenTable({ data, years, stmtType, commonSize }: {
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

/* ── Segments Tab ─────────────────────────────────────────────────────────── */
function SegmentsView({ segData, activeTicker }: { segData: any; activeTicker: string }) {
  if (activeTicker !== 'ITC') {
    return <div className="glass-card p-5 text-center text-gray-400">No segment data for this company yet.</div>;
  }

  const series = segData?.segment_time_series;
  if (!series || Object.keys(series).length === 0) {
    return <div className="glass-card p-5 text-center text-gray-400">No segment data.</div>;
  }

  const sectionLabels: Record<string, string> = { revenue: 'Segment Revenue', results: 'Segment Results', assets: 'Segment Assets', liabilities: 'Segment Liabilities' };
  const allFys = [...new Set(Object.values(series as Record<string, Record<string, number>>).flatMap(v => Object.keys(v)))].sort();
  const displayFys = allFys.filter(fy => fy >= 'FY2016');
  const basis = segData?.basis ? String(segData.basis) : 'standalone';
  const coverage = segData?.coverageBySection;
  const latestFy = displayFys[displayFys.length - 1];
  const isExcludedDonutLabel = (name: string) => {
    const lower = name.toLowerCase();
    return lower.includes('total') || lower.includes('elimination') || lower.includes('unallocated') || lower.includes('discontinued');
  };
  const isCoreSegment = (name: string) => {
    const lower = name.toLowerCase();
    return !lower.includes('total') && !lower.includes('elimination') && !lower.includes('unallocated') && !lower.includes('discontinued');
  };

  if (displayFys.length === 0) {
    return <div className="glass-card p-5 text-center text-gray-400">No segment years available.</div>;
  }

  // Gather core segment names from revenue keys
  const coreSegments = Object.keys(series)
    .filter(k => k.startsWith('revenue|'))
    .map(k => k.split('|').slice(1).join('|'))
    .filter(isCoreSegment);

  // Stacked area chart data
  const areaData = displayFys.map(fy => {
    const row: any = { fy: fy.replace('FY', "'") };
    coreSegments.forEach(seg => {
      const val = series['revenue|' + seg]?.[fy];
      row[seg] = typeof val === 'number' && !isNaN(val) ? val : 0;
    });
    return row;
  });

  // ROCE bar chart: results / assets for latest year
  const roceData = coreSegments.map(seg => {
    const res = series['results|' + seg]?.[latestFy];
    const ast = series['assets|' + seg]?.[latestFy];
    const roce = res && ast && ast !== 0 ? (res / ast) * 100 : null;
    return { name: seg, roce: roce !== null ? parseFloat(roce.toFixed(1)) : null };
  }).filter(d => d.roce !== null).sort((a, b) => (b.roce || 0) - (a.roce || 0));

  // Margin scatter: revenue vs results for latest year
  const scatterData = coreSegments.map(seg => {
    const rev = series['revenue|' + seg]?.[latestFy];
    const res = series['results|' + seg]?.[latestFy];
    return {
      name: seg,
      revenue: typeof rev === 'number' && !isNaN(rev) ? rev : null,
      results: typeof res === 'number' && !isNaN(res) ? res : null,
    };
  }).filter(d => d.revenue !== null && d.results !== null);

  return (
    <div className="space-y-6">
      <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
        <span>Basis: <span className="text-emerald-300 capitalize">{basis}</span></span>
        <span>Years: <span className="text-gray-300">{displayFys[0]}-{displayFys[displayFys.length - 1]}</span></span>
        {coverage && (
          <span>
            Coverage: {Object.entries(coverage as Record<string, { items?: number }>).map(([k, v]) => `${k} ${v.items ?? 0}`).join(' / ')}
          </span>
        )}
      </div>

      {/* Stacked Area — Revenue Mix Over Time */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Segment Revenue Mix Over Time</h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="fy" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} tickFormatter={(v: number) => fmtN(v, 0)} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} formatter={(value: any, name: any) => [fmtN(value, 0), name]} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {coreSegments.map((seg, i) => (
                <Area key={seg} type="monotone" dataKey={seg} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.7} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut + ROCE + Scatter grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Segment Revenue Mix ({latestFy.replace('FY', "'")})</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {(() => {
                  const pieData = Object.entries(series).filter(([k]) => k.startsWith('revenue|'))
                    .map(([k, v]) => ({ name: k.split('|')[1], value: (v as any)[latestFy] || 0 }))
                    .filter(d => !isExcludedDonutLabel(d.name))
                    .filter(d => d.value > 0 && d.value !== Infinity && !Number.isNaN(d.value));
                  if (pieData.length === 0) return <div className="text-center text-gray-400">No data</div>;
                  pieData.sort((a, b) => SEGMENT_DONUT_ORDER.indexOf(a.name) - SEGMENT_DONUT_ORDER.indexOf(b.name));
                  return (
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                      label={({ name, value }: any) => `${name} (${fmtN(value, 0)})`} labelLine
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  );
                })()}
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Segment ROCE ({latestFy.replace('FY', "'")})</h3>
          <div className="h-[240px]">
            {roceData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-xs">No ROCE data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={roceData} layout="vertical" margin={{ top: 5, right: 20, left: 110, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} axisLine={{ stroke: '#374151' }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v}%`, 'ROCE']} />
                  <Bar dataKey="roce" fill="#10b981" radius={[0, 4, 4, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Segment Results vs Revenue ({latestFy.replace('FY', "'")})</h3>
          <div className="h-[240px]">
            {scatterData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={scatterData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="revenue" type="number" name="Revenue" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} tickFormatter={(v: number) => fmtN(v, 0)} />
                  <YAxis dataKey="results" type="number" name="Results" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} tickFormatter={(v: number) => fmtN(v, 0)} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} formatter={(v: any, n: any) => [fmtN(v, 0), n]} cursor={{ strokeDasharray: '3 3' }} />
                  <Bar dataKey="results" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
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
                  {displayFys.map(fy => <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "'")}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map(([key, vals]) => {
                  const name = key.split('|').slice(1).join('|');
                  const vmap = vals as Record<string, number>;
                  return (
                    <tr key={key} className="hover:bg-white/[0.03]">
                      <td className="py-1.5 pr-4 text-gray-300 text-[11px]">{name}</td>
                      {displayFys.map(fy => (
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
