import { getCompany } from '@/data/companies';
import { buildCompanySnapshot } from '@/utils/genericModel';
import { buildScreenerRows, type ScreenerRow } from '@/utils/ralphScreener';

export interface AlphaSignal {
  companyId: string;
  name: string;
  sector: string;
  ticker: string;
  qualityScore: number;
  valueScore: number;
  growthScore: number;
  momentumScore: number;
  safetyScore: number;
  compositeScore: number;
  valueTrapRisk: 'low' | 'medium' | 'high';
  growthAtReasonablePrice: number;
  dividendGrowthScore: number;
  ratingCategory: 'Strong Buy' | 'Buy' | 'Hold' | 'Reduce' | 'Sell';
  alphaBucket: 'Quality Compounder' | 'Value Opportunity' | 'Growth Accelerator' | 'Defensive Income' | 'Cyclical Bet' | 'Speculative';
  primaryStrength: string;
  primaryWeakness: string;
}

function classifyAlphaBucket(row: ScreenerRow): AlphaSignal['alphaBucket'] {
  if (row.qualityScore >= 70 && row.growthScore >= 60) return 'Quality Compounder';
  if (row.valueScore >= 70 && row.safetyScore >= 60) return 'Value Opportunity';
  if (row.growthScore >= 75) return 'Growth Accelerator';
  if (row.div_yield >= 3 && row.safetyScore >= 65) return 'Defensive Income';
  if (row.beta >= 1.2 && row.growthScore >= 55) return 'Cyclical Bet';
  return 'Speculative';
}

function classifyRating(compositeScore: number, upsidePct: number): AlphaSignal['ratingCategory'] {
  const normalizedUpside = Math.min(Math.max(upsidePct + 50, 0), 100);
  const combined = compositeScore * 0.6 + normalizedUpside * 0.4;
  if (combined >= 70) return 'Strong Buy';
  if (combined >= 58) return 'Buy';
  if (combined >= 44) return 'Hold';
  if (combined >= 32) return 'Reduce';
  return 'Sell';
}

function valueTrapRisk(row: ScreenerRow): AlphaSignal['valueTrapRisk'] {
  if (row.valueScore >= 65 && row.qualityScore < 40) return 'high';
  if (row.valueScore >= 55 && row.qualityScore < 55) return 'medium';
  return 'low';
}

function primaryStrength(row: ScreenerRow): string {
  const scores = [
    ['ROE', row.roe],
    ['Revenue CAGR', row.rev_cagr3],
    ['Dividend Yield', row.div_yield * 10],
    ['EBITDA Margin', row.ebitda_mgn],
    ['FCF Yield', row.fcf_yield * 5],
  ] as const;
  return [...scores].sort((a, b) => b[1] - a[1])[0]![0];
}

function primaryWeakness(row: ScreenerRow): string {
  if (row.qualityScore < 35) return 'Weak profitability';
  if (row.growthScore < 35) return 'Below-par growth';
  if (row.safetyScore < 35) return 'Balance sheet risk';
  if (row.momentumScore < 35) return 'Negative momentum';
  if (row.valueScore < 35) return 'Expensive valuation';
  return 'Broadly balanced profile';
}

export function buildAlphaSignals(): AlphaSignal[] {
  return buildScreenerRows().map(row => {
    const profile = getCompany(row.companyId);
    const snapshot = buildCompanySnapshot(profile);
    const upside = ((snapshot.bridge.blendedPerShare - profile.currentMarketPrice) / profile.currentMarketPrice) * 100;
    const peg = row.pe > 0 && row.eps_est_g > 0 ? row.pe / row.eps_est_g : 99;

    return {
      companyId: row.companyId,
      name: row.name,
      sector: row.sector,
      ticker: row.ticker,
      qualityScore: row.qualityScore,
      valueScore: row.valueScore,
      growthScore: row.growthScore,
      momentumScore: row.momentumScore,
      safetyScore: row.safetyScore,
      compositeScore: row.compositeScore,
      valueTrapRisk: valueTrapRisk(row),
      growthAtReasonablePrice: Math.round((100 / Math.max(peg, 0.5)) * 10) / 10,
      dividendGrowthScore: Math.min(Math.round(row.div_yield * row.div_cov * 5), 100),
      ratingCategory: classifyRating(row.compositeScore, upside),
      alphaBucket: classifyAlphaBucket(row),
      primaryStrength: primaryStrength(row),
      primaryWeakness: primaryWeakness(row),
    };
  });
}
