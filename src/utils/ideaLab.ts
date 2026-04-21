import {
  currentMarketPrice,
  sotpData,
  type ProjectionAssumptions,
  type TaxEvent,
  type YearlyData,
  valuationScenarios,
} from '@/data/itcData';
import {
  calculateCagr,
  calculateDCF,
  generateProjections,
  runScenarioAnalysis,
  type ScenarioAnalysisResult,
} from '@/utils/itcModel';

export interface InvestmentPillar {
  id: string;
  title: string;
  score: number;
  weight: number;
  rationale: string;
}

export interface RiskRegisterItem {
  risk: string;
  probability: 'Low' | 'Medium' | 'High';
  severity: 'Low' | 'Medium' | 'High';
  score: number;
  mitigation: string;
}

export interface CatalystItem {
  period: string;
  catalyst: string;
  impact: 'Positive' | 'Neutral' | 'Negative';
  confidence: number;
}

export interface IdeaLabReport {
  overallScore: number;
  recommendation: 'Accumulate' | 'Hold' | 'Reduce';
  expectedReturnPct: number;
  downsideRiskPct: number;
  pillarScores: InvestmentPillar[];
  riskRegister: RiskRegisterItem[];
  catalystTimeline: CatalystItem[];
  scenario: ScenarioAnalysisResult;
  executionPlan: ExecutionPlanItem[];
}

export interface ExecutionPlanItem {
  id: string;
  title: string;
  owner: 'Risk Agent' | 'Valuation Agent' | 'Growth Agent';
  priority: 'High' | 'Medium' | 'Low';
  action: string;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function probabilityScore(p: RiskRegisterItem['probability']): number {
  if (p === 'Low') return 1;
  if (p === 'Medium') return 2;
  return 3;
}

function severityScore(s: RiskRegisterItem['severity']): number {
  if (s === 'Low') return 1;
  if (s === 'Medium') return 2;
  return 3;
}

export function buildInvestmentPillars(
  latest: YearlyData,
  prior: YearlyData,
  assumptions: ProjectionAssumptions,
): InvestmentPillar[] {
  const revenueGrowth = ((latest.revenue - prior.revenue) / prior.revenue) * 100;
  const profitGrowth = ((latest.netProfit - prior.netProfit) / prior.netProfit) * 100;
  const profitability = clamp(latest.roce / 35, 0, 1) * 100;
  const balanceSheet = clamp((Math.abs(latest.netDebt) / latest.revenue) * 100, 0, 100);
  const execution = clamp((revenueGrowth * 0.35 + profitGrowth * 0.65) + 60, 0, 100);
  const optionality = clamp((assumptions.fmcgMarginTarget - assumptions.fmcgEbitdaMargin) * 6 + 45, 0, 100);
  const riskPenalty = clamp(assumptions.annualNccdHike * 1.8 + assumptions.illicitTradeDrag * 8, 0, 45);

  return [
    {
      id: 'quality',
      title: 'Business Quality',
      score: round(profitability),
      weight: 0.25,
      rationale: `ROCE of ${latest.roce.toFixed(1)}% remains superior for a diversified consumer franchise.`,
    },
    {
      id: 'balance',
      title: 'Balance Sheet Strength',
      score: round(100 - balanceSheet * 0.45),
      weight: 0.15,
      rationale: latest.netDebt < 0
        ? 'Net-cash balance sheet allows downside resilience and payout flexibility.'
        : 'Leverage profile requires tighter capital allocation discipline.',
    },
    {
      id: 'execution',
      title: 'Execution Momentum',
      score: round(execution),
      weight: 0.2,
      rationale: `Latest revenue growth ${revenueGrowth.toFixed(1)}% and PAT growth ${profitGrowth.toFixed(1)}% signal operating traction.`,
    },
    {
      id: 'optionality',
      title: 'Optionality (FMCG + Adjacent)',
      score: round(optionality),
      weight: 0.2,
      rationale: `FMCG margin bridge from ${assumptions.fmcgEbitdaMargin}% to ${assumptions.fmcgMarginTarget}% underwrites re-rating optionality.`,
    },
    {
      id: 'regulatory',
      title: 'Regulatory Drag (Inverse)',
      score: round(100 - riskPenalty),
      weight: 0.2,
      rationale: `Modeled annual NCCD hike ${assumptions.annualNccdHike}% and illicit-trade drag ${assumptions.illicitTradeDrag.toFixed(1)}% cap upside velocity.`,
    },
  ];
}

export function buildRiskRegister(assumptions: ProjectionAssumptions): RiskRegisterItem[] {
  const items: Omit<RiskRegisterItem, 'score'>[] = [
    {
      risk: 'Tax shock steeper than modeled in premium segments',
      probability: assumptions.annualNccdHike >= 18 ? 'High' : assumptions.annualNccdHike >= 10 ? 'Medium' : 'Low',
      severity: 'High',
      mitigation: 'Increase pass-through assumptions gradually and monitor volume elasticity quarterly.',
    },
    {
      risk: 'Illicit trade accelerates in value segment markets',
      probability: assumptions.illicitTradeDrag >= 1 ? 'High' : 'Medium',
      severity: 'Medium',
      mitigation: 'Stress-test cigarette volume growth at -3% to -5% and trim valuation multiple by 1-2x.',
    },
    {
      risk: 'FMCG margin expansion delayed by commodity inflation',
      probability: assumptions.fmcgMarginTarget - assumptions.fmcgEbitdaMargin > 7 ? 'Medium' : 'Low',
      severity: 'Medium',
      mitigation: 'Split forecast into pricing-led and cost-led recoveries; defer full margin normalization by 2 years.',
    },
    {
      risk: 'Conglomerate discount re-widens despite demerger cleanup',
      probability: assumptions.conglomerateDiscount >= 8 ? 'Medium' : 'Low',
      severity: 'Low',
      mitigation: 'Use blended valuation with higher SOTP weight and conservative holding-company discount.',
    },
  ];

  return items.map((item) => {
    const score = probabilityScore(item.probability) * severityScore(item.severity);
    return { ...item, score };
  }).sort((a, b) => b.score - a.score);
}

export function buildCatalystTimeline(taxEvents: TaxEvent[]): CatalystItem[] {
  const recent = taxEvents.slice(-6);
  return recent.map((event) => ({
    period: event.year,
    catalyst: `${event.budgetType}: ${event.taxChange}`,
    impact: event.stockReactionMonth > 2 ? 'Positive' : event.stockReactionMonth < -2 ? 'Negative' : 'Neutral',
    confidence: clamp(55 + Math.abs(event.stockReactionMonth) * 4, 40, 92),
  }));
}

function weightedScore(pillars: InvestmentPillar[]): number {
  return round(pillars.reduce((acc, pillar) => acc + pillar.score * pillar.weight, 0));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildIdeaLabReport(
  assumptions: ProjectionAssumptions,
  historicalData: YearlyData[],
  taxEvents: TaxEvent[],
): IdeaLabReport {
  const latest = historicalData[historicalData.length - 1];
  const prior = historicalData[historicalData.length - 2];
  const projections = generateProjections(assumptions, latest);
  const dcf = calculateDCF(projections, assumptions.wacc, assumptions.terminalGrowth);
  const scenario = runScenarioAnalysis(assumptions, latest, sotpData, valuationScenarios, currentMarketPrice);
  const pillars = buildInvestmentPillars(latest, prior, assumptions);
  const riskRegister = buildRiskRegister(assumptions);
  const catalystTimeline = buildCatalystTimeline(taxEvents);

  const score = weightedScore(pillars);
  const expectedReturnPct = ((scenario.expectedValuePerShare - latest.stockPriceHigh) / latest.stockPriceHigh) * 100;
  const downsideRiskPct = ((scenario.bearPerShare - latest.stockPriceHigh) / latest.stockPriceHigh) * 100;

  const recommendation: IdeaLabReport['recommendation'] =
    score >= 70 && expectedReturnPct >= 10 ? 'Accumulate' :
      score >= 55 && expectedReturnPct >= -5 ? 'Hold' : 'Reduce';

  const scoreNudgeFromDcf = clamp((dcf.perShareValue - scenario.basePerShare) / 25, -6, 6);
  const executionPlan = buildExecutionPlan(score, expectedReturnPct, riskRegister);

  return {
    overallScore: round(score + scoreNudgeFromDcf),
    recommendation,
    expectedReturnPct: round(expectedReturnPct),
    downsideRiskPct: round(downsideRiskPct),
    pillarScores: pillars,
    riskRegister,
    catalystTimeline,
    scenario,
    executionPlan,
  };
}

export function buildExecutionPlan(
  score: number,
  expectedReturnPct: number,
  riskRegister: RiskRegisterItem[],
): ExecutionPlanItem[] {
  const topRisk = riskRegister[0];

  const plan: ExecutionPlanItem[] = [
    {
      id: 'risk-watch',
      title: 'Stress-test top risk',
      owner: 'Risk Agent',
      priority: topRisk?.score >= 6 ? 'High' : 'Medium',
      action: topRisk
        ? `${topRisk.risk} — run monthly stress scenarios and track mitigation completion.`
        : 'Run monthly stress scenarios across tax, demand, and margin assumptions.',
    },
    {
      id: 'valuation-rebase',
      title: 'Rebase fair-value range',
      owner: 'Valuation Agent',
      priority: expectedReturnPct >= 10 ? 'Low' : expectedReturnPct >= -5 ? 'Medium' : 'High',
      action: 'Refresh bear/base/bull fair values each quarter and update position sizing thresholds.',
    },
    {
      id: 'growth-checkpoints',
      title: 'Track operating checkpoints',
      owner: 'Growth Agent',
      priority: score >= 70 ? 'Medium' : 'High',
      action: 'Monitor FMCG margin bridge and cigarette volume trend versus plan; flag 2-quarter slippage.',
    },
  ];

  const rank = { High: 3, Medium: 2, Low: 1 } as const;
  return plan.sort((a, b) => rank[b.priority] - rank[a.priority]);
}

export function summarizeFiveYearCagr(data: YearlyData[]): { revenueCagr: number; profitCagr: number } {
  const n = data.length;
  const start = data[Math.max(0, n - 6)];
  const end = data[n - 1];
  return {
    revenueCagr: round(calculateCagr(start.revenue, end.revenue, 5)),
    profitCagr: round(calculateCagr(start.netProfit, end.netProfit, 5)),
  };
}
