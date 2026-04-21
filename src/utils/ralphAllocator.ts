import { getCompany } from '@/data/companies';
import { getRalphBeta } from '@/utils/ralphScreener';

export type AllocationMethod = 'equal' | 'risk_parity' | 'min_variance' | 'max_sharpe' | 'quality_tilt';

export interface AllocationResult {
  method: AllocationMethod;
  label: string;
  allocations: Array<{ companyId: string; weight: number }>;
  portfolioVolatility: number;
  portfolioSharpe: number;
  portfolioBeta: number;
  giniCoefficient: number;
  comments: string;
}

const MARKET_VOL = 15;
const RISK_FREE = 7;
const MARKET_RETURN = 13;

function round(n: number, p = 2): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

function betaToVol(beta: number): number {
  return Math.max(beta * MARKET_VOL, 8);
}

function expectedReturn(beta: number): number {
  return RISK_FREE + beta * (MARKET_RETURN - RISK_FREE);
}

function gini(weights: number[]): number {
  const n = weights.length;
  const mean = weights.reduce((sum, w) => sum + w, 0) / Math.max(n, 1);
  if (n === 0 || mean === 0) return 0;
  let sum = 0;
  for (const a of weights) {
    for (const b of weights) sum += Math.abs(a - b);
  }
  return sum / (2 * n * n * mean);
}

export function allocate(companyIds: string[], method: AllocationMethod): AllocationResult {
  const profiles = companyIds.map(id => getCompany(id));
  const n = Math.max(profiles.length, 1);
  let weights: number[];
  let comments: string;

  if (method === 'equal') {
    weights = profiles.map(() => 1 / n);
    comments = 'Equal weight baseline; simple and transparent.';
  } else if (method === 'risk_parity') {
    const invVol = profiles.map(p => 1 / betaToVol(getRalphBeta(p)));
    const sum = invVol.reduce((s, v) => s + v, 0);
    weights = invVol.map(v => v / sum);
    comments = 'Risk parity: lower-volatility stocks receive higher weights.';
  } else if (method === 'min_variance') {
    const invVar = profiles.map(p => 1 / betaToVol(getRalphBeta(p)) ** 2);
    const sum = invVar.reduce((s, v) => s + v, 0);
    weights = invVar.map(v => v / sum);
    comments = 'Minimum variance with diagonal covariance proxy.';
  } else if (method === 'max_sharpe') {
    const scores = profiles.map(p => {
      const beta = getRalphBeta(p);
      return Math.max(expectedReturn(beta) - RISK_FREE, 0) / betaToVol(beta) ** 2;
    });
    const sum = scores.reduce((s, v) => s + v, 0);
    weights = sum > 0 ? scores.map(v => v / sum) : profiles.map(() => 1 / n);
    comments = 'Max Sharpe using CAPM expected return and diagonal variance.';
  } else {
    const roes = profiles.map(p => {
      const latest = p.historical.at(-1)!;
      const equityProxy = Math.max(latest.totalAssets - Math.max(latest.netDebt, 0), 1);
      return Math.max((latest.pat / equityProxy) * 100, 5);
    });
    const sum = roes.reduce((s, v) => s + v, 0);
    weights = roes.map(v => v / sum);
    comments = 'Quality tilt: weights proportional to return on equity proxy.';
  }

  const betas = profiles.map(getRalphBeta);
  const portfolioBeta = weights.reduce((sum, w, i) => sum + w * (betas[i] ?? 1), 0);
  const portfolioVolatility = Math.sqrt(weights.reduce((sum, w, i) => sum + w ** 2 * betaToVol(betas[i] ?? 1) ** 2, 0));
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturn(betas[i] ?? 1), 0);
  const portfolioSharpe = portfolioVolatility > 0 ? (portfolioReturn - RISK_FREE) / portfolioVolatility : 0;
  const labels: Record<AllocationMethod, string> = {
    equal: 'Equal Weight',
    risk_parity: 'Risk Parity',
    min_variance: 'Min Variance',
    max_sharpe: 'Max Sharpe',
    quality_tilt: 'Quality Tilt',
  };

  return {
    method,
    label: labels[method],
    allocations: profiles.map((p, i) => ({ companyId: p.id, weight: round(weights[i] ?? 0, 4) })),
    portfolioVolatility: round(portfolioVolatility, 1),
    portfolioSharpe: round(portfolioSharpe, 2),
    portfolioBeta: round(portfolioBeta, 2),
    giniCoefficient: round(gini(weights), 3),
    comments,
  };
}

export function compareAllocations(companyIds: string[]): AllocationResult[] {
  const methods: AllocationMethod[] = ['equal', 'risk_parity', 'min_variance', 'max_sharpe', 'quality_tilt'];
  return methods.map(method => allocate(companyIds, method));
}
