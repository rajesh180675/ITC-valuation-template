import { getCompany, getCompanyOrNull } from '@/data/companies';
import { MACRO_SENSITIVITIES, type MacroFactor } from '@/data/ralphData';
import { buildCompanySnapshot } from '@/utils/genericModel';
import { buildScreenerRows, getRalphBeta, getRalphDividendYield, getRalphPe } from '@/utils/ralphScreener';

export interface PortfolioHolding {
  companyId: string;
  allocationPct: number;
}

export interface PortfolioMetrics {
  totalWeightedPE: number;
  totalWeightedROE: number;
  totalWeightedDivYield: number;
  totalWeightedEbitdaMargin: number;
  totalWeightedRevCagr3: number;
  totalWeightedBeta: number;
  blendedFairValueUpside: number;
  portfolioQualityScore: number;
  portfolioValueScore: number;
  portfolioGrowthScore: number;
  sectorConcentration: Record<string, number>;
  topHolding: string;
  topHoldingWeight: number;
  diversificationScore: number;
}

export interface PortfolioMacroImpact {
  factorId: string;
  factorLabel: string;
  unit: string;
  shockSize: number;
  portfolioEpsImpactPct: number;
  mostSensitiveCompany: string;
  leastSensitiveCompany: string;
}

function round(n: number, p = 1): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

function revCagr3(companyId: string): number {
  const profile = getCompanyOrNull(companyId);
  if (!profile) return 0;
  const h = profile.historical;
  if (h.length < 4) return 0;
  return (Math.pow(h.at(-1)!.revenue / h.at(-4)!.revenue, 1 / 3) - 1) * 100;
}

/**
 * Normalize holdings to sum to 1 while silently dropping any entry whose
 * companyId is not present in COMPANY_PROFILES. This keeps the Ralph Lab tab
 * resilient to stale state (e.g. a renamed id) rather than crashing on render.
 */
export function normalizeHoldings(holdings: PortfolioHolding[]) {
  const valid = holdings.filter(h => getCompanyOrNull(h.companyId) !== null);
  const totalWeight = valid.reduce((sum, h) => sum + h.allocationPct, 0);
  return totalWeight > 0 ? valid.map(h => ({ ...h, w: h.allocationPct / totalWeight })) : [];
}

export function calcPortfolioMetrics(holdings: PortfolioHolding[]): PortfolioMetrics {
  const normalized = normalizeHoldings(holdings);
  if (normalized.length === 0) {
    return {
      totalWeightedPE: 0,
      totalWeightedROE: 0,
      totalWeightedDivYield: 0,
      totalWeightedEbitdaMargin: 0,
      totalWeightedRevCagr3: 0,
      totalWeightedBeta: 0,
      blendedFairValueUpside: 0,
      portfolioQualityScore: 0,
      portfolioValueScore: 0,
      portfolioGrowthScore: 0,
      sectorConcentration: {},
      topHolding: '',
      topHoldingWeight: 0,
      diversificationScore: 0,
    };
  }

  const screenerById = new Map(buildScreenerRows().map(row => [row.companyId, row]));
  const sectorConcentration: Record<string, number> = {};
  let weightedPe = 0;
  let weightedRoe = 0;
  let weightedYield = 0;
  let weightedMargin = 0;
  let weightedGrowth = 0;
  let weightedBeta = 0;
  let weightedUpside = 0;
  let weightedQuality = 0;
  let weightedValue = 0;
  let weightedGrowthScore = 0;

  for (const holding of normalized) {
    const profile = getCompany(holding.companyId);
    const latest = profile.historical.at(-1)!;
    const snapshot = buildCompanySnapshot(profile);
    const equityProxy = Math.max(latest.totalAssets - Math.max(latest.netDebt, 0), 1);
    const roe = (latest.pat / equityProxy) * 100;
    const margin = latest.revenue > 0 ? (latest.ebitda / latest.revenue) * 100 : 0;
    const upside = ((snapshot.bridge.blendedPerShare - profile.currentMarketPrice) / profile.currentMarketPrice) * 100;
    const row = screenerById.get(holding.companyId);

    weightedPe += getRalphPe(profile) * holding.w;
    weightedRoe += roe * holding.w;
    weightedYield += getRalphDividendYield(profile) * holding.w;
    weightedMargin += margin * holding.w;
    weightedGrowth += revCagr3(holding.companyId) * holding.w;
    weightedBeta += getRalphBeta(profile) * holding.w;
    weightedUpside += upside * holding.w;
    weightedQuality += (row?.qualityScore ?? 50) * holding.w;
    weightedValue += (row?.valueScore ?? 50) * holding.w;
    weightedGrowthScore += (row?.growthScore ?? 50) * holding.w;
    sectorConcentration[profile.sector] = (sectorConcentration[profile.sector] ?? 0) + holding.w * 100;
  }

  const hhi = normalized.reduce((sum, h) => sum + h.w * h.w, 0);
  const n = normalized.length;
  const diversificationScore = n > 1 ? Math.round((1 - (hhi - 1 / n) / (1 - 1 / n)) * 100) : 0;
  const topHolding = normalized.reduce((best, h) => (h.w > best.w ? h : best), normalized[0]!);

  return {
    totalWeightedPE: round(weightedPe),
    totalWeightedROE: round(weightedRoe),
    totalWeightedDivYield: round(weightedYield, 2),
    totalWeightedEbitdaMargin: round(weightedMargin),
    totalWeightedRevCagr3: round(weightedGrowth),
    totalWeightedBeta: round(weightedBeta, 2),
    blendedFairValueUpside: round(weightedUpside),
    portfolioQualityScore: Math.round(weightedQuality),
    portfolioValueScore: Math.round(weightedValue),
    portfolioGrowthScore: Math.round(weightedGrowthScore),
    sectorConcentration,
    topHolding: topHolding.companyId,
    topHoldingWeight: round(topHolding.w * 100),
    diversificationScore,
  };
}

export function calcPortfolioMacroImpact(
  holdings: PortfolioHolding[],
  macroFactors: MacroFactor[],
  shockMultiplier = 1,
): PortfolioMacroImpact[] {
  const normalized = normalizeHoldings(holdings);

  return macroFactors.map(factor => {
    const impacts = normalized.map(holding => {
      const sensitivity = MACRO_SENSITIVITIES.find(s => s.companyId === holding.companyId);
      const beta = sensitivity ? Number(sensitivity[factor.id as keyof typeof sensitivity]) || 0 : 0;
      return { companyId: holding.companyId, impact: beta * shockMultiplier };
    });
    const portfolioImpact = impacts.reduce((sum, impact, index) => sum + impact.impact * (normalized[index]?.w ?? 0), 0);
    const sorted = [...impacts].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    return {
      factorId: factor.id,
      factorLabel: factor.label,
      unit: factor.unit,
      shockSize: shockMultiplier,
      portfolioEpsImpactPct: round(portfolioImpact, 2),
      mostSensitiveCompany: sorted[0] ? getCompany(sorted[0].companyId).name : '',
      leastSensitiveCompany: sorted.at(-1) ? getCompany(sorted.at(-1)!.companyId).name : '',
    };
  });
}
