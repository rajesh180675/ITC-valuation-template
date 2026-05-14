import { useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import type { SensexConstituent, SensexYearFinancial } from '@/data/sensexData';
import type { LedgerRow } from '@/utils/export';
import {
  buildSensexIndexTimeSeries, buildSensexSectorSummary,
  getLatestSensexFinancial, getPrimaryValuationLabel,
} from '@/utils/itcModel';
import {
  buildFactorScores, buildMagicFormulaRanks, buildSectorAnalytics,
  buildSectorMomentumGrid, buildValuationZScores, computeConcentration,
  costOfEquity, impliedPerpetualGrowth,
  MARKET_PARAMS,
} from '@/utils/sensexAnalytics';
import { fmt, fmtN } from '@/components/itc/shared';
import {
  Kpi, RangeSelector, UniverseEarningsPower, SectorComposition,
  SectorAnalyticsTable, TopWeightsChart, GrowthValuationScatter,
  ImpliedVsRealizedScatter, FactorScorecard, MagicFormulaCard,
  SectorMomentumHeatmap, DataProvenanceBanner, ConstituentLedger, DrillDown,
  ROCEDistribution, CapitalEfficiencyQuadrant,
} from './shared';

type Filter = 'all' | 'financial' | 'nonFinancial';
type SortKey =
  | 'weight' | 'mcap' | 'topline' | 'toplineCagr' | 'profitCagr'
  | 'roe' | 'valuation' | 'beta' | 'coe' | 'impliedG' | 'composite';

const DATA_URL = '/data/nifty750_real.json';
const BATCH_SLUGS = ['largemidcap250', 'smallcap250', 'microcap250', 'yfinance-expanded'] as const;
type BatchSlug = typeof BATCH_SLUGS[number];
const BATCH_LABELS: Record<BatchSlug, string> = {
  largemidcap250: 'Nifty LargeMidcap 250',
  smallcap250: 'Nifty Smallcap 250',
  microcap250: 'Nifty Microcap 250',
  'yfinance-expanded': 'YFinance Expansion',
};

/* ── Safe helpers ─────────────────────────────────────────────────────────── */
const DEFAULT_HISTORY: SensexYearFinancial = {
  fy: '', toplineCr: 0, netProfitCr: 0, roePct: 0,
  operatingMarginPct: undefined, rocePct: undefined
};

function safeHistory(c: SensexConstituent, i: number): SensexYearFinancial {
  try {
    if (!c?.history?.length) return DEFAULT_HISTORY;
    return c.history[i] ?? c.history[0] ?? DEFAULT_HISTORY;
  } catch {
    return DEFAULT_HISTORY;
  }
}

function safeLastHistory(c: SensexConstituent): SensexYearFinancial {
  try {
    if (!c?.history?.length) return DEFAULT_HISTORY;
    return c.history[c.history.length - 1] ?? c.history[0] ?? DEFAULT_HISTORY;
  } catch {
    return DEFAULT_HISTORY;
  }
}
function safeCagr(start: number | undefined, end: number | undefined, periods: number): number {
  try {
    if (start == null || end == null || start <= 0 || end <= 0 || periods <= 0) return 0;
    return (Math.pow(end / start, 1 / periods) - 1) * 100;
  } catch { return 0; }
}

export function Nifty750UniverseSection() {
  const [selectedId, setSelectedId] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('composite');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedBatch, setSelectedBatch] = useState<BatchSlug>('largemidcap250');
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dataQualityIssues, setDataQualityIssues] = useState<DataQualityIssue[]>([]);
  const [arTickers, setArTickers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string[]>([]);

  /* ── Data fetch with error boundary ───────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    fetch(DATA_URL)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) { setRawData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    // Also fetch AR index to know which companies have annual report data
    fetch('/data/ar/company_index.json')
      .then(r => r.ok ? r.json() : null)
      .then(idx => {
        if (!cancelled && idx?.companies) {
          setArTickers(new Set(idx.companies.filter((c: any) => c.hasAr).map((c: any) => c.ticker)));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /* ── Batch companies ──────────────────────────────────────────────────── */
  const batchCompaniesRaw: SensexConstituent[] = useMemo(() => {
    try {
      if (!rawData?.batches) return [];
      const batch = rawData.batches.find((b: any) => b.indexSlug === selectedBatch);
      if (!batch?.companies?.length) return [];
      const totalCount = batch.companies.length;
      // Collect quality issues during adaptation
      const issues: DataQualityIssue[] = [];
      const adapted = batch.companies
        .map((c: any, idx: number) => adaptConstituent(c, idx, totalCount, issues))
        .filter((c: SensexConstituent | null): c is SensexConstituent => c !== null);
      // Update quality issues state
      setDataQualityIssues(issues.slice(0, 20)); // Limit to 20 issues
      // Normalize weights if all were fallback values
      return normalizeBatchWeights(adapted);
    } catch (e) {
      console.error('Error processing batch:', e);
      return [];
    }
  }, [rawData, selectedBatch]);

  // Sort by weight descending (standard index convention)
  const batchCompanies = useMemo(() => {
    return [...batchCompaniesRaw].sort((a, b) => b.weightPct - a.weightPct);
  }, [batchCompaniesRaw]);

  /* ── Dynamic fiscal years ─────────────────────────────────────────────── */
  const [years, setYears] = useState<string[]>([]);
  useEffect(() => {
    try {
      if (batchCompanies.length > 0) {
        const fySet = new Set<string>();
        batchCompanies.forEach(c => (c.history || []).forEach(h => { if (h?.fy) fySet.add(h.fy); }));
        const sorted = Array.from(fySet).sort();
        if (sorted.length > 0) setYears(sorted);
      }
    } catch { /* ignore */ }
  }, [batchCompanies]);

  /* ── Reset selectedId when batch changes ──────────────────────────────── */
  useEffect(() => {
    if (batchCompanies.length > 0) {
      const stillExists = batchCompanies.find(c => c.id === selectedId);
      if (!stillExists) setSelectedId(batchCompanies[0]?.id ?? '');
    }
  }, [batchCompanies]); // eslint-disable-line

  const [filterVal, setFilterVal] = useState<Filter>('all');
  const totalYears = years.length;
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(totalYears - 1);
  useEffect(() => { setRangeEnd(Math.max(0, totalYears - 1)); }, [totalYears]);

  /* ── All sectors (for filter UI) ──────────────────────────────────────── */
  const allSectors = useMemo(() => {
    try {
      return [...new Set(batchCompanies.map(c => c?.sector ?? 'Unknown'))].sort();
    } catch { return []; }
  }, [batchCompanies]);

  /* ── Filtered companies (search + sector + type) ──────────────────────── */
  const filteredCompanies = useMemo(() => {
    try {
      let list: SensexConstituent[] = filterVal === 'all' ? batchCompanies : batchCompanies.filter(c => c?.reportingType === filterVal);
      // Search by ticker or name
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter(c =>
          (c?.ticker ?? '').toLowerCase().includes(q) ||
          (c?.name ?? '').toLowerCase().includes(q)
        );
      }
      // Filter by selected sectors
      if (sectorFilter.length > 0) {
        list = list.filter(c => sectorFilter.includes(c?.sector ?? ''));
      }
      return list;
    } catch { return []; }
  }, [filterVal, searchQuery, sectorFilter, batchCompanies]);

  /* ── Safe year bounds ──────────────────────────────────────────────────── */
  const safeRangeStart = Math.min(rangeStart, Math.max(0, totalYears - 1));
  const safeRangeEnd = Math.min(rangeEnd, Math.max(0, totalYears - 1));
  const safePeriods = Math.max(1, safeRangeEnd - safeRangeStart);

  const startFy = years[safeRangeStart] ?? years[0] ?? '';
  const endFy = years[safeRangeEnd] ?? years[years.length - 1] ?? '';
  const rangeLabel = startFy ? `${startFy}–${endFy}` : '';

  /* ── Analytics (all try-catch wrapped) ────────────────────────────────── */
  const indexSeries = useMemo(() => { try { return buildSensexIndexTimeSeries(filteredCompanies); } catch { return []; } }, [filteredCompanies]);
  const sectorSummary = useMemo(() => { try { return buildSensexSectorSummary(filteredCompanies); } catch { return []; } }, [filteredCompanies]);
  const sectorAnalytics = useMemo(() => { try { return buildSectorAnalytics(filteredCompanies, safeRangeStart, safeRangeEnd); } catch { return []; } }, [filteredCompanies, safeRangeStart, safeRangeEnd]);
  const concentration = useMemo(() => { try { return computeConcentration(filteredCompanies); } catch { return { hhi: 0, effectiveN: 0, top3Pct: 0, top5Pct: 0, top10Pct: 0 }; } }, [filteredCompanies]);
  const factorScores = useMemo(() => { try { return buildFactorScores(filteredCompanies, safeRangeStart, safeRangeEnd); } catch { return new Map(); } }, [filteredCompanies, safeRangeStart, safeRangeEnd]);
  const magicFormula = useMemo(() => { try { return buildMagicFormulaRanks(filteredCompanies); } catch { return []; } }, [filteredCompanies]);
  const sectorMomentum = useMemo(() => { try { return buildSectorMomentumGrid(filteredCompanies); } catch { return []; } }, [filteredCompanies]);
  const valuationZ = useMemo(() => { try { return buildValuationZScores(filteredCompanies); } catch { return new Map(); } }, [filteredCompanies]);

  /* ── Row computations ──────────────────────────────────────────────────── */
  const rows = useMemo(() => {
    try {
      return filteredCompanies.map(company => {
        const first = safeHistory(company, safeRangeStart);
        const last = safeLastHistory(company);
        const profitCagr = safeCagr(first.netProfitCr, last.netProfitCr, safePeriods);
        const toplineCagr = safeCagr(first.toplineCr, last.toplineCr, safePeriods);
        let coe = 0, impliedG = 0, scores, valZ;
        try { coe = costOfEquity(company.beta); } catch { /* default 0 */ }
        try { impliedG = impliedPerpetualGrowth(company); } catch { /* default 0 */ }
        try { scores = factorScores.get(company.id); } catch { scores = undefined; }
        try { valZ = valuationZ.get(company.id); } catch { valZ = undefined; }
        return {
          company, first, last,
          toplineCagr, profitCagr,
          coe, impliedG,
          gap: profitCagr - impliedG,
          scores: scores ?? { quality: 0, value: 0, growth: 0, momentum: 0, composite: 0 },
          valuationLabel: getPrimaryValuationLabel(company),
          valuationZ: valZ?.zScore ?? 0,
          sectorMedianMultiple: valZ?.sectorMedian ?? company.valuationMultiple,
        };
      });
    } catch { return []; }
  }, [filteredCompanies, safeRangeStart, safeRangeEnd, safePeriods, factorScores, valuationZ]);

  /* ── Sorted rows ───────────────────────────────────────────────────────── */
  const sortedRows = useMemo(() => {
    try {
      const dir = sortDir === 'asc' ? 1 : -1;
      const get = (r: any): number => {
        try {
          switch (sortKey) {
            case 'weight': return r?.company?.weightPct ?? 0;
            case 'mcap': return r?.company?.marketCapCr ?? 0;
            case 'topline': return r?.last?.toplineCr ?? 0;
            case 'toplineCagr': return r?.toplineCagr ?? 0;
            case 'profitCagr': return r?.profitCagr ?? 0;
            case 'roe': return r?.last?.roePct ?? 0;
            case 'valuation': return r?.company?.valuationMultiple ?? 0;
            case 'beta': return r?.company?.beta ?? 0;
            case 'coe': return r?.coe ?? 0;
            case 'impliedG': return r?.impliedG ?? 0;
            case 'composite': return r?.scores?.composite ?? 0;
          }
        } catch { return 0; }
        return 0;
      };
      return [...rows].sort((a, b) => (get(a) - get(b)) * dir);
    } catch { return []; }
  }, [rows, sortKey, sortDir]);

  /* ── Aggregate stats ──────────────────────────────────────────────────── */
  const totalMarketCap = useMemo(() => {
    try { return filteredCompanies.reduce((s, c) => s + (c?.marketCapCr ?? 0), 0); } catch { return 0; }
  }, [filteredCompanies]);
  const bfsiWeight = useMemo(() => {
    try {
      return filteredCompanies.filter(c => c?.reportingType === 'financial')
        .reduce((s, c) => s + (c?.weightPct ?? 0), 0);
    } catch { return 0; }
  }, [filteredCompanies]);
  const corpWeight = 100 - bfsiWeight;
  const largestSector = sectorSummary?.[0] ?? null;

  const indexStart = indexSeries?.[safeRangeStart];
  const indexEnd = indexSeries?.[safeRangeEnd];
  const universeToplineCagr = safeCagr(indexStart?.toplineCr, indexEnd?.toplineCr, safePeriods);
  const universeProfitCagr = safeCagr(indexStart?.netProfitCr, indexEnd?.netProfitCr, safePeriods);
  const weightedBeta = useMemo(() => {
    try {
      return filteredCompanies.reduce((s, c) => s + ((c?.weightPct ?? 0) / 100) * (c?.beta ?? 0), 0);
    } catch { return 0; }
  }, [filteredCompanies]);
  const weightedCoe = MARKET_PARAMS.riskFreeRatePct + weightedBeta * MARKET_PARAMS.equityRiskPremiumPct;

  const medianPatCagr = useMemo(() => {
    try {
      const values = rows.map(r => r.profitCagr).filter(v => typeof v === 'number').sort((a, b) => a - b);
      if (values.length === 0) return 0;
      const mid = Math.floor(values.length / 2);
      return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
    } catch { return 0; }
  }, [rows]);

  const averageRoe = useMemo(() => {
    try {
      if (filteredCompanies.length === 0) return 0;
      let sum = 0, count = 0;
      filteredCompanies.forEach(c => {
        try {
          const fin = getLatestSensexFinancial(c);
          if (fin?.roePct != null) { sum += fin.roePct; count++; }
        } catch { /* skip */ }
      });
      return count > 0 ? sum / count : 0;
    } catch { return 0; }
  }, [filteredCompanies]);

  /* ── Selection ──────────────────────────────────────────────────────────── */
  const selectedRow = sortedRows.length > 0
    ? (sortedRows.find(r => r?.company?.id === selectedId) ?? sortedRows[0])
    : null;
  const selectedCompany = selectedRow?.company ?? filteredCompanies[0] ?? null;

  /* ── Chart data ─────────────────────────────────────────────────────────── */
  const topWeightData = useMemo(() => {
    try {
      return [...filteredCompanies]
        .sort((a, b) => (b?.weightPct ?? 0) - (a?.weightPct ?? 0))
        .slice(0, 12)
        .map(c => ({ name: c?.ticker ?? '', weightPct: c?.weightPct ?? 0, color: c?.color ?? '#60a5fa' }));
    } catch { return []; }
  }, [filteredCompanies]);

  const growthVsValuation = useMemo(() => {
    try {
      return rows.map(r => ({
        name: r?.company?.ticker ?? '', x: r?.profitCagr ?? 0, y: r?.company?.valuationMultiple ?? 0,
        z: Math.log(Math.max(1, r?.company?.marketCapCr ?? 1)) * 10,
        color: r?.company?.color ?? '#60a5fa', sector: r?.company?.sector ?? '', metric: r?.valuationLabel ?? 'P/E',
      }));
    } catch { return []; }
  }, [rows]);

  const impliedVsRealized = useMemo(() => {
    try {
      return rows.map(r => ({
        name: r?.company?.ticker ?? '', x: r?.impliedG ?? 0, y: r?.profitCagr ?? 0,
        z: Math.log(Math.max(1, r?.company?.marketCapCr ?? 1)) * 10,
        color: r?.company?.color ?? '#60a5fa', sector: r?.company?.sector ?? '', gap: r?.gap ?? 0, coe: r?.coe ?? 0,
      }));
    } catch { return []; }
  }, [rows]);

  const sortCaret = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const setQuickRange = (n: number) => {
    try {
      if (totalYears > 0) {
        setRangeStart(Math.max(0, totalYears - 1 - n));
        setRangeEnd(totalYears - 1);
      }
    } catch { /* ignore */ }
  };

  /* ── Guard: loading ─────────────────────────────────────────────────────── */
  if (loading) {
    return <div className="glass-card p-8 text-center text-gray-400 animate-pulse">Loading Nifty 750 data…</div>;
  }
  if (!rawData) {
    return (
      <div className="glass-card p-8 text-center text-gray-400">
        Unable to load Nifty 750 data. Ensure <code className="px-1">npm run data:refresh-nifty750</code> has been run.
      </div>
    );
  }
  if (batchCompanies.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-gray-400">
        No companies found for {BATCH_LABELS[selectedBatch]}. Try a different index.
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="premium-card p-6 md:p-7">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 mb-3">
              <span className="pill"><Layers size={13} /> Universe</span>
              <span className="pill pill-muted">{BATCH_LABELS[selectedBatch]} · {batchCompanies.length} Constituents</span>
              {rangeLabel && <span className="pill pill-muted">{rangeLabel}</span>}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Nifty 750 <span className="text-[color:var(--color-gold-light)]">Universe</span>
            </h2>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl leading-relaxed">
              Cross-sectional view of three NSE indices &mdash; {years.length} fiscal years of screener.in data.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <select
              className="bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-white"
              value={selectedBatch}
              onChange={e => { setSelectedBatch(e.target.value as BatchSlug); setFilterVal('all'); setSelectedId(''); }}
            >
              {BATCH_SLUGS.map(slug => (
                <option key={slug} value={slug}>
                  {BATCH_LABELS[slug]} ({rawData?.batches?.find((b: any) => b?.indexSlug === slug)?.companies?.length ?? 0})
                </option>
              ))}
            </select>
            <div className="segmented">
              {([{ id: 'all' as const, label: 'All' }, { id: 'nonFinancial' as const, label: 'Corporates' }, { id: 'financial' as const, label: 'BFSI' }]).map(opt => (
                <button key={opt.id} onClick={() => setFilterVal(opt.id)} className={filterVal === opt.id ? 'active' : ''}>{opt.label}</button>
              ))}
            </div>
            <div className="segmented">
              {[5, 10, 13].map(n => {
                const isActive = totalYears > 0 && rangeStart === Math.max(0, totalYears - 1 - n) && rangeEnd === totalYears - 1;
                return <button key={n} onClick={() => setQuickRange(n)} className={isActive ? 'active' : ''}>{n}Y</button>;
              })}
            </div>
            <input
              type="search"
              placeholder="Search ticker or name…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 w-48"
            />
            {allSectors.length > 0 && (
              <div className="dropdown-wrapper">
                <details className="group/details">
                  <summary className="cursor-pointer text-[11px] font-semibold text-gray-200 bg-black/40 hover:bg-black/60 border border-border rounded-md px-3 py-1.5 transition select-none">
                    Sector {sectorFilter.length > 0 ? `(${sectorFilter.length})` : ''}
                  </summary>
                  <div className="absolute right-0 mt-1 w-56 max-h-64 overflow-y-auto bg-surface-3 border border-border rounded-lg p-2 z-50 shadow-xl">
                    <label className="flex items-center gap-2 text-xs text-gray-200 px-1 py-1 hover:bg-white/5 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sectorFilter.length === 0}
                        onChange={e => { if (e.target.checked) setSectorFilter([]); }}
                        className="rounded border-border bg-transparent"
                      />
                      All sectors
                    </label>
                    <div className="hairline-divider my-1" />
                    {allSectors.map(s => (
                      <label key={s} className="flex items-center gap-2 text-xs text-gray-200 px-1 py-1 hover:bg-white/5 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sectorFilter.includes(s)}
                          onChange={() => {
                            const next = sectorFilter.includes(s)
                              ? sectorFilter.filter(x => x !== s)
                              : [...sectorFilter, s];
                            setSectorFilter(next);
                          }}
                          className="rounded border-border bg-transparent"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
        <div className="hairline-divider my-5" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-5">
          <Kpi label="Constituents" value={String(filteredCompanies.length)} sub={`of ${batchCompanies.length} total`} />
          <Kpi label="Market Cap" value={fmt(totalMarketCap)} sub="aggregate" />
          <Kpi label="BFSI / Corp Mix" value={`${fmtN(bfsiWeight, 1)} / ${fmtN(corpWeight, 1)}`} sub="by weight" tabular />
          <Kpi label="Lead Sector" value={largestSector?.sector ?? '—'} sub={largestSector ? `${fmtN(largestSector.weightPct, 1)}% weight` : '—'} gold smallValue />
          <Kpi label="Universe PAT CAGR" value={`${fmtN(universeProfitCagr, 1)}%`} sub={rangeLabel} tone={universeProfitCagr >= 0 ? 'up' : 'down'} />
          <Kpi label="Median PAT CAGR" value={`${fmtN(medianPatCagr, 1)}%`} sub="constituent median" tone={medianPatCagr >= 0 ? 'up' : 'down'} />
          <Kpi label="Wt. β / CoE" value={`${weightedBeta.toFixed(2)} · ${fmtN(weightedCoe, 1)}%`} sub={`Rf ${MARKET_PARAMS.riskFreeRatePct}% + ERP ${MARKET_PARAMS.equityRiskPremiumPct}%`} tabular smallValue />
          <Kpi label="HHI / Effective N" value={`${concentration.hhi} · ${concentration.effectiveN}`} sub={`Top-5 holds ${fmtN(concentration.top5Pct, 1)}%`} tabular smallValue />
        </div>
      </div>

      <DataProvenanceBanner rows={sortedRows.length > 0 ? sortedRows : []} dataSource="screener-in" />

      {/* Data Quality Warnings */}
      {dataQualityIssues.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-yellow-500/60">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">Data Quality Report</span>
            <span className="text-xs text-gray-500">({dataQualityIssues.length} issues)</span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {dataQualityIssues.slice(0, 10).map((issue, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  issue.severity === 'error' ? 'bg-red-500/20 text-red-400' :
                  issue.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {issue.severity}
                </span>
                <span className="text-gray-400 font-medium">{issue.company}:</span>
                <span className="text-gray-300">{issue.issue}</span>
              </div>
            ))}
            {dataQualityIssues.length > 10 && (
              <div className="text-xs text-gray-500 italic">...and {dataQualityIssues.length - 10} more issues</div>
            )}
          </div>
        </div>
      )}

      {totalYears > 0 && (
        <RangeSelector startFy={startFy} endFy={endFy} rangePeriods={safePeriods}
          rangeStart={safeRangeStart} rangeEnd={safeRangeEnd} totalYears={totalYears}
          setRangeStart={setRangeStart} setRangeEnd={setRangeEnd} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <UniverseEarningsPower indexSeries={indexSeries} startFy={startFy} endFy={endFy}
          filteredCount={filteredCompanies.length}
          universeToplineCagr={universeToplineCagr} universeProfitCagr={universeProfitCagr} averageRoe={averageRoe} />
        <SectorComposition sectorSummary={sectorSummary} filteredCompanies={filteredCompanies} />
      </div>

      <SectorAnalyticsTable data={sectorAnalytics} />
      {sectorMomentum.length > 0 && <SectorMomentumHeatmap rows={sectorMomentum} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ROCEDistribution companies={filteredCompanies} />
        <CapitalEfficiencyQuadrant companies={filteredCompanies} rangeStart={safeRangeStart} rangeEnd={safeRangeEnd} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <TopWeightsChart data={topWeightData} />
        <GrowthValuationScatter data={growthVsValuation} medianPatCagr={medianPatCagr} rangePeriods={safePeriods} />
      </div>

      <ImpliedVsRealizedScatter data={impliedVsRealized} rangePeriods={safePeriods} />

      {magicFormula.length > 0 && <MagicFormulaCard rows={magicFormula} onSelect={setSelectedId} />}

      {sortedRows.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              import('@/utils/export').then(({ exportLedger }) => {
                const ledgerRows: LedgerRow[] = sortedRows.map(r => ({
                  ticker: r?.company?.ticker ?? '',
                  name: r?.company?.name ?? '',
                  sector: r?.company?.sector ?? '',
                  weightPct: r?.company?.weightPct ?? 0,
                  marketCapCr: r?.company?.marketCapCr ?? 0,
                  pe: r?.company?.valuationMultiple ?? 0,
                  roePct: r?.last?.roePct ?? 0,
                  revenueCagr: r?.toplineCagr ?? 0,
                  profitCagr: r?.profitCagr ?? 0,
                  beta: r?.company?.beta ?? 0,
                  compositeScore: r?.scores?.composite ?? 0,
                }));
                const slug = selectedBatch;
                exportLedger(ledgerRows, `nifty750-ledger-${slug}-${endFy}.csv`);
              });
            }}
            className="text-[11px] font-semibold text-gray-200 bg-black/40 hover:bg-black/60 border border-border rounded-md px-3 py-1.5 transition"
          >
            Export Ledger CSV
          </button>
        </div>
      )}

      {sortedRows.length > 0 && (
        <FactorScorecard rows={sortedRows} selectedId={selectedCompany?.id ?? ''} onSelect={setSelectedId} />
      )}

      {sortedRows.length > 0 && (
        <ConstituentLedger rows={sortedRows} selectedId={selectedCompany?.id ?? ''} onSelect={setSelectedId}
          rangeLabel={rangeLabel} endFy={endFy} sortCaret={sortCaret} toggleSort={toggleSort} showZScore={true} />
      )}

      {selectedRow && (
        <DrillDown
          row={selectedRow}
          rangeStart={safeRangeStart}
          rangeEnd={safeRangeEnd}
          rangePeriods={safePeriods}
          arAvailable={arTickers.has(selectedRow.company.ticker)}
        />
      )}
    </div>
  );
}

/* ── Data Quality Warnings ──────────────────────────────────────────────────── */
interface DataQualityIssue {
  company: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
}

function addQualityIssue(
  issues: DataQualityIssue[],
  company: string,
  issue: string,
  severity: 'error' | 'warning' | 'info' = 'warning'
) {
  // Limit issues to avoid console spam
  if (issues.length < 50) {
    issues.push({ company, issue, severity });
  }
}

/* ── Adapter ────────────────────────────────────────────────────────────────── */
function adaptConstituent(
  raw: any,
  index: number,
  totalCount: number,
  issues: DataQualityIssue[]
): SensexConstituent | null {
  try {
    if (!raw) {
      addQualityIssue(issues, `#${index}`, 'Null/undefined raw data', 'error');
      return null;
    }

    const id = raw.id ?? raw.ticker ?? `unknown-${index}`;
    const name = raw.name ?? raw.ticker ?? 'Unknown';
    const ticker = raw.ticker ?? '';

    // Validate required fields
    if (!ticker) {
      addQualityIssue(issues, id, 'Missing ticker symbol', 'error');
      return null;
    }

    // Process history with ROE computation from balance sheet
    const historyRaw = raw.history ?? [];
    if (historyRaw.length === 0) {
      addQualityIssue(issues, ticker, 'No financial history available', 'error');
      return null;
    }

    const history: SensexYearFinancial[] = historyRaw.map((h: any, idx: number) => {
      if (!h?.fy) {
        addQualityIssue(issues, ticker, `History entry #${idx} missing fiscal year`, 'warning');
      }

      const toplineCr = h?.toplineCr ?? 0;
      const netProfitCr = h?.netProfitCr ?? 0;

      // CRITICAL FIX: Compute ROE from balance sheet data
      // ROE = Net Profit / (Equity Capital + Reserves) * 100
      const equityCapitalCr = h?.equityCapitalCr ?? 0;
      const reservesCr = h?.reservesCr ?? 0;
      const totalEquity = equityCapitalCr + reservesCr;

      let roePct = h?.roePct ?? 0;
      // If roePct is 0 or missing, compute from balance sheet
      if ((!roePct || roePct === 0) && totalEquity > 0 && netProfitCr !== 0) {
        roePct = Math.round((netProfitCr / totalEquity) * 100 * 10) / 10;
      }

      // FIX: Map opmPct to operatingMarginPct
      // Also handle case where opmPct might be 0 or undefined
      let operatingMarginPct: number | undefined;
      if (h?.operatingMarginPct !== undefined && h.operatingMarginPct !== null) {
        operatingMarginPct = Number(h.operatingMarginPct);
      } else if (h?.opmPct !== undefined && h.opmPct !== null) {
        operatingMarginPct = Number(h.opmPct);
      }
      // If still undefined but we have topline, try computing from operatingProfit
      if (operatingMarginPct === undefined && toplineCr > 0 && h?.operatingProfitCr) {
        operatingMarginPct = Math.round((h.operatingProfitCr / toplineCr) * 100 * 10) / 10;
      }

      // FIX: Map rocePct (handle 0 values which are common in early years)
      let rocePct: number | undefined;
      if (h?.rocePct !== undefined && h.rocePct !== null && h.rocePct !== 0) {
        rocePct = Number(h.rocePct);
      }
      // Compute ROCE if we have operating profit and capital employed
      if (rocePct === undefined && h?.operatingProfitCr && h?.totalAssetsCr && h?.otherLiabilitiesCr) {
        const capitalEmployed = (h.totalAssetsCr ?? 0) - (h.otherLiabilitiesCr ?? 0);
        if (capitalEmployed > 0) {
          rocePct = Math.round((h.operatingProfitCr / capitalEmployed) * 100 * 10) / 10;
        }
      }

      return {
        fy: h?.fy ?? `FY${2014 + idx}`,
        toplineCr,
        netProfitCr,
        roePct,
        operatingMarginPct,
        rocePct,
      };
    }).filter((h: SensexYearFinancial) => h.fy); // Remove entries without fiscal year

    if (history.length === 0) {
      addQualityIssue(issues, ticker, 'All history entries invalid after processing', 'error');
      return null;
    }

    // Determine reporting type
    const reportingType = raw.reportingType ??
      (['NBFC', 'Bank', 'Financials', 'Insurance'].includes(raw.sector) ? 'financial' : 'nonFinancial');

    // Handle missing/invalid valuation multiple
    let valuationMultiple = Number(raw.valuationMultiple ?? 0);
    const valuationMetric = raw.valuationMetric ?? (reportingType === 'financial' ? 'pb' : 'pe');

    // If valuation multiple is 0, try to estimate from latest history
    if (valuationMultiple <= 0) {
      const latest = history[history.length - 1];
      if (valuationMetric === 'pe' && latest.netProfitCr > 0) {
        // Rough P/E estimate based on sector typical multiples
        const sectorMultiples: Record<string, number> = {
          'Technology': 25, 'Information Technology': 25, 'IT': 25,
          'Financials': 12, 'Bank': 15, 'NBFC': 12, 'Insurance': 14,
          'Consumer Staples': 35, 'Consumer Discretionary': 28,
          'Healthcare': 32, 'Pharma': 30,
          'Energy': 12, 'Oil & Gas': 11,
          'Metals': 10, 'Materials': 14,
          'Industrials': 18, 'Capital Goods': 20,
          'Automobiles': 22, 'Auto': 20,
          'Telecom': 18,
          'Utilities': 14, 'Power': 14,
          'Real Estate': 16,
          'Unknown': 15
        };
        valuationMultiple = sectorMultiples[raw.sector] ?? 15;
        addQualityIssue(issues, ticker, `Missing P/E, using sector estimate ${valuationMultiple}x`, 'info');
      } else if (valuationMetric === 'pb' && latest.roePct > 0) {
        // Rough P/B based on ROE: P/B = (ROE - g) / (r - g), assume g=5%, r=12%
        valuationMultiple = Math.round((latest.roePct / 100) * 1.5 * 10) / 10;
        valuationMultiple = Math.max(0.5, Math.min(5, valuationMultiple));
        addQualityIssue(issues, ticker, `Missing P/B, using ROE-based estimate ${valuationMultiple}x`, 'info');
      }
    }

    // FIX: Handle weightPct = 0 (use equal weight as fallback, will be normalized later)
    let weightPct = Number(raw.weightPct ?? 0);
    if (weightPct <= 0) {
      // Use equal weight for now - will be normalized across batch
      weightPct = 100 / totalCount;
    }

    // FIX: Handle marketCapCr = 0
    let marketCapCr = Number(raw.marketCapCr ?? 0);
    if (marketCapCr <= 0) {
      // Estimate from net profit and valuation multiple
      const latest = history[history.length - 1];
      if (latest.netProfitCr > 0 && valuationMultiple > 0) {
        if (valuationMetric === 'pe') {
          marketCapCr = Math.round(latest.netProfitCr * valuationMultiple);
        } else {
          // P/B route - estimate book value from ROE and net profit
          const estimatedBookValue = latest.roePct > 0 ? (latest.netProfitCr / (latest.roePct / 100)) : latest.netProfitCr * 5;
          marketCapCr = Math.round(estimatedBookValue * valuationMultiple);
        }
        if (marketCapCr > 0) {
          addQualityIssue(issues, ticker, `Missing market cap, estimated ${(marketCapCr/100).toFixed(0)} Cr from ${valuationMetric.toUpperCase()}`, 'info');
        }
      }
    }

    // FIX: Handle cmp = 0 (can't compute without shares outstanding, leave as 0)
    const cmp = Number(raw.cmp ?? 0);
    if (cmp <= 0) {
      addQualityIssue(issues, ticker, 'Current market price not available', 'warning');
    }

    // Validate beta (should already be populated in Nifty750 data)
    const beta = Math.max(0.1, Number(raw.beta ?? 1.0));
    if (beta === 1.0 && raw.beta === undefined) {
      addQualityIssue(issues, ticker, 'Missing beta, using default 1.0', 'warning');
    }

    // Handle net debt for non-financials
    let netDebtToEbitda: number | undefined;
    if (reportingType !== 'financial') {
      netDebtToEbitda = raw.netDebtToEbitda !== undefined ? Number(raw.netDebtToEbitda) : undefined;
    }

    return {
      id,
      name,
      ticker,
      sector: raw.sector ?? 'Unknown',
      reportingType,
      weightPct,
      marketCapCr,
      cmp,
      valuationMetric,
      valuationMultiple,
      dividendYieldPct: Number(raw.dividendYieldPct ?? 0),
      color: raw.color ?? '#60a5fa',
      beta,
      netDebtToEbitda,
      history,
    };
  } catch (e) {
    addQualityIssue(issues, `#${index}`, `Adapter error: ${e instanceof Error ? e.message : 'unknown'}`, 'error');
    return null;
  }
}

/* ── Post-process batch to normalize weights ──────────────────────────────── */
function normalizeBatchWeights(companies: SensexConstituent[]): SensexConstituent[] {
  if (companies.length === 0) return companies;

  // Check if all weights are equal (indicating fallback was used)
  const firstWeight = companies[0].weightPct;
  const allEqual = companies.every(c => Math.abs(c.weightPct - firstWeight) < 0.001);

  if (allEqual && companies.length > 1) {
    // Normalize by market cap if available
    const totalMcap = companies.reduce((s, c) => s + c.marketCapCr, 0);
    if (totalMcap > 0) {
      return companies.map(c => ({
        ...c,
        weightPct: (c.marketCapCr / totalMcap) * 100
      }));
    }
  }

  return companies;
}
