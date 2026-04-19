// Multi-company financial profiles for generic valuation framework.
// Covers: ITC, TCS, HUL, Kansai Nerolac, VST Industries, Infosys.
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
  category: 'IndianFMCG' | 'GlobalTobacco' | 'IndianTobacco' | 'IndianIT' | 'GlobalIT' | 'IndianPaints' | 'GlobalPaints' | 'IndianStaples';
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
// INFOSYS
// ==========================================================================
const INFOSYS: CompanyProfile = {
  id: 'infosys',
  ticker: 'INFY',
  name: 'Infosys',
  sector: 'IT Services - Business & IT Services',
  tagline: 'Diversified IT services leader with FS dominance and emerging GenAI capabilities',
  accentColor: '#0066CC',
  currentMarketPrice: 160,
  targetPriceRange: { low: 155, base: 185, high: 215 },
  sharesOutstandingCr: 415.43,
  netCashCr: 18500,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 121255, ebitda: 26100, ebit: 24800, pat: 16309, eps: 39.2, dps: 31.00, capex: 2800, operatingCashFlow: 18200, freeCashFlow: 15400, netDebt: -9800, totalAssets: 145000, investedCapital: 95000 },
    { fy: 'FY22', revenue: 138717, ebitda: 29400, ebit: 27600, pat: 16311, eps: 39.2, dps: 33.00, capex: 3100, operatingCashFlow: 19800, freeCashFlow: 16700, netDebt: -12200, totalAssets: 158000, investedCapital: 102000 },
    { fy: 'FY23', revenue: 161222, ebitda: 33800, ebit: 31400, pat: 20110, eps: 48.3, dps: 38.50, capex: 3500, operatingCashFlow: 21200, freeCashFlow: 17700, netDebt: -14500, totalAssets: 178000, investedCapital: 112000 },
    { fy: 'FY24', revenue: 154144, ebitda: 32100, ebit: 29800, pat: 18803, eps: 45.2, dps: 36.50, capex: 3800, operatingCashFlow: 19900, freeCashFlow: 16100, netDebt: -16200, totalAssets: 185000, investedCapital: 118000 },
    { fy: 'FY25', revenue: 160000, ebitda: 33600, ebit: 31200, pat: 20940, eps: 50.4, dps: 37.00, capex: 4200, operatingCashFlow: 21100, freeCashFlow: 16900, netDebt: -18500, totalAssets: 198000, investedCapital: 125000 },
  ],
  segments: [
    { name: 'Financial Services', fy25Revenue: 45440, fy25Ebit: 11352, fy25Margin: 25.0, targetMultiple: 18, multipleLow: 16, multipleHigh: 20, growthOutlook: 'Digitalization, cloud migration, regulatory tech', share: 28.4 },
    { name: 'Manufacturing', fy25Revenue: 26560, fy25Ebit: 5840, fy25Margin: 22.0, targetMultiple: 16, multipleLow: 14, multipleHigh: 18, growthOutlook: 'PLM, supply chain digitalization', share: 16.6 },
    { name: 'Communications', fy25Revenue: 22880, fy25Ebit: 4576, fy25Margin: 20.0, targetMultiple: 15, multipleLow: 13, multipleHigh: 17, growthOutlook: '5G, IoT, network modernization', share: 14.3 },
    { name: 'Retail & Media', fy25Revenue: 16000, fy25Ebit: 3360, fy25Margin: 21.0, targetMultiple: 14, multipleLow: 12, multipleHigh: 16, growthOutlook: 'Omnichannel, personalization', share: 10.0 },
    { name: 'Health Care', fy25Revenue: 19200, fy25Ebit: 3840, fy25Margin: 20.0, targetMultiple: 17, multipleLow: 15, multipleHigh: 19, growthOutlook: 'Clinical data analytics, interoperability', share: 12.0 },
    { name: 'Energy, Utilities & Resources', fy25Revenue: 14400, fy25Ebit: 2592, fy25Margin: 18.0, targetMultiple: 14, multipleLow: 12, multipleHigh: 16, growthOutlook: 'Energy transition, smart grid', share: 9.0 },
    { name: 'Other', fy25Revenue: 15920, fy25Ebit: 1642, fy25Margin: 10.3, targetMultiple: 12, multipleLow: 10, multipleHigh: 14, growthOutlook: 'Diversified smaller segments', share: 10.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 7.5,
    revenueGrowthY1: 6.0,
    terminalGrowth: 4.0,
    targetEbitdaMargin: 21.5,
    taxRate: 13.5,
    wacc: 10.5,
    costOfEquity: 11.5,
    daPercentRevenue: 2.2,
    capexPercentRevenue: 2.6,
    workingCapitalIntensity: 3.0,
    projectionYears: 7,
    payoutRatio: 51.7,
    dividendGrowthNearTerm: 8,
    dividendGrowthTerminal: 4,
    conglomerateDiscount: 2,
  },
  peers: [
    { name: 'TCS', ticker: 'TCS', category: 'IndianIT', marketCapCr: 1440000, evEbitda: 23, pe: 29, dividendYield: 2.0, roic: 38, note: 'Domestic IT leader' },
    { name: 'HCL Technologies', ticker: 'HCLTECH', category: 'IndianIT', marketCapCr: 380000, evEbitda: 18, pe: 22, dividendYield: 1.5, roic: 28, note: 'Services growth' },
    { name: 'Wipro', ticker: 'WIPRO', category: 'IndianIT', marketCapCr: 288000, evEbitda: 14, pe: 16, dividendYield: 2.2, roic: 20, note: 'Conservative, FS exposure' },
    { name: 'Accenture', ticker: 'ACN', category: 'GlobalIT', marketCapCr: 2200000, evEbitda: 22, pe: 28, dividendYield: 1.2, roic: 32, note: 'Consulting + technology' },
    { name: 'IBM', ticker: 'IBM', category: 'GlobalIT', marketCapCr: 280000, evEbitda: 15, pe: 21, dividendYield: 3.2, roic: 15, note: 'Legacy + cloud transition' },
    { name: 'Cognizant', ticker: 'CTSH', category: 'GlobalIT', marketCapCr: 350000, evEbitda: 14, pe: 17, dividendYield: 2.0, roic: 25, note: 'BFSI-dependent' },
  ],
  scenarios: [
    { id: 'bear', label: 'Bear (Recession)', probability: 0.25, description: 'Global BFSI contraction; IT spending cut; 2% growth; margin compress to 19%', color: '#DC2626', overrides: { revenueGrowthCAGR: 2, targetEbitdaMargin: 19, wacc: 11.5 } },
    { id: 'base', label: 'Base', probability: 0.48, description: 'Steady 6-7% growth; digitalization offsets headcount inflation; 21-22% margin', color: '#2563EB', overrides: {} },
    { id: 'bull', label: 'Bull (GenAI Adoption)', probability: 0.20, description: 'GenAI-led demand surge; consulting uplift; 12% growth; margin 23%', color: '#16A34A', overrides: { revenueGrowthCAGR: 12, targetEbitdaMargin: 23, wacc: 9.5 } },
    { id: 'stress', label: 'Attrition Shock', probability: 0.07, description: 'Talent wars; 5% attrition + wage inflation; margin 17%', color: '#7C2D12', overrides: { revenueGrowthCAGR: 3, targetEbitdaMargin: 17, wacc: 12 } },
  ],
  keyDrivers: [
    'Digital transformation spending in BFSI (28% of revenue)',
    'Cloud adoption and migration revenue',
    'AI/GenAI advisory and implementation',
    'Manufacturing and supply chain digitalization',
    'Talent retention & utilization rate',
  ],
  keyRisks: [
    'BFSI concentration (28% revenue); regulatory/recession exposure',
    'Wage inflation driven by talent scarcity',
    'Visa/immigration policy headwinds (H1B caps)',
    'Margin pressure from transition to higher-growth segments',
    'GenAI commodity risk: automation of routine coding tasks',
  ],
  recentHighlights: [
    'Q2 FY26 revenue $5,076M (+2.9% YoY), 21.0% margin',
    'Interim dividend ₹23/share; annual guidance 2-3% growth',
    'Constant currency: FY25 +4.2% growth, 21.1% margin',
    'Segment FS still 28.4% of FY25 revenue at ₹45.4B',
  ],
  thesisShort: 'Quality compounder at fair valuation; GenAI emerging as material upside; BFSI concentration is key risk.',
};

// ==========================================================================
// REGISTRY
// ==========================================================================
export const COMPANY_PROFILES: CompanyProfile[] = [ITC, TCS, HUL, NEROLAC, VST, INFOSYS];

export const COMPANY_BY_ID: Readonly<Record<string, CompanyProfile>> = Object.freeze(
  Object.fromEntries(COMPANY_PROFILES.map(c => [c.id, c])),
);

export function getCompany(id: string): CompanyProfile {
  const c = COMPANY_BY_ID[id];
  if (!c) throw new Error(`Unknown company id: ${id}`);
  return c;
}
