import { COMPANY_PROFILES, type CompanyProfile } from '@/data/companies';
import { sensexConstituents } from '@/data/sensexData';
import { FACTOR_CONFIG, COMPOSITE_WEIGHTS, type FactorConfig } from '@/data/ralphData';

export interface ScreenerRow {
  companyId: string;
  name: string;
  sector: string;
  ticker: string;
  roe: number;
  roce: number;
  ebitda_mgn: number;
  fcf_yield: number;
  net_debt_ev: number;
  pe: number;
  pb: number;
  ev_ebitda: number;
  div_yield: number;
  rev_cagr3: number;
  pat_cagr3: number;
  eps_est_g: number;
  pct_52w_hi: number;
  beta: number;
  div_cov: number;
  interest_cov: number;
  current_rat: number;
  qualityScore: number;
  valueScore: number;
  growthScore: number;
  momentumScore: number;
  safetyScore: number;
  compositeScore: number;
  rank: number;
}

type RawScreenerRow = Omit<ScreenerRow, 'qualityScore' | 'valueScore' | 'growthScore' | 'momentumScore' | 'safetyScore' | 'compositeScore' | 'rank'>;
type FactorId = FactorConfig['id'];

const TICKER_ALIASES: Record<string, string> = {
  HDFCBANK: 'HDFCBANK',
  INFY: 'INFY',
  BHARTIARTL: 'BHARTIARTL',
  LT: 'LT',
  BAJFINANCE: 'BAJFINANCE',
  BAJAJFINSV: 'BAJAJFINSV',
  MANDM: 'M&M',
};

function round(n: number, p = 1): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

function sensexMeta(profile: CompanyProfile) {
  const ticker = TICKER_ALIASES[profile.ticker] ?? profile.ticker;
  return sensexConstituents.find(c => c.ticker === ticker || c.name.toLowerCase().includes(profile.name.toLowerCase().split(' ')[0] ?? ''));
}

export function getRalphBeta(profile: CompanyProfile): number {
  return sensexMeta(profile)?.beta ?? (profile.sector.includes('Bank') || profile.sector.includes('Finance') ? 1.15 : 1);
}

export function getRalphDividendYield(profile: CompanyProfile): number {
  const meta = sensexMeta(profile);
  if (meta) return meta.dividendYieldPct;
  const latest = profile.historical.at(-1)!;
  return latest.dps > 0 ? (latest.dps / profile.currentMarketPrice) * 100 : 0;
}

export function getRalphPe(profile: CompanyProfile): number {
  const meta = sensexMeta(profile);
  if (meta?.valuationMetric === 'pe') return meta.valuationMultiple;
  const latest = profile.historical.at(-1)!;
  return latest.eps > 0 ? profile.currentMarketPrice / latest.eps : 99;
}

export function getRalphPctFromHigh(profile: CompanyProfile): number {
  const beta = getRalphBeta(profile);
  const upsideToTarget = ((profile.targetPriceRange.base - profile.currentMarketPrice) / profile.currentMarketPrice) * 100;
  return round(Math.max(0, Math.min(35, 12 + beta * 8 - upsideToTarget * 0.15)), 1);
}

function cagr3(profile: CompanyProfile): { rev: number; pat: number } {
  const h = profile.historical;
  if (h.length < 4) return { rev: 0, pat: 0 };
  const latest = h[h.length - 1]!;
  const base = h[h.length - 4]!;
  const rev = base.revenue > 0 ? (Math.pow(latest.revenue / base.revenue, 1 / 3) - 1) * 100 : 0;
  const pat = base.pat > 0 ? (Math.pow(latest.pat / base.pat, 1 / 3) - 1) * 100 : 0;
  return { rev: round(rev), pat: round(pat) };
}

function extractRawMetrics(profile: CompanyProfile): RawScreenerRow {
  const latest = profile.historical.at(-1)!;
  const previous = profile.historical.at(-2) ?? latest;
  const { rev: rev_cagr3, pat: pat_cagr3 } = cagr3(profile);
  const marketCap = profile.currentMarketPrice * profile.sharesOutstandingCr;
  const netDebt = Math.max(latest.netDebt, 0);
  const ev = marketCap + netDebt - Math.max(-latest.netDebt, 0);
  const ebitdaMgn = latest.revenue > 0 ? (latest.ebitda / latest.revenue) * 100 : 0;
  const equityProxy = Math.max(latest.totalAssets - Math.max(latest.netDebt, 0), 1);
  const roce = latest.investedCapital > 0 ? (latest.ebit / latest.investedCapital) * 100 : 0;
  const roe = equityProxy > 0 ? (latest.pat / equityProxy) * 100 : 0;
  const epsGrowth = previous.eps !== 0 ? ((latest.eps - previous.eps) / Math.abs(previous.eps)) * 100 : profile.assumptions.revenueGrowthY1;
  const interest = Math.max(netDebt * 0.075, 1);
  const currentRatio = Math.min(Math.max(1 + (latest.freeCashFlow / Math.max(latest.revenue, 1)) * 4, 0.5), 4);

  return {
    companyId: profile.id,
    name: profile.name,
    sector: profile.sector,
    ticker: profile.ticker,
    roe: round(roe),
    roce: round(roce),
    ebitda_mgn: round(ebitdaMgn),
    fcf_yield: round(marketCap > 0 ? (latest.freeCashFlow / marketCap) * 100 : 0, 2),
    net_debt_ev: round(ev > 0 ? (netDebt / ev) * 100 : 0, 2),
    pe: round(getRalphPe(profile)),
    pb: round(marketCap / equityProxy),
    ev_ebitda: round(latest.ebitda > 0 ? ev / latest.ebitda : 99),
    div_yield: round(getRalphDividendYield(profile), 2),
    rev_cagr3,
    pat_cagr3,
    eps_est_g: round(epsGrowth),
    pct_52w_hi: getRalphPctFromHigh(profile),
    beta: round(getRalphBeta(profile), 2),
    div_cov: round(latest.dps > 0 ? latest.eps / latest.dps : 3),
    interest_cov: round(Math.min(latest.ebit / interest, 50)),
    current_rat: round(currentRatio, 2),
  };
}

function percentileRank(values: number[], val: number, higherIsBetter: boolean): number {
  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  if (count <= 1) return 50;
  const idx = sorted.findIndex(v => v >= val);
  const pct = idx < 0 ? 100 : (idx / (count - 1)) * 100;
  return Math.round(higherIsBetter ? pct : 100 - pct);
}

export function buildScreenerRows(): ScreenerRow[] {
  const raws = COMPANY_PROFILES.map(extractRawMetrics);
  const factorArrays: Record<string, number[]> = {};
  const factorIds: FactorId[] = FACTOR_CONFIG.map(f => f.id);

  for (const fid of factorIds) {
    factorArrays[fid] = raws.map(r => Number(r[fid as keyof RawScreenerRow]) || 0);
  }

  const scored = raws.map(raw => {
    const categoryScores = { quality: 0, value: 0, growth: 0, momentum: 0, safety: 0 };
    const categoryWeights = { quality: 0, value: 0, growth: 0, momentum: 0, safety: 0 };

    for (const factor of FACTOR_CONFIG) {
      const rawVal = Number(raw[factor.id as keyof RawScreenerRow]) || 0;
      const score = percentileRank(factorArrays[factor.id] ?? [], rawVal, factor.higherIsBetter);
      categoryScores[factor.category] += score * factor.weight;
      categoryWeights[factor.category] += factor.weight;
    }

    const qualityScore = Math.round(categoryScores.quality / categoryWeights.quality);
    const valueScore = Math.round(categoryScores.value / categoryWeights.value);
    const growthScore = Math.round(categoryScores.growth / categoryWeights.growth);
    const momentumScore = Math.round(categoryScores.momentum / categoryWeights.momentum);
    const safetyScore = Math.round(categoryScores.safety / categoryWeights.safety);
    const compositeScore = Math.round(
      qualityScore * COMPOSITE_WEIGHTS.quality +
      valueScore * COMPOSITE_WEIGHTS.value +
      growthScore * COMPOSITE_WEIGHTS.growth +
      momentumScore * COMPOSITE_WEIGHTS.momentum +
      safetyScore * COMPOSITE_WEIGHTS.safety,
    );

    return { ...raw, qualityScore, valueScore, growthScore, momentumScore, safetyScore, compositeScore, rank: 0 };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  scored.forEach((row, index) => {
    row.rank = index + 1;
  });
  return scored;
}
