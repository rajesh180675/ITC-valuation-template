import type { SensexConstituent, SensexReportingType, SensexValuationMetric, SensexYearFinancial } from '@/data/sensexData';

interface Nifty250Seed {
  baseId: string;
  baseName: string;
  baseTicker: string;
  sector: string;
  reportingType: SensexReportingType;
  valuationMetric: SensexValuationMetric;
  beta: number;
  latestToplineCr: number;
  latestNetProfitCr: number;
  toplineCagrPct: number;
  profitCagrPct: number;
  latestRoePct: number;
  latestOperatingMarginPct?: number;
  latestRocePct?: number;
  dividendYieldPct: number;
  valuationMultiple: number;
  netDebtToEbitda?: number;
}

const NIFTY250_FY = [
  'FY2015', 'FY2016', 'FY2017', 'FY2018', 'FY2019',
  'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024',
] as const;

export const NIFTY250_FISCAL_YEARS = NIFTY250_FY;

const SECTOR_COLORS = ['#60a5fa', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#fb7185', '#a78bfa', '#38bdf8'];

const nifty250SectorSeeds: Nifty250Seed[] = [
  { baseId: 'nifty-fin', baseName: 'Nifty Finance Co', baseTicker: 'NFIN', sector: 'Financials', reportingType: 'financial', valuationMetric: 'pb', beta: 1.15, latestToplineCr: 78000, latestNetProfitCr: 12300, toplineCagrPct: 14.2, profitCagrPct: 16.8, latestRoePct: 15.8, dividendYieldPct: 1.0, valuationMultiple: 2.6 },
  { baseId: 'nifty-bank', baseName: 'Nifty Banking Corp', baseTicker: 'NBNK', sector: 'Financials', reportingType: 'financial', valuationMetric: 'pb', beta: 1.2, latestToplineCr: 104000, latestNetProfitCr: 16100, toplineCagrPct: 13.9, profitCagrPct: 18.5, latestRoePct: 16.4, dividendYieldPct: 0.8, valuationMultiple: 2.2 },
  { baseId: 'nifty-it', baseName: 'Nifty IT Services', baseTicker: 'NITS', sector: 'Information Technology', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 0.86, latestToplineCr: 52000, latestNetProfitCr: 10200, toplineCagrPct: 11.8, profitCagrPct: 12.6, latestRoePct: 27.8, latestOperatingMarginPct: 21.6, latestRocePct: 32.4, dividendYieldPct: 1.6, valuationMultiple: 28.9, netDebtToEbitda: -0.9 },
  { baseId: 'nifty-software', baseName: 'Nifty Software Ltd', baseTicker: 'NSFT', sector: 'Information Technology', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 0.9, latestToplineCr: 42000, latestNetProfitCr: 7900, toplineCagrPct: 10.7, profitCagrPct: 11.2, latestRoePct: 24.5, latestOperatingMarginPct: 19.2, latestRocePct: 29.7, dividendYieldPct: 1.8, valuationMultiple: 25.4, netDebtToEbitda: -0.7 },
  { baseId: 'nifty-oilgas', baseName: 'Nifty Oil & Gas', baseTicker: 'NOIL', sector: 'Energy', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.08, latestToplineCr: 124000, latestNetProfitCr: 14200, toplineCagrPct: 9.4, profitCagrPct: 13.9, latestRoePct: 13.2, latestOperatingMarginPct: 14.8, latestRocePct: 15.7, dividendYieldPct: 2.1, valuationMultiple: 15.9, netDebtToEbitda: 1.9 },
  { baseId: 'nifty-power', baseName: 'Nifty Power Utility', baseTicker: 'NPWR', sector: 'Utilities', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 0.68, latestToplineCr: 38000, latestNetProfitCr: 6700, toplineCagrPct: 8.6, profitCagrPct: 12.4, latestRoePct: 12.2, latestOperatingMarginPct: 25.3, latestRocePct: 11.2, dividendYieldPct: 2.8, valuationMultiple: 18.5, netDebtToEbitda: 3.1 },
  { baseId: 'nifty-fmcg', baseName: 'Nifty FMCG India', baseTicker: 'NFMG', sector: 'Consumer Staples', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 0.63, latestToplineCr: 47000, latestNetProfitCr: 7800, toplineCagrPct: 9.8, profitCagrPct: 11.4, latestRoePct: 24.0, latestOperatingMarginPct: 20.5, latestRocePct: 26.7, dividendYieldPct: 1.7, valuationMultiple: 43.2, netDebtToEbitda: -0.4 },
  { baseId: 'nifty-retail', baseName: 'Nifty Retail Ventures', baseTicker: 'NRTL', sector: 'Consumer Discretionary', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.1, latestToplineCr: 33000, latestNetProfitCr: 3200, toplineCagrPct: 15.5, profitCagrPct: 19.6, latestRoePct: 17.6, latestOperatingMarginPct: 11.4, latestRocePct: 18.5, dividendYieldPct: 0.5, valuationMultiple: 47.1, netDebtToEbitda: 1.1 },
  { baseId: 'nifty-auto', baseName: 'Nifty Auto Makers', baseTicker: 'NAUT', sector: 'Automobiles', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.24, latestToplineCr: 56000, latestNetProfitCr: 5200, toplineCagrPct: 12.7, profitCagrPct: 17.9, latestRoePct: 16.2, latestOperatingMarginPct: 13.1, latestRocePct: 17.4, dividendYieldPct: 0.9, valuationMultiple: 27.2, netDebtToEbitda: 0.8 },
  { baseId: 'nifty-pharma', baseName: 'Nifty Pharma Labs', baseTicker: 'NPHR', sector: 'Healthcare', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 0.76, latestToplineCr: 31000, latestNetProfitCr: 5600, toplineCagrPct: 10.2, profitCagrPct: 13.1, latestRoePct: 18.3, latestOperatingMarginPct: 22.9, latestRocePct: 20.1, dividendYieldPct: 1.1, valuationMultiple: 31.5, netDebtToEbitda: -0.2 },
  { baseId: 'nifty-metal', baseName: 'Nifty Metal Works', baseTicker: 'NMTL', sector: 'Metals', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.42, latestToplineCr: 49000, latestNetProfitCr: 4300, toplineCagrPct: 8.9, profitCagrPct: 10.4, latestRoePct: 11.7, latestOperatingMarginPct: 12.4, latestRocePct: 13.3, dividendYieldPct: 1.4, valuationMultiple: 16.8, netDebtToEbitda: 2.5 },
  { baseId: 'nifty-cement', baseName: 'Nifty Cement Build', baseTicker: 'NCEM', sector: 'Materials', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.06, latestToplineCr: 37000, latestNetProfitCr: 3400, toplineCagrPct: 9.6, profitCagrPct: 12.3, latestRoePct: 12.1, latestOperatingMarginPct: 16.7, latestRocePct: 14.2, dividendYieldPct: 1.0, valuationMultiple: 29.2, netDebtToEbitda: 1.6 },
  { baseId: 'nifty-capital', baseName: 'Nifty Capital Goods', baseTicker: 'NCAP', sector: 'Industrials', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.2, latestToplineCr: 45000, latestNetProfitCr: 4600, toplineCagrPct: 13.1, profitCagrPct: 16.2, latestRoePct: 15.0, latestOperatingMarginPct: 14.5, latestRocePct: 16.0, dividendYieldPct: 0.8, valuationMultiple: 30.0, netDebtToEbitda: 0.9 },
  { baseId: 'nifty-logistics', baseName: 'Nifty Logistics Hub', baseTicker: 'NLOG', sector: 'Industrials', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.12, latestToplineCr: 24000, latestNetProfitCr: 2600, toplineCagrPct: 14.4, profitCagrPct: 18.9, latestRoePct: 16.5, latestOperatingMarginPct: 15.3, latestRocePct: 16.8, dividendYieldPct: 0.7, valuationMultiple: 33.1, netDebtToEbitda: 1.3 },
  { baseId: 'nifty-telecom', baseName: 'Nifty Telecom Grid', baseTicker: 'NTEL', sector: 'Telecom', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 0.94, latestToplineCr: 61000, latestNetProfitCr: 6400, toplineCagrPct: 13.8, profitCagrPct: 22.6, latestRoePct: 19.3, latestOperatingMarginPct: 28.4, latestRocePct: 15.4, dividendYieldPct: 0.6, valuationMultiple: 34.0, netDebtToEbitda: 2.1 },
  { baseId: 'nifty-realty', baseName: 'Nifty Realty Dev', baseTicker: 'NREA', sector: 'Real Estate', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.33, latestToplineCr: 22000, latestNetProfitCr: 2500, toplineCagrPct: 17.4, profitCagrPct: 24.2, latestRoePct: 15.8, latestOperatingMarginPct: 18.8, latestRocePct: 14.8, dividendYieldPct: 0.4, valuationMultiple: 36.5, netDebtToEbitda: 1.9 },
  { baseId: 'nifty-chem', baseName: 'Nifty Specialty Chem', baseTicker: 'NCHEM', sector: 'Chemicals', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.02, latestToplineCr: 21000, latestNetProfitCr: 2900, toplineCagrPct: 14.1, profitCagrPct: 17.3, latestRoePct: 18.1, latestOperatingMarginPct: 17.9, latestRocePct: 19.3, dividendYieldPct: 0.9, valuationMultiple: 32.6, netDebtToEbitda: 0.4 },
  { baseId: 'nifty-textile', baseName: 'Nifty Textile Co', baseTicker: 'NTEX', sector: 'Textiles', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.05, latestToplineCr: 13000, latestNetProfitCr: 1200, toplineCagrPct: 9.1, profitCagrPct: 11.9, latestRoePct: 12.9, latestOperatingMarginPct: 10.9, latestRocePct: 12.0, dividendYieldPct: 1.5, valuationMultiple: 21.0, netDebtToEbitda: 1.5 },
  { baseId: 'nifty-infra', baseName: 'Nifty Infra Projects', baseTicker: 'NINF', sector: 'Infrastructure', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.28, latestToplineCr: 41000, latestNetProfitCr: 3900, toplineCagrPct: 12.0, profitCagrPct: 15.5, latestRoePct: 14.0, latestOperatingMarginPct: 12.6, latestRocePct: 14.4, dividendYieldPct: 0.8, valuationMultiple: 24.8, netDebtToEbitda: 1.7 },
  { baseId: 'nifty-media', baseName: 'Nifty Media Digital', baseTicker: 'NMED', sector: 'Media', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.18, latestToplineCr: 9000, latestNetProfitCr: 950, toplineCagrPct: 11.7, profitCagrPct: 13.4, latestRoePct: 14.5, latestOperatingMarginPct: 14.1, latestRocePct: 15.0, dividendYieldPct: 0.6, valuationMultiple: 26.7, netDebtToEbitda: 0.7 },
  { baseId: 'nifty-aero', baseName: 'Nifty Aerospace Def', baseTicker: 'NAER', sector: 'Aerospace & Defense', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.09, latestToplineCr: 15000, latestNetProfitCr: 1850, toplineCagrPct: 16.0, profitCagrPct: 20.8, latestRoePct: 19.6, latestOperatingMarginPct: 16.5, latestRocePct: 18.2, dividendYieldPct: 0.7, valuationMultiple: 41.8, netDebtToEbitda: 0.1 },
  { baseId: 'nifty-insure', baseName: 'Nifty Insurance Plc', baseTicker: 'NINS', sector: 'Financials', reportingType: 'financial', valuationMetric: 'pb', beta: 0.88, latestToplineCr: 44000, latestNetProfitCr: 5200, toplineCagrPct: 12.3, profitCagrPct: 15.0, latestRoePct: 14.2, dividendYieldPct: 0.5, valuationMultiple: 3.1 },
  { baseId: 'nifty-nbfc', baseName: 'Nifty NBFC Growth', baseTicker: 'NNBF', sector: 'Financials', reportingType: 'financial', valuationMetric: 'pb', beta: 1.3, latestToplineCr: 36000, latestNetProfitCr: 5100, toplineCagrPct: 19.3, profitCagrPct: 24.0, latestRoePct: 19.1, dividendYieldPct: 0.4, valuationMultiple: 4.2 },
  { baseId: 'nifty-agri', baseName: 'Nifty Agri Inputs', baseTicker: 'NAGR', sector: 'Agriculture', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 0.82, latestToplineCr: 17000, latestNetProfitCr: 1800, toplineCagrPct: 10.6, profitCagrPct: 12.9, latestRoePct: 13.6, latestOperatingMarginPct: 12.8, latestRocePct: 14.1, dividendYieldPct: 1.2, valuationMultiple: 23.4, netDebtToEbitda: 0.5 },
  { baseId: 'nifty-cons-elec', baseName: 'Nifty Consumer Elect', baseTicker: 'NELEC', sector: 'Consumer Durables', reportingType: 'nonFinancial', valuationMetric: 'pe', beta: 1.07, latestToplineCr: 19000, latestNetProfitCr: 2300, toplineCagrPct: 13.6, profitCagrPct: 17.8, latestRoePct: 17.2, latestOperatingMarginPct: 13.5, latestRocePct: 17.0, dividendYieldPct: 0.8, valuationMultiple: 39.3, netDebtToEbitda: 0.3 },
];

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

function buildHistory(seed: Nifty250Seed, multiplier: number): SensexYearFinancial[] {
  const periods = NIFTY250_FY.length - 1;
  const scaledTopline = seed.latestToplineCr * multiplier;
  const scaledProfit = seed.latestNetProfitCr * multiplier;
  const firstRoe = Math.max(seed.reportingType === 'financial' ? 8 : 7, seed.latestRoePct - 6);
  const firstOperatingMargin = seed.latestOperatingMarginPct === undefined ? undefined : Math.max(6, seed.latestOperatingMarginPct - 4);
  const firstRoce = seed.latestRocePct === undefined ? undefined : Math.max(8, seed.latestRocePct - 5);

  return NIFTY250_FY.map((fy, index) => ({
    fy,
    toplineCr: scaleBack(scaledTopline, seed.toplineCagrPct, periods - index),
    netProfitCr: scaleBack(scaledProfit, seed.profitCagrPct, periods - index),
    roePct: interpolate(firstRoe, seed.latestRoePct, index, periods),
    operatingMarginPct: firstOperatingMargin === undefined ? undefined : interpolate(firstOperatingMargin, seed.latestOperatingMarginPct ?? firstOperatingMargin, index, periods),
    rocePct: firstRoce === undefined ? undefined : interpolate(firstRoce, seed.latestRocePct ?? firstRoce, index, periods),
  }));
}

function generateNifty250Universe(): SensexConstituent[] {
  const companies: SensexConstituent[] = [];

  nifty250SectorSeeds.forEach((seed, seedIndex) => {
    for (let i = 1; i <= 10; i++) {
      const id = `${seed.baseId}-${i}`;
      const multiplier = 0.55 + i * 0.08;
      const marketCapCr = Math.round(seed.latestNetProfitCr * seed.valuationMultiple * multiplier * 10);
      const cmp = Math.round((seed.valuationMetric === 'pb' ? 250 : 180) * (0.85 + i * 0.06));
      const valuationMultiple = round1(seed.valuationMultiple * (0.88 + i * 0.025));
      const dividendYieldPct = round1(Math.max(0.2, seed.dividendYieldPct * (1.08 - i * 0.015)));
      const beta = round1(Math.max(0.45, seed.beta * (0.9 + i * 0.02)));

      companies.push({
        id,
        name: `${seed.baseName} ${i}`,
        ticker: `${seed.baseTicker}${i}`,
        sector: seed.sector,
        reportingType: seed.reportingType,
        weightPct: 0,
        marketCapCr,
        cmp,
        valuationMetric: seed.valuationMetric,
        valuationMultiple,
        dividendYieldPct,
        color: SECTOR_COLORS[seedIndex % SECTOR_COLORS.length],
        beta,
        netDebtToEbitda: seed.reportingType === 'financial' ? undefined : round1((seed.netDebtToEbitda ?? 0.8) + (i - 5) * 0.09),
        history: buildHistory(seed, multiplier),
      });
    }
  });

  const totalMarketCap = companies.reduce((sum, company) => sum + company.marketCapCr, 0);

  return companies
    .map((company) => ({
      ...company,
      weightPct: round1((company.marketCapCr / totalMarketCap) * 100),
    }))
    .sort((a, b) => b.marketCapCr - a.marketCapCr);
}

export const nifty250Constituents: SensexConstituent[] = generateNifty250Universe();
