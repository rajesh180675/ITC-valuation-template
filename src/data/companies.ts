// Multi-company financial profiles for generic valuation framework.
// Covers: ITC, TCS, HUL, Kansai Nerolac, VST Industries, Reliance Industries,
// HDFC Bank, Infosys, Maruti Suzuki, Sun Pharma, Bharti Airtel, Larsen & Toubro,
// Bajaj Finance, Asian Paints, NTPC, ICICI Bank, Tata Steel, Titan Company,
// UltraTech Cement, Mahindra & Mahindra, Adani Ports, Axis Bank, Bajaj Finserv,
// HCL Technologies, IndusInd Bank, JSW Steel, Kotak Mahindra Bank, Nestle India,
// Power Grid, State Bank of India, Tata Motors, Tech Mahindra. All 30 Sensex
// constituents are covered (plus Kansai Nerolac and VST Industries as peer
// comparables for Asian Paints and ITC respectively).
//
// Data sources: FY21-FY25 published annual results; H1 FY26 filings where
// available. Numbers in INR crore unless otherwise noted. Share counts in
// crore (10 million). All companies use INR / Indian FY (April-March).
// Banks / NBFCs / utilities use sector-appropriate proxies:
//   - Banks/NBFCs: "revenue" = total operating income (NII + other income);
//     "ebit" = pre-provision operating profit (PPOP); capex is lean.
//   - Utilities: regulated RoE framework; EBITDA reflects gross block scale.

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
    | 'IndianRetail'
    | 'IndianTelecom'
    | 'GlobalTelecom'
    | 'IndianInfra'
    | 'GlobalInfra'
    | 'IndianNBFC'
    | 'GlobalNBFC'
    | 'IndianUtilities'
    | 'GlobalUtilities'
    | 'IndianMetals'
    | 'GlobalMetals'
    | 'IndianCement'
    | 'GlobalCement'
    | 'IndianJewellery'
    | 'GlobalLuxury'
    | 'IndianConsumerDisc'
    | 'IndianPorts'
    | 'GlobalPorts'
    | 'IndianInsurance'
    | 'GlobalInsurance';
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
  currentMarketPriceCmp?: number;
  dividendYieldPct?: number;
  beta?: number;
  pct52wHigh?: number;
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
// BHARTI AIRTEL (Consolidated; India Mobile + Africa + Enterprise + Homes)
// FY25 PAT inflated by Indus Towers stake sale gain and deferred-tax reversal.
// ==========================================================================
const AIRTEL: CompanyProfile = {
  id: 'airtel',
  ticker: 'BHARTIARTL',
  name: 'Bharti Airtel',
  sector: 'Telecom Services',
  tagline: 'India tariff-hike beneficiary + Africa FCF compounder; 5G + FTTH levers',
  accentColor: '#DC2626',
  currentMarketPrice: 1570,
  targetPriceRange: { low: 1440, base: 1760, high: 2020 },
  sharesOutstandingCr: 602.3,
  netCashCr: -225000, // high net debt incl. lease liabilities + AGR + deferred spectrum
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 100616, ebitda: 47579, ebit: 16940, pat: -15084, eps: -27.7, dps: 2.0,  capex: 22580, operatingCashFlow: 46450, freeCashFlow: 23870, netDebt: 169023, totalAssets: 326330, investedCapital: 235000 },
    { fy: 'FY22', revenue: 116547, ebitda: 58220, ebit: 21960, pat: 4255,   eps: 7.2,   dps: 3.0,  capex: 25840, operatingCashFlow: 57620, freeCashFlow: 31780, netDebt: 161550, totalAssets: 345810, investedCapital: 244000 },
    { fy: 'FY23', revenue: 139145, ebitda: 69128, ebit: 28470, pat: 8346,   eps: 13.9,  dps: 4.0,  capex: 30460, operatingCashFlow: 65420, freeCashFlow: 34960, netDebt: 182220, totalAssets: 380610, investedCapital: 262000 },
    { fy: 'FY24', revenue: 149982, ebitda: 77631, ebit: 33240, pat: 7467,   eps: 12.4,  dps: 8.0,  capex: 34600, operatingCashFlow: 72190, freeCashFlow: 37590, netDebt: 210270, totalAssets: 413890, investedCapital: 280000 },
    { fy: 'FY25', revenue: 172985, ebitda: 91795, ebit: 42860, pat: 33556,  eps: 55.7,  dps: 16.0, capex: 36780, operatingCashFlow: 85310, freeCashFlow: 48530, netDebt: 225000, totalAssets: 460000, investedCapital: 298000 },
  ],
  segments: [
    { name: 'India Mobile Services',    fy25Revenue: 95150, fy25Ebit: 28545, fy25Margin: 30.0, targetMultiple: 14, multipleLow: 12, multipleHigh: 17, growthOutlook: 'Tariff hike Jul-24 flows through; ARPU path to ₹250+', share: 55.0 },
    { name: 'Africa (Airtel Africa)',   fy25Revenue: 41515, fy25Ebit: 14120, fy25Margin: 34.0, targetMultiple: 8,  multipleLow: 6,  multipleHigh: 10, growthOutlook: 'Nigeria FX reset hurts; data + Airtel Money compound',share: 24.0 },
    { name: 'Homes / FTTH',             fy25Revenue: 5190,  fy25Ebit: 1200,  fy25Margin: 23.1, targetMultiple: 20, multipleLow: 16, multipleHigh: 24, growthOutlook: 'Fixed broadband land-grab; 10mn home target',           share: 3.0 },
    { name: 'Digital TV',               fy25Revenue: 2770,  fy25Ebit: 350,   fy25Margin: 12.6, targetMultiple: 5,  multipleLow: 4,  multipleHigh: 7,  growthOutlook: 'Structurally declining; streaming substitution',        share: 1.6 },
    { name: 'Enterprise',               fy25Revenue: 19820, fy25Ebit: 4360,  fy25Margin: 22.0, targetMultiple: 10, multipleLow: 8,  multipleHigh: 13, growthOutlook: 'NXtra data-centres + B2B connectivity',                   share: 11.5 },
    { name: 'Passive Infra (Indus)',    fy25Revenue: 8540,  fy25Ebit: 2050,  fy25Margin: 24.0, targetMultiple: 9,  multipleLow: 7,  multipleHigh: 11, growthOutlook: 'Collection efficiency back to 100% post VIL catch-up', share: 4.9 },
  ],
  assumptions: {
    revenueGrowthCAGR: 11.5,
    revenueGrowthY1: 13,
    terminalGrowth: 5.5,
    targetEbitdaMargin: 54,
    taxRate: 25,
    wacc: 11.0,
    costOfEquity: 12.5,
    daPercentRevenue: 28,
    capexPercentRevenue: 20,
    workingCapitalIntensity: -2, // negative WC (prepaid customer base)
    projectionYears: 7,
    payoutRatio: 45,
    dividendGrowthNearTerm: 18,
    dividendGrowthTerminal: 6,
    conglomerateDiscount: 5,
  },
  peers: [
    { name: 'Reliance Jio (via RIL)',  ticker: 'RELIANCE',   category: 'IndianTelecom', marketCapCr: 1750000, evEbitda: 18, pe: 28, dividendYield: 0.4, roic: 10, note: 'Jio embedded in RIL; ARPU ₹203' },
    { name: 'Vodafone Idea',           ticker: 'IDEA',       category: 'IndianTelecom', marketCapCr: 55000,   evEbitda: 11, pe: -1, dividendYield: 0.0, roic: -5, note: 'Distressed; govt equity stake' },
    { name: 'Tata Communications',     ticker: 'TATACOMM',   category: 'IndianTelecom', marketCapCr: 48000,   evEbitda: 11, pe: 40, dividendYield: 1.0, roic: 17, note: 'B2B data + voice' },
    { name: 'Bharti Hexacom',          ticker: 'BHARTIHEXA', category: 'IndianTelecom', marketCapCr: 75000,   evEbitda: 13, pe: 38, dividendYield: 0.4, roic: 13, note: 'North-East + Rajasthan subsidiary' },
    { name: 'MTN Group',               ticker: 'MTN',        category: 'GlobalTelecom', marketCapCr: 165000,  evEbitda: 4.5,pe: 15, dividendYield: 6.0, roic: 12, note: 'Africa competitor' },
    { name: 'AT&T',                    ticker: 'T',          category: 'GlobalTelecom', marketCapCr: 1600000, evEbitda: 7,  pe: 10, dividendYield: 6.5, roic: 8,  note: 'US wireline + wireless' },
    { name: 'Verizon',                 ticker: 'VZ',         category: 'GlobalTelecom', marketCapCr: 1700000, evEbitda: 7,  pe: 9,  dividendYield: 7.0, roic: 9,  note: 'US carrier' },
    { name: 'China Mobile',            ticker: '0941.HK',    category: 'GlobalTelecom', marketCapCr: 1300000, evEbitda: 3,  pe: 10, dividendYield: 7.5, roic: 10, note: 'Largest by subs' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Tariff Lag + FX)',     probability: 0.22, description: 'Next tariff hike delayed >18m; Naira depreciates further; 5G monetisation tepid', color: '#DC2626', overrides: { revenueGrowthCAGR: 6,  targetEbitdaMargin: 49, wacc: 12.0 } },
    { id: 'base',   label: 'Base',                         probability: 0.50, description: 'Jul-24 hike fully-baked; another 15% hike FY27; Africa stabilises',              color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (ARPU Re-rating)',        probability: 0.22, description: 'Two tariff hikes; ARPU ₹280 by FY28; Homes cross 10mn; Africa FCF doubles',    color: '#16A34A', overrides: { revenueGrowthCAGR: 15, targetEbitdaMargin: 58, wacc: 10.0 } },
    { id: 'stress', label: 'AGR + FX Stress',              probability: 0.06, description: 'Fresh AGR demand, Nigeria devaluation 2.0, spectrum auction overpayment',      color: '#7C2D12', overrides: { revenueGrowthCAGR: 4,  targetEbitdaMargin: 46, wacc: 13.0 } },
  ],
  keyDrivers: [
    'India mobile ARPU uplift from Jul-2024 +15% tariff hike',
    '5G monetisation via content + fixed wireless access',
    'Homes / FTTH expansion (target 10mn homes)',
    'Airtel Africa: Nigeria FX reset tailwind once stabilised',
    'NXtra Data Centres + Enterprise B2B ramp',
  ],
  keyRisks: [
    'Fresh AGR / license-fee demands from DoT',
    'Africa FX volatility (Naira, Kwacha)',
    'Price competition from Jio in FTTH + postpaid',
    'Capex intensity delaying FCF conversion',
    'Spectrum auction pricing (mm-wave 5G bands)',
  ],
  recentHighlights: [
    'FY25 revenue ₹1.73L Cr (+15% YoY); PAT ₹33,556 Cr (incl. Indus stake sale)',
    'India ARPU ₹245 in Q4 FY25 vs ₹209 YoY',
    'Net debt-to-EBITDA improved to 2.4x from 3.0x',
    'Dividend ₹16/sh in FY25; +100% YoY',
  ],
  thesisShort: 'India duopoly economics + Africa FCF compounder; ARPU expansion cycle plus capex taper drive multi-year FCF inflection.',
};

// ==========================================================================
// LARSEN & TOUBRO (Consolidated; Infra Projects + Hi-Tech + IT + FinServ)
// ==========================================================================
const LT: CompanyProfile = {
  id: 'lt',
  ticker: 'LT',
  name: 'Larsen & Toubro',
  sector: 'Engineering / Infrastructure / Tech',
  tagline: 'India capex super-cycle proxy; EPC execution engine with IT + FS optionality',
  accentColor: '#0F766E',
  currentMarketPrice: 3600,
  targetPriceRange: { low: 3300, base: 3900, high: 4450 },
  sharesOutstandingCr: 137.5,
  netCashCr: -110000, // consolidated includes LTFH + services arms debt
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 135979, ebitda: 15860, ebit: 10700, pat: 11582, eps: 82.5,  dps: 18.0, capex: 4520, operatingCashFlow: 18280, freeCashFlow: 13760, netDebt: 113620, totalAssets: 348200, investedCapital: 176400 },
    { fy: 'FY22', revenue: 156521, ebitda: 17900, ebit: 12450, pat: 8669,  eps: 61.7,  dps: 22.0, capex: 5180, operatingCashFlow: 14980, freeCashFlow: 9800,  netDebt: 108310, totalAssets: 369500, investedCapital: 183100 },
    { fy: 'FY23', revenue: 183341, ebitda: 20950, ebit: 14580, pat: 12531, eps: 89.0,  dps: 24.0, capex: 5920, operatingCashFlow: 19720, freeCashFlow: 13800, netDebt: 101420, totalAssets: 388100, investedCapital: 190300 },
    { fy: 'FY24', revenue: 221112, ebitda: 25690, ebit: 18600, pat: 13059, eps: 95.0,  dps: 28.0, capex: 7260, operatingCashFlow: 22410, freeCashFlow: 15150, netDebt: 104800, totalAssets: 415800, investedCapital: 204600 },
    { fy: 'FY25', revenue: 255734, ebitda: 29980, ebit: 22100, pat: 15037, eps: 109.3, dps: 34.0, capex: 8640, operatingCashFlow: 27300, freeCashFlow: 18660, netDebt: 110000, totalAssets: 452000, investedCapital: 219800 },
  ],
  segments: [
    { name: 'Infrastructure Projects',  fy25Revenue: 120200, fy25Ebit: 9020,  fy25Margin: 7.5,  targetMultiple: 18, multipleLow: 15, multipleHigh: 22, growthOutlook: 'Order book ₹5.8L Cr; domestic + Saudi Vision 2030 pipeline', share: 47.0 },
    { name: 'Energy Projects',          fy25Revenue: 33250,  fy25Ebit: 2665,  fy25Margin: 8.0,  targetMultiple: 15, multipleLow: 12, multipleHigh: 18, growthOutlook: 'Hydrocarbon MENA + green H2 + nuclear modular reactors',  share: 13.0 },
    { name: 'Hi-Tech Manufacturing',    fy25Revenue: 10230,  fy25Ebit: 1630,  fy25Margin: 15.9, targetMultiple: 22, multipleLow: 18, multipleHigh: 28, growthOutlook: 'Defence + precision engineering; MRSAM, K9 Vajra',           share: 4.0 },
    { name: 'IT & Technology Services', fy25Revenue: 43470,  fy25Ebit: 6960,  fy25Margin: 16.0, targetMultiple: 22, multipleLow: 18, multipleHigh: 26, growthOutlook: 'LTIMindtree + LTTS; GenAI + ER&D tailwind',                  share: 17.0 },
    { name: 'Financial Services',       fy25Revenue: 15340,  fy25Ebit: 3680,  fy25Margin: 24.0, targetMultiple: 14, multipleLow: 11, multipleHigh: 17, growthOutlook: 'LTFH retailisation; RoE 12%+ target',                        share: 6.0 },
    { name: 'Development Projects',     fy25Revenue: 12790,  fy25Ebit: 1790,  fy25Margin: 14.0, targetMultiple: 12, multipleLow: 9,  multipleHigh: 15, growthOutlook: 'Hyderabad Metro ramp; Nabha Power stable',                    share: 5.0 },
    { name: 'Others (Realty, B&M)',     fy25Revenue: 20460,  fy25Ebit: 1640,  fy25Margin: 8.0,  targetMultiple: 12, multipleLow: 10, multipleHigh: 15, growthOutlook: 'Realty exits + smart world & communication',                 share: 8.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 13.5,
    revenueGrowthY1: 15,
    terminalGrowth: 5.5,
    targetEbitdaMargin: 13,
    taxRate: 26,
    wacc: 12.0,
    costOfEquity: 13.0,
    daPercentRevenue: 3.3,
    capexPercentRevenue: 3.5,
    workingCapitalIntensity: 18,
    projectionYears: 7,
    payoutRatio: 33,
    dividendGrowthNearTerm: 15,
    dividendGrowthTerminal: 6,
    conglomerateDiscount: 12,
  },
  peers: [
    { name: 'Siemens India',       ticker: 'SIEMENS',   category: 'IndianInfra', marketCapCr: 215000, evEbitda: 55, pe: 75, dividendYield: 0.3, roic: 22, note: 'Premium cap-goods' },
    { name: 'ABB India',           ticker: 'ABB',       category: 'IndianInfra', marketCapCr: 140000, evEbitda: 60, pe: 80, dividendYield: 0.6, roic: 30, note: 'Electrification' },
    { name: 'Cummins India',       ticker: 'CUMMINSIND',category: 'IndianInfra', marketCapCr: 95000,  evEbitda: 45, pe: 55, dividendYield: 1.1, roic: 28, note: 'Gensets + engines' },
    { name: 'KEC International',   ticker: 'KEC',       category: 'IndianInfra', marketCapCr: 25000,  evEbitda: 18, pe: 45, dividendYield: 0.5, roic: 11, note: 'T&D EPC' },
    { name: 'BHEL',                ticker: 'BHEL',      category: 'IndianInfra', marketCapCr: 85000,  evEbitda: 30, pe: 85, dividendYield: 0.3, roic: 5,  note: 'Thermal PSU' },
    { name: 'GE Aerospace',        ticker: 'GE',        category: 'GlobalInfra', marketCapCr: 1900000,evEbitda: 22, pe: 35, dividendYield: 0.6, roic: 18, note: 'Engines + services' },
    { name: 'Fluor',               ticker: 'FLR',       category: 'GlobalInfra', marketCapCr: 60000,  evEbitda: 10, pe: 20, dividendYield: 0.0, roic: 14, note: 'Global EPC' },
    { name: 'Bechtel (proxy: MDU)',ticker: 'MDU',       category: 'GlobalInfra', marketCapCr: 35000,  evEbitda: 8,  pe: 16, dividendYield: 3.0, roic: 9,  note: 'US infra services' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Orderbook Stall)',     probability: 0.20, description: 'Capex cycle delays, MENA oil capex pauses, LTFH slippage, margin 10.5%', color: '#DC2626', overrides: { revenueGrowthCAGR: 7,  targetEbitdaMargin: 10.5, wacc: 13 } },
    { id: 'base',   label: 'Base',                       probability: 0.50, description: 'Lakshya plan on track: ROE 18%, services ~45% of EBITDA by FY26',         color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Lakshya Beat)',        probability: 0.22, description: 'Saudi Vision 2030 mega-orders + defence wins; margin 14%+',                color: '#16A34A', overrides: { revenueGrowthCAGR: 17, targetEbitdaMargin: 15, wacc: 11 } },
    { id: 'stress', label: 'WC Blow-out',                probability: 0.08, description: 'Claims arbitration delays + client receivables stress; NWC to 25% of rev',color: '#7C2D12', overrides: { revenueGrowthCAGR: 5,  targetEbitdaMargin: 9,  wacc: 13.5 } },
  ],
  keyDrivers: [
    'Order book ₹5.8L Cr with ~36% international mix',
    'Saudi Vision 2030 / Qatar / UAE hydrocarbon + infra pipeline',
    'Defence indigenisation (MRSAM, K9 Vajra, submarines)',
    'Lakshya 2026 targets: ROE 18%, services-led mix',
    'Buy-back + dividend capital return accelerating',
  ],
  keyRisks: [
    'Execution / margin pressure on fixed-price contracts',
    'Working-capital build and claims arbitration',
    'Global oil capex slowdown hitting MENA pipeline',
    'LTFH asset-quality / retailisation transition',
    'Promoter-less structure; takeover / governance optics',
  ],
  recentHighlights: [
    'FY25 revenue ₹2.56L Cr (+16% YoY); PAT ₹15,037 Cr',
    'Order inflow ₹3.5L Cr in FY25; book +22% YoY',
    '₹10,000 Cr buy-back + ₹34 dividend announced',
    'Green energy (GH2, EV chargers) JV ramping',
  ],
  thesisShort: 'The cleanest listed proxy to India + GCC capex cycles; services mix + buy-backs support multiple even as E&C margins stay rangebound.',
};

// ==========================================================================
// BAJAJ FINANCE (Consolidated NBFC; book-growth + cross-sell franchise)
// ==========================================================================
const BAJFIN: CompanyProfile = {
  id: 'bajfin',
  ticker: 'BAJFINANCE',
  name: 'Bajaj Finance',
  sector: 'Non-Banking Financial Company (Retail Lending)',
  tagline: 'India\'s premier retail NBFC; AUM 26% CAGR + cross-sell compounding machine',
  accentColor: '#2563EB',
  currentMarketPrice: 7000,
  targetPriceRange: { low: 6450, base: 7600, high: 8800 },
  sharesOutstandingCr: 62.1,
  netCashCr: 0, // not meaningful for NBFC - funded borrowings match AUM
  reportingCurrency: 'INR',
  // NBFC framing:
  //   revenue = Total Income (NII + fee + other)
  //   ebitda  = Pre-Provisioning Operating Profit (PPOP) (D&A small)
  //   ebit    = PPOP - net credit cost (i.e., PBT proxy)
  //   capex   = tech + branch fit-outs (lean)
  //   totalAssets tracks AUM + cash + investments
  historical: [
    { fy: 'FY21', revenue: 26683, ebitda: 12167, ebit: 6198,  pat: 4419,  eps: 73.4,  dps: 10.0, capex: 280, operatingCashFlow: -24500, freeCashFlow: -24780, netDebt: 109000, totalAssets: 162200, investedCapital: 145000 },
    { fy: 'FY22', revenue: 31640, ebitda: 14490, ebit: 9687,  pat: 7028,  eps: 116.5, dps: 20.0, capex: 320, operatingCashFlow: -37200, freeCashFlow: -37520, netDebt: 140000, totalAssets: 210000, investedCapital: 182000 },
    { fy: 'FY23', revenue: 41411, ebitda: 19194, ebit: 16004, pat: 11508, eps: 190.0, dps: 30.0, capex: 420, operatingCashFlow: -48400, freeCashFlow: -48820, netDebt: 178000, totalAssets: 275000, investedCapital: 230000 },
    { fy: 'FY24', revenue: 54969, ebitda: 25200, ebit: 20569, pat: 14451, eps: 233.5, dps: 36.0, capex: 520, operatingCashFlow: -65800, freeCashFlow: -66320, netDebt: 238000, totalAssets: 366000, investedCapital: 305000 },
    { fy: 'FY25', revenue: 69714, ebitda: 30970, ebit: 24370, pat: 16779, eps: 270.9, dps: 44.0, capex: 640, operatingCashFlow: -78500, freeCashFlow: -79140, netDebt: 305000, totalAssets: 460000, investedCapital: 385000 },
  ],
  segments: [
    { name: 'Consumer Finance (B2C + 2W)', fy25Revenue: 22310, fy25Ebit: 7800, fy25Margin: 35.0, targetMultiple: 24, multipleLow: 20, multipleHigh: 28, growthOutlook: 'B2C loans, 2W/3W; stress in unsecured tempering growth', share: 32.0 },
    { name: 'Mortgages (HF + LAP + Auto)', fy25Revenue: 13940, fy25Ebit: 5300, fy25Margin: 38.0, targetMultiple: 20, multipleLow: 17, multipleHigh: 24, growthOutlook: 'BHFL IPO optionality; tier-2/3 home loans',             share: 20.0 },
    { name: 'SME Lending',                  fy25Revenue: 9760,  fy25Ebit: 3700, fy25Margin: 37.9, targetMultiple: 18, multipleLow: 15, multipleHigh: 22, growthOutlook: 'Secured business loans + working cap',                    share: 14.0 },
    { name: 'Commercial Lending',           fy25Revenue: 6970,  fy25Ebit: 2650, fy25Margin: 38.0, targetMultiple: 15, multipleLow: 12, multipleHigh: 18, growthOutlook: 'Mid-corporate, LRD, developer finance',                   share: 10.0 },
    { name: 'Rural Lending',                fy25Revenue: 7670,  fy25Ebit: 2450, fy25Margin: 31.9, targetMultiple: 16, multipleLow: 13, multipleHigh: 20, growthOutlook: 'MFI slippages peaking; gold loans scaling',               share: 11.0 },
    { name: 'Deposits + Investments Fee',   fy25Revenue: 9060,  fy25Ebit: 3060, fy25Margin: 33.8, targetMultiple: 22, multipleLow: 18, multipleHigh: 26, growthOutlook: 'Fixed deposits ₹70K Cr+; fee income annuity',             share: 13.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 24,
    revenueGrowthY1: 25,
    terminalGrowth: 7.0,
    targetEbitdaMargin: 45, // PPOP / Total Income proxy
    taxRate: 25,
    wacc: 13,
    costOfEquity: 14,
    daPercentRevenue: 0.8,
    capexPercentRevenue: 1.0,
    workingCapitalIntensity: 0, // book-growth reflected in financing, not WC
    projectionYears: 7,
    payoutRatio: 18,
    dividendGrowthNearTerm: 22,
    dividendGrowthTerminal: 7,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'Cholamandalam Inv.',  ticker: 'CHOLAFIN',    category: 'IndianNBFC', marketCapCr: 130000, evEbitda: 22, pe: 28, dividendYield: 0.2, roic: 17, note: 'Vehicle + home equity' },
    { name: 'Shriram Finance',     ticker: 'SHRIRAMFIN',  category: 'IndianNBFC', marketCapCr: 125000, evEbitda: 13, pe: 15, dividendYield: 1.5, roic: 15, note: 'CV + retail NBFC' },
    { name: 'LIC Housing Finance', ticker: 'LICHSGFIN',   category: 'IndianNBFC', marketCapCr: 35000,  evEbitda: 8,  pe: 7,  dividendYield: 1.8, roic: 13, note: 'Mortgage leader' },
    { name: 'Power Finance Corp',  ticker: 'PFC',         category: 'IndianNBFC', marketCapCr: 160000, evEbitda: 7,  pe: 6,  dividendYield: 3.0, roic: 13, note: 'Power sector NBFC' },
    { name: 'SBI Cards',           ticker: 'SBICARD',     category: 'IndianNBFC', marketCapCr: 70000,  evEbitda: 20, pe: 30, dividendYield: 0.3, roic: 20, note: 'Cards monoline' },
    { name: 'Muthoot Finance',     ticker: 'MUTHOOTFIN',  category: 'IndianNBFC', marketCapCr: 80000,  evEbitda: 12, pe: 16, dividendYield: 1.1, roic: 18, note: 'Gold loan leader' },
    { name: 'American Express',    ticker: 'AXP',         category: 'GlobalNBFC', marketCapCr: 1700000,evEbitda: 16, pe: 20, dividendYield: 1.1, roic: 22, note: 'Premium cards' },
    { name: 'Discover Financial',  ticker: 'DFS',         category: 'GlobalNBFC', marketCapCr: 340000, evEbitda: 7,  pe: 11, dividendYield: 1.7, roic: 15, note: 'US cards + DL' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Credit Cost Shock)',  probability: 0.22, description: 'Unsecured delinquencies rise to 2.8% credit cost; AUM growth slows to 15%',    color: '#DC2626', overrides: { revenueGrowthCAGR: 15, targetEbitdaMargin: 38, wacc: 14.0 } },
    { id: 'base',   label: 'Base',                       probability: 0.52, description: 'AUM 25% CAGR; credit cost 1.8-2.0%; cross-sell franchise intact',              color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Platform Re-rating)',  probability: 0.20, description: 'Omni-channel strategy delivers >30% customer growth; BHFL / BBFSL listings',  color: '#16A34A', overrides: { revenueGrowthCAGR: 28, targetEbitdaMargin: 48, wacc: 12.5 } },
    { id: 'stress', label: 'RBI Action / MFI Wave',      probability: 0.06, description: 'RBI embargo on unsecured; MFI defaults cascade; ROE falls below 15%',         color: '#7C2D12', overrides: { revenueGrowthCAGR: 10, targetEbitdaMargin: 34, wacc: 15 } },
  ],
  keyDrivers: [
    'AUM growth engine: ₹4.17L Cr (+30% YoY), target 26-28% CAGR',
    'Cross-sell franchise: 97mn+ customers, low customer-acquisition cost',
    'Omnichannel 3.0 + digital gold + UPI-based FD acquisition',
    'Bajaj Housing Finance listing unlock (Sep-2024)',
    'Fee income + deposit franchise scaling',
  ],
  keyRisks: [
    'Unsecured retail credit cost cycle',
    'Rural / MFI slippage contagion',
    'RBI regulatory action on unsecured / co-lending',
    'NIM compression from borrowing cost uptick',
    'Key-man / leadership transition risk (Rajeev Jain)',
  ],
  recentHighlights: [
    'FY25 AUM ₹4.17L Cr (+30% YoY); PAT ₹16,779 Cr (+16%)',
    'Customer franchise 97.1mn (+21% YoY)',
    'GNPA 1.04%; NNPA 0.44% (stable)',
    'BHFL listed Sep-2024 at ~2x IPO price; crystallised value',
  ],
  thesisShort: 'Market leader in retail lending with unmatched cross-sell engine; near-term credit cost concerns are cyclical against a structural compounding story.',
};

// ==========================================================================
// ASIAN PAINTS (Consolidated; FY25 disrupted by Birla Opus entry & demand dip)
// ==========================================================================
const ASIAN: CompanyProfile = {
  id: 'asian',
  ticker: 'ASIANPAINT',
  name: 'Asian Paints',
  sector: 'Paints & Coatings',
  tagline: 'Category-leading paints franchise under its first genuine competitive threat in decades',
  accentColor: '#EA580C',
  currentMarketPrice: 2450,
  targetPriceRange: { low: 2200, base: 2650, high: 3050 },
  sharesOutstandingCr: 95.9,
  netCashCr: 7500,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 21713, ebitda: 5065, ebit: 4185, pat: 3139, eps: 32.7, dps: 17.8, capex: 660,  operatingCashFlow: 4790, freeCashFlow: 4130, netDebt: -5800, totalAssets: 18780, investedCapital: 12100 },
    { fy: 'FY22', revenue: 29101, ebitda: 5398, ebit: 4385, pat: 3053, eps: 31.8, dps: 21.2, capex: 780,  operatingCashFlow: 3170, freeCashFlow: 2390, netDebt: -4900, totalAssets: 22160, investedCapital: 13680 },
    { fy: 'FY23', revenue: 34489, ebitda: 6434, ebit: 5234, pat: 4147, eps: 43.2, dps: 25.6, capex: 1240, operatingCashFlow: 4780, freeCashFlow: 3540, netDebt: -5900, totalAssets: 24530, investedCapital: 14950 },
    { fy: 'FY24', revenue: 35494, ebitda: 7847, ebit: 6490, pat: 5460, eps: 56.9, dps: 33.3, capex: 1820, operatingCashFlow: 7050, freeCashFlow: 5230, netDebt: -7100, totalAssets: 27800, investedCapital: 16420 },
    { fy: 'FY25', revenue: 33905, ebitda: 6340, ebit: 4990, pat: 3900, eps: 40.7, dps: 28.6, capex: 2460, operatingCashFlow: 5380, freeCashFlow: 2920, netDebt: -7500, totalAssets: 29900, investedCapital: 17800 },
  ],
  segments: [
    { name: 'Decorative Paints - India', fy25Revenue: 27100, fy25Ebit: 4500, fy25Margin: 16.6, targetMultiple: 28, multipleLow: 24, multipleHigh: 34, growthOutlook: 'Volume 2-4%, value flat; discounts elevated vs Birla Opus', share: 80.0 },
    { name: 'International',             fy25Revenue: 2700,  fy25Ebit: 140,  fy25Margin: 5.2,  targetMultiple: 15, multipleLow: 12, multipleHigh: 18, growthOutlook: 'Egypt + Bangladesh + Nepal; FX volatility',                     share: 8.0 },
    { name: 'Industrial Coatings',       fy25Revenue: 3050,  fy25Ebit: 245,  fy25Margin: 8.0,  targetMultiple: 18, multipleLow: 15, multipleHigh: 22, growthOutlook: 'PPG JV protective + auto refinish; cyclical',                     share: 9.0 },
    { name: 'Home Décor (White Teak, etc.)',fy25Revenue: 1055,fy25Ebit: 105, fy25Margin: 10.0, targetMultiple: 25, multipleLow: 20, multipleHigh: 30, growthOutlook: 'Ess Ess, White Teak, Sleek, WeatherSeal integration',             share: 3.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 8,
    revenueGrowthY1: 3,
    terminalGrowth: 5.5,
    targetEbitdaMargin: 20,
    taxRate: 25,
    wacc: 11.5,
    costOfEquity: 12.5,
    daPercentRevenue: 4,
    capexPercentRevenue: 5.5,
    workingCapitalIntensity: 12,
    projectionYears: 7,
    payoutRatio: 65,
    dividendGrowthNearTerm: 5,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'Berger Paints',         ticker: 'BERGEPAINT',category: 'IndianPaints', marketCapCr: 62000,  evEbitda: 28, pe: 50, dividendYield: 0.7, roic: 24, note: '#2 decorative' },
    { name: 'Kansai Nerolac',        ticker: 'KANSAINER', category: 'IndianPaints', marketCapCr: 22000,  evEbitda: 15, pe: 25, dividendYield: 2.0, roic: 18, note: 'Industrial + deco' },
    { name: 'Akzo Nobel India',      ticker: 'AKZOINDIA', category: 'IndianPaints', marketCapCr: 15500,  evEbitda: 20, pe: 30, dividendYield: 2.5, roic: 35, note: 'Premium Dulux' },
    { name: 'Indigo Paints',         ticker: 'INDIGOPNTS',category: 'IndianPaints', marketCapCr: 6500,   evEbitda: 18, pe: 30, dividendYield: 0.5, roic: 22, note: 'Niche challenger' },
    { name: 'Grasim (Birla Opus)',   ticker: 'GRASIM',    category: 'IndianPaints', marketCapCr: 190000, evEbitda: 14, pe: 20, dividendYield: 0.5, roic: 10, note: 'New entrant; capex drag' },
    { name: 'Pidilite (adjacent)',   ticker: 'PIDILITIND',category: 'IndianPaints', marketCapCr: 145000, evEbitda: 38, pe: 65, dividendYield: 0.6, roic: 30, note: 'Adhesives leader' },
    { name: 'Sherwin-Williams',      ticker: 'SHW',       category: 'GlobalPaints', marketCapCr: 680000, evEbitda: 18, pe: 28, dividendYield: 1.0, roic: 20, note: 'Global leader' },
    { name: 'PPG Industries',        ticker: 'PPG',       category: 'GlobalPaints', marketCapCr: 260000, evEbitda: 13, pe: 19, dividendYield: 2.0, roic: 15, note: 'Industrial coatings' },
    { name: 'Nippon Paint',          ticker: '4612.T',    category: 'GlobalPaints', marketCapCr: 210000, evEbitda: 11, pe: 19, dividendYield: 1.5, roic: 14, note: 'Asia + Dulux Turkey' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Market-share Loss)', probability: 0.28, description: 'Birla Opus + JSW + Pidilite take 6-8% share; price war persists; margin 16%', color: '#DC2626', overrides: { revenueGrowthCAGR: 4, targetEbitdaMargin: 16, wacc: 12.5 } },
    { id: 'base',   label: 'Base',                      probability: 0.48, description: 'Volume growth returns to 6-8%; margins recover to 20% as competition normalises', color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Premium Mix)',         probability: 0.18, description: 'Luxury + beautiful home stores + services (Safe Painting) scale; mix offsets',   color: '#16A34A', overrides: { revenueGrowthCAGR: 11, targetEbitdaMargin: 22, wacc: 10.5 } },
    { id: 'stress', label: 'Crude / Tio2 Spike',         probability: 0.06, description: 'Input cost shock + GST hike on paints; margin crashes to 14%',                    color: '#7C2D12', overrides: { revenueGrowthCAGR: 3, targetEbitdaMargin: 14, wacc: 13 } },
  ],
  keyDrivers: [
    'Decorative volume recovery post Birla Opus entry',
    'Premium + luxury mix (Royale, Nilaya) lifting ASP',
    'Beautiful Home Stores (350+ experiential centres)',
    'Home décor ecosystem (Ess Ess, Sleek, White Teak)',
    'Tier-3/4 distribution depth (1.75L+ retail touch-points)',
  ],
  keyRisks: [
    'Birla Opus, JSW Paints, Pidilite share grab',
    'Prolonged discount war compressing margin',
    'Crude + Ti-O2 + monomers raw-material cycle',
    'GST / tax classification changes',
    'Unseasonal monsoons hurting paint season',
  ],
  recentHighlights: [
    'FY25 revenue ₹33,905 Cr (-4.5% YoY); PAT ₹3,900 Cr (-29%)',
    'Domestic deco volume +1% / value -5% in FY25',
    'Dealer network ₹1.75L+ retail touch-points',
    'Board approved expansion in White Cement waterproofing',
  ],
  thesisShort: 'Best-in-class paints franchise at a cycle-low valuation; multi-year re-rating triggered by competition normalisation + premium mix recovery.',
};

// ==========================================================================
// NTPC (Consolidated; regulated RoE with renewables + nuclear optionality)
// ==========================================================================
const NTPC: CompanyProfile = {
  id: 'ntpc',
  ticker: 'NTPC',
  name: 'NTPC Limited',
  sector: 'Power Generation - Utility',
  tagline: 'India\'s largest power producer; regulated RoE core + renewables growth engine',
  accentColor: '#1E40AF',
  currentMarketPrice: 350,
  targetPriceRange: { low: 320, base: 395, high: 455 },
  sharesOutstandingCr: 969.4,
  netCashCr: -225000, // heavy gross debt fund regulated capex; offset by regulated RAB
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 111530, ebitda: 37820, ebit: 26930, pat: 14635, eps: 15.1, dps: 6.15, capex: 20920, operatingCashFlow: 29840, freeCashFlow: 8920,  netDebt: 184900, totalAssets: 378900, investedCapital: 283000 },
    { fy: 'FY22', revenue: 132669, ebitda: 42370, ebit: 30180, pat: 16960, eps: 17.5, dps: 7.00, capex: 23750, operatingCashFlow: 33520, freeCashFlow: 9770,  netDebt: 195200, totalAssets: 408100, investedCapital: 304500 },
    { fy: 'FY23', revenue: 177977, ebitda: 46470, ebit: 33390, pat: 17197, eps: 17.7, dps: 7.25, capex: 30160, operatingCashFlow: 36970, freeCashFlow: 6810,  netDebt: 208700, totalAssets: 445800, investedCapital: 329600 },
    { fy: 'FY24', revenue: 181166, ebitda: 52420, ebit: 39060, pat: 21332, eps: 22.0, dps: 7.75, capex: 35710, operatingCashFlow: 45200, freeCashFlow: 9490,  netDebt: 218100, totalAssets: 488200, investedCapital: 354800 },
    { fy: 'FY25', revenue: 179181, ebitda: 58110, ebit: 44200, pat: 23953, eps: 24.7, dps: 8.25, capex: 42300, operatingCashFlow: 51640, freeCashFlow: 9340,  netDebt: 225000, totalAssets: 525000, investedCapital: 380000 },
  ],
  segments: [
    { name: 'Thermal / Coal Generation', fy25Revenue: 148730, fy25Ebit: 34420, fy25Margin: 23.1, targetMultiple: 9,  multipleLow: 7,  multipleHigh: 11, growthOutlook: 'Base-load workhorse; PLF ~76%; regulated RoE 15.5%', share: 83.0 },
    { name: 'Gas Generation',            fy25Revenue: 10750,  fy25Ebit: 1720,  fy25Margin: 16.0, targetMultiple: 7,  multipleLow: 5,  multipleHigh: 9,  growthOutlook: 'Low PLF; peaking role only',                            share: 6.0 },
    { name: 'Hydro',                     fy25Revenue: 3580,   fy25Ebit: 860,   fy25Margin: 24.0, targetMultiple: 11, multipleLow: 9,  multipleHigh: 14, growthOutlook: 'Expansion via NTPC Hydro + NEEPCO',                      share: 2.0 },
    { name: 'Renewables (NGEL)',         fy25Revenue: 5380,   fy25Ebit: 1720,  fy25Margin: 32.0, targetMultiple: 22, multipleLow: 18, multipleHigh: 28, growthOutlook: 'NGEL IPO Nov-24; 60 GW by 2032 target',                   share: 3.0 },
    { name: 'Coal Mining',               fy25Revenue: 3590,   fy25Ebit: 720,   fy25Margin: 20.1, targetMultiple: 6,  multipleLow: 4,  multipleHigh: 8,  growthOutlook: 'Captive coal to reduce fuel cost pass-through',            share: 2.0 },
    { name: 'Consultancy / Other',       fy25Revenue: 7150,   fy25Ebit: 1430,  fy25Margin: 20.0, targetMultiple: 12, multipleLow: 10, multipleHigh: 15, growthOutlook: 'EPC + consultancy + nuclear JV (NTPC Parmanu)',            share: 4.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 8,
    revenueGrowthY1: 6,
    terminalGrowth: 5.0,
    targetEbitdaMargin: 35,
    taxRate: 25,
    wacc: 9.5,
    costOfEquity: 11.5,
    daPercentRevenue: 8,
    capexPercentRevenue: 20,
    workingCapitalIntensity: 6,
    projectionYears: 10, // longer horizon for regulated utility + renewables build
    payoutRatio: 38,
    dividendGrowthNearTerm: 8,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 10, // PSU governance + green/brown mix
  },
  peers: [
    { name: 'Power Grid',           ticker: 'POWERGRID', category: 'IndianUtilities', marketCapCr: 280000,  evEbitda: 11, pe: 18, dividendYield: 3.5, roic: 13, note: 'Transmission PSU' },
    { name: 'Adani Power',          ticker: 'ADANIPOWER',category: 'IndianUtilities', marketCapCr: 210000,  evEbitda: 9,  pe: 14, dividendYield: 0.0, roic: 15, note: 'Private thermal' },
    { name: 'Tata Power',           ticker: 'TATAPOWER', category: 'IndianUtilities', marketCapCr: 135000,  evEbitda: 14, pe: 30, dividendYield: 0.5, roic: 10, note: 'Renewables + distribution' },
    { name: 'JSW Energy',           ticker: 'JSWENERGY', category: 'IndianUtilities', marketCapCr: 95000,   evEbitda: 14, pe: 38, dividendYield: 0.4, roic: 9,  note: 'Hydro + thermal + RE' },
    { name: 'NHPC',                 ticker: 'NHPC',      category: 'IndianUtilities', marketCapCr: 90000,   evEbitda: 12, pe: 22, dividendYield: 2.1, roic: 9,  note: 'Hydro PSU' },
    { name: 'SJVN',                 ticker: 'SJVN',      category: 'IndianUtilities', marketCapCr: 42000,   evEbitda: 12, pe: 36, dividendYield: 2.0, roic: 6,  note: 'Hydro + renewables PSU' },
    { name: 'Adani Green Energy',   ticker: 'ADANIGREEN',category: 'IndianUtilities', marketCapCr: 160000,  evEbitda: 20, pe: 110,dividendYield: 0.0, roic: 8,  note: 'Pure-play RE' },
    { name: 'NextEra Energy',       ticker: 'NEE',       category: 'GlobalUtilities', marketCapCr: 1500000, evEbitda: 18, pe: 22, dividendYield: 3.0, roic: 7,  note: 'US RE leader' },
    { name: 'Iberdrola',            ticker: 'IBE',       category: 'GlobalUtilities', marketCapCr: 750000,  evEbitda: 10, pe: 17, dividendYield: 4.2, roic: 7,  note: 'Global regulated + RE' },
    { name: 'Duke Energy',          ticker: 'DUK',       category: 'GlobalUtilities', marketCapCr: 800000,  evEbitda: 11, pe: 18, dividendYield: 3.8, roic: 6,  note: 'US regulated' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (RE Delays + Coal Tax)',probability: 0.22, description: 'Green capex slips, coal cess/green tax hits thermal margins, RoE compression', color: '#DC2626', overrides: { revenueGrowthCAGR: 4, targetEbitdaMargin: 30, wacc: 10.5 } },
    { id: 'base',   label: 'Base',                       probability: 0.52, description: '130 GW target (60 GW RE + 70 GW thermal) by 2032; regulated RoE 15.5% intact',  color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (NGEL Re-rating)',      probability: 0.20, description: 'NGEL scales to 60 GW; SOTP unlock + nuclear optionality adds ₹80/sh',          color: '#16A34A', overrides: { revenueGrowthCAGR: 11, targetEbitdaMargin: 38, wacc: 8.5 } },
    { id: 'stress', label: 'Fuel + Dues Shock',          probability: 0.06, description: 'SEB receivables balloon, imported coal spike, stranded gas assets impair',     color: '#7C2D12', overrides: { revenueGrowthCAGR: 2, targetEbitdaMargin: 27, wacc: 11 } },
  ],
  keyDrivers: [
    'Regulated RoE framework (15.5% base) on expanding RAB',
    'Capacity pipeline: 130 GW installed target by 2032',
    'NGEL renewables arm: 60 GW target; Nov-2024 listing',
    'Nuclear JV (NTPC Parmanu Urja Nigam with NPCIL)',
    'Captive coal mining reducing fuel pass-through lag',
  ],
  keyRisks: [
    'Discom (SEB) receivables and LPS cycles',
    'Coal availability / imported coal cost spikes',
    'Green taxonomy + carbon pricing on thermal book',
    'Execution delays on renewables + nuclear capex',
    'PSU governance + policy discretion risk',
  ],
  recentHighlights: [
    'FY25 revenue ₹1.79L Cr; PAT ₹23,953 Cr (+12% YoY)',
    'Installed capacity 76.6 GW (FY25-end); 26 GW under construction',
    'NGEL IPO Nov-2024 (₹10K Cr) - 60 GW RE vehicle',
    'Final dividend ₹3.35/sh; total FY25 ₹8.25/sh',
  ],
  thesisShort: 'Regulated-RoE dividend compounder with embedded green option: NGEL listing crystallises value while the thermal book keeps funding the transition.',
};

// ==========================================================================
// ICICI BANK (Consolidated; private-bank peer to HDFC Bank)
// Sector-appropriate proxies (banks):
//   revenue = Total Operating Income (NII + Other Income)
//   ebitda  = Pre-Provision Operating Profit (PPOP)
//   ebit    = PPOP - provisions (PBT proxy); D&A small
// ==========================================================================
const ICICIBANK: CompanyProfile = {
  id: 'icicibank',
  ticker: 'ICICIBANK',
  name: 'ICICI Bank',
  sector: 'Private Banking / BFSI',
  tagline: 'Best-in-class ROA among large private banks; digital + subsidiary value',
  accentColor: '#B45309',
  currentMarketPrice: 1250,
  targetPriceRange: { low: 1170, base: 1380, high: 1560 },
  sharesOutstandingCr: 705.7,
  netCashCr: 0,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 77914,  ebitda: 44920, ebit: 27930, pat: 18384, eps: 26.6, dps: 2.0,  capex: 1390, operatingCashFlow: 24150, freeCashFlow: 22760, netDebt: 0, totalAssets: 1230434, investedCapital: 146908 },
    { fy: 'FY22', revenue: 86375,  ebitda: 50480, ebit: 37650, pat: 25110, eps: 36.1, dps: 5.0,  capex: 1530, operatingCashFlow: 31480, freeCashFlow: 29950, netDebt: 0, totalAssets: 1411298, investedCapital: 169500 },
    { fy: 'FY23', revenue: 109231, ebitda: 58015, ebit: 48700, pat: 34037, eps: 48.9, dps: 8.0,  capex: 1720, operatingCashFlow: 42200, freeCashFlow: 40480, netDebt: 0, totalAssets: 1584207, investedCapital: 198500 },
    { fy: 'FY24', revenue: 133928, ebitda: 72460, ebit: 61200, pat: 44256, eps: 63.1, dps: 10.0, capex: 1960, operatingCashFlow: 54680, freeCashFlow: 52720, netDebt: 0, totalAssets: 1878500, investedCapital: 232200 },
    { fy: 'FY25', revenue: 158970, ebitda: 85020, ebit: 72250, pat: 51029, eps: 72.3, dps: 11.0, capex: 2210, operatingCashFlow: 63520, freeCashFlow: 61310, netDebt: 0, totalAssets: 2151000, investedCapital: 267400 },
  ],
  segments: [
    { name: 'Retail Banking',       fy25Revenue: 87430, fy25Ebit: 37860, fy25Margin: 43.3, targetMultiple: 18, multipleLow: 15, multipleHigh: 22, growthOutlook: 'Secured retail leading; unsecured slowing controlled',  share: 55.0 },
    { name: 'Wholesale Banking',    fy25Revenue: 30890, fy25Ebit: 17100, fy25Margin: 55.4, targetMultiple: 13, multipleLow: 11, multipleHigh: 16, growthOutlook: 'Corporate + transaction banking; capex cycle tailwind', share: 19.4 },
    { name: 'Treasury',             fy25Revenue: 22500, fy25Ebit: 10100, fy25Margin: 44.9, targetMultiple: 10, multipleLow: 8,  multipleHigh: 12, growthOutlook: 'Yield normalisation + FX + bonds',                         share: 14.2 },
    { name: 'Insurance (Life + GI)',fy25Revenue: 12970, fy25Ebit: 4200,  fy25Margin: 32.4, targetMultiple: 20, multipleLow: 17, multipleHigh: 24, growthOutlook: 'ICICI Pru Life + ICICI Lombard stakes',                  share: 8.2 },
    { name: 'Others (AMC, BSE, etc.)',fy25Revenue: 5180, fy25Ebit: 2990, fy25Margin: 57.7, targetMultiple: 22, multipleLow: 18, multipleHigh: 28, growthOutlook: 'ICICI Prudential AMC + Securities + Venture capital',    share: 3.2 },
  ],
  assumptions: {
    revenueGrowthCAGR: 14,
    revenueGrowthY1: 12,
    terminalGrowth: 5.5,
    targetEbitdaMargin: 55,
    taxRate: 25,
    wacc: 12.0,
    costOfEquity: 13.0,
    daPercentRevenue: 1.0,
    capexPercentRevenue: 1.4,
    workingCapitalIntensity: 0,
    projectionYears: 7,
    payoutRatio: 17,
    dividendGrowthNearTerm: 15,
    dividendGrowthTerminal: 6,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'HDFC Bank',        ticker: 'HDFCBANK',   category: 'IndianBank', marketCapCr: 1370000,evEbitda: 11, pe: 20, dividendYield: 1.2, roic: 14, note: 'Larger private bank peer' },
    { name: 'Axis Bank',        ticker: 'AXISBANK',   category: 'IndianBank', marketCapCr: 360000, evEbitda: 8,  pe: 14, dividendYield: 0.1, roic: 14, note: 'Citi retail integration' },
    { name: 'Kotak Mahindra',   ticker: 'KOTAKBANK',  category: 'IndianBank', marketCapCr: 380000, evEbitda: 11, pe: 19, dividendYield: 0.1, roic: 16, note: 'Premium franchise' },
    { name: 'State Bank of India', ticker: 'SBIN',    category: 'IndianBank', marketCapCr: 710000, evEbitda: 6,  pe: 10, dividendYield: 1.8, roic: 13, note: 'PSU leader' },
    { name: 'IndusInd Bank',    ticker: 'INDUSINDBK', category: 'IndianBank', marketCapCr: 68000,  evEbitda: 6,  pe: 8,  dividendYield: 1.2, roic: 10, note: 'Mid-size private' },
    { name: 'Federal Bank',     ticker: 'FEDERALBNK', category: 'IndianBank', marketCapCr: 50000,  evEbitda: 7,  pe: 10, dividendYield: 1.1, roic: 13, note: 'South-India mid-cap' },
    { name: 'JPMorgan Chase',   ticker: 'JPM',        category: 'GlobalBank', marketCapCr: 5400000,evEbitda: 9,  pe: 13, dividendYield: 2.3, roic: 15, note: 'US mega-bank' },
    { name: 'DBS Bank',         ticker: 'D05.SI',     category: 'GlobalBank', marketCapCr: 940000, evEbitda: 9,  pe: 11, dividendYield: 5.0, roic: 14, note: 'SGX peer' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Credit Cycle)',   probability: 0.22, description: 'Credit cost normalises to 100bps; NIM -25bps on rate cuts; growth slows to 10%',     color: '#DC2626', overrides: { revenueGrowthCAGR: 9,  targetEbitdaMargin: 50, wacc: 13 } },
    { id: 'base',   label: 'Base',                   probability: 0.52, description: 'Loan growth 14-15%, NIM 4.2-4.4%, ROA 2.3%+, PPOP compounding in line with book',     color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Franchise Premium)',probability: 0.20, description: 'ROA holds 2.5%; subsidiary re-rating; best-in-class digital + secured retail mix',  color: '#16A34A', overrides: { revenueGrowthCAGR: 17, targetEbitdaMargin: 58, wacc: 11 } },
    { id: 'stress', label: 'Unsecured Retail Shock', probability: 0.06, description: 'PL + credit card slippages spike; provisioning doubles; ROE sub-15%',               color: '#7C2D12', overrides: { revenueGrowthCAGR: 7,  targetEbitdaMargin: 45, wacc: 13.5 } },
  ],
  keyDrivers: [
    'Best-in-class ROA (2.4%) and ROE (18%+) among large banks',
    'Secured retail mix (mortgages + vehicle) >60% of retail',
    '360-degree digital + iMobile Pay franchise',
    'Subsidiary value: ICICI Pru Life, Lombard, AMC, Securities',
    'Lowest cost-income ratio among private peers (~40%)',
  ],
  keyRisks: [
    'Unsecured retail delinquency cycle',
    'NIM compression on repo rate cuts',
    'Corporate credit slippage re-emergence',
    'Regulatory: priority-sector + draft project-finance norms',
  ],
  recentHighlights: [
    'FY25 PAT ₹51,029 Cr (+15% YoY); ROA 2.4%, ROE 18.6%',
    'Loan book +13.9% YoY; deposits +14.0% YoY',
    'GNPA 1.67%, NNPA 0.39% (best among peers)',
    'Final dividend ₹11/sh; subsidiary dividends strong',
  ],
  thesisShort: 'Best-operating private bank with sustainable >2% ROA, subsidiary optionality and franchise premium versus HDFC Bank on growth differential.',
};

// ==========================================================================
// TATA STEEL (Consolidated; India steel + Europe restructuring + Netherlands)
// Cyclical - FY21/FY22 benefited from post-COVID steel super-cycle
// ==========================================================================
const TATASTEEL: CompanyProfile = {
  id: 'tatasteel',
  ticker: 'TATASTEEL',
  name: 'Tata Steel',
  sector: 'Metals & Mining - Steel',
  tagline: 'India steel cash engine; UK transition + Netherlands cost-out drive European turnaround',
  accentColor: '#1E293B',
  currentMarketPrice: 145,
  targetPriceRange: { low: 125, base: 165, high: 195 },
  sharesOutstandingCr: 1249.0,
  netCashCr: -80000,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 156477, ebitda: 30892, ebit: 22100,  pat: 8190,  eps: 6.6,   dps: 25.0, capex: 7710, operatingCashFlow: 32700, freeCashFlow: 24990, netDebt: 75389,  totalAssets: 247616, investedCapital: 170500 },
    { fy: 'FY22', revenue: 243959, ebitda: 63830, ebit: 52100,  pat: 41749, eps: 34.2,  dps: 51.0, capex: 11580,operatingCashFlow: 49720, freeCashFlow: 38140, netDebt: 54989,  totalAssets: 278180, investedCapital: 178500 },
    { fy: 'FY23', revenue: 243353, ebitda: 33110, ebit: 22180,  pat: 8075,  eps: 6.6,   dps: 36.0, capex: 14850,operatingCashFlow: 35400, freeCashFlow: 20550, netDebt: 67810,  totalAssets: 285210, investedCapital: 191200 },
    { fy: 'FY24', revenue: 229171, ebitda: 23460, ebit: 11900,  pat: -4910, eps: -3.9,  dps: 3.6,  capex: 18050,operatingCashFlow: 26740, freeCashFlow: 8690,  netDebt: 77580,  totalAssets: 298440, investedCapital: 205700 },
    { fy: 'FY25', revenue: 218543, ebitda: 25200, ebit: 14850,  pat: 3174,  eps: 2.5,   dps: 3.6,  capex: 15000,operatingCashFlow: 30150, freeCashFlow: 15150, netDebt: 80000,  totalAssets: 310000, investedCapital: 218000 },
  ],
  segments: [
    { name: 'India Steel (TSLP + TSBSL + KPO)', fy25Revenue: 130120, fy25Ebit: 19500, fy25Margin: 15.0, targetMultiple: 8, multipleLow: 6, multipleHigh: 10, growthOutlook: 'KPO Phase-2 (5->8 MTPA) ramp; captive iron-ore advantage', share: 59.5 },
    { name: 'Europe - Netherlands',              fy25Revenue: 43710,  fy25Ebit: -1750, fy25Margin: -4.0, targetMultiple: 5, multipleLow: 3, multipleHigh: 7,  growthOutlook: 'Green steel DRI transition; CBAM protection',             share: 20.0 },
    { name: 'Europe - UK',                       fy25Revenue: 21850,  fy25Ebit: -2200, fy25Margin: -10.1,targetMultiple: 3, multipleLow: 2, multipleHigh: 5,  growthOutlook: 'Port Talbot EAF transition; blast furnaces shut Sep-24',   share: 10.0 },
    { name: 'South-East Asia (Thailand)',        fy25Revenue: 11000,  fy25Ebit: 380,   fy25Margin: 3.5,  targetMultiple: 5, multipleLow: 4, multipleHigh: 7,  growthOutlook: 'Mature; rebar + wire rod',                                share: 5.0 },
    { name: 'Mining & Others',                   fy25Revenue: 11860,  fy25Ebit: 1130,  fy25Margin: 9.5,  targetMultiple: 7, multipleLow: 5, multipleHigh: 9,  growthOutlook: 'Captive iron-ore + coal + ferro alloys',                 share: 5.4 },
  ],
  assumptions: {
    revenueGrowthCAGR: 6,
    revenueGrowthY1: 4,
    terminalGrowth: 4.5,
    targetEbitdaMargin: 15,
    taxRate: 25,
    wacc: 12.0,
    costOfEquity: 13.5,
    daPercentRevenue: 5.5,
    capexPercentRevenue: 7,
    workingCapitalIntensity: 18,
    projectionYears: 8, // longer for cyclical + capex build
    payoutRatio: 30,
    dividendGrowthNearTerm: 10,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 15,
  },
  peers: [
    { name: 'JSW Steel',          ticker: 'JSWSTEEL',  category: 'IndianMetals', marketCapCr: 230000, evEbitda: 12, pe: 30, dividendYield: 0.9, roic: 10, note: 'Domestic #2; growth-focused' },
    { name: 'SAIL',               ticker: 'SAIL',      category: 'IndianMetals', marketCapCr: 52000,  evEbitda: 9,  pe: 18, dividendYield: 1.6, roic: 6,  note: 'PSU steel; flat + long' },
    { name: 'Jindal Steel & Power',ticker: 'JINDALSTEL',category: 'IndianMetals', marketCapCr: 95000,  evEbitda: 9,  pe: 18, dividendYield: 0.2, roic: 11, note: 'Long products + Angul expansion' },
    { name: 'Hindalco',           ticker: 'HINDALCO',  category: 'IndianMetals', marketCapCr: 145000, evEbitda: 6,  pe: 12, dividendYield: 0.5, roic: 11, note: 'Aluminium + Novelis' },
    { name: 'Vedanta',            ticker: 'VEDL',      category: 'IndianMetals', marketCapCr: 165000, evEbitda: 5,  pe: 12, dividendYield: 9.0, roic: 15, note: 'Diversified metals + oil' },
    { name: 'ArcelorMittal',      ticker: 'MT',        category: 'GlobalMetals', marketCapCr: 230000, evEbitda: 5,  pe: 12, dividendYield: 2.3, roic: 8,  note: 'Global steel major' },
    { name: 'Nippon Steel',       ticker: '5401.T',    category: 'GlobalMetals', marketCapCr: 250000, evEbitda: 4,  pe: 7,  dividendYield: 5.0, roic: 7,  note: 'Japan steel' },
    { name: 'POSCO Holdings',     ticker: 'PKX',       category: 'GlobalMetals', marketCapCr: 210000, evEbitda: 6,  pe: 13, dividendYield: 3.5, roic: 5,  note: 'Korea; EV battery materials' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (China Dumping)',     probability: 0.25, description: 'China exports flood market, HRC ₹48K, EU losses deepen, net debt swells', color: '#DC2626', overrides: { revenueGrowthCAGR: 2,  targetEbitdaMargin: 10, wacc: 13 } },
    { id: 'base',   label: 'Base',                      probability: 0.50, description: 'Safeguard duty in India; KPO ramp; UK EAF commission FY28; EU breakeven',  color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Cycle Recovery)',     probability: 0.20, description: 'China stimulus + infra spend; HRC ₹58K; India margin 18%+; EU EBITDA-positive',color: '#16A34A', overrides: { revenueGrowthCAGR: 10, targetEbitdaMargin: 19, wacc: 11 } },
    { id: 'stress', label: 'Global Recession',          probability: 0.05, description: 'HRC <₹45K, FCF turns negative, debt covenants tested, UK restructuring overruns',color: '#7C2D12', overrides: { revenueGrowthCAGR: -2, targetEbitdaMargin: 7,  wacc: 14 } },
  ],
  keyDrivers: [
    'Kalinganagar Phase-2 commissioning (5->8 MTPA in India)',
    'Port Talbot EAF transition (capex £1.25bn; UK govt £500m grant)',
    'Netherlands DRI + CBAM protection for green steel',
    'India captive iron-ore + coking coal cost advantage',
    'Safeguard duty + anti-dumping supports domestic realisation',
  ],
  keyRisks: [
    'China steel export dumping',
    'UK/Netherlands transition cost overruns',
    'Coking coal volatility + CBAM compliance',
    'Net debt >₹80K Cr; rating agency watch',
    'Cyclical margin swings (FY22 EBITDA ₹64K vs FY24 ₹23K)',
  ],
  recentHighlights: [
    'FY25 revenue ₹2.19L Cr; PAT turns positive (₹3,174 Cr)',
    'India EBITDA/t ~₹12.5K; Europe EBITDA/t ~-$20',
    'Port Talbot blast furnaces closed Sep-2024',
    'KPO expansion to 8 MTPA expected FY26-end',
  ],
  thesisShort: 'India steel cash engine funds Europe green transition; asymmetric pay-off if Port Talbot EAF executes on time and safeguards hold.',
};

// ==========================================================================
// TITAN COMPANY (Consolidated; Jewellery + Watches + Eyewear + Caratlane)
// ==========================================================================
const TITAN: CompanyProfile = {
  id: 'titan',
  ticker: 'TITAN',
  name: 'Titan Company',
  sector: 'Consumer Discretionary - Jewellery & Lifestyle',
  tagline: 'Tanishq-led jewellery compounder + emerging lifestyle portfolio; premium consumer proxy',
  accentColor: '#9F1239',
  currentMarketPrice: 3520,
  targetPriceRange: { low: 3280, base: 3800, high: 4350 },
  sharesOutstandingCr: 88.78,
  netCashCr: -6200,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 21644, ebitda: 2260, ebit: 1720, pat: 974,  eps: 11.0,  dps: 4.0,  capex: 260,  operatingCashFlow: 3480, freeCashFlow: 3220, netDebt: 2680,  totalAssets: 15320, investedCapital: 6200  },
    { fy: 'FY22', revenue: 28799, ebitda: 3620, ebit: 2970, pat: 2174, eps: 24.5,  dps: 7.5,  capex: 380,  operatingCashFlow: 1940, freeCashFlow: 1560, netDebt: 3090,  totalAssets: 17980, investedCapital: 7450  },
    { fy: 'FY23', revenue: 40575, ebitda: 4780, ebit: 3900, pat: 3274, eps: 36.9,  dps: 10.0, capex: 640,  operatingCashFlow: 2540, freeCashFlow: 1900, netDebt: 2410,  totalAssets: 21200, investedCapital: 8920  },
    { fy: 'FY24', revenue: 51617, ebitda: 5630, ebit: 4440, pat: 3496, eps: 39.4,  dps: 11.0, capex: 1180, operatingCashFlow: 2710, freeCashFlow: 1530, netDebt: 5250,  totalAssets: 27000, investedCapital: 11400 },
    { fy: 'FY25', revenue: 58220, ebitda: 6180, ebit: 4780, pat: 3333, eps: 37.5,  dps: 11.0, capex: 1620, operatingCashFlow: 3420, freeCashFlow: 1800, netDebt: 6200,  totalAssets: 32200, investedCapital: 13500 },
  ],
  segments: [
    { name: 'Jewellery (Tanishq + Mia + Zoya)', fy25Revenue: 49490, fy25Ebit: 5440, fy25Margin: 11.0, targetMultiple: 38, multipleLow: 32, multipleHigh: 45, growthOutlook: '20-22% CAGR; formalisation + wedding premium',         share: 85.0 },
    { name: 'Watches & Wearables',              fy25Revenue: 4070,  fy25Ebit: 390,  fy25Margin: 9.6,  targetMultiple: 22, multipleLow: 18, multipleHigh: 28, growthOutlook: 'Premium analog + smart catch-up; Helios flagship',      share: 7.0 },
    { name: 'Eyecare (Titan Eye+)',             fy25Revenue: 1800,  fy25Ebit: 180,  fy25Margin: 10.0, targetMultiple: 20, multipleLow: 16, multipleHigh: 25, growthOutlook: 'Store expansion + online channel',                       share: 3.1 },
    { name: 'CaratLane',                        fy25Revenue: 3620,  fy25Ebit: 180,  fy25Margin: 5.0,  targetMultiple: 30, multipleLow: 24, multipleHigh: 38, growthOutlook: 'Digital-first; 100% stake from Aug-2023',                share: 6.2 },
    { name: 'Emerging (Taneira, IRTH, Skinn)',  fy25Revenue: 1240,  fy25Ebit: -110, fy25Margin: -8.9, targetMultiple: 15, multipleLow: 10, multipleHigh: 22, growthOutlook: 'Indian dress wear + fragrances + handbags incubation',    share: 2.1 },
  ],
  assumptions: {
    revenueGrowthCAGR: 17,
    revenueGrowthY1: 14,
    terminalGrowth: 6.0,
    targetEbitdaMargin: 12.5,
    taxRate: 26,
    wacc: 11.5,
    costOfEquity: 12.5,
    daPercentRevenue: 2.4,
    capexPercentRevenue: 2.8,
    workingCapitalIntensity: 28, // jewellery inventory-heavy
    projectionYears: 7,
    payoutRatio: 30,
    dividendGrowthNearTerm: 10,
    dividendGrowthTerminal: 6,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'Kalyan Jewellers',   ticker: 'KALYANKJIL',category: 'IndianJewellery', marketCapCr: 48000,  evEbitda: 32, pe: 60, dividendYield: 0.3, roic: 17, note: 'Fastest-growing branded jewellery' },
    { name: 'Senco Gold',         ticker: 'SENCO',     category: 'IndianJewellery', marketCapCr: 8500,   evEbitda: 18, pe: 40, dividendYield: 0.3, roic: 15, note: 'East India jeweller' },
    { name: 'Rajesh Exports',     ticker: 'RAJESHEXPO',category: 'IndianJewellery', marketCapCr: 5500,   evEbitda: 4,  pe: 6,  dividendYield: 0.2, roic: 8,  note: 'B2B refiner + retail' },
    { name: 'Thangamayil Jewellery',ticker: 'THANGAMAYL',category: 'IndianJewellery', marketCapCr: 6000, evEbitda: 28, pe: 45, dividendYield: 0.2, roic: 20, note: 'Tamil Nadu regional' },
    { name: 'PC Jeweller',        ticker: 'PCJEWELLER',category: 'IndianJewellery', marketCapCr: 4000,   evEbitda: 12, pe: -1, dividendYield: 0.0, roic: -3, note: 'Restructuring' },
    { name: 'DMart',              ticker: 'DMART',     category: 'IndianRetail',    marketCapCr: 260000, evEbitda: 55, pe: 85, dividendYield: 0.0, roic: 20, note: 'Value retail proxy' },
    { name: 'Trent',              ticker: 'TRENT',     category: 'IndianConsumerDisc', marketCapCr: 260000, evEbitda: 95, pe: 160, dividendYield: 0.1, roic: 18, note: 'Westside + Zudio' },
    { name: 'LVMH',               ticker: 'MC.PA',     category: 'GlobalLuxury',    marketCapCr: 2800000,evEbitda: 13, pe: 22, dividendYield: 2.0, roic: 18, note: 'Global luxury benchmark' },
    { name: 'Tiffany & Co (LVMH)',ticker: 'MC.PA',     category: 'GlobalLuxury',    marketCapCr: 0,      evEbitda: 0,  pe: 0,  dividendYield: 0.0, roic: 0,  note: 'Benchmark brand (priv.)' },
    { name: 'Pandora',            ticker: 'PNDORA.CO', category: 'GlobalLuxury',    marketCapCr: 85000,  evEbitda: 13, pe: 21, dividendYield: 1.7, roic: 30, note: 'Mass-premium jewellery' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Gold Spike + Duty)',  probability: 0.22, description: 'Gold >₹90K/10g discourages buying; duty hike reversed; jewellery grows 10%', color: '#DC2626', overrides: { revenueGrowthCAGR: 11, targetEbitdaMargin: 11, wacc: 12.5 } },
    { id: 'base',   label: 'Base',                       probability: 0.52, description: 'Jewellery 18-20% CAGR; CaratLane ramps; watches premium mix improves',       color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Wedding + Premiumisation)',probability: 0.20, description: 'Studded share +400bps; Zoya luxury scale; international ramp to 3% of rev',color: '#16A34A', overrides: { revenueGrowthCAGR: 21, targetEbitdaMargin: 14, wacc: 10.5 } },
    { id: 'stress', label: 'Demand Freeze + Inventory',  probability: 0.06, description: 'Gold price shock + recession; gold-scheme attrition; inventory days balloon',color: '#7C2D12', overrides: { revenueGrowthCAGR: 5,  targetEbitdaMargin: 9,  wacc: 13 } },
  ],
  keyDrivers: [
    'Organised jewellery formalisation (unorganised ~60% still)',
    'Tanishq store expansion: 527 in FY25, target 800+',
    'Studded mix uplift (higher margin than plain gold)',
    'CaratLane digital-first scale (100% stake Aug-2023)',
    'International rollout (US, Dubai, Singapore, Qatar)',
  ],
  keyRisks: [
    'Gold price volatility + hedging slippage',
    'Import duty policy (July-24 duty cut hit inventory)',
    'Competition: Kalyan, Malabar, Reliance Jewels',
    'Wedding-season concentration',
    'Lab-grown diamonds disrupting studded economics',
  ],
  recentHighlights: [
    'FY25 revenue ₹58,220 Cr (+12.8% YoY); jewellery +13%',
    'Tanishq added 57 stores in FY25; total 527',
    'CaratLane revenue ₹3,620 Cr (+23%); path to 8% margin',
    'Final + interim dividend ₹11/sh; ROCE 25%+',
  ],
  thesisShort: 'Premium consumer franchise riding formalisation + wedding + premiumisation; multi-year compounding with CaratLane + international as free options.',
};

// ==========================================================================
// ULTRATECH CEMENT (Consolidated; India #1 cement; +India Cements + Kesoram)
// ==========================================================================
const ULTRATECH: CompanyProfile = {
  id: 'ultratech',
  ticker: 'ULTRACEMCO',
  name: 'UltraTech Cement',
  sector: 'Cement & Building Materials',
  tagline: 'India #1 cement leader; organic + inorganic play on capex super-cycle',
  accentColor: '#334155',
  currentMarketPrice: 11400,
  targetPriceRange: { low: 10600, base: 12400, high: 14200 },
  sharesOutstandingCr: 28.87,
  netCashCr: -12000,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 44726, ebitda: 11680, ebit: 8530,  pat: 5382,  eps: 186.4, dps: 37.0, capex: 2670, operatingCashFlow: 11450, freeCashFlow: 8780,  netDebt: 6717,  totalAssets: 76800, investedCapital: 53400 },
    { fy: 'FY22', revenue: 52599, ebitda: 12300, ebit: 9310,  pat: 7344,  eps: 254.4, dps: 38.0, capex: 3540, operatingCashFlow: 9640,  freeCashFlow: 6100,  netDebt: 3100,  totalAssets: 80500, investedCapital: 55200 },
    { fy: 'FY23', revenue: 63240, ebitda: 11190, ebit: 7960,  pat: 5064,  eps: 175.4, dps: 38.0, capex: 4860, operatingCashFlow: 10480, freeCashFlow: 5620,  netDebt: 2890,  totalAssets: 88200, investedCapital: 58900 },
    { fy: 'FY24', revenue: 70908, ebitda: 13260, ebit: 9370,  pat: 7005,  eps: 242.6, dps: 70.0, capex: 7120, operatingCashFlow: 13160, freeCashFlow: 6040,  netDebt: 4760,  totalAssets: 99100, investedCapital: 66200 },
    { fy: 'FY25', revenue: 75940, ebitda: 13840, ebit: 9580,  pat: 6042,  eps: 209.3, dps: 77.5, capex: 9200, operatingCashFlow: 14500, freeCashFlow: 5300,  netDebt: 12000, totalAssets: 115000, investedCapital: 78400 },
  ],
  segments: [
    { name: 'Grey Cement - India',        fy25Revenue: 66830, fy25Ebit: 8780, fy25Margin: 13.1, targetMultiple: 15, multipleLow: 12, multipleHigh: 18, growthOutlook: 'Capacity 157 MTPA->183 MTPA by FY27; regional pricing key', share: 88.0 },
    { name: 'White Cement + Putty (Birla White)', fy25Revenue: 3800, fy25Ebit: 760, fy25Margin: 20.0, targetMultiple: 22, multipleLow: 18, multipleHigh: 28, growthOutlook: 'High-margin; tile-adhesive + wall-putty ramp',          share: 5.0 },
    { name: 'RMC (Ready-mix Concrete)',   fy25Revenue: 3800,  fy25Ebit: 230,  fy25Margin: 6.1,  targetMultiple: 12, multipleLow: 10, multipleHigh: 15, growthOutlook: 'Urban infra + housing projects',                         share: 5.0 },
    { name: 'Overseas (UAE, Bahrain)',    fy25Revenue: 1510,  fy25Ebit: 120,  fy25Margin: 7.9,  targetMultiple: 9,  multipleLow: 7,  multipleHigh: 11, growthOutlook: 'Mature GCC markets; steady',                                share: 2.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 11,
    revenueGrowthY1: 9,
    terminalGrowth: 5.5,
    targetEbitdaMargin: 20,
    taxRate: 25,
    wacc: 11.0,
    costOfEquity: 12.0,
    daPercentRevenue: 5.5,
    capexPercentRevenue: 7,
    workingCapitalIntensity: 6,
    projectionYears: 8, // cement capacity build has long lead time
    payoutRatio: 30,
    dividendGrowthNearTerm: 12,
    dividendGrowthTerminal: 5.5,
    conglomerateDiscount: 5,
  },
  peers: [
    { name: 'Ambuja Cements',    ticker: 'AMBUJACEM',  category: 'IndianCement', marketCapCr: 140000, evEbitda: 18, pe: 30, dividendYield: 0.5, roic: 10, note: 'Adani-owned; #2 capacity' },
    { name: 'ACC',               ticker: 'ACC',        category: 'IndianCement', marketCapCr: 40000,  evEbitda: 10, pe: 16, dividendYield: 3.5, roic: 11, note: 'Adani subsidiary' },
    { name: 'Shree Cement',      ticker: 'SHREECEM',   category: 'IndianCement', marketCapCr: 100000, evEbitda: 18, pe: 50, dividendYield: 0.3, roic: 10, note: 'North-focused; low cost' },
    { name: 'Dalmia Bharat',     ticker: 'DALBHARAT',  category: 'IndianCement', marketCapCr: 36000,  evEbitda: 12, pe: 35, dividendYield: 0.4, roic: 8,  note: 'East + South' },
    { name: 'JK Cement',         ticker: 'JKCEMENT',   category: 'IndianCement', marketCapCr: 32000,  evEbitda: 16, pe: 40, dividendYield: 0.3, roic: 14, note: 'White cement + grey' },
    { name: 'Birla Corp',        ticker: 'BIRLACORPN', category: 'IndianCement', marketCapCr: 9500,   evEbitda: 10, pe: 25, dividendYield: 0.8, roic: 7,  note: 'Central India' },
    { name: 'Ramco Cements',     ticker: 'RAMCOCEM',   category: 'IndianCement', marketCapCr: 23000,  evEbitda: 13, pe: 40, dividendYield: 0.3, roic: 8,  note: 'South India leader' },
    { name: 'Heidelberg Materials',ticker: 'HEI.DE',   category: 'GlobalCement', marketCapCr: 200000, evEbitda: 6,  pe: 10, dividendYield: 2.5, roic: 11, note: 'Global major' },
    { name: 'Holcim',            ticker: 'HOLN.SW',    category: 'GlobalCement', marketCapCr: 540000, evEbitda: 9,  pe: 16, dividendYield: 3.5, roic: 10, note: 'Global #1' },
    { name: 'CEMEX',             ticker: 'CX',         category: 'GlobalCement', marketCapCr: 90000,  evEbitda: 6,  pe: 13, dividendYield: 1.5, roic: 8,  note: 'Americas major' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Price War)',         probability: 0.25, description: 'Adani aggressive pricing; realisations -5%; margin compression to ~16%',     color: '#DC2626', overrides: { revenueGrowthCAGR: 7,  targetEbitdaMargin: 16, wacc: 12 } },
    { id: 'base',   label: 'Base',                      probability: 0.52, description: 'Capacity ramp to 183 MTPA; pricing discipline; margin recovers to 20%',     color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Capex Super-cycle)',  probability: 0.18, description: 'Pan-India realisation +8%; India Cements integration synergies; margin 23%+',color: '#16A34A', overrides: { revenueGrowthCAGR: 14, targetEbitdaMargin: 24, wacc: 10 } },
    { id: 'stress', label: 'Fuel + Demand Shock',       probability: 0.05, description: 'Pet-coke spike + housing slowdown; EBITDA/t falls below ₹700',              color: '#7C2D12', overrides: { revenueGrowthCAGR: 4,  targetEbitdaMargin: 14, wacc: 12.5 } },
  ],
  keyDrivers: [
    'Capacity build: 157 MTPA (FY25) -> 183 MTPA by FY27',
    'India Cements (Jul-24) + Kesoram Cement (Dec-24) acquisitions',
    'Premium product mix (Birla Super, Super-Strong) uplift',
    'Cost-out: WHRS + solar captive to 85% green power by FY28',
    'Infra + affordable housing + urban real estate pipeline',
  ],
  keyRisks: [
    'Adani Group aggressive capacity + pricing',
    'Pet-coke + diesel cost volatility',
    'Over-capacity risk if demand decelerates',
    'Integration execution on India Cements',
    'Regulatory: royalty, MGCM, cement classification',
  ],
  recentHighlights: [
    'FY25 revenue ₹75,940 Cr (+7% YoY); volume +7.7%',
    'India Cements acquisition (Jul-2024) for ₹7,100 Cr controlling stake',
    'Kesoram Cement merger completed (Dec-2024)',
    'Capacity 157 MTPA (FY25); announced 30+ MTPA brownfield',
  ],
  thesisShort: 'Dominant cement leader scaling inorganically to stay ahead of Adani; operating leverage + cost-out + premium mix combine into multi-year compounding.',
};

// ==========================================================================
// MAHINDRA & MAHINDRA (Consolidated; Auto + Farm + Services + TechM)
// ==========================================================================
const MM: CompanyProfile = {
  id: 'mm',
  ticker: 'M&M',
  name: 'Mahindra & Mahindra',
  sector: 'Automobile - SUV + Tractors + Conglomerate',
  tagline: 'SUV share leader + tractor #1; EV born-electric platform as structural option',
  accentColor: '#B91C1C',
  currentMarketPrice: 3080,
  targetPriceRange: { low: 2820, base: 3350, high: 3800 },
  sharesOutstandingCr: 124.4,
  netCashCr: -75000, // consolidated includes Mahindra Finance borrowings
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 74878,  ebitda: 11230, ebit: 6290,  pat: -554, eps: -4.5,  dps: 8.75, capex: 2430, operatingCashFlow: 7120,  freeCashFlow: 4690,  netDebt: 59500, totalAssets: 173500, investedCapital: 98500  },
    { fy: 'FY22', revenue: 90135,  ebitda: 13420, ebit: 8180,  pat: 4935, eps: 39.6,  dps: 11.55,capex: 3580, operatingCashFlow: 8950,  freeCashFlow: 5370,  netDebt: 55200, totalAssets: 179800, investedCapital: 103200 },
    { fy: 'FY23', revenue: 121269, ebitda: 17290, ebit: 11420, pat: 10282,eps: 82.6,  dps: 16.25,capex: 4920, operatingCashFlow: 13400, freeCashFlow: 8480,  netDebt: 62100, totalAssets: 202100, investedCapital: 115400 },
    { fy: 'FY24', revenue: 141820, ebitda: 20460, ebit: 14280, pat: 12110,eps: 97.4,  dps: 21.10,capex: 6340, operatingCashFlow: 14820, freeCashFlow: 8480,  netDebt: 69800, totalAssets: 221400, investedCapital: 126100 },
    { fy: 'FY25', revenue: 159213, ebitda: 23580, ebit: 16680, pat: 13191,eps: 106.0, dps: 25.30,capex: 8150, operatingCashFlow: 16700, freeCashFlow: 8550,  netDebt: 75000, totalAssets: 244800, investedCapital: 140300 },
  ],
  segments: [
    { name: 'Automotive (SUVs + LCVs + 3W)', fy25Revenue: 83420, fy25Ebit: 7510, fy25Margin: 9.0,  targetMultiple: 20, multipleLow: 17, multipleHigh: 24, growthOutlook: 'SUV share #1 at 22%; XUV700 + Thar Roxx + Scorpio-N',     share: 52.4 },
    { name: 'Farm Equipment (Tractors)',     fy25Revenue: 29630, fy25Ebit: 4890, fy25Margin: 16.5, targetMultiple: 22, multipleLow: 18, multipleHigh: 26, growthOutlook: 'Tractor #1 at 41% share; rural recovery lever',          share: 18.6 },
    { name: 'Financial Services (M&M Fin)',  fy25Revenue: 15950, fy25Ebit: 3030, fy25Margin: 19.0, targetMultiple: 14, multipleLow: 11, multipleHigh: 17, growthOutlook: 'Diversifying beyond vehicle finance',                      share: 10.0 },
    { name: 'Tech Mahindra (stake ~26%)',    fy25Revenue: 22120, fy25Ebit: 2430, fy25Margin: 11.0, targetMultiple: 18, multipleLow: 14, multipleHigh: 22, growthOutlook: 'Services margin recovery; TCV momentum',                 share: 13.9 },
    { name: 'Auto-Electric (BEVs + LMM)',    fy25Revenue: 3980,  fy25Ebit: -400, fy25Margin: -10.1,targetMultiple: 10, multipleLow: 6,  multipleHigh: 15, growthOutlook: 'BE 6 + XEV 9e ramp; born-electric platform',              share: 2.5 },
    { name: 'Others (Holidays, Agri, etc.)', fy25Revenue: 4110,  fy25Ebit: 820,  fy25Margin: 20.0, targetMultiple: 12, multipleLow: 10, multipleHigh: 16, growthOutlook: 'Club Mahindra + agri solutions',                          share: 2.6 },
  ],
  assumptions: {
    revenueGrowthCAGR: 12,
    revenueGrowthY1: 11,
    terminalGrowth: 5.5,
    targetEbitdaMargin: 16,
    taxRate: 25,
    wacc: 12.0,
    costOfEquity: 13.0,
    daPercentRevenue: 4.5,
    capexPercentRevenue: 5.5,
    workingCapitalIntensity: 6,
    projectionYears: 7,
    payoutRatio: 22,
    dividendGrowthNearTerm: 15,
    dividendGrowthTerminal: 6,
    conglomerateDiscount: 18, // holding-co + listed subs discount
  },
  peers: [
    { name: 'Maruti Suzuki',  ticker: 'MARUTI',    category: 'IndianAuto', marketCapCr: 385000, evEbitda: 22, pe: 26, dividendYield: 1.1, roic: 25, note: 'PV leader' },
    { name: 'Tata Motors',    ticker: 'TATAMOTORS',category: 'IndianAuto', marketCapCr: 270000, evEbitda: 6,  pe: 11, dividendYield: 1.0, roic: 14, note: 'JLR + EV' },
    { name: 'Hyundai Motor India',ticker: 'HYUNDAI',category: 'IndianAuto', marketCapCr: 160000, evEbitda: 20, pe: 25, dividendYield: 2.0, roic: 30, note: 'PV #2; IPO Oct-24' },
    { name: 'Eicher Motors',  ticker: 'EICHERMOT', category: 'IndianAuto', marketCapCr: 140000, evEbitda: 22, pe: 30, dividendYield: 1.0, roic: 35, note: 'RE + VECV' },
    { name: 'Ashok Leyland',  ticker: 'ASHOKLEY',  category: 'IndianAuto', marketCapCr: 65000,  evEbitda: 12, pe: 22, dividendYield: 2.2, roic: 15, note: 'CV #2' },
    { name: 'Escorts Kubota', ticker: 'ESCORTS',   category: 'IndianAuto', marketCapCr: 34000,  evEbitda: 20, pe: 28, dividendYield: 0.3, roic: 15, note: 'Tractors + construction eq' },
    { name: 'Toyota Motor',   ticker: 'TM',        category: 'GlobalAuto', marketCapCr: 2300000,evEbitda: 9,  pe: 11, dividendYield: 2.7, roic: 11, note: 'Global leader' },
    { name: 'Deere & Co',     ticker: 'DE',        category: 'GlobalAuto', marketCapCr: 1000000,evEbitda: 12, pe: 15, dividendYield: 1.5, roic: 20, note: 'Tractor benchmark' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Rural + EV Capex)',   probability: 0.25, description: 'Tractor recovery stalls; EV ramp capex burns; SUV share loss begins',      color: '#DC2626', overrides: { revenueGrowthCAGR: 6,  targetEbitdaMargin: 13, wacc: 13 } },
    { id: 'base',   label: 'Base',                       probability: 0.50, description: 'SUV #1 maintained; tractor cycle recovers; BE 6/XEV 9e ramp as planned', color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (EV + SUV Double)',     probability: 0.20, description: 'Born-electric platform scales; SUV share 25%; TechM turnaround complete', color: '#16A34A', overrides: { revenueGrowthCAGR: 16, targetEbitdaMargin: 18, wacc: 11 } },
    { id: 'stress', label: 'Monsoon Fail + EV Shock',    probability: 0.05, description: 'Tractor demand halves; BYD + Chinese EVs disrupt 20-30L segment',        color: '#7C2D12', overrides: { revenueGrowthCAGR: 2,  targetEbitdaMargin: 11, wacc: 13.5 } },
  ],
  keyDrivers: [
    'SUV #1 status (22% share); XUV700, Thar, Scorpio, BE 6',
    'Tractor leader (41% share); rural + mechanisation cycle',
    'Born-electric INGLO platform (BE 6 + XEV 9e) launched Nov-24',
    'Mahindra Finance turnaround + balance sheet quality',
    'Tech Mahindra services margin inflection',
  ],
  keyRisks: [
    'SUV market competition (Tata + Hyundai + Toyota)',
    'Rural demand and tractor cyclicality',
    'EV execution + margin dilution from BEV mix',
    'TechM BFSI + telecom vertical exposure',
    'Holding-co / promoter-less conglomerate discount',
  ],
  recentHighlights: [
    'FY25 revenue ₹1.59L Cr (+12% YoY); PAT ₹13,191 Cr (+9%)',
    'SUV #1 with 22% PV market share',
    'Tractor market share 41.6% (record)',
    'BE 6 + XEV 9e launched Nov-2024 on INGLO platform',
  ],
  thesisShort: 'SUV + tractor duopoly economics with built-in EV option value; conglomerate discount narrows as subsidiaries compound independently.',
};

// ==========================================================================
// ADANI PORTS & SEZ (APSEZ; India's largest private port operator)
// ==========================================================================
const ADANIPORTS: CompanyProfile = {
  id: 'adaniports',
  ticker: 'ADANIPORTS',
  name: 'Adani Ports & SEZ',
  sector: 'Ports, Logistics & SEZ',
  tagline: 'India\'s largest private port operator; cargo growth + logistics integration play',
  accentColor: '#0E7490',
  currentMarketPrice: 1280,
  targetPriceRange: { low: 1150, base: 1440, high: 1650 },
  sharesOutstandingCr: 216.0,
  netCashCr: -48500,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 12550, ebitda: 7840,  ebit: 5260,  pat: 5050,  eps: 24.9, dps: 5.0, capex: 3860, operatingCashFlow: 7440, freeCashFlow: 3580, netDebt: 23720, totalAssets: 60250,  investedCapital: 52300 },
    { fy: 'FY22', revenue: 17130, ebitda: 10340, ebit: 7240,  pat: 4790,  eps: 22.7, dps: 5.0, capex: 4650, operatingCashFlow: 9160, freeCashFlow: 4510, netDebt: 31270, totalAssets: 78100,  investedCapital: 65400 },
    { fy: 'FY23', revenue: 20852, ebitda: 12438, ebit: 8820,  pat: 5310,  eps: 25.2, dps: 5.0, capex: 5570, operatingCashFlow: 11490,freeCashFlow: 5920, netDebt: 39590, totalAssets: 89200,  investedCapital: 72400 },
    { fy: 'FY24', revenue: 26711, ebitda: 16719, ebit: 12570, pat: 8110,  eps: 37.5, dps: 6.0, capex: 6720, operatingCashFlow: 14820,freeCashFlow: 8100, netDebt: 43820, totalAssets: 97800,  investedCapital: 80100 },
    { fy: 'FY25', revenue: 30850, ebitda: 19120, ebit: 14680, pat: 10500, eps: 48.6, dps: 7.0, capex: 8450, operatingCashFlow: 17950,freeCashFlow: 9500, netDebt: 48500, totalAssets: 108500, investedCapital: 88200 },
  ],
  segments: [
    { name: 'Ports (Mundra + 13 others)',  fy25Revenue: 22820, fy25Ebit: 12550, fy25Margin: 55.0, targetMultiple: 18, multipleLow: 15, multipleHigh: 22, growthOutlook: '450 MMT FY25 cargo; target 1 BMT by 2030', share: 74.0 },
    { name: 'Logistics (Rail + Warehousing)',fy25Revenue: 3700, fy25Ebit: 740,  fy25Margin: 20.0, targetMultiple: 14, multipleLow: 11, multipleHigh: 17, growthOutlook: 'Multi-modal + DFC + ICD ramp',          share: 12.0 },
    { name: 'SEZ + Port Development',        fy25Revenue: 2470, fy25Ebit: 1240, fy25Margin: 50.2, targetMultiple: 12, multipleLow: 10, multipleHigh: 15, growthOutlook: 'Land monetisation; long-term',        share: 8.0 },
    { name: 'Marine Services + Others',      fy25Revenue: 1860, fy25Ebit: 150,  fy25Margin: 8.1,  targetMultiple: 9,  multipleLow: 7,  multipleHigh: 12, growthOutlook: 'Tug services, harbour craft',         share: 6.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 15,
    revenueGrowthY1: 14,
    terminalGrowth: 6.0,
    targetEbitdaMargin: 62,
    taxRate: 22,
    wacc: 11.5,
    costOfEquity: 12.5,
    daPercentRevenue: 14,
    capexPercentRevenue: 22,
    workingCapitalIntensity: 5,
    projectionYears: 10,
    payoutRatio: 15,
    dividendGrowthNearTerm: 15,
    dividendGrowthTerminal: 6,
    conglomerateDiscount: 10,
  },
  peers: [
    { name: 'JSW Infrastructure',   ticker: 'JSWINFRA',   category: 'IndianPorts',  marketCapCr: 68000,  evEbitda: 22, pe: 38, dividendYield: 0.0, roic: 14, note: 'Second-largest private port' },
    { name: 'Container Corp',       ticker: 'CONCOR',     category: 'IndianPorts',  marketCapCr: 45000,  evEbitda: 13, pe: 28, dividendYield: 2.5, roic: 15, note: 'Rail logistics PSU' },
    { name: 'Gujarat Pipavav Port', ticker: 'GPPL',       category: 'IndianPorts',  marketCapCr: 8500,   evEbitda: 11, pe: 19, dividendYield: 3.5, roic: 15, note: 'APM Terminals (Maersk) controlled' },
    { name: 'Shipping Corp of India',ticker: 'SCI',       category: 'IndianPorts',  marketCapCr: 10500,  evEbitda: 6,  pe: 14, dividendYield: 1.5, roic: 9,  note: 'Shipping PSU; divestment pending' },
    { name: 'DP World (priv.)',     ticker: 'DPW.DU',     category: 'GlobalPorts',  marketCapCr: 100000, evEbitda: 8,  pe: 14, dividendYield: 3.0, roic: 10, note: 'Dubai-based global operator' },
    { name: 'Hutchison Port Holdings',ticker: 'HPHT.SI',  category: 'GlobalPorts',  marketCapCr: 20000,  evEbitda: 7,  pe: 13, dividendYield: 9.0, roic: 6,  note: 'HK + China ports trust' },
    { name: 'China Merchants Port', ticker: '0144.HK',    category: 'GlobalPorts',  marketCapCr: 40000,  evEbitda: 9,  pe: 10, dividendYield: 5.5, roic: 7,  note: 'Chinese ports operator' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Regulatory Overhang)',probability: 0.22, description: 'Hindenburg / SEBI / DoJ concerns re-surface; COP financing dries up; cargo flatlines',color: '#DC2626', overrides: { revenueGrowthCAGR: 8,  targetEbitdaMargin: 56, wacc: 13 } },
    { id: 'base',   label: 'Base',                       probability: 0.50, description: 'Cargo CAGR 12%+; Mundra + Dhamra + Gopalpur scale; logistics profitability rises',   color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Logistics Flywheel)',  probability: 0.22, description: 'Integrated logistics hits inflection; port share + GQIP SEZ scale; margin 66%+',    color: '#16A34A', overrides: { revenueGrowthCAGR: 19, targetEbitdaMargin: 66, wacc: 10.5 } },
    { id: 'stress', label: 'Governance / FX Shock',      probability: 0.06, description: 'Promoter pledge unwind + global cargo recession; debt covenants tested',           color: '#7C2D12', overrides: { revenueGrowthCAGR: 3,  targetEbitdaMargin: 50, wacc: 14 } },
  ],
  keyDrivers: [
    'Cargo volume 450 MMT FY25 (+22% YoY); target 1 BMT by 2030',
    'Mundra #1 container port in India; Dhamra + Gopalpur ramp',
    'Haifa (Israel) + Colombo + Dar-es-Salaam international expansion',
    'Integrated logistics: rail + warehousing + ICDs + trucking',
    'Harbour Infrastructure Act 2025 + Vadhvan greenfield opportunity',
  ],
  keyRisks: [
    'Adani Group governance + short-seller overhang (Hindenburg, OCCRP, SEC)',
    'Promoter debt / share pledge levels',
    'Concession-renewal terms (Mundra, Mormugao)',
    'Global cargo cyclicality + shipping-line alliance reshuffles',
    'Competition from JSW Infra, Hindustan Ports, Deendayal (private)',
  ],
  recentHighlights: [
    'FY25 cargo 450 MMT (+22% YoY); revenue ₹30,850 Cr (+15%)',
    'PAT ₹10,500 Cr (+29% YoY); EBITDA margin 62%',
    'Gopalpur acquisition (May-2024); Vizhinjam commissioning',
    'Target ROCE 18%+ by FY28 per 10-year vision',
  ],
  thesisShort: 'Listed proxy to India\'s cargo + logistics super-cycle with margin expansion and international diversification; governance overhang is the persistent discount.',
};

// ==========================================================================
// AXIS BANK (Consolidated; third-largest private bank post-Citi retail buy)
// ==========================================================================
const AXIS: CompanyProfile = {
  id: 'axis',
  ticker: 'AXISBANK',
  name: 'Axis Bank',
  sector: 'Private Banking / BFSI',
  tagline: 'Mid-size private bank gaining scale; Citi retail integration + cost-income lever',
  accentColor: '#9D174D',
  currentMarketPrice: 1160,
  targetPriceRange: { low: 1080, base: 1280, high: 1460 },
  sharesOutstandingCr: 309.4,
  netCashCr: 0,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 38089, ebitda: 25000, ebit: 10380, pat: 6588,  eps: 21.5, dps: 0.0, capex: 1230, operatingCashFlow: 18640, freeCashFlow: 17410, netDebt: 0, totalAssets: 996118,  investedCapital: 114000 },
    { fy: 'FY22', revenue: 47205, ebitda: 27350, ebit: 18950, pat: 13025, eps: 42.4, dps: 1.0, capex: 1360, operatingCashFlow: 22830, freeCashFlow: 21470, netDebt: 0, totalAssets: 1175176, investedCapital: 133500 },
    { fy: 'FY23', revenue: 55710, ebitda: 32074, ebit: 14580, pat: 9580,  eps: 30.9, dps: 1.0, capex: 1760, operatingCashFlow: 25170, freeCashFlow: 23410, netDebt: 0, totalAssets: 1317326, investedCapital: 158400 },
    { fy: 'FY24', revenue: 77420, ebitda: 38930, ebit: 33950, pat: 24861, eps: 80.3, dps: 1.0, capex: 2150, operatingCashFlow: 33920, freeCashFlow: 31770, netDebt: 0, totalAssets: 1518239, investedCapital: 180700 },
    { fy: 'FY25', revenue: 87448, ebitda: 43844, ebit: 37760, pat: 26373, eps: 85.2, dps: 1.0, capex: 2420, operatingCashFlow: 37890, freeCashFlow: 35470, netDebt: 0, totalAssets: 1656990, investedCapital: 202400 },
  ],
  segments: [
    { name: 'Retail Banking',     fy25Revenue: 47270, fy25Ebit: 19280, fy25Margin: 40.8, targetMultiple: 17, multipleLow: 14, multipleHigh: 21, growthOutlook: 'Citi retail integration + unsecured moderation', share: 54.1 },
    { name: 'Corporate Banking',  fy25Revenue: 19230, fy25Ebit: 9850,  fy25Margin: 51.2, targetMultiple: 12, multipleLow: 10, multipleHigh: 15, growthOutlook: 'Capex cycle + trade finance',                    share: 22.0 },
    { name: 'Treasury',           fy25Revenue: 14810, fy25Ebit: 6430,  fy25Margin: 43.4, targetMultiple: 9,  multipleLow: 7,  multipleHigh: 11, growthOutlook: 'Rate cycle normalisation',                       share: 16.9 },
    { name: 'Others (Cards, IB, AMC)',fy25Revenue: 6140, fy25Ebit: 2200,fy25Margin: 35.8, targetMultiple: 18, multipleLow: 15, multipleHigh: 22, growthOutlook: 'Cards + wealth + Axis AMC + Axis Securities',  share: 7.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 13,
    revenueGrowthY1: 10,
    terminalGrowth: 5.5,
    targetEbitdaMargin: 50,
    taxRate: 25,
    wacc: 12.5,
    costOfEquity: 13.5,
    daPercentRevenue: 1.0,
    capexPercentRevenue: 1.5,
    workingCapitalIntensity: 0,
    projectionYears: 7,
    payoutRatio: 3,
    dividendGrowthNearTerm: 10,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'HDFC Bank',        ticker: 'HDFCBANK',   category: 'IndianBank', marketCapCr: 1370000,evEbitda: 11, pe: 20, dividendYield: 1.2, roic: 14, note: 'Largest private; merger digestion' },
    { name: 'ICICI Bank',       ticker: 'ICICIBANK',  category: 'IndianBank', marketCapCr: 880000, evEbitda: 10, pe: 18, dividendYield: 0.9, roic: 18, note: 'Best ROA peer' },
    { name: 'Kotak Mahindra',   ticker: 'KOTAKBANK',  category: 'IndianBank', marketCapCr: 380000, evEbitda: 11, pe: 19, dividendYield: 0.1, roic: 16, note: 'Premium franchise' },
    { name: 'State Bank of India',ticker: 'SBIN',     category: 'IndianBank', marketCapCr: 710000, evEbitda: 6,  pe: 10, dividendYield: 1.8, roic: 13, note: 'PSU leader' },
    { name: 'IndusInd Bank',    ticker: 'INDUSINDBK', category: 'IndianBank', marketCapCr: 68000,  evEbitda: 6,  pe: 8,  dividendYield: 1.2, roic: 10, note: 'Mid-size under stress' },
    { name: 'Yes Bank',         ticker: 'YESBANK',    category: 'IndianBank', marketCapCr: 62000,  evEbitda: 7,  pe: 35, dividendYield: 0.0, roic: 6,  note: 'Turnaround; SMBC stake' },
    { name: 'IDFC First Bank',  ticker: 'IDFCFIRSTB', category: 'IndianBank', marketCapCr: 48000,  evEbitda: 8,  pe: 20, dividendYield: 0.0, roic: 9,  note: 'Retail-focused mid-cap' },
    { name: 'JPMorgan Chase',   ticker: 'JPM',        category: 'GlobalBank', marketCapCr: 5400000,evEbitda: 9,  pe: 13, dividendYield: 2.3, roic: 15, note: 'US mega-bank' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Unsecured Stress)',probability: 0.25, description: 'Credit cost normalises to 110bps; personal loan + card slippages spike; ROA sub-1.5%', color: '#DC2626', overrides: { revenueGrowthCAGR: 8,  targetEbitdaMargin: 44, wacc: 13.5 } },
    { id: 'base',   label: 'Base',                    probability: 0.50, description: 'Citi integration done; deposit franchise improves; ROA 1.8%+, ROE 17%',              color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (CASA Revival)',     probability: 0.20, description: 'CASA >45%; cost-income sub-45%; specialist coverage drives fee income',              color: '#16A34A', overrides: { revenueGrowthCAGR: 16, targetEbitdaMargin: 55, wacc: 11.5 } },
    { id: 'stress', label: 'Cycle Shock',             probability: 0.05, description: 'Corporate + MFI slippage; GNPA >3%; RoE falls below 12%',                            color: '#7C2D12', overrides: { revenueGrowthCAGR: 6,  targetEbitdaMargin: 40, wacc: 14 } },
  ],
  keyDrivers: [
    'Citi India retail acquisition (Mar-2023) scaling cards + affluent',
    'Deposit franchise: CASA 42%; cost of deposits trending down',
    'Axis AMC + Axis Securities + Max Life (distribution)',
    'Cost-income ratio improvement runway',
    'Sparsh 2.0 customer experience + digital acquisition',
  ],
  keyRisks: [
    'Unsecured retail credit cost cycle',
    'Corporate chunky slippage re-emergence',
    'NIM compression on rate cuts',
    'Lower payout ratio limits dividend case',
    'Citi integration cost overruns tailwind has faded',
  ],
  recentHighlights: [
    'FY25 PAT ₹26,373 Cr (+6% YoY); ROA 1.7%, ROE 16.9%',
    'Deposits +9.5% YoY; advances +7.3% YoY',
    'Citi cards portfolio fully migrated in FY25',
    'GNPA 1.43%; NNPA 0.33% (stable)',
  ],
  thesisShort: 'Third-largest private bank trading at ~1.9x FY26E BV - valuation gap vs ICICI / HDFC narrows as Citi integration benefits settle in.',
};

// ==========================================================================
// BAJAJ FINSERV (Holding co: BAJFIN (52%) + BAGIC + BALIC + direct business)
// ==========================================================================
const BAJAJFINSV: CompanyProfile = {
  id: 'bajajfinsv',
  ticker: 'BAJAJFINSV',
  name: 'Bajaj Finserv',
  sector: 'Financial Services Holding / Insurance / NBFC',
  tagline: 'Financial-services conglomerate: lending + life + general insurance + asset management',
  accentColor: '#4338CA',
  currentMarketPrice: 1610,
  targetPriceRange: { low: 1500, base: 1780, high: 2040 },
  sharesOutstandingCr: 159.8,
  netCashCr: 0,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 60591,  ebitda: 15600, ebit: 10920, pat: 1344,  eps: 8.4,  dps: 3.0, capex: 580, operatingCashFlow: -42000, freeCashFlow: -42580,netDebt: 110000, totalAssets: 370000,  investedCapital: 330000 },
    { fy: 'FY22', revenue: 68406,  ebitda: 19800, ebit: 14580, pat: 4557,  eps: 28.5, dps: 4.0, capex: 640, operatingCashFlow: -49000, freeCashFlow: -49640,netDebt: 142000, totalAssets: 448000,  investedCapital: 395000 },
    { fy: 'FY23', revenue: 82072,  ebitda: 25600, ebit: 19320, pat: 6417,  eps: 40.2, dps: 4.5, capex: 780, operatingCashFlow: -61000, freeCashFlow: -61780,netDebt: 181000, totalAssets: 540000,  investedCapital: 470000 },
    { fy: 'FY24', revenue: 110382, ebitda: 33200, ebit: 26010, pat: 8148,  eps: 51.0, dps: 0.9, capex: 920, operatingCashFlow: -78000, freeCashFlow: -78920,netDebt: 240000, totalAssets: 695000,  investedCapital: 595000 },
    { fy: 'FY25', revenue: 132330, ebitda: 39800, ebit: 31250, pat: 9648,  eps: 60.4, dps: 1.0, capex: 1080,operatingCashFlow: -90000, freeCashFlow: -91080,netDebt: 305000, totalAssets: 820000,  investedCapital: 680000 },
  ],
  segments: [
    { name: 'Lending (Bajaj Finance 52%)',       fy25Revenue: 69710, fy25Ebit: 18550, fy25Margin: 26.6, targetMultiple: 22, multipleLow: 18, multipleHigh: 26, growthOutlook: 'AUM +30%; retail franchise', share: 52.7 },
    { name: 'General Insurance (BAGIC)',         fy25Revenue: 29150, fy25Ebit: 4380,  fy25Margin: 15.0, targetMultiple: 20, multipleLow: 17, multipleHigh: 24, growthOutlook: 'Motor + health scale',        share: 22.0 },
    { name: 'Life Insurance (BALIC)',            fy25Revenue: 25260, fy25Ebit: 2530,  fy25Margin: 10.0, targetMultiple: 25, multipleLow: 20, multipleHigh: 30, growthOutlook: 'NBP growth leader',           share: 19.1 },
    { name: 'Direct / Markets / AMC / Health',   fy25Revenue: 8210,  fy25Ebit: 1790,  fy25Margin: 21.8, targetMultiple: 18, multipleLow: 14, multipleHigh: 24, growthOutlook: 'Bajaj AMC + health + markets', share: 6.2 },
  ],
  assumptions: {
    revenueGrowthCAGR: 20,
    revenueGrowthY1: 22,
    terminalGrowth: 6.5,
    targetEbitdaMargin: 32,
    taxRate: 25,
    wacc: 12.5,
    costOfEquity: 13.5,
    daPercentRevenue: 6,
    capexPercentRevenue: 1,
    workingCapitalIntensity: 0,
    projectionYears: 8,
    payoutRatio: 8,
    dividendGrowthNearTerm: 12,
    dividendGrowthTerminal: 6,
    conglomerateDiscount: 20,
  },
  peers: [
    { name: 'Bajaj Finance',       ticker: 'BAJFINANCE',category: 'IndianNBFC',     marketCapCr: 435000, evEbitda: 18, pe: 26, dividendYield: 0.6, roic: 22, note: 'Core listed subsidiary' },
    { name: 'HDFC Life',           ticker: 'HDFCLIFE',  category: 'IndianInsurance',marketCapCr: 135000, evEbitda: 40, pe: 75, dividendYield: 0.3, roic: 18, note: 'Largest private life insurer' },
    { name: 'ICICI Pru Life',      ticker: 'ICICIPRULI',category: 'IndianInsurance',marketCapCr: 90000,  evEbitda: 20, pe: 65, dividendYield: 0.7, roic: 11, note: 'Private life #3' },
    { name: 'SBI Life',            ticker: 'SBILIFE',   category: 'IndianInsurance',marketCapCr: 150000, evEbitda: 28, pe: 70, dividendYield: 0.3, roic: 14, note: 'Largest private life by APE' },
    { name: 'ICICI Lombard',       ticker: 'ICICIGI',   category: 'IndianInsurance',marketCapCr: 95000,  evEbitda: 25, pe: 40, dividendYield: 0.6, roic: 18, note: 'Largest private GI' },
    { name: 'Star Health',         ticker: 'STARHEALTH',category: 'IndianInsurance',marketCapCr: 32000,  evEbitda: 14, pe: 40, dividendYield: 0.0, roic: 12, note: 'Standalone health' },
    { name: 'LIC',                 ticker: 'LICI',      category: 'IndianInsurance',marketCapCr: 630000, evEbitda: 9,  pe: 12, dividendYield: 1.0, roic: 15, note: 'Life insurance PSU' },
    { name: 'Prudential plc',      ticker: 'PRU',       category: 'GlobalInsurance',marketCapCr: 225000, evEbitda: 9,  pe: 11, dividendYield: 2.5, roic: 11, note: 'Asia life insurer' },
    { name: 'Allianz SE',          ticker: 'ALV.DE',    category: 'GlobalInsurance',marketCapCr: 1150000,evEbitda: 8,  pe: 11, dividendYield: 5.0, roic: 9,  note: 'Germany-based global' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Subs Under-perform)', probability: 0.22, description: 'BAJFIN credit cost spike + BAGIC CoR >105%; embedded-value growth sub-14%', color: '#DC2626', overrides: { revenueGrowthCAGR: 11, targetEbitdaMargin: 26, wacc: 13.5 } },
    { id: 'base',   label: 'Base',                       probability: 0.52, description: 'All subs compound in line with plan; direct business scales; holdco discount stable', color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Holdco Unlock)',       probability: 0.20, description: 'BAGIC / BALIC listings trigger SOTP re-rating; Bajaj Allianz 100% stake unlocked', color: '#16A34A', overrides: { revenueGrowthCAGR: 24, targetEbitdaMargin: 36, wacc: 11.5 } },
    { id: 'stress', label: 'Regulatory / Cycle Shock',    probability: 0.06, description: 'RBI NBFC tightening + insurance commission cap + persistency declines',           color: '#7C2D12', overrides: { revenueGrowthCAGR: 7,  targetEbitdaMargin: 22, wacc: 14 } },
  ],
  keyDrivers: [
    'Bajaj Finance contribution ~60% of SOTP value',
    'Allianz 26% stake buy-out (Apr-2025) in BAGIC + BALIC → 100% consolidation',
    'BAGIC CoR discipline + motor TP monetisation',
    'BALIC NBP growth leader + VNB margin expansion',
    'Bajaj Finserv Direct + Markets + AMC scaling',
  ],
  keyRisks: [
    'Holdco discount persistence (15-25% historical)',
    'Insurance regulator on commission + surrender-value rules',
    'BAJFIN credit cycle contagion (retail unsecured)',
    'Listing of BAGIC / BALIC can monetise or disappoint',
    'Key-man risk (Sanjiv Bajaj transition plan)',
  ],
  recentHighlights: [
    'FY25 consolidated revenue ₹1.32L Cr (+20% YoY); PAT ₹9,648 Cr (+18%)',
    'Allianz 26% stake buy-out announced Apr-2025',
    'BAGIC GWP +11%; BALIC NBP +18%',
    'Bajaj Finserv Markets + Direct scaling',
  ],
  thesisShort: 'Four-in-one financial-services compounder with BAJFIN as core engine plus Allianz stake-unlock adding SOTP optionality; holdco discount caps the re-rating.',
};

// ==========================================================================
// HCL TECHNOLOGIES (Services + Engineering + Products/Platforms)
// ==========================================================================
const HCLTECH: CompanyProfile = {
  id: 'hcltech',
  ticker: 'HCLTECH',
  name: 'HCL Technologies',
  sector: 'IT Services',
  tagline: 'India IT #3; engineering + infrastructure tilt + products IP monetisation',
  accentColor: '#0369A1',
  currentMarketPrice: 1620,
  targetPriceRange: { low: 1520, base: 1790, high: 2040 },
  sharesOutstandingCr: 271.3,
  netCashCr: 10000,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 75379,  ebitda: 20040, ebit: 14790, pat: 11145, eps: 41.1, dps: 16.0, capex: 1780, operatingCashFlow: 20020, freeCashFlow: 18240, netDebt: -8500,  totalAssets: 77800,  investedCapital: 51200 },
    { fy: 'FY22', revenue: 85651,  ebitda: 22970, ebit: 17380, pat: 13499, eps: 49.8, dps: 48.0, capex: 1930, operatingCashFlow: 18680, freeCashFlow: 16750, netDebt: -6200,  totalAssets: 80100,  investedCapital: 53600 },
    { fy: 'FY23', revenue: 101456, ebitda: 25300, ebit: 19075, pat: 14845, eps: 54.8, dps: 48.0, capex: 2170, operatingCashFlow: 19850, freeCashFlow: 17680, netDebt: -7800,  totalAssets: 84500,  investedCapital: 55400 },
    { fy: 'FY24', revenue: 109913, ebitda: 26820, ebit: 20170, pat: 15710, eps: 57.9, dps: 52.0, capex: 2380, operatingCashFlow: 20780, freeCashFlow: 18400, netDebt: -9200,  totalAssets: 89200,  investedCapital: 57100 },
    { fy: 'FY25', revenue: 117055, ebitda: 29080, ebit: 21840, pat: 17390, eps: 64.1, dps: 60.0, capex: 2460, operatingCashFlow: 22400, freeCashFlow: 19940, netDebt: -10000, totalAssets: 93400,  investedCapital: 58700 },
  ],
  segments: [
    { name: 'IT & Business Services (ITBS)', fy25Revenue: 85350, fy25Ebit: 15610, fy25Margin: 18.3, targetMultiple: 20, multipleLow: 17, multipleHigh: 23, growthOutlook: 'BFS + manufacturing + life sciences; cloud + digital', share: 72.9 },
    { name: 'Engineering & R&D (ERS)',       fy25Revenue: 19630, fy25Ebit: 3580,  fy25Margin: 18.2, targetMultiple: 24, multipleLow: 20, multipleHigh: 28, growthOutlook: 'Leader in ER&D; semi + aerospace + telecom',          share: 16.8 },
    { name: 'Products & Platforms (P&P)',    fy25Revenue: 12070, fy25Ebit: 2650,  fy25Margin: 22.0, targetMultiple: 16, multipleLow: 13, multipleHigh: 19, growthOutlook: 'HCL Software (ex-BigFix, AppScan) lumpy',            share: 10.3 },
  ],
  assumptions: {
    revenueGrowthCAGR: 9,
    revenueGrowthY1: 6,
    terminalGrowth: 5.0,
    targetEbitdaMargin: 25,
    taxRate: 26,
    wacc: 11.5,
    costOfEquity: 12.0,
    daPercentRevenue: 3.3,
    capexPercentRevenue: 2.1,
    workingCapitalIntensity: 16,
    projectionYears: 7,
    payoutRatio: 80,
    dividendGrowthNearTerm: 10,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'TCS',         ticker: 'TCS',      category: 'IndianIT', marketCapCr: 1240000,evEbitda: 18, pe: 26, dividendYield: 3.7, roic: 50, note: 'Largest peer' },
    { name: 'Infosys',     ticker: 'INFY',     category: 'IndianIT', marketCapCr: 640000, evEbitda: 17, pe: 25, dividendYield: 2.8, roic: 35, note: '#2 peer' },
    { name: 'Wipro',       ticker: 'WIPRO',    category: 'IndianIT', marketCapCr: 260000, evEbitda: 14, pe: 22, dividendYield: 1.2, roic: 18, note: 'Turnaround' },
    { name: 'LTIMindtree', ticker: 'LTIM',     category: 'IndianIT', marketCapCr: 170000, evEbitda: 22, pe: 32, dividendYield: 1.0, roic: 30, note: 'Mid-tier digital' },
    { name: 'Tech Mahindra',ticker: 'TECHM',   category: 'IndianIT', marketCapCr: 150000, evEbitda: 15, pe: 28, dividendYield: 2.4, roic: 14, note: 'Telecom-heavy turnaround' },
    { name: 'L&T Tech Services',ticker: 'LTTS',category: 'IndianIT', marketCapCr: 54000,  evEbitda: 22, pe: 35, dividendYield: 0.8, roic: 28, note: 'ER&D pure-play' },
    { name: 'Accenture',   ticker: 'ACN',      category: 'GlobalIT', marketCapCr: 2700000,evEbitda: 17, pe: 28, dividendYield: 1.6, roic: 30, note: 'Global consulting' },
    { name: 'Cognizant',   ticker: 'CTSH',     category: 'GlobalIT', marketCapCr: 320000, evEbitda: 11, pe: 17, dividendYield: 1.5, roic: 20, note: 'Turnaround' },
    { name: 'Capgemini',   ticker: 'CAP.PA',   category: 'GlobalIT', marketCapCr: 285000, evEbitda: 10, pe: 16, dividendYield: 2.1, roic: 17, note: 'France-based peer' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Discretionary Cut)', probability: 0.24, description: 'BFS + telecom freeze; ERS growth halves; margin 16%', color: '#DC2626', overrides: { revenueGrowthCAGR: 4, targetEbitdaMargin: 21, wacc: 12.5 } },
    { id: 'base',   label: 'Base',                      probability: 0.52, description: 'Steady 6-8% CC growth; margin band 18-19%',             color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (GenAI + P&P)',        probability: 0.18, description: 'HCLSoftware re-acceleration; GenAI revenue uplift; 10%+', color: '#16A34A', overrides: { revenueGrowthCAGR: 12, targetEbitdaMargin: 27, wacc: 10.5 } },
    { id: 'stress', label: 'Telecom/ER&D Shock',        probability: 0.06, description: 'Telecom ER&D client bankruptcies; visa regulation cost', color: '#7C2D12', overrides: { revenueGrowthCAGR: 2, targetEbitdaMargin: 18, wacc: 13 } },
  ],
  keyDrivers: [
    'ER&D leadership (#1 Indian player, ~17% of revenue)',
    'Cloud + infra managed services franchise',
    'HCL Software IP base (AppScan, BigFix, DRYiCE)',
    'Payout 75-85% policy and consistent buy-backs',
    'Shiv Nadar Group stability and governance',
  ],
  keyRisks: [
    'Products & Platforms revenue lumpy (renewals)',
    'Telecom vertical exposure vs capex cycle',
    'Pricing pressure in infra services',
    'Wage inflation vs automation',
    'GenAI disruption of infra / L1 support',
  ],
  recentHighlights: [
    'FY25 revenue ₹1.17L Cr (+6.5% CC); EBIT margin 18.6%',
    'Q4 FY25 large-deal TCV $3bn+',
    'Dividend ₹60/sh (+15%); payout >85%',
    'HCLSoftware re-org + renewed focus on subscription',
  ],
  thesisShort: 'Balanced IT-services mix with ER&D premium and HCL Software optionality; attractive capital return as pipeline converts.',
};

// ==========================================================================
// INDUSIND BANK (Mid-size private; FY26 MFI + derivatives accounting stress)
// ==========================================================================
const INDUSIND: CompanyProfile = {
  id: 'indusind',
  ticker: 'INDUSINDBK',
  name: 'IndusInd Bank',
  sector: 'Private Banking / BFSI',
  tagline: 'Mid-size private bank navigating MFI cycle + derivatives accounting reset',
  accentColor: '#CA8A04',
  currentMarketPrice: 870,
  targetPriceRange: { low: 780, base: 1000, high: 1180 },
  sharesOutstandingCr: 77.9,
  netCashCr: 0,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 27950, ebitda: 11010, ebit: 4620,  pat: 2836,  eps: 36.8, dps: 0.0,  capex: 820, operatingCashFlow: 11500, freeCashFlow: 10680, netDebt: 0, totalAssets: 362973, investedCapital: 43100 },
    { fy: 'FY22', revenue: 32240, ebitda: 12456, ebit: 7370,  pat: 4611,  eps: 59.6, dps: 8.5,  capex: 940, operatingCashFlow: 13340, freeCashFlow: 12400, netDebt: 0, totalAssets: 401974, investedCapital: 47300 },
    { fy: 'FY23', revenue: 39770, ebitda: 14560, ebit: 11380, pat: 7443,  eps: 96.0, dps: 14.0, capex: 1080,operatingCashFlow: 15400, freeCashFlow: 14320, netDebt: 0, totalAssets: 457829, investedCapital: 54700 },
    { fy: 'FY24', revenue: 50500, ebitda: 16820, ebit: 13690, pat: 8977,  eps: 115.4,dps: 16.5, capex: 1220,operatingCashFlow: 17750, freeCashFlow: 16530, netDebt: 0, totalAssets: 514935, investedCapital: 60400 },
    { fy: 'FY25', revenue: 55110, ebitda: 17920, ebit: 10050, pat: 7230,  eps: 92.8, dps: 16.5, capex: 1340,operatingCashFlow: 18600, freeCashFlow: 17260, netDebt: 0, totalAssets: 528690, investedCapital: 61800 },
  ],
  segments: [
    { name: 'Retail Banking (incl. Vehicle Finance)',fy25Revenue: 32530, fy25Ebit: 5750, fy25Margin: 17.7, targetMultiple: 13, multipleLow: 10, multipleHigh: 17, growthOutlook: 'Vehicle franchise intact; unsecured retail stressed', share: 59.0 },
    { name: 'Corporate Banking',                     fy25Revenue: 13150, fy25Ebit: 2740, fy25Margin: 20.8, targetMultiple: 10, multipleLow: 8,  multipleHigh: 13, growthOutlook: 'Mid-corporate + trade; capex cycle lever',         share: 23.9 },
    { name: 'Treasury',                              fy25Revenue: 6620,  fy25Ebit: 890,  fy25Margin: 13.4, targetMultiple: 7,  multipleLow: 6,  multipleHigh: 9,  growthOutlook: 'Post-derivatives reset; normalised NII',            share: 12.0 },
    { name: 'Microfinance (Bharat Financial)',       fy25Revenue: 2810,  fy25Ebit: 670,  fy25Margin: 23.8, targetMultiple: 11, multipleLow: 8,  multipleHigh: 14, growthOutlook: 'Slippage peaked; credit cost cycle winds down',      share: 5.1 },
  ],
  assumptions: {
    revenueGrowthCAGR: 11,
    revenueGrowthY1: 7,
    terminalGrowth: 5.5,
    targetEbitdaMargin: 38,
    taxRate: 25,
    wacc: 13.0,
    costOfEquity: 14.0,
    daPercentRevenue: 1.0,
    capexPercentRevenue: 2.5,
    workingCapitalIntensity: 0,
    projectionYears: 7,
    payoutRatio: 18,
    dividendGrowthNearTerm: 10,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'HDFC Bank',        ticker: 'HDFCBANK',   category: 'IndianBank', marketCapCr: 1370000,evEbitda: 11, pe: 20, dividendYield: 1.2, roic: 14, note: 'Gold standard' },
    { name: 'ICICI Bank',       ticker: 'ICICIBANK',  category: 'IndianBank', marketCapCr: 880000, evEbitda: 10, pe: 18, dividendYield: 0.9, roic: 18, note: 'Best ROA peer' },
    { name: 'Axis Bank',        ticker: 'AXISBANK',   category: 'IndianBank', marketCapCr: 360000, evEbitda: 8,  pe: 14, dividendYield: 0.1, roic: 14, note: 'Private #3' },
    { name: 'Kotak Mahindra',   ticker: 'KOTAKBANK',  category: 'IndianBank', marketCapCr: 380000, evEbitda: 11, pe: 19, dividendYield: 0.1, roic: 16, note: 'Premium franchise' },
    { name: 'Federal Bank',     ticker: 'FEDERALBNK', category: 'IndianBank', marketCapCr: 50000,  evEbitda: 7,  pe: 10, dividendYield: 1.1, roic: 13, note: 'South India peer' },
    { name: 'RBL Bank',         ticker: 'RBLBANK',    category: 'IndianBank', marketCapCr: 14000,  evEbitda: 6,  pe: 11, dividendYield: 0.8, roic: 8,  note: 'Mid-size cards-heavy' },
    { name: 'AU Small Finance', ticker: 'AUBANK',     category: 'IndianBank', marketCapCr: 44000,  evEbitda: 8,  pe: 19, dividendYield: 0.1, roic: 12, note: 'SFB converted' },
    { name: 'Cholamandalam Inv.',ticker: 'CHOLAFIN',  category: 'IndianNBFC', marketCapCr: 130000, evEbitda: 22, pe: 28, dividendYield: 0.2, roic: 17, note: 'Vehicle finance peer' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (MFI + Derivatives)', probability: 0.32, description: 'MFI credit cost sustains >4%; derivatives review uncovers further gaps; governance cloud', color: '#DC2626', overrides: { revenueGrowthCAGR: 3,  targetEbitdaMargin: 30, wacc: 14.5 } },
    { id: 'base',   label: 'Base',                      probability: 0.50, description: 'MFI normalises by FY26-H2; ROA returns to 1.6%; promoter-transition orderly',              color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Recovery)',           probability: 0.15, description: 'MFI provisions unwind; CV + vehicle growth resumes; ROA 1.8%+',                             color: '#16A34A', overrides: { revenueGrowthCAGR: 16, targetEbitdaMargin: 42, wacc: 12 } },
    { id: 'stress', label: 'Promoter / RBI Action',     probability: 0.03, description: 'RBI intervention; strategic investor forced; valuation compressed near BV',                color: '#7C2D12', overrides: { revenueGrowthCAGR: 0,  targetEbitdaMargin: 24, wacc: 15 } },
  ],
  keyDrivers: [
    'Vehicle Finance franchise (largest CV + tractor + 2W NBFC-style)',
    'Bharat Financial Inclusion (BFIL) + microfinance cycle',
    'Promoter transition clarity post-FY26 regulatory reset',
    'Cost-income ratio improvement runway',
    'CV demand recovery cycle',
  ],
  keyRisks: [
    'MFI / unsecured retail credit cost sustains',
    'Derivatives accounting review contagion (FY25 disclosed)',
    'Promoter Ashok Hinduja / Indusind International Holdings structure',
    'Key-man risk; CEO Sumant Kathpalia term uncertainty',
    'Deposit mobilisation vs peers',
  ],
  recentHighlights: [
    'FY25 PAT ₹7,230 Cr (-19% YoY); ROA 1.3%, ROE 11.7%',
    'Derivatives accounting discrepancies disclosed (Mar-2025)',
    'GNPA 2.13%; NNPA 0.58% (rising)',
    'Deposits +7% YoY; CASA 33%',
  ],
  thesisShort: 'Deep-value re-rating option if MFI cycle turns and governance noise subsides; currently priced for continued stress.',
};

// ==========================================================================
// JSW STEEL (Consolidated; Domestic + US + Italy + JV minorities)
// ==========================================================================
const JSWSTEEL: CompanyProfile = {
  id: 'jswsteel',
  ticker: 'JSWSTEEL',
  name: 'JSW Steel',
  sector: 'Metals & Mining - Steel',
  tagline: 'Fastest-growing Indian steelmaker; Vijayanagar expansion + BPSL synergies',
  accentColor: '#1D4ED8',
  currentMarketPrice: 935,
  targetPriceRange: { low: 860, base: 1030, high: 1190 },
  sharesOutstandingCr: 244.2,
  netCashCr: -75000,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 79839,  ebitda: 20141, ebit: 13860, pat: 7911,  eps: 32.4, dps: 6.5, capex: 9800, operatingCashFlow: 17420, freeCashFlow: 7620,  netDebt: 54800, totalAssets: 154000, investedCapital: 108500 },
    { fy: 'FY22', revenue: 146371, ebitda: 40352, ebit: 32180, pat: 20938, eps: 85.8, dps: 17.35,capex: 12400,operatingCashFlow: 32720, freeCashFlow: 20320, netDebt: 52300, totalAssets: 178000, investedCapital: 115400 },
    { fy: 'FY23', revenue: 165960, ebitda: 20230, ebit: 11350, pat: 4139,  eps: 16.9, dps: 3.4, capex: 14800,operatingCashFlow: 18480, freeCashFlow: 3680,  netDebt: 70300, totalAssets: 205000, investedCapital: 132100 },
    { fy: 'FY24', revenue: 175006, ebitda: 26890, ebit: 17560, pat: 8973,  eps: 36.7, dps: 7.3, capex: 15600,operatingCashFlow: 24300, freeCashFlow: 8700,  netDebt: 75200, totalAssets: 229000, investedCapital: 146500 },
    { fy: 'FY25', revenue: 169953, ebitda: 23452, ebit: 14200, pat: 3491,  eps: 14.3, dps: 2.7, capex: 15800,operatingCashFlow: 22040, freeCashFlow: 6240,  netDebt: 75000, totalAssets: 248000, investedCapital: 160400 },
  ],
  segments: [
    { name: 'India Steel - Flat',    fy25Revenue: 125770, fy25Ebit: 10940, fy25Margin: 8.7,  targetMultiple: 9, multipleLow: 7, multipleHigh: 11, growthOutlook: 'Vijayanagar expansion to 40 MTPA by FY28',   share: 74.0 },
    { name: 'India Steel - Long',    fy25Revenue: 20390,  fy25Ebit: 1430,  fy25Margin: 7.0,  targetMultiple: 7, multipleLow: 5, multipleHigh: 9,  growthOutlook: 'BPSL Dolvi + Angul ramp',                 share: 12.0 },
    { name: 'Overseas (US + Italy)', fy25Revenue: 13600,  fy25Ebit: -680,  fy25Margin: -5.0, targetMultiple: 4, multipleLow: 2, multipleHigh: 6,  growthOutlook: 'US Ohio cold-rolling; Italy loss-making', share: 8.0 },
    { name: 'Mining (Iron ore, coking coal)',fy25Revenue: 5100,fy25Ebit: 1540,fy25Margin: 30.2,targetMultiple: 8, multipleLow: 6, multipleHigh: 11, growthOutlook: 'Captive ore ramp reduces cost',          share: 3.0 },
    { name: 'Power + Others',        fy25Revenue: 5090,   fy25Ebit: 970,   fy25Margin: 19.1, targetMultiple: 10,multipleLow: 8, multipleHigh: 13, growthOutlook: 'Captive power + by-products',               share: 3.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 8,
    revenueGrowthY1: 6,
    terminalGrowth: 4.5,
    targetEbitdaMargin: 16,
    taxRate: 25,
    wacc: 12.5,
    costOfEquity: 14.0,
    daPercentRevenue: 5.5,
    capexPercentRevenue: 8,
    workingCapitalIntensity: 16,
    projectionYears: 8,
    payoutRatio: 18,
    dividendGrowthNearTerm: 10,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 8,
  },
  peers: [
    { name: 'Tata Steel',         ticker: 'TATASTEEL', category: 'IndianMetals', marketCapCr: 180000, evEbitda: 10, pe: 40, dividendYield: 2.5, roic: 7,  note: 'Larger domestic peer' },
    { name: 'SAIL',               ticker: 'SAIL',      category: 'IndianMetals', marketCapCr: 52000,  evEbitda: 9,  pe: 18, dividendYield: 1.6, roic: 6,  note: 'PSU steel' },
    { name: 'Jindal Steel & Power',ticker: 'JINDALSTEL',category: 'IndianMetals',marketCapCr: 95000,  evEbitda: 9,  pe: 18, dividendYield: 0.2, roic: 11, note: 'Long products' },
    { name: 'Hindalco',           ticker: 'HINDALCO',  category: 'IndianMetals', marketCapCr: 145000, evEbitda: 6,  pe: 12, dividendYield: 0.5, roic: 11, note: 'Aluminium + Novelis' },
    { name: 'NMDC',               ticker: 'NMDC',      category: 'IndianMetals', marketCapCr: 62000,  evEbitda: 5,  pe: 9,  dividendYield: 4.0, roic: 22, note: 'Iron-ore PSU' },
    { name: 'Vedanta',            ticker: 'VEDL',      category: 'IndianMetals', marketCapCr: 165000, evEbitda: 5,  pe: 12, dividendYield: 9.0, roic: 15, note: 'Diversified metals' },
    { name: 'ArcelorMittal',      ticker: 'MT',        category: 'GlobalMetals', marketCapCr: 230000, evEbitda: 5,  pe: 12, dividendYield: 2.3, roic: 8,  note: 'Global steel major' },
    { name: 'Nucor',              ticker: 'NUE',       category: 'GlobalMetals', marketCapCr: 350000, evEbitda: 7,  pe: 15, dividendYield: 1.6, roic: 22, note: 'US EAF pure-play' },
    { name: 'POSCO Holdings',     ticker: 'PKX',       category: 'GlobalMetals', marketCapCr: 210000, evEbitda: 6,  pe: 13, dividendYield: 3.5, roic: 5,  note: 'Korea; EV materials' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (China Dumping + BF Delay)',probability: 0.27, description: 'HRC <₹48K; Vijayanagar ramp delayed; US + Italy losses persist',   color: '#DC2626', overrides: { revenueGrowthCAGR: 3, targetEbitdaMargin: 11, wacc: 13.5 } },
    { id: 'base',   label: 'Base',                             probability: 0.50, description: 'BPSL + Vijayanagar synergies; HRC cycle mid-range; margin 17%',     color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Domestic Boom)',             probability: 0.18, description: 'China stimulus; safeguard duty; India margin 20%; US turns positive', color: '#16A34A', overrides: { revenueGrowthCAGR: 12, targetEbitdaMargin: 22, wacc: 11 } },
    { id: 'stress', label: 'Debt + Recession',                  probability: 0.05, description: 'Global recession; HRC sub-₹45K; net debt / EBITDA > 4x',            color: '#7C2D12', overrides: { revenueGrowthCAGR: -2,targetEbitdaMargin: 9,  wacc: 14.5 } },
  ],
  keyDrivers: [
    'Vijayanagar expansion to 40 MTPA by FY28 (from 28 MTPA)',
    'BPSL integration + captive iron-ore ramp',
    'JVMPL (Jharkhand) mining cluster',
    'India demand: infra + renewable-structures + auto',
    'Safeguard + anti-dumping duties supporting realisations',
  ],
  keyRisks: [
    'Chinese steel export dumping pressuring HRC',
    'US (Ohio + Baytown) + Italy (Piombino) losses',
    'Net debt / EBITDA at >3x through cycle',
    'Raw material (coking coal, iron ore) volatility',
    'Regulatory: CBAM, scope-1 carbon pricing',
  ],
  recentHighlights: [
    'FY25 revenue ₹1.70L Cr; PAT ₹3,491 Cr (-61% YoY on HRC drag)',
    'Capacity 34.2 MTPA (India); 40 MTPA target by FY28',
    'FY25 steel sales 26.4 MT (+5% YoY)',
    'Net debt / EBITDA 3.2x; capex peak by FY26',
  ],
  thesisShort: 'Operating leverage play: every $20/t HRC uplift adds ~₹8/sh in EPS; Vijayanagar expansion drives the next cycle.',
};

// ==========================================================================
// KOTAK MAHINDRA BANK (Consolidated; premium-valuation franchise)
// ==========================================================================
const KOTAK: CompanyProfile = {
  id: 'kotak',
  ticker: 'KOTAKBANK',
  name: 'Kotak Mahindra Bank',
  sector: 'Private Banking / BFSI',
  tagline: 'Premium private-bank franchise; Uday transition + digital + subsidiaries compound',
  accentColor: '#1E3A8A',
  currentMarketPrice: 1900,
  targetPriceRange: { low: 1750, base: 2100, high: 2400 },
  sharesOutstandingCr: 198.8,
  netCashCr: 0,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 21545, ebitda: 13300, ebit: 8220,  pat: 6965,  eps: 35.1, dps: 0.9, capex: 660, operatingCashFlow: 11500, freeCashFlow: 10840, netDebt: 0, totalAssets: 458735, investedCapital: 68700 },
    { fy: 'FY22', revenue: 24550, ebitda: 14080, ebit: 11170, pat: 8573,  eps: 43.1, dps: 1.1, capex: 740, operatingCashFlow: 12680, freeCashFlow: 11940, netDebt: 0, totalAssets: 531190, investedCapital: 76800 },
    { fy: 'FY23', revenue: 29790, ebitda: 15870, ebit: 14080, pat: 10939, eps: 55.0, dps: 1.5, capex: 860, operatingCashFlow: 14210, freeCashFlow: 13350, netDebt: 0, totalAssets: 620435, investedCapital: 87400 },
    { fy: 'FY24', revenue: 38500, ebitda: 19930, ebit: 17540, pat: 13782, eps: 69.3, dps: 2.0, capex: 1020,operatingCashFlow: 17650, freeCashFlow: 16630, netDebt: 0, totalAssets: 729333, investedCapital: 100500 },
    { fy: 'FY25', revenue: 45260, ebitda: 22350, ebit: 20120, pat: 16450, eps: 82.7, dps: 2.5, capex: 1180,operatingCashFlow: 20950, freeCashFlow: 19770, netDebt: 0, totalAssets: 830000,  investedCapital: 115200 },
  ],
  segments: [
    { name: 'Retail Banking',     fy25Revenue: 24890, fy25Ebit: 11470, fy25Margin: 46.1, targetMultiple: 20, multipleLow: 17, multipleHigh: 24, growthOutlook: 'Post-embargo digital re-acceleration', share: 55.0 },
    { name: 'Corporate Banking',  fy25Revenue: 10860, fy25Ebit: 5840,  fy25Margin: 53.8, targetMultiple: 13, multipleLow: 11, multipleHigh: 16, growthOutlook: 'Mid-corporate focus; trade + FX',       share: 24.0 },
    { name: 'Treasury',           fy25Revenue: 4980,  fy25Ebit: 2210,  fy25Margin: 44.4, targetMultiple: 9,  multipleLow: 7,  multipleHigh: 11, growthOutlook: 'Yield-curve play',                      share: 11.0 },
    { name: 'Securities + AMC + Life',fy25Revenue: 4530,fy25Ebit: 2260,fy25Margin: 49.9, targetMultiple: 24, multipleLow: 20, multipleHigh: 28, growthOutlook: 'Kotak AMC + Securities + Life',         share: 10.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 15,
    revenueGrowthY1: 13,
    terminalGrowth: 5.5,
    targetEbitdaMargin: 52,
    taxRate: 25,
    wacc: 11.5,
    costOfEquity: 12.5,
    daPercentRevenue: 1.0,
    capexPercentRevenue: 1.5,
    workingCapitalIntensity: 0,
    projectionYears: 7,
    payoutRatio: 3,
    dividendGrowthNearTerm: 15,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'HDFC Bank',        ticker: 'HDFCBANK',   category: 'IndianBank', marketCapCr: 1370000,evEbitda: 11, pe: 20, dividendYield: 1.2, roic: 14, note: 'Largest private' },
    { name: 'ICICI Bank',       ticker: 'ICICIBANK',  category: 'IndianBank', marketCapCr: 880000, evEbitda: 10, pe: 18, dividendYield: 0.9, roic: 18, note: 'Best ROA' },
    { name: 'Axis Bank',        ticker: 'AXISBANK',   category: 'IndianBank', marketCapCr: 360000, evEbitda: 8,  pe: 14, dividendYield: 0.1, roic: 14, note: 'Private #3' },
    { name: 'IndusInd Bank',    ticker: 'INDUSINDBK', category: 'IndianBank', marketCapCr: 68000,  evEbitda: 6,  pe: 8,  dividendYield: 1.2, roic: 10, note: 'Under stress' },
    { name: 'State Bank of India',ticker: 'SBIN',     category: 'IndianBank', marketCapCr: 710000, evEbitda: 6,  pe: 10, dividendYield: 1.8, roic: 13, note: 'PSU leader' },
    { name: 'Federal Bank',     ticker: 'FEDERALBNK', category: 'IndianBank', marketCapCr: 50000,  evEbitda: 7,  pe: 10, dividendYield: 1.1, roic: 13, note: 'South India peer' },
    { name: 'AU Small Finance', ticker: 'AUBANK',     category: 'IndianBank', marketCapCr: 44000,  evEbitda: 8,  pe: 19, dividendYield: 0.1, roic: 12, note: 'SFB converted' },
    { name: 'DBS Bank',         ticker: 'D05.SI',     category: 'GlobalBank', marketCapCr: 940000, evEbitda: 9,  pe: 11, dividendYield: 5.0, roic: 14, note: 'Premium Asia peer' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Premium Compression)',probability: 0.25, description: 'Embargo overhang persists; digital catch-up stalls; premium vs peers erodes', color: '#DC2626', overrides: { revenueGrowthCAGR: 9,  targetEbitdaMargin: 46, wacc: 12.5 } },
    { id: 'base',   label: 'Base',                       probability: 0.52, description: 'Post-embargo digital re-acceleration; CASA 45%+; ROA 2.3%+',                 color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Uday 2.0)',            probability: 0.18, description: 'CEO Ashok Vaswani re-engineers franchise; cost-income sub-40%',              color: '#16A34A', overrides: { revenueGrowthCAGR: 19, targetEbitdaMargin: 58, wacc: 10.5 } },
    { id: 'stress', label: 'Regulatory Relapse',          probability: 0.05, description: 'Fresh RBI embargo or promoter stake dilution delay',                         color: '#7C2D12', overrides: { revenueGrowthCAGR: 6,  targetEbitdaMargin: 42, wacc: 13 } },
  ],
  keyDrivers: [
    'Post-embargo onboarding re-opened (Feb-2025 ruling pending)',
    'Ashok Vaswani CEO (from Jan-2024) - strategic reset',
    'CASA 43%; best-in-class cost-of-deposits in peers',
    'Subsidiaries: Kotak AMC, Securities, Life + General Insurance',
    'Capital: Tier-1 ~21%; dry powder for organic + inorganic',
  ],
  keyRisks: [
    'Promoter Uday Kotak reducing stake from 26% (RBI mandate)',
    'Digital customer-acquisition embargo (Apr-2024 onwards)',
    'Premium valuation vulnerable to peer convergence',
    'Unsecured retail credit cost cycle',
    'Deposit-growth lag vs peers',
  ],
  recentHighlights: [
    'FY25 PAT ₹16,450 Cr (+19% YoY); ROA 2.3%, ROE 15.5%',
    'Deposits +15% YoY; advances +13% YoY',
    'GNPA 1.40%; NNPA 0.33% (sector-best)',
    'RBI digital embargo in force since Apr-2024',
  ],
  thesisShort: 'Premium franchise at a relative discount post-embargo; re-acceleration of digital + CEO transition drives next leg, but relative premium cap is real.',
};

// ==========================================================================
// NESTLE INDIA (Apr-Mar FY reporting since Apr-2024; transition mid-FY24)
// Historical line items normalised to 12-month FY equivalents.
// ==========================================================================
const NESTLE: CompanyProfile = {
  id: 'nestle',
  ticker: 'NESTLEIND',
  name: 'Nestle India',
  sector: 'Consumer Staples - Packaged Foods',
  tagline: 'India\'s top branded food company; Maggi + KitKat + Nescafe compounder',
  accentColor: '#C2410C',
  currentMarketPrice: 2250,
  targetPriceRange: { low: 2100, base: 2500, high: 2820 },
  sharesOutstandingCr: 96.42,
  netCashCr: 500,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 14740, ebitda: 3400, ebit: 2900, pat: 2082, eps: 21.6, dps: 20.00,capex: 640,  operatingCashFlow: 2700, freeCashFlow: 2060, netDebt: -740, totalAssets: 8400,  investedCapital: 4500 },
    { fy: 'FY22', revenue: 16897, ebitda: 3945, ebit: 3440, pat: 2390, eps: 24.8, dps: 22.00,capex: 780,  operatingCashFlow: 2820, freeCashFlow: 2040, netDebt: -820, totalAssets: 9200,  investedCapital: 5200 },
    { fy: 'FY23', revenue: 19127, ebitda: 4438, ebit: 3810, pat: 2906, eps: 30.1, dps: 27.00,capex: 960,  operatingCashFlow: 3280, freeCashFlow: 2320, netDebt: -600, totalAssets: 9900,  investedCapital: 5700 },
    { fy: 'FY24', revenue: 24275, ebitda: 5615, ebit: 4880, pat: 3690, eps: 38.3, dps: 27.75,capex: 1420, operatingCashFlow: 4120, freeCashFlow: 2700, netDebt: -400, totalAssets: 11100, investedCapital: 6500 },
    { fy: 'FY25', revenue: 20202, ebitda: 4765, ebit: 4040, pat: 3060, eps: 31.7, dps: 25.00,capex: 1580, operatingCashFlow: 3850, freeCashFlow: 2270, netDebt: -500, totalAssets: 11900, investedCapital: 7100 },
  ],
  segments: [
    { name: 'Prepared Dishes (Maggi)',        fy25Revenue: 6460, fy25Ebit: 1730, fy25Margin: 26.8, targetMultiple: 38, multipleLow: 32, multipleHigh: 45, growthOutlook: 'Noodles leadership; pricing discipline', share: 32.0 },
    { name: 'Milk + Nutrition (Cerelac, Lactogen)',fy25Revenue: 4440,fy25Ebit: 1010,fy25Margin: 22.7,targetMultiple: 35, multipleLow: 30, multipleHigh: 42, growthOutlook: 'Infant nutrition + Nestle a+',     share: 22.0 },
    { name: 'Beverages (Nescafe)',             fy25Revenue: 3640, fy25Ebit: 930,  fy25Margin: 25.5, targetMultiple: 40, multipleLow: 33, multipleHigh: 48, growthOutlook: 'Coffee premiumisation + OOH',          share: 18.0 },
    { name: 'Chocolates & Confectionery (KitKat, Munch)',fy25Revenue: 3240,fy25Ebit: 580,fy25Margin: 17.9,targetMultiple: 32, multipleLow: 26, multipleHigh: 38, growthOutlook: 'Cocoa cost headwind; premium gifting', share: 16.0 },
    { name: 'Out-of-Home + Petcare + Others',  fy25Revenue: 2420, fy25Ebit: 410,  fy25Margin: 16.9, targetMultiple: 28, multipleLow: 22, multipleHigh: 34, growthOutlook: 'HoReCa recovery + Purina launch',       share: 12.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 10,
    revenueGrowthY1: 6,
    terminalGrowth: 6.0,
    targetEbitdaMargin: 24,
    taxRate: 25,
    wacc: 10.5,
    costOfEquity: 11.5,
    daPercentRevenue: 3.5,
    capexPercentRevenue: 6,
    workingCapitalIntensity: -4,
    projectionYears: 8,
    payoutRatio: 80,
    dividendGrowthNearTerm: 8,
    dividendGrowthTerminal: 6,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'Hindustan Unilever', ticker: 'HINDUNILVR',category: 'IndianFMCG',    marketCapCr: 575000, evEbitda: 35, pe: 55, dividendYield: 1.9, roic: 30, note: 'Largest FMCG' },
    { name: 'Britannia',          ticker: 'BRITANNIA', category: 'IndianFMCG',    marketCapCr: 125000, evEbitda: 38, pe: 55, dividendYield: 1.4, roic: 55, note: 'Biscuits leader' },
    { name: 'Tata Consumer',      ticker: 'TATACONSUM',category: 'IndianFMCG',    marketCapCr: 100000, evEbitda: 35, pe: 65, dividendYield: 0.9, roic: 13, note: 'Tea + foods' },
    { name: 'Dabur',              ticker: 'DABUR',     category: 'IndianFMCG',    marketCapCr: 92000,  evEbitda: 30, pe: 45, dividendYield: 1.0, roic: 22, note: 'Ayurveda + foods' },
    { name: 'Godrej Consumer',    ticker: 'GODREJCP',  category: 'IndianFMCG',    marketCapCr: 115000, evEbitda: 36, pe: 60, dividendYield: 0.9, roic: 16, note: 'Home + personal' },
    { name: 'Marico',             ticker: 'MARICO',    category: 'IndianFMCG',    marketCapCr: 85000,  evEbitda: 40, pe: 55, dividendYield: 1.4, roic: 42, note: 'Parachute + Saffola' },
    { name: 'Varun Beverages',    ticker: 'VBL',       category: 'IndianStaples', marketCapCr: 200000, evEbitda: 30, pe: 60, dividendYield: 0.2, roic: 23, note: 'Pepsi bottler' },
    { name: 'Nestle SA',          ticker: 'NESN.SW',   category: 'IndianStaples', marketCapCr: 2000000,evEbitda: 16, pe: 20, dividendYield: 3.5, roic: 15, note: 'Global parent' },
    { name: 'Unilever PLC',       ticker: 'UL',        category: 'IndianStaples', marketCapCr: 1200000,evEbitda: 11, pe: 17, dividendYield: 3.8, roic: 20, note: 'HUL parent' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Cocoa + Coffee Spike)',probability: 0.22, description: 'Cocoa >$8K/t + coffee >$4/lb; price elasticity hits volumes; margin 22%', color: '#DC2626', overrides: { revenueGrowthCAGR: 5, targetEbitdaMargin: 21, wacc: 11.5 } },
    { id: 'base',   label: 'Base',                        probability: 0.52, description: 'Volume 5-7%; pricing 3-4%; margin holds at 23-24%; distribution deepens', color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Premium Mix)',          probability: 0.20, description: 'Petcare + premium coffee + direct-to-home scale; margin 26%+',             color: '#16A34A', overrides: { revenueGrowthCAGR: 13, targetEbitdaMargin: 27, wacc: 9.5 } },
    { id: 'stress', label: 'Regulatory + Commodity Shock',probability: 0.06, description: 'Sugar + nutrition regulation; commodity super-cycle; volume de-growth',    color: '#7C2D12', overrides: { revenueGrowthCAGR: 2, targetEbitdaMargin: 19, wacc: 12 } },
  ],
  keyDrivers: [
    'Maggi noodles volume leadership + brand equity',
    'Nescafe coffee premiumisation + RTD expansion',
    'Nestle a+ dairy portfolio scale',
    'Rural distribution deepening (RURBAN)',
    'Purina petcare launch + health-science foods',
  ],
  keyRisks: [
    'Cocoa + coffee + palm + milk commodity cycles',
    'Nutrition / sugar / ultra-processed food regulation',
    'Baby Cereal Cerelac controversy overhang',
    'Premium pricing elasticity in Tier-2/3',
    'Competitive intensity from ITC, Tata Consumer',
  ],
  recentHighlights: [
    'FY25 revenue ₹20,202 Cr (underlying +4.5% like-for-like vs 12-mo FY24)',
    'PAT ₹3,060 Cr (margin 15.1%)',
    'Capex cycle ramping (Sanand greenfield + 8th factory)',
    '1:10 stock split (Oct-2023); dividend sustained',
  ],
  thesisShort: 'Premium-category FMCG compounder at cyclical cost + regulation troughs; long runway in petcare + premium coffee + rural.',
};

// ==========================================================================
// POWER GRID CORPORATION (Transmission PSU; regulated-RoE compounder)
// ==========================================================================
const POWERGRID: CompanyProfile = {
  id: 'powergrid',
  ticker: 'POWERGRID',
  name: 'Power Grid Corporation',
  sector: 'Power Transmission - Utility',
  tagline: 'India\'s largest transmission PSU; regulated-RoE + green-corridor growth',
  accentColor: '#065F46',
  currentMarketPrice: 310,
  targetPriceRange: { low: 285, base: 340, high: 390 },
  sharesOutstandingCr: 930.4,
  netCashCr: -158000,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 40804, ebitda: 35900, ebit: 24000, pat: 11935, eps: 12.8, dps: 12.00,capex: 8870, operatingCashFlow: 33050, freeCashFlow: 24180, netDebt: 136000, totalAssets: 250000, investedCapital: 200000 },
    { fy: 'FY22', revenue: 42186, ebitda: 37350, ebit: 25290, pat: 16824, eps: 18.1, dps: 14.75,capex: 7450, operatingCashFlow: 34120, freeCashFlow: 26670, netDebt: 132000, totalAssets: 254000, investedCapital: 202500 },
    { fy: 'FY23', revenue: 45699, ebitda: 40110, ebit: 27180, pat: 15418, eps: 16.6, dps: 14.75,capex: 10840,operatingCashFlow: 36550, freeCashFlow: 25710, netDebt: 138000, totalAssets: 262000, investedCapital: 208000 },
    { fy: 'FY24', revenue: 45848, ebitda: 40450, ebit: 27450, pat: 15573, eps: 16.7, dps: 11.25,capex: 13100,operatingCashFlow: 37380, freeCashFlow: 24280, netDebt: 146000, totalAssets: 272000, investedCapital: 215500 },
    { fy: 'FY25', revenue: 46913, ebitda: 41650, ebit: 28090, pat: 15895, eps: 17.1, dps: 10.25,capex: 17900,operatingCashFlow: 38550, freeCashFlow: 20650, netDebt: 158000, totalAssets: 290000, investedCapital: 227000 },
  ],
  segments: [
    { name: 'Transmission Services',     fy25Revenue: 41220, fy25Ebit: 25230, fy25Margin: 61.2, targetMultiple: 12, multipleLow: 10, multipleHigh: 15, growthOutlook: 'RAB growth 6-8%; green corridor build-out',  share: 87.9 },
    { name: 'Consultancy Services',      fy25Revenue: 1410,  fy25Ebit: 760,   fy25Margin: 53.9, targetMultiple: 14, multipleLow: 11, multipleHigh: 18, growthOutlook: 'PMC + cross-border transmission',            share: 3.0 },
    { name: 'Telecom (Powertel)',        fy25Revenue: 1030,  fy25Ebit: 560,   fy25Margin: 54.4, targetMultiple: 15, multipleLow: 12, multipleHigh: 19, growthOutlook: 'OFC leasing + data-centre linkages',          share: 2.2 },
    { name: 'Smart Meters + Others',     fy25Revenue: 3253,  fy25Ebit: 1540,  fy25Margin: 47.4, targetMultiple: 20, multipleLow: 16, multipleHigh: 26, growthOutlook: 'Smart-meter national rollout; 250mn opportunity',share: 6.9 },
  ],
  assumptions: {
    revenueGrowthCAGR: 8,
    revenueGrowthY1: 7,
    terminalGrowth: 5.0,
    targetEbitdaMargin: 88,
    taxRate: 25,
    wacc: 9.0,
    costOfEquity: 11.0,
    daPercentRevenue: 29,
    capexPercentRevenue: 38,
    workingCapitalIntensity: 0,
    projectionYears: 10,
    payoutRatio: 60,
    dividendGrowthNearTerm: 6,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 8,
  },
  peers: [
    { name: 'NTPC',                ticker: 'NTPC',      category: 'IndianUtilities', marketCapCr: 340000, evEbitda: 10, pe: 14, dividendYield: 2.4, roic: 11, note: 'Generation PSU' },
    { name: 'Tata Power',          ticker: 'TATAPOWER', category: 'IndianUtilities', marketCapCr: 135000, evEbitda: 14, pe: 30, dividendYield: 0.5, roic: 10, note: 'RE + distribution' },
    { name: 'NHPC',                ticker: 'NHPC',      category: 'IndianUtilities', marketCapCr: 90000,  evEbitda: 12, pe: 22, dividendYield: 2.1, roic: 9,  note: 'Hydro PSU' },
    { name: 'JSW Energy',          ticker: 'JSWENERGY', category: 'IndianUtilities', marketCapCr: 95000,  evEbitda: 14, pe: 38, dividendYield: 0.4, roic: 9,  note: 'Hydro + thermal + RE' },
    { name: 'Adani Transmission',  ticker: 'ADANIENSOL',category: 'IndianUtilities', marketCapCr: 100000, evEbitda: 16, pe: 50, dividendYield: 0.0, roic: 12, note: 'Private T&D' },
    { name: 'Torrent Power',       ticker: 'TORNTPOWER',category: 'IndianUtilities', marketCapCr: 75000,  evEbitda: 10, pe: 22, dividendYield: 1.0, roic: 14, note: 'Gujarat integrated' },
    { name: 'Iberdrola',           ticker: 'IBE',       category: 'GlobalUtilities', marketCapCr: 750000, evEbitda: 10, pe: 17, dividendYield: 4.2, roic: 7,  note: 'Global regulated + RE' },
    { name: 'National Grid plc',   ticker: 'NG',        category: 'GlobalUtilities', marketCapCr: 480000, evEbitda: 11, pe: 14, dividendYield: 4.5, roic: 6,  note: 'UK transmission' },
    { name: 'Duke Energy',         ticker: 'DUK',       category: 'GlobalUtilities', marketCapCr: 800000, evEbitda: 11, pe: 18, dividendYield: 3.8, roic: 6,  note: 'US regulated' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (TBCB Loss)',           probability: 0.22, description: 'Lose share to private bidders; capex slips; RAB grows sub-5%',          color: '#DC2626', overrides: { revenueGrowthCAGR: 3, targetEbitdaMargin: 84, wacc: 10 } },
    { id: 'base',   label: 'Base',                        probability: 0.52, description: 'Capex guidance ₹2L Cr over FY25-32; RAB +6-8%; regulated RoE 15.5%',   color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Green Corridor)',       probability: 0.20, description: 'RE integration + cross-border + HVDC orders; capex ₹3L Cr; RoE 17%+', color: '#16A34A', overrides: { revenueGrowthCAGR: 12, targetEbitdaMargin: 90, wacc: 8.5 } },
    { id: 'stress', label: 'Regulatory + DISCOM Crisis',  probability: 0.06, description: 'Tariff reforms roll back; SEB receivables blow out',                    color: '#7C2D12', overrides: { revenueGrowthCAGR: 2, targetEbitdaMargin: 80, wacc: 10.5 } },
  ],
  keyDrivers: [
    'Capex guidance ₹2L Cr+ over FY25-32 (doubling of RAB)',
    'Green Energy Corridor + RE evacuation projects',
    'Inter-state transmission monopoly (ISTS)',
    'Smart meter AMI rollout nationwide (250mn+ opportunity)',
    'HVDC + cross-border links (Bhutan, Bangladesh, Sri Lanka)',
  ],
  keyRisks: [
    'TBCB competitive bidding share loss to Adani / Tata',
    'Regulatory: tariff periods + equity base treatment',
    'SEB receivables cycle',
    'Capex execution + ROW clearances',
    'PSU governance + dividend-payout volatility',
  ],
  recentHighlights: [
    'FY25 revenue ₹46,913 Cr; PAT ₹15,895 Cr (+2% YoY)',
    'Capex ₹17,900 Cr (highest ever); FY26 guide ₹25K Cr',
    'Order book ₹1.4L Cr; TBCB wins +30% YoY',
    'Dividend ₹10.25/sh FY25 (reflecting capex cycle)',
  ],
  thesisShort: 'Regulated dividend-and-growth compounder transitioning from low-capex phase to a re-acceleration driven by RE-linked transmission build-out.',
};

// ==========================================================================
// STATE BANK OF INDIA (SBI; largest Indian bank - PSU)
// ==========================================================================
const SBI: CompanyProfile = {
  id: 'sbi',
  ticker: 'SBIN',
  name: 'State Bank of India',
  sector: 'Public Sector Banking / BFSI',
  tagline: 'India\'s largest bank by every metric; PSU value + digital inflection',
  accentColor: '#1E3A8A',
  currentMarketPrice: 800,
  targetPriceRange: { low: 740, base: 880, high: 1000 },
  sharesOutstandingCr: 892.5,
  netCashCr: 0,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 110740, ebitda: 71554,  ebit: 38080, pat: 20410, eps: 22.9, dps: 4.0,  capex: 4600, operatingCashFlow: 63000, freeCashFlow: 58400, netDebt: 0, totalAssets: 4534430, investedCapital: 254000 },
    { fy: 'FY22', revenue: 120708, ebitda: 75292,  ebit: 55440, pat: 31676, eps: 35.5, dps: 7.1,  capex: 5100, operatingCashFlow: 66200, freeCashFlow: 61100, netDebt: 0, totalAssets: 4987597, investedCapital: 281000 },
    { fy: 'FY23', revenue: 150735, ebitda: 83713,  ebit: 72700, pat: 50232, eps: 56.3, dps: 11.3, capex: 5600, operatingCashFlow: 75680, freeCashFlow: 70080, netDebt: 0, totalAssets: 5510971, investedCapital: 325000 },
    { fy: 'FY24', revenue: 176775, ebitda: 93797,  ebit: 79500, pat: 61077, eps: 68.4, dps: 13.7, capex: 6200, operatingCashFlow: 85470, freeCashFlow: 79270, netDebt: 0, totalAssets: 6122624, investedCapital: 370000 },
    { fy: 'FY25', revenue: 209640, ebitda: 110580, ebit: 92050, pat: 70901, eps: 79.4, dps: 15.9, capex: 7400, operatingCashFlow: 98250, freeCashFlow: 90850, netDebt: 0, totalAssets: 6850000, investedCapital: 415000 },
  ],
  segments: [
    { name: 'Personal Banking',        fy25Revenue: 113200, fy25Ebit: 50720, fy25Margin: 44.8, targetMultiple: 12, multipleLow: 10, multipleHigh: 15, growthOutlook: 'Home loans + salary franchise; Yono scale',   share: 54.0 },
    { name: 'Corporate Banking',       fy25Revenue: 52410,  fy25Ebit: 24560, fy25Margin: 46.9, targetMultiple: 10, multipleLow: 8,  multipleHigh: 13, growthOutlook: 'Capex cycle + PSU credit share',              share: 25.0 },
    { name: 'Treasury',                fy25Revenue: 31450,  fy25Ebit: 13780, fy25Margin: 43.8, targetMultiple: 8,  multipleLow: 6,  multipleHigh: 11, growthOutlook: 'Bond + FX; SLR portfolio',                   share: 15.0 },
    { name: 'Subs (SBI Life, SBI Cards, SBI AMC, SBI General)',fy25Revenue: 12580,fy25Ebit: 2990,fy25Margin: 23.8,targetMultiple: 22,multipleLow: 18, multipleHigh: 28, growthOutlook: 'Listed subsidiaries; unlocking value',share: 6.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 12,
    revenueGrowthY1: 11,
    terminalGrowth: 5.5,
    targetEbitdaMargin: 53,
    taxRate: 25,
    wacc: 12.5,
    costOfEquity: 13.5,
    daPercentRevenue: 1.2,
    capexPercentRevenue: 2.0,
    workingCapitalIntensity: 0,
    projectionYears: 7,
    payoutRatio: 18,
    dividendGrowthNearTerm: 12,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 15,
  },
  peers: [
    { name: 'HDFC Bank',        ticker: 'HDFCBANK',   category: 'IndianBank', marketCapCr: 1370000,evEbitda: 11, pe: 20, dividendYield: 1.2, roic: 14, note: 'Largest private' },
    { name: 'ICICI Bank',       ticker: 'ICICIBANK',  category: 'IndianBank', marketCapCr: 880000, evEbitda: 10, pe: 18, dividendYield: 0.9, roic: 18, note: 'Best ROA peer' },
    { name: 'Axis Bank',        ticker: 'AXISBANK',   category: 'IndianBank', marketCapCr: 360000, evEbitda: 8,  pe: 14, dividendYield: 0.1, roic: 14, note: 'Private #3' },
    { name: 'Kotak Mahindra',   ticker: 'KOTAKBANK',  category: 'IndianBank', marketCapCr: 380000, evEbitda: 11, pe: 19, dividendYield: 0.1, roic: 16, note: 'Premium franchise' },
    { name: 'Bank of Baroda',   ticker: 'BANKBARODA', category: 'IndianBank', marketCapCr: 130000, evEbitda: 5,  pe: 6,  dividendYield: 2.5, roic: 12, note: 'PSU #2' },
    { name: 'Punjab National Bank',ticker: 'PNB',     category: 'IndianBank', marketCapCr: 110000, evEbitda: 5,  pe: 7,  dividendYield: 1.5, roic: 8,  note: 'PSU restructured' },
    { name: 'Canara Bank',      ticker: 'CANBK',      category: 'IndianBank', marketCapCr: 90000,  evEbitda: 5,  pe: 6,  dividendYield: 3.0, roic: 12, note: 'PSU merger success' },
    { name: 'Union Bank',       ticker: 'UNIONBANK',  category: 'IndianBank', marketCapCr: 82000,  evEbitda: 5,  pe: 6,  dividendYield: 3.0, roic: 12, note: 'PSU merger' },
    { name: 'Bank of America',  ticker: 'BAC',        category: 'GlobalBank', marketCapCr: 2800000,evEbitda: 8,  pe: 12, dividendYield: 2.5, roic: 11, note: 'US diversified' },
    { name: 'JPMorgan Chase',   ticker: 'JPM',        category: 'GlobalBank', marketCapCr: 5400000,evEbitda: 9,  pe: 13, dividendYield: 2.3, roic: 15, note: 'US mega-bank' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Credit Cost Up)',     probability: 0.23, description: 'Corporate slippage re-emerges; MFI + unsecured hit; ROA 0.9%',          color: '#DC2626', overrides: { revenueGrowthCAGR: 7,  targetEbitdaMargin: 48, wacc: 13.5 } },
    { id: 'base',   label: 'Base',                       probability: 0.52, description: 'Deposit franchise + corporate capex cycle; ROA 1.1%+, ROE 18%',        color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Subsidiary Unlock)',   probability: 0.20, description: 'SBI Life + Cards + AMC re-rating; parent multiple re-rating',         color: '#16A34A', overrides: { revenueGrowthCAGR: 15, targetEbitdaMargin: 58, wacc: 11.5 } },
    { id: 'stress', label: 'Asset-Quality Relapse',      probability: 0.05, description: 'PSU restructuring + policy credit losses; ROA sub-0.7%',              color: '#7C2D12', overrides: { revenueGrowthCAGR: 4,  targetEbitdaMargin: 42, wacc: 14.5 } },
  ],
  keyDrivers: [
    'Largest deposit franchise in India (₹52L Cr; 22% market share)',
    'Yono digital platform + UPI + credit card cross-sell',
    'Subsidiaries: SBI Life, SBI Cards, SBI AMC, SBI General',
    'Corporate capex cycle + infra funding',
    'Capital raise capacity (Tier-1 ~12%) for growth',
  ],
  keyRisks: [
    'PSU policy / farm-loan waiver exposure',
    'Corporate asset quality in infra + MSME',
    'MFI + unsecured retail slippages',
    'Key-man transition + government stake (57%)',
    'Wage revision + pension actuarial liabilities',
  ],
  recentHighlights: [
    'FY25 PAT ₹70,901 Cr (+16% YoY); ROA 1.1%, ROE 19.8%',
    'Deposits +9% YoY; advances +12% YoY',
    'GNPA 1.82%; NNPA 0.47% (best ever)',
    'Final dividend ₹15.90/sh (+16% YoY)',
  ],
  thesisShort: 'India\'s cheapest bluechip bank by P/B with best-in-PSU ROA and subsidiary optionality; PSU discount is the structural cap.',
};

// ==========================================================================
// TATA MOTORS (Consolidated; JLR + India CV + PV + EV)
// ==========================================================================
const TATAMOTORS: CompanyProfile = {
  id: 'tatamotors',
  ticker: 'TATAMOTORS',
  name: 'Tata Motors',
  sector: 'Automobile - CV / PV / JLR',
  tagline: 'JLR turnaround + India CV + PV leadership; EV head-start via Tata Passenger Electric',
  accentColor: '#1E40AF',
  currentMarketPrice: 715,
  targetPriceRange: { low: 650, base: 810, high: 945 },
  sharesOutstandingCr: 368.3,
  netCashCr: -25000,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 249795, ebitda: 22690,  ebit: 4480,  pat: -13395, eps: -36.4, dps: 0.00, capex: 18200, operatingCashFlow: 25800, freeCashFlow: 7600,  netDebt: 75500, totalAssets: 341500, investedCapital: 224500 },
    { fy: 'FY22', revenue: 278454, ebitda: 25755,  ebit: 4900,  pat: -11309, eps: -30.7, dps: 0.00, capex: 22800, operatingCashFlow: 25180, freeCashFlow: 2380,  netDebt: 66400, totalAssets: 350800, investedCapital: 228100 },
    { fy: 'FY23', revenue: 345967, ebitda: 41030,  ebit: 20040, pat: 2414,   eps: 6.6,   dps: 2.00, capex: 28900, operatingCashFlow: 37500, freeCashFlow: 8600,  netDebt: 60400, totalAssets: 377200, investedCapital: 240800 },
    { fy: 'FY24', revenue: 437928, ebitda: 58820,  ebit: 36320, pat: 31807,  eps: 86.4,  dps: 6.00, capex: 34500, operatingCashFlow: 58120, freeCashFlow: 23620, netDebt: 22400, totalAssets: 405700, investedCapital: 260100 },
    { fy: 'FY25', revenue: 439700, ebitda: 59200,  ebit: 36800, pat: 27800,  eps: 75.5,  dps: 6.00, capex: 34100, operatingCashFlow: 57650, freeCashFlow: 23550, netDebt: 25000, totalAssets: 428000, investedCapital: 270300 },
  ],
  segments: [
    { name: 'Jaguar Land Rover (JLR)',       fy25Revenue: 306800, fy25Ebit: 25900, fy25Margin: 8.4,  targetMultiple: 6,  multipleLow: 4,  multipleHigh: 8,  growthOutlook: 'Range Rover, Defender, Discovery; EV transition from 2026', share: 69.8 },
    { name: 'Tata CV - India',               fy25Revenue: 74400,  fy25Ebit: 6700,  fy25Margin: 9.0,  targetMultiple: 12, multipleLow: 9,  multipleHigh: 15, growthOutlook: 'M&HCV leader; LCV consolidation; BS6-OBD2 shift',          share: 16.9 },
    { name: 'Tata PV - India (ICE)',         fy25Revenue: 46400,  fy25Ebit: 2780,  fy25Margin: 6.0,  targetMultiple: 15, multipleLow: 12, multipleHigh: 19, growthOutlook: 'Nexon + Punch volume leader; pricing discipline',           share: 10.6 },
    { name: 'Tata PV EV (Tata Passenger EV)',fy25Revenue: 6100,   fy25Ebit: -450,  fy25Margin: -7.4, targetMultiple: 25, multipleLow: 18, multipleHigh: 32, growthOutlook: 'Nexon EV, Punch EV, Curvv EV; path to FY27 breakeven',     share: 1.4 },
    { name: 'Others (Trucks subs, TACO)',    fy25Revenue: 6000,   fy25Ebit: 870,   fy25Margin: 14.5, targetMultiple: 14, multipleLow: 11, multipleHigh: 18, growthOutlook: 'Tata Cummins + ancillaries',                               share: 1.3 },
  ],
  assumptions: {
    revenueGrowthCAGR: 6,
    revenueGrowthY1: 5,
    terminalGrowth: 4.5,
    targetEbitdaMargin: 15,
    taxRate: 22,
    wacc: 12.5,
    costOfEquity: 14.0,
    daPercentRevenue: 5.0,
    capexPercentRevenue: 7.5,
    workingCapitalIntensity: 2,
    projectionYears: 7,
    payoutRatio: 10,
    dividendGrowthNearTerm: 15,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 15, // JLR + India + EV demerger optionality
  },
  peers: [
    { name: 'Maruti Suzuki',     ticker: 'MARUTI',    category: 'IndianAuto', marketCapCr: 385000, evEbitda: 22, pe: 26, dividendYield: 1.1, roic: 25, note: 'PV leader' },
    { name: 'Mahindra & Mahindra',ticker: 'M&M',     category: 'IndianAuto', marketCapCr: 390000, evEbitda: 14, pe: 28, dividendYield: 0.7, roic: 15, note: 'SUV + tractor' },
    { name: 'Hyundai Motor India',ticker: 'HYUNDAI', category: 'IndianAuto', marketCapCr: 160000, evEbitda: 20, pe: 25, dividendYield: 2.0, roic: 30, note: 'PV #2' },
    { name: 'Ashok Leyland',     ticker: 'ASHOKLEY',  category: 'IndianAuto', marketCapCr: 65000,  evEbitda: 12, pe: 22, dividendYield: 2.2, roic: 15, note: 'CV #2' },
    { name: 'Eicher Motors',     ticker: 'EICHERMOT', category: 'IndianAuto', marketCapCr: 140000, evEbitda: 22, pe: 30, dividendYield: 1.0, roic: 35, note: 'RE + VECV' },
    { name: 'BMW',               ticker: 'BMW.DE',    category: 'GlobalAuto', marketCapCr: 630000, evEbitda: 5,  pe: 7,  dividendYield: 7.0, roic: 10, note: 'German luxury' },
    { name: 'Mercedes-Benz',     ticker: 'MBG.DE',    category: 'GlobalAuto', marketCapCr: 560000, evEbitda: 5,  pe: 6,  dividendYield: 8.0, roic: 11, note: 'German luxury' },
    { name: 'Stellantis',        ticker: 'STLA',      category: 'GlobalAuto', marketCapCr: 350000, evEbitda: 2,  pe: 4,  dividendYield: 9.0, roic: 14, note: 'Global OEM value' },
    { name: 'Ford Motor',        ticker: 'F',         category: 'GlobalAuto', marketCapCr: 400000, evEbitda: 8,  pe: 7,  dividendYield: 6.0, roic: 4,  note: 'US OEM' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (JLR Miss)',          probability: 0.27, description: 'JLR volumes plateau; China luxury softens; EV transition costly',   color: '#DC2626', overrides: { revenueGrowthCAGR: 2,  targetEbitdaMargin: 11, wacc: 13.5 } },
    { id: 'base',   label: 'Base',                      probability: 0.50, description: 'JLR FCF path; India CV mid-cycle; PV share holds; EV ramps as planned', color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Demerger Unlock)',    probability: 0.18, description: 'Demerger + JLR listing; India PV + CV re-rates as pure-play',        color: '#16A34A', overrides: { revenueGrowthCAGR: 11, targetEbitdaMargin: 18, wacc: 11 } },
    { id: 'stress', label: 'EV + Tariff Shock',         probability: 0.05, description: 'BYD + Chinese OEMs disrupt; JLR tariff war; PV margin -300bps',      color: '#7C2D12', overrides: { revenueGrowthCAGR: -1, targetEbitdaMargin: 9,  wacc: 14.5 } },
  ],
  keyDrivers: [
    'JLR volume + product-cycle recovery (Range Rover, Defender)',
    'JLR EV transition (Reimagine strategy; MLA platform)',
    'India CV #1 (42% share M&HCV); LCV consolidation',
    'Tata PV #3 in India; EV pioneer (>60% EV share)',
    'Demerger (CV + PV + JLR) announced Mar-2024; unlock FY26',
  ],
  keyRisks: [
    'JLR demand / China luxury / tariff risk',
    'EV ramp profitability + supply-chain shift',
    'Commodity + FX (GBP-USD-EUR) volatility',
    'CV cycle peak concerns',
    'Demerger execution',
  ],
  recentHighlights: [
    'FY25 consolidated revenue ₹4.40L Cr; PAT ₹27,800 Cr',
    'JLR FY25 wholesale volumes 431K; EBIT margin 8.5%',
    'India PV volumes 556K (-3% YoY); EV share >60%',
    'Demerger announced Mar-2024 - two listed entities expected FY26',
  ],
  thesisShort: 'Multi-engine turnaround with JLR cash engine, India CV cash cow, and PV+EV growth optionality; demerger is the structural catalyst.',
};

// ==========================================================================
// TECH MAHINDRA (Consolidated; telecom + BFS focus; Project Fortius reset)
// ==========================================================================
const TECHM: CompanyProfile = {
  id: 'techm',
  ticker: 'TECHM',
  name: 'Tech Mahindra',
  sector: 'IT Services',
  tagline: 'Telecom-heavy IT services; Project Fortius margin reset + verticals diversification',
  accentColor: '#B45309',
  currentMarketPrice: 1540,
  targetPriceRange: { low: 1420, base: 1700, high: 1950 },
  sharesOutstandingCr: 97.9,
  netCashCr: 7500,
  reportingCurrency: 'INR',
  historical: [
    { fy: 'FY21', revenue: 37855, ebitda: 7290, ebit: 5230, pat: 4352,  eps: 44.5, dps: 45.0, capex: 640, operatingCashFlow: 7400, freeCashFlow: 6760, netDebt: -5800, totalAssets: 42400, investedCapital: 26500 },
    { fy: 'FY22', revenue: 44646, ebitda: 8590, ebit: 6380, pat: 5566,  eps: 56.9, dps: 45.0, capex: 830, operatingCashFlow: 5920, freeCashFlow: 5090, netDebt: -6400, totalAssets: 47600, investedCapital: 28300 },
    { fy: 'FY23', revenue: 53290, ebitda: 8530, ebit: 6480, pat: 4853,  eps: 49.6, dps: 65.0, capex: 1050,operatingCashFlow: 5860, freeCashFlow: 4810, netDebt: -5900, totalAssets: 50700, investedCapital: 29600 },
    { fy: 'FY24', revenue: 51996, ebitda: 5780, ebit: 3330, pat: 2355,  eps: 24.1, dps: 32.0, capex: 960, operatingCashFlow: 6840, freeCashFlow: 5880, netDebt: -6800, totalAssets: 51800, investedCapital: 30100 },
    { fy: 'FY25', revenue: 52988, ebitda: 7840, ebit: 5420, pat: 4253,  eps: 43.4, dps: 50.0, capex: 890, operatingCashFlow: 7520, freeCashFlow: 6630, netDebt: -7500, totalAssets: 53400, investedCapital: 30800 },
  ],
  segments: [
    { name: 'Communications (Telecom + Media)', fy25Revenue: 17990, fy25Ebit: 1440, fy25Margin: 8.0,  targetMultiple: 12, multipleLow: 10, multipleHigh: 16, growthOutlook: 'Largest vertical; 5G + BSS/OSS weak', share: 33.9 },
    { name: 'Manufacturing',                    fy25Revenue: 9550,  fy25Ebit: 1720, fy25Margin: 18.0, targetMultiple: 20, multipleLow: 17, multipleHigh: 24, growthOutlook: 'Auto ER&D + Industry 4.0',             share: 18.0 },
    { name: 'BFSI',                             fy25Revenue: 8480,  fy25Ebit: 1530, fy25Margin: 18.0, targetMultiple: 18, multipleLow: 15, multipleHigh: 22, growthOutlook: 'Gradual BFS recovery',                 share: 16.0 },
    { name: 'Retail, Transport & Logistics',    fy25Revenue: 5830,  fy25Ebit: 1050, fy25Margin: 18.0, targetMultiple: 16, multipleLow: 13, multipleHigh: 20, growthOutlook: 'Resilient + tech upgrades',            share: 11.0 },
    { name: 'Hi-Tech + Others',                 fy25Revenue: 6890,  fy25Ebit: 1100, fy25Margin: 16.0, targetMultiple: 18, multipleLow: 15, multipleHigh: 23, growthOutlook: 'SaaS + cloud wins',                    share: 13.0 },
    { name: 'Healthcare + Life Sciences',       fy25Revenue: 4240,  fy25Ebit: 760,  fy25Margin: 17.9, targetMultiple: 20, multipleLow: 17, multipleHigh: 25, growthOutlook: 'Pharma IT + clinical trials',           share: 8.0 },
  ],
  assumptions: {
    revenueGrowthCAGR: 6,
    revenueGrowthY1: 4,
    terminalGrowth: 4.5,
    targetEbitdaMargin: 18,
    taxRate: 26,
    wacc: 12.0,
    costOfEquity: 12.5,
    daPercentRevenue: 4.6,
    capexPercentRevenue: 1.8,
    workingCapitalIntensity: 14,
    projectionYears: 7,
    payoutRatio: 90,
    dividendGrowthNearTerm: 8,
    dividendGrowthTerminal: 5,
    conglomerateDiscount: 0,
  },
  peers: [
    { name: 'TCS',         ticker: 'TCS',      category: 'IndianIT', marketCapCr: 1240000,evEbitda: 18, pe: 26, dividendYield: 3.7, roic: 50, note: 'Larger peer' },
    { name: 'Infosys',     ticker: 'INFY',     category: 'IndianIT', marketCapCr: 640000, evEbitda: 17, pe: 25, dividendYield: 2.8, roic: 35, note: '#2 peer' },
    { name: 'HCL Tech',    ticker: 'HCLTECH',  category: 'IndianIT', marketCapCr: 440000, evEbitda: 17, pe: 25, dividendYield: 3.5, roic: 28, note: 'Balanced mix peer' },
    { name: 'Wipro',       ticker: 'WIPRO',    category: 'IndianIT', marketCapCr: 260000, evEbitda: 14, pe: 22, dividendYield: 1.2, roic: 18, note: 'Turnaround' },
    { name: 'LTIMindtree', ticker: 'LTIM',     category: 'IndianIT', marketCapCr: 170000, evEbitda: 22, pe: 32, dividendYield: 1.0, roic: 30, note: 'Mid-tier digital' },
    { name: 'Persistent Systems',ticker: 'PERSISTENT',category: 'IndianIT',marketCapCr: 85000,evEbitda: 26,pe: 45,dividendYield: 0.8,roic: 30,note: 'High-growth mid-cap' },
    { name: 'Mphasis',     ticker: 'MPHASIS',  category: 'IndianIT', marketCapCr: 55000,  evEbitda: 17, pe: 28, dividendYield: 2.0, roic: 22, note: 'BFS-focused' },
    { name: 'Accenture',   ticker: 'ACN',      category: 'GlobalIT', marketCapCr: 2700000,evEbitda: 17, pe: 28, dividendYield: 1.6, roic: 30, note: 'Global consulting' },
    { name: 'Cognizant',   ticker: 'CTSH',     category: 'GlobalIT', marketCapCr: 320000, evEbitda: 11, pe: 17, dividendYield: 1.5, roic: 20, note: 'Turnaround' },
  ],
  scenarios: [
    { id: 'bear',   label: 'Bear (Telecom Freeze)',   probability: 0.26, description: 'Telecom capex paused; BFS discretionary cut; margin stuck at 12%',     color: '#DC2626', overrides: { revenueGrowthCAGR: 2, targetEbitdaMargin: 13, wacc: 13 } },
    { id: 'base',   label: 'Base',                     probability: 0.52, description: 'Project Fortius delivers 15% EBIT margin by FY27; vertical mix improves',color: '#2563EB', overrides: {} },
    { id: 'bull',   label: 'Bull (Mahindra Sync)',     probability: 0.17, description: 'Manufacturing + auto ER&D scale; margin 17%+; industry-leading growth',color: '#16A34A', overrides: { revenueGrowthCAGR: 10, targetEbitdaMargin: 22, wacc: 11 } },
    { id: 'stress', label: 'Telecom Client Bankruptcy',probability: 0.05, description: 'Major telecom client bankruptcy; significant provisioning hit',         color: '#7C2D12', overrides: { revenueGrowthCAGR: -1,targetEbitdaMargin: 10, wacc: 13.5 } },
  ],
  keyDrivers: [
    'Project Fortius (Apr-2024) - 3-year margin + growth reset under CEO Mohit Joshi',
    'Communications (34%) vertical bottoming',
    'Manufacturing + auto ER&D leverage Mahindra ecosystem',
    'Capital return: 85-100% payout target; buy-backs',
    'Large-deal TCV acceleration (>$1bn quarterly target)',
  ],
  keyRisks: [
    'Telecom vertical (34% revenue) capex cycle',
    'Wage inflation vs pricing power',
    'GenAI disruption of traditional IT services',
    'Margin volatility (5.4% FY24 → 10.2% FY25)',
    'Visa + onshore regulation',
  ],
  recentHighlights: [
    'FY25 revenue ₹52,988 Cr (+2% YoY CC); EBIT margin 10.2% (+480bps)',
    'Project Fortius target: 15% EBIT margin by FY27',
    'Dividend ₹50/sh (vs ₹32 FY24)',
    'Organic TCV $2.7bn in FY25',
  ],
  thesisShort: 'Margin recovery + vertical diversification play; if Fortius lands, re-rating from bottom-quartile peer discount; if not, dividend floor + cash on balance sheet',
};

// ==========================================================================
// REGISTRY
// ==========================================================================
export const COMPANY_PROFILES: CompanyProfile[] = [
  ITC, TCS, HUL, NEROLAC, VST,
  RELIANCE, HDFCBANK, INFY, MARUTI, SUNPHARMA,
  AIRTEL, LT, BAJFIN, ASIAN, NTPC,
  ICICIBANK, TATASTEEL, TITAN, ULTRATECH, MM,
  ADANIPORTS, AXIS, BAJAJFINSV, HCLTECH, INDUSIND, JSWSTEEL,
  KOTAK, NESTLE, POWERGRID, SBI, TATAMOTORS, TECHM,
];

export const COMPANY_BY_ID: Readonly<Record<string, CompanyProfile>> = Object.freeze(
  Object.fromEntries(COMPANY_PROFILES.map(c => [c.id, c])),
);

export function getCompany(id: string): CompanyProfile {
  const c = COMPANY_BY_ID[id];
  if (!c) throw new Error(`Unknown company id: ${id}`);
  return c;
}
