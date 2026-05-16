import { useEffect, useState, useMemo } from 'react';
import {
 BookOpen, TrendingUp, PieChart, Layers, DollarSign, LineChart,
 Percent, Scale, Shield, AlertTriangle, Building2, Tag, Filter,
 ShieldCheck, BarChart3, Calculator, Users, Gift, FileText
} from 'lucide-react';
import { OverviewTab } from './OverviewTab';
import { RatiosTab } from './RatiosTab';
import {
  type AnnualReportDataFile,
  type AnnualReportFileMetadata,
  type AnnualReportYearData,
  type CashFlowPreset,
  buildCashFlowTableModel,
  buildCashFlowYearSummaries,
  getDisplayYears,
  getYearPresetYears,
} from '@/utils/annualReportCashFlow';
import { KpiCard } from './KpiCard';
import { ErrorBoundary } from './ErrorBoundary';
import { findItem, safePct } from './utils';
import { LoadingSkeleton } from './LoadingSkeleton';
import { CashFlowView } from './CashFlowView';
import { ChartsView } from './ChartsView';
import { BalanceSheetSideBySide } from './BalanceSheetSideBySide';
import { DataDrivenTable } from './DataDrivenTable';
import { SegmentsView } from './SegmentsView';
import { QualityTab } from './ar/tabs/QualityTab';
import { ForecastsTab } from './ar/tabs/ForecastsTab';
import { ValuationTab } from './ar/tabs/ValuationTab';
import { PeersTab } from './ar/tabs/PeersTab';
import { DividendsTab } from './ar/tabs/DividendsTab';
import { ReportsTab } from './ar/tabs/ReportsTab';

type Tab = 'overview' | 'pnl' | 'balanceSheet' | 'cashFlow' | 'segments' | 'charts' | 'ratios' | 'quality' | 'forecasts' | 'valuation' | 'peers' | 'dividends' | 'reports';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'pnl', label: 'P&L', icon: TrendingUp },
  { id: 'balanceSheet', label: 'Balance Sheet', icon: PieChart },
  { id: 'cashFlow', label: 'Cash Flow', icon: DollarSign },
  { id: 'segments', label: 'Segments', icon: Layers },
  { id: 'charts', label: 'Charts', icon: LineChart },
  { id: 'ratios', label: 'Ratios', icon: Scale },
  { id: 'quality', label: 'Quality', icon: ShieldCheck },
  { id: 'forecasts', label: 'Forecasts', icon: BarChart3 },
  { id: 'valuation', label: 'Valuation', icon: Calculator },
  { id: 'peers', label: 'Peers', icon: Users },
  { id: 'dividends', label: 'Dividends', icon: Gift },
  { id: 'reports', label: 'Reports', icon: FileText },
];

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
      fetch(`/data/segment_data_${activeTicker.toLowerCase()}.json?v=${Date.now()}`).then(r => r.ok ? r.json() : { segment_time_series: {} }).catch(() => ({ segment_time_series: {} })),
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
  const displayYears = getDisplayYears(selectedYears, years, tab as any);

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

      {!error && !yearsData && <LoadingSkeleton />}

      {/* Main content — only when data is loaded */}
      {!error && yearsData && (
        <>
          {/* KPI cards — skip on overview and ratios (have their own) */}
          {(['pnl', 'balanceSheet', 'cashFlow', 'segments', 'charts'] as Tab[]).includes(tab) && latest && (
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
            {(tab === 'pnl' || tab === 'balanceSheet') && (
              <button onClick={() => setCommonSize(!commonSize)}
                className={`ml-auto flex items-center gap-1.5 px-3 py-2 text-[11px] rounded-t-md transition-all ${
                  commonSize ? 'text-purple-300 bg-purple-500/10 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'
                }`}>
                <Percent size={13} /> {commonSize ? 'Absolute' : 'Common-Size'}
              </button>
            )}
          </div>

          {/* Tab content */}
          {tab === 'overview' && (
            <ErrorBoundary fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Chart rendering failed.</div>}>
              <OverviewTab yearsData={yearsData ?? {}} years={years} segData={segData} />
            </ErrorBoundary>
          )}
          {tab === 'ratios' && (
            <ErrorBoundary fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Chart rendering failed.</div>}>
              <RatiosTab yearsData={yearsData ?? {}} years={years} />
            </ErrorBoundary>
          )}
          {tab === 'segments' && (
            <ErrorBoundary fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Chart rendering failed.</div>}>
              <SegmentsView segData={segData} />
            </ErrorBoundary>
          )}
          {tab === 'charts' && (
            <ErrorBoundary fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Chart rendering failed.</div>}>
              <ChartsView kpiData={kpiData} />
            </ErrorBoundary>
          )}
          {tab === 'cashFlow' && (
            <ErrorBoundary fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Chart rendering failed.</div>}>
              <CashFlowView
                data={yearsData}
                years={displayYears}
                allYears={years}
                reportMeta={reportMeta}
                tableModel={cashFlowTable}
                summaries={cashFlowSummaries}
                selectedYears={selectedYears}
                onPresetSelect={setCashFlowPreset}
              />
            </ErrorBoundary>
          )}

          {tab === 'quality' && (
            <ErrorBoundary fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Quality analytics failed.</div>}>
              <QualityTab yearsData={yearsData ?? {}} years={years} />
            </ErrorBoundary>
          )}
          {tab === 'forecasts' && (
            <ErrorBoundary fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Forecast model failed.</div>}>
              <ForecastsTab yearsData={yearsData ?? {}} years={years} />
            </ErrorBoundary>
          )}
          {tab === 'valuation' && (
            <ErrorBoundary fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Valuation model failed.</div>}>
              <ValuationTab yearsData={yearsData ?? {}} years={years} marketCapCr={activeCompanyEntry?.marketCapCr ?? null} />
            </ErrorBoundary>
          )}
          {tab === 'peers' && (
            <ErrorBoundary fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Peer comparison failed.</div>}>
              <PeersTab ticker={activeTicker} yearsData={yearsData ?? {}} years={years} sector={activeCompanyEntry?.sector ?? null} />
            </ErrorBoundary>
          )}
          {tab === 'dividends' && (
            <ErrorBoundary fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Dividend analytics failed.</div>}>
              <DividendsTab yearsData={yearsData ?? {}} years={years} />
            </ErrorBoundary>
          )}
          {tab === 'reports' && (
            <ErrorBoundary fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Report index failed.</div>}>
              <ReportsTab ticker={activeTicker} yearsData={yearsData ?? {}} years={years} reportMeta={reportMeta} />
            </ErrorBoundary>
          )}
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

