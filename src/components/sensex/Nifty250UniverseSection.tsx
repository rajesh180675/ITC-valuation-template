import { useEffect, useMemo, useState } from 'react';

import {
  nifty250Constituents,
  NIFTY250_FISCAL_YEARS,
} from '@/data/nifty250Data';
import type { SensexConstituent } from '@/data/sensexData';
import {
  buildSensexIndexTimeSeries,
  buildSensexSectorSummary,
  calculateCagr,
  getLatestSensexFinancial,
  getPrimaryValuationLabel,
} from '@/utils/itcModel';
import {
  buildFactorScores, buildMagicFormulaRanks, buildSectorAnalytics,
  buildSectorMomentumGrid, buildValuationZScores, computeConcentration,
  computeValuationBuckets,
  costOfEquity, impliedPerpetualGrowth,
  MARKET_PARAMS,
} from '@/utils/sensexAnalytics';
import { adaptNifty250Constituent } from '@/utils/adaptNifty250Constituent';
import {
  hasNegativePat,
  isGordonUnreliable,
  DataProvenanceBanner,
  SectorMomentumHeatmap,
} from './shared';
import { ValuationBucketsTable } from './shared/ValuationBucketsTable';

import {
  HeroBanner,
  MagicFormulaCard,
  RangeSelector,
  SectorComposition,
  TopWeightsChart,
  UniverseEarningsPower,
  type Filter,
  type SortKey,
} from './Nifty250AnalyticsCards';
import {
  FactorScorecard,
  GrowthValuationScatter,
  ImpliedVsRealizedScatter,
  SectorAnalyticsTable,
  type GrowthValuationPoint,
  type ImpliedVsRealizedPoint,
} from './Nifty250Charts';
import {
  ConstituentLedger,
  DrillDown,
} from './Nifty250Ledger';

/* ────────────────────────────────────────────────────────────────────────── */

export { type Filter, type SortKey };

/* ────────────────────────────────────────────────────────────────────────── */

export function Nifty250UniverseSection() {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState(nifty250Constituents[0]?.id ?? '');
  const [sortKey, setSortKey] = useState<SortKey>('composite');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  // P4.1: search query for constituent ledger
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string[]>([]);

  // ── Real data loading ──────────────────────────────────────────────────
  const [realData, setRealData] = useState<SensexConstituent[] | null>(null);
  const [realFiscalYears, setRealFiscalYears] = useState<string[] | null>(null);
  const [dataSource, setDataSource] = useState<'loading' | 'screener-in' | 'reference'>('loading');
  // P1.1: adapter warnings surfaced from live feed validation
  const [adapterWarnings, setAdapterWarnings] = useState<string[]>([]);

  useEffect(() => {
    const abort = new AbortController();
    fetch('/data/nifty250_real.json', { signal: abort.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.constituents?.length > 0) {
          if (Array.isArray(json?.fiscalYears) && json.fiscalYears.length > 0) {
            setRealFiscalYears(json.fiscalYears.map((fy: unknown) => String(fy)).sort());
          }
          // P1.1: validate each raw entry and collect warnings
          const warnings: string[] = [];
          const adapted = json.constituents
            .map((raw: unknown) => adaptNifty250Constituent(raw, warnings))
            .filter((c: SensexConstituent | null): c is SensexConstituent => c !== null);
          if (warnings.length > 0) setAdapterWarnings(warnings.slice(0, 5));
          setRealData(adapted);
          setDataSource('screener-in');
          if (adapted.length > 0 && !adapted.find((c: SensexConstituent) => c.id === selectedId)) {
            setSelectedId(adapted[0].id);
          }
        } else {
          setRealFiscalYears(null);
          setDataSource('reference');
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setRealFiscalYears(null);
        setDataSource('reference');
      });
    return () => abort.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Use real data when available, otherwise fall back to hardcoded reference
  const activeConstituents = realData ?? nifty250Constituents;

  // Dynamic fiscal years from real data, or hardcoded as fallback
  const years = useMemo(() => {
    if (realFiscalYears && realFiscalYears.length > 0) {
      return [...realFiscalYears];
    }
    if (realData && realData.length > 0) {
      const fySet = new Set<string>();
      realData.forEach(c => c.history.forEach(h => fySet.add(h.fy)));
      return Array.from(fySet).sort();
    }
    return [...NIFTY250_FISCAL_YEARS];
  }, [realData, realFiscalYears]);

  const totalYears = years.length;
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(totalYears - 1);

  // Reset range when years change (e.g. real data loads)
  useEffect(() => {
    if (years.length > 0) {
      setRangeStart((prev) => Math.min(prev, Math.max(0, years.length - 2)));
      setRangeEnd((prev) => Math.min(Math.max(prev, 1), years.length - 1));
    }
  }, [years.length]);

  // Update selectedId when real data loads
  useEffect(() => {
    if (realData && realData.length > 0) {
      const currentSelected = realData.find(c => c.id === selectedId);
      if (!currentSelected) {
        setSelectedId(realData[0].id);
      }
    }
  }, [realData]); // eslint-disable-line react-hooks/exhaustive-deps

  const allSectors = useMemo(
    () => [...new Set(activeConstituents.map(c => c.sector))].sort(),
    [activeConstituents],
  );

  const filteredCompanies = useMemo(() => {
    let list = filter === 'all' ? activeConstituents : activeConstituents.filter(c => c.reportingType === filter);
    if (sectorFilter.length > 0) {
      list = list.filter(c => sectorFilter.includes(c.sector));
    }
    return list;
  }, [filter, sectorFilter, activeConstituents]);

  const safeRangeStart = Math.min(rangeStart, Math.max(0, totalYears - 1));
  const safeRangeEnd = Math.min(rangeEnd, Math.max(0, totalYears - 1));
  const startFy = years[safeRangeStart] ?? years[0] ?? '';
  const endFy = years[safeRangeEnd] ?? years[years.length - 1] ?? '';
  const rangePeriods = Math.max(1, safeRangeEnd - safeRangeStart);
  const rangeLabel = `${startFy}–${endFy}`;
  const historyCoverageLabel = `${years[0] ?? ''}–${years[years.length - 1] ?? ''}`;

  /* ─── Derived analytics ─────────────────────────────────────────────── */
  const indexSeries = useMemo(() => buildSensexIndexTimeSeries(filteredCompanies), [filteredCompanies]);
  const sectorSummary = useMemo(() => buildSensexSectorSummary(filteredCompanies), [filteredCompanies]);
  const sectorAnalytics = useMemo(
    () => buildSectorAnalytics(filteredCompanies, safeRangeStart, safeRangeEnd),
    [filteredCompanies, safeRangeStart, safeRangeEnd],
  );
  const concentration = useMemo(() => computeConcentration(filteredCompanies), [filteredCompanies]);
  const factorScores = useMemo(
    () => buildFactorScores(filteredCompanies, safeRangeStart, safeRangeEnd),
    [filteredCompanies, safeRangeStart, safeRangeEnd],
  );
  const magicFormula = useMemo(() => buildMagicFormulaRanks(filteredCompanies), [filteredCompanies]);
  const sectorMomentum = useMemo(() => buildSectorMomentumGrid(filteredCompanies), [filteredCompanies]);
  const valuationZ = useMemo(() => buildValuationZScores(filteredCompanies), [filteredCompanies]);

  const valuationBuckets = useMemo(
    () => computeValuationBuckets(filteredCompanies, valuationZ),
    [filteredCompanies, valuationZ],
  );

  const sectorPeerScores = useMemo(() => {
    const bySector = new Map<string, { quality: number[]; value: number[]; growth: number[]; momentum: number[] }>();
    for (const company of filteredCompanies) {
      const s = factorScores.get(company.id);
      if (!s) continue;
      let bucket = bySector.get(company.sector);
      if (!bucket) {
        bucket = { quality: [], value: [], growth: [], momentum: [] };
        bySector.set(company.sector, bucket);
      }
      bucket.quality.push(s.quality);
      bucket.value.push(s.value);
      bucket.growth.push(s.growth);
      bucket.momentum.push(s.momentum);
    }
    const medians = new Map<string, { quality: number; value: number; growth: number; momentum: number }>();
    for (const [sector, vals] of bySector) {
      const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b);
      const median = (arr: number[]) => {
        const s = sorted(arr);
        const mid = Math.floor(s.length / 2);
        return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
      };
      medians.set(sector, {
        quality: median(vals.quality),
        value: median(vals.value),
        growth: median(vals.growth),
        momentum: median(vals.momentum),
      });
    }
    return medians;
  }, [filteredCompanies, factorScores]);

  const rows = useMemo(() => filteredCompanies.map(company => {
    const firstRaw = company.history[safeRangeStart];
    const lastRaw = company.history[safeRangeEnd];
    const first = firstRaw ?? company.history[0] ?? { fy: 'N/A', toplineCr: 0, netProfitCr: 0, roePct: 0 };
    const last = lastRaw ?? company.history[company.history.length - 1] ?? { fy: 'N/A', toplineCr: 0, netProfitCr: 0, roePct: 0 };
    // P1.2: detect negative-PAT companies where CAGR is unreliable (returns 0)
    const negPat = hasNegativePat(first.netProfitCr, last.netProfitCr);
    const profitCagr = negPat ? 0 : calculateCagr(first.netProfitCr, last.netProfitCr, rangePeriods);
    const coe = costOfEquity(company.beta);
    const impliedG = impliedPerpetualGrowth(company);
    // P1.4: flag Gordon-inapplicable names (near-zero payout growth firms)
    const gordonUnreliable = isGordonUnreliable(company.dividendYieldPct, company.valuationMultiple, company.reportingType);
    const scores = factorScores.get(company.id);
    const valZ = valuationZ.get(company.id);
    return {
      company,
      first,
      last,
      toplineCagr: calculateCagr(first.toplineCr, last.toplineCr, rangePeriods),
      profitCagr,
      negPat,
      gordonUnreliable,
      coe,
      impliedG,
      gap: profitCagr - impliedG,
      scores: scores ?? { quality: 0, value: 0, growth: 0, momentum: 0, composite: 0 },
      valuationLabel: getPrimaryValuationLabel(company),
      valuationZ: valZ?.zScore ?? 0,
      sectorMedianMultiple: valZ?.sectorMedian ?? company.valuationMultiple,
    };
  }), [filteredCompanies, safeRangeStart, safeRangeEnd, rangePeriods, factorScores, valuationZ]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const get = (r: typeof rows[number]): number => {
      switch (sortKey) {
        case 'weight': return r.company.weightPct;
        case 'mcap': return r.company.marketCapCr;
        case 'topline': return r.last.toplineCr ?? 0;
        case 'toplineCagr': return r.toplineCagr;
        case 'profitCagr': return r.profitCagr;
        case 'roe': return r.last.roePct ?? 0;
        case 'valuation': return r.company.valuationMultiple;
        case 'beta': return r.company.beta;
        case 'coe': return r.coe;
        case 'impliedG': return r.impliedG;
        case 'composite': return r.scores.composite;
      }
    };
    return [...rows].sort((a, b) => (get(a) - get(b)) * dir);
  }, [rows, sortKey, sortDir]);

  const totalMarketCap = filteredCompanies.reduce((s, c) => s + c.marketCapCr, 0);
  const bfsiWeight = filteredCompanies.filter(c => c.reportingType === 'financial').reduce((s, c) => s + c.weightPct, 0);
  const corpWeight = 100 - bfsiWeight;
  const largestSector = sectorSummary[0];

  const indexStart = indexSeries[safeRangeStart];
  const indexEnd = indexSeries[safeRangeEnd];
  const universeToplineCagr = indexStart && indexEnd ? calculateCagr(indexStart.toplineCr, indexEnd.toplineCr, rangePeriods) : 0;
  const universeProfitCagr = indexStart && indexEnd ? calculateCagr(indexStart.netProfitCr, indexEnd.netProfitCr, rangePeriods) : 0;

  const weightedBeta = filteredCompanies.reduce((s, c) => s + (c.weightPct / 100) * c.beta, 0);
  const weightedCoe = MARKET_PARAMS.riskFreeRatePct + weightedBeta * MARKET_PARAMS.equityRiskPremiumPct;

  const medianPatCagr = useMemo(() => {
    const values = rows.map(r => r.profitCagr).sort((a, b) => a - b);
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
  }, [rows]);

  const averageRoe = useMemo(() => {
    if (filteredCompanies.length === 0) return 0;
    const roes = filteredCompanies.map(c => {
      const fin = getLatestSensexFinancial(c);
      return fin?.roePct ?? 0;
    });
    return roes.reduce((s, v) => s + v, 0) / filteredCompanies.length;
  }, [filteredCompanies]);

  /* ─── Selection ─────────────────────────────────────────────────────── */
  const selectedRow = sortedRows.find(r => r.company.id === selectedId) ?? sortedRows[0];
  const selectedCompany = selectedRow?.company ?? filteredCompanies[0];

  /* ─── Chart data ────────────────────────────────────────────────────── */
  const topWeightData = useMemo(() =>
    [...filteredCompanies].sort((a, b) => b.weightPct - a.weightPct).slice(0, 12)
      .map(c => ({ name: c.ticker, weightPct: c.weightPct, color: c.color }))
    , [filteredCompanies]);

  const growthVsValuation = useMemo((): GrowthValuationPoint[] => rows.map(r => ({
    name: r.company.ticker,
    x: r.profitCagr,
    y: r.company.valuationMultiple,
    z: Math.log(Math.max(1, r.company.marketCapCr)) * 10,
    color: r.company.color,
    sector: r.company.sector,
    metric: r.valuationLabel,
  })), [rows]);

  const impliedVsRealized = useMemo((): ImpliedVsRealizedPoint[] => rows.map(r => ({
    name: r.company.ticker,
    x: r.impliedG,
    y: r.profitCagr,
    z: Math.log(Math.max(1, r.company.marketCapCr)) * 10,
    color: r.company.color,
    sector: r.company.sector,
    gap: r.gap,
    coe: r.coe,
    gordonUnreliable: r.gordonUnreliable,
  })), [rows]);

  const sortCaret = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const setQuickRange = (n: number) => {
    const clampedPeriods = Math.max(1, Math.min(n, Math.max(1, totalYears - 1)));
    setRangeStart(Math.max(0, totalYears - 1 - clampedPeriods));
    setRangeEnd(totalYears - 1);
  };

  return (
    <div className="animate-fadeIn space-y-6">
      {dataSource === 'loading' ? (
        <div className="premium-card p-6 md:p-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-24 bg-white/5 rounded-full animate-pulse" />
            <div className="h-5 w-32 bg-white/5 rounded-full animate-pulse" />
          </div>
          <div className="h-8 w-96 bg-white/5 rounded-lg animate-pulse mb-3" />
          <div className="h-4 w-full max-w-xl bg-white/5 rounded animate-pulse mb-6" />
          <div className="hairline-divider my-5" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-16 bg-white/5 rounded animate-pulse mb-2" />
                <div className="h-6 w-20 bg-white/5 rounded animate-pulse mb-1" />
                <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {/* P1.1: Live feed adapter warnings */}
      {adapterWarnings.length > 0 && (
        <div className="glass-card p-4 border-l-2 border-amber-400 text-[12px] text-amber-200">
          <p className="font-semibold mb-1">⚠ Live feed data quality warnings ({adapterWarnings.length} issues)</p>
          <ul className="list-disc pl-4 space-y-0.5 text-amber-300/80">
            {adapterWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
          <p className="mt-1 text-amber-400/60">Affected companies show ⚠ in the ledger. Reference data used as fallback for missing fields.</p>
        </div>
      )}

      <HeroBanner
        filteredCount={filteredCompanies.length}
        totalUniverseCount={activeConstituents.length}
        filter={filter}
        setFilter={setFilter}
        rangeLabel={rangeLabel}
        historyCoverageLabel={historyCoverageLabel}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        totalYears={totalYears}
        setQuickRange={setQuickRange}
        totalMarketCap={totalMarketCap}
        bfsiWeight={bfsiWeight}
        corpWeight={corpWeight}
        largestSector={largestSector}
        universeProfitCagr={universeProfitCagr}
        medianPatCagr={medianPatCagr}
        weightedBeta={weightedBeta}
        weightedCoe={weightedCoe}
        concentration={concentration}
        dataSource={dataSource}
      />

      {dataSource === 'loading' ? null : (
        <>
          <DataProvenanceBanner rows={sortedRows} dataSource={dataSource} />

          <RangeSelector
            startFy={startFy} endFy={endFy} rangePeriods={rangePeriods}
            rangeStart={safeRangeStart} rangeEnd={safeRangeEnd} totalYears={totalYears}
            setRangeStart={setRangeStart} setRangeEnd={setRangeEnd}
          />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <UniverseEarningsPower
              indexSeries={indexSeries}
              startFy={startFy} endFy={endFy}
              filteredCount={filteredCompanies.length}
              universeToplineCagr={universeToplineCagr}
              universeProfitCagr={universeProfitCagr}
              averageRoe={averageRoe}
            />
            <SectorComposition sectorSummary={sectorSummary} filteredCompanies={filteredCompanies} />
          </div>

          <SectorAnalyticsTable data={sectorAnalytics} />
          <ValuationBucketsTable buckets={valuationBuckets} />

          <SectorMomentumHeatmap rows={sectorMomentum} rangePeriods={rangePeriods} />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <TopWeightsChart data={topWeightData} />
            <GrowthValuationScatter data={growthVsValuation} medianPatCagr={medianPatCagr} rangePeriods={rangePeriods} />
          </div>

          <ImpliedVsRealizedScatter data={impliedVsRealized} rangePeriods={rangePeriods} />

          <MagicFormulaCard rows={magicFormula} onSelect={setSelectedId} />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                import('@/utils/export').then(({ exportCsv, csvEscape }) => {
                  const headers = ['Sector', 'Companies', 'WeightPct', 'MarketCapCr', 'AvgROE_pct', 'PAT_CAGR_pct', 'AvgBeta', 'AvgCoE_pct', 'HHI', 'Leader'];
                  const data = sectorAnalytics.map(s => [
                    csvEscape(s.sector), String(s.count), s.weightPct.toFixed(2),
                    String(s.marketCapCr), s.weightedRoePct.toFixed(2),
                    s.weightedPatCagrPct.toFixed(2), s.weightedBeta.toFixed(2),
                    s.weightedCostOfEquityPct.toFixed(2), String(s.internalHHI), csvEscape(s.topConstituent),
                  ]);
                  exportCsv(`nifty250-sector-analytics-${endFy}.csv`, headers, data);
                });
              }}
              className="text-[11px] font-semibold text-gray-200 bg-black/40 hover:bg-black/60 border border-border rounded-md px-3 py-1.5 transition"
            >
              Export All Analytics
            </button>
          </div>

          <FactorScorecard rows={sortedRows} selectedId={selectedCompany?.id ?? ''} onSelect={setSelectedId} />

          <ConstituentLedger
            rows={sortedRows}
            selectedId={selectedCompany?.id ?? ''}
            onSelect={setSelectedId}
            rangeLabel={rangeLabel}
            endFy={endFy}
            sortCaret={sortCaret}
            toggleSort={toggleSort}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            allSectors={allSectors}
            sectorFilter={sectorFilter}
            onSectorFilterChange={setSectorFilter}
            pageSize={25}
          />

          {selectedRow && <DrillDown row={selectedRow} rangeStart={safeRangeStart} rangeEnd={safeRangeEnd} rangePeriods={rangePeriods} peerScores={sectorPeerScores.get(selectedRow.company.sector)} />}
        </>)}
    </div>
  );
}

