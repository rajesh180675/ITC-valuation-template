import { useEffect, useMemo, useState } from 'react';

import {
  nifty250Constituents,
  NIFTY250_FISCAL_YEARS,
} from '@/data/nifty250Data';
import type { SensexConstituent, SensexYearFinancial } from '@/data/sensexData';
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
  costOfEquity, impliedPerpetualGrowth,
  MARKET_PARAMS,
} from '@/utils/sensexAnalytics';
import {
  hasNegativePat,
  isGordonUnreliable,
  DataProvenanceBanner,
  SectorMomentumHeatmap,
} from './shared';

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

  // ── Real data loading ──────────────────────────────────────────────────
  const [realData, setRealData] = useState<SensexConstituent[] | null>(null);
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
          // P1.1: validate each raw entry and collect warnings
          const warnings: string[] = [];
          const adapted = json.constituents.map((raw: unknown) =>
            adaptNifty250Constituent(raw, warnings)
          );
          if (warnings.length > 0) setAdapterWarnings(warnings.slice(0, 5));
          setRealData(adapted);
          setDataSource('screener-in');
          if (adapted.length > 0 && !adapted.find((c: SensexConstituent) => c.id === selectedId)) {
            setSelectedId(adapted[0].id);
          }
        } else {
          setDataSource('reference');
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setDataSource('reference');
      });
    return () => abort.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Use real data when available, otherwise fall back to hardcoded reference
  const activeConstituents = realData ?? nifty250Constituents;

  // Dynamic fiscal years from real data, or hardcoded as fallback
  const years = useMemo(() => {
    if (realData && realData.length > 0) {
      const fySet = new Set<string>();
      realData.forEach(c => c.history.forEach(h => fySet.add(h.fy)));
      return Array.from(fySet).sort();
    }
    return [...NIFTY250_FISCAL_YEARS];
  }, [realData]);

  const totalYears = years.length;
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(totalYears - 1);

  // Reset range when years change (e.g. real data loads)
  useEffect(() => {
    if (years.length > 0) {
      setRangeEnd(years.length - 1);
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

  const filteredCompanies = useMemo(() => {
    if (filter === 'all') return activeConstituents;
    return activeConstituents.filter(c => c.reportingType === filter);
  }, [filter, activeConstituents]);

  const startFy = years[rangeStart];
  const endFy = years[rangeEnd];
  const rangePeriods = Math.max(1, rangeEnd - rangeStart);
  const rangeLabel = `${startFy}–${endFy}`;

  /* ─── Derived analytics ─────────────────────────────────────────────── */
  const indexSeries = useMemo(() => buildSensexIndexTimeSeries(filteredCompanies), [filteredCompanies]);
  const sectorSummary = useMemo(() => buildSensexSectorSummary(filteredCompanies), [filteredCompanies]);
  const sectorAnalytics = useMemo(
    () => buildSectorAnalytics(filteredCompanies, rangeStart, rangeEnd),
    [filteredCompanies, rangeStart, rangeEnd],
  );
  const concentration = useMemo(() => computeConcentration(filteredCompanies), [filteredCompanies]);
  const factorScores = useMemo(
    () => buildFactorScores(filteredCompanies, rangeStart, rangeEnd),
    [filteredCompanies, rangeStart, rangeEnd],
  );
  const magicFormula = useMemo(() => buildMagicFormulaRanks(filteredCompanies), [filteredCompanies]);
  const sectorMomentum = useMemo(() => buildSectorMomentumGrid(filteredCompanies), [filteredCompanies]);
  const valuationZ = useMemo(() => buildValuationZScores(filteredCompanies), [filteredCompanies]);

  const rows = useMemo(() => filteredCompanies.map(company => {
    const firstRaw = company.history[rangeStart];
    const lastRaw = company.history[rangeEnd];
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
  }), [filteredCompanies, rangeStart, rangeEnd, rangePeriods, factorScores, valuationZ]);

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

  const indexStart = indexSeries[rangeStart];
  const indexEnd = indexSeries[rangeEnd];
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
    setRangeStart(Math.max(0, totalYears - 1 - n));
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
        filter={filter}
        setFilter={setFilter}
        rangeLabel={rangeLabel}
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
            rangeStart={rangeStart} rangeEnd={rangeEnd} totalYears={totalYears}
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

          <SectorMomentumHeatmap rows={sectorMomentum} />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <TopWeightsChart data={topWeightData} />
            <GrowthValuationScatter data={growthVsValuation} medianPatCagr={medianPatCagr} rangePeriods={rangePeriods} />
          </div>

          <ImpliedVsRealizedScatter data={impliedVsRealized} rangePeriods={rangePeriods} />

          <MagicFormulaCard rows={magicFormula} onSelect={setSelectedId} />

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
          />

          {selectedRow && <DrillDown row={selectedRow} rangeStart={rangeStart} rangeEnd={rangeEnd} rangePeriods={rangePeriods} />}
        </>)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * ADAPTER: Screener.in JSON → SensexConstituent
 * P1.1: Runtime shape validation — populates warnings[] for any field that
 * is missing or invalid. Falls back to safe defaults so the UI never crashes.
 * ════════════════════════════════════════════════════════════════════════ */

function validateField<T>(raw: Record<string, unknown>, key: string, defaultVal: T, warnings: string[], label: string): T {
  const val = raw[key];
  if (val === undefined || val === null) {
    warnings.push(`${label}: missing field '${key}', using default ${JSON.stringify(defaultVal)}`);
    return defaultVal;
  }
  return val as T;
}

function adaptNifty250Constituent(rawUnknown: unknown, warnings: string[]): SensexConstituent {
  const raw = (rawUnknown && typeof rawUnknown === 'object' ? rawUnknown : {}) as Record<string, unknown>;
  const label = String(raw['ticker'] ?? raw['id'] ?? '?');

  if (!raw['id'] || !raw['ticker']) {
    warnings.push(`Entry missing id/ticker: ${JSON.stringify(raw).slice(0, 80)}`);
  }

  const history: SensexYearFinancial[] = (Array.isArray(raw['history']) ? raw['history'] : []).map((h: unknown) => {
    const hObj = (h && typeof h === 'object' ? h : {}) as Record<string, unknown>;
    if (!hObj['fy']) warnings.push(`${label}: history entry missing 'fy' field`);
    return {
      fy: String(hObj['fy'] ?? ''),
      toplineCr: Number(hObj['toplineCr'] ?? 0),
      netProfitCr: Number(hObj['netProfitCr'] ?? 0),
      roePct: Number(hObj['roePct'] ?? 0),
      operatingMarginPct: hObj['operatingMarginPct'] !== undefined ? Number(hObj['operatingMarginPct']) : undefined,
      rocePct: hObj['rocePct'] !== undefined ? Number(hObj['rocePct']) : undefined,
    };
  });

  if (history.length === 0) warnings.push(`${label}: no history rows in feed`);

  const reportingType = validateField(raw, 'reportingType', 'nonFinancial', warnings, label);
  const valuationMultiple = Number(validateField(raw, 'valuationMultiple', 0, warnings, label));
  if (valuationMultiple <= 0) warnings.push(`${label}: valuationMultiple is ${valuationMultiple} (≤ 0) — Gordon model will be unreliable`);

  return {
    id: String(raw['id'] ?? raw['ticker'] ?? 'unknown'),
    name: String(raw['name'] ?? raw['ticker'] ?? 'Unknown'),
    ticker: String(raw['ticker'] ?? ''),
    sector: String(raw['sector'] ?? 'Unknown'),
    reportingType: (reportingType === 'financial' ? 'financial' : 'nonFinancial'),
    weightPct: Number(raw['weightPct'] ?? 0),
    marketCapCr: Number(raw['marketCapCr'] ?? 0),
    cmp: Number(raw['cmp'] ?? 0),
    valuationMetric: (raw['valuationMetric'] === 'pb' ? 'pb' : 'pe'),
    valuationMultiple: Math.max(0, valuationMultiple),
    dividendYieldPct: Number(raw['dividendYieldPct'] ?? 0),
    color: String(raw['color'] ?? '#60a5fa'),
    beta: Math.max(0.1, Number(raw['beta'] ?? 1.0)),
    netDebtToEbitda: raw['netDebtToEbitda'] !== undefined ? Number(raw['netDebtToEbitda']) : undefined,
    history,
  };
}