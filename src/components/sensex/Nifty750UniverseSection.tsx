import { useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import type { SensexConstituent, SensexYearFinancial } from '@/data/sensexData';
import {
  buildSensexIndexTimeSeries, buildSensexSectorSummary,
  calculateCagr, getLatestSensexFinancial, getPrimaryValuationLabel,
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

export function Nifty750UniverseSection() {
  const [selectedId, setSelectedId] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('composite');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedBatch, setSelectedBatch] = useState<BatchSlug>('largemidcap250');
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setRawData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const batchCompanies: SensexConstituent[] = useMemo(() => {
    if (!rawData) return [];
    const batch = rawData.batches?.find((b: any) => b.indexSlug === selectedBatch);
    if (!batch?.companies) return [];
    return batch.companies.map(adaptConstituent);
  }, [rawData, selectedBatch]);

  const [years, setYears] = useState<string[]>([]);
  useEffect(() => {
    if (batchCompanies.length > 0) {
      const fySet = new Set<string>();
      batchCompanies.forEach(c => c.history.forEach(h => fySet.add(h.fy)));
      setYears(Array.from(fySet).sort());
    }
  }, [batchCompanies]);

  useEffect(() => {
    if (batchCompanies.length > 0 && !batchCompanies.find(c => c.id === selectedId)) {
      setSelectedId(batchCompanies[0]?.id ?? '');
    }
  }, [batchCompanies, selectedId]);

  const [filterVal, setFilterVal] = useState<Filter>('all');

  const totalYears = years.length;
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(totalYears - 1);
  useEffect(() => { setRangeEnd(Math.max(0, totalYears - 1)); }, [totalYears]);

  const filteredCompanies = useMemo(() => {
    if (filterVal === 'all') return batchCompanies;
    return batchCompanies.filter(c => c.reportingType === filterVal);
  }, [filterVal, batchCompanies]);

  const startFy = years[rangeStart];
  const endFy = years[rangeEnd];
  const rangePeriods = Math.max(1, rangeEnd - rangeStart);
  const rangeLabel = `${startFy}–${endFy}`;

  const indexSeries = useMemo(() => buildSensexIndexTimeSeries(filteredCompanies), [filteredCompanies]);
  const sectorSummary = useMemo(() => buildSensexSectorSummary(filteredCompanies), [filteredCompanies]);
  const sectorAnalytics = useMemo(() => buildSectorAnalytics(filteredCompanies, rangeStart, rangeEnd), [filteredCompanies, rangeStart, rangeEnd]);
  const concentration = useMemo(() => computeConcentration(filteredCompanies), [filteredCompanies]);
  const factorScores = useMemo(() => buildFactorScores(filteredCompanies, rangeStart, rangeEnd), [filteredCompanies, rangeStart, rangeEnd]);
  const magicFormula = useMemo(() => buildMagicFormulaRanks(filteredCompanies), [filteredCompanies]);
  const sectorMomentum = useMemo(() => buildSectorMomentumGrid(filteredCompanies), [filteredCompanies]);
  const valuationZ = useMemo(() => buildValuationZScores(filteredCompanies), [filteredCompanies]);

  const rows = useMemo(() => filteredCompanies.map(company => {
    const firstRaw = company.history[rangeStart];
    const lastRaw = company.history[rangeEnd];
    const first = firstRaw ?? company.history[0] ?? { fy: 'N/A', toplineCr: 0, netProfitCr: 0, roePct: 0 };
    const last = lastRaw ?? company.history[company.history.length - 1] ?? { fy: 'N/A', toplineCr: 0, netProfitCr: 0, roePct: 0 };
    const profitCagr = first?.toplineCr != null && last?.toplineCr != null
      ? calculateCagr(first.netProfitCr, last.netProfitCr, rangePeriods) : 0;
    const coe = costOfEquity(company.beta);
    const impliedG = impliedPerpetualGrowth(company);
    const scores = factorScores.get(company.id);
    const valZ = valuationZ.get(company.id);
    return {
      company, first, last,
      toplineCagr: first?.toplineCr != null && last?.toplineCr != null
        ? calculateCagr(first.toplineCr, last.toplineCr, rangePeriods) : 0,
      profitCagr, coe, impliedG, gap: profitCagr - impliedG,
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
    const roes = filteredCompanies.map(c => { const fin = getLatestSensexFinancial(c); return fin?.roePct ?? 0; });
    return roes.reduce((s, v) => s + v, 0) / filteredCompanies.length;
  }, [filteredCompanies]);

  const selectedRow = sortedRows.find(r => r.company.id === selectedId) ?? sortedRows[0];
  const selectedCompany = selectedRow?.company ?? filteredCompanies[0];

  const topWeightData = useMemo(() =>
    [...filteredCompanies].sort((a, b) => b.weightPct - a.weightPct).slice(0, 12)
      .map(c => ({ name: c.ticker, weightPct: c.weightPct, color: c.color })), [filteredCompanies]);

  const growthVsValuation = useMemo(() => rows.map(r => ({
    name: r.company.ticker, x: r.profitCagr, y: r.company.valuationMultiple,
    z: Math.log(Math.max(1, r.company.marketCapCr)) * 10, color: r.company.color,
    sector: r.company.sector, metric: r.valuationLabel,
  })), [rows]);

  const impliedVsRealized = useMemo(() => rows.map(r => ({
    name: r.company.ticker, x: r.impliedG, y: r.profitCagr,
    z: Math.log(Math.max(1, r.company.marketCapCr)) * 10, color: r.company.color,
    sector: r.company.sector, gap: r.gap, coe: r.coe,
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

  if (loading) {
    return <div className="glass-card p-8 text-center text-gray-400 animate-pulse">Loading Nifty 750 data…</div>;
  }

  if (!rawData) {
    return <div className="glass-card p-8 text-center text-gray-400">Unable to load Nifty 750 data. Ensure <code className="px-1">npm run data:refresh-nifty750</code> has been run.</div>;
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="premium-card p-6 md:p-7">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 mb-3">
              <span className="pill"><Layers size={13} /> Universe</span>
              <span className="pill pill-muted">{BATCH_LABELS[selectedBatch]} · {batchCompanies.length} Constituents</span>
              <span className="pill pill-muted">{rangeLabel}</span>
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
                <option key={slug} value={slug}>{BATCH_LABELS[slug]} ({rawData?.batches?.find((b: any) => b.indexSlug === slug)?.companies?.length ?? 0})</option>
              ))}
            </select>
            <div className="segmented">
              {([{ id: 'all' as const, label: 'All' }, { id: 'nonFinancial' as const, label: 'Corporates' }, { id: 'financial' as const, label: 'BFSI' }]).map(opt => (
                <button key={opt.id} onClick={() => setFilterVal(opt.id)} className={filterVal === opt.id ? 'active' : ''}>{opt.label}</button>
              ))}
            </div>
            <div className="segmented">
              {[5, 10, 13].map(n => {
                const isActive = rangeStart === Math.max(0, totalYears - 1 - n) && rangeEnd === totalYears - 1;
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

      <DataProvenanceBanner rows={sortedRows} dataSource="screener-in" />

      <RangeSelector startFy={startFy} endFy={endFy} rangePeriods={rangePeriods}
        rangeStart={rangeStart} rangeEnd={rangeEnd} totalYears={totalYears}
        setRangeStart={setRangeStart} setRangeEnd={setRangeEnd} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <UniverseEarningsPower indexSeries={indexSeries} startFy={startFy} endFy={endFy}
          filteredCount={filteredCompanies.length}
          universeToplineCagr={universeToplineCagr} universeProfitCagr={universeProfitCagr} averageRoe={averageRoe} />
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

      <ConstituentLedger rows={sortedRows} selectedId={selectedCompany?.id ?? ''} onSelect={setSelectedId}
        rangeLabel={rangeLabel} endFy={endFy} sortCaret={sortCaret} toggleSort={toggleSort} showZScore={true} />

      {selectedRow && <DrillDown row={selectedRow} rangeStart={rangeStart} rangeEnd={rangeEnd} rangePeriods={rangePeriods} />}
    </div>
  );
}

function adaptConstituent(raw: any): SensexConstituent {
  const history: SensexYearFinancial[] = (raw.history ?? []).map((h: any) => ({
    fy: h.fy,
    toplineCr: h.toplineCr ?? 0,
    netProfitCr: h.netProfitCr ?? 0,
    roePct: h.roePct ?? 0,
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
    valuationMetric: raw.valuationMetric ?? (raw.reportingType === 'financial' ? 'pb' : 'pe'),
    valuationMultiple: raw.valuationMultiple ?? 0,
    dividendYieldPct: raw.dividendYieldPct ?? 0,
    color: raw.color ?? '#60a5fa',
    beta: raw.beta ?? 1.0,
    history,
  };
}
