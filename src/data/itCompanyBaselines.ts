// ─────────────────────────────────────────────────────────────────────────────
// Indian IT Services — Refreshed Fundamentals (FY25 actuals + 9M FY26 + Q3 FY26)
// As of: April 2026. Sources: company quarterly disclosures (Jan 2026 results),
// integrated annual reports FY25, NASSCOM strategic review, exchange filings.
// All currency: INR Cr unless noted. Per-share: INR.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CompanyBaseline,
  ThreeStageDCFParams,
  DDMParams,
  MonteCarloInputs,
  ScenarioCase,
  AIOverlayInputs,
} from '@/valuation/itEngine';

export interface ITCompanyData {
  ticker: string;
  name: string;
  longName: string;
  segment: 'Tier-1' | 'Mid-cap';
  asOf: string;
  baseline: CompanyBaseline;
  /** Default 3-stage DCF parameters for this company */
  defaultDCF: ThreeStageDCFParams;
  /** Default DDM parameters */
  defaultDDM: DDMParams;
  /** Default Monte Carlo distribution */
  defaultMC: MonteCarloInputs;
  /** Default AI overlay assumptions */
  defaultAI: AIOverlayInputs;
  /** Pre-defined Bull/Base/Bear/Stress/Black-Swan scenarios */
  scenarios: ScenarioCase[];
  /** FY25 full-year actuals */
  fy25: {
    revenue: number; revenueUSD: number; ebit: number; ebitMargin: number;
    pat: number; patMargin: number; eps: number; dps: number;
    fcf: number; fcfYield: number; roce: number; roe: number;
    headcount: number; attrition: number; utilization: number;
  };
  /** Q3 FY26 (latest quarter, reported Jan 2026) */
  q3fy26: {
    revenue: number; revenueUSD: number; revenueGrowthQoQCC: number; revenueGrowthYoYCC: number;
    ebit: number; ebitMargin: number; pat: number; eps: number;
    tcv: number; bookToBill: number; deals50m: number;
    headcount: number; attrition: number;
    largeDealWins: string;
  };
  /** 9M FY26 cumulative */
  fy26ytd: { revenue: number; ebit: number; ebitMargin: number; pat: number };
  /** FY26E annualized */
  fy26e: { revenue: number; revenueGrowthCC: number; ebitMargin: number; pat: number; eps: number; dps: number };
  /** Multi-year history (FY20-FY25) */
  history: { year: string; revenue: number; ebitMargin: number; pat: number; eps: number; roce: number }[];
  /** Geographic revenue split (%) */
  geo: { name: string; share: number }[];
  /** Vertical revenue split (%) */
  vertical: { name: string; share: number }[];
  /** Service-line split (%) */
  service: { name: string; share: number }[];
  /** AI / Gen-AI traction */
  aiMetrics: { aiBookingsUSDb: number; aiAnnualizedUSDb: number; piloted: number; productionized: number };
  /** Capital allocation FY25 */
  capitalAllocation: { dividends: number; buybacks: number; capex: number; acquisitions: number; payoutRatio: number };
  /** Investment thesis bullets */
  bullThesis: string[];
  bearThesis: string[];
  /** Key risks */
  keyRisks: string[];
  /** Quality scorecard (0-10 each) */
  scorecard: { governance: number; growth: number; profitability: number; capitalAllocation: number; moat: number; aiReadiness: number };
}

const STANDARD_SCENARIOS = (g1Bull: number, g1Base: number, g1Bear: number, mTBull: number, mTBase: number, mTBear: number, waccBase: number, exit: number): ScenarioCase[] => [
  {
    name: 'Bull',
    probability: 20,
    g1: g1Bull,
    gT: 4.5,
    marginTerminal: mTBull,
    wacc: waccBase - 0.5,
    exitMultiple: exit + 4,
    narrative: 'AI productivity stack scales; vendor consolidation drives share gains; pricing holds; deflationary cost-savings deals dominate; margins expand to multi-year highs.',
  },
  {
    name: 'Base',
    probability: 45,
    g1: g1Base,
    gT: 4.0,
    marginTerminal: mTBase,
    wacc: waccBase,
    exitMultiple: exit,
    narrative: 'Recovery in BFSI/Retail; AI services scale to ~15% of revenue; mild margin pressure offset by automation; steady capital returns.',
  },
  {
    name: 'Bear',
    probability: 20,
    g1: g1Bear,
    gT: 3.0,
    marginTerminal: mTBear,
    wacc: waccBase + 0.7,
    exitMultiple: exit - 4,
    narrative: 'Discretionary spend stays muted; AI repricing accelerates; pricing pressure compounds; vendors absorb productivity gains; multiple compression of 200–300 bps.',
  },
  {
    name: 'Stress',
    probability: 10,
    g1: g1Bear - 2.5,
    gT: 2.5,
    marginTerminal: mTBear - 1.5,
    wacc: waccBase + 1.5,
    exitMultiple: exit - 7,
    narrative: 'US recession; tech-services demand contracts; large-deal closures slip 6+ months; layoffs across industry; margin trough below 2009 levels.',
  },
  {
    name: 'Black Swan',
    probability: 5,
    g1: -3.0,
    gT: 1.5,
    marginTerminal: mTBear - 4,
    wacc: waccBase + 2.5,
    exitMultiple: exit - 10,
    narrative: 'AGI-class disruption obsoletes traditional services; major H-1B reform; geopolitical shock to global outsourcing; structural de-rating.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. TCS (Tata Consultancy Services) — Tier-1 anchor
// ─────────────────────────────────────────────────────────────────────────────
const TCS: ITCompanyData = {
  ticker: 'TCS',
  name: 'TCS',
  longName: 'Tata Consultancy Services Ltd.',
  segment: 'Tier-1',
  asOf: 'April 2026',
  baseline: {
    ticker: 'TCS', name: 'TCS',
    cmp: 2582, shares: 361.78, netCash: 36000,
    baseRevenue: 263000, // FY26E annualized from 9M
    baseEBITMargin: 25.0,
    taxRate: 25.5, daPctRevenue: 1.6, capexPctRevenue: 1.4, wcPctIncRevenue: 12,
    trailingEPS: 138.5, trailingDPS: 78, buybackYield: 0.4, sustainableROE: 49,
  },
  defaultDCF: { g1: 6.5, n1: 5, g2: 5.5, n2: 5, gT: 4.0, marginEnd: 25.5, marginTerminal: 25.0, wacc: 11.5 },
  defaultDDM: { ke: 11.5, g1: 9, n1: 5, g2: 7, n2: 5, gT: 4, buybackYield: 0.4 },
  defaultMC: {
    g1: { low: 4, mode: 6.5, high: 9 },
    marginEnd: { low: 23, mode: 25.5, high: 27 },
    marginTerminal: { low: 22, mode: 25, high: 26.5 },
    wacc: { low: 10.5, mode: 11.5, high: 12.5 },
    gT: { low: 3, mode: 4, high: 5 },
    fixed: { n1: 5, n2: 5, g2: 5.5 },
    trials: 2000, seed: 42,
  },
  defaultAI: { productivityUplift: -3, passThrough: 60, crossoverYear: 3, aiServicesGrowth: 35, aiSharePct: 8, marginUpliftBps: 80 },
  scenarios: STANDARD_SCENARIOS(9, 6.5, 4, 26.5, 25.0, 22, 11.5, 23),
  fy25: { revenue: 255324, revenueUSD: 30179, ebit: 61828, ebitMargin: 24.2, pat: 48553, patMargin: 19.0, eps: 134.21, dps: 73, fcf: 41000, fcfYield: 4.5, roce: 64.6, roe: 51.5, headcount: 607979, attrition: 13.3, utilization: 86.7 },
  q3fy26: { revenue: 67087, revenueUSD: 7950, revenueGrowthQoQCC: 0.8, revenueGrowthYoYCC: 4.9, ebit: 16942, ebitMargin: 25.3, pat: 12950, eps: 35.8, tcv: 9.3, bookToBill: 1.16, deals50m: 28, headcount: 614795, attrition: 13.0, largeDealWins: 'BSNL extension, BFSI cloud transformation, GenAI Studio rollout' },
  fy26ytd: { revenue: 196500, ebit: 49600, ebitMargin: 25.2, pat: 38000 },
  fy26e: { revenue: 263000, revenueGrowthCC: 5.5, ebitMargin: 25.0, pat: 50100, eps: 138.5, dps: 78 },
  history: [
    { year: 'FY20', revenue: 156949, ebitMargin: 25.1, pat: 32340, eps: 86.2, roce: 58.6 },
    { year: 'FY21', revenue: 164177, ebitMargin: 25.9, pat: 32430, eps: 86.7, roce: 53.5 },
    { year: 'FY22', revenue: 191754, ebitMargin: 25.3, pat: 38449, eps: 103.6, roce: 56.8 },
    { year: 'FY23', revenue: 225458, ebitMargin: 24.1, pat: 42147, eps: 115.1, roce: 60.0 },
    { year: 'FY24', revenue: 240893, ebitMargin: 24.6, pat: 45908, eps: 126.9, roce: 64.3 },
    { year: 'FY25', revenue: 255324, ebitMargin: 24.2, pat: 48553, eps: 134.2, roce: 64.6 },
  ],
  geo: [
    { name: 'North America', share: 50.6 }, { name: 'UK', share: 16.2 }, { name: 'Continental Europe', share: 15.8 },
    { name: 'India', share: 7.2 }, { name: 'Asia-Pacific', share: 6.3 }, { name: 'MEA + LatAm', share: 3.9 },
  ],
  vertical: [
    { name: 'BFSI', share: 30.7 }, { name: 'Retail/CPG', share: 14.9 }, { name: 'Comms/Media', share: 13.5 },
    { name: 'Mfg', share: 11.0 }, { name: 'Tech & Services', share: 9.8 }, { name: 'Life Sciences', share: 11.2 },
    { name: 'Energy/Utilities', share: 8.9 },
  ],
  service: [
    { name: 'Cloud / Cloud Apps', share: 35 }, { name: 'Cognitive Business Ops', share: 22 },
    { name: 'Engineering Services', share: 12 }, { name: 'AI & Data', share: 14 },
    { name: 'IoT/Cybersec', share: 9 }, { name: 'Products & Platforms', share: 8 },
  ],
  aiMetrics: { aiBookingsUSDb: 1.2, aiAnnualizedUSDb: 1.8, piloted: 660, productionized: 270 },
  capitalAllocation: { dividends: 26450, buybacks: 17000, capex: 4200, acquisitions: 0, payoutRatio: 89 },
  bullThesis: [
    'Largest BSNL deal (₹15,000+ cr) provides multi-year revenue visibility',
    'GenAI Studio + BFSI vendor consolidation tailwinds compounding',
    'Highest-margin tier-1 with structurally superior offshore mix (75%+)',
    '95% payout ratio + buybacks = double-digit return-of-capital yield',
    'Tata Group ecosystem lock-in (Tata.com, Air India, Tata Steel digital)',
  ],
  bearThesis: [
    'Already 25%+ EBIT margin — limited room for further expansion',
    'BFSI/Retail discretionary sluggish; growth stuck at mid-single-digit',
    'AI repricing risk highest at the top of the value chain',
    'Premium valuation (~26x FY27E EPS) leaves little error budget',
  ],
  keyRisks: ['BSNL ramp-down post-FY27', 'US recession compressing BFSI spend', 'Visa/H-1B reform under new US admin', 'Founding leadership transition'],
  scorecard: { governance: 9.5, growth: 7.5, profitability: 9.5, capitalAllocation: 9.5, moat: 9.0, aiReadiness: 9.0 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Infosys
// ─────────────────────────────────────────────────────────────────────────────
const INFY: ITCompanyData = {
  ticker: 'INFY',
  name: 'Infosys',
  longName: 'Infosys Ltd.',
  segment: 'Tier-1',
  asOf: 'April 2026',
  baseline: {
    ticker: 'INFY', name: 'Infosys',
    cmp: 1465, shares: 415.0, netCash: 31000,
    baseRevenue: 172500,
    baseEBITMargin: 21.2,
    taxRate: 28.5, daPctRevenue: 1.9, capexPctRevenue: 1.6, wcPctIncRevenue: 11,
    trailingEPS: 67.8, trailingDPS: 46, buybackYield: 1.5, sustainableROE: 32,
  },
  defaultDCF: { g1: 5.5, n1: 5, g2: 5.0, n2: 5, gT: 4.0, marginEnd: 22.0, marginTerminal: 22.5, wacc: 11.8 },
  defaultDDM: { ke: 11.8, g1: 8, n1: 5, g2: 6, n2: 5, gT: 4, buybackYield: 1.5 },
  defaultMC: {
    g1: { low: 3, mode: 5.5, high: 8 },
    marginEnd: { low: 19, mode: 22, high: 23.5 },
    marginTerminal: { low: 19, mode: 22, high: 24 },
    wacc: { low: 10.8, mode: 11.8, high: 12.8 },
    gT: { low: 3, mode: 4, high: 5 },
    fixed: { n1: 5, n2: 5, g2: 5 },
    trials: 2000, seed: 43,
  },
  defaultAI: { productivityUplift: -4, passThrough: 65, crossoverYear: 3, aiServicesGrowth: 40, aiSharePct: 11, marginUpliftBps: 100 },
  scenarios: STANDARD_SCENARIOS(8, 5.5, 3, 24, 22.5, 19.5, 11.8, 22),
  fy25: { revenue: 162990, revenueUSD: 19277, ebit: 34391, ebitMargin: 21.1, pat: 26713, patMargin: 16.4, eps: 64.5, dps: 43, fcf: 28100, fcfYield: 4.6, roce: 38.1, roe: 30.9, headcount: 323578, attrition: 14.1, utilization: 85.2 },
  q3fy26: { revenue: 44490, revenueUSD: 5275, revenueGrowthQoQCC: 0.6, revenueGrowthYoYCC: 4.0, ebit: 9388, ebitMargin: 21.1, pat: 7230, eps: 17.4, tcv: 4.8, bookToBill: 1.30, deals50m: 18, headcount: 325900, attrition: 13.7, largeDealWins: 'Mega-deal in financial services + healthcare AI transformation' },
  fy26ytd: { revenue: 132500, ebit: 27840, ebitMargin: 21.0, pat: 21500 },
  fy26e: { revenue: 172500, revenueGrowthCC: 3.3, ebitMargin: 21.0, pat: 27800, eps: 67.8, dps: 46 },
  history: [
    { year: 'FY20', revenue: 90791, ebitMargin: 21.3, pat: 16639, eps: 39.1, roce: 30.1 },
    { year: 'FY21', revenue: 100472, ebitMargin: 24.5, pat: 19351, eps: 45.6, roce: 32.6 },
    { year: 'FY22', revenue: 121641, ebitMargin: 23.0, pat: 22146, eps: 52.5, roce: 32.4 },
    { year: 'FY23', revenue: 146767, ebitMargin: 21.0, pat: 24108, eps: 57.6, roce: 36.3 },
    { year: 'FY24', revenue: 153670, ebitMargin: 20.7, pat: 26233, eps: 63.4, roce: 35.3 },
    { year: 'FY25', revenue: 162990, ebitMargin: 21.1, pat: 26713, eps: 64.5, roce: 38.1 },
  ],
  geo: [
    { name: 'North America', share: 60.8 }, { name: 'Europe', share: 26.3 }, { name: 'India', share: 3.0 },
    { name: 'Rest of World', share: 9.9 },
  ],
  vertical: [
    { name: 'Financial Services', share: 27.3 }, { name: 'Retail', share: 14.0 }, { name: 'Comms', share: 12.0 },
    { name: 'Energy/Utilities', share: 13.5 }, { name: 'Mfg', share: 16.6 }, { name: 'Hi-Tech', share: 8.9 },
    { name: 'Life Sciences', share: 7.7 },
  ],
  service: [
    { name: 'Digital / AI / Cloud', share: 64 }, { name: 'Maintenance & Support', share: 14 },
    { name: 'Package Implementation', share: 9 }, { name: 'Engineering', share: 8 }, { name: 'Other', share: 5 },
  ],
  aiMetrics: { aiBookingsUSDb: 0.8, aiAnnualizedUSDb: 1.2, piloted: 400, productionized: 220 },
  capitalAllocation: { dividends: 17850, buybacks: 9300, capex: 3100, acquisitions: 1900, payoutRatio: 102 },
  bullThesis: [
    'Topaz GenAI platform sees strong adoption with $4.8B large-deal TCV in Q3 FY26',
    'Highest digital-revenue mix among tier-1s (~64%) — better positioned for AI shift',
    'New CEO Salil Parekh has settled execution after Murthy-era turbulence',
    'European + healthcare AI mega-deals signal broadening pipeline',
    'Buyback machine: 7+ buybacks in 8 years; ~13% of outstanding retired',
  ],
  bearThesis: [
    'FY26 CC growth guidance cut to 3.0–3.5% from 4–5%; demand fragility',
    'BFSI clients delaying decision-making; Citi-style spending pause widening',
    'Founder dilution risk if Murthy/Nilekani trust further reduce stakes',
    'Premium-to-TCS valuation creates re-rating risk if margins miss',
  ],
  keyRisks: ['Mega-deal integration execution', 'Continued attrition in mid-band roles', 'European recession', 'AI-led repricing in maintenance'],
  scorecard: { governance: 8.5, growth: 7.0, profitability: 8.5, capitalAllocation: 9.0, moat: 8.5, aiReadiness: 9.5 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. HCL Tech
// ─────────────────────────────────────────────────────────────────────────────
const HCL: ITCompanyData = {
  ticker: 'HCLTECH',
  name: 'HCL Tech',
  longName: 'HCL Technologies Ltd.',
  segment: 'Tier-1',
  asOf: 'April 2026',
  baseline: {
    ticker: 'HCLTECH', name: 'HCL Tech',
    cmp: 1485, shares: 271.34, netCash: 18500,
    baseRevenue: 124800,
    baseEBITMargin: 18.6,
    taxRate: 24.5, daPctRevenue: 3.2, capexPctRevenue: 1.8, wcPctIncRevenue: 9,
    trailingEPS: 65.2, trailingDPS: 60, buybackYield: 0.0, sustainableROE: 27,
  },
  defaultDCF: { g1: 6.0, n1: 5, g2: 5.0, n2: 5, gT: 4.0, marginEnd: 19.0, marginTerminal: 19.5, wacc: 12.0 },
  defaultDDM: { ke: 12.0, g1: 10, n1: 5, g2: 7, n2: 5, gT: 4, buybackYield: 0.3 },
  defaultMC: {
    g1: { low: 3.5, mode: 6, high: 9 },
    marginEnd: { low: 17, mode: 19, high: 21 },
    marginTerminal: { low: 17, mode: 19.5, high: 21 },
    wacc: { low: 11, mode: 12, high: 13 },
    gT: { low: 3, mode: 4, high: 5 },
    fixed: { n1: 5, n2: 5, g2: 5 },
    trials: 2000, seed: 44,
  },
  defaultAI: { productivityUplift: -3.5, passThrough: 55, crossoverYear: 3, aiServicesGrowth: 30, aiSharePct: 7, marginUpliftBps: 70 },
  scenarios: STANDARD_SCENARIOS(8.5, 6, 3, 21, 19.5, 17, 12, 21),
  fy25: { revenue: 117055, revenueUSD: 13840, ebit: 21744, ebitMargin: 18.6, pat: 17390, patMargin: 14.9, eps: 64.1, dps: 60, fcf: 18800, fcfYield: 4.7, roce: 28.6, roe: 25.3, headcount: 220755, attrition: 12.2, utilization: 85.5 },
  q3fy26: { revenue: 31960, revenueUSD: 3796, revenueGrowthQoQCC: 4.2, revenueGrowthYoYCC: 4.8, ebit: 6184, ebitMargin: 19.4, pat: 4810, eps: 17.7, tcv: 3.0, bookToBill: 1.18, deals50m: 24, headcount: 222800, attrition: 12.0, largeDealWins: 'GenAI engineering services + 28% QoQ jump in HCL Software (license seasonality)' },
  fy26ytd: { revenue: 95800, ebit: 18020, ebitMargin: 18.8, pat: 14150 },
  fy26e: { revenue: 124800, revenueGrowthCC: 4.8, ebitMargin: 18.6, pat: 18200, eps: 67.2, dps: 64 },
  history: [
    { year: 'FY20', revenue: 70676, ebitMargin: 17.8, pat: 11062, eps: 40.8, roce: 24.2 },
    { year: 'FY21', revenue: 75379, ebitMargin: 18.5, pat: 11145, eps: 41.1, roce: 22.1 },
    { year: 'FY22', revenue: 85651, ebitMargin: 18.0, pat: 13499, eps: 49.7, roce: 23.8 },
    { year: 'FY23', revenue: 101456, ebitMargin: 18.2, pat: 14845, eps: 54.7, roce: 25.0 },
    { year: 'FY24', revenue: 109913, ebitMargin: 18.2, pat: 15710, eps: 57.9, roce: 27.0 },
    { year: 'FY25', revenue: 117055, ebitMargin: 18.6, pat: 17390, eps: 64.1, roce: 28.6 },
  ],
  geo: [
    { name: 'Americas', share: 51.6 }, { name: 'Europe', share: 27.7 }, { name: 'Rest of World', share: 20.7 },
  ],
  vertical: [
    { name: 'Financial Services', share: 21.4 }, { name: 'Mfg', share: 17.5 }, { name: 'Tech/Services', share: 16.1 },
    { name: 'Telecom/Media', share: 12.5 }, { name: 'Retail/CPG', share: 9.8 }, { name: 'Life Sciences', share: 12.4 },
    { name: 'Public Sector', share: 10.3 },
  ],
  service: [
    { name: 'IT & Business Services', share: 71 }, { name: 'Engineering & R&D', share: 16 },
    { name: 'HCL Software (Products)', share: 13 },
  ],
  aiMetrics: { aiBookingsUSDb: 1.0, aiAnnualizedUSDb: 1.4, piloted: 380, productionized: 195 },
  capitalAllocation: { dividends: 16280, buybacks: 4000, capex: 2105, acquisitions: 0, payoutRatio: 95 },
  bullThesis: [
    'Annualized revenue crossed $15B; bookings exceptionally high at $3B in Q3 FY26',
    'Engineering & R&D services moat (Mode 2) — sticky, less commoditized than apps',
    'HCL Software IP yields recurring license revenue + cyclical Q3 surge (28% QoQ)',
    'Best-in-class margin in mid-tier engineering deals; underrated GenAI traction',
    'Diversified vertical mix; lower BFSI concentration risk than peers',
  ],
  bearThesis: [
    'Software/products business volatile and deflating',
    'Mode 1 (legacy IT) still 70%+ of revenue — exposed to AI repricing',
    'Lower digital-revenue mix vs Infy / Wipro digital pure-play',
    'Promoter (Roshni Nadar) selling activity creates overhang',
  ],
  keyRisks: ['Software business margin volatility', 'Mode 2/3 ramp-up timing', 'European demand', 'Engineering services pricing'],
  scorecard: { governance: 8.0, growth: 8.0, profitability: 8.0, capitalAllocation: 8.5, moat: 7.5, aiReadiness: 8.0 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Wipro
// ─────────────────────────────────────────────────────────────────────────────
const WIPRO: ITCompanyData = {
  ticker: 'WIPRO',
  name: 'Wipro',
  longName: 'Wipro Ltd.',
  segment: 'Tier-1',
  asOf: 'April 2026',
  baseline: {
    ticker: 'WIPRO', name: 'Wipro',
    cmp: 252, shares: 1046.62, netCash: 21000,
    baseRevenue: 92500,
    baseEBITMargin: 17.2,
    taxRate: 24.0, daPctRevenue: 2.5, capexPctRevenue: 1.5, wcPctIncRevenue: 10,
    trailingEPS: 12.6, trailingDPS: 6, buybackYield: 1.2, sustainableROE: 18,
  },
  defaultDCF: { g1: 4.0, n1: 5, g2: 4.5, n2: 5, gT: 3.5, marginEnd: 17.5, marginTerminal: 18.0, wacc: 12.5 },
  defaultDDM: { ke: 12.5, g1: 6, n1: 5, g2: 5, n2: 5, gT: 3.5, buybackYield: 1.2 },
  defaultMC: {
    g1: { low: 1, mode: 4, high: 7 },
    marginEnd: { low: 14, mode: 17.5, high: 19.5 },
    marginTerminal: { low: 15, mode: 18, high: 20 },
    wacc: { low: 11.5, mode: 12.5, high: 13.5 },
    gT: { low: 2.5, mode: 3.5, high: 4.5 },
    fixed: { n1: 5, n2: 5, g2: 4.5 },
    trials: 2000, seed: 45,
  },
  defaultAI: { productivityUplift: -3, passThrough: 50, crossoverYear: 3, aiServicesGrowth: 25, aiSharePct: 6, marginUpliftBps: 50 },
  scenarios: STANDARD_SCENARIOS(7, 4, 0.5, 19.5, 18, 15.5, 12.5, 18),
  fy25: { revenue: 89089, revenueUSD: 10523, ebit: 14612, ebitMargin: 16.4, pat: 13135, patMargin: 14.7, eps: 12.55, dps: 6, fcf: 17200, fcfYield: 6.5, roce: 15.8, roe: 16.1, headcount: 233346, attrition: 15.0, utilization: 84.6 },
  q3fy26: { revenue: 22335, revenueUSD: 2640, revenueGrowthQoQCC: 1.2, revenueGrowthYoYCC: 0.2, ebit: 3905, ebitMargin: 17.5, pat: 3450, eps: 3.30, tcv: 2.4, bookToBill: 1.05, deals50m: 12, headcount: 232800, attrition: 14.6, largeDealWins: 'Multi-year banking deal in Europe; Gen-AI consolidation deal in CPG; multi-year-high margins on Pallia turnaround' },
  fy26ytd: { revenue: 67800, ebit: 11780, ebitMargin: 17.4, pat: 10100 },
  fy26e: { revenue: 92500, revenueGrowthCC: 1.0, ebitMargin: 17.2, pat: 13500, eps: 12.9, dps: 7 },
  history: [
    { year: 'FY20', revenue: 61023, ebitMargin: 17.5, pat: 9772, eps: 1.71, roce: 17.4 },
    { year: 'FY21', revenue: 62425, ebitMargin: 19.3, pat: 10796, eps: 1.97, roce: 19.6 },
    { year: 'FY22', revenue: 79093, ebitMargin: 17.2, pat: 12231, eps: 2.23, roce: 16.5 },
    { year: 'FY23', revenue: 90488, ebitMargin: 16.0, pat: 11350, eps: 20.7, roce: 14.0 },
    { year: 'FY24', revenue: 89760, ebitMargin: 16.0, pat: 11045, eps: 21.1, roce: 13.8 },
    { year: 'FY25', revenue: 89089, ebitMargin: 16.4, pat: 13135, eps: 12.55, roce: 15.8 },
  ],
  geo: [
    { name: 'Americas 1', share: 31.5 }, { name: 'Americas 2', share: 28.7 }, { name: 'Europe', share: 28.6 },
    { name: 'APMEA', share: 11.2 },
  ],
  vertical: [
    { name: 'BFSI', share: 35.4 }, { name: 'Consumer', share: 21.5 }, { name: 'Health', share: 14.2 },
    { name: 'Tech & Comms', share: 14.6 }, { name: 'Energy/Utilities/Mfg', share: 14.3 },
  ],
  service: [
    { name: 'IT Services', share: 91 }, { name: 'IT Products', share: 5 }, { name: 'India SRE', share: 4 },
  ],
  aiMetrics: { aiBookingsUSDb: 0.6, aiAnnualizedUSDb: 0.7, piloted: 220, productionized: 95 },
  capitalAllocation: { dividends: 6280, buybacks: 12000, capex: 1340, acquisitions: 0, payoutRatio: 140 },
  bullThesis: [
    'Pallia turnaround visibly working — margins at multi-year high in Q3 FY26',
    'Aggressive buyback machine — ₹12,000+ cr returned in FY25',
    'Trade at deepest valuation discount to Tier-1 peers (P/E 19x vs TCS 27x)',
    'Capco / cybersecurity strategic bets give differentiated consulting muscle',
    'Heavy promoter ownership (Premji Trust) aligns long-term interests',
  ],
  bearThesis: [
    'Decade of underperformance vs peers — execution credibility weak',
    'Revenue stagnation: +0.2% YoY CC in Q3 FY26 even after restructuring',
    '6 CEO changes in 12 years; institutional knowledge degraded',
    'Highest BFSI concentration (35%) — exposed to discretionary cuts',
  ],
  keyRisks: ['Pallia execution', 'BFSI client losses', 'Capco amortization drag', 'Talent retention post-restructuring'],
  scorecard: { governance: 7.0, growth: 5.5, profitability: 7.0, capitalAllocation: 8.0, moat: 6.5, aiReadiness: 6.5 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. LTIMindtree
// ─────────────────────────────────────────────────────────────────────────────
const LTIM: ITCompanyData = {
  ticker: 'LTIM',
  name: 'LTIMindtree',
  longName: 'LTIMindtree Ltd. (post LTI + Mindtree merger)',
  segment: 'Tier-1',
  asOf: 'April 2026',
  baseline: {
    ticker: 'LTIM', name: 'LTIMindtree',
    cmp: 4720, shares: 29.65, netCash: 9500,
    baseRevenue: 41000,
    baseEBITMargin: 15.8,
    taxRate: 26.0, daPctRevenue: 2.0, capexPctRevenue: 1.4, wcPctIncRevenue: 12,
    trailingEPS: 168, trailingDPS: 70, buybackYield: 0.0, sustainableROE: 24,
  },
  defaultDCF: { g1: 8.5, n1: 5, g2: 6.5, n2: 5, gT: 4.0, marginEnd: 17.0, marginTerminal: 18.0, wacc: 12.0 },
  defaultDDM: { ke: 12.0, g1: 12, n1: 5, g2: 8, n2: 5, gT: 4, buybackYield: 0.0 },
  defaultMC: {
    g1: { low: 5, mode: 8.5, high: 12 },
    marginEnd: { low: 14, mode: 17, high: 19 },
    marginTerminal: { low: 15, mode: 18, high: 20 },
    wacc: { low: 11, mode: 12, high: 13 },
    gT: { low: 3, mode: 4, high: 5 },
    fixed: { n1: 5, n2: 5, g2: 6.5 },
    trials: 2000, seed: 46,
  },
  defaultAI: { productivityUplift: -3, passThrough: 55, crossoverYear: 3, aiServicesGrowth: 35, aiSharePct: 9, marginUpliftBps: 100 },
  scenarios: STANDARD_SCENARIOS(12, 8.5, 5, 19.5, 18, 15, 12, 22),
  fy25: { revenue: 38007, revenueUSD: 4490, ebit: 5511, ebitMargin: 14.5, pat: 4602, patMargin: 12.1, eps: 155.4, dps: 65, fcf: 5400, fcfYield: 4.0, roce: 22.5, roe: 21.6, headcount: 84236, attrition: 14.4, utilization: 86.8 },
  q3fy26: { revenue: 10240, revenueUSD: 1208, revenueGrowthQoQCC: 1.5, revenueGrowthYoYCC: 5.5, ebit: 1648, ebitMargin: 16.1, pat: 1320, eps: 44.5, tcv: 1.6, bookToBill: 1.20, deals50m: 8, headcount: 85100, attrition: 14.0, largeDealWins: 'Top-3 deal across BFSI and CPG; AI momentum-driven mega deal' },
  fy26ytd: { revenue: 30450, ebit: 4880, ebitMargin: 16.0, pat: 3950 },
  fy26e: { revenue: 41000, revenueGrowthCC: 6.2, ebitMargin: 16.0, pat: 5300, eps: 178.7, dps: 75 },
  history: [
    { year: 'FY20', revenue: 16466, ebitMargin: 16.5, pat: 1550, eps: 88.1, roce: 25.0 },
    { year: 'FY21', revenue: 17450, ebitMargin: 17.2, pat: 1938, eps: 110.7, roce: 26.5 },
    { year: 'FY22', revenue: 22095, ebitMargin: 16.5, pat: 2569, eps: 88.3, roce: 27.7 },
    { year: 'FY23', revenue: 33183, ebitMargin: 15.8, pat: 4408, eps: 148.8, roce: 26.9 },
    { year: 'FY24', revenue: 35517, ebitMargin: 14.4, pat: 4585, eps: 154.9, roce: 23.0 },
    { year: 'FY25', revenue: 38007, ebitMargin: 14.5, pat: 4602, eps: 155.4, roce: 22.5 },
  ],
  geo: [
    { name: 'North America', share: 76.3 }, { name: 'Europe', share: 14.7 }, { name: 'India', share: 4.9 },
    { name: 'Rest of World', share: 4.1 },
  ],
  vertical: [
    { name: 'BFSI', share: 36.2 }, { name: 'Tech/Media/Commns', share: 23.1 }, { name: 'Mfg/Resources', share: 14.5 },
    { name: 'Retail/CPG/T&H', share: 13.7 }, { name: 'Healthcare/LS', share: 12.5 },
  ],
  service: [
    { name: 'Cloud Engineering', share: 31 }, { name: 'Data & AI', share: 22 },
    { name: 'Digital Engineering', share: 19 }, { name: 'Enterprise Apps', share: 15 }, { name: 'Other', share: 13 },
  ],
  aiMetrics: { aiBookingsUSDb: 0.4, aiAnnualizedUSDb: 0.5, piloted: 180, productionized: 90 },
  capitalAllocation: { dividends: 1925, buybacks: 0, capex: 540, acquisitions: 250, payoutRatio: 42 },
  bullThesis: [
    'Post-merger synergies still to be fully realized; revenue cross-sell tailwind',
    'New CEO Venu Lambu drove margin expansion to 16.1% in Q3 FY26',
    'Strong digital-engineering positioning vs commoditized peers',
    'BFSI concentration with top US/EU banks creates expansion runway',
    'L&T parentage provides governance + cross-sell into engineering verticals',
  ],
  bearThesis: [
    'Margin still 700 bps below TCS — closing gap is hard structural ask',
    'Highly BFSI-concentrated (36%) — discretionary risk',
    'Smaller scale = vulnerable to AI repricing of mid-band offerings',
    'Merger integration headcount/attrition challenges still unresolved',
  ],
  keyRisks: ['Margin expansion stalling', 'Top-5 client concentration', 'Senior leadership churn', 'BFSI demand'],
  scorecard: { governance: 8.5, growth: 8.0, profitability: 7.0, capitalAllocation: 7.5, moat: 7.0, aiReadiness: 8.0 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Persistent Systems
// ─────────────────────────────────────────────────────────────────────────────
const PSL: ITCompanyData = {
  ticker: 'PERSISTENT',
  name: 'Persistent',
  longName: 'Persistent Systems Ltd.',
  segment: 'Mid-cap',
  asOf: 'April 2026',
  baseline: {
    ticker: 'PERSISTENT', name: 'Persistent',
    cmp: 4880, shares: 15.62, netCash: 1850,
    baseRevenue: 14000, // FY26E
    baseEBITMargin: 15.8,
    taxRate: 28.5, daPctRevenue: 3.0, capexPctRevenue: 2.0, wcPctIncRevenue: 14,
    trailingEPS: 90.2, trailingDPS: 35, buybackYield: 0.0, sustainableROE: 26,
  },
  defaultDCF: { g1: 14.0, n1: 5, g2: 9.0, n2: 5, gT: 4.5, marginEnd: 17.0, marginTerminal: 18.0, wacc: 13.0 },
  defaultDDM: { ke: 13.0, g1: 18, n1: 5, g2: 12, n2: 5, gT: 5, buybackYield: 0.0 },
  defaultMC: {
    g1: { low: 9, mode: 14, high: 19 },
    marginEnd: { low: 14, mode: 17, high: 19 },
    marginTerminal: { low: 15, mode: 18, high: 20 },
    wacc: { low: 12, mode: 13, high: 14 },
    gT: { low: 3.5, mode: 4.5, high: 5.5 },
    fixed: { n1: 5, n2: 5, g2: 9 },
    trials: 2000, seed: 47,
  },
  defaultAI: { productivityUplift: -1.5, passThrough: 35, crossoverYear: 4, aiServicesGrowth: 50, aiSharePct: 14, marginUpliftBps: 150 },
  scenarios: STANDARD_SCENARIOS(20, 14, 8, 19.5, 18, 15, 13, 26),
  fy25: { revenue: 11939, revenueUSD: 1409, ebit: 1730, ebitMargin: 14.5, pat: 1399, patMargin: 11.7, eps: 89.6, dps: 32, fcf: 1180, fcfYield: 1.5, roce: 25.5, roe: 24.9, headcount: 23900, attrition: 12.7, utilization: 81.7 },
  q3fy26: { revenue: 3565, revenueUSD: 422.5, revenueGrowthQoQCC: 4.0, revenueGrowthYoYCC: 17.3, ebit: 580, ebitMargin: 16.3, pat: 462, eps: 29.6, tcv: 0.55, bookToBill: 1.32, deals50m: 4, headcount: 24500, attrition: 12.1, largeDealWins: 'Healthcare AI deal + product engineering expansion at top hyperscaler' },
  fy26ytd: { revenue: 10380, ebit: 1640, ebitMargin: 15.8, pat: 1320 },
  fy26e: { revenue: 14000, revenueGrowthCC: 17.3, ebitMargin: 15.8, pat: 1500, eps: 96.1, dps: 38 },
  history: [
    { year: 'FY20', revenue: 3565, ebitMargin: 9.6, pat: 280, eps: 36.6, roce: 16.5 },
    { year: 'FY21', revenue: 4188, ebitMargin: 12.1, pat: 451, eps: 59.0, roce: 22.2 },
    { year: 'FY22', revenue: 5710, ebitMargin: 14.0, pat: 691, eps: 90.4, roce: 28.7 },
    { year: 'FY23', revenue: 8351, ebitMargin: 15.0, pat: 921, eps: 60.5, roce: 28.9 },
    { year: 'FY24', revenue: 9821, ebitMargin: 14.0, pat: 1093, eps: 71.1, roce: 24.3 },
    { year: 'FY25', revenue: 11939, ebitMargin: 14.5, pat: 1399, eps: 89.6, roce: 25.5 },
  ],
  geo: [
    { name: 'North America', share: 80.3 }, { name: 'Europe', share: 11.5 }, { name: 'India', share: 5.2 },
    { name: 'Rest of World', share: 3.0 },
  ],
  vertical: [
    { name: 'BFSI', share: 31 }, { name: 'Healthcare/LS', share: 27 }, { name: 'Software/Hi-Tech', share: 33 },
    { name: 'Other', share: 9 },
  ],
  service: [
    { name: 'Digital Engineering', share: 48 }, { name: 'Cloud & Infra', share: 22 },
    { name: 'AI/Data', share: 18 }, { name: 'BPM/Other', share: 12 },
  ],
  aiMetrics: { aiBookingsUSDb: 0.18, aiAnnualizedUSDb: 0.22, piloted: 95, productionized: 55 },
  capitalAllocation: { dividends: 500, buybacks: 0, capex: 280, acquisitions: 350, payoutRatio: 36 },
  bullThesis: [
    'Fastest-growing tier (~17% YoY CC) — pure-play digital engineering',
    'Founder-led culture (Sandeep Kalra) with deep IP / product DNA',
    'Healthcare AI dominance — top-3 vendor for US healthcare digital',
    'AI services 14% of revenue — highest among Indian peers',
    'Margin expansion runway (1500-200 bps) as scale benefits compound',
  ],
  bearThesis: [
    'Premium valuation (~50x FY27E EPS) leaves no error budget',
    'Smaller scale = client concentration risk (top-10 = 35% revenue)',
    'Margin still 750 bps below TCS — needs substantial scale',
    'Heavy USD exposure with limited hedging',
  ],
  keyRisks: ['Top client concentration', 'Founder transition', 'Healthcare regulatory shocks', 'Premium multiple compression'],
  scorecard: { governance: 8.5, growth: 9.5, profitability: 7.5, capitalAllocation: 7.5, moat: 7.5, aiReadiness: 9.0 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. Coforge
// ─────────────────────────────────────────────────────────────────────────────
const COFORGE: ITCompanyData = {
  ticker: 'COFORGE',
  name: 'Coforge',
  longName: 'Coforge Ltd.',
  segment: 'Mid-cap',
  asOf: 'April 2026',
  baseline: {
    ticker: 'COFORGE', name: 'Coforge',
    cmp: 7280, shares: 33.45, netCash: -1500, // net debt post Cigniti
    baseRevenue: 16500, // FY26E annualized
    baseEBITMargin: 13.5,
    taxRate: 26.0, daPctRevenue: 4.0, capexPctRevenue: 2.5, wcPctIncRevenue: 13,
    trailingEPS: 132, trailingDPS: 22, buybackYield: 0.0, sustainableROE: 21,
  },
  defaultDCF: { g1: 16.0, n1: 5, g2: 9.5, n2: 5, gT: 4.5, marginEnd: 16.0, marginTerminal: 17.5, wacc: 13.0 },
  defaultDDM: { ke: 13.0, g1: 22, n1: 5, g2: 14, n2: 5, gT: 5, buybackYield: 0.0 },
  defaultMC: {
    g1: { low: 11, mode: 16, high: 22 },
    marginEnd: { low: 13, mode: 16, high: 18.5 },
    marginTerminal: { low: 14, mode: 17.5, high: 19.5 },
    wacc: { low: 12, mode: 13, high: 14.5 },
    gT: { low: 3.5, mode: 4.5, high: 5.5 },
    fixed: { n1: 5, n2: 5, g2: 9.5 },
    trials: 2000, seed: 48,
  },
  defaultAI: { productivityUplift: -2, passThrough: 40, crossoverYear: 4, aiServicesGrowth: 45, aiSharePct: 12, marginUpliftBps: 120 },
  scenarios: STANDARD_SCENARIOS(22, 16, 9, 19.5, 17.5, 14, 13, 28),
  fy25: { revenue: 9990, revenueUSD: 1180, ebit: 1248, ebitMargin: 12.5, pat: 870, patMargin: 8.7, eps: 130.0, dps: 19, fcf: 720, fcfYield: 0.7, roce: 18.5, roe: 19.2, headcount: 28710, attrition: 11.8, utilization: 80.5 },
  q3fy26: { revenue: 4036, revenueUSD: 478.2, revenueGrowthQoQCC: 5.1, revenueGrowthYoYCC: 28.5, ebit: 545, ebitMargin: 13.5, pat: 410, eps: 12.3, tcv: 0.59, bookToBill: 1.46, deals50m: 6, headcount: 33500, attrition: 11.3, largeDealWins: 'Order book hits $1.72B (+30% YoY); Encora integration creates $2B core in Data/Cloud/AI engineering' },
  fy26ytd: { revenue: 12200, ebit: 1640, ebitMargin: 13.4, pat: 1190 },
  fy26e: { revenue: 16500, revenueGrowthCC: 28.5, ebitMargin: 13.5, pat: 1620, eps: 137.0, dps: 24 },
  history: [
    { year: 'FY20', revenue: 4184, ebitMargin: 14.0, pat: 350, eps: 56.3, roce: 21.0 },
    { year: 'FY21', revenue: 4663, ebitMargin: 16.0, pat: 463, eps: 73.2, roce: 24.7 },
    { year: 'FY22', revenue: 6432, ebitMargin: 14.5, pat: 631, eps: 102.7, roce: 22.0 },
    { year: 'FY23', revenue: 8014, ebitMargin: 13.0, pat: 689, eps: 110.9, roce: 19.5 },
    { year: 'FY24', revenue: 9179, ebitMargin: 12.5, pat: 692, eps: 110.6, roce: 18.0 },
    { year: 'FY25', revenue: 9990, ebitMargin: 12.5, pat: 870, eps: 130.0, roce: 18.5 },
  ],
  geo: [
    { name: 'Americas', share: 56.6 }, { name: 'EMEA', share: 32.3 }, { name: 'India + RoW', share: 11.1 },
  ],
  vertical: [
    { name: 'BFS (Banking + Financial Services)', share: 30.5 }, { name: 'Insurance', share: 23.2 },
    { name: 'Travel/Transport', share: 19.8 }, { name: 'Healthcare/Hi-Tech', share: 14.5 },
    { name: 'Public Sector', share: 12.0 },
  ],
  service: [
    { name: 'BFS Engineering', share: 27 }, { name: 'Insurance Platforms', share: 22 },
    { name: 'Cloud & Engineering', share: 21 }, { name: 'AI/Data', share: 17 }, { name: 'Testing (Cigniti)', share: 13 },
  ],
  aiMetrics: { aiBookingsUSDb: 0.14, aiAnnualizedUSDb: 0.18, piloted: 75, productionized: 40 },
  capitalAllocation: { dividends: 415, buybacks: 0, capex: 255, acquisitions: 1500, payoutRatio: 47 },
  bullThesis: [
    'Order book +30% YoY to $1.72B — best-in-class deal momentum',
    'Insurance vertical dominance via Sapiens partnership; defensible moat',
    'Encora + Cigniti integration creates $2B core in AI-led engineering',
    'Sudhir Singh has built a culture of consistent execution + win-rate',
    'Higher growth than tier-1s with mid-cap discount',
  ],
  bearThesis: [
    'Lowest margin among mid-caps; integration risk amplified by 2 acquisitions',
    'Net debt position (~₹1,500cr) constrains buybacks',
    'Premium valuation at ~50x trailing despite lower margins',
    'Acquisition-led growth = synergies still to be proven',
  ],
  keyRisks: ['Cigniti / Encora integration', 'Insurance vertical concentration', 'BFS discretionary spending', 'Goodwill writedowns'],
  scorecard: { governance: 8.0, growth: 9.5, profitability: 6.5, capitalAllocation: 7.0, moat: 7.0, aiReadiness: 8.5 },
};

// ─────────────────────────────────────────────────────────────────────────────
export const IT_COMPANIES: ITCompanyData[] = [TCS, INFY, HCL, WIPRO, LTIM, PSL, COFORGE];

export const IT_COMPANIES_BY_TICKER: Record<string, ITCompanyData> = Object.fromEntries(
  IT_COMPANIES.map(c => [c.ticker, c])
);

// ─────────────────────────────────────────────────────────────────────────────
// Industry-level refresh (FY25 actuals + FY26 outlook)
// ─────────────────────────────────────────────────────────────────────────────
export const INDUSTRY_FY26 = {
  exportsUSDb: 230,
  totalRevenueUSDb: 282,
  domesticUSDb: 52,
  growthCC: 4.6,
  globalShare: 56,
  employees: 5_670_000,
  netHires: -25_000, // structural automation = first net contraction year
  attrition: 13.2,
  aiServicesUSDb: 18,
  aiBookingsUSDb: 14,
  fdiInflowUSDb: 5.4,
  digitalRevenueShare: 62,
  source: 'NASSCOM Strategic Review FY26 + company filings (Q3 FY26 prints, Jan 2026)',
};

export const INDUSTRY_HISTORY = [
  { year: 'FY15', exports: 98, domestic: 19, growth: 12.4 },
  { year: 'FY16', exports: 108, domestic: 22, growth: 10.5 },
  { year: 'FY17', exports: 117, domestic: 26, growth: 8.2 },
  { year: 'FY18', exports: 126, domestic: 28, growth: 7.8 },
  { year: 'FY19', exports: 137, domestic: 32, growth: 9.0 },
  { year: 'FY20', exports: 147, domestic: 35, growth: 7.7 },
  { year: 'FY21', exports: 150, domestic: 41, growth: 2.3 },
  { year: 'FY22', exports: 178, domestic: 49, growth: 15.5 },
  { year: 'FY23', exports: 194, domestic: 51, growth: 8.4 },
  { year: 'FY24', exports: 200, domestic: 51, growth: 3.3 },
  { year: 'FY25', exports: 224, domestic: 52, growth: 5.1 },
  { year: 'FY26E', exports: 230, domestic: 52, growth: 4.6 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Industry KPI summary cards (refreshed)
// ─────────────────────────────────────────────────────────────────────────────
export const FRESH_KPIS = [
  { label: 'IT Revenue (FY26E)', value: '$282B', sub: '+4.6% YoY CC', tone: 'gold' },
  { label: 'Exports', value: '$230B', sub: '~82% of total', tone: 'blue' },
  { label: 'Workforce', value: '5.67M', sub: 'Net -25K (first contraction)', tone: 'amber' },
  { label: 'Digital revenue share', value: '62%', sub: 'AI/Cloud + Engg.', tone: 'green' },
  { label: 'AI services revenue', value: '$18B', sub: 'Annualized', tone: 'blue' },
  { label: 'Average attrition', value: '13.2%', sub: 'Stable', tone: 'slate' },
];
