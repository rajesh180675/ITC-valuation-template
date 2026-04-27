// ─────────────────────────────────────────────────────────────────────────────
// Indian IT Industry — 40K+ word recursive deep dive distilled into typed data.
// Source: "The Indian IT Industry: A 40,000+ Word Recursive Deep Dive" and
// "Infosys, HCL Tech & TCS: Recursive Deep Dive (35,000+ Words)" (June 2025).
// All figures are AS-REPORTED in the source documents — the application is a
// read / model layer, not a re-forecast.
// ─────────────────────────────────────────────────────────────────────────────

export type CompanyKey = 'infosys' | 'hcltech' | 'tcs';

// ─── Industry-level macros ────────────────────────────────────────────────────
export const INDUSTRY_MACRO = {
  industryRevenueUSDb: 254, // FY24 export revenue
  directHeadcount: 5_800_000,
  indirectHeadcount: 15_000_000,
  fortuneFiveHundredPenetrationPct: 95,
  globalServicesShare: 55, // India share of global IT services delivery
  asOf: 'FY2024 (analysis: June 2025)',
};

export const REVENUE_MIX_BY_VERTICAL = [
  { vertical: 'BFSI',                 share: 34, growth:  2.5, margin: 24 },
  { vertical: 'Retail & CPG',         share: 12, growth:  4.1, margin: 22 },
  { vertical: 'Healthcare & LS',      share: 11, growth:  5.8, margin: 23 },
  { vertical: 'Manufacturing',        share: 10, growth:  3.2, margin: 21 },
  { vertical: 'Comms & Media',        share: 10, growth: -1.5, margin: 18 },
  { vertical: 'Energy & Utilities',   share:  8, growth:  3.0, margin: 22 },
  { vertical: 'Others',               share: 15, growth:  6.0, margin: 25 },
];

export const STRUCTURAL_PILLARS = [
  { pillar: 'Labor Arbitrage',  description: '6-8x cost differential vs. developed markets', health: 'CRACKING'        as const },
  { pillar: 'Scale & Utilization', description: '500K+ pools, 82%+ utilization benchmark', health: 'STRESSED'       as const },
  { pillar: 'Client Lock-in',  description: '10-15 yr annuity contracts, deep workflows',  health: 'FRAGILE'        as const },
  { pillar: 'Domain Expertise', description: 'BFSI, Insurance, Healthcare verticals',      health: 'SOLID'          as const },
  { pillar: 'Global Delivery Model', description: '70% offshore, 30% onsite blend',          health: 'UNDER ATTACK'   as const },
];

export const THREE_WAVES = [
  {
    wave: 'Wave 1', period: '1995–2005', label: 'Application Maintenance & Support',
    bullets: [
      'Body shopping → managed services',
      'Per-head billing, fixed-price + T&M',
      'Banking (Citi, BofA), Insurance (AIG), Telecom (AT&T, Vodafone)',
    ],
    grossMargin: '28-35%',
  },
  {
    wave: 'Wave 2', period: '2005–2015', label: 'Enterprise Solutions & BPO',
    bullets: [
      'SAP/Oracle implementation, infra mgmt, BPO',
      'Annuity + project mix; TCS crosses 200K employees',
      'BPO compresses blended margin',
    ],
    grossMargin: '25-32%',
  },
  {
    wave: 'Wave 3', period: '2015–2023', label: 'Digital Transformation',
    bullets: [
      'Cloud migration (AWS, Azure, GCP), data, AI/ML, security',
      'Outcome-based pricing emerges',
      'Shift from cost arbitrage to capability arbitrage',
    ],
    grossMargin: '22-28%',
  },
  {
    wave: 'Wave 4', period: '2024–onwards', label: 'AI-Native Services / Survival',
    bullets: [
      'Agentic coding, autonomous IT ops, outcome contracts',
      'Pyramid inversion; 50% junior tier under existential threat',
      'Topaz / Ignio / DRYiCE platforms test product DNA',
    ],
    grossMargin: '?? — 18-28% bifurcated',
  },
];

// ─── AI disruption ────────────────────────────────────────────────────────────
export const AI_DISRUPTION_LAYERS = [
  {
    layer: 'Layer 1 — Productivity Hammer',
    horizon: '2024-2027',
    examples: 'GitHub Copilot, Amazon CodeWhisperer, Google Duet',
    impact: '30-50% reduction in junior developer need per project',
    status: 'Already happening, accelerating',
  },
  {
    layer: 'Layer 2 — Agentic Coding',
    horizon: '2025-2030',
    examples: 'Devin (Cognition), AutoCodeRover, Replit Agent, Cursor + Claude',
    impact: '60-80% reduction in mid-level developer need',
    status: '2-4 years to maturity',
  },
  {
    layer: 'Layer 3 — Business Logic Automation',
    horizon: '2027-2035',
    examples: 'No-code / low-code reaching enterprise grade, AI-driven systems',
    impact: 'Redefinition of "custom software development"',
    status: 'Conceptual but inevitable',
  },
];

export const SERVICE_VULNERABILITY = [
  // HIGH
  { service: 'Application Maintenance',    risk: 90, band: 'HIGH'   as const, timeline: '2025-27' },
  { service: 'Testing & QA',               risk: 95, band: 'HIGH'   as const, timeline: '2024-26' },
  { service: 'Data Entry & Processing',    risk: 99, band: 'HIGH'   as const, timeline: 'Already' },
  { service: 'L1/L2 Help Desk',            risk: 85, band: 'HIGH'   as const, timeline: '2024-25' },
  { service: 'Report Generation',          risk: 95, band: 'HIGH'   as const, timeline: 'Already' },
  { service: 'Code Migration (legacy→cloud)', risk: 80, band: 'HIGH' as const, timeline: '2025-27' },
  // MEDIUM
  { service: 'Custom App Development',     risk: 50, band: 'MEDIUM' as const, timeline: '2026-29' },
  { service: 'Data Engineering',           risk: 45, band: 'MEDIUM' as const, timeline: '2026-28' },
  { service: 'Cloud Infra Mgmt',           risk: 40, band: 'MEDIUM' as const, timeline: '2025-28' },
  { service: 'Cybersecurity Operations',   risk: 35, band: 'MEDIUM' as const, timeline: '2027-30' },
  // LOW
  { service: 'Strategic Consulting',       risk: 15, band: 'LOW'    as const, timeline: '2030+'  },
  { service: 'Change Management',          risk: 10, band: 'LOW'    as const, timeline: 'Never fully' },
  { service: 'Complex M&A Integration',    risk: 20, band: 'LOW'    as const, timeline: '2030+'  },
  { service: 'Regulated Industry Advisory',risk: 25, band: 'LOW'    as const, timeline: '2030+'  },
  { service: 'AI Governance & Ethics',     risk:  5, band: 'LOW'    as const, timeline: 'Growing' },
];

export const REVENUE_COMPRESSION_SCENARIO = [
  { fy: 'FY24', revenue: 254, headcount: 5.8, margin: 21, eps:  2 },
  { fy: 'FY25', revenue: 250, headcount: 5.5, margin: 20, eps: -5 },
  { fy: 'FY26', revenue: 245, headcount: 5.0, margin: 19, eps: -8 },
  { fy: 'FY27', revenue: 240, headcount: 4.5, margin: 18, eps: -10 },
  { fy: 'FY28', revenue: 245, headcount: 4.2, margin: 19, eps:  2 },
  { fy: 'FY29', revenue: 260, headcount: 4.0, margin: 21, eps:  8 },
  { fy: 'FY30', revenue: 290, headcount: 3.8, margin: 23, eps: 12 },
];

export const HEADCOUNT_TRANSITION = [
  { segment: 'Application Maintenance', current: 2.2, fy30: 0.5 },
  { segment: 'Testing & QA',            current: 0.8, fy30: 0.1 },
  { segment: 'BPO/KPO',                 current: 1.5, fy30: 0.6 },
  { segment: 'Cloud & Infrastructure',  current: 0.5, fy30: 0.4 },
  { segment: 'AI / ML / Data Science',  current: 0.2, fy30: 0.8 },
  { segment: 'Cybersecurity',           current: 0.2, fy30: 0.5 },
  { segment: 'Consulting & Strategy',   current: 0.3, fy30: 0.4 },
];

export const WAGE_POLARIZATION = [
  { role: 'Junior Developer',   y2023:  6, y2028:  4 },
  { role: 'Mid Developer',      y2023: 18, y2028: 15 },
  { role: 'Senior Developer',   y2023: 35, y2028: 32 },
  { role: 'AI Engineer',        y2023: 25, y2028: 40 },
  { role: 'AI Architect',       y2023: 50, y2028: 80 },
  { role: 'Cybersecurity Lead', y2023: 45, y2028: 65 },
];

// ─── Big 5 quick comparison (FY24) ────────────────────────────────────────────
export const BIG5_FY24 = [
  { co: 'TCS',          revenue: 29.1, headcount: 614, mcap: 175, opMargin: 25.1, fcfYield: 3.2, divYield: 1.6, pe: 28, growth: -2.7, rating: 'HOLD'   as const },
  { co: 'Infosys',      revenue: 18.6, headcount: 315, mcap:  88, opMargin: 23.5, fcfYield: 3.5, divYield: 2.2, pe: 25, growth:  1.3, rating: 'BUY'    as const },
  { co: 'HCLTech',      revenue: 12.6, headcount: 220, mcap:  52, opMargin: 18.0, fcfYield: 3.8, divYield: 3.2, pe: 21, growth:  5.9, rating: 'BUY'    as const },
  { co: 'Wipro',        revenue: 10.8, headcount: 240, mcap:  32, opMargin: 15.8, fcfYield: 2.8, divYield: 1.8, pe: 22, growth: -1.6, rating: 'AVOID'  as const },
  { co: 'Tech Mahindra', revenue: 6.2, headcount: 150, mcap:  14, opMargin: 10.2, fcfYield: 2.1, divYield: 1.5, pe: 18, growth: -4.9, rating: 'AVOID'  as const },
];

export const TIER2 = [
  { co: 'LTIMindtree',         revenue: 4.4, headcount:  85, mcap: 20, pe: 30, note: 'Born digital, 70%+ digital revenue' },
  { co: 'Persistent Systems',  revenue: 3.1, headcount:  24, mcap: 14, pe: 55, note: 'Software product engineering, AI-resistant' },
  { co: 'Cognizant (US HQ)',   revenue:19.4, headcount: 355, mcap: 58, pe: 17, note: 'India delivery, Cortex AI platform' },
  { co: 'Mphasis',             revenue: 1.8, headcount:  30, mcap:  7, pe: 22, note: 'BFSI deep, AWS-native' },
  { co: 'Coforge',             revenue: 1.2, headcount:  25, mcap:  6, pe: 35, note: 'Insurance dominance, 65% digital' },
];

export const PLATFORM_BENCHMARK = [
  { platform: 'Topaz',   owner: 'Infosys',    revenueM: 1300, employees: 12_000, maturity: 4 },
  { platform: 'Ignio',   owner: 'TCS',        revenueM:  900, employees:  8_000, maturity: 4 },
  { platform: 'DRYiCE',  owner: 'HCLTech',    revenueM:  600, employees:  5_000, maturity: 3 },
  { platform: 'Cortex',  owner: 'Cognizant',  revenueM: 1100, employees: 10_000, maturity: 4 },
  { platform: 'SynOps',  owner: 'Wipro',      revenueM:  200, employees:  2_000, maturity: 2 },
];

// ─── Per-company autopsy ──────────────────────────────────────────────────────

export interface ServiceLine { line: string; revUSDb: number; growth: number; aiRisk: 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INVERSE' | 'VARIABLE'; }
export interface Vertical    { vertical: string; revUSDb: number; share: number; growth: number; margin: number; aiRisk: 'HIGH' | 'MEDIUM' | 'LOW' | 'VARIABLE'; }
export interface ClientTier  { tier: string; count: number; revUSDb: number; growth: number; }
export interface TopClient   { client: string; revUSDm: number; trend: 'Growing' | 'Stable' | 'Declining'; risk?: 'Low' | 'Medium' | 'HIGH' | 'VERY HIGH' | 'EXTREME'; }
export interface MarginBridgeRow { factor: string; bps: number; }
export interface BalanceSheetRow { metric: string; fy24: string; fy23: string; fy22: string; }

export interface CompanyAutopsy {
  key: CompanyKey;
  name: string;
  founded: string;
  ceo: string;
  promoter: string;
  governance: string;
  esopCulture: string;
  thesisLine: string;
  rating: 'BUY' | 'CAUTIOUS BUY' | 'HOLD' | 'AVOID';
  conviction: number; // 1-5 stars
  verticals: Vertical[];
  serviceLines: ServiceLine[];
  clientTiers: ClientTier[];
  topClients: TopClient[];
  marginBridge: MarginBridgeRow[];
  marginBridgeStart: { label: string; value: number };
  marginBridgeEnd:   { label: string; value: number };
  balanceSheet: BalanceSheetRow[];
  threats: { threat: string; severity: number; timeline: string; mitigation: string; residual: number }[];
  bullCase: string[];
  bearCase: string[];
  recursive: string;
  // Valuation Lab base assumptions
  valuation: {
    sharesB: number;                 // billion shares
    currentPriceLocal: number;       // ₹/share for INR-listed
    priceCurrency: 'INR' | 'USD';
    netCashUSDb: number;
    waccDefault: number;             // %
    terminalGrowthDefault: number;   // %
    forecast: { fy: string; revenueUSDb: number; opMargin: number; fcfUSDb: number }[];
    sotp: { segment: string; revenueUSDb: number; multiple: number; basis: 'rev' | 'arr' }[];
    sotpFY27: { segment: string; revenueUSDb: number; multiple: number; basis: 'rev' | 'arr' }[];
    scenarios: { name: 'Bull' | 'Base' | 'Bear'; probability: number; fairLocal: number; commentary: string }[];
    relativeMultiples: { peer: string; pe: number; evEbitda: number; pFcf: number }[];
  };
}

// ────── INFOSYS ──────────────────────────────────────────────────────────────
export const INFOSYS: CompanyAutopsy = {
  key: 'infosys',
  name: 'Infosys',
  founded: '1981 — 7 engineers, ₹10,000',
  ceo: 'Salil Parekh (since 2018)',
  promoter: 'NRN Murthy / Catamaran Ventures (≈3.3%)',
  governance: 'Best-in-class; independent directors include former Unilever CEO and ex-SEC commissioner',
  esopCulture: 'Employee ownership ≈8% (highest among Big 5)',
  thesisLine: 'The most likely survivor — best management, leanest cost structure, strongest AI platform.',
  rating: 'CAUTIOUS BUY',
  conviction: 3,
  verticals: [
    { vertical: 'Financial Services', revUSDb: 6.3, share: 34, growth: -2.1, margin: 26, aiRisk: 'HIGH' },
    { vertical: 'Retail & CPG',       revUSDb: 2.2, share: 12, growth:  4.5, margin: 22, aiRisk: 'MEDIUM' },
    { vertical: 'Communication',      revUSDb: 1.9, share: 10, growth: -5.8, margin: 16, aiRisk: 'HIGH' },
    { vertical: 'Manufacturing',      revUSDb: 1.7, share:  9, growth:  3.2, margin: 21, aiRisk: 'MEDIUM' },
    { vertical: 'Energy & Utilities', revUSDb: 1.5, share:  8, growth:  2.8, margin: 20, aiRisk: 'MEDIUM' },
    { vertical: 'Hi-Tech',            revUSDb: 1.4, share:  7.5, growth: 6.1, margin: 28, aiRisk: 'LOW' },
    { vertical: 'Healthcare',         revUSDb: 1.2, share:  6.5, growth: 7.8, margin: 25, aiRisk: 'LOW' },
    { vertical: 'Life Sciences',      revUSDb: 0.8, share:  4.3, growth: 5.2, margin: 24, aiRisk: 'LOW' },
    { vertical: 'Others',             revUSDb: 1.6, share:  8.7, growth: 8.0, margin: 23, aiRisk: 'VARIABLE' },
  ],
  serviceLines: [
    { line: 'Cloud Services',          revUSDb: 4.8, growth:  18, aiRisk: 'LOW' },
    { line: 'Data & Analytics',        revUSDb: 3.2, growth:  14, aiRisk: 'MEDIUM' },
    { line: 'AI & Automation',         revUSDb: 2.1, growth:  42, aiRisk: 'INVERSE' },
    { line: 'Digital Experience',      revUSDb: 1.9, growth:  12, aiRisk: 'LOW' },
    { line: 'Enterprise Apps (SAP/Oracle)', revUSDb: 1.8, growth: -3, aiRisk: 'HIGH' },
    { line: 'Application Development', revUSDb: 1.5, growth:  -8, aiRisk: 'VERY HIGH' },
    { line: 'Application Maintenance', revUSDb: 1.3, growth: -12, aiRisk: 'EXTREME' },
    { line: 'Infrastructure Mgmt',     revUSDb: 1.0, growth:  -5, aiRisk: 'HIGH' },
    { line: 'Consulting',              revUSDb: 0.7, growth:  22, aiRisk: 'LOW' },
    { line: 'Others',                  revUSDb: 0.3, growth:   5, aiRisk: 'VARIABLE' },
  ],
  clientTiers: [
    { tier: '>$100M',  count:  42, revUSDb: 8.4, growth:  5 },
    { tier: '$50-100M', count:  85, revUSDb: 5.5, growth:  2 },
    { tier: '$20-50M', count: 210, revUSDb: 5.8, growth:  1 },
    { tier: '$10-20M', count: 350, revUSDb: 4.9, growth: -2 },
    { tier: '<$10M',   count:2800, revUSDb: 3.0, growth: -8 },
  ],
  topClients: [
    { client: 'Bank of America', revUSDm: 850, trend: 'Stable',    risk: 'Medium' },
    { client: 'Vanguard',        revUSDm: 720, trend: 'Growing',   risk: 'Low' },
    { client: 'Lloyds Banking',  revUSDm: 680, trend: 'Stable',    risk: 'Medium' },
    { client: 'Verizon',         revUSDm: 580, trend: 'Declining', risk: 'HIGH' },
    { client: 'Comcast',         revUSDm: 520, trend: 'Declining', risk: 'HIGH' },
    { client: 'BP',              revUSDm: 480, trend: 'Growing',   risk: 'Low' },
    { client: 'Merck',           revUSDm: 450, trend: 'Growing',   risk: 'Low' },
    { client: 'Target',          revUSDm: 420, trend: 'Stable',    risk: 'Low' },
    { client: 'Allianz',         revUSDm: 400, trend: 'Growing',   risk: 'Low' },
    { client: 'AstraZeneca',     revUSDm: 380, trend: 'Growing',   risk: 'Low' },
  ],
  marginBridge: [
    { factor: '+ Offshore mix improvement', bps:  40 },
    { factor: '+ Pricing (digital premium)', bps: 25 },
    { factor: '− Wage inflation',           bps: -80 },
    { factor: '− Utilization decline',      bps: -60 },
    { factor: '− Investment in AI (Topaz)', bps: -45 },
    { factor: '− Travel & onsite costs',    bps: -20 },
  ],
  marginBridgeStart: { label: 'FY23 Op Margin', value: 22.8 },
  marginBridgeEnd:   { label: 'FY24 Op Margin', value: 21.6 },
  balanceSheet: [
    { metric: 'Cash & Equivalents (USDm)', fy24: '2,850', fy23: '2,450', fy22: '2,100' },
    { metric: 'Debt (USDm)',               fy24: '0',     fy23: '0',     fy22: '0'     },
    { metric: 'Net Cash (USDm)',           fy24: '2,850', fy23: '2,450', fy22: '2,100' },
    { metric: 'FCF (USDm)',                fy24: '3,100', fy23: '2,900', fy22: '3,200' },
    { metric: 'FCF Yield',                 fy24: '3.5%',  fy23: '3.8%',  fy22: '4.1%'  },
    { metric: 'Dividend Paid (USDm)',      fy24: '2,400', fy23: '2,200', fy22: '2,000' },
    { metric: 'Buybacks (USDm)',           fy24: '0',     fy23: '0',     fy22: '0'     },
    { metric: 'ROE',                       fy24: '38%',   fy23: '40%',   fy22: '42%'   },
  ],
  threats: [
    { threat: 'Agentic coding replacing devs',   severity: 9, timeline: '2026-28',  mitigation: 'Topaz AutoCode, reskilling', residual: 6 },
    { threat: 'Client insourcing with AI',       severity: 8, timeline: '2025-27',  mitigation: 'Outcome-based contracts',    residual: 5 },
    { threat: 'BFSI spending freeze',            severity: 7, timeline: 'Now',      mitigation: 'Vertical diversification',   residual: 5 },
    { threat: 'Talent drain to AI startups',     severity: 7, timeline: 'Now',      mitigation: 'ESOP refresh, AI roles',     residual: 4 },
    { threat: 'Pricing pressure on maintenance', severity: 8, timeline: 'Now',      mitigation: 'Automate own delivery',      residual: 5 },
  ],
  bullCase: [
    'Best-in-class management; Salil Parekh executing with urgency',
    'Strongest digital revenue mix: 62% of revenue',
    'Topaz AI platform most mature: 250K trained, 12K certified AI practitioners',
    'Leanest cost structure (highest op margin in Big 5)',
    'Strongest large-client mining (>$100M tier growing fastest)',
    'Strategic NVIDIA / AWS / Microsoft / Google partnerships',
    'Zero debt, $2.85B net cash, 38% ROE',
  ],
  bearCase: [
    'Still 38% maintenance-heavy; legacy lines shrinking 5-12%',
    'Dangerous BFSI (34%) + Comms (10%) concentration, both declining',
    'Topaz only 7% of revenue — too small to offset legacy decline',
    'Wage inflation 11-14% across bands; AI engineers command 40-60% premium',
    'No buyback program (less tax-efficient capital return than TCS)',
    'Even at 40% Topaz growth, full replacement of legacy = 8-10 years',
  ],
  recursive: 'Infosys is "running up the down escalator." Growth services expanding 12-42% while legacy services shrink 5-12% — the gap is the danger zone. Management understands the threat and is building Topaz aggressively, but the recursive trap is that the AI-services TAM may be permanently smaller than the legacy IT-services TAM it replaces. Survival is highly likely; rerating requires Topaz to scale to $5B+.',
  valuation: {
    sharesB: 4.2,
    currentPriceLocal: 18.5,
    priceCurrency: 'USD',
    netCashUSDb: 2.9,
    waccDefault: 11.5,
    terminalGrowthDefault: 4.0,
    forecast: [
      { fy: 'FY25', revenueUSDb: 19.1, opMargin: 21.0, fcfUSDb: 3.2 },
      { fy: 'FY26', revenueUSDb: 19.5, opMargin: 21.5, fcfUSDb: 3.4 },
      { fy: 'FY27', revenueUSDb: 20.8, opMargin: 22.5, fcfUSDb: 3.8 },
      { fy: 'FY28', revenueUSDb: 22.5, opMargin: 23.5, fcfUSDb: 4.3 },
      { fy: 'FY29', revenueUSDb: 24.5, opMargin: 24.0, fcfUSDb: 4.9 },
      { fy: 'FY30', revenueUSDb: 26.8, opMargin: 24.5, fcfUSDb: 5.5 },
    ],
    sotp: [
      { segment: 'Legacy Services (30%)', revenueUSDb: 5.6, multiple: 1.2, basis: 'rev' },
      { segment: 'Digital Services (51%)', revenueUSDb: 9.5, multiple: 2.8, basis: 'rev' },
      { segment: 'AI / Topaz (11%)',       revenueUSDb: 2.1, multiple: 6.0, basis: 'rev' },
      { segment: 'Consulting (4%)',        revenueUSDb: 0.7, multiple: 3.5, basis: 'rev' },
      { segment: 'Products (4%)',          revenueUSDb: 0.7, multiple: 8.0, basis: 'rev' },
    ],
    sotpFY27: [
      { segment: 'Legacy (20%)',     revenueUSDb: 4.2, multiple: 1.0, basis: 'rev' },
      { segment: 'Digital (45%)',    revenueUSDb: 9.4, multiple: 2.5, basis: 'rev' },
      { segment: 'AI / Topaz (20%)', revenueUSDb: 4.2, multiple: 7.0, basis: 'rev' },
      { segment: 'Consulting (8%)',  revenueUSDb: 1.7, multiple: 4.0, basis: 'rev' },
      { segment: 'Products (7%)',    revenueUSDb: 1.5, multiple: 9.0, basis: 'rev' },
    ],
    scenarios: [
      { name: 'Bull', probability: 30, fairLocal: 24, commentary: 'Topaz $5B+, legacy decline arrested, margins expand to 25%' },
      { name: 'Base', probability: 50, fairLocal: 17, commentary: 'Managed decline, Topaz grows but not fast enough, market de-rates' },
      { name: 'Bear', probability: 20, fairLocal: 12, commentary: 'Agentic AI breakthrough, legacy collapse, Topaz too small to save' },
    ],
    relativeMultiples: [
      { peer: 'Infosys',   pe: 25, evEbitda: 18, pFcf: 26 },
      { peer: 'TCS',       pe: 28, evEbitda: 20, pFcf: 28 },
      { peer: 'HCLTech',   pe: 21, evEbitda: 15, pFcf: 22 },
      { peer: 'Cognizant', pe: 17, evEbitda: 12, pFcf: 18 },
      { peer: 'Accenture', pe: 24, evEbitda: 17, pFcf: 23 },
    ],
  },
};

// ────── HCL TECH ─────────────────────────────────────────────────────────────
export const HCLTECH: CompanyAutopsy = {
  key: 'hcltech',
  name: 'HCLTech',
  founded: '1976 (HCL); IT services since 1991',
  ceo: 'C Vijayakumar (since 2016, contract extended to 2026)',
  promoter: 'Shiv Nadar / HCL Corporation (≈60%)',
  governance: 'Promoter-controlled; family influence on board (HIGH governance risk)',
  esopCulture: 'Minimal — promoter-centric, not employee-centric',
  thesisLine: 'The dark horse — ERS + Products = 38% of revenue is a structural moat AI cannot easily crack.',
  rating: 'BUY',
  conviction: 4,
  verticals: [
    { vertical: 'IT Services',          revUSDb: 7.8, share: 62, growth:  3.2, margin: 22, aiRisk: 'HIGH'   },
    { vertical: 'Engineering & R&D (ERS)', revUSDb: 3.2, share: 25, growth: 15, margin: 28, aiRisk: 'LOW' },
    { vertical: 'Products & Platforms', revUSDb: 1.6, share: 13, growth:  8.0, margin: 35, aiRisk: 'LOW'   },
  ],
  serviceLines: [
    { line: 'Semiconductor Engineering', revUSDb: 0.9, growth: 18, aiRisk: 'LOW' },
    { line: 'Automotive Embedded',       revUSDb: 0.75, growth: 12, aiRisk: 'LOW' },
    { line: 'Telecom Equipment',         revUSDb: 0.65, growth: 10, aiRisk: 'LOW' },
    { line: 'Aerospace Software',        revUSDb: 0.4, growth: 8, aiRisk: 'LOW' },
    { line: 'Medical Device Firmware',   revUSDb: 0.3, growth: 20, aiRisk: 'LOW' },
    { line: 'DRYiCE (AIOps SaaS)',       revUSDb: 0.6, growth: 25, aiRisk: 'INVERSE' },
    { line: 'HCL BigFix',                revUSDb: 0.3, growth: 10, aiRisk: 'MEDIUM' },
    { line: 'HCL Sametime',              revUSDb: 0.2, growth: 5,  aiRisk: 'MEDIUM' },
    { line: 'HCL Commerce',              revUSDb: 0.15, growth: 8, aiRisk: 'MEDIUM' },
    { line: 'IT Services (residual)',    revUSDb: 7.8, growth: 3.2, aiRisk: 'HIGH' },
  ],
  clientTiers: [
    { tier: '>$50M',   count:  65, revUSDb: 5.2, growth:  8 },
    { tier: '$20-50M', count: 140, revUSDb: 3.8, growth:  4 },
    { tier: '$10-20M', count: 280, revUSDb: 3.9, growth:  1 },
    { tier: '<$10M',   count:2500, revUSDb: 1.7, growth: -5 },
  ],
  topClients: [
    { client: 'ARM',         revUSDm: 320, trend: 'Growing',   risk: 'Low' },
    { client: 'Qualcomm',    revUSDm: 280, trend: 'Growing',   risk: 'Low' },
    { client: 'BMW',         revUSDm: 250, trend: 'Stable',    risk: 'Low' },
    { client: 'Daimler',     revUSDm: 230, trend: 'Stable',    risk: 'Low' },
    { client: 'Boeing',      revUSDm: 210, trend: 'Stable',    risk: 'Medium' },
    { client: 'Ericsson',    revUSDm: 200, trend: 'Stable',    risk: 'Medium' },
    { client: 'Cisco',       revUSDm: 180, trend: 'Stable',    risk: 'Medium' },
    { client: 'Medtronic',   revUSDm: 170, trend: 'Growing',   risk: 'Low' },
    { client: 'Abbott',      revUSDm: 160, trend: 'Growing',   risk: 'Low' },
    { client: 'Continental', revUSDm: 150, trend: 'Stable',    risk: 'Low' },
  ],
  marginBridge: [
    { factor: '− Gross margin compression',    bps: -60 },
    { factor: '− SG&A creep',                  bps: -30 },
    { factor: '− R&D / ERS investment',        bps: -30 },
  ],
  marginBridgeStart: { label: 'FY23 Op Margin', value: 19.2 },
  marginBridgeEnd:   { label: 'FY24 Op Margin', value: 18.0 },
  balanceSheet: [
    { metric: 'Cash (USDm)',          fy24: '1,950', fy23: '1,700', fy22: '1,500' },
    { metric: 'Debt (USDm)',          fy24: '1,200', fy23: '1,400', fy22: '1,600' },
    { metric: 'Net Cash (USDm)',      fy24:   '750', fy23:   '300', fy22:  '-100' },
    { metric: 'FCF (USDm)',           fy24: '1,800', fy23: '1,700', fy22: '1,900' },
    { metric: 'FCF Yield',            fy24: '3.8%',  fy23: '4.0%',  fy22: '4.5%'  },
    { metric: 'Dividend Paid (USDm)', fy24: '1,200', fy23: '1,100', fy22: '1,000' },
    { metric: 'ROE',                  fy24: '28%',   fy23: '30%',   fy22: '32%'   },
  ],
  threats: [
    { threat: 'IT services automation',   severity: 8, timeline: 'Now',     mitigation: 'DRYiCE, offshore shift',   residual: 5 },
    { threat: 'ERS commoditization',      severity: 3, timeline: '2028+',   mitigation: 'Deep domain lock-in',      residual: 2 },
    { threat: 'Product competition',      severity: 5, timeline: 'Now',     mitigation: 'AI integration',           residual: 4 },
    { threat: 'Promoter succession',      severity: 6, timeline: '2-3 yrs', mitigation: 'Vijayakumar extension',    residual: 4 },
    { threat: 'Pricing pressure',         severity: 7, timeline: 'Now',     mitigation: 'ERS margin buffer',        residual: 4 },
  ],
  bullCase: [
    'Best product engineering services: $3.2B+ ERS revenue, 28% margin, AI-resistant',
    'DRYiCE AIOps platform — $600M revenue, 25% growth, $1B ARR by FY27 trajectory',
    'Highest dividend yield in Big 5 (3.2%), $1.8B FCF',
    'Aggressive M&A in niche AI / cyber',
    'Engineering R&D services growing 15%+',
    'Largest tier (>$50M clients) growing 8% — best in class',
  ],
  bearCase: [
    'IT services = 62% of revenue, highly automatable',
    'Infrastructure mgmt = 32% of services revenue, ticking automation bomb',
    'Operating margin declining 19.2% → 18.0%',
    'Less consulting depth than TCS / Infosys',
    'Promoter risk — Roshni Nadar succession ambiguity',
    'Net cash positive only recently — thinner buffer than peers',
  ],
  recursive: 'HCLTech is the "tortoise" of the Big 3 — slower in narrative but with a structural shell that AI cannot easily crack. ERS (semiconductor, automotive embedded, aerospace, medical devices) is genuinely AI-resistant because hardware-software co-design requires physical testing, regulatory accountability, and IP-locked human certification. If ERS scales from 25% → 35% of revenue and DRYiCE hits $1B ARR, blended op margin lifts to 23.5% — superior to current Infosys.',
  valuation: {
    sharesB: 2.7,
    currentPriceLocal: 1450,
    priceCurrency: 'INR',
    netCashUSDb: 0.75,
    waccDefault: 11.0,
    terminalGrowthDefault: 4.0,
    forecast: [
      { fy: 'FY25', revenueUSDb: 12.9, opMargin: 18.5, fcfUSDb: 1.9 },
      { fy: 'FY26', revenueUSDb: 13.8, opMargin: 19.5, fcfUSDb: 2.2 },
      { fy: 'FY27', revenueUSDb: 15.0, opMargin: 21.0, fcfUSDb: 2.6 },
      { fy: 'FY28', revenueUSDb: 16.5, opMargin: 22.5, fcfUSDb: 3.1 },
      { fy: 'FY29', revenueUSDb: 18.0, opMargin: 23.5, fcfUSDb: 3.6 },
      { fy: 'FY30', revenueUSDb: 19.8, opMargin: 24.0, fcfUSDb: 4.2 },
    ],
    sotp: [
      { segment: 'IT Services (62%)',  revenueUSDb: 7.8, multiple: 1.5, basis: 'rev' },
      { segment: 'ERS (25%)',          revenueUSDb: 3.2, multiple: 3.0, basis: 'rev' },
      { segment: 'Products (13%)',     revenueUSDb: 1.6, multiple: 8.0, basis: 'rev' },
    ],
    sotpFY27: [
      { segment: 'IT Services (55%)',     revenueUSDb: 8.3, multiple: 1.4, basis: 'rev' },
      { segment: 'ERS (30%)',             revenueUSDb: 4.5, multiple: 3.5, basis: 'rev' },
      { segment: 'Products incl. DRYiCE', revenueUSDb: 2.2, multiple: 9.5, basis: 'rev' },
    ],
    scenarios: [
      { name: 'Bull', probability: 35, fairLocal: 1800, commentary: 'ERS scales to 35%, DRYiCE hits $1B ARR, margin expansion' },
      { name: 'Base', probability: 45, fairLocal: 1400, commentary: 'Steady state, ERS grows but IT services drags' },
      { name: 'Bear', probability: 20, fairLocal:  950, commentary: 'IT services collapse, ERS insufficient to offset' },
    ],
    relativeMultiples: [
      { peer: 'HCLTech',   pe: 21, evEbitda: 15, pFcf: 22 },
      { peer: 'Infosys',   pe: 25, evEbitda: 18, pFcf: 26 },
      { peer: 'TCS',       pe: 28, evEbitda: 20, pFcf: 28 },
      { peer: 'Cognizant', pe: 17, evEbitda: 12, pFcf: 18 },
      { peer: 'Accenture', pe: 24, evEbitda: 17, pFcf: 23 },
    ],
  },
};

// ────── TCS ──────────────────────────────────────────────────────────────────
export const TCS_AUTOPSY: CompanyAutopsy = {
  key: 'tcs',
  name: 'TCS',
  founded: '1968 — Tata Consultancy Services',
  ceo: 'K Krithivasan (since June 2023)',
  promoter: 'Tata Sons (≈72%)',
  governance: 'Complex (Tata Trusts → Tata Sons → TCS), multiple layers',
  esopCulture: 'Moderate — top 5,000 only, not broad-based',
  thesisLine: 'The dying goliath — magnificent cash machine optimised for an era that is ending.',
  rating: 'AVOID',
  conviction: 1,
  verticals: [
    { vertical: 'Banking & Financial', revUSDb: 10.2, share: 35, growth: -4, margin: 24, aiRisk: 'HIGH'   },
    { vertical: 'Retail & CPG',        revUSDb:  3.5, share: 12, growth:  2, margin: 20, aiRisk: 'MEDIUM' },
    { vertical: 'Communications',      revUSDb:  3.2, share: 11, growth: -7, margin: 15, aiRisk: 'HIGH'   },
    { vertical: 'Manufacturing',       revUSDb:  2.8, share: 10, growth:  1, margin: 19, aiRisk: 'MEDIUM' },
    { vertical: 'Healthcare',          revUSDb:  2.5, share:  9, growth:  5, margin: 23, aiRisk: 'LOW'    },
    { vertical: 'Energy',              revUSDb:  2.2, share:  8, growth:  3, margin: 21, aiRisk: 'MEDIUM' },
    { vertical: 'Hi-Tech',             revUSDb:  2.0, share:  7, growth:  8, margin: 27, aiRisk: 'LOW'    },
    { vertical: 'Others',              revUSDb:  2.7, share:  8, growth:  4, margin: 22, aiRisk: 'VARIABLE' },
  ],
  serviceLines: [
    { line: 'Application Maintenance', revUSDb: 7.5, growth: -10, aiRisk: 'EXTREME' },
    { line: 'Application Development', revUSDb: 4.2, growth:  -6, aiRisk: 'VERY HIGH' },
    { line: 'Infrastructure Mgmt',     revUSDb: 3.8, growth:  -4, aiRisk: 'HIGH' },
    { line: 'Cloud',                   revUSDb: 4.5, growth:  15, aiRisk: 'LOW' },
    { line: 'Data & Analytics',        revUSDb: 3.0, growth:  12, aiRisk: 'MEDIUM' },
    { line: 'AI / Automation (Ignio)', revUSDb: 1.5, growth:  30, aiRisk: 'INVERSE' },
    { line: 'Consulting',              revUSDb: 1.8, growth:  18, aiRisk: 'LOW' },
    { line: 'Others',                  revUSDb: 2.8, growth:   5, aiRisk: 'VARIABLE' },
  ],
  clientTiers: [
    { tier: '>$100M',  count:  62, revUSDb: 12.4, growth: -2 },
    { tier: '$50-100M', count: 115, revUSDb:  7.5, growth: -1 },
    { tier: '$20-50M', count: 280, revUSDb:  7.8, growth:  2 },
    { tier: '<$20M',   count:3200, revUSDb:  1.4, growth: -15 },
  ],
  topClients: [
    { client: 'Citi',      revUSDm: 1100, trend: 'Stable',    risk: 'Medium' },
    { client: 'BofA',      revUSDm:  950, trend: 'Declining', risk: 'HIGH' },
    { client: 'JP Morgan', revUSDm:  850, trend: 'Declining', risk: 'HIGH' },
    { client: 'Lloyds',    revUSDm:  750, trend: 'Declining', risk: 'VERY HIGH' },
    { client: 'AIG',       revUSDm:  680, trend: 'Declining', risk: 'HIGH' },
    { client: 'AT&T',      revUSDm:  620, trend: 'Declining', risk: 'EXTREME' },
    { client: 'Verizon',   revUSDm:  580, trend: 'Declining', risk: 'EXTREME' },
    { client: 'Target',    revUSDm:  520, trend: 'Stable',    risk: 'Low' },
    { client: 'BP',        revUSDm:  480, trend: 'Growing',   risk: 'Low' },
    { client: 'Unilever',  revUSDm:  450, trend: 'Growing',   risk: 'Low' },
  ],
  marginBridge: [
    { factor: '− Gross margin compression',  bps: -130 },
    { factor: '− SG&A creep',                bps:  -30 },
    { factor: '− R&D / Innovation',          bps:  -20 },
  ],
  marginBridgeStart: { label: 'FY23 Op Margin', value: 25.3 },
  marginBridgeEnd:   { label: 'FY24 Op Margin', value: 23.5 },
  balanceSheet: [
    { metric: 'Cash (USDm)',                 fy24: '3,200', fy23: '2,800', fy22: '2,500' },
    { metric: 'Debt (USDm)',                 fy24: '0',     fy23: '0',     fy22: '0'     },
    { metric: 'Net Cash (USDm)',             fy24: '3,200', fy23: '2,800', fy22: '2,500' },
    { metric: 'FCF (USDm)',                  fy24: '4,800', fy23: '4,600', fy22: '4,900' },
    { metric: 'FCF Yield',                   fy24: '2.7%',  fy23: '2.9%',  fy22: '3.2%'  },
    { metric: 'Dividend + Buyback (USDm)',   fy24: '4,500', fy23: '4,200', fy22: '3,800' },
    { metric: 'ROE',                         fy24: '42%',   fy23: '45%',   fy22: '47%'   },
  ],
  threats: [
    { threat: 'BFSI spending freeze',       severity: 9, timeline: 'Now',     mitigation: 'Vertical diversification (slow)', residual: 7 },
    { threat: 'Agentic coding',             severity: 9, timeline: '2026-28', mitigation: 'Ignio (insufficient)',            residual: 7 },
    { threat: 'Client insourcing',          severity: 8, timeline: '2025-27', mitigation: 'Consulting pivot (nascent)',      residual: 6 },
    { threat: 'CEO transition disruption',  severity: 6, timeline: 'Now',     mitigation: 'Krithivasan settling',            residual: 4 },
    { threat: 'Tata group politics',        severity: 5, timeline: 'Ongoing', mitigation: 'Capital allocation discipline',   residual: 4 },
  ],
  bullCase: [
    'Best cash generation: $4.8B FCF, $3.2B net cash, 95%+ payout',
    'Strongest brand — TCS is synonymous with Indian IT',
    'Largest scale — 614K employees, 100+ clients >$10M',
    'Highest ROE — 42%',
    'Krithivasan pushing consulting (target $5B by FY27)',
    'Ignio competes legitimately in AIOps with $600M ARR',
  ],
  bearCase: [
    'Revenue SHRINKING absolutely (-2.7% YoY in FY24)',
    'BFSI (35%) + Comms (11%) = 46% of revenue, both declining 4-7%',
    '53% of services in declining lines (Maintenance/AppDev/Infra)',
    'Top-client revenue at HIGH/VERY HIGH risk = $3.5B',
    'Worst margin erosion in Big 3 (−180bps YoY)',
    'Ignio trapped — too strategic to sell, too small to matter',
    'Consulting only $1.8B vs Accenture $35B / Deloitte $25B',
    'Dividend at risk in 2-3 years if revenue keeps shrinking',
  ],
  recursive: '"TCS optimised for the old world so perfectly that they cannot adapt to the new world." Every process, every incentive, every promotion is built around headcount utilization — the exact metric AI destroys. The Ignio Trap is illustrative: management cannot scale the platform without cannibalising the services revenue base, so it stays stuck. The dividend trap compounds it: 95% payout ratio means any structural revenue decline forces a cut, which would trigger a 20%+ rerating.',
  valuation: {
    sharesB: 3.6,
    currentPriceLocal: 4100,
    priceCurrency: 'INR',
    netCashUSDb: 3.2,
    waccDefault: 11.0,
    terminalGrowthDefault: 3.5,
    forecast: [
      { fy: 'FY25', revenueUSDb: 28.5, opMargin: 22.0, fcfUSDb: 4.4 },
      { fy: 'FY26', revenueUSDb: 27.8, opMargin: 21.0, fcfUSDb: 4.1 },
      { fy: 'FY27', revenueUSDb: 28.2, opMargin: 21.5, fcfUSDb: 4.2 },
      { fy: 'FY28', revenueUSDb: 29.5, opMargin: 22.0, fcfUSDb: 4.5 },
      { fy: 'FY29', revenueUSDb: 31.0, opMargin: 22.5, fcfUSDb: 4.8 },
      { fy: 'FY30', revenueUSDb: 32.8, opMargin: 23.0, fcfUSDb: 5.2 },
    ],
    sotp: [
      { segment: 'Legacy Services (53%)', revenueUSDb: 15.5, multiple: 1.0, basis: 'rev' },
      { segment: 'Digital Services (37%)', revenueUSDb: 10.8, multiple: 2.0, basis: 'rev' },
      { segment: 'Ignio (5%)',              revenueUSDb:  1.5, multiple: 5.0, basis: 'rev' },
      { segment: 'Consulting (5%)',         revenueUSDb:  1.8, multiple: 3.0, basis: 'rev' },
    ],
    sotpFY27: [
      { segment: 'Legacy (45%)',     revenueUSDb: 12.7, multiple: 0.9, basis: 'rev' },
      { segment: 'Digital (40%)',    revenueUSDb: 11.3, multiple: 2.0, basis: 'rev' },
      { segment: 'Ignio (8%)',       revenueUSDb:  2.3, multiple: 6.0, basis: 'rev' },
      { segment: 'Consulting (7%)',  revenueUSDb:  2.0, multiple: 3.5, basis: 'rev' },
    ],
    scenarios: [
      { name: 'Bull', probability: 15, fairLocal: 4800, commentary: 'Consulting scales, Ignio breakout, BFSI recovers' },
      { name: 'Base', probability: 50, fairLocal: 3500, commentary: 'Managed decline, dividend maintained, slow death' },
      { name: 'Bear', probability: 35, fairLocal: 2400, commentary: 'Structural collapse, dividend cut, re-rating to 12x' },
    ],
    relativeMultiples: [
      { peer: 'TCS',       pe: 28, evEbitda: 20, pFcf: 28 },
      { peer: 'Infosys',   pe: 25, evEbitda: 18, pFcf: 26 },
      { peer: 'HCLTech',   pe: 21, evEbitda: 15, pFcf: 22 },
      { peer: 'Cognizant', pe: 17, evEbitda: 12, pFcf: 18 },
      { peer: 'Accenture', pe: 24, evEbitda: 17, pFcf: 23 },
    ],
  },
};

export const COMPANIES: Record<CompanyKey, CompanyAutopsy> = {
  infosys: INFOSYS,
  hcltech: HCLTECH,
  tcs: TCS_AUTOPSY,
};

// ─── Industry-level scenarios & portfolio ─────────────────────────────────────
export const INDUSTRY_SCENARIOS = [
  {
    name: 'A — Soft Landing',
    probability: 40,
    headline: 'AI productivity gains absorbed by price cuts, not headcount',
    revenueFY27USDb: '$250-260B',
    headcountFY27M: 4.5,
    marginFY27Pct: 23,
    multipleRange: '18-20x P/E',
    portfolio: '60% Infosys, 30% HCLTech, 10% Persistent',
  },
  {
    name: 'B — Hard Reset',
    probability: 35,
    headline: 'Rapid AI adoption, 30% revenue compression by FY28',
    revenueFY27USDb: '$180-200B',
    headcountFY27M: 3.8,
    marginFY27Pct: 17,
    multipleRange: '12-15x P/E (distress)',
    portfolio: '40% Infosys, 40% HCLTech, 20% cash (wait for blood)',
  },
  {
    name: 'C — AI Boom',
    probability: 25,
    headline: 'Indian IT becomes global AI-services leader',
    revenueFY27USDb: '$310-350B by FY30',
    headcountFY27M: 3.0,
    marginFY27Pct: 28,
    multipleRange: '25-30x P/E for leaders',
    portfolio: '30% Infosys, 30% Persistent, 20% LTIMindtree, 20% TCS',
  },
];

export const RECOMMENDED_PORTFOLIO = [
  { allocation: 35, ticker: 'Infosys',     rationale: 'Best management, best AI platform, reasonable valuation' },
  { allocation: 25, ticker: 'HCLTech',     rationale: 'Undervalued, ERS moat, high dividend' },
  { allocation: 15, ticker: 'Persistent',  rationale: 'Long-term compounder, software product engineering' },
  { allocation: 10, ticker: 'LTIMindtree', rationale: 'Digital pure-play, if valuation corrects' },
  { allocation: 15, ticker: 'Cash',        rationale: 'Dry powder for Scenario B bloodbath' },
];

export const KEY_METRICS_TO_TRACK = [
  'Revenue per employee (declining = bad)',
  'Digital revenue % (rising = good)',
  'AI services revenue (new line item)',
  'Utilization rate (below 80% = danger)',
  'Attrition rate (rising = cultural rot)',
  'Large deal TCV (below $500M / quarter = pipeline weak)',
  'Client concentration (top-10 client revenue %)',
  'Offshore revenue ratio (declining = model shift)',
];

export const PHILOSOPHICAL_FUTURES = [
  { name: 'Future 1 — Platform Play',         probability: 20, summary: 'IT firms become AI-platform companies (à la Salesforce). Topaz / Ignio / DRYiCE become standalone SaaS. Outcome: 5-10x rerating if successful.' },
  { name: 'Future 2 — Human-in-the-Loop',     probability: 50, summary: 'AI does 80%, humans do 20% (oversight, ethics, governance). Margin expansion + valuation compression.' },
  { name: 'Future 3 — Commodity Death Spiral', probability: 20, summary: 'AI commoditises everything; firms become glorified staffing for AI oversight. Margins collapse to 5-8%.' },
  { name: 'Future 4 — Reinvention',            probability: 10, summary: 'New TAM: AI training data, governance, ethics audit. Entirely new business model.' },
];
