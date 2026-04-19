// Multi-company financial profiles for generic valuation framework.
// Covers: ITC, TCS, HUL, Kansai Nerolac, VST Industries, Reliance Industries,
// HDFC Bank, Infosys, Maruti Suzuki, Sun Pharma.
//
// Data sources: FY21-FY25 published annual results; H1 FY26 filings where
// available. Numbers in INR crore unless otherwise noted. Share counts in
// crore (10 million). All companies use INR / Indian FY (April-March).

export interface HistoricalYear {
  fy: string;
  revenue: number;
  ebitda: number;
  ebit: number;
  pat: number;
  eps: number;
  dps: number;
  capex: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  netDebt: number; // negative = net cash
  totalAssets: number;
  investedCapital: number;
}

export interface CompanySegment {
  name: string;
  fy25Revenue: number;
  fy25Ebit: number;
  fy25Margin: number; // %
  targetMultiple: number; // EV/EBIT range midpoint
  multipleLow: number;
  multipleHigh: number;
  growthOutlook: string;
  share: number; // % of total revenue
}

export interface GenericAssumptions {
  revenueGrowthCAGR: number; // % projection period
  revenueGrowthY1: number;   // % first projected year
  terminalGrowth: number;    // % perpetuity
  targetEbitdaMargin: number; // % terminal
  taxRate: number;           // %
  wacc: number;              // %
  costOfEquity: number;      // % for DDM
  daPercentRevenue: number;  // % depreciation
  capexPercentRevenue: number;
  workingCapitalIntensity: number; // % of revenue growth reinvested in WC
  projectionYears: number;
  payoutRatio: number;       // %
  dividendGrowthNearTerm: number; // %
  dividendGrowthTerminal: number; // %
  conglomerateDiscount: number;   // %
}

export interface GenericPeer {
  name: string;
  ticker: string;
  category:
    | 'IndianFMCG'
    | 'GlobalTobacco'
    | 'IndianTobacco'
    | 'IndianIT'
    | 'GlobalIT'
    | 'IndianPaints'
    | 'GlobalPaints'
    | 'IndianStaples'
    | 'IndianBank'
    | 'GlobalBank'
    | 'IndianOilGas'
    | 'GlobalOilGas'
    | 'IndianAuto'
    | 'GlobalAuto'
    | 'IndianPharma'
    | 'GlobalPharma'
    | 'IndianRetail';
  marketCapCr: number;
  evEbitda: number;
  pe: number;
  dividendYield: number;
  roic: number;
  note: string;
}

export interface GenericScenarioOverride {
  id: string;
  label: string;
  probability: number; // 0-1
  description: string;
  color: string;
  overrides: Partial<GenericAssumptions>;
}

export interface CompanyProfile {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  tagline: string;
  accentColor: string; // hex for charts/badges
  currentMarketPrice: number;
  targetPriceRange: { low: number; base: number; high: number };
  sharesOutstandingCr: number;
  netCashCr: number; // positive = net cash
  reportingCurrency: 'INR';

  historical: HistoricalYear[];
  segments: CompanySegment[];
  assumptions: GenericAssumptions;
  peers: GenericPeer[];
  scenarios: GenericScenarioOverride[];

  keyDrivers: string[];
  keyRisks: string[];
  recentHighlights: string[];
  thesisShort: string;
}

// ==========================================================================
// ITC LIMITED (shadow profile for the universe lab - detailed model stays
// in itcModel.ts; this is a compact projection-ready variant)
// ==========================================================================
const ITC: CompanyProfile = {
  id: 'itc',
  ticker: 'ITC',
  name: 'ITC Limited',
  sector: 'Diversified FMCG / Tobacco',
  tagline: 'Dominant cigarette franchise + scaling FMCG + paper + agri',
  accentColor: '#C2410C',
  currentMarketPrice: 475,
  targetPriceRange: { low: 420, base: 525, high: 600 },
  sharesOutstandingCr: 1251,
  netCashCr: 35000,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 49273, ebitda: 18580, ebit: 16480, pat: 13032, eps: 10.6, dps: 10.75, capex: 2200, operatingCashFlow: 15400, freeCashFlow: 13200, netDebt: -28500, totalAssets: 76800, investedCapital: 48300 },
    { fy: 'FY22', revenue: 60645, ebitda: 21710, ebit: 19020, pat: 15058, eps: 12.2, dps: 11.50, capex: 2380, operatingCashFlow: 16800, freeCashFlow: 14420, netDebt: -30500, totalAssets: 82500, investedCapital: 52000 },
    { fy: 'FY23', revenue: 70251, ebitda: 24915, ebit: 21920, pat: 18754, eps: 15.1, dps: 13.75, capex: 2560, operatingCashFlow: 19200, freeCashFlow: 16640, netDebt: -32000, totalAssets: 87500, investedCapital: 55000 },
    { fy: 'FY24', revenue: 69446, ebitda: 26200, ebit: 23230, pat: 20458, eps: 16.4, dps: 13.75, capex: 2780, operatingCashFlow: 20800, freeCashFlow: 18020, netDebt: -33500, totalAssets: 92800, investedCapital: 58500 },
    { fy: 'FY25', revenue: 76600, ebitda: 28450, ebit: 25100, pat: 19808, eps: 15.8, dps: 14.35, capex: 3100, operatingCashFlow: 22100, freeCashFlow: 19000, netDebt: -35000, totalAssets: 98500, investedCapital: 62000 },
  ],
  segments: [
    { name: 'Cigarettes', fy25Revenue: 34800, fy25Ebit: 20530, fy25Margin: 59.0, targetMultiple: 10.5, multipleLow: 9.0, multipleHigh: 12.0, growthOutlook: '2-4% vol + 4-5% pricing; tax hike risk', share: 45.4 },
    { name: 'FMCG', fy25Revenue: 23100, fy25Ebit: 2560, fy25Margin: 11.1, targetMultiple: 30, multipleLow: 24, multipleHigh: 36, growthOutlook: 'Scale benefits; margin expansion ongoing', share: 30.2 },
    { name: 'Paper & Packaging', fy25Revenue: 8600, fy25Ebit: 1180, fy25Margin: 13.7, targetMultiple: 8, multipleLow: 6, multipleHigh: 10, growthOutlook: 'Wood cost pressure; import dumping drag', share: 11.2 },
    { name: 'Agri Business', fy25Revenue: 18800, fy25Ebit: 1690, fy25Margin: 9.0, targetMultiple: 12, multipleLow: 10, multipleHigh: 14, growthOutlook: 'Value-added exports; climate volatility', share: 24.5 },
    { name: 'Infotech (ITC Infotech)', fy25Revenue: 3600, fy25Ebit: 720, fy25Margin: 20.0, targetMultiple: 16, multipleLow: 14, multipleHigh: 18, growthOutlook: 'Digital & GenAI pipeline; margin accretive', share: 4.7 },
  ],
  assumptions: {
    revenueGrowthCAGR: 8.5,
    revenueGrowthY1: 9.0,
    terminalGrowth: 4.5,
    targetEbitdaMargin: 38,
    taxRate: 25,
    wacc: 12,
    costOfEquity: 12.5,
    daPercentRevenue: 2.4,
    capexPercentRevenue: 4.0,
    workingCapitalIntensity: 12,
    projectionYears: 7,
    payoutRatio: 90,
    dividendGrowthNearTerm: 9,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 10,
  },
  peers: [
    { name: 'Hindustan Unilever', ticker: 'HINDUNILVR', category: 'IndianFMCG', marketCapCr: 570000, evEbitda: 38, pe: 55, dividendYield: 1.7, roic: 90, note: 'FMCG leader' },
    { name: 'Nestle India', ticker: 'NESTLEIND', category: 'IndianFMCG', marketCapCr: 225000, evEbitda: 52, pe: 75, dividendYield: 1.2, roic: 150, note: 'Premium staples' },
    { name: 'Britannia', ticker: 'BRITANNIA', category: 'IndianFMCG', marketCapCr: 135000, evEbitda: 42, pe: 60, dividendYield: 1.4, roic: 60, note: 'Biscuits leader' },
    { name: 'Dabur India', ticker: 'DABUR', category: 'IndianFMCG', marketCapCr: 100000, evEbitda: 36, pe: 50, dividendYield: 1.0, roic: 40, note: 'Ayurveda & health' },
    { name: 'Philip Morris', ticker: 'PM', category: 'GlobalTobacco', marketCapCr: 1200000, evEbitda: 14, pe: 20, dividendYield: 4.5, roic: 40, note: 'Marlboro + IQOS' },
    { name: 'BAT', ticker: 'BTI', category: 'GlobalTobacco', marketCapCr: 650000, evEbitda: 9, pe: 10, dividendYield: 8.5, roic: 15, note: 'Value trap' },
    { name: 'Altria', ticker: 'MO', category: 'GlobalTobacco', marketCapCr: 800000, evEbitda: 9.5, pe: 12, dividendYield: 7.0, roic: 30, note: 'US tobacco' },
    { name: 'VST Industries', ticker: 'VSTIND', category: 'IndianTobacco', marketCapCr: 4480, evEbitda: 13, pe: 16, dividendYield: 5.5, roic: 40, note: 'Smaller cig peer' },
  ],
  scenarios: [
    { id: 'bear', label: 'Bear (Tax Shock)', probability: 0.20, description: 'GST rate hike to 45%, illicit surge, FMCG margin stall', color: '#DC2626', overrides: { revenueGrowthCAGR: 3.5, targetEbitdaMargin: 33, wacc: 13 } },
    { id: 'base', label: 'Base', probability: 0.50, description: 'Moderate vol growth + steady pricing + FMCG scaleup', color: '#2563EB', overrides: {} },
    { id: 'bull', label: 'Bull', probability: 0.20, description: 'Stable taxes, FMCG >15% margin, paper recovery', color: '#16A34A', overrides: { revenueGrowthCAGR: 11.5, targetEbitdaMargin: 41, wacc: 11.5 } },
    { id: 'stress', label: 'Budget 2026 Shock', probability: 0.10, description: '28→40% GST implementation; 12% volume decline', color: '#7C2D12', overrides: { revenueGrowthCAGR: 2.0, targetEbitdaMargin: 32, wacc: 13.5 } },
  ],
  keyDrivers: [
    'Cigarette pricing power offsetting tax hikes',
    'FMCG operating leverage: target 15% EBITDA margin',
    'Hotels demerged FY25 - clean conglomerate narrative',
    'Agri value-addition and export mix',
    'Paper margin normalization post wood/import pressure',
  ],
  keyRisks: [
    'Union Budget 2026: GST 28→40% compensation cess',
    'Illicit cigarette trade at 25-30% of market',
    'FMCG competitive intensity (HUL, Nestle, D2C)',
    'Climate-driven wood cost for paper segment',
  ],
  recentHighlights: [
    'FY25 revenue +10.2% YoY; EBITDA margin 37.1%',
    'Hotels demerger completed Jan 2025 (1:10)',
    'Q2 FY26: cigarette volumes +6% YoY',
    'FMCG Q2 FY26 EBITDA margin 11.4%, ex-non-cig peers',
  ],
  thesisShort: 'Mispriced defensive compounder with optionality in FMCG re-rating once cigarette tax overhang resolves.',
};

// ==========================================================================
// TATA CONSULTANCY SERVICES
// ==========================================================================
const TCS: CompanyProfile = {
  id: 'tcs',
  ticker: 'TCS',
  name: 'Tata Consultancy Services',
  sector: 'IT Services',
  tagline: 'Global #2 IT services with deep BFSI & GenAI lead',
  accentColor: '#1D4ED8',
  currentMarketPrice: 3420,
  targetPriceRange: { low: 3100, base: 3800, high: 4400 },
  sharesOutstandingCr: 361.8,
  netCashCr: 45000,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 164177, ebitda: 48300, ebit: 41993, pat: 32430, eps: 86.7, dps: 38.0, capex: 2150, operatingCashFlow: 38800, freeCashFlow: 36650, netDebt: -35000, totalAssets: 121000, investedCapital: 72000 },
    { fy: 'FY22', revenue: 191754, ebitda: 54850, ebit: 48453, pat: 38449, eps: 104.0, dps: 43.0, capex: 2520, operatingCashFlow: 39200, freeCashFlow: 36680, netDebt: -38000, totalAssets: 132000, investedCapital: 78000 },
    { fy: 'FY23', revenue: 225458, ebitda: 61400, ebit: 54569, pat: 42147, eps: 115.2, dps: 75.0, capex: 2820, operatingCashFlow: 42100, freeCashFlow: 39280, netDebt: -30000, totalAssets: 142000, investedCapital: 83000 },
    { fy: 'FY24', revenue: 240893, ebitda: 66100, ebit: 58787, pat: 45908, eps: 126.9, dps: 73.0, capex: 3050, operatingCashFlow: 44200, freeCashFlow: 41150, netDebt: -40000, totalAssets: 151000, investedCapital: 87000 },
    { fy: 'FY25', revenue: 255324, ebitda: 70200, ebit: 62044, pat: 48553, eps: 134.2, dps: 126.0, capex: 3380, operatingCashFlow: 46500, freeCashFlow: 43120, netDebt: -45000, totalAssets: 158000, investedCapital: 91000 },
  ],
  segments: [
    { name: 'BFSI', fy25Revenue: 82200, fy25Ebit: 20550, fy25Margin: 25.0, targetMultiple: 22, multipleLow: 19, multipleHigh: 25, growthOutlook: 'Steady recovery in banking; credit-driven ramp', share: 32.2 },
    { name: 'Consumer Business', fy25Revenue: 40900, fy25Ebit: 9820, fy25Margin: 24.0, targetMultiple: 21, multipleLow: 18, multipleHigh: 24, growthOutlook: 'Retail tech spend tepid; premiumisation trend', share: 16.0 },
    { name: 'Communications & Media', fy25Revenue: 31400, fy25Ebit: 7230, fy25Margin: 23.0, targetMultiple: 20, multipleLow: 17, multipleHigh: 23, growthOutlook: 'Telecom capex cycle weak; media steady', share: 12.3 },
    { name: 'Manufacturing', fy25Revenue: 24600, fy25Ebit: 6150, fy25Margin: 25.0, targetMultiple: 22, multipleLow: 19, multipleHigh: 25, growthOutlook: 'Industrial digital & ER&D strong', share: 9.6 },
    { name: 'Technology & Services', fy25Revenue: 22500, fy25Ebit: 5860, fy25Margin: 26.0, targetMultiple: 23, multipleLow: 20, multipleHigh: 26, growthOutlook: 'Hyperscaler & GenAI partnerships', share: 8.8 },
    { name: 'Life Sciences & Healthcare', fy25Revenue: 27500, fy25Ebit: 7160, fy25Margin: 26.0, targetMultiple: 24, multipleLow: 21, multipleHigh: 27, growthOutlook: 'Pharma R&D digitalization', share: 10.8 },
    { name: 'Regional Markets & Others', fy25Revenue: 26200, fy25Ebit: 5274, fy25Margin: 20.1, targetMultiple: 18, multipleLow: 15, multipleHigh: 21, growthOutlook: 'India, Japan, MEA - long runway', share: 10.3 },
  ],
  assumptions: {
    revenueGrowthCAGR: 8.5,
    revenueGrowthY1: 6.5,
    terminalGrowth: 5.0,
    targetEbitdaMargin: 28,
    taxRate: 25,
    wacc: 11.5,
    costOfEquity: 12.0,
    daPercentRevenue: 3.2,
    capexPercentRevenue: 1.3,
    workingCapitalIntensity: 18,
    projectionYears: 7,
    payoutRatio: 90,
    dividendGrowthNearTerm: 10,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'Infosys', ticker: 'INFY', category: 'IndianIT', marketCapCr: 700000, evEbitda: 19, pe: 28, dividendYield: 2.4, roic: 35, note: 'Closest peer' },
    { name: 'HCL Tech', ticker: 'HCLTECH', category: 'IndianIT', marketCapCr: 440000, evEbitda: 17, pe: 25, dividendYield: 3.5, roic: 28, note: 'Infra + engineering' },
    { name: 'Wipro', ticker: 'WIPRO', category: 'IndianIT', marketCapCr: 260000, evEbitda: 14, pe: 22, dividendYield: 1.2, roic: 18, note: 'Turnaround in progress' },
    { name: 'LTIMindtree', ticker: 'LTIM', category: 'IndianIT', marketCapCr: 170000, evEbitda: 22, pe: 32, dividendYield: 1.0, roic: 30, note: 'Mid-tier digital' },
    { name: 'Accenture', ticker: 'ACN', category: 'GlobalIT', marketCapCr: 2700000, evEbitda: 17, pe: 28, dividendYield: 1.6, roic: 30, note: 'Global consulting' },
    { name: 'Cognizant', ticker: 'CTSH', category: 'GlobalIT', marketCapCr: 320000, evEbitda: 11, pe: 17, dividendYield: 1.5, roic: 20, note: 'Turnaround story' },
    { name: 'Capgemini', ticker: 'CAP', category: 'GlobalIT', marketCapCr: 230000, evEbitda: 10, pe: 15, dividendYield: 2.6, roic: 18, note: 'European consulting' },
  ],
  scenarios: [
    { id: 'bear', label: 'Bear (US Recession)', probability: 0.22, description: 'BFSI discretionary freeze; pricing pressure; margin -150bps', color: '#DC2626', overrides: { revenueGrowthCAGR: 3.0, targetEbitdaMargin: 25, wacc: 12.5 } },
    { id: 'base', label: 'Base', probability: 0.50, description: 'Gradual recovery; BFSI normalization; steady 7-9% USD growth', color: '#2563EB', overrides: {} },
    { id: 'bull', label: 'Bull (GenAI Wave)', probability: 0.22, description: 'GenAI-led 12%+ growth; margin expansion back to 27%', color: '#16A34A', overrides: { revenueGrowthCAGR: 12, targetEbitdaMargin: 30, wacc: 11 } },
    { id: 'stress', label: 'Offshoring Pushback', probability: 0.06, description: 'US H-1B/onshoring regulation hits TCS margins hardest', color: '#7C2D12', overrides: { revenueGrowthCAGR: 2, targetEbitdaMargin: 23, wacc: 13 } },
  ],
  keyDrivers: [
    'BFSI vertical cycle recovery (32% of revenue)',
    'GenAI deal pipeline monetization',
    'India operations scale-up (fastest growing)',
    'Margin defense via pyramid + utilization',
    'Tata BSNL deal ramp and renewal pipeline',
  ],
  keyRisks: [
    'Persistent BFSI discretionary freeze',
    'Wage inflation vs pricing power',
    'US protectionism/H-1B tightening',
    'GenAI disintermediation of routine services',
  ],
  recentHighlights: [
    'Q2 FY26: Revenue ₹65,799 Cr, op margin 25.2%',
    'Q2 FY26: Net income ₹12,904 Cr (+1.4% QoQ CC)',
    'Record FY25 TCV; BSNL deal progressing',
    'Final dividend ₹30 + interim ₹75 + special ₹10 in FY25',
  ],
  thesisShort: 'Quality compounder trading at cycle-low multiples as BFSI recovery + GenAI deals re-accelerate growth.',
};

// ==========================================================================
// HINDUSTAN UNILEVER
// ==========================================================================
const HUL: CompanyProfile = {
  id: 'hul',
  ticker: 'HINDUNILVR',
  name: 'Hindustan Unilever',
  sector: 'FMCG - Personal Care & Foods',
  tagline: 'Largest Indian FMCG with a premiumisation + rural-revival playbook',
  accentColor: '#0F766E',
  currentMarketPrice: 2420,
  targetPriceRange: { low: 2250, base: 2700, high: 3050 },
  sharesOutstandingCr: 235,
  netCashCr: 6200,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 47028, ebitda: 11100, ebit: 10080, pat: 7954, eps: 33.9, dps: 25.0, capex: 680, operatingCashFlow: 9580, freeCashFlow: 8900, netDebt: -4100, totalAssets: 75200, investedCapital: 58500 },
    { fy: 'FY22', revenue: 52446, ebitda: 12200, ebit: 10900, pat: 8892, eps: 37.8, dps: 34.0, capex: 760, operatingCashFlow: 10400, freeCashFlow: 9640, netDebt: -4600, totalAssets: 71500, investedCapital: 55000 },
    { fy: 'FY23', revenue: 59579, ebitda: 13900, ebit: 12350, pat: 10143, eps: 43.2, dps: 39.0, capex: 880, operatingCashFlow: 11200, freeCashFlow: 10320, netDebt: -5000, totalAssets: 73000, investedCapital: 55800 },
    { fy: 'FY24', revenue: 60580, ebitda: 14500, ebit: 12900, pat: 10277, eps: 43.7, dps: 42.0, capex: 920, operatingCashFlow: 11800, freeCashFlow: 10880, netDebt: -5600, totalAssets: 74500, investedCapital: 56500 },
    { fy: 'FY25', revenue: 60680, ebitda: 14600, ebit: 12980, pat: 10644, eps: 45.3, dps: 53.0, capex: 1010, operatingCashFlow: 12100, freeCashFlow: 11090, netDebt: -6200, totalAssets: 75800, investedCapital: 57200 },
  ],
  segments: [
    { name: 'Home Care', fy25Revenue: 22972, fy25Ebit: 4365, fy25Margin: 19.0, targetMultiple: 28, multipleLow: 24, multipleHigh: 32, growthOutlook: 'Detergents market leader; premiumisation + liquids', share: 37.9 },
    { name: 'Beauty & Wellbeing', fy25Revenue: 13350, fy25Ebit: 3740, fy25Margin: 28.0, targetMultiple: 35, multipleLow: 30, multipleHigh: 40, growthOutlook: 'Core growth engine; Ponds, Sunsilk, premium BPC', share: 22.0 },
    { name: 'Personal Care', fy25Revenue: 10300, fy25Ebit: 2365, fy25Margin: 23.0, targetMultiple: 30, multipleLow: 26, multipleHigh: 34, growthOutlook: 'Oral care + skin cleansing; rural pressure', share: 17.0 },
    { name: 'Foods', fy25Revenue: 14058, fy25Ebit: 2510, fy25Margin: 17.9, targetMultiple: 32, multipleLow: 28, multipleHigh: 36, growthOutlook: 'Horlicks + tea premium; ice-cream demerged FY26', share: 23.1 },
  ],
  assumptions: {
    revenueGrowthCAGR: 7.5,
    revenueGrowthY1: 5.0,
    terminalGrowth: 5.0,
    targetEbitdaMargin: 25,
    taxRate: 25,
    wacc: 11,
    costOfEquity: 11.5,
    daPercentRevenue: 1.8,
    capexPercentRevenue: 1.6,
    workingCapitalIntensity: -5, // negative WC cycle
    projectionYears: 7,
    payoutRatio: 95,
    dividendGrowthNearTerm: 8,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'ITC', ticker: 'ITC', category: 'IndianFMCG', marketCapCr: 595000, evEbitda: 22, pe: 30, dividendYield: 3.0, roic: 35, note: 'Diversified FMCG' },
    { name: 'Nestle India', ticker: 'NESTLEIND', category: 'IndianFMCG', marketCapCr: 225000, evEbitda: 52, pe: 75, dividendYield: 1.2, roic: 150, note: 'Premium staples' },
    { name: 'Britannia', ticker: 'BRITANNIA', category: 'IndianFMCG', marketCapCr: 135000, evEbitda: 42, pe: 60, dividendYield: 1.4, roic: 60, note: 'Biscuits leader' },
    { name: 'Dabur India', ticker: 'DABUR', category: 'IndianFMCG', marketCapCr: 100000, evEbitda: 36, pe: 50, dividendYield: 1.0, roic: 40, note: 'Ayurveda & health' },
    { name: 'Marico', ticker: 'MARICO', category: 'IndianFMCG', marketCapCr: 87000, evEbitda: 35, pe: 48, dividendYield: 1.3, roic: 38, note: 'Hair + edible oil' },
    { name: 'Godrej Consumer', ticker: 'GCPL', category: 'IndianFMCG', marketCapCr: 120000, evEbitda: 30, pe: 48, dividendYield: 1.1, roic: 25, note: 'Home & personal care' },
    { name: 'Procter & Gamble', ticker: 'PGHH', category: 'IndianFMCG', marketCapCr: 51000, evEbitda: 45, pe: 62, dividendYield: 1.8, roic: 55, note: 'Premium BPC' },
  ],
  scenarios: [
    { id: 'bear', label: 'Bear (Rural Lag)', probability: 0.25, description: 'Monsoon failure + competitive intensity; margin stall', color: '#DC2626', overrides: { revenueGrowthCAGR: 3.5, targetEbitdaMargin: 22, wacc: 12 } },
    { id: 'base', label: 'Base', probability: 0.50, description: 'Gradual rural recovery + premiumisation + price stable', color: '#2563EB', overrides: {} },
    { id: 'bull', label: 'Bull (Rural Revival)', probability: 0.20, description: 'Strong monsoons + wage rebound + premiumisation', color: '#16A34A', overrides: { revenueGrowthCAGR: 11, targetEbitdaMargin: 27, wacc: 10.5 } },
    { id: 'stress', label: 'Input Cost Shock', probability: 0.05, description: 'Palm oil, crude, tea spike >40% - temporary margin reset', color: '#7C2D12', overrides: { revenueGrowthCAGR: 5, targetEbitdaMargin: 20, wacc: 12 } },
  ],
  keyDrivers: [
    'Premiumisation in BPC and foods (core margin story)',
    'Rural recovery (40% of business)',
    'Ice cream demerger simplifies portfolio',
    'Home Care market leadership + liquids shift',
    'Minimact and D2C channel growth',
  ],
  keyRisks: [
    'Persistent rural slowdown',
    'Input cost volatility (palm oil, crude, tea)',
    'D2C and premium BPC competitive intensity',
    'Regulation on HFSS foods',
  ],
  recentHighlights: [
    'FY25 turnover ₹60,680 Cr; PAT ₹10,644 Cr',
    'Q2 FY26 (Dec 2025) revenue ₹16,235 Cr',
    'Ice-cream demerger completed H1 FY26',
    'Final dividend ₹24/share for FY25',
  ],
  thesisShort: 'High-quality FMCG franchise trading at cycle-low multiples; catalyst = rural recovery + ice-cream demerger clarity.',
};

// ==========================================================================
// KANSAI NEROLAC PAINTS
// ==========================================================================
const NEROLAC: CompanyProfile = {
  id: 'nerolac',
  ticker: 'KANSAINER',
  name: 'Kansai Nerolac Paints',
  sector: 'Paints & Coatings',
  tagline: '#3 decorative + dominant auto coatings franchise',
  accentColor: '#B45309',
  currentMarketPrice: 235,
  targetPriceRange: { low: 210, base: 280, high: 335 },
  sharesOutstandingCr: 80.85,
  netCashCr: 1400,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 5234, ebitda: 852, ebit: 695, pat: 471, eps: 5.82, dps: 2.85, capex: 150, operatingCashFlow: 620, freeCashFlow: 470, netDebt: -950, totalAssets: 5100, investedCapital: 3800 },
    { fy: 'FY22', revenue: 6419, ebitda: 728, ebit: 560, pat: 423, eps: 5.23, dps: 3.00, capex: 210, operatingCashFlow: 450, freeCashFlow: 240, netDebt: -750, totalAssets: 5550, investedCapital: 4100 },
    { fy: 'FY23', revenue: 7336, ebitda: 866, ebit: 680, pat: 584, eps: 7.22, dps: 3.25, capex: 280, operatingCashFlow: 650, freeCashFlow: 370, netDebt: -800, totalAssets: 5900, investedCapital: 4300 },
    { fy: 'FY24', revenue: 7789, ebitda: 1158, ebit: 955, pat: 843, eps: 10.42, dps: 3.75, capex: 310, operatingCashFlow: 1050, freeCashFlow: 740, netDebt: -1100, totalAssets: 6400, investedCapital: 4500 },
    { fy: 'FY25', revenue: 6998, ebitda: 965, ebit: 760, pat: 641, eps: 7.92, dps: 3.50, capex: 340, operatingCashFlow: 820, freeCashFlow: 480, netDebt: -1400, totalAssets: 6750, investedCapital: 4650 },
  ],
  segments: [
    { name: 'Decorative Paints', fy25Revenue: 4480, fy25Ebit: 380, fy25Margin: 8.5, targetMultiple: 24, multipleLow: 20, multipleHigh: 28, growthOutlook: 'Margin pressure from Birla Opus + weak demand', share: 64.0 },
    { name: 'Industrial / Auto Coatings', fy25Revenue: 1960, fy25Ebit: 255, fy25Margin: 13.0, targetMultiple: 18, multipleLow: 16, multipleHigh: 22, growthOutlook: 'Auto OEM leadership; PV cycle key', share: 28.0 },
    { name: 'Performance Coatings', fy25Revenue: 560, fy25Ebit: 85, fy25Margin: 15.2, targetMultiple: 20, multipleLow: 16, multipleHigh: 24, growthOutlook: 'Infra & marine; growing 12-15%', share: 8.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 6.5,
    revenueGrowthY1: 3.0,
    terminalGrowth: 4.5,
    targetEbitdaMargin: 15,
    taxRate: 25,
    wacc: 12,
    costOfEquity: 13.0,
    daPercentRevenue: 2.8,
    capexPercentRevenue: 4.5,
    workingCapitalIntensity: 25,
    projectionYears: 7,
    payoutRatio: 45,
    dividendGrowthNearTerm: 6,
    dividendGrowthTerminal: 4,
    conglomerateDiscount: 5,
  },
  peers: [
    { name: 'Asian Paints', ticker: 'ASIANPAINT', category: 'IndianPaints', marketCapCr: 235000, evEbitda: 34, pe: 55, dividendYield: 1.3, roic: 28, note: 'Category leader' },
    { name: 'Berger Paints', ticker: 'BERGEPAINT', category: 'IndianPaints', marketCapCr: 62000, evEbitda: 28, pe: 50, dividendYield: 0.7, roic: 24, note: '#2 decorative' },
    { name: 'Akzo Nobel India', ticker: 'AKZOINDIA', category: 'IndianPaints', marketCapCr: 15500, evEbitda: 20, pe: 30, dividendYield: 2.5, roic: 35, note: 'Premium Dulux' },
    { name: 'Indigo Paints', ticker: 'INDIGOPNTS', category: 'IndianPaints', marketCapCr: 6500, evEbitda: 18, pe: 30, dividendYield: 0.5, roic: 22, note: 'Niche challenger' },
    { name: 'Grasim (Birla Opus)', ticker: 'GRASIM', category: 'IndianPaints', marketCapCr: 190000, evEbitda: 14, pe: 20, dividendYield: 0.5, roic: 10, note: 'New entrant; capex drag' },
    { name: 'Sherwin-Williams', ticker: 'SHW', category: 'GlobalPaints', marketCapCr: 680000, evEbitda: 18, pe: 28, dividendYield: 1.0, roic: 20, note: 'Global leader' },
    { name: 'PPG Industries', ticker: 'PPG', category: 'GlobalPaints', marketCapCr: 260000, evEbitda: 13, pe: 19, dividendYield: 2.0, roic: 15, note: 'Industrial coatings' },
  ],
  scenarios: [
    { id: 'bear', label: 'Bear (Price War)', probability: 0.30, description: 'Birla Opus aggressive pricing cuts decorative margin to 6%', color: '#DC2626', overrides: { revenueGrowthCAGR: 2.0, targetEbitdaMargin: 10, wacc: 13 } },
    { id: 'base', label: 'Base', probability: 0.45, description: 'Gradual demand recovery + stable crude + auto strength', color: '#2563EB', overrides: {} },
    { id: 'bull', label: 'Bull (Auto Cycle)', probability: 0.18, description: 'Auto PV cycle + real estate upcycle + stable crude', color: '#16A34A', overrides: { revenueGrowthCAGR: 11, targetEbitdaMargin: 17, wacc: 11.5 } },
    { id: 'stress', label: 'Crude Spike', probability: 0.07, description: 'Crude $120+ drives raw material >25% of revenue', color: '#7C2D12', overrides: { revenueGrowthCAGR: 5, targetEbitdaMargin: 8, wacc: 13.5 } },
  ],
  keyDrivers: [
    'Auto OEM coatings leadership (Tata, Maruti, Hyundai)',
    'Decorative share defence vs Birla Opus',
    'Crude/TiO2 moderation to expand margins',
    'Rural & Tier-2/3 penetration push',
    'Performance coatings scale-up',
  ],
  keyRisks: [
    'Birla Opus disruption (pricing + distribution)',
    'Crude price spike (raw material 60% of COGS)',
    'Weak real estate & rural demand',
    'Auto PV slowdown',
  ],
  recentHighlights: [
    'Q3 FY26 revenue ₹2,017 Cr (+2.7% YoY)',
    'Net profit ₹121 Cr (prior year had ₹660 Cr one-off land sale)',
    'Decorative market share stable at ~13%',
    'Capex ₹340 Cr in FY25 for capacity & R&D',
  ],
  thesisShort: 'Undervalued #3 paints franchise with auto-coatings moat; downside from Birla Opus largely priced in.',
};

// ==========================================================================
// VST INDUSTRIES
// ==========================================================================
const VST: CompanyProfile = {
  id: 'vst',
  ticker: 'VSTIND',
  name: 'VST Industries',
  sector: 'Tobacco - Cigarettes',
  tagline: 'Second-largest Indian cigarette maker with stable cash flows',
  accentColor: '#991B1B',
  currentMarketPrice: 290,
  targetPriceRange: { low: 260, base: 335, high: 395 },
  sharesOutstandingCr: 15.44,
  netCashCr: 650,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 1142, ebitda: 430, ebit: 395, pat: 305, eps: 19.7, dps: 10.00, capex: 45, operatingCashFlow: 340, freeCashFlow: 295, netDebt: -450, totalAssets: 1420, investedCapital: 820 },
    { fy: 'FY22', revenue: 1278, ebitda: 445, ebit: 402, pat: 319, eps: 20.7, dps: 10.50, capex: 52, operatingCashFlow: 360, freeCashFlow: 308, netDebt: -500, totalAssets: 1520, investedCapital: 860 },
    { fy: 'FY23', revenue: 1438, ebitda: 420, ebit: 381, pat: 342, eps: 22.1, dps: 14.00, capex: 65, operatingCashFlow: 370, freeCashFlow: 305, netDebt: -520, totalAssets: 1620, investedCapital: 920 },
    { fy: 'FY24', revenue: 1397, ebitda: 395, ebit: 354, pat: 334, eps: 21.6, dps: 13.50, capex: 72, operatingCashFlow: 345, freeCashFlow: 273, netDebt: -580, totalAssets: 1720, investedCapital: 960 },
    { fy: 'FY25', revenue: 1425, ebitda: 382, ebit: 342, pat: 291, eps: 18.8, dps: 13.00, capex: 85, operatingCashFlow: 325, freeCashFlow: 240, netDebt: -650, totalAssets: 1820, investedCapital: 1010 },
  ],
  segments: [
    { name: 'Cigarettes', fy25Revenue: 1140, fy25Ebit: 308, fy25Margin: 27.0, targetMultiple: 11, multipleLow: 9, multipleHigh: 13, growthOutlook: '~10% vol rebound in H1 FY26; tax is key risk', share: 80.0 },
    { name: 'Unmanufactured Tobacco', fy25Revenue: 285, fy25Ebit: 34, fy25Margin: 12.0, targetMultiple: 7, multipleLow: 5, multipleHigh: 9, growthOutlook: 'Leaf export cycle; volatile', share: 20.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 5.5,
    revenueGrowthY1: 7.0,
    terminalGrowth: 3.5,
    targetEbitdaMargin: 28,
    taxRate: 25,
    wacc: 12.5,
    costOfEquity: 13.0,
    daPercentRevenue: 2.8,
    capexPercentRevenue: 5.5,
    workingCapitalIntensity: 10,
    projectionYears: 7,
    payoutRatio: 70,
    dividendGrowthNearTerm: 6,
    dividendGrowthTerminal: 3,
    conglomerateDiscount: 5,
  },
  peers: [
    { name: 'ITC', ticker: 'ITC', category: 'IndianTobacco', marketCapCr: 595000, evEbitda: 22, pe: 30, dividendYield: 3.0, roic: 35, note: 'Dominant cig peer' },
    { name: 'Godfrey Phillips', ticker: 'GODFRYPHLP', category: 'IndianTobacco', marketCapCr: 30000, evEbitda: 18, pe: 26, dividendYield: 1.5, roic: 32, note: 'Four Square, smaller cig' },
    { name: 'Philip Morris', ticker: 'PM', category: 'GlobalTobacco', marketCapCr: 1200000, evEbitda: 14, pe: 20, dividendYield: 4.5, roic: 40, note: 'Marlboro + IQOS' },
    { name: 'BAT', ticker: 'BTI', category: 'GlobalTobacco', marketCapCr: 650000, evEbitda: 9, pe: 10, dividendYield: 8.5, roic: 15, note: 'Value trap' },
    { name: 'Altria', ticker: 'MO', category: 'GlobalTobacco', marketCapCr: 800000, evEbitda: 9.5, pe: 12, dividendYield: 7.0, roic: 30, note: 'US tobacco' },
    { name: 'Japan Tobacco', ticker: 'JAPAF', category: 'GlobalTobacco', marketCapCr: 660000, evEbitda: 8.5, pe: 13, dividendYield: 6.0, roic: 20, note: 'APAC & EEA' },
    { name: 'Imperial Brands', ticker: 'IMBBY', category: 'GlobalTobacco', marketCapCr: 230000, evEbitda: 8, pe: 9, dividendYield: 7.5, roic: 18, note: 'Deep value' },
  ],
  scenarios: [
    { id: 'bear', label: 'Bear (Tax Shock)', probability: 0.25, description: 'GST 28→40% cess shock; 15% volume decline FY27', color: '#DC2626', overrides: { revenueGrowthCAGR: 0, targetEbitdaMargin: 22, wacc: 13.5 } },
    { id: 'base', label: 'Base', probability: 0.48, description: 'Stable tax + 3-4% volume + pricing + leaf export swings', color: '#2563EB', overrides: {} },
    { id: 'bull', label: 'Bull (Share Gain)', probability: 0.20, description: 'Share gain at mid-price segments; margin 30%+', color: '#16A34A', overrides: { revenueGrowthCAGR: 10, targetEbitdaMargin: 31, wacc: 12 } },
    { id: 'stress', label: 'Budget 2026 Shock', probability: 0.07, description: '28→40% GST + volume -12%; broad FMCG de-rating', color: '#7C2D12', overrides: { revenueGrowthCAGR: -2, targetEbitdaMargin: 20, wacc: 14 } },
  ],
  keyDrivers: [
    'Cigarette volume recovery (~10% in H1 FY26)',
    'Premium mix: Edward, Charms, Gold',
    'Leaf export realizations',
    'Capex for automation & R&D',
    'Steady dividend payout ~70%',
  ],
  keyRisks: [
    'Tax regime shift (GST 28→40%)',
    'Illicit trade 25-30% of market',
    'Leaf export price volatility',
    'ESG pressure reducing valuation multiples',
  ],
  recentHighlights: [
    'H1 FY26 cig revenue ₹729 Cr (+9.8%)',
    'H1 FY26 EBITDA ₹156 Cr (+10%)',
    'Cigarette volume +10.3% YoY to 695M/month',
    '9M FY26 cig revenue ₹1,101 Cr (+10.5%)',
  ],
  thesisShort: 'Stable cash cow at deep discount to ITC with higher yield; downside capped by dividend floor.',
};

// ==========================================================================
// RELIANCE INDUSTRIES (consolidated; post Oct-2024 1:1 bonus share count)
// ==========================================================================
const RELIANCE: CompanyProfile = {
  id: 'reliance',
  ticker: 'RELIANCE',
  name: 'Reliance Industries',
  sector: 'Oil-to-Chemicals / Digital / Retail',
  tagline: 'India\'s largest conglomerate: O2C cash cow funding Jio + Retail flywheel',
  accentColor: '#1E3A8A',
  currentMarketPrice: 1285,
  targetPriceRange: { low: 1180, base: 1460, high: 1680 },
  sharesOutstandingCr: 1353,
  netCashCr: -110000, // net debt ~₹1.1L Cr
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 486326, ebitda: 97580,  ebit: 71200,  pat: 53739, eps: 39.7, dps: 3.5, capex: 79792, operatingCashFlow: 85350, freeCashFlow: 5558,   netDebt: 161035, totalAssets: 1321212, investedCapital: 698000 },
    { fy: 'FY22', revenue: 721634, ebitda: 125687, ebit: 92300,  pat: 67845, eps: 50.1, dps: 4.0, capex: 98887, operatingCashFlow: 110920, freeCashFlow: 12033,  netDebt: 138803, totalAssets: 1482720, investedCapital: 742000 },
    { fy: 'FY23', revenue: 876396, ebitda: 154691, ebit: 110700, pat: 73670, eps: 54.4, dps: 4.5, capex: 141809, operatingCashFlow: 135460, freeCashFlow: -6349, netDebt: 110218, totalAssets: 1599589, investedCapital: 815000 },
    { fy: 'FY24', revenue: 901064, ebitda: 178677, ebit: 125000, pat: 79020, eps: 58.4, dps: 5.0, capex: 131851, operatingCashFlow: 158200, freeCashFlow: 26349,  netDebt: 116281, totalAssets: 1716623, investedCapital: 872000 },
    { fy: 'FY25', revenue: 964693, ebitda: 183422, ebit: 128000, pat: 80787, eps: 59.7, dps: 5.5, capex: 113324, operatingCashFlow: 169440, freeCashFlow: 56116,  netDebt: 110220, totalAssets: 1800000, investedCapital: 905000 },
  ],
  segments: [
    { name: 'Oil-to-Chemicals', fy25Revenue: 574000, fy25Ebit: 51660, fy25Margin: 9.0,  targetMultiple: 7,  multipleLow: 6,  multipleHigh: 9,  growthOutlook: 'Stable cash flow; refining margins cyclical', share: 59.5 },
    { name: 'Digital Services (Jio)', fy25Revenue: 131000, fy25Ebit: 32750, fy25Margin: 25.0, targetMultiple: 18, multipleLow: 15, multipleHigh: 22, growthOutlook: 'Tariff hike tailwind; 5G monetization + home broadband', share: 13.6 },
    { name: 'Retail', fy25Revenue: 330000, fy25Ebit: 19800, fy25Margin: 6.0,  targetMultiple: 28, multipleLow: 22, multipleHigh: 35, growthOutlook: 'Store rationalization done; omni + quick-commerce push', share: 27.0 }, // share intentionally high - segment figures include inter-segment
    { name: 'Oil & Gas E&P', fy25Revenue: 24000,  fy25Ebit: 14160, fy25Margin: 59.0, targetMultiple: 5,  multipleLow: 4,  multipleHigh: 7,  growthOutlook: 'KG-D6 plateau; price-cap risk', share: 2.5 },
    { name: 'Media & Others', fy25Revenue: 15000, fy25Ebit: 750,   fy25Margin: 5.0,  targetMultiple: 10, multipleLow: 8,  multipleHigh: 14, growthOutlook: 'JioHotstar scale post-merger; ad cycle weak', share: 1.6 },
  ],
  assumptions: {
    revenueGrowthCAGR: 9.0,
    revenueGrowthY1: 7.0,
    terminalGrowth: 5.0,
    targetEbitdaMargin: 20,
    taxRate: 25,
    wacc: 11.5,
    costOfEquity: 12.5,
    daPercentRevenue: 5.5,
    capexPercentRevenue: 11,
    workingCapitalIntensity: 8,
    projectionYears: 7,
    payoutRatio: 12,
    dividendGrowthNearTerm: 10,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 15,
  },
  peers: [
    { name: 'Indian Oil Corp', ticker: 'IOC',       category: 'IndianOilGas', marketCapCr: 180000, evEbitda: 5.5, pe: 8,  dividendYield: 6.5, roic: 12, note: 'Largest refiner' },
    { name: 'BPCL',            ticker: 'BPCL',      category: 'IndianOilGas', marketCapCr: 130000, evEbitda: 5,   pe: 7,  dividendYield: 5.5, roic: 14, note: 'Refining + marketing' },
    { name: 'ONGC',            ticker: 'ONGC',      category: 'IndianOilGas', marketCapCr: 340000, evEbitda: 4,   pe: 7,  dividendYield: 4.5, roic: 13, note: 'E&P major' },
    { name: 'Bharti Airtel',   ticker: 'BHARTIARTL',category: 'IndianOilGas', marketCapCr: 950000, evEbitda: 12,  pe: 45, dividendYield: 0.6, roic: 14, note: 'Telecom comp to Jio' },
    { name: 'DMart',           ticker: 'DMART',     category: 'IndianRetail', marketCapCr: 260000, evEbitda: 55,  pe: 85, dividendYield: 0.0, roic: 20, note: 'Value retail' },
    { name: 'ExxonMobil',      ticker: 'XOM',       category: 'GlobalOilGas', marketCapCr: 4500000,evEbitda: 6,   pe: 14, dividendYield: 3.4, roic: 18, note: 'Global integrated' },
    { name: 'Shell',           ticker: 'SHEL',      category: 'GlobalOilGas', marketCapCr: 2000000,evEbitda: 5,   pe: 11, dividendYield: 4.0, roic: 14, note: 'European super-major' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (GRM Collapse)',   probability: 0.22, description: 'Singapore GRM <$5, retail growth halved, Jio ARPU stalls',            color: '#DC2626', overrides: { revenueGrowthCAGR: 4.0, targetEbitdaMargin: 17, wacc: 12.5 } },
    { id: 'base',   label: 'Base',                  probability: 0.50, description: 'Jio tariff hike flows through, retail recovery, O2C mid-cycle',        color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Listing Unlock)', probability: 0.22, description: 'Jio/Retail listings crystallize SOTP, O2C margin expansion',            color: '#16A34A', overrides: { revenueGrowthCAGR: 12, targetEbitdaMargin: 23, wacc: 10.5 } },
    { id: 'stress', label: 'Capex + Leverage Shock',probability: 0.06, description: 'New energy capex overshoots with slow monetization; debt balloons',     color: '#7C2D12', overrides: { revenueGrowthCAGR: 3.0, targetEbitdaMargin: 15, wacc: 13 } },
  ],
  keyDrivers: [
    'Jio ARPU uplift from Jul-2024 tariff hike (+20%)',
    'Retail store productivity and quick-commerce ramp',
    'O2C downstream spreads + chemicals cycle',
    'Potential Jio + Retail listings crystallizing SOTP',
    'New energy giga-factories (solar, batteries, H2)',
  ],
  keyRisks: [
    'Capex intensity vs FCF conversion',
    'Refining margin cyclicality',
    'Telecom price-war recurrence',
    'Regulatory cap on domestic gas price',
  ],
  recentHighlights: [
    'FY25 revenue ₹9.65L Cr (+7% YoY); PAT ₹80,787 Cr',
    '1:1 bonus issue Oct-2024; share count doubled',
    'Jio ARPU ₹203 in Q3 FY26 (+5.9% QoQ post-tariff hike)',
    'Reliance Retail revenue +15% YoY in FY25; 3.3K store expansion',
  ],
  thesisShort: 'SOTP-driven compounder where Jio + Retail re-rating offsets O2C cyclicality; listings are the obvious catalyst.',
};

// ==========================================================================
// HDFC BANK (post HDFC Ltd merger, July 2023 - consolidated)
// Revenue line = Net Interest Income + Other Income (total operating revenue)
// EBIT proxy = Pre-Provision Operating Profit (PPOP); D&A small for banks
// ==========================================================================
const HDFCBANK: CompanyProfile = {
  id: 'hdfcbank',
  ticker: 'HDFCBANK',
  name: 'HDFC Bank',
  sector: 'Private Banking / BFSI',
  tagline: 'India\'s largest private bank; merger cost synergies + NIM recovery',
  accentColor: '#0B4F9C',
  currentMarketPrice: 1790,
  targetPriceRange: { low: 1680, base: 1980, high: 2250 },
  sharesOutstandingCr: 764,
  netCashCr: 0, // banks: not meaningful; leave neutral for EV bridge
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 90085,  ebitda: 55200,  ebit: 53330,  pat: 31117, eps: 56.6,  dps: 6.5,  capex: 1250, operatingCashFlow: 33000, freeCashFlow: 31750, netDebt: 0, totalAssets: 1746871, investedCapital: 203169 },
    { fy: 'FY22', revenue: 101520, ebitda: 61350,  ebit: 59480,  pat: 36961, eps: 66.8,  dps: 15.5, capex: 1380, operatingCashFlow: 39000, freeCashFlow: 37620, netDebt: 0, totalAssets: 2068535, investedCapital: 246772 },
    { fy: 'FY23', revenue: 118058, ebitda: 69310,  ebit: 67440,  pat: 44109, eps: 79.3,  dps: 19.0, capex: 1540, operatingCashFlow: 46500, freeCashFlow: 44960, netDebt: 0, totalAssets: 2466081, investedCapital: 280200 },
    { fy: 'FY24', revenue: 157774, ebitda: 86200,  ebit: 84265,  pat: 60812, eps: 82.0,  dps: 19.5, capex: 2100, operatingCashFlow: 63800, freeCashFlow: 61700, netDebt: 0, totalAssets: 3617623, investedCapital: 437250 },
    { fy: 'FY25', revenue: 188360, ebitda: 102500, ebit: 100460, pat: 67347, eps: 88.1,  dps: 22.0, capex: 2380, operatingCashFlow: 72000, freeCashFlow: 69620, netDebt: 0, totalAssets: 3898400, investedCapital: 478500 },
  ],
  segments: [
    { name: 'Retail Banking',     fy25Revenue: 108000, fy25Ebit: 58100, fy25Margin: 53.8, targetMultiple: 16, multipleLow: 13, multipleHigh: 19, growthOutlook: 'Unsecured + mortgage cross-sell; deposit mobilization key', share: 57.3 },
    { name: 'Wholesale Banking',  fy25Revenue: 47000,  fy25Ebit: 25850, fy25Margin: 55.0, targetMultiple: 12, multipleLow: 10, multipleHigh: 15, growthOutlook: 'Corporate credit cycle + transaction banking',               share: 25.0 },
    { name: 'Treasury',           fy25Revenue: 22000,  fy25Ebit: 11440, fy25Margin: 52.0, targetMultiple: 9,  multipleLow: 7,  multipleHigh: 11, growthOutlook: 'Yield curve normalization',                                    share: 11.7 },
    { name: 'Other Banking Ops',  fy25Revenue: 11360,  fy25Ebit: 5070,  fy25Margin: 44.6, targetMultiple: 14, multipleLow: 11, multipleHigh: 18, growthOutlook: 'Cards, FX, distribution of third-party products',             share: 6.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 13,
    revenueGrowthY1: 10,
    terminalGrowth: 5.5,
    targetEbitdaMargin: 55,
    taxRate: 25,
    wacc: 12,
    costOfEquity: 13.0,
    daPercentRevenue: 1.0,
    capexPercentRevenue: 1.3,
    workingCapitalIntensity: 0,
    projectionYears: 7,
    payoutRatio: 25,
    dividendGrowthNearTerm: 12,
    dividendGrowthTerminal: 6,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'ICICI Bank',     ticker: 'ICICIBANK', category: 'IndianBank', marketCapCr: 890000,  evEbitda: 10, pe: 20, dividendYield: 0.9, roic: 18, note: 'Closest peer; superior ROA' },
    { name: 'Axis Bank',      ticker: 'AXISBANK',  category: 'IndianBank', marketCapCr: 360000,  evEbitda: 8,  pe: 14, dividendYield: 0.1, roic: 14, note: 'Citi retail integration' },
    { name: 'Kotak Mahindra', ticker: 'KOTAKBANK', category: 'IndianBank', marketCapCr: 380000,  evEbitda: 11, pe: 19, dividendYield: 0.1, roic: 16, note: 'Highest-quality private bank' },
    { name: 'State Bank of India', ticker: 'SBIN', category: 'IndianBank', marketCapCr: 710000,  evEbitda: 6,  pe: 10, dividendYield: 1.8, roic: 13, note: 'PSU leader' },
    { name: 'IndusInd Bank',  ticker: 'INDUSINDBK',category: 'IndianBank', marketCapCr: 68000,   evEbitda: 6,  pe: 8,  dividendYield: 1.2, roic: 12, note: 'Mid-size; under stress' },
    { name: 'JPMorgan Chase', ticker: 'JPM',       category: 'GlobalBank', marketCapCr: 5400000, evEbitda: 9,  pe: 13, dividendYield: 2.3, roic: 15, note: 'US mega-bank' },
    { name: 'Bank of America',ticker: 'BAC',       category: 'GlobalBank', marketCapCr: 2800000, evEbitda: 8,  pe: 12, dividendYield: 2.5, roic: 11, note: 'US diversified' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (NIM Squeeze)',  probability: 0.25, description: 'Deposit costs stay elevated, credit cost normalizes to 80bps',     color: '#DC2626', overrides: { revenueGrowthCAGR: 8,  targetEbitdaMargin: 48, wacc: 13 } },
    { id: 'base',   label: 'Base',                 probability: 0.50, description: 'Merger synergies flow through, NIM recovers to 3.6%, CD ratio down',color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Re-rating)',     probability: 0.18, description: 'Credit cycle rebounds, unsecured grows 25%+, CASA >45%',            color: '#16A34A', overrides: { revenueGrowthCAGR: 17, targetEbitdaMargin: 58, wacc: 11 } },
    { id: 'stress', label: 'Credit Cycle Stress',  probability: 0.07, description: 'Unsecured + microfinance delinquencies, slippages spike, ROE sub-15%',color: '#7C2D12', overrides: { revenueGrowthCAGR: 6,  targetEbitdaMargin: 42, wacc: 13.5 } },
  ],
  keyDrivers: [
    'Merger cost synergies (target ₹3-4K Cr p.a.)',
    'CD ratio normalization from 105% to ~90%',
    'Branch expansion monetization (+900/yr)',
    'NIM recovery to 3.6-3.8%',
    'Digital + Payzapp re-launch + cards CAGR',
  ],
  keyRisks: [
    'Unsecured retail asset quality',
    'Deposit mobilization pace',
    'Microfinance slippage contagion',
    'Regulatory: priority sector + LCR tightening',
  ],
  recentHighlights: [
    'FY25 PAT ₹67,347 Cr; ROA 1.8%, ROE 14.4%',
    'CD ratio improved to 96% from 110% at merger',
    'Deposits +15% YoY, advances +8% YoY',
    'Total dividend ₹22/share in FY25 (final ₹22)',
  ],
  thesisShort: 'Best-in-class deposit franchise post-merger; CD ratio normalisation + NIM recovery unlock multi-year compounding at cycle-low multiples.',
};

// ==========================================================================
// INFOSYS
// ==========================================================================
const INFY: CompanyProfile = {
  id: 'infy',
  ticker: 'INFY',
  name: 'Infosys',
  sector: 'IT Services',
  tagline: 'Global #3 Indian IT; digital & GenAI focused with strong capital return',
  accentColor: '#155E75',
  currentMarketPrice: 1540,
  targetPriceRange: { low: 1420, base: 1700, high: 1950 },
  sharesOutstandingCr: 415.2,
  netCashCr: 30000,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 100472, ebitda: 27810, ebit: 25378, pat: 19351, eps: 45.6,  dps: 27.0, capex: 2110, operatingCashFlow: 23400, freeCashFlow: 21290, netDebt: -24500, totalAssets: 91384,  investedCapital: 55200 },
    { fy: 'FY22', revenue: 121641, ebitda: 30995, ebit: 28211, pat: 22110, eps: 52.5,  dps: 31.0, capex: 2380, operatingCashFlow: 24800, freeCashFlow: 22420, netDebt: -22600, totalAssets: 100178, investedCapital: 59300 },
    { fy: 'FY23', revenue: 146767, ebitda: 35480, ebit: 31288, pat: 24095, eps: 57.6,  dps: 34.0, capex: 2620, operatingCashFlow: 26600, freeCashFlow: 23980, netDebt: -25400, totalAssets: 110837, investedCapital: 62100 },
    { fy: 'FY24', revenue: 153670, ebitda: 35960, ebit: 31892, pat: 26233, eps: 63.4,  dps: 46.0, capex: 2830, operatingCashFlow: 28900, freeCashFlow: 26070, netDebt: -28700, totalAssets: 119420, investedCapital: 65800 },
    { fy: 'FY25', revenue: 162990, ebitda: 38060, ebit: 33960, pat: 26713, eps: 64.3,  dps: 43.0, capex: 3050, operatingCashFlow: 30500, freeCashFlow: 27450, netDebt: -30000, totalAssets: 124600, investedCapital: 69200 },
  ],
  segments: [
    { name: 'Financial Services',         fy25Revenue: 45600, fy25Ebit: 9500, fy25Margin: 20.8, targetMultiple: 20, multipleLow: 17, multipleHigh: 23, growthOutlook: 'BFSI recovery driven by US + Europe banking', share: 28.0 },
    { name: 'Retail, CPG & Logistics',    fy25Revenue: 23800, fy25Ebit: 4900, fy25Margin: 20.6, targetMultiple: 18, multipleLow: 15, multipleHigh: 21, growthOutlook: 'Discretionary pressure; premium retail steady', share: 14.6 },
    { name: 'Communications',             fy25Revenue: 19400, fy25Ebit: 3900, fy25Margin: 20.1, targetMultiple: 17, multipleLow: 14, multipleHigh: 20, growthOutlook: 'Telecom capex weak; cloud migration ongoing',  share: 11.9 },
    { name: 'Energy, Utilities & Resources',fy25Revenue: 20100, fy25Ebit: 4260, fy25Margin: 21.2, targetMultiple: 19, multipleLow: 16, multipleHigh: 22, growthOutlook: 'Energy transition + digital twin pipeline',   share: 12.3 },
    { name: 'Manufacturing',              fy25Revenue: 24400, fy25Ebit: 5080, fy25Margin: 20.8, targetMultiple: 21, multipleLow: 18, multipleHigh: 24, growthOutlook: 'ER&D + ISV spend resilient',                     share: 15.0 },
    { name: 'Life Sciences & Hi-Tech',    fy25Revenue: 14700, fy25Ebit: 3250, fy25Margin: 22.1, targetMultiple: 22, multipleLow: 19, multipleHigh: 25, growthOutlook: 'Pharma IT + GenAI productization',              share: 9.0 },
    { name: 'Others',                     fy25Revenue: 14990, fy25Ebit: 3070, fy25Margin: 20.5, targetMultiple: 17, multipleLow: 14, multipleHigh: 20, growthOutlook: 'India + Finacle platform',                     share: 9.2 },
  ],
  assumptions: {
    revenueGrowthCAGR: 8.0,
    revenueGrowthY1: 5.5,
    terminalGrowth: 5.0,
    targetEbitdaMargin: 25,
    taxRate: 26,
    wacc: 11.5,
    costOfEquity: 12.0,
    daPercentRevenue: 2.5,
    capexPercentRevenue: 1.8,
    workingCapitalIntensity: 16,
    projectionYears: 7,
    payoutRatio: 85,
    dividendGrowthNearTerm: 9,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'TCS',         ticker: 'TCS',      category: 'IndianIT', marketCapCr: 1240000,evEbitda: 18, pe: 26, dividendYield: 3.7, roic: 50, note: 'Larger peer' },
    { name: 'HCL Tech',    ticker: 'HCLTECH',  category: 'IndianIT', marketCapCr: 440000, evEbitda: 17, pe: 25, dividendYield: 3.5, roic: 28, note: 'Infra + engineering' },
    { name: 'Wipro',       ticker: 'WIPRO',    category: 'IndianIT', marketCapCr: 260000, evEbitda: 14, pe: 22, dividendYield: 1.2, roic: 18, note: 'Turnaround' },
    { name: 'LTIMindtree', ticker: 'LTIM',     category: 'IndianIT', marketCapCr: 170000, evEbitda: 22, pe: 32, dividendYield: 1.0, roic: 30, note: 'Mid-tier digital' },
    { name: 'Tech Mahindra',ticker: 'TECHM',   category: 'IndianIT', marketCapCr: 150000, evEbitda: 15, pe: 28, dividendYield: 2.4, roic: 14, note: 'Telecom-heavy' },
    { name: 'Accenture',   ticker: 'ACN',      category: 'GlobalIT', marketCapCr: 2700000,evEbitda: 17, pe: 28, dividendYield: 1.6, roic: 30, note: 'Global consulting' },
    { name: 'Cognizant',   ticker: 'CTSH',     category: 'GlobalIT', marketCapCr: 320000, evEbitda: 11, pe: 17, dividendYield: 1.5, roic: 20, note: 'Turnaround' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Discretionary Freeze)', probability: 0.25, description: 'BFSI capex cut extended; wage-revision hits margin 250bps', color: '#DC2626', overrides: { revenueGrowthCAGR: 3.0, targetEbitdaMargin: 21, wacc: 12.5 } },
    { id: 'base',   label: 'Base',                        probability: 0.48, description: 'Steady BFSI recovery, margin band 20-22%, large-deal TCV stable', color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (GenAI Lift)',           probability: 0.20, description: 'Topaz / GenAI monetization + productivity pricing; growth 11%+', color: '#16A34A', overrides: { revenueGrowthCAGR: 11, targetEbitdaMargin: 27, wacc: 11 } },
    { id: 'stress', label: 'Onshoring Shock',             probability: 0.07, description: 'US H-1B + visa regulation; Europe near-shore push cuts offshore share', color: '#7C2D12', overrides: { revenueGrowthCAGR: 1.5, targetEbitdaMargin: 19, wacc: 13 } },
  ],
  keyDrivers: [
    'Large-deal TCV pipeline + renewal cadence',
    'Topaz / GenAI framework monetization',
    'BFSI (28%) vertical recovery',
    'Margin defense via pyramid, utilization, automation',
    'Capital return: 85% payout policy active',
  ],
  keyRisks: [
    'Discretionary spend deferral in BFSI + Hi-Tech',
    'Wage inflation vs pricing power',
    'US onshoring / visa regulation',
    'GenAI commoditization of routine work',
  ],
  recentHighlights: [
    'FY25 revenue ₹1.63L Cr (+6.1% YoY CC)',
    'FY25 op margin 21.1%; FCF yield ~4%',
    'Q2 FY26 large-deal TCV $3.1bn',
    'Interim + final dividend ₹43/sh + buy-back announced',
  ],
  thesisShort: 'Quality franchise with superior capital return; entry point attractive as BFSI & GenAI pipeline converts.',
};

// ==========================================================================
// MARUTI SUZUKI
// ==========================================================================
const MARUTI: CompanyProfile = {
  id: 'maruti',
  ticker: 'MARUTI',
  name: 'Maruti Suzuki India',
  sector: 'Automobile - Passenger Vehicles',
  tagline: 'India\'s largest car maker; SUV catch-up + hybrid bridge to EV',
  accentColor: '#B91C1C',
  currentMarketPrice: 12200,
  targetPriceRange: { low: 11400, base: 13400, high: 15200 },
  sharesOutstandingCr: 31.44,
  netCashCr: 52000,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 70332,  ebitda: 5310,  ebit: 1795,  pat: 4389,  eps: 145.3, dps: 45.0,  capex: 2800, operatingCashFlow: 6400,  freeCashFlow: 3600,  netDebt: -41900, totalAssets: 77900,  investedCapital: 39500 },
    { fy: 'FY22', revenue: 88330,  ebitda: 6960,  ebit: 3200,  pat: 3880,  eps: 128.5, dps: 60.0,  capex: 3100, operatingCashFlow: 6200,  freeCashFlow: 3100,  netDebt: -41100, totalAssets: 85300,  investedCapital: 42400 },
    { fy: 'FY23', revenue: 117523, ebitda: 12470, ebit: 8900,  pat: 8050,  eps: 266.5, dps: 90.0,  capex: 4250, operatingCashFlow: 11800, freeCashFlow: 7550,  netDebt: -44100, totalAssets: 95400,  investedCapital: 47100 },
    { fy: 'FY24', revenue: 141858, ebitda: 17340, ebit: 13280, pat: 13352, eps: 441.8, dps: 125.0, capex: 5600, operatingCashFlow: 16500, freeCashFlow: 10900, netDebt: -48500, totalAssets: 108900, investedCapital: 52400 },
    { fy: 'FY25', revenue: 152000, ebitda: 18850, ebit: 14100, pat: 14500, eps: 460.0, dps: 135.0, capex: 7500, operatingCashFlow: 18000, freeCashFlow: 10500, netDebt: -52000, totalAssets: 118500, investedCapital: 56200 },
  ],
  segments: [
    { name: 'Passenger Vehicles - Domestic', fy25Revenue: 114800, fy25Ebit: 11700, fy25Margin: 10.2, targetMultiple: 22, multipleLow: 19, multipleHigh: 25, growthOutlook: 'SUV share catch-up; CNG + hybrid mix lifts ASP',    share: 75.5 },
    { name: 'Exports',                       fy25Revenue: 21400,  fy25Ebit: 2140,  fy25Margin: 10.0, targetMultiple: 18, multipleLow: 15, multipleHigh: 22, growthOutlook: 'Record 3.3L units; Africa + LatAm scale',          share: 14.1 },
    { name: 'Spares, Services & Accessories',fy25Revenue: 11500,  fy25Ebit: 1720,  fy25Margin: 15.0, targetMultiple: 24, multipleLow: 20, multipleHigh: 28, growthOutlook: 'Parc-driven annuity; margin-accretive',            share: 7.6 },
    { name: 'Others (Used Cars, Finance co.)',fy25Revenue: 4300,  fy25Ebit: 430,   fy25Margin: 10.0, targetMultiple: 15, multipleLow: 12, multipleHigh: 18, growthOutlook: 'True Value pre-owned scaling',                      share: 2.8 },
  ],
  assumptions: {
    revenueGrowthCAGR: 10,
    revenueGrowthY1: 6,
    terminalGrowth: 5.0,
    targetEbitdaMargin: 14,
    taxRate: 25,
    wacc: 12,
    costOfEquity: 13.0,
    daPercentRevenue: 3.2,
    capexPercentRevenue: 5.0,
    workingCapitalIntensity: 4,
    projectionYears: 7,
    payoutRatio: 30,
    dividendGrowthNearTerm: 10,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'Tata Motors',    ticker: 'TATAMOTORS',category: 'IndianAuto', marketCapCr: 270000,  evEbitda: 6,  pe: 11, dividendYield: 1.0, roic: 14, note: 'JLR + PV + CV' },
    { name: 'Mahindra & Mahindra',ticker: 'M&M',   category: 'IndianAuto', marketCapCr: 380000,  evEbitda: 14, pe: 28, dividendYield: 0.7, roic: 15, note: 'SUV leader' },
    { name: 'Hyundai Motor India',ticker: 'HYUNDAI',category: 'IndianAuto', marketCapCr: 160000, evEbitda: 20, pe: 25, dividendYield: 2.0, roic: 30, note: '#2 PV; IPO Oct-24' },
    { name: 'Eicher Motors',  ticker: 'EICHERMOT', category: 'IndianAuto', marketCapCr: 140000,  evEbitda: 22, pe: 30, dividendYield: 1.0, roic: 35, note: 'RE + VECV' },
    { name: 'Bajaj Auto',     ticker: 'BAJAJ-AUTO',category: 'IndianAuto', marketCapCr: 260000,  evEbitda: 20, pe: 30, dividendYield: 2.0, roic: 30, note: '2W + 3W + exports' },
    { name: 'Hero MotoCorp',  ticker: 'HEROMOTOCO',category: 'IndianAuto', marketCapCr: 95000,   evEbitda: 13, pe: 19, dividendYield: 3.6, roic: 25, note: '2W leader' },
    { name: 'Toyota Motor',   ticker: 'TM',        category: 'GlobalAuto', marketCapCr: 2300000, evEbitda: 9,  pe: 11, dividendYield: 2.7, roic: 11, note: 'Global leader' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Demand Stall)',       probability: 0.25, description: 'PV industry flat, SUV share loss continues, margin -150bps',   color: '#DC2626', overrides: { revenueGrowthCAGR: 4, targetEbitdaMargin: 11, wacc: 13 } },
    { id: 'base',   label: 'Base',                       probability: 0.50, description: 'Industry ~5% growth, SUV share recovers to 25%, stable margin',color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Hybrid Wave)',         probability: 0.18, description: 'Hybrid + CNG drive ASP +8%, SUV share >27%, export record',    color: '#16A34A', overrides: { revenueGrowthCAGR: 14, targetEbitdaMargin: 16, wacc: 11 } },
    { id: 'stress', label: 'EV Disruption Shock',        probability: 0.07, description: 'Chinese EVs + Tata/M&M EV aggressive pricing hurts Maruti mix',color: '#7C2D12', overrides: { revenueGrowthCAGR: 2, targetEbitdaMargin: 10, wacc: 13.5 } },
  ],
  keyDrivers: [
    'SUV share catch-up (Grand Vitara, Brezza, Fronx, Jimny)',
    'CNG + strong hybrid tech as EV bridge',
    'Export acceleration (3.3L units in FY25)',
    'Kharkhoda plant capacity ramp (+1M units)',
    'Gujarat plant acquisition from SMC',
  ],
  keyRisks: [
    'EV transition disrupts ICE economics',
    'Rural demand slowdown',
    'Regulatory: CAFE-III fuel efficiency',
    'Input cost spikes (steel, PM, chips)',
  ],
  recentHighlights: [
    'FY25 revenue ₹1.52L Cr; PAT ₹14,500 Cr (+8.6% YoY)',
    'FY25 wholesale 22L units (record); exports 3.3L',
    'SUV share reached 22% in FY25',
    'Dividend ₹135/sh; Gujarat plant acquisition Apr-2025',
  ],
  thesisShort: 'Largest PV maker with SUV + export tailwinds and fortress balance sheet; hybrid bridge buys time before EV scale.',
};

// ==========================================================================
// SUN PHARMACEUTICAL INDUSTRIES
// ==========================================================================
const SUNPHARMA: CompanyProfile = {
  id: 'sunpharma',
  ticker: 'SUNPHARMA',
  name: 'Sun Pharmaceutical Industries',
  sector: 'Pharmaceuticals',
  tagline: 'India\'s largest pharma; specialty Rx + US generics + emerging markets',
  accentColor: '#B45309',
  currentMarketPrice: 1760,
  targetPriceRange: { low: 1620, base: 1950, high: 2200 },
  sharesOutstandingCr: 239.9,
  netCashCr: 14000,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 33497, ebitda: 7680,  ebit: 5960,  pat: 2904,  eps: 12.1, dps: 7.5,  capex: 1350, operatingCashFlow: 6850,  freeCashFlow: 5500,  netDebt: -5200,  totalAssets: 70800, investedCapital: 47500 },
    { fy: 'FY22', revenue: 38654, ebitda: 9520,  ebit: 7830,  pat: 3273,  eps: 13.6, dps: 12.0, capex: 1480, operatingCashFlow: 7650,  freeCashFlow: 6170,  netDebt: -7100,  totalAssets: 74500, investedCapital: 49200 },
    { fy: 'FY23', revenue: 43886, ebitda: 11280, ebit: 9260,  pat: 8514,  eps: 35.5, dps: 13.5, capex: 1620, operatingCashFlow: 9450,  freeCashFlow: 7830,  netDebt: -9800,  totalAssets: 79100, investedCapital: 51500 },
    { fy: 'FY24', revenue: 48497, ebitda: 13340, ebit: 10990, pat: 9577,  eps: 39.9, dps: 17.5, capex: 1780, operatingCashFlow: 11200, freeCashFlow: 9420,  netDebt: -11900, totalAssets: 83700, investedCapital: 53800 },
    { fy: 'FY25', revenue: 52041, ebitda: 14720, ebit: 12290, pat: 10928, eps: 45.6, dps: 20.0, capex: 2050, operatingCashFlow: 12400, freeCashFlow: 10350, netDebt: -14000, totalAssets: 88200, investedCapital: 56100 },
  ],
  segments: [
    { name: 'Global Specialty',      fy25Revenue: 10410, fy25Ebit: 2810, fy25Margin: 27.0, targetMultiple: 20, multipleLow: 17, multipleHigh: 24, growthOutlook: 'Ilumya, Cequa, Winlevi scale-up; R&D pipeline key', share: 20.0 },
    { name: 'US Generics',           fy25Revenue: 13540, fy25Ebit: 2570, fy25Margin: 19.0, targetMultiple: 9,  multipleLow: 7,  multipleHigh: 12, growthOutlook: 'Price stability + complex generics launches',       share: 26.0 },
    { name: 'India Branded',         fy25Revenue: 16910, fy25Ebit: 4230, fy25Margin: 25.0, targetMultiple: 28, multipleLow: 24, multipleHigh: 32, growthOutlook: 'Chronic + sub-chronic; field-force expansion',      share: 32.5 },
    { name: 'Emerging Markets',      fy25Revenue: 8450,  fy25Ebit: 1770, fy25Margin: 21.0, targetMultiple: 14, multipleLow: 11, multipleHigh: 17, growthOutlook: 'RoW + Japan; FX and regulatory swings',             share: 16.2 },
    { name: 'API / Others',          fy25Revenue: 2730,  fy25Ebit: 410,  fy25Margin: 15.0, targetMultiple: 11, multipleLow: 9,  multipleHigh: 14, growthOutlook: 'Captive + third-party API supply',                  share: 5.3 },
  ],
  assumptions: {
    revenueGrowthCAGR: 9.5,
    revenueGrowthY1: 8.0,
    terminalGrowth: 5.0,
    targetEbitdaMargin: 30,
    taxRate: 22,
    wacc: 11.5,
    costOfEquity: 12.5,
    daPercentRevenue: 4.8,
    capexPercentRevenue: 4.2,
    workingCapitalIntensity: 15,
    projectionYears: 7,
    payoutRatio: 45,
    dividendGrowthNearTerm: 10,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'Dr. Reddy\'s Labs', ticker: 'DRREDDY',  category: 'IndianPharma', marketCapCr: 105000, evEbitda: 14, pe: 22, dividendYield: 0.8, roic: 18, note: 'Global generics + biosimilars' },
    { name: 'Cipla',             ticker: 'CIPLA',    category: 'IndianPharma', marketCapCr: 118000, evEbitda: 15, pe: 25, dividendYield: 0.9, roic: 17, note: 'India + US + South Africa' },
    { name: 'Lupin',             ticker: 'LUPIN',    category: 'IndianPharma', marketCapCr: 90000,  evEbitda: 16, pe: 28, dividendYield: 0.5, roic: 14, note: 'US respiratory franchise' },
    { name: 'Torrent Pharma',    ticker: 'TORNTPHARM',category:'IndianPharma', marketCapCr: 110000, evEbitda: 22, pe: 45, dividendYield: 0.7, roic: 22, note: 'India-focused, brand-heavy' },
    { name: 'Divi\'s Labs',      ticker: 'DIVISLAB', category: 'IndianPharma', marketCapCr: 155000, evEbitda: 35, pe: 55, dividendYield: 0.6, roic: 18, note: 'CDMO + API' },
    { name: 'Pfizer',            ticker: 'PFE',      category: 'GlobalPharma', marketCapCr: 1550000,evEbitda: 9,  pe: 12, dividendYield: 6.0, roic: 10, note: 'Post-COVID reset' },
    { name: 'Novartis',          ticker: 'NVS',      category: 'GlobalPharma', marketCapCr: 2100000,evEbitda: 13, pe: 19, dividendYield: 3.5, roic: 18, note: 'Innovative pharma pure-play' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Specialty Miss)',   probability: 0.22, description: 'Ilumya growth stalls, US pricing renewed pressure, R&D overrun',  color: '#DC2626', overrides: { revenueGrowthCAGR: 5, targetEbitdaMargin: 26, wacc: 12.5 } },
    { id: 'base',   label: 'Base',                     probability: 0.50, description: 'Specialty 15%+, India 10-12%, US stable, margin defended at 28-30%', color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Pipeline Hits)',     probability: 0.22, description: 'Specialty crosses $1.5bn run-rate; complex generics launches',     color: '#16A34A', overrides: { revenueGrowthCAGR: 13, targetEbitdaMargin: 33, wacc: 10.5 } },
    { id: 'stress', label: 'US FDA Warning Shock',     probability: 0.06, description: 'Halol / Mohali OAI triggers supply disruption, margin -400bps',   color: '#7C2D12', overrides: { revenueGrowthCAGR: 2, targetEbitdaMargin: 23, wacc: 13 } },
  ],
  keyDrivers: [
    'Global Specialty franchise scaling >$1bn',
    'Ilumya + Cequa share gains + Winlevi',
    'India branded formulations >11% growth',
    'Complex generics + 505(b)(2) filings',
    'Emerging markets + Japan resilience',
  ],
  keyRisks: [
    'US FDA compliance (Halol, Mohali)',
    'Specialty R&D overruns or pipeline failures',
    'US generics price erosion recurrence',
    'INR/USD + EM FX volatility',
  ],
  recentHighlights: [
    'FY25 revenue ₹52,041 Cr (+7.3%); PAT ₹10,928 Cr (+14%)',
    'Global Specialty FY25 revenue $1.2bn (+16%)',
    'Ilumya FY25 $673m (+22%); Cequa $185m',
    'Dividend ₹20/sh FY25; R&D intensity 7.5%',
  ],
  thesisShort: 'Specialty franchise compounding alongside resilient India + US; FDA clearance + pipeline optionality drive multiple re-rating.',
};

// ==========================================================================
// REGISTRY
// ==========================================================================
export const COMPANY_PROFILES: CompanyProfile[] = [
  ITC, TCS, HUL, NEROLAC, VST,
  RELIANCE, HDFCBANK, INFY, MARUTI, SUNPHARMA,
];

export const COMPANY_BY_ID: Readonly<Record<string, CompanyProfile>> = Object.freeze(
  Object.fromEntries(COMPANY_PROFILES.map(c => [c.id, c])),
);

export function getCompany(id: string): CompanyProfile {
  const c = COMPANY_BY_ID[id];
  if (!c) throw new Error(`Unknown company id: ${id}`);
  return c;
}
