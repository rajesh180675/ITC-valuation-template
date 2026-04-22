export interface MacroFactor {
  id: string;
  label: string;
  unit: string;
  currentValue: number;
  historicalRange: [number, number];
  description: string;
}

export const MACRO_FACTORS: MacroFactor[] = [
  { id: 'repo_rate', label: 'RBI Repo Rate', unit: '%', currentValue: 6.5, historicalRange: [4, 9], description: 'Reserve Bank of India overnight lending rate' },
  { id: 'cpi', label: 'CPI Inflation', unit: '%', currentValue: 4.8, historicalRange: [2, 10], description: 'Consumer Price Index year-on-year' },
  { id: 'usdinr', label: 'USD / INR', unit: 'INR', currentValue: 83.5, historicalRange: [65, 90], description: 'Dollar-Rupee spot exchange rate' },
  { id: 'crude_oil', label: 'Crude Oil (Brent)', unit: '$/bbl', currentValue: 78, historicalRange: [25, 130], description: 'Brent crude spot price in USD' },
  { id: 'nccd_hike', label: 'NCCD Hike', unit: '%', currentValue: 0, historicalRange: [0, 25], description: 'Union Budget cigarette-specific duty hike' },
  { id: 'gdp_growth', label: 'India GDP Growth', unit: '%', currentValue: 7, historicalRange: [1, 9.5], description: 'Real GDP growth year-on-year' },
  { id: 'sensex_pe', label: 'Sensex P/E', unit: 'x', currentValue: 22, historicalRange: [12, 32], description: 'Trailing P/E of BSE Sensex index' },
  { id: 'farm_msp', label: 'Wheat MSP Growth', unit: '%', currentValue: 6, historicalRange: [0, 20], description: 'Minimum support price growth, key for agri income' },
];

export interface MacroSensitivity {
  companyId: string;
  repo_rate: number;
  cpi: number;
  usdinr: number;
  crude_oil: number;
  nccd_hike: number;
  gdp_growth: number;
  sensex_pe: number;
  farm_msp: number;
}

export const MACRO_SENSITIVITIES: MacroSensitivity[] = [
  { companyId: 'itc', repo_rate: -1.5, cpi: 0.5, usdinr: -0.3, crude_oil: -0.4, nccd_hike: -3.5, gdp_growth: 1.2, sensex_pe: 0.8, farm_msp: 1.1 },
  { companyId: 'hul', repo_rate: -1, cpi: -1.5, usdinr: -1.2, crude_oil: -2, nccd_hike: 0, gdp_growth: 1.8, sensex_pe: 0.9, farm_msp: 0.8 },
  { companyId: 'tcs', repo_rate: 0.2, cpi: -0.2, usdinr: 1.5, crude_oil: 0.1, nccd_hike: 0, gdp_growth: 0.5, sensex_pe: 0.6, farm_msp: 0 },
  { companyId: 'hdfcbank', repo_rate: 2, cpi: -0.5, usdinr: -0.2, crude_oil: -0.1, nccd_hike: 0, gdp_growth: 2.5, sensex_pe: 0.7, farm_msp: 0.3 },
  { companyId: 'reliance', repo_rate: -0.8, cpi: 0.3, usdinr: -0.5, crude_oil: 1.8, nccd_hike: 0, gdp_growth: 1.5, sensex_pe: 0.8, farm_msp: 0 },
  { companyId: 'infy', repo_rate: 0.2, cpi: -0.2, usdinr: 1.4, crude_oil: 0, nccd_hike: 0, gdp_growth: 0.4, sensex_pe: 0.6, farm_msp: 0 },
  { companyId: 'maruti', repo_rate: -2.5, cpi: -0.8, usdinr: -0.8, crude_oil: -0.5, nccd_hike: 0, gdp_growth: 2, sensex_pe: 0.7, farm_msp: 0.5 },
  { companyId: 'sunpharma', repo_rate: -0.3, cpi: 0.2, usdinr: 1.1, crude_oil: -0.3, nccd_hike: 0, gdp_growth: 0.8, sensex_pe: 0.5, farm_msp: 0 },
  { companyId: 'airtel', repo_rate: -0.5, cpi: -0.5, usdinr: -0.4, crude_oil: -0.2, nccd_hike: 0, gdp_growth: 1.5, sensex_pe: 0.6, farm_msp: 0 },
  { companyId: 'lt', repo_rate: -1.8, cpi: -0.5, usdinr: -0.3, crude_oil: -0.6, nccd_hike: 0, gdp_growth: 3, sensex_pe: 0.8, farm_msp: 0.2 },
  { companyId: 'bajfin', repo_rate: 2.5, cpi: -0.8, usdinr: -0.1, crude_oil: -0.1, nccd_hike: 0, gdp_growth: 3, sensex_pe: 0.8, farm_msp: 0.2 },
  { companyId: 'asian', repo_rate: -1, cpi: -0.8, usdinr: -0.6, crude_oil: -2.5, nccd_hike: 0, gdp_growth: 2, sensex_pe: 0.9, farm_msp: 0 },
  { companyId: 'ntpc', repo_rate: -1.5, cpi: 0.5, usdinr: -0.2, crude_oil: 0.3, nccd_hike: 0, gdp_growth: 1, sensex_pe: 0.5, farm_msp: 0 },
  { companyId: 'icicibank', repo_rate: 2, cpi: -0.5, usdinr: -0.2, crude_oil: -0.1, nccd_hike: 0, gdp_growth: 2.3, sensex_pe: 0.7, farm_msp: 0.2 },
  { companyId: 'tatasteel', repo_rate: -1.2, cpi: 0.3, usdinr: 0.8, crude_oil: 0.5, nccd_hike: 0, gdp_growth: 2.5, sensex_pe: 0.8, farm_msp: 0 },
  { companyId: 'titan', repo_rate: -2, cpi: -0.5, usdinr: -0.5, crude_oil: 0, nccd_hike: 0, gdp_growth: 2.5, sensex_pe: 1, farm_msp: 0.3 },
  { companyId: 'ultratech', repo_rate: -1.5, cpi: -0.3, usdinr: -0.3, crude_oil: -0.8, nccd_hike: 0, gdp_growth: 2.8, sensex_pe: 0.7, farm_msp: 0.1 },
  { companyId: 'mm', repo_rate: -2.5, cpi: -0.8, usdinr: -0.5, crude_oil: -0.3, nccd_hike: 0, gdp_growth: 2, sensex_pe: 0.7, farm_msp: 1.5 },
  { companyId: 'adaniports', repo_rate: -1, cpi: 0, usdinr: 0.5, crude_oil: 0.2, nccd_hike: 0, gdp_growth: 2, sensex_pe: 0.6, farm_msp: 0 },
  { companyId: 'axis', repo_rate: 1.8, cpi: -0.5, usdinr: -0.2, crude_oil: -0.1, nccd_hike: 0, gdp_growth: 2.2, sensex_pe: 0.7, farm_msp: 0.2 },
  { companyId: 'bajajfinsv', repo_rate: 1.5, cpi: -0.5, usdinr: -0.1, crude_oil: -0.1, nccd_hike: 0, gdp_growth: 2, sensex_pe: 0.7, farm_msp: 0.2 },
  { companyId: 'hcltech', repo_rate: 0.2, cpi: -0.2, usdinr: 1.3, crude_oil: 0, nccd_hike: 0, gdp_growth: 0.4, sensex_pe: 0.6, farm_msp: 0 },
  { companyId: 'indusind', repo_rate: 1.5, cpi: -0.5, usdinr: -0.3, crude_oil: -0.5, nccd_hike: 0, gdp_growth: 2, sensex_pe: 0.6, farm_msp: 0.3 },
  { companyId: 'jswsteel', repo_rate: -1.2, cpi: 0.3, usdinr: 0.7, crude_oil: 0.4, nccd_hike: 0, gdp_growth: 2.5, sensex_pe: 0.7, farm_msp: 0 },
  { companyId: 'kotak', repo_rate: 1.8, cpi: -0.4, usdinr: -0.2, crude_oil: -0.1, nccd_hike: 0, gdp_growth: 2, sensex_pe: 0.8, farm_msp: 0.2 },
  { companyId: 'nestle', repo_rate: -0.8, cpi: -1, usdinr: -0.5, crude_oil: -0.5, nccd_hike: 0, gdp_growth: 1.5, sensex_pe: 0.9, farm_msp: 0.5 },
  { companyId: 'powergrid', repo_rate: -1.5, cpi: 0.3, usdinr: -0.1, crude_oil: 0.1, nccd_hike: 0, gdp_growth: 0.8, sensex_pe: 0.5, farm_msp: 0 },
  { companyId: 'sbi', repo_rate: 1.5, cpi: -0.8, usdinr: -0.3, crude_oil: -0.2, nccd_hike: 0, gdp_growth: 2.5, sensex_pe: 0.6, farm_msp: 0.8 },
  { companyId: 'tatamotors', repo_rate: -2, cpi: -0.5, usdinr: 0.5, crude_oil: -0.3, nccd_hike: 0, gdp_growth: 2, sensex_pe: 0.7, farm_msp: 0 },
  { companyId: 'techm', repo_rate: 0.2, cpi: -0.2, usdinr: 1.2, crude_oil: 0, nccd_hike: 0, gdp_growth: 0.4, sensex_pe: 0.5, farm_msp: 0 },
  { companyId: 'vst', repo_rate: -1, cpi: 0.3, usdinr: -0.2, crude_oil: -0.3, nccd_hike: -2.5, gdp_growth: 0.8, sensex_pe: 0.6, farm_msp: 0.5 },
  { companyId: 'nerolac', repo_rate: -0.8, cpi: -0.5, usdinr: -0.5, crude_oil: -2, nccd_hike: 0, gdp_growth: 1.8, sensex_pe: 0.7, farm_msp: 0 },
];

export interface BudgetEvent {
  id: string;
  label: string;
  date: string;
  nccdHikePct: number | null;
  gstChange: string | null;
  generalToneForTobacco: 'benign' | 'moderate' | 'harsh' | 'nil';
  sensexMoveDay: number;
  itcMoveDay: number;
  hulMoveDay: number;
  notes: string;
}

export const BUDGET_EVENTS: BudgetEvent[] = [
  { id: 'b2025', label: 'Union Budget FY25', date: '2024-02-01', nccdHikePct: 0, gstChange: null, generalToneForTobacco: 'nil', sensexMoveDay: 0.8, itcMoveDay: 3.5, hulMoveDay: 1.2, notes: 'No NCCD hike; ITC re-rated sharply.' },
  { id: 'b2024', label: 'Union Budget FY24', date: '2023-02-01', nccdHikePct: 16, gstChange: null, generalToneForTobacco: 'harsh', sensexMoveDay: 1.2, itcMoveDay: -5.2, hulMoveDay: 0.8, notes: '16% NCCD hike, largest in a decade.' },
  { id: 'b2023', label: 'Union Budget FY23', date: '2022-02-01', nccdHikePct: 0, gstChange: null, generalToneForTobacco: 'benign', sensexMoveDay: 0.3, itcMoveDay: 2.1, hulMoveDay: -0.5, notes: 'Relief budget; ITC re-rated modestly.' },
  { id: 'b2022', label: 'Union Budget FY22', date: '2021-02-01', nccdHikePct: 0, gstChange: null, generalToneForTobacco: 'nil', sensexMoveDay: 5, itcMoveDay: 3.2, hulMoveDay: 2.1, notes: 'Covid recovery budget; capex push.' },
  { id: 'b2021', label: 'Union Budget FY21', date: '2020-02-01', nccdHikePct: 0, gstChange: 'GST change on non-filter', generalToneForTobacco: 'moderate', sensexMoveDay: -2.1, itcMoveDay: -3.1, hulMoveDay: -1, notes: 'Non-filter specific GST hike.' },
  { id: 'b2020', label: 'Union Budget FY20', date: '2019-07-05', nccdHikePct: 5, gstChange: null, generalToneForTobacco: 'moderate', sensexMoveDay: -0.8, itcMoveDay: -1.8, hulMoveDay: 0.5, notes: 'Interim budget; modest NCCD.' },
];

export type OptionLeg = {
  type: 'call' | 'put';
  position: 'long' | 'short';
  strike: number;
  premium: number;
  qty: number;
};

export interface OptionsStrategy {
  id: string;
  name: string;
  category: 'budget_hedge' | 'directional' | 'neutral' | 'income';
  description: string;
  legs: OptionLeg[];
  maxProfit: string;
  maxLoss: string;
  breakeven: string;
  bestFor: string;
}

export const OPTIONS_STRATEGIES: OptionsStrategy[] = [
  { id: 'long_straddle', name: 'Budget Day Straddle', category: 'budget_hedge', description: 'Buy ATM call and ATM put. Profit if budget surprise moves stock more than premium.', legs: [{ type: 'call', position: 'long', strike: 100, premium: 2.5, qty: 1 }, { type: 'put', position: 'long', strike: 100, premium: 2.5, qty: 1 }], maxProfit: 'Unlimited on call side', maxLoss: 'Premium paid', breakeven: 'Spot +/- 5%', bestFor: 'Large budget surprise in either direction' },
  { id: 'bull_call_spread', name: 'Post-Budget Relief Spread', category: 'directional', description: 'Buy ATM call, sell 7% OTM call. Defined-risk bullish play.', legs: [{ type: 'call', position: 'long', strike: 100, premium: 3, qty: 1 }, { type: 'call', position: 'short', strike: 107, premium: 1.2, qty: 1 }], maxProfit: '7% less net premium', maxLoss: 'Net premium', breakeven: 'Spot + 1.8%', bestFor: 'Benign hike or relief rally' },
  { id: 'protective_put', name: 'Protective Put', category: 'budget_hedge', description: 'Long underlying plus long 5% OTM put insurance.', legs: [{ type: 'put', position: 'long', strike: 95, premium: 1.5, qty: 1 }], maxProfit: 'Underlying upside less premium', maxLoss: '5% downside plus premium', breakeven: 'Spot + premium', bestFor: 'Long-only holders into budget' },
  { id: 'bear_put_spread', name: 'Harsh Hike Bear Spread', category: 'directional', description: 'Buy ATM put, sell 8% OTM put. Profit from tax-shock downside.', legs: [{ type: 'put', position: 'long', strike: 100, premium: 2.8, qty: 1 }, { type: 'put', position: 'short', strike: 92, premium: 1, qty: 1 }], maxProfit: '8% less net premium', maxLoss: 'Net premium', breakeven: 'Spot - 1.8%', bestFor: 'Harsh hike expected' },
  { id: 'short_strangle', name: 'Income Strangle', category: 'income', description: 'Sell OTM call and put when event risk is priced in.', legs: [{ type: 'call', position: 'short', strike: 107, premium: 1.2, qty: 1 }, { type: 'put', position: 'short', strike: 93, premium: 1.1, qty: 1 }], maxProfit: 'Premium received', maxLoss: 'Unbounded outside range', breakeven: 'Spot +/- 9.3%', bestFor: 'Post-event IV crush' },
  { id: 'collar', name: 'Collar', category: 'budget_hedge', description: 'Buy put and sell call against shares for a low-cost hedge.', legs: [{ type: 'put', position: 'long', strike: 95, premium: 1.5, qty: 1 }, { type: 'call', position: 'short', strike: 108, premium: 1.5, qty: 1 }], maxProfit: 'Upside capped at call strike', maxLoss: 'Downside capped at put strike', breakeven: 'Net zero premium', bestFor: 'Long-term holders wanting defined range' },
];

export interface FactorConfig {
  id: string;
  label: string;
  category: 'quality' | 'value' | 'growth' | 'momentum' | 'safety';
  higherIsBetter: boolean;
  weight: number;
  description: string;
}

export const FACTOR_CONFIG: FactorConfig[] = [
  { id: 'roe', label: 'ROE', category: 'quality', higherIsBetter: true, weight: 0.25, description: 'Return on equity' },
  { id: 'roce', label: 'ROCE', category: 'quality', higherIsBetter: true, weight: 0.2, description: 'Return on capital employed' },
  { id: 'ebitda_mgn', label: 'EBITDA Margin', category: 'quality', higherIsBetter: true, weight: 0.2, description: 'Operating profitability' },
  { id: 'fcf_yield', label: 'FCF Yield', category: 'quality', higherIsBetter: true, weight: 0.2, description: 'Free cash flow as percentage of market cap' },
  { id: 'net_debt_ev', label: 'Net Debt / EV', category: 'quality', higherIsBetter: false, weight: 0.15, description: 'Balance sheet leverage proxy' },
  { id: 'pe', label: 'P/E', category: 'value', higherIsBetter: false, weight: 0.25, description: 'Price to earnings' },
  { id: 'pb', label: 'P/B', category: 'value', higherIsBetter: false, weight: 0.2, description: 'Price to book proxy' },
  { id: 'ev_ebitda', label: 'EV/EBITDA', category: 'value', higherIsBetter: false, weight: 0.25, description: 'Enterprise value to EBITDA' },
  { id: 'div_yield', label: 'Dividend Yield', category: 'value', higherIsBetter: true, weight: 0.3, description: 'Dividend yield' },
  { id: 'rev_cagr3', label: '3Y Revenue CAGR', category: 'growth', higherIsBetter: true, weight: 0.35, description: 'Three-year revenue CAGR' },
  { id: 'pat_cagr3', label: '3Y PAT CAGR', category: 'growth', higherIsBetter: true, weight: 0.4, description: 'Three-year profit CAGR' },
  { id: 'eps_est_g', label: 'FY26E EPS Growth', category: 'growth', higherIsBetter: true, weight: 0.25, description: 'Forward EPS growth proxy' },
  { id: 'pct_52w_hi', label: '% from 52W High', category: 'momentum', higherIsBetter: false, weight: 0.5, description: 'Distance from 52-week high proxy' },
  { id: 'beta', label: 'Beta', category: 'momentum', higherIsBetter: false, weight: 0.5, description: 'Market beta' },
  { id: 'div_cov', label: 'Dividend Cover', category: 'safety', higherIsBetter: true, weight: 0.4, description: 'EPS divided by DPS' },
  { id: 'interest_cov', label: 'Interest Cover', category: 'safety', higherIsBetter: true, weight: 0.35, description: 'EBIT divided by interest proxy' },
  { id: 'current_rat', label: 'Current Ratio', category: 'safety', higherIsBetter: true, weight: 0.25, description: 'Liquidity proxy' },
];

export const COMPOSITE_WEIGHTS = {
  quality: 0.35,
  value: 0.25,
  growth: 0.25,
  momentum: 0.05,
  safety: 0.1,
} as const;
