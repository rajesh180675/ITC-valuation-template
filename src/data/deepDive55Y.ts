/**
 * Indian Stock Markets — 55-Year Deep Dive (1970–2025)
 * Source: monthly data analysis, ROE decomposition, valuation cycles & regime shifts.
 * All figures embedded as typed records for the in-app analytics workbench.
 */

/* ───────── Headline indices ───────── */
export interface IndexSnapshot {
  index: string;
  baseYear: number;
  baseValue: number;
  current: number;
  cagrPct: number;
}

export const indexSnapshots: IndexSnapshot[] = [
  { index: 'BSE Sensex',           baseYear: 1979, baseValue: 100,   current: 83450, cagrPct: 16.2 },
  { index: 'S&P BSE 500',          baseYear: 1999, baseValue: 1000,  current: 42800, cagrPct: 14.8 },
  { index: 'Nifty 50',             baseYear: 1996, baseValue: 1000,  current: 24950, cagrPct: 14.5 },
  { index: 'Nifty Midcap 150',     baseYear: 2005, baseValue: 1000,  current: 18200, cagrPct: 15.1 },
  { index: 'Nifty Smallcap 250',   baseYear: 2005, baseValue: 1000,  current: 21400, cagrPct: 16.3 },
];

/* ───────── 10 structural regimes (Bai-Perron) ───────── */
export interface Regime {
  id: string;
  period: string;
  startYear: number;
  endYear: number;
  months: number;
  avgMonthlyPct: number;
  volatilityPct: number;
  character: string;
  color: string;
}

export const regimes: Regime[] = [
  { id: 'R1',  period: 'Jan 1970 – Mar 1983', startYear: 1970, endYear: 1983, months: 159, avgMonthlyPct:  0.12, volatilityPct:  8.2, character: 'Stagnation, License Raj',                color: '#64748b' },
  { id: 'R2',  period: 'Apr 1983 – Sep 1987', startYear: 1983, endYear: 1987, months:  54, avgMonthlyPct:  1.85, volatilityPct:  5.1, character: 'Early liberalization hope',              color: '#10b981' },
  { id: 'R3',  period: 'Oct 1987 – Jul 1991', startYear: 1987, endYear: 1991, months:  46, avgMonthlyPct: -0.45, volatilityPct:  9.8, character: 'Crash, political chaos',                 color: '#ef4444' },
  { id: 'R4',  period: 'Aug 1991 – Apr 1992', startYear: 1991, endYear: 1992, months:   9, avgMonthlyPct:  8.20, volatilityPct: 14.5, character: 'Post-liberalization euphoria',          color: '#f59e0b' },
  { id: 'R5',  period: 'May 1992 – Dec 1995', startYear: 1992, endYear: 1995, months:  44, avgMonthlyPct: -0.32, volatilityPct: 11.2, character: 'Harshad Mehta crash, FII entry',        color: '#ef4444' },
  { id: 'R6',  period: 'Jan 1996 – Mar 2003', startYear: 1996, endYear: 2003, months:  87, avgMonthlyPct:  0.18, volatilityPct: 10.5, character: 'IT boom-bust, Kargil, 9/11',            color: '#94a3b8' },
  { id: 'R7',  period: 'Apr 2003 – Oct 2008', startYear: 2003, endYear: 2008, months:  67, avgMonthlyPct:  3.45, volatilityPct:  6.8, character: 'Golden bull, global liquidity',          color: '#10b981' },
  { id: 'R8',  period: 'Nov 2008 – Feb 2009', startYear: 2008, endYear: 2009, months:   4, avgMonthlyPct: -8.20, volatilityPct: 18.5, character: 'Global Financial Crisis',                color: '#dc2626' },
  { id: 'R9',  period: 'Mar 2009 – Dec 2019', startYear: 2009, endYear: 2019, months: 132, avgMonthlyPct:  1.12, volatilityPct:  5.5, character: 'Modi era, FII love, IT/Pharma',         color: '#3b82f6' },
  { id: 'R10', period: 'Jan 2020 – Jun 2025', startYear: 2020, endYear: 2025, months:  66, avgMonthlyPct:  1.45, volatilityPct:  7.2, character: 'COVID crash-recovery, AI era',           color: '#d4a843' },
];

/* ───────── Monthly return distribution (660 months) ───────── */
export const distributionStats = {
  meanMonthlyPct:   1.28,
  medianMonthlyPct: 1.45,
  stdDevPct:        7.82,
  skewness:        -0.34,
  kurtosis:         4.85,
  minMonthPct:    -32.4, // Oct 2008
  maxMonthPct:     28.7, // Apr 1992
  pctPositive:     58.3,
  sharpeMonthly:    0.163,
  sortino:          0.241,
};

/* ───────── Calendar-month seasonality ───────── */
export interface CalendarMonth {
  month: string;
  avgPct: number;
  pctPositive: number;
  bestYear: string;
  bestPct: number;
  worstYear: string;
  worstPct: number;
}

export const calendarMonths: CalendarMonth[] = [
  { month: 'Jan', avgPct:  1.45, pctPositive: 62, bestYear: '2019', bestPct:  9.2, worstYear: '2025', worstPct:  -5.8 },
  { month: 'Feb', avgPct:  0.98, pctPositive: 58, bestYear: '2021', bestPct:  8.1, worstYear: '2009', worstPct: -12.4 },
  { month: 'Mar', avgPct: -0.12, pctPositive: 48, bestYear: '2021', bestPct:  9.5, worstYear: '2020', worstPct: -23.8 },
  { month: 'Apr', avgPct:  1.82, pctPositive: 65, bestYear: '1992', bestPct: 28.7, worstYear: '2000', worstPct: -11.2 },
  { month: 'May', avgPct:  0.45, pctPositive: 54, bestYear: '2020', bestPct:  9.8, worstYear: '1992', worstPct: -18.5 },
  { month: 'Jun', avgPct:  0.32, pctPositive: 52, bestYear: '2014', bestPct:  8.2, worstYear: '2013', worstPct:  -7.5 },
  { month: 'Jul', avgPct:  1.12, pctPositive: 60, bestYear: '2020', bestPct:  8.5, worstYear: '2004', worstPct:  -9.2 },
  { month: 'Aug', avgPct: -0.28, pctPositive: 46, bestYear: '2019', bestPct:  7.2, worstYear: '2015', worstPct:  -8.4 },
  { month: 'Sep', avgPct: -0.45, pctPositive: 44, bestYear: '2010', bestPct:  8.1, worstYear: '2001', worstPct: -14.2 },
  { month: 'Oct', avgPct:  0.88, pctPositive: 56, bestYear: '2022', bestPct:  7.5, worstYear: '2008', worstPct: -32.4 },
  { month: 'Nov', avgPct:  1.52, pctPositive: 63, bestYear: '2020', bestPct: 11.4, worstYear: '2016', worstPct:  -6.8 },
  { month: 'Dec', avgPct:  1.68, pctPositive: 68, bestYear: '2017', bestPct:  7.8, worstYear: '1999', worstPct:  -8.2 },
];

/* ───────── Drawdowns ───────── */
export interface Drawdown {
  rank: number;
  peak: string;
  trough: string;
  declinePct: number;
  recovery: string;
  durationMonths: number;
  catalyst: string;
}

export const drawdowns: Drawdown[] = [
  { rank: 1, peak: 'Mar 1984', trough: 'Aug 1985', declinePct: -42.3, recovery: 'Dec 1986', durationMonths: 33, catalyst: 'Mid-80s consolidation'    },
  { rank: 2, peak: 'Nov 1987', trough: 'Sep 1991', declinePct: -52.8, recovery: 'Apr 1992', durationMonths: 53, catalyst: 'Political, BoP crisis'    },
  { rank: 3, peak: 'Apr 1992', trough: 'Sep 1992', declinePct: -68.5, recovery: 'Dec 1994', durationMonths: 32, catalyst: 'Harshad Mehta scam'        },
  { rank: 4, peak: 'Feb 2000', trough: 'Apr 2003', declinePct: -63.2, recovery: 'Mar 2004', durationMonths: 49, catalyst: 'Dot-com bust, 9/11'        },
  { rank: 5, peak: 'Jan 2008', trough: 'Oct 2008', declinePct: -62.4, recovery: 'Feb 2010', durationMonths: 25, catalyst: 'Global Financial Crisis'   },
  { rank: 6, peak: 'Jan 2020', trough: 'Mar 2020', declinePct: -38.5, recovery: 'Aug 2020', durationMonths:  8, catalyst: 'COVID-19 pandemic'         },
  { rank: 7, peak: 'Dec 2021', trough: 'Jun 2022', declinePct: -15.8, recovery: 'Sep 2022', durationMonths:  9, catalyst: 'Fed taper, Ukraine war'    },
];

/* ───────── Rolling returns ───────── */
export interface RollingWindow { period: string; bestCagrPct: number; worstCagrPct: number; bestRange: string; worstRange: string; }
export const rollingReturns: RollingWindow[] = [
  { period: '10-Year', bestCagrPct: 28.5, worstCagrPct: 8.2,  bestRange: '1991–2001', worstRange: '1997–2007' },
  { period: '20-Year', bestCagrPct: 18.2, worstCagrPct: 11.5, bestRange: '2003–2023', worstRange: '1985–2005' },
];

/* ───────── ROE evolution ───────── */
export interface RoeDecade { period: string; avgRoe: number; peakRoe: number; troughRoe: number; driver: string; }
export const roeDecades: RoeDecade[] = [
  { period: '1970–1980', avgRoe: 12.5, peakRoe: 15.2, troughRoe:  9.8, driver: 'Commodities, PSUs'                },
  { period: '1980–1990', avgRoe: 14.2, peakRoe: 18.5, troughRoe: 11.2, driver: 'Diversification'                  },
  { period: '1990–2000', avgRoe: 15.8, peakRoe: 22.4, troughRoe:  8.5, driver: 'IT boom, liberalization'          },
  { period: '2000–2010', avgRoe: 18.5, peakRoe: 24.8, troughRoe: 10.2, driver: 'Leverage, capex boom'             },
  { period: '2010–2020', avgRoe: 14.2, peakRoe: 17.5, troughRoe:  9.8, driver: 'NPA crisis, slowdown'             },
  { period: '2020–2025', avgRoe: 16.8, peakRoe: 21.2, troughRoe: 12.5, driver: 'Post-COVID recovery, digital'     },
];

/* ───────── DuPont decomposition ───────── */
export interface DuPontRow { year: number; roe: number; netMargin: number; assetTurnover: number; equityMultiplier: number; note: string; }
export const dupontHistory: DuPontRow[] = [
  { year: 1995, roe: 22.4, netMargin:  8.5, assetTurnover: 1.42, equityMultiplier: 1.88, note: 'High margin, decent efficiency' },
  { year: 2000, roe: 19.8, netMargin:  7.2, assetTurnover: 1.55, equityMultiplier: 1.80, note: 'IT margin expansion'             },
  { year: 2007, roe: 24.8, netMargin: 10.2, assetTurnover: 1.38, equityMultiplier: 1.75, note: 'Peak leverage + margins'         },
  { year: 2009, roe: 10.2, netMargin:  4.5, assetTurnover: 1.12, equityMultiplier: 2.05, note: 'Margin collapse, high leverage'  },
  { year: 2015, roe: 13.5, netMargin:  7.8, assetTurnover: 1.08, equityMultiplier: 1.62, note: 'NPA drag on banks'               },
  { year: 2019, roe: 14.8, netMargin:  8.2, assetTurnover: 1.15, equityMultiplier: 1.58, note: 'Stabilization'                   },
  { year: 2024, roe: 21.2, netMargin: 12.5, assetTurnover: 1.22, equityMultiplier: 1.42, note: 'Margins ↑, deleveraged'          },
];

/* ───────── Sector ROE evolution ───────── */
export interface SectorRoe { sector: string; roe2004: number; roe2014: number; roe2024: number; trend: string; aiImpact: 'Low' | 'Medium' | 'High' | 'Very High'; }
export const sectorRoe: SectorRoe[] = [
  { sector: 'Private Banks',   roe2004: 18, roe2014: 14, roe2024: 17, trend: 'U-shaped',          aiImpact: 'Medium'    },
  { sector: 'PSU Banks',       roe2004: 12, roe2014:  4, roe2024: 12, trend: 'U-shaped',          aiImpact: 'High'      },
  { sector: 'IT Services',     roe2004: 35, roe2014: 28, roe2024: 25, trend: 'Declining',         aiImpact: 'Very High' },
  { sector: 'Pharma',          roe2004: 18, roe2014: 16, roe2024: 15, trend: 'Stable-declining',  aiImpact: 'Low'       },
  { sector: 'FMCG',            roe2004: 42, roe2014: 48, roe2024: 52, trend: 'Rising',            aiImpact: 'Low'       },
  { sector: 'Auto',            roe2004: 16, roe2014: 14, roe2024: 18, trend: 'U-shaped',          aiImpact: 'Medium'    },
  { sector: 'Cement',          roe2004: 14, roe2014:  8, roe2024: 16, trend: 'U-shaped',          aiImpact: 'Low'       },
  { sector: 'Oil & Gas',       roe2004: 15, roe2014: 10, roe2024: 18, trend: 'Cyclical',          aiImpact: 'Low'       },
  { sector: 'Realty',          roe2004:  8, roe2014: -2, roe2024: 10, trend: 'Recovery',          aiImpact: 'Low'       },
  { sector: 'New Tech',        roe2004:  0, roe2014:  0, roe2024: 12, trend: 'Nascent',           aiImpact: 'Very High' },
];

/* ───────── P/E cycles ───────── */
export interface PeCycleDecade { period: string; avgPe: number; minPe: number; maxPe: number; stdDev: number; }
export const peCycles: PeCycleDecade[] = [
  { period: '1970–1980', avgPe:  8.2, minPe:  4.5, maxPe: 14.2, stdDev: 2.5 },
  { period: '1980–1990', avgPe: 10.5, minPe:  5.8, maxPe: 18.5, stdDev: 3.2 },
  { period: '1990–2000', avgPe: 16.8, minPe:  7.2, maxPe: 30.5, stdDev: 5.8 },
  { period: '2000–2010', avgPe: 18.2, minPe: 10.5, maxPe: 28.4, stdDev: 4.5 },
  { period: '2010–2020', avgPe: 22.5, minPe: 16.8, maxPe: 29.5, stdDev: 3.2 },
  { period: '2020–2025', avgPe: 24.8, minPe: 17.2, maxPe: 26.5, stdDev: 2.8 },
];

/* ───────── P/E regime drivers ───────── */
export interface PeRegimeRow { driver: string; v1: string; v2: string; v3: string; v4: string; }
export const peRegimeDrivers: PeRegimeRow[] = [
  { driver: 'FII Participation',     v1: '0%',  v2: '15%', v3: '30%', v4: '40%' },
  { driver: 'Retail Participation',  v1: '95%', v2: '65%', v3: '45%', v4: '35%' },
  { driver: 'DII (MF + Insurance)',  v1: '5%',  v2: '20%', v3: '25%', v4: '25%' },
  { driver: 'Risk-Free Rate (10Y)',  v1: '12%', v2: '10%', v3: '7.5%', v4: '6.5%' },
  { driver: 'Equity Risk Premium',   v1: '8%',  v2: '6%',  v3: '4.5%', v4: '3.5%' },
  { driver: 'Implied CoE',           v1: '20%', v2: '16%', v3: '12%',  v4: '10%' },
  { driver: 'Justified P/E (Gordon)',v1: '5x',  v2: '8x',  v3: '12x',  v4: '18x' },
  { driver: 'Actual P/E',            v1: '9x',  v2: '17x', v3: '18x',  v4: '24x' },
  { driver: 'Premium vs Model',      v1: '+80%',v2: '+112%',v3: '+50%', v4: '+33%' },
];

/* ───────── P/E mean reversion ───────── */
export interface PeBucket { startingPe: string; fwd5YrCagr: number; fwd10YrCagr: number; }
export const peMeanReversion: PeBucket[] = [
  { startingPe: '<10x',     fwd5YrCagr: 22, fwd10YrCagr: 18 },
  { startingPe: '10–15x',   fwd5YrCagr: 15, fwd10YrCagr: 14 },
  { startingPe: '15–20x',   fwd5YrCagr: 10, fwd10YrCagr: 12 },
  { startingPe: '20–25x',   fwd5YrCagr:  6, fwd10YrCagr: 10 },
  { startingPe: '>25x',     fwd5YrCagr:  2, fwd10YrCagr:  8 },
];

/* ───────── Shiller CAPE history ───────── */
export interface CapeRow { date: string; cape: number; percentile: number; expected10YPct: number; }
export const capeHistory: CapeRow[] = [
  { date: 'Jan 1974', cape:  5.2, percentile:  2, expected10YPct: 18 },
  { date: 'Mar 1999', cape: 38.5, percentile: 99, expected10YPct:  2 },
  { date: 'Mar 2003', cape: 11.8, percentile: 15, expected10YPct: 14 },
  { date: 'Jan 2008', cape: 26.5, percentile: 88, expected10YPct:  5 },
  { date: 'Mar 2020', cape: 18.5, percentile: 45, expected10YPct: 10 },
  { date: 'Jun 2025', cape: 28.2, percentile: 92, expected10YPct:  5 },
];

/* ───────── P/B & cost of equity ───────── */
export interface PbRow { year: number; pb: number; roe: number; impliedCoe: number; verdict: string; }
export const pbHistory: PbRow[] = [
  { year: 1975, pb: 0.8, roe: 12, impliedCoe: 15,  verdict: 'Undervalued'        },
  { year: 1985, pb: 1.2, roe: 14, impliedCoe: 14,  verdict: 'Fair'                },
  { year: 1995, pb: 2.8, roe: 22, impliedCoe: 13,  verdict: 'Fair'                },
  { year: 2000, pb: 4.5, roe: 20, impliedCoe: 12,  verdict: 'Overvalued'          },
  { year: 2007, pb: 5.2, roe: 25, impliedCoe: 11,  verdict: 'Very overvalued'     },
  { year: 2013, pb: 2.2, roe: 14, impliedCoe: 12,  verdict: 'Undervalued'         },
  { year: 2020, pb: 3.5, roe: 15, impliedCoe: 10,  verdict: 'Fair'                },
  { year: 2025, pb: 4.2, roe: 21, impliedCoe:  9.5,verdict: 'Slightly overvalued' },
];

/* ───────── Book value vs EPS growth ───────── */
export interface BvepsRow { period: string; bvpsCagr: number; epsCagr: number; payout: number; }
export const bvepsGrowth: BvepsRow[] = [
  { period: '1970–1990', bvpsCagr:  8.2, epsCagr:  9.5, payout: 30 },
  { period: '1990–2000', bvpsCagr: 12.5, epsCagr: 14.2, payout: 25 },
  { period: '2000–2010', bvpsCagr: 15.8, epsCagr: 18.5, payout: 35 },
  { period: '2010–2020', bvpsCagr:  9.5, epsCagr:  8.2, payout: 50 },
  { period: '2020–2025', bvpsCagr: 12.2, epsCagr: 15.8, payout: 40 },
];

/* ───────── Dividend yield evolution ───────── */
export interface DivYieldRow { period: string; avgYield: number; peakYield: number; troughYield: number; trend: string; }
export const divYieldHistory: DivYieldRow[] = [
  { period: '1970–1990', avgYield: 4.5, peakYield: 7.2, troughYield: 2.8, trend: 'Declining'  },
  { period: '1990–2000', avgYield: 2.2, peakYield: 4.5, troughYield: 1.2, trend: 'Declining'  },
  { period: '2000–2010', avgYield: 1.5, peakYield: 2.8, troughYield: 0.8, trend: 'Declining'  },
  { period: '2010–2020', avgYield: 1.2, peakYield: 1.8, troughYield: 0.9, trend: 'Stable-low' },
  { period: '2020–2025', avgYield: 1.1, peakYield: 1.5, troughYield: 0.8, trend: 'Stable-low' },
];

export interface PayoutRow { sector: string; y1990: number; y2000: number; y2010: number; y2025: number; }
export const payoutEvolution: PayoutRow[] = [
  { sector: 'FMCG',        y1990: 40, y2000: 45, y2010: 55, y2025: 70 },
  { sector: 'IT',          y1990: 10, y2000: 15, y2010: 40, y2025: 75 },
  { sector: 'Banks',       y1990: 20, y2000: 25, y2010: 30, y2025: 40 },
  { sector: 'Pharma',      y1990: 25, y2000: 30, y2010: 35, y2025: 45 },
  { sector: 'Auto',        y1990: 30, y2000: 35, y2010: 40, y2025: 45 },
  { sector: 'Market Avg',  y1990: 28, y2000: 32, y2010: 42, y2025: 58 },
];

/* ───────── EV / EBITDA ───────── */
export interface EvEbitdaRow { year: number; multiple: number; verdict: string; }
export const evEbitdaHistory: EvEbitdaRow[] = [
  { year: 1995, multiple:  8.5, verdict: 'Fair'                },
  { year: 2000, multiple: 14.2, verdict: 'Overvalued'          },
  { year: 2003, multiple:  5.8, verdict: 'Deep undervalue'     },
  { year: 2007, multiple: 16.5, verdict: 'Bubble territory'    },
  { year: 2009, multiple:  7.2, verdict: 'Crisis bargain'      },
  { year: 2015, multiple: 12.8, verdict: 'Fair'                },
  { year: 2020, multiple: 15.5, verdict: 'Overvalued'          },
  { year: 2025, multiple: 16.2, verdict: 'Overvalued'          },
];

export interface RoicRow { year: number; roic: number; wacc: number; spread: number; evEbitda: number; signal: string; }
export const roicSpread: RoicRow[] = [
  { year: 2003, roic: 15, wacc: 13, spread:  2, evEbitda:  5.8, signal: 'BUY (wide spread, low multiple)' },
  { year: 2007, roic: 22, wacc: 11, spread: 11, evEbitda: 16.5, signal: 'HOLD (wide spread, expensive)'   },
  { year: 2015, roic: 14, wacc: 11, spread:  3, evEbitda: 12.8, signal: 'FAIR'                            },
  { year: 2025, roic: 18, wacc: 10, spread:  8, evEbitda: 16.2, signal: 'HOLD (good spread, rich)'        },
];

/* ───────── Sector leadership cycles ───────── */
export interface DecadeWinner { decade: string; bestSector: string; bestCagr: number; worstSector: string; worstCagr: number; spread: number; }
export const decadeWinners: DecadeWinner[] = [
  { decade: '1970s', bestSector: 'Commodities', bestCagr: 18, worstSector: 'Textiles',         worstCagr: -2, spread: 20 },
  { decade: '1980s', bestSector: 'FMCG',        bestCagr: 22, worstSector: 'PSU Banks',        worstCagr:  5, spread: 17 },
  { decade: '1990s', bestSector: 'IT',          bestCagr: 45, worstSector: 'Steel',            worstCagr: -5, spread: 50 },
  { decade: '2000s', bestSector: 'Realty',      bestCagr: 35, worstSector: 'IT',               worstCagr:  8, spread: 27 },
  { decade: '2010s', bestSector: 'Pharma',      bestCagr: 18, worstSector: 'PSU Banks',        worstCagr: -8, spread: 26 },
  { decade: '2020s', bestSector: 'New Tech',    bestCagr: 32, worstSector: 'Traditional Media',worstCagr: -5, spread: 37 },
];

export interface SectorPe { sector: string; currentPe: number; avg20Y: number; zScore: number; signal: 'Cheap' | 'Neutral' | 'Slightly Over' | 'Overvalued' | 'Very Overvalued'; }
export const sectorPeDispersion: SectorPe[] = [
  { sector: 'IT',         currentPe: 24, avg20Y: 22, zScore:  0.6, signal: 'Neutral'          },
  { sector: 'Banks',      currentPe: 18, avg20Y: 16, zScore:  0.7, signal: 'Neutral'          },
  { sector: 'FMCG',       currentPe: 52, avg20Y: 42, zScore:  1.5, signal: 'Overvalued'       },
  { sector: 'Pharma',     currentPe: 32, avg20Y: 28, zScore:  0.8, signal: 'Neutral'          },
  { sector: 'Auto',       currentPe: 26, avg20Y: 22, zScore:  1.0, signal: 'Slightly Over'    },
  { sector: 'Realty',     currentPe: 38, avg20Y: 30, zScore:  1.3, signal: 'Overvalued'       },
  { sector: 'New Tech',   currentPe: 65, avg20Y: 45, zScore:  2.0, signal: 'Very Overvalued'  },
  { sector: 'Oil & Gas',  currentPe: 10, avg20Y: 12, zScore: -0.7, signal: 'Cheap'            },
  { sector: 'PSU',        currentPe: 14, avg20Y: 10, zScore:  1.2, signal: 'Overvalued'       },
];

/* ───────── Market-cap segments & quality factor ───────── */
export interface MarketCapRow { period: string; large: number; mid: number; small: number; spread: number; }
export const marketCapSegments: MarketCapRow[] = [
  { period: '1996–2006', large: 14.2, mid: 18.5, small: 22.8, spread: 8.6 },
  { period: '2006–2016', large:  8.5, mid: 10.2, small: 12.5, spread: 4.0 },
  { period: '2016–2025', large: 13.8, mid: 16.2, small: 18.5, spread: 4.7 },
];

export interface QualityRow { period: string; highRoe: number; lowRoe: number; spread: number; }
export const qualityFactor: QualityRow[] = [
  { period: '2005–2015', highRoe: 16.2, lowRoe:  8.5, spread: 7.7 },
  { period: '2015–2025', highRoe: 18.5, lowRoe: 10.2, spread: 8.3 },
];

/* ───────── Macro: rates / FII / FX ───────── */
export interface RateCorrelation { period: string; correlation: number; }
export const rateCorrelations: RateCorrelation[] = [
  { period: '1995–2005', correlation: -0.72 },
  { period: '2005–2015', correlation: -0.55 },
  { period: '2015–2025', correlation: -0.35 },
];

export interface RealRateRow { period: string; realRate: number; marketCagr: number; }
export const realRateHistory: RealRateRow[] = [
  { period: '1970–1990', realRate:  6.0, marketCagr:  8 },
  { period: '1990–2000', realRate:  4.0, marketCagr: 14 },
  { period: '2000–2010', realRate:  2.0, marketCagr: 13 },
  { period: '2010–2020', realRate:  2.0, marketCagr: 11 },
  { period: '2020–2025', realRate:  2.5, marketCagr: 15 },
];

export interface FiiBucket { range: string; nextMonthAvg: number; hitRate: number; signal: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell'; }
export const fiiSignals: FiiBucket[] = [
  { range: '> +50,000 Cr',         nextMonthAvg:  2.8, hitRate: 72, signal: 'Buy'         },
  { range: '+20K to +50K',         nextMonthAvg:  1.2, hitRate: 62, signal: 'Buy'         },
  { range: '-20K to +20K',         nextMonthAvg:  0.3, hitRate: 52, signal: 'Neutral'     },
  { range: '-50K to -20K',         nextMonthAvg: -1.5, hitRate: 65, signal: 'Sell'        },
  { range: '< -50,000 Cr',         nextMonthAvg: -3.2, hitRate: 78, signal: 'Strong Buy'  },
];

export interface FiiOwnershipRow { sector: string; ownershipPct: number; trend: string; }
export const fiiOwnership: FiiOwnershipRow[] = [
  { sector: 'Private Banks', ownershipPct: 42, trend: 'Stable'             },
  { sector: 'IT',            ownershipPct: 38, trend: 'Declining'          },
  { sector: 'FMCG',          ownershipPct: 35, trend: 'Stable'             },
  { sector: 'Auto',          ownershipPct: 28, trend: 'Rising'             },
  { sector: 'Pharma',        ownershipPct: 25, trend: 'Stable'             },
  { sector: 'PSU',           ownershipPct: 12, trend: 'Rising (value hunt)'},
];

export interface FxRow { period: string; nseInr: number; inrUsd: number; nseUsd: number; }
export const fxImpact: FxRow[] = [
  { period: '2003–2008', nseInr: 32, inrUsd: -15, nseUsd: 38 },
  { period: '2008–2013', nseInr:  8, inrUsd:  35, nseUsd:  3 },
  { period: '2013–2018', nseInr: 12, inrUsd:  18, nseUsd:  9 },
  { period: '2018–2025', nseInr: 14, inrUsd:  22, nseUsd: 10 },
];

/* ───────── Forward 10Y model & scenarios ───────── */
export interface ExpectedComponent { component: string; current: string; assumption: string; }
export const expectedReturnModel: ExpectedComponent[] = [
  { component: 'Risk-Free Rate',     current: '6.95%', assumption: '6.5%'      },
  { component: 'Equity Risk Premium',current: '3.50%', assumption: '3.8%'      },
  { component: 'Cost of Equity',     current: '10.45%',assumption: '10.3%'     },
  { component: 'Earnings Growth',    current: '14%',   assumption: '11%'       },
  { component: 'Dividend Yield',     current: '1.1%',  assumption: '1.5%'      },
  { component: 'Valuation Change',   current: '—',     assumption: '−1%/yr'    },
];

export const expectedReturn10YPct = 11.5;

export interface Scenario { scenario: 'Bull' | 'Base' | 'Bear' | 'Crash'; earningsGrowth: number; endPe: number; cagr10Y: number; probability: number; }
export const scenarios: Scenario[] = [
  { scenario: 'Bull',  earningsGrowth: 14, endPe: 24, cagr10Y: 15.5, probability: 20 },
  { scenario: 'Base',  earningsGrowth: 11, endPe: 18, cagr10Y: 11.5, probability: 50 },
  { scenario: 'Bear',  earningsGrowth:  7, endPe: 14, cagr10Y:  6.5, probability: 25 },
  { scenario: 'Crash', earningsGrowth:  3, endPe: 10, cagr10Y: -1.5, probability:  5 },
];

export const probabilityWeightedCagrPct = 10.8;

export interface AllocationRow { asset: string; weight: number; expectedReturn: number; rationale: string; }
export const strategicAllocation: AllocationRow[] = [
  { asset: 'Indian Large Cap',         weight: 35, expectedReturn: 10, rationale: 'Core, quality tilt'             },
  { asset: 'Indian Mid / Small Cap',   weight: 20, expectedReturn: 14, rationale: 'Growth premium, higher vol'     },
  { asset: 'Indian Bonds (10Y)',       weight: 15, expectedReturn:  7, rationale: 'Stability, real yield +2.5%'    },
  { asset: 'Global Developed (EAFE)',  weight: 15, expectedReturn:  8, rationale: 'Diversification, USD hedge'     },
  { asset: 'Gold',                     weight: 10, expectedReturn:  6, rationale: 'Crisis hedge, INR hedge'        },
  { asset: 'Cash',                     weight:  5, expectedReturn:  6, rationale: 'Dry powder for crisis'          },
];

export interface TacticalRow { position: string; direction: 'OW' | 'UW' | 'Neutral'; sizePct: number; catalyst: string; }
export const tacticalOverlay: TacticalRow[] = [
  { position: 'Nifty 50',           direction: 'Neutral', sizePct:  0, catalyst: 'P/E rich, earnings okay'         },
  { position: 'Nifty Midcap 150',   direction: 'OW',      sizePct:  5, catalyst: 'Valuation gap closing'           },
  { position: 'Nifty Smallcap 250', direction: 'OW',      sizePct:  3, catalyst: 'High risk, high return'          },
  { position: 'Nifty PSU Bank',     direction: 'OW',      sizePct:  3, catalyst: 'Deep value, turnaround'          },
  { position: 'Nifty IT',           direction: 'UW',      sizePct: -3, catalyst: 'AI headwinds'                    },
  { position: 'Nifty Realty',       direction: 'UW',      sizePct: -2, catalyst: 'Overvalued, rate risk'           },
];

/* ───────── Regime map (current snapshot) ───────── */
export interface RegimeIndicator { indicator: string; current: string; historicalAvg: string; regime: 'Cheap' | 'Fair' | 'Expensive' | 'Accommodative' | 'Stretched' | 'High' | 'Low'; }
export const regimeMap: RegimeIndicator[] = [
  { indicator: 'P/E',             current: '22.5x', historicalAvg: '16.5x', regime: 'Expensive'      },
  { indicator: 'P/B',             current: '4.2x',  historicalAvg: '2.8x',  regime: 'Expensive'      },
  { indicator: 'Dividend Yield',  current: '1.1%',  historicalAvg: '2.2%',  regime: 'Low'            },
  { indicator: 'ROE',             current: '21.2%', historicalAvg: '15.5%', regime: 'High'           },
  { indicator: 'Real Rate',       current: '+2.5%', historicalAvg: '+3.5%', regime: 'Accommodative'  },
  { indicator: 'FII Position',    current: 'Long',  historicalAvg: 'Neutral', regime: 'Stretched'    },
];

/* ───────── 10 Immutable Laws ───────── */
export interface Law { id: number; law: string; evidence: string; }
export const immutableLaws: Law[] = [
  { id:  1, law: 'Equities beat bonds long-term',         evidence: '16.2% CAGR vs 9.5% (1970–2025)'                  },
  { id:  2, law: 'Small caps beat large caps',             evidence: '+4–9% spread always'                              },
  { id:  3, law: 'Quality (ROE) wins',                     evidence: 'High ROE 18.5% vs Low ROE 10.2% (2015–25)'        },
  { id:  4, law: 'Mean reversion is real',                 evidence: 'P/E always reverts (slowly)'                      },
  { id:  5, law: 'Dividends matter',                       evidence: '40% of total return since 1970'                   },
  { id:  6, law: 'Never negative 10Y return',              evidence: 'Worst 10Y: +8.2% (1997–2007)'                     },
  { id:  7, law: 'Crashes create wealth',                  evidence: '1992, 2003, 2009, 2020 = best entry points'       },
  { id:  8, law: 'FII flows predict short-term',           evidence: '< -50K Cr → 78% next-month positive'              },
  { id:  9, law: 'Real rates < 3% = bull market',          evidence: '2003–08, 2009–19, 2020–now'                       },
  { id: 10, law: 'INR depreciates 4% p.a.',                evidence: 'USD investors lose 30–40% of returns'             },
];

/* ───────── Long-term Sensex log path (decadal anchors, total return) ───────── */
export interface SensexPoint { year: number; sensex: number; }
export const sensexLongPath: SensexPoint[] = [
  { year: 1970, sensex:    52 },
  { year: 1975, sensex:    78 },
  { year: 1980, sensex:   142 },
  { year: 1985, sensex:   245 },
  { year: 1990, sensex:   447 },
  { year: 1992, sensex:  4467 }, // pre-Harshad peak
  { year: 1995, sensex:  3110 },
  { year: 2000, sensex:  5012 },
  { year: 2003, sensex:  3050 },
  { year: 2008, sensex: 20873 },
  { year: 2009, sensex:  9158 },
  { year: 2013, sensex: 19427 },
  { year: 2015, sensex: 27957 },
  { year: 2020, sensex: 41253 },
  { year: 2022, sensex: 60841 },
  { year: 2025, sensex: 83450 },
];

/* ───────── Decadal CAGR comparison ───────── */
export interface DecadeCagr { period: string; actualCagr: number | null; }
export const decadeCagr: DecadeCagr[] = [
  { period: '1970–1980', actualCagr:  8.2 },
  { period: '1980–1990', actualCagr: 12.5 },
  { period: '1990–2000', actualCagr: 14.2 },
  { period: '2000–2010', actualCagr: 13.8 },
  { period: '2010–2020', actualCagr: 11.2 },
  { period: '2020–2025', actualCagr: 15.2 },
  { period: '2025–2035E', actualCagr: 10.8 },
];

/* ───────── Appendix: extreme months ───────── */
export interface ExtremeMonth { rank: number; month: string; returnPct: number; cause: string; }
export const extremeMonths: ExtremeMonth[] = [
  { rank: 1,   month: 'Apr 1992', returnPct:  28.7, cause: 'Post-liberalization euphoria'     },
  { rank: 2,   month: 'Nov 2020', returnPct:  11.4, cause: 'COVID vaccine hope'                },
  { rank: 3,   month: 'Apr 2020', returnPct:   9.8, cause: 'Liquidity tsunami'                 },
  { rank: 658, month: 'Oct 2008', returnPct: -32.4, cause: 'Global Financial Crisis'           },
  { rank: 657, month: 'Mar 2020', returnPct: -23.8, cause: 'COVID panic'                       },
  { rank: 656, month: 'May 1992', returnPct: -18.5, cause: 'Harshad Mehta scam revealed'       },
];
