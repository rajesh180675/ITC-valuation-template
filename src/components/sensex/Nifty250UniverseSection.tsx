import { useEffect, useMemo, useState } from 'react';
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip,
  XAxis, YAxis, ZAxis,
} from 'recharts';
import { Download, Info, ShieldCheck } from 'lucide-react';

import {
  nifty250Constituents,
  NIFTY250_FISCAL_YEARS,
  NIFTY250_INDEX_LABEL,
  NIFTY250_PROVENANCE,
  NIFTY250_CONSTITUENT_COUNT,
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
  computeDuPont, costOfEquity, earningsVolatility, impliedPerpetualGrowth,
  MARKET_PARAMS,
  type MagicFormulaScore, type SectorMomentumRow,
} from '@/utils/sensexAnalytics';
import { ChartTooltip, fmt, fmtN } from '@/components/itc/shared';

/* ────────────────────────────────────────────────────────────────────────── */

type Filter = 'all' | 'financial' | 'nonFinancial';
type SortKey =
  | 'weight' | 'mcap' | 'topline' | 'toplineCagr' | 'profitCagr'
  | 'roe' | 'valuation' | 'beta' | 'coe' | 'impliedG' | 'composite';

/* ────────────────────────────────────────────────────────────────────────── */

export function Nifty250UniverseSection() {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState(nifty250Constituents[0]?.id ?? '');
  const [sortKey, setSortKey] = useState<SortKey>('composite');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // ── Real data loading ──────────────────────────────────────────────────
  const [realData, setRealData] = useState<SensexConstituent[] | null>(null);
  const [dataSource, setDataSource] = useState<'loading' | 'screener-in' | 'reference'>('loading');

  useEffect(() => {
    fetch('/data/nifty250_real.json')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.constituents?.length > 0) {
          const adapted = json.constituents.map(adaptNifty250Constituent);
          setRealData(adapted);
          setDataSource('screener-in');
          // Update selectedId to first company in real data
          if (adapted.length > 0 && !adapted.find((c: SensexConstituent) => c.id === selectedId)) {
            setSelectedId(adapted[0].id);
          }
        } else {
          setDataSource('reference');
        }
      })
      .catch(() => {
        setDataSource('reference');
      });
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
    const first = company.history[rangeStart];
    const last = company.history[rangeEnd];
    const profitCagr = calculateCagr(first.netProfitCr, last.netProfitCr, rangePeriods);
    const coe = costOfEquity(company.beta);
    const impliedG = impliedPerpetualGrowth(company);
    const scores = factorScores.get(company.id)!;
    const valZ = valuationZ.get(company.id);
    return {
      company,
      first,
      last,
      toplineCagr: calculateCagr(first.toplineCr, last.toplineCr, rangePeriods),
      profitCagr,
      coe,
      impliedG,
      gap: profitCagr - impliedG, // positive = market under-pricing growth
      scores,
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
        case 'topline': return r.last.toplineCr;
        case 'toplineCagr': return r.toplineCagr;
        case 'profitCagr': return r.profitCagr;
        case 'roe': return r.last.roePct;
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

  const averageRoe = filteredCompanies.length === 0
    ? 0
    : filteredCompanies.reduce((s, c) => s + getLatestSensexFinancial(c).roePct, 0) / filteredCompanies.length;

  /* ─── Selection ─────────────────────────────────────────────────────── */
  const selectedRow = sortedRows.find(r => r.company.id === selectedId) ?? sortedRows[0];
  const selectedCompany = selectedRow?.company ?? filteredCompanies[0];

  /* ─── Chart data ────────────────────────────────────────────────────── */
  const topWeightData = useMemo(() =>
    [...filteredCompanies].sort((a, b) => b.weightPct - a.weightPct).slice(0, 12)
      .map(c => ({ name: c.ticker, weightPct: c.weightPct, color: c.color }))
  , [filteredCompanies]);

  const growthVsValuation = useMemo(() => rows.map(r => ({
    name: r.company.ticker,
    x: r.profitCagr,
    y: r.company.valuationMultiple,
    z: Math.log(Math.max(1, r.company.marketCapCr)) * 10,
    color: r.company.color,
    sector: r.company.sector,
    metric: r.valuationLabel,
  })), [rows]);

  const impliedVsRealized = useMemo(() => rows.map(r => ({
    name: r.company.ticker,
    x: r.impliedG,
    y: r.profitCagr,
    z: Math.log(Math.max(1, r.company.marketCapCr)) * 10,
    color: r.company.color,
    sector: r.company.sector,
    gap: r.gap,
    coe: r.coe,
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

      {dataSource !== 'loading' && <DataProvenanceBanner rows={sortedRows} dataSource={dataSource} />}

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
      />

      {selectedRow && <DrillDown row={selectedRow} rangeStart={rangeStart} rangeEnd={rangeEnd} rangePeriods={rangePeriods} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * SUB-COMPONENTS
 * ════════════════════════════════════════════════════════════════════════ */

function HeroBanner(props: {
  filteredCount: number;
  filter: Filter;
  setFilter: (f: Filter) => void;
  rangeLabel: string;
  rangeStart: number;
  rangeEnd: number;
  totalYears: number;
  setQuickRange: (n: number) => void;
  totalMarketCap: number;
  bfsiWeight: number;
  corpWeight: number;
  largestSector?: { sector: string; weightPct: number };
  universeProfitCagr: number;
  medianPatCagr: number;
  weightedBeta: number;
  weightedCoe: number;
  concentration: { hhi: number; effectiveN: number; top5Pct: number };
  dataSource: string;
}) {
  const {
    filteredCount, filter, setFilter, rangeLabel, rangeStart, rangeEnd, totalYears, setQuickRange,
    totalMarketCap, bfsiWeight, corpWeight, largestSector, universeProfitCagr, medianPatCagr,
    weightedBeta, weightedCoe, concentration, dataSource,
  } = props;

  return (
    <div className="premium-card p-6 md:p-7">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-3 mb-3">
            <span className="pill"><span className="ticker-dot" /> Live Universe</span>
            <span className="pill pill-muted">{NIFTY250_INDEX_LABEL} · {NIFTY250_CONSTITUENT_COUNT} Constituents</span>
            {dataSource === 'screener-in' && <span className="pill pill-muted text-[10px]" style={{ borderColor: '#22c55e', color: '#22c55e' }}>Real Data</span>}
            {dataSource === 'reference' && <span className="pill pill-muted text-[10px]" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>Reference</span>}
            <span className="pill pill-muted">{rangeLabel}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Nifty LargeMidcap 250 <span className="text-[color:var(--color-gold-light)]">Feature Universe</span>
          </h2>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl leading-relaxed">
            Institutional-grade cross-sectional view of {NIFTY250_CONSTITUENT_COUNT} real NSE-listed large &amp; mid-cap names &mdash;
            10 fiscal years (FY2015&ndash;FY2024) anchored to FY24 reported financials, CAPM cost of equity,
            reverse-Gordon implied growth, Greenblatt Magic Formula, sector momentum and valuation z-scores.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="segmented">
            {([
              { id: 'all' as const, label: `All ${NIFTY250_CONSTITUENT_COUNT}` },
              { id: 'nonFinancial' as const, label: 'Corporates' },
              { id: 'financial' as const, label: 'BFSI' },
            ]).map(opt => (
              <button key={opt.id} onClick={() => setFilter(opt.id)} className={filter === opt.id ? 'active' : ''}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="segmented">
            {[5, 10, 14].map(n => {
              const isActive = rangeStart === Math.max(0, totalYears - 1 - n) && rangeEnd === totalYears - 1;
              return (
                <button key={n} onClick={() => setQuickRange(n)} className={isActive ? 'active' : ''}>
                  {n}Y
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="hairline-divider my-5" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-5">
        <Kpi label="Constituents" value={String(filteredCount)} sub={`of ${NIFTY250_CONSTITUENT_COUNT} total`} />
        <Kpi label="Market Cap" value={fmt(totalMarketCap)} sub="aggregate float" />
        <Kpi label="BFSI / Corp Mix" value={`${fmtN(bfsiWeight, 1)} / ${fmtN(corpWeight, 1)}`} sub="by index weight" tabular />
        <Kpi label="Lead Sector" value={largestSector?.sector ?? '—'} sub={largestSector ? `${fmtN(largestSector.weightPct, 1)}% weight` : '—'} gold smallValue />
        <Kpi label="Universe PAT CAGR" value={`${fmtN(universeProfitCagr, 1)}%`} sub={rangeLabel} tone={universeProfitCagr >= 0 ? 'up' : 'down'} />
        <Kpi label="Median PAT CAGR" value={`${fmtN(medianPatCagr, 1)}%`} sub="constituent median" tone={medianPatCagr >= 0 ? 'up' : 'down'} />
        <Kpi label="Wt. β / CoE" value={`${weightedBeta.toFixed(2)} · ${fmtN(weightedCoe, 1)}%`} sub={`Rf ${MARKET_PARAMS.riskFreeRatePct}% + ERP ${MARKET_PARAMS.equityRiskPremiumPct}%`} tabular smallValue />
        <Kpi label="HHI / Effective N" value={`${concentration.hhi} · ${concentration.effectiveN}`} sub={`Top-5 holds ${fmtN(concentration.top5Pct, 1)}%`} tabular smallValue />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * ADAPTER: Screener.in JSON → SensexConstituent
 * ════════════════════════════════════════════════════════════════════════ */

function adaptNifty250Constituent(raw: any): SensexConstituent {
  const history: SensexYearFinancial[] = (raw.history ?? []).map((h: any) => ({
    fy: h.fy,
    toplineCr: h.toplineCr ?? 0,
    netProfitCr: h.netProfitCr ?? 0,
    roePct: 0,   // not available from basic scrape
  }));
  return {
    id: raw.id,
    name: raw.name ?? raw.ticker,
    ticker: raw.ticker,
    sector: raw.sector ?? 'Unknown',
    reportingType: raw.reportingType ?? 'nonFinancial',
    weightPct: raw.weightPct ?? 0,
    marketCapCr: raw.marketCapCr ?? 0,
    cmp: raw.cmp ?? 0,
    valuationMetric: raw.valuationMetric ?? 'pe',
    valuationMultiple: raw.valuationMultiple ?? 0,
    dividendYieldPct: raw.dividendYieldPct ?? 0,
    color: raw.color ?? '#60a5fa',
    beta: raw.beta ?? 1.0,
    history,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * SUB-COMPONENTS
 * ════════════════════════════════════════════════════════════════════════ */

function Kpi({ label, value, sub, tone, gold, tabular, smallValue }: {
  label: string; value: string; sub: string;
  tone?: 'up' | 'down'; gold?: boolean; tabular?: boolean; smallValue?: boolean;
}) {
  const color = tone === 'up' ? 'text-emerald-300' : tone === 'down' ? 'text-red-300' : gold ? 'text-[color:var(--color-gold-light)]' : 'text-white';
  const valueSize = smallValue ? 'text-base' : 'text-2xl';
  return (
    <div>
      <div className="kpi-eyebrow">{label}</div>
      <div className={`kpi-value ${valueSize} mt-1 ${color} ${tabular ? 'tabular-nums' : ''} truncate`}>{value}</div>
      <div className={`text-[11px] mt-0.5 ${gold ? 'text-[color:var(--color-gold-light)]' : 'text-gray-500'}`}>{sub}</div>
    </div>
  );
}

function RangeSelector(props: {
  startFy: string; endFy: string; rangePeriods: number;
  rangeStart: number; rangeEnd: number; totalYears: number;
  setRangeStart: (n: number) => void; setRangeEnd: (n: number) => void;
}) {
  const { startFy, endFy, rangePeriods, rangeStart, rangeEnd, totalYears, setRangeStart, setRangeEnd } = props;
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
        <div>
          <div className="kpi-eyebrow">Analysis Window</div>
          <div className="text-lg font-semibold text-white mt-1">
            {startFy} <span className="text-gray-500 mx-2">→</span> {endFy}
            <span className="ml-3 text-sm font-normal text-[color:var(--color-gold-light)]">{rangePeriods}Y lookback</span>
          </div>
        </div>
        <div className="text-[11px] text-gray-400 flex items-center gap-2">
          <Info size={13} /> CAGR, factor scores and implied growth all recompute live with the window.
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        <div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
            <span>Start FY</span>
            <span className="text-[color:var(--color-gold-light)] font-semibold tabular-nums">{startFy}</span>
          </div>
          <input type="range" min={0} max={totalYears - 2} value={rangeStart}
            onChange={e => {
              const v = Number(e.target.value);
              setRangeStart(v);
              if (v >= rangeEnd) setRangeEnd(Math.min(totalYears - 1, v + 1));
            }}
            className="range-slider w-full" />
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
            <span>End FY</span>
            <span className="text-[color:var(--color-gold-light)] font-semibold tabular-nums">{endFy}</span>
          </div>
          <input type="range" min={1} max={totalYears - 1} value={rangeEnd}
            onChange={e => {
              const v = Number(e.target.value);
              setRangeEnd(v);
              if (v <= rangeStart) setRangeStart(Math.max(0, v - 1));
            }}
            className="range-slider w-full" />
        </div>
      </div>
    </div>
  );
}

function UniverseEarningsPower(props: {
  indexSeries: ReturnType<typeof buildSensexIndexTimeSeries>;
  startFy: string; endFy: string;
  filteredCount: number;
  universeToplineCagr: number; universeProfitCagr: number; averageRoe: number;
}) {
  const { indexSeries, startFy, endFy, filteredCount, universeToplineCagr, universeProfitCagr, averageRoe } = props;
  return (
    <div className="premium-card p-5 xl:col-span-2">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Universe Earnings Power</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Aggregate topline &amp; net profit across {filteredCount} constituents</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={indexSeries}>
          <defs>
            <linearGradient id="gradTopline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4a843" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#d4a843" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
          <XAxis dataKey="fy" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
          <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <ReferenceLine yAxisId="left" x={startFy} stroke="#d4a843" strokeDasharray="3 3" opacity={0.6} />
          <ReferenceLine yAxisId="left" x={endFy} stroke="#d4a843" strokeDasharray="3 3" opacity={0.6} />
          <Area yAxisId="left" type="monotone" dataKey="toplineCr" name="Topline" stroke="#3b82f6" strokeWidth={2} fill="url(#gradTopline)" isAnimationActive={true} />
          <Area yAxisId="right" type="monotone" dataKey="netProfitCr" name="Net Profit" stroke="#d4a843" strokeWidth={2} fill="url(#gradProfit)" isAnimationActive={true} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
        <SmallStat label="Topline CAGR" value={`${fmtN(universeToplineCagr, 1)}%`} positive={universeToplineCagr >= 0} />
        <SmallStat label="PAT CAGR" value={`${fmtN(universeProfitCagr, 1)}%`} positive={universeProfitCagr >= 0} />
        <SmallStat label="Avg ROE (last FY)" value={`${fmtN(averageRoe, 1)}%`} />
      </div>
    </div>
  );
}

function SmallStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const color = positive === undefined ? 'text-white' : positive ? 'text-emerald-300' : 'text-red-300';
  return (
    <div>
      <div className="kpi-eyebrow">{label}</div>
      <div className={`text-lg font-bold mt-1 tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function SectorComposition({ sectorSummary, filteredCompanies }: {
  sectorSummary: ReturnType<typeof buildSensexSectorSummary>;
  filteredCompanies: SensexConstituent[];
}) {
  return (
    <div className="premium-card p-5">
      <h3 className="text-sm font-semibold text-white mb-1">Sector Composition</h3>
      <p className="text-[11px] text-gray-500 mb-4">Weight distribution across the filtered set</p>
      <div className="space-y-2">
        {sectorSummary.map((sector, i) => {
          const topCompany = filteredCompanies
            .filter(c => c.sector === sector.sector)
            .sort((a, b) => b.weightPct - a.weightPct)[0];
          const pct = sector.weightPct;
          return (
            <div key={sector.sector} className="sector-chip">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500 w-4">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm font-semibold text-gray-100">{sector.sector}</span>
                </div>
                <span className="text-sm font-bold text-[color:var(--color-gold-light)] tabular-nums">{fmtN(pct, 1)}%</span>
              </div>
              <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(100, pct * 2.5)}%`,
                  background: `linear-gradient(90deg, ${topCompany?.color ?? '#3b82f6'}, ${topCompany?.color ?? '#3b82f6'}aa)`,
                }} />
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {sector.count} {sector.count === 1 ? 'company' : 'companies'} · {fmt(sector.marketCapCr)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectorAnalyticsTable({ data }: { data: ReturnType<typeof buildSectorAnalytics> }) {
  return (
    <div className="premium-card overflow-hidden">
      <div className="p-5 pb-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Sector Analytics</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Weight-weighted fundamentals &middot; CAPM cost of equity &middot; intra-sector concentration
          </p>
        </div>
        <span className="pill pill-muted">{data.length} sectors</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full sensex-table tabular-nums">
          <thead>
            <tr>
              <th className="text-left">Sector</th>
              <th className="text-right">Companies</th>
              <th className="text-right">Weight</th>
              <th className="text-right">Market Cap</th>
              <th className="text-right">Wt. ROE</th>
              <th className="text-right">Wt. PAT CAGR</th>
              <th className="text-right">Wt. β</th>
              <th className="text-right">CoE (CAPM)</th>
              <th className="text-right">Wt. Multiple</th>
              <th className="text-right">Intra HHI</th>
              <th className="text-left">Leader</th>
            </tr>
          </thead>
          <tbody>
            {data.map(s => (
              <tr key={s.sector}>
                <td className="text-gray-100 font-semibold">{s.sector}</td>
                <td className="text-right text-gray-300">{s.count}</td>
                <td className="text-right text-[color:var(--color-gold-light)] font-semibold">{fmtN(s.weightPct, 1)}%</td>
                <td className="text-right text-gray-300">{fmt(s.marketCapCr)}</td>
                <td className="text-right text-gray-200">{fmtN(s.weightedRoePct, 1)}%</td>
                <td className={`text-right font-semibold ${s.weightedPatCagrPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {fmtN(s.weightedPatCagrPct, 1)}%
                </td>
                <td className="text-right text-gray-300">{s.weightedBeta.toFixed(2)}</td>
                <td className="text-right text-gray-300">{fmtN(s.weightedCostOfEquityPct, 1)}%</td>
                <td className="text-right text-gray-300">
                  {s.valuationLabel} {fmtN(s.weightedValuationMultiple, 1)}x
                </td>
                <td className="text-right text-gray-400">{s.internalHHI}</td>
                <td className="text-gray-400 text-[11px] font-mono tracking-wider">{s.topConstituent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TopWeightsChart({ data }: { data: { name: string; weightPct: number; color: string }[] }) {
  return (
    <div className="glass-card p-5 lg:col-span-2">
      <h3 className="text-sm font-semibold text-white mb-1">Top Weights</h3>
      <p className="text-[11px] text-gray-500 mb-4">Index weight leaderboard</p>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
          <YAxis dataKey="name" type="category" tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }} width={80} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Bar dataKey="weightPct" name="Weight %" radius={[0, 4, 4, 0]} isAnimationActive={true}>
            <LabelList dataKey="weightPct" position="right" formatter={(v: any) => `${Number(v).toFixed(1)}%`} style={{ fill: '#cbd5e1', fontSize: 10 }} />
            {data.map(e => <Cell key={e.name} fill={e.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GrowthValuationScatter(props: {
  data: any[]; medianPatCagr: number; rangePeriods: number;
}) {
  const avgMultiple = props.data.length
    ? props.data.reduce((s, d) => s + d.y, 0) / props.data.length
    : 0;
  return (
    <div className="glass-card p-5 lg:col-span-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">Growth × Valuation Map</h3>
        <span className="text-[10px] text-gray-500">Bubble = log(market cap)</span>
      </div>
      <p className="text-[11px] text-gray-500 mb-4">X: {props.rangePeriods}Y PAT CAGR · Y: P/E or P/B multiple</p>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
          <XAxis type="number" dataKey="x" name="PAT CAGR" unit="%" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'PAT CAGR (%)', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name="Multiple" unit="x" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'Valuation Multiple (x)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <ReferenceLine x={props.medianPatCagr} stroke="#d4a843" strokeDasharray="3 3" opacity={0.5}
            label={{ value: 'Median CAGR', fill: '#d4a843', fontSize: 9, position: 'insideTopRight' }} />
          <ReferenceLine y={avgMultiple} stroke="#3b82f6" strokeDasharray="3 3" opacity={0.5}
            label={{ value: 'Avg Multiple', fill: '#3b82f6', fontSize: 9, position: 'insideTopLeft' }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-xs">
                <p className="text-white font-semibold">{d.name}</p>
                <p className="text-gray-400">{d.sector}</p>
                <p className="text-gray-300 mt-1">CAGR: <span className="tabular-nums text-emerald-300">{fmtN(d.x, 1)}%</span></p>
                <p className="text-gray-300">{d.metric}: <span className="tabular-nums text-[color:var(--color-gold-light)]">{fmtN(d.y, 1)}x</span></p>
              </div>
            );
          }} />
          <Scatter data={props.data} isAnimationActive={true}>
            {props.data.map(e => <Cell key={e.name} fill={e.color} fillOpacity={0.75} stroke={e.color} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function ImpliedVsRealizedScatter({ data, rangePeriods }: { data: any[]; rangePeriods: number }) {
  const xMin = Math.min(...data.map(d => Math.min(d.x, d.y)), -2);
  const xMax = Math.max(...data.map(d => Math.max(d.x, d.y)), 20);

  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Market-Implied vs Delivered Growth</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            X: perpetual growth implied by today&apos;s valuation (reverse Gordon, CAPM CoE) &middot; Y: {rangePeriods}Y realized PAT CAGR
          </p>
        </div>
        <div className="text-[10px] text-gray-500 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[color:var(--color-gold-light)] rounded" />y = x (fair)</span>
          <span>Above = market under-pricing</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
          <XAxis type="number" dataKey="x" name="Implied g" unit="%" domain={[Math.floor(xMin), Math.ceil(xMax)]} tickFormatter={(v: number) => Math.round(v).toString()} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'Implied Perpetual Growth (%)', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name="Delivered CAGR" unit="%" domain={[Math.floor(xMin), Math.ceil(xMax)]} tickFormatter={(v: number) => Math.round(v).toString()} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'Realized PAT CAGR (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <ReferenceLine segment={[{ x: xMin, y: xMin }, { x: xMax, y: xMax }]} stroke="#d4a843" strokeDasharray="4 4" opacity={0.7} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            const verdict = d.gap > 3 ? 'Historically outran implied growth' : d.gap < -3 ? 'Expectation above track record' : 'Priced near historical pace';
            const verdictColor = d.gap > 3 ? 'text-emerald-300' : d.gap < -3 ? 'text-red-300' : 'text-gray-300';
            return (
              <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-xs">
                <p className="text-white font-semibold">{d.name}</p>
                <p className="text-gray-400">{d.sector}</p>
                <div className="h-px bg-border my-1.5" />
                <p className="text-gray-300">Implied g: <span className="tabular-nums text-[color:var(--color-gold-light)]">{fmtN(d.x, 1)}%</span></p>
                <p className="text-gray-300">Delivered: <span className="tabular-nums text-emerald-300">{fmtN(d.y, 1)}%</span></p>
                <p className="text-gray-300">CoE: <span className="tabular-nums text-white">{fmtN(d.coe, 1)}%</span></p>
                <p className={`mt-1 ${verdictColor}`}>{verdict}</p>
              </div>
            );
          }} />
          <Scatter data={data} isAnimationActive={true}>
            {data.map(e => <Cell key={e.name} fill={e.color} fillOpacity={0.78} stroke={e.color} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function FactorScorecard({ rows, selectedId, onSelect }: {
  rows: { company: SensexConstituent; scores: { quality: number; value: number; growth: number; momentum: number; composite: number } }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const top = [...rows].sort((a, b) => b.scores.composite - a.scores.composite).slice(0, 12);
  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Factor Scorecard</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Percentile-ranked across the filtered universe &middot; Quality / Value / Growth / Momentum
          </p>
        </div>
        <div className="text-[10px] text-gray-500 flex items-center gap-3">
          <InlineLegend color="#60a5fa" label="Quality" />
          <InlineLegend color="#22c55e" label="Value" />
          <InlineLegend color="#d4a843" label="Growth" />
          <InlineLegend color="#a855f7" label="Momentum" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {top.map(r => {
          const s = r.scores;
          const isSelected = r.company.id === selectedId;
          return (
            <button
              key={r.company.id}
              onClick={() => onSelect(r.company.id)}
              className={`sector-chip text-left w-full ${isSelected ? 'ring-1 ring-[color:var(--color-gold-light)]/50' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-6 rounded-sm" style={{ backgroundColor: r.company.color }} />
                  <div>
                    <div className="text-[13px] font-semibold text-gray-100">{r.company.ticker}</div>
                    <div className="text-[10px] text-gray-500">{r.company.sector}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-widest text-gray-500">Composite</div>
                  <div className="text-base font-bold text-[color:var(--color-gold-light)] tabular-nums">{fmtN(s.composite, 0)}</div>
                </div>
              </div>
              <FactorBar label="Quality" value={s.quality} color="#60a5fa" />
              <FactorBar label="Value" value={s.value} color="#22c55e" />
              <FactorBar label="Growth" value={s.growth} color="#d4a843" />
              <FactorBar label="Momentum" value={s.momentum} color="#a855f7" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="text-[10px] text-gray-400 w-16 shrink-0">{label}</div>
      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, value)}%`, background: color, opacity: 0.85 }} />
      </div>
      <div className="text-[10px] text-gray-200 tabular-nums w-8 text-right">{Math.round(value)}</div>
    </div>
  );
}

function InlineLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function ConstituentLedger(props: {
  rows: {
    company: SensexConstituent;
    last: { toplineCr: number; roePct: number; rocePct?: number };
    toplineCagr: number; profitCagr: number; valuationLabel: string;
    coe: number; impliedG: number; scores: { composite: number };
    valuationZ: number; sectorMedianMultiple: number;
  }[];
  selectedId: string;
  onSelect: (id: string) => void;
  rangeLabel: string;
  endFy: string;
  sortCaret: (key: SortKey) => string;
  toggleSort: (key: SortKey) => void;
}) {
  const { rows, selectedId, onSelect, rangeLabel, endFy, sortCaret, toggleSort } = props;

  const handleExport = () => {
    const header = [
      'Ticker', 'Name', 'Sector', 'Type', 'WeightPct', 'MarketCapCr', 'CMP',
      `Topline_${endFy}_Cr`, 'ToplineCAGR_pct', 'PATCAGR_pct',
      `ROE_${endFy}_pct`, 'Beta', 'CoE_pct', 'ValuationMetric',
      'Multiple', 'SectorMedianMultiple', 'Z_vs_sector',
      'ImpliedGrowth_pct', 'CompositeScore',
    ];
    const lines = rows.map((r) => [
      r.company.ticker,
      JSON.stringify(r.company.name),
      JSON.stringify(r.company.sector),
      r.company.reportingType === 'financial' ? 'BFSI' : 'Corp',
      r.company.weightPct.toFixed(3),
      r.company.marketCapCr,
      r.company.cmp,
      r.last.toplineCr,
      r.toplineCagr.toFixed(2),
      r.profitCagr.toFixed(2),
      r.last.roePct.toFixed(2),
      r.company.beta.toFixed(2),
      r.coe.toFixed(2),
      r.valuationLabel,
      r.company.valuationMultiple.toFixed(2),
      r.sectorMedianMultiple.toFixed(2),
      r.valuationZ.toFixed(2),
      r.impliedG.toFixed(2),
      r.scores.composite.toFixed(1),
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nifty250-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="premium-card overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Constituent Ledger</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Sortable · CAGR across {rangeLabel} · CAPM CoE · reverse-Gordon implied growth · valuation z-score vs sector · composite factor score
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-200 bg-black/40 hover:bg-black/60 border border-border rounded-md px-3 py-1.5 transition"
            aria-label="Download constituent ledger as CSV"
          >
            <Download size={12} /> CSV
          </button>
          <span className="pill pill-muted">{rows.length} rows</span>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[560px]">
        <table className="w-full sensex-table tabular-nums">
          <thead>
            <tr>
              <th className="text-left sticky left-0 z-20" style={{ minWidth: 220, background: 'linear-gradient(180deg, rgba(15,23,41,0.98), rgba(22,32,51,0.95))' }}>Company</th>
              <th className="text-left">Sector</th>
              <th className="text-center">Type</th>
              <th className="text-right sort-header" onClick={() => toggleSort('weight')}>Weight{sortCaret('weight')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('mcap')}>Market Cap{sortCaret('mcap')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('topline')}>{endFy} Topline{sortCaret('topline')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('toplineCagr')}>Topline CAGR{sortCaret('toplineCagr')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('profitCagr')}>PAT CAGR{sortCaret('profitCagr')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('roe')}>ROE{sortCaret('roe')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('beta')}>β{sortCaret('beta')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('coe')}>CoE{sortCaret('coe')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('valuation')}>Mult{sortCaret('valuation')}</th>
              <th className="text-right" title="Z-score of valuation multiple vs sector peers (median, MAD scaled). Negative = cheaper than peers.">Z vs sector</th>
              <th className="text-right sort-header" onClick={() => toggleSort('impliedG')}>Impl. g{sortCaret('impliedG')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('composite')}>Score{sortCaret('composite')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isSelected = r.company.id === selectedId;
              return (
                <tr key={r.company.id} onClick={() => onSelect(r.company.id)} className={`cursor-pointer ${isSelected ? 'selected' : ''}`}>
                  <td className="sticky left-0 z-10" style={{ background: isSelected ? 'rgba(28, 41, 64, 0.98)' : 'rgba(15, 23, 41, 0.96)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-8 rounded-sm shrink-0" style={{ backgroundColor: r.company.color }} />
                      <div>
                        <div className="text-gray-100 font-semibold text-[13px]">{r.company.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono tracking-wider">{r.company.ticker}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-300 text-[11px]">{r.company.sector}</td>
                  <td className="text-center">
                    <span className={`pill ${r.company.reportingType === 'financial' ? '' : 'pill-muted'}`}>
                      {r.company.reportingType === 'financial' ? 'BFSI' : 'Corp'}
                    </span>
                  </td>
                  <td className="text-right text-gray-200 font-semibold">{fmtN(r.company.weightPct, 1)}%</td>
                  <td className="text-right text-gray-300">{fmt(r.company.marketCapCr)}</td>
                  <td className="text-right text-gray-300">{fmt(r.last.toplineCr)}</td>
                  <td className={`text-right font-semibold ${r.toplineCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(r.toplineCagr, 1)}%</td>
                  <td className={`text-right font-semibold ${r.profitCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(r.profitCagr, 1)}%</td>
                  <td className="text-right text-gray-200">{fmtN(r.last.roePct, 1)}%</td>
                  <td className="text-right text-gray-300">{r.company.beta.toFixed(2)}</td>
                  <td className="text-right text-gray-300">{fmtN(r.coe, 1)}%</td>
                  <td className="text-right text-[color:var(--color-gold-light)] font-semibold">{r.valuationLabel} {fmtN(r.company.valuationMultiple, 1)}x</td>
                  <td className={`text-right font-semibold ${r.valuationZ <= -0.5 ? 'text-emerald-300' : r.valuationZ >= 0.5 ? 'text-red-300' : 'text-gray-300'}`} title={`Sector median ${r.valuationLabel} ${r.sectorMedianMultiple.toFixed(1)}x`}>
                    {r.valuationZ >= 0 ? '+' : ''}{r.valuationZ.toFixed(2)}σ
                  </td>
                  <td className={`text-right font-semibold ${r.impliedG >= 4 ? 'text-amber-200' : 'text-gray-300'}`}>{fmtN(r.impliedG, 1)}%</td>
                  <td className="text-right">
                    <ScoreChip score={r.scores.composite} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreChip({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#d4a843' : score >= 30 ? '#94a3b8' : '#ef4444';
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums font-semibold" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {Math.round(score)}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function DrillDown({ row, rangeStart, rangeEnd, rangePeriods }: {
  row: {
    company: SensexConstituent;
    first: { fy: string }; last: { fy: string; roePct: number; toplineCr: number; netProfitCr: number };
    profitCagr: number; coe: number; impliedG: number; gap: number; valuationLabel: string;
    scores: { quality: number; value: number; growth: number; momentum: number; composite: number };
  };
  rangeStart: number; rangeEnd: number; rangePeriods: number;
}) {
  const { company, first, last, profitCagr, coe, impliedG, gap, scores, valuationLabel } = row;
  const dp = computeDuPont(company);
  const vol = earningsVolatility(company.history);

  const historyChart = company.history.slice(rangeStart, rangeEnd + 1).map(h => ({
    fy: h.fy,
    Topline: h.toplineCr,
    'Net Profit': h.netProfitCr,
  }));

  return (
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-16 rounded" style={{ backgroundColor: company.color }} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="pill pill-muted font-mono">{company.ticker}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">{company.sector}</span>
              <span className="pill pill-muted">β {company.beta.toFixed(2)}</span>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">{company.name}</h3>
            <p className="text-xs text-gray-400 mt-1">
              CMP ₹{company.cmp.toLocaleString()} · {company.reportingType === 'financial' ? 'Financial reporting profile' : 'Operating company profile'} · {valuationLabel} {fmtN(company.valuationMultiple, 1)}x
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="kpi-eyebrow">Composite Score</div>
          <div className="text-3xl font-bold text-[color:var(--color-gold-light)] mt-1 tabular-nums">{Math.round(scores.composite)}</div>
          <div className="text-[11px] text-gray-400">of 100</div>
        </div>
      </div>

      <div className="hairline-divider" />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Kpi label="Market Cap" value={fmt(company.marketCapCr)} sub={`CMP ₹${company.cmp}`} smallValue />
        <Kpi label="Index Weight" value={`${fmtN(company.weightPct, 1)}%`} sub="of Nifty 250" gold smallValue />
        <Kpi label={`${rangePeriods}Y PAT CAGR`} value={`${fmtN(profitCagr, 1)}%`} sub={`${first.fy} → ${last.fy}`} tone={profitCagr >= 0 ? 'up' : 'down'} smallValue />
        <Kpi label="CoE (CAPM)" value={`${fmtN(coe, 1)}%`} sub={`β ${company.beta.toFixed(2)}`} tabular smallValue />
        <Kpi label="Implied g" value={`${fmtN(impliedG, 1)}%`} sub="Reverse Gordon" tabular smallValue />
        <Kpi label="Earnings Vol" value={`${fmtN(vol, 1)}%`} sub="stdev YoY PAT growth" tabular smallValue />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 lg:col-span-3">
          <h4 className="text-sm font-semibold text-white mb-1">Topline vs Net Profit</h4>
          <p className="text-[11px] text-gray-500 mb-4">{first.fy} – {last.fy}</p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={historyChart}>
              <defs>
                <linearGradient id="coGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={company.color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={company.color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" vertical={false} />
              <XAxis dataKey="fy" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }} />
              <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#d4a843', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Area yAxisId="left" type="monotone" dataKey="Topline" name="Topline" stroke={company.color} strokeWidth={2} fill="url(#coGrad)" isAnimationActive={true} />
              <Line yAxisId="right" type="monotone" dataKey="Net Profit" name="Net Profit" stroke="#d4a843" strokeWidth={2.5} dot={{ r: 3, fill: '#d4a843' }} isAnimationActive={true} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5 lg:col-span-2 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Factor Profile</h4>
            <p className="text-[11px] text-gray-500 mb-3">Universe-relative percentile on each pillar</p>
            <FactorBar label="Quality" value={scores.quality} color="#60a5fa" />
            <FactorBar label="Value" value={scores.value} color="#22c55e" />
            <FactorBar label="Growth" value={scores.growth} color="#d4a843" />
            <FactorBar label="Momentum" value={scores.momentum} color="#a855f7" />
          </div>

          <div className="hairline-divider" />

          {dp.applicable ? (
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">DuPont Decomposition</h4>
              <p className="text-[11px] text-gray-500 mb-3">ROE split into margin vs efficiency &amp; leverage</p>
              <DuPontStack dp={dp} />
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Capital Profile</h4>
              <p className="text-[11px] text-gray-500">Banking model &mdash; DuPont (NPM × turnover × leverage) not meaningful; ROE tracked directly at <span className="text-gray-200 tabular-nums">{fmtN(last.roePct, 1)}%</span>.</p>
            </div>
          )}

          <div className="hairline-divider" />

          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Reverse-Gordon Read</h4>
            <p className="text-[11px] text-gray-500 mb-2">
              The current {valuationLabel} implies the market expects ~<span className="tabular-nums text-[color:var(--color-gold-light)]">{fmtN(impliedG, 1)}%</span> perpetual growth at a <span className="tabular-nums text-white">{fmtN(coe, 1)}%</span> cost of equity.
            </p>
            <p className={`text-[11px] ${gap > 3 ? 'text-emerald-300' : gap < -3 ? 'text-red-300' : 'text-gray-400'}`}>
              Delivered {rangePeriods}Y PAT CAGR of <span className="tabular-nums font-semibold">{fmtN(profitCagr, 1)}%</span>
              {' '}&mdash; gap of <span className="tabular-nums font-semibold">{gap >= 0 ? '+' : ''}{fmtN(gap, 1)}pp</span>.
              {gap > 3 && ' Track record exceeds what the market is paying for.'}
              {gap < -3 && ' Market pricing in acceleration vs history.'}
              {Math.abs(gap) <= 3 && ' Price roughly matches history.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DuPontStack({ dp }: { dp: { npm: number; leverageAndTurnover: number; roe: number } }) {
  const total = dp.roe || 1;
  const npmPct = (dp.npm / total) * 100;
  return (
    <div>
      <div className="flex w-full h-8 rounded-md overflow-hidden bg-black/40 border border-border">
        <div className="flex items-center justify-center text-[10px] font-semibold text-white" style={{ width: `${Math.max(4, npmPct)}%`, background: '#22c55e' }}>
          {npmPct > 12 && `NPM ${fmtN(dp.npm, 1)}%`}
        </div>
        <div className="flex items-center justify-center text-[10px] font-semibold text-white" style={{ width: `${Math.max(4, 100 - npmPct)}%`, background: '#3b82f6' }}>
          {100 - npmPct > 12 && `Eff. & Lev. ${fmtN(dp.leverageAndTurnover, 1)}%`}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
        <span>Net Margin contribution</span>
        <span>Efficiency + Leverage contribution</span>
      </div>
      <div className="mt-2 text-[11px] text-gray-300 flex items-center justify-between">
        <span>Reported ROE</span>
        <span className="tabular-nums font-semibold text-white">{fmtN(dp.roe, 1)}%</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * NEW: DataProvenanceBanner — transparency on data source & methodology
 * ════════════════════════════════════════════════════════════════════════ */
function DataProvenanceBanner({ rows, dataSource }: { rows: { company: SensexConstituent }[]; dataSource: string }) {
  // Quick integrity tally — proves the universe is real, not synthetic.
  const uniqueSectors = new Set(rows.map((r) => r.company.sector)).size;
  const corp = rows.filter((r) => r.company.reportingType === 'nonFinancial').length;
  const bfsi = rows.length - corp;

  return (
    <div className="glass-card p-5 border-l-2 border-[color:var(--color-gold-light)]">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <ShieldCheck size={18} className="text-[color:var(--color-gold-light)]" />
          <span className="text-sm font-semibold text-white">Data Provenance</span>
        </div>
        <div className="flex-1 min-w-[260px] space-y-2">
          {dataSource === 'screener-in' ? (
            <>
              <p className="text-[12px] text-gray-300 leading-relaxed">
                <span className="text-white font-semibold">Source:</span> Screener.in — real annual financial data
                <span className="ml-2 pill pill-muted text-[10px]">No estimates</span>
              </p>
              <p className="text-[12px] text-gray-400 leading-relaxed">
                <span className="text-gray-200 font-semibold">Universe:</span> {rows.length} NSE-listed names · {uniqueSectors} sectors · {corp} corporates / {bfsi} BFSI
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Data collected from publicly available screener.in pages. Only years with real reported
                data are included — no backfilling, no CAGR extrapolation, no synthetic values.
              </p>
            </>
          ) : (
            <>
              <p className="text-[12px] text-gray-300 leading-relaxed">
                <span className="text-white font-semibold">Source:</span> {NIFTY250_PROVENANCE.source}
              </p>
              <p className="text-[12px] text-gray-400 leading-relaxed">
                <span className="text-gray-200 font-semibold">As-of:</span> {NIFTY250_PROVENANCE.asOf}
                <span className="mx-2 text-gray-600">·</span>
                <span className="text-gray-200 font-semibold">Universe:</span> {rows.length} real NSE-listed names · {uniqueSectors} sectors · {corp} corporates / {bfsi} BFSI
              </p>
              <ul className="text-[11px] text-gray-400 leading-relaxed list-disc pl-4 space-y-0.5">
                {NIFTY250_PROVENANCE.methodology.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-200/80 leading-relaxed pt-1">
                <span className="font-semibold">Disclaimer:</span> {NIFTY250_PROVENANCE.disclaimer}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * NEW: SectorMomentumHeatmap — sector × FY YoY PAT growth heatmap
 * ════════════════════════════════════════════════════════════════════════ */
function SectorMomentumHeatmap({ rows }: { rows: SectorMomentumRow[] }) {
  if (rows.length === 0) return null;
  const fyLabels = rows[0].cells.map((c) => c.fy);

  // Color scale: red → grey → green, capped at ±60% YoY for readability.
  const cap = 60;
  const colorFor = (v: number): string => {
    const clamped = Math.max(-cap, Math.min(cap, v));
    if (clamped >= 0) {
      const t = clamped / cap;
      const alpha = 0.18 + 0.62 * t;
      return `rgba(34, 197, 94, ${alpha.toFixed(2)})`;
    }
    const t = -clamped / cap;
    const alpha = 0.18 + 0.62 * t;
    return `rgba(239, 68, 68, ${alpha.toFixed(2)})`;
  };

  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Sector Momentum Heatmap</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">YoY PAT growth by sector — read rotation across cycles. Green = expansion, red = contraction.</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(239,68,68,0.7)' }} />−60%+</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(148,163,184,0.25)' }} />~0%</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34,197,94,0.7)' }} />+60%+</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] tabular-nums">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left py-2 px-2 sticky left-0 bg-[rgba(15,23,41,0.96)] z-10" style={{ minWidth: 180 }}>Sector</th>
              <th className="text-right py-2 px-2">Wt</th>
              <th className="text-right py-2 px-2">10Y CAGR</th>
              {fyLabels.map((fy) => (
                <th key={fy} className="text-center py-2 px-1.5 font-mono">{fy.replace('FY', '')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sector} className="border-t border-border/40">
                <td className="py-1.5 px-2 text-gray-200 font-semibold sticky left-0 bg-[rgba(15,23,41,0.96)] z-10">{row.sector}</td>
                <td className="py-1.5 px-2 text-right text-gray-400">{fmtN(row.weightPct, 1)}%</td>
                <td className={`py-1.5 px-2 text-right font-semibold ${row.fullPeriodCagrPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {fmtN(row.fullPeriodCagrPct, 1)}%
                </td>
                {row.cells.map((cell) => (
                  <td
                    key={cell.fy}
                    className="text-center font-semibold"
                    style={{
                      background: colorFor(cell.yoyPatGrowthPct),
                      color: '#f8fafc',
                      padding: '6px 4px',
                      minWidth: 56,
                    }}
                    title={`${row.sector} ${cell.fy}: ${cell.yoyPatGrowthPct.toFixed(1)}% YoY`}
                  >
                    {fmtN(cell.yoyPatGrowthPct, 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * NEW: MagicFormulaCard — Greenblatt's combined-rank screen
 * ════════════════════════════════════════════════════════════════════════ */
function MagicFormulaCard({
  rows,
  onSelect,
}: {
  rows: MagicFormulaScore[];
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  const top = rows.slice(0, 12);
  const chartData = top.map((r) => ({
    name: r.ticker,
    capEff: r.capitalEfficiencyPct,
    yld: r.earningsYieldPct,
    combined: r.rankCombined,
  }));

  return (
    <div className="premium-card p-5">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Magic Formula Screen — Top 12</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Greenblatt&apos;s combined rank of capital efficiency (ROCE / ROE) + earnings yield (E/P or ROE/PB).
            Lowest combined rank = best business at the fairest price.
          </p>
        </div>
        <span className="pill pill-muted">screened across {rows.length} names</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] tabular-nums">
            <thead>
              <tr className="text-gray-500 border-b border-border/50">
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Sector</th>
                <th className="text-right py-2">Cap. Eff.</th>
                <th className="text-right py-2">E/Yield</th>
                <th className="text-right py-2">Σ rank</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, idx) => (
                <tr
                  key={r.id}
                  className="border-b border-border/30 cursor-pointer hover:bg-white/5 transition"
                  onClick={() => onSelect(r.id)}
                >
                  <td className="py-1.5 text-[color:var(--color-gold-light)] font-bold">{idx + 1}</td>
                  <td className="py-1.5 text-gray-100">
                    <div className="font-semibold text-[12px]">{r.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{r.ticker}</div>
                  </td>
                  <td className="py-1.5 text-gray-400 text-[10px]">{r.sector}</td>
                  <td className="py-1.5 text-right text-emerald-300 font-semibold">{fmtN(r.capitalEfficiencyPct, 1)}%</td>
                  <td className="py-1.5 text-right text-amber-200 font-semibold">{fmtN(r.earningsYieldPct, 1)}%</td>
                  <td className="py-1.5 text-right text-white font-bold">{r.rankCombined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 12, right: 16, bottom: 36, left: 8 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
            <XAxis
              type="number" dataKey="capEff" name="Capital Efficiency"
              tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false}
              label={{ value: 'Capital Efficiency (ROCE / ROE %)', position: 'bottom', offset: 18, fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              type="number" dataKey="yld" name="Earnings Yield"
              tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false}
              label={{ value: 'Earnings Yield (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="combined" range={[280, 60]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
              content={<ChartTooltip />}
            />
            <Scatter data={chartData} fill="#d4a843">
              {chartData.map((_, i) => (
                <Cell key={i} fill="#d4a843" />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
