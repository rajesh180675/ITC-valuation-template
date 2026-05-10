import { useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import type { SensexConstituent, SensexYearFinancial } from '@/data/sensexData';
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
} from './shared';

type Filter = 'all' | 'financial' | 'nonFinancial';
type SortKey =
  | 'weight' | 'mcap' | 'topline' | 'toplineCagr' | 'profitCagr'
  | 'roe' | 'valuation' | 'beta' | 'coe' | 'impliedG' | 'composite';

const DATA_URL = '/data/nifty750_real.json';
const BATCH_SLUGS = ['largemidcap250', 'smallcap250', 'microcap250'] as const;
type BatchSlug = typeof BATCH_SLUGS[number];
const BATCH_LABELS: Record<BatchSlug, string> = {
  largemidcap250: 'Nifty LargeMidcap 250',
  smallcap250: 'Nifty Smallcap 250',
  microcap250: 'Nifty Microcap 250',
};

/* ── Safe helpers ─────────────────────────────────────────────────────────── */
function safeHistory(c: SensexConstituent, i: number) {
  try {
    return c.history[i] ?? c.history[0] ?? { fy: '', toplineCr: 0, netProfitCr: 0, roePct: 0 };
  } catch {
    return { fy: '', toplineCr: 0, netProfitCr: 0, roePct: 0 };
  }
}
function safeLastHistory(c: SensexConstituent) {
  try {
    return c.history[c.history.length - 1] ?? c.history[0] ?? { fy: '', toplineCr: 0, netProfitCr: 0, roePct: 0 };
  } catch {
    return { fy: '', toplineCr: 0, netProfitCr: 0, roePct: 0 };
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

  /* ── Data fetch with error boundary ───────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    fetch(DATA_URL)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) { setRawData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* ── Batch companies ──────────────────────────────────────────────────── */
  const batchCompanies: SensexConstituent[] = useMemo(() => {
    try {
      if (!rawData?.batches) return [];
      const batch = rawData.batches.find((b: any) => b.indexSlug === selectedBatch);
      if (!batch?.companies?.length) return [];
      return batch.companies.map(adaptConstituent).filter(Boolean);
    } catch { return []; }
  }, [rawData, selectedBatch]);

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

  /* ── Filtered companies ────────────────────────────────────────────────── */
  const filteredCompanies = useMemo(() => {
    try {
      if (filterVal === 'all') return batchCompanies;
      return batchCompanies.filter(c => c?.reportingType === filterVal);
    } catch { return []; }
  }, [filterVal, batchCompanies]);

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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <TopWeightsChart data={topWeightData} />
        <GrowthValuationScatter data={growthVsValuation} medianPatCagr={medianPatCagr} rangePeriods={safePeriods} />
      </div>

      <ImpliedVsRealizedScatter data={impliedVsRealized} rangePeriods={safePeriods} />

      {magicFormula.length > 0 && <MagicFormulaCard rows={magicFormula} onSelect={setSelectedId} />}

      {sortedRows.length > 0 && (
        <FactorScorecard rows={sortedRows} selectedId={selectedCompany?.id ?? ''} onSelect={setSelectedId} />
      )}

      {sortedRows.length > 0 && (
        <ConstituentLedger rows={sortedRows} selectedId={selectedCompany?.id ?? ''} onSelect={setSelectedId}
          rangeLabel={rangeLabel} endFy={endFy} sortCaret={sortCaret} toggleSort={toggleSort} showZScore={true} />
      )}

      {selectedRow && <DrillDown row={selectedRow} rangeStart={safeRangeStart} rangeEnd={safeRangeEnd} rangePeriods={safePeriods} />}
    </div>
  );
}

/* ── Adapter ────────────────────────────────────────────────────────────────── */
function adaptConstituent(raw: any): SensexConstituent | null {
  try {
    if (!raw) return null;
    const history: SensexYearFinancial[] = (raw.history ?? []).map((h: any) => ({
      fy: h?.fy ?? '',
      toplineCr: h?.toplineCr ?? 0,
      netProfitCr: h?.netProfitCr ?? 0,
      roePct: h?.roePct ?? 0,
    }));
    return {
      id: raw.id ?? '',
      name: raw.name ?? raw.ticker ?? '',
      ticker: raw.ticker ?? '',
      sector: raw.sector ?? 'Unknown',
      reportingType: raw.reportingType ?? 'nonFinancial',
      weightPct: raw.weightPct ?? 0,
      marketCapCr: raw.marketCapCr ?? 0,
      cmp: raw.cmp ?? 0,
      valuationMetric: raw.valuationMetric ?? (raw.reportingType === 'financial' ? 'pb' : 'pe'),
      valuationMultiple: raw.valuationMultiple ?? 0,
      dividendYieldPct: raw.dividendYieldPct ?? 0,
      color: raw.color ?? '#60a5fa',
      beta: raw.beta ?? 1.0,
      history,
    };
  } catch { return null; }
}
