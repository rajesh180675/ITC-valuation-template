export type SensexReportingType = 'financial' | 'nonFinancial';
export type SensexValuationMetric = 'pe' | 'pb';

export interface SensexYearFinancial {
  fy: string;
  toplineCr: number;
  netProfitCr: number;
  roePct: number;
  operatingMarginPct?: number;
  rocePct?: number;
}

export interface SensexConstituent {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  reportingType: SensexReportingType;
  weightPct: number;
  marketCapCr: number;
  cmp: number;
  valuationMetric: SensexValuationMetric;
  valuationMultiple: number;
  dividendYieldPct: number;
  color: string;
  history: SensexYearFinancial[];
}

interface SensexSeed {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  reportingType: SensexReportingType;
  rawWeightPct: number;
  marketCapCr: number;
  cmp: number;
  valuationMetric: SensexValuationMetric;
  valuationMultiple: number;
  dividendYieldPct: number;
  color: string;
  latestToplineCr: number;
  latestNetProfitCr: number;
  toplineCagrPct: number;
  profitCagrPct: number;
  latestRoePct: number;
  latestOperatingMarginPct?: number;
  latestRocePct?: number;
}

const FISCAL_YEARS = ['FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024'] as const;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function scaleBack(latest: number, cagrPct: number, yearsBack: number) {
  return Math.round(latest / Math.pow(1 + cagrPct / 100, yearsBack));
}

function interpolate(start: number, end: number, index: number, totalSteps: number) {
  if (totalSteps === 0) return end;
  return round1(start + ((end - start) * index) / totalSteps);
}

function buildHistory(seed: SensexSeed): SensexYearFinancial[] {
  const periods = FISCAL_YEARS.length - 1;
  const firstRoe = Math.max(seed.reportingType === 'financial' ? 8 : 6, seed.latestRoePct - 4.5);
  const firstOperatingMargin = seed.latestOperatingMarginPct === undefined ? undefined : Math.max(6, seed.latestOperatingMarginPct - 3.5);
  const firstRoce = seed.latestRocePct === undefined ? undefined : Math.max(8, seed.latestRocePct - 4);

  return FISCAL_YEARS.map((fy, index) => ({
    fy,
    toplineCr: scaleBack(seed.latestToplineCr, seed.toplineCagrPct, periods - index),
    netProfitCr: scaleBack(seed.latestNetProfitCr, seed.profitCagrPct, periods - index),
    roePct: interpolate(firstRoe, seed.latestRoePct, index, periods),
    operatingMarginPct: firstOperatingMargin === undefined ? undefined : interpolate(firstOperatingMargin, seed.latestOperatingMarginPct ?? firstOperatingMargin, index, periods),
    rocePct: firstRoce === undefined ? undefined : interpolate(firstRoce, seed.latestRocePct ?? firstRoce, index, periods),
  }));
}

const rawSensexConstituents: SensexSeed[] = [
  { id: 'reliance-industries', name: 'Reliance Industries', ticker: 'RELIANCE', sector: 'Energy', reportingType: 'nonFinancial', rawWeightPct: 11.8, marketCapCr: 2000000, cmp: 2950, valuationMetric: 'pe', valuationMultiple: 24.5, dividendYieldPct: 0.4, color: '#60a5fa', latestToplineCr: 930529, latestNetProfitCr: 69121, toplineCagrPct: 12.8, profitCagrPct: 19.5, latestRoePct: 9.2, latestOperatingMarginPct: 17.5, latestRocePct: 8.9 },
  { id: 'hdfc-bank', name: 'HDFC Bank', ticker: 'HDFCBANK', sector: 'Financials', reportingType: 'financial', rawWeightPct: 10.2, marketCapCr: 1450000, cmp: 1905, valuationMetric: 'pb', valuationMultiple: 2.9, dividendYieldPct: 1.1, color: '#2563eb', latestToplineCr: 370154, latestNetProfitCr: 62268, toplineCagrPct: 13.6, profitCagrPct: 18.1, latestRoePct: 14.8 },
  { id: 'icici-bank', name: 'ICICI Bank', ticker: 'ICICIBANK', sector: 'Financials', reportingType: 'financial', rawWeightPct: 8.7, marketCapCr: 1050000, cmp: 1395, valuationMetric: 'pb', valuationMultiple: 3.3, dividendYieldPct: 0.7, color: '#1d4ed8', latestToplineCr: 254987, latestNetProfitCr: 45132, toplineCagrPct: 18.4, profitCagrPct: 31.5, latestRoePct: 18.0 },
  { id: 'tcs', name: 'Tata Consultancy Services', ticker: 'TCS', sector: 'Information Technology', reportingType: 'nonFinancial', rawWeightPct: 7.3, marketCapCr: 1400000, cmp: 3860, valuationMetric: 'pe', valuationMultiple: 28.8, dividendYieldPct: 1.6, color: '#8b5cf6', latestToplineCr: 240893, latestNetProfitCr: 46099, toplineCagrPct: 11.1, profitCagrPct: 11.7, latestRoePct: 51.0, latestOperatingMarginPct: 26.0, latestRocePct: 64.0 },
  { id: 'infosys', name: 'Infosys', ticker: 'INFY', sector: 'Information Technology', reportingType: 'nonFinancial', rawWeightPct: 7.5, marketCapCr: 780000, cmp: 1880, valuationMetric: 'pe', valuationMultiple: 26.5, dividendYieldPct: 2.1, color: '#a855f7', latestToplineCr: 153670, latestNetProfitCr: 26312, toplineCagrPct: 11.6, profitCagrPct: 10.9, latestRoePct: 31.5, latestOperatingMarginPct: 21.2, latestRocePct: 43.0 },
  { id: 'bharti-airtel', name: 'Bharti Airtel', ticker: 'BHARTIARTL', sector: 'Telecom', reportingType: 'nonFinancial', rawWeightPct: 5.5, marketCapCr: 1050000, cmp: 1785, valuationMetric: 'pe', valuationMultiple: 31.8, dividendYieldPct: 0.5, color: '#f59e0b', latestToplineCr: 149982, latestNetProfitCr: 32011, toplineCagrPct: 16.2, profitCagrPct: 46.0, latestRoePct: 23.0, latestOperatingMarginPct: 34.0, latestRocePct: 17.0 },
  { id: 'larsen-toubro', name: 'Larsen & Toubro', ticker: 'LT', sector: 'Industrials', reportingType: 'nonFinancial', rawWeightPct: 4.6, marketCapCr: 520000, cmp: 3840, valuationMetric: 'pe', valuationMultiple: 31.2, dividendYieldPct: 0.9, color: '#f97316', latestToplineCr: 221113, latestNetProfitCr: 17402, toplineCagrPct: 13.9, profitCagrPct: 18.8, latestRoePct: 15.0, latestOperatingMarginPct: 11.5, latestRocePct: 17.0 },
  { id: 'itc', name: 'ITC', ticker: 'ITC', sector: 'Consumer Staples', reportingType: 'nonFinancial', rawWeightPct: 4.0, marketCapCr: 550000, cmp: 442, valuationMetric: 'pe', valuationMultiple: 27.0, dividendYieldPct: 3.2, color: '#22c55e', latestToplineCr: 74200, latestNetProfitCr: 20300, toplineCagrPct: 8.7, profitCagrPct: 14.3, latestRoePct: 28.0, latestOperatingMarginPct: 33.0, latestRocePct: 35.0 },
  { id: 'state-bank-of-india', name: 'State Bank of India', ticker: 'SBIN', sector: 'Financials', reportingType: 'financial', rawWeightPct: 3.5, marketCapCr: 720000, cmp: 905, valuationMetric: 'pb', valuationMultiple: 1.8, dividendYieldPct: 1.6, color: '#0f766e', latestToplineCr: 490332, latestNetProfitCr: 67208, toplineCagrPct: 10.7, profitCagrPct: 43.2, latestRoePct: 17.5 },
  { id: 'axis-bank', name: 'Axis Bank', ticker: 'AXISBANK', sector: 'Financials', reportingType: 'financial', rawWeightPct: 3.2, marketCapCr: 380000, cmp: 1225, valuationMetric: 'pb', valuationMultiple: 2.1, dividendYieldPct: 0.2, color: '#0891b2', latestToplineCr: 139820, latestNetProfitCr: 24912, toplineCagrPct: 12.1, profitCagrPct: 34.4, latestRoePct: 17.0 },
  { id: 'kotak-mahindra-bank', name: 'Kotak Mahindra Bank', ticker: 'KOTAKBANK', sector: 'Financials', reportingType: 'financial', rawWeightPct: 3.0, marketCapCr: 360000, cmp: 1810, valuationMetric: 'pb', valuationMultiple: 2.7, dividendYieldPct: 0.1, color: '#0284c7', latestToplineCr: 98110, latestNetProfitCr: 18505, toplineCagrPct: 10.1, profitCagrPct: 15.2, latestRoePct: 14.0 },
  { id: 'hindustan-unilever', name: 'Hindustan Unilever', ticker: 'HINDUNILVR', sector: 'Consumer Staples', reportingType: 'nonFinancial', rawWeightPct: 2.9, marketCapCr: 560000, cmp: 2390, valuationMetric: 'pe', valuationMultiple: 54.0, dividendYieldPct: 1.8, color: '#16a34a', latestToplineCr: 61942, latestNetProfitCr: 10282, toplineCagrPct: 8.0, profitCagrPct: 8.4, latestRoePct: 20.0, latestOperatingMarginPct: 24.2, latestRocePct: 27.0 },
  { id: 'sun-pharma', name: 'Sun Pharmaceutical', ticker: 'SUNPHARMA', sector: 'Healthcare', reportingType: 'nonFinancial', rawWeightPct: 2.6, marketCapCr: 450000, cmp: 1875, valuationMetric: 'pe', valuationMultiple: 34.5, dividendYieldPct: 0.8, color: '#ef4444', latestToplineCr: 51100, latestNetProfitCr: 9806, toplineCagrPct: 9.8, profitCagrPct: 17.1, latestRoePct: 16.0, latestOperatingMarginPct: 28.0, latestRocePct: 20.0 },
  { id: 'mahindra-mahindra', name: 'Mahindra & Mahindra', ticker: 'M&M', sector: 'Automobiles', reportingType: 'nonFinancial', rawWeightPct: 2.5, marketCapCr: 420000, cmp: 2925, valuationMetric: 'pe', valuationMultiple: 28.2, dividendYieldPct: 0.7, color: '#dc2626', latestToplineCr: 150879, latestNetProfitCr: 12487, toplineCagrPct: 17.6, profitCagrPct: 39.7, latestRoePct: 18.0, latestOperatingMarginPct: 14.5, latestRocePct: 19.0 },
  { id: 'maruti-suzuki', name: 'Maruti Suzuki India', ticker: 'MARUTI', sector: 'Automobiles', reportingType: 'nonFinancial', rawWeightPct: 2.4, marketCapCr: 380000, cmp: 12540, valuationMetric: 'pe', valuationMultiple: 27.4, dividendYieldPct: 1.0, color: '#b91c1c', latestToplineCr: 145372, latestNetProfitCr: 13689, toplineCagrPct: 12.9, profitCagrPct: 22.4, latestRoePct: 18.0, latestOperatingMarginPct: 10.2, latestRocePct: 20.0 },
  { id: 'tata-motors', name: 'Tata Motors', ticker: 'TATAMOTORS', sector: 'Automobiles', reportingType: 'nonFinancial', rawWeightPct: 2.3, marketCapCr: 380000, cmp: 1030, valuationMetric: 'pe', valuationMultiple: 14.2, dividendYieldPct: 0.6, color: '#991b1b', latestToplineCr: 437928, latestNetProfitCr: 31507, toplineCagrPct: 15.5, profitCagrPct: 52.0, latestRoePct: 28.0, latestOperatingMarginPct: 13.0, latestRocePct: 22.0 },
  { id: 'ntpc', name: 'NTPC', ticker: 'NTPC', sector: 'Utilities', reportingType: 'nonFinancial', rawWeightPct: 2.2, marketCapCr: 350000, cmp: 361, valuationMetric: 'pe', valuationMultiple: 17.4, dividendYieldPct: 2.2, color: '#06b6d4', latestToplineCr: 177978, latestNetProfitCr: 21332, toplineCagrPct: 11.1, profitCagrPct: 14.8, latestRoePct: 13.0, latestOperatingMarginPct: 29.0, latestRocePct: 12.0 },
  { id: 'ultratech-cement', name: 'UltraTech Cement', ticker: 'ULTRACEMCO', sector: 'Materials', reportingType: 'nonFinancial', rawWeightPct: 2.1, marketCapCr: 360000, cmp: 11890, valuationMetric: 'pe', valuationMultiple: 44.1, dividendYieldPct: 0.6, color: '#6b7280', latestToplineCr: 70908, latestNetProfitCr: 7410, toplineCagrPct: 12.4, profitCagrPct: 16.8, latestRoePct: 11.0, latestOperatingMarginPct: 18.5, latestRocePct: 14.0 },
  { id: 'tata-steel', name: 'Tata Steel', ticker: 'TATASTEEL', sector: 'Metals', reportingType: 'nonFinancial', rawWeightPct: 1.9, marketCapCr: 220000, cmp: 175, valuationMetric: 'pe', valuationMultiple: 24.8, dividendYieldPct: 1.9, color: '#78716c', latestToplineCr: 229171, latestNetProfitCr: 8712, toplineCagrPct: 8.1, profitCagrPct: 5.2, latestRoePct: 8.0, latestOperatingMarginPct: 16.0, latestRocePct: 10.0 },
  { id: 'jsw-steel', name: 'JSW Steel', ticker: 'JSWSTEEL', sector: 'Metals', reportingType: 'nonFinancial', rawWeightPct: 1.8, marketCapCr: 240000, cmp: 985, valuationMetric: 'pe', valuationMultiple: 21.0, dividendYieldPct: 0.9, color: '#57534e', latestToplineCr: 175006, latestNetProfitCr: 8331, toplineCagrPct: 11.5, profitCagrPct: 8.7, latestRoePct: 8.5, latestOperatingMarginPct: 16.8, latestRocePct: 12.0 },
  { id: 'nestle-india', name: 'Nestle India', ticker: 'NESTLEIND', sector: 'Consumer Staples', reportingType: 'nonFinancial', rawWeightPct: 1.8, marketCapCr: 250000, cmp: 2590, valuationMetric: 'pe', valuationMultiple: 68.0, dividendYieldPct: 1.2, color: '#65a30d', latestToplineCr: 19563, latestNetProfitCr: 2903, toplineCagrPct: 10.5, profitCagrPct: 13.8, latestRoePct: 65.0, latestOperatingMarginPct: 24.0, latestRocePct: 95.0 },
  { id: 'asian-paints', name: 'Asian Paints', ticker: 'ASIANPAINT', sector: 'Consumer Discretionary', reportingType: 'nonFinancial', rawWeightPct: 1.7, marketCapCr: 230000, cmp: 2410, valuationMetric: 'pe', valuationMultiple: 52.0, dividendYieldPct: 1.1, color: '#84cc16', latestToplineCr: 35649, latestNetProfitCr: 5291, toplineCagrPct: 11.0, profitCagrPct: 11.6, latestRoePct: 28.0, latestOperatingMarginPct: 19.0, latestRocePct: 33.0 },
  { id: 'titan-company', name: 'Titan Company', ticker: 'TITAN', sector: 'Consumer Discretionary', reportingType: 'nonFinancial', rawWeightPct: 1.7, marketCapCr: 300000, cmp: 3395, valuationMetric: 'pe', valuationMultiple: 78.0, dividendYieldPct: 0.3, color: '#a3e635', latestToplineCr: 51472, latestNetProfitCr: 3496, toplineCagrPct: 17.4, profitCagrPct: 25.1, latestRoePct: 28.0, latestOperatingMarginPct: 11.5, latestRocePct: 25.0 },
  { id: 'hcl-technologies', name: 'HCL Technologies', ticker: 'HCLTECH', sector: 'Information Technology', reportingType: 'nonFinancial', rawWeightPct: 1.7, marketCapCr: 400000, cmp: 1475, valuationMetric: 'pe', valuationMultiple: 23.8, dividendYieldPct: 3.1, color: '#7c3aed', latestToplineCr: 109913, latestNetProfitCr: 15628, toplineCagrPct: 12.8, profitCagrPct: 15.0, latestRoePct: 24.0, latestOperatingMarginPct: 18.7, latestRocePct: 29.0 },
  { id: 'power-grid', name: 'Power Grid Corporation', ticker: 'POWERGRID', sector: 'Utilities', reportingType: 'nonFinancial', rawWeightPct: 1.6, marketCapCr: 300000, cmp: 324, valuationMetric: 'pe', valuationMultiple: 18.5, dividendYieldPct: 3.4, color: '#0284c7', latestToplineCr: 46212, latestNetProfitCr: 15573, toplineCagrPct: 8.2, profitCagrPct: 10.1, latestRoePct: 18.0, latestOperatingMarginPct: 82.0, latestRocePct: 13.0 },
  { id: 'bajaj-finance', name: 'Bajaj Finance', ticker: 'BAJFINANCE', sector: 'Financials', reportingType: 'financial', rawWeightPct: 1.6, marketCapCr: 420000, cmp: 6890, valuationMetric: 'pb', valuationMultiple: 4.4, dividendYieldPct: 0.5, color: '#2563eb', latestToplineCr: 63987, latestNetProfitCr: 14521, toplineCagrPct: 23.7, profitCagrPct: 26.4, latestRoePct: 22.0 },
  { id: 'bajaj-finserv', name: 'Bajaj Finserv', ticker: 'BAJAJFINSV', sector: 'Financials', reportingType: 'financial', rawWeightPct: 1.4, marketCapCr: 280000, cmp: 1760, valuationMetric: 'pb', valuationMultiple: 3.1, dividendYieldPct: 0.1, color: '#1e40af', latestToplineCr: 119834, latestNetProfitCr: 8041, toplineCagrPct: 18.2, profitCagrPct: 19.0, latestRoePct: 14.0 },
  { id: 'tech-mahindra', name: 'Tech Mahindra', ticker: 'TECHM', sector: 'Information Technology', reportingType: 'nonFinancial', rawWeightPct: 1.2, marketCapCr: 150000, cmp: 1525, valuationMetric: 'pe', valuationMultiple: 27.1, dividendYieldPct: 2.5, color: '#6d28d9', latestToplineCr: 52083, latestNetProfitCr: 5634, toplineCagrPct: 9.4, profitCagrPct: 4.1, latestRoePct: 18.0, latestOperatingMarginPct: 11.7, latestRocePct: 22.0 },
  { id: 'adani-ports', name: 'Adani Ports & SEZ', ticker: 'ADANIPORTS', sector: 'Industrials', reportingType: 'nonFinancial', rawWeightPct: 1.2, marketCapCr: 350000, cmp: 1620, valuationMetric: 'pe', valuationMultiple: 28.4, dividendYieldPct: 0.5, color: '#fb923c', latestToplineCr: 28698, latestNetProfitCr: 8221, toplineCagrPct: 17.9, profitCagrPct: 22.5, latestRoePct: 17.0, latestOperatingMarginPct: 39.0, latestRocePct: 13.0 },
  { id: 'indusind-bank', name: 'IndusInd Bank', ticker: 'INDUSINDBK', sector: 'Financials', reportingType: 'financial', rawWeightPct: 1.1, marketCapCr: 95000, cmp: 1210, valuationMetric: 'pb', valuationMultiple: 1.3, dividendYieldPct: 1.0, color: '#1e3a8a', latestToplineCr: 53220, latestNetProfitCr: 8890, toplineCagrPct: 9.8, profitCagrPct: 14.5, latestRoePct: 15.0 },
];

const totalRawWeight = rawSensexConstituents.reduce((sum, company) => sum + company.rawWeightPct, 0);

export const sensexConstituents: SensexConstituent[] = rawSensexConstituents.map((company) => ({
  id: company.id,
  name: company.name,
  ticker: company.ticker,
  sector: company.sector,
  reportingType: company.reportingType,
  weightPct: round1((company.rawWeightPct / totalRawWeight) * 100),
  marketCapCr: company.marketCapCr,
  cmp: company.cmp,
  valuationMetric: company.valuationMetric,
  valuationMultiple: company.valuationMultiple,
  dividendYieldPct: company.dividendYieldPct,
  color: company.color,
  history: buildHistory(company),
}));
