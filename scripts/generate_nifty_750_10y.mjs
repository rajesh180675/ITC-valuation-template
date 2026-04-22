#!/usr/bin/env node
/* eslint-disable */
/**
 * Deterministic generator for public/data/nifty_750_10y.json.
 *
 * Produces the schema defined in README.md:
 *   {
 *     generatedAt, source, batches: [
 *       { indexSlug, indexName, asOfDate, companies: [
 *           { symbol, companyName, sector, reportingType, financials: [
 *               { fiscalYear, revenueCr, netProfitCr, roePct, pe?, pb?, debtToEquity? }
 *           ] }
 *       ] }
 *     ]
 *   }
 *
 * Three cohorts × 250 companies × 10 fiscal years (FY2017 .. FY2026) = 7,500 rows.
 *
 * Numbers are SYNTHETIC. They follow sector-realistic CAGRs, ROE bands, and
 * a shared FY2020 COVID dip. A fixed RNG seed makes the output byte-stable
 * across runs so schema/integrity tests stay deterministic.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '..', 'public', 'data', 'nifty_750_10y.json');

// ---------- Deterministic PRNG ----------
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260421);
const jitter = (pct) => 1 + (rand() * 2 - 1) * pct; // e.g. pct=0.08 → ±8%
const round1 = (n) => Math.round(n * 10) / 10;
const round0 = (n) => Math.round(n);

// ---------- Fiscal years ----------
const FISCAL_YEARS = Array.from({ length: 10 }, (_, i) => `FY${2017 + i}`); // FY2017..FY2026
const COVID_FY_INDEX = FISCAL_YEARS.indexOf('FY2020');

// ---------- Sector seed catalogue ----------
// reporting = 'financial' means banks/NBFCs/insurers: emit pb, no d/e.
// reporting = 'nonFinancial' means everyone else: emit pe and d/e.
// baseRevCr is a tier-1 (LargeMidcap) anchor; small/micro tiers scale down.
// covidDip is fractional revenue loss at FY2020 (applied before recovery).
const SECTORS = [
  // sector,          reporting,      baseRevCr, revCagr, netMargin, roeMean, peMean, pbMean, deMean, covidDip, prefix
  ['Banks',           'financial',    60000,     0.13,    0.22,      15.0,    0,      2.4,    0,      0.06,     'BANK'],
  ['NBFC',            'financial',    28000,     0.17,    0.22,      17.0,    0,      3.3,    0,      0.09,     'NBFC'],
  ['Insurance',       'financial',    45000,     0.13,    0.12,      14.0,    0,      2.6,    0,      0.05,     'INSR'],
  ['Information Technology', 'nonFinancial', 42000, 0.11, 0.18,      24.0,    26.0,   0,      0.05,   0.03,     'IT'],
  ['Pharmaceuticals', 'nonFinancial', 22000,     0.11,    0.17,      17.5,    28.0,   0,      0.25,   0.02,     'PHRM'],
  ['Healthcare',      'nonFinancial', 14000,     0.14,    0.13,      16.0,    32.0,   0,      0.40,   0.04,     'HLTH'],
  ['Consumer Staples','nonFinancial', 38000,     0.10,    0.17,      23.0,    40.0,   0,      0.10,   0.02,     'FMCG'],
  ['Consumer Discretionary','nonFinancial', 26000, 0.14,  0.09,      17.0,    38.0,   0,      0.35,   0.11,     'CDIS'],
  ['Consumer Durables','nonFinancial',16000,     0.13,    0.11,      17.0,    35.0,   0,      0.30,   0.08,     'DUR'],
  ['Automobiles',     'nonFinancial', 48000,     0.12,    0.08,      15.5,    24.0,   0,      0.45,   0.14,     'AUTO'],
  ['Auto Components', 'nonFinancial', 12000,     0.12,    0.07,      14.0,    22.0,   0,      0.55,   0.13,     'AUTP'],
  ['Energy',          'nonFinancial', 85000,     0.09,    0.11,      13.0,    15.0,   0,      0.60,   0.12,     'ENRG'],
  ['Utilities',       'nonFinancial', 32000,     0.09,    0.16,      12.5,    17.0,   0,      1.10,   0.03,     'UTIL'],
  ['Chemicals',       'nonFinancial', 18000,     0.14,    0.13,      17.5,    30.0,   0,      0.35,   0.05,     'CHEM'],
  ['Specialty Chemicals','nonFinancial',10000,   0.16,    0.15,      18.5,    35.0,   0,      0.25,   0.03,     'SCHM'],
  ['Metals',          'nonFinancial', 46000,     0.09,    0.08,      11.5,    14.0,   0,      0.80,   0.15,     'MTL'],
  ['Materials',       'nonFinancial', 30000,     0.10,    0.10,      12.5,    22.0,   0,      0.50,   0.08,     'MATL'],
  ['Cement',          'nonFinancial', 24000,     0.10,    0.11,      12.5,    24.0,   0,      0.55,   0.07,     'CEM'],
  ['Industrials',     'nonFinancial', 22000,     0.13,    0.10,      15.5,    28.0,   0,      0.45,   0.08,     'IND'],
  ['Capital Goods',   'nonFinancial', 20000,     0.14,    0.10,      15.5,    32.0,   0,      0.40,   0.09,     'CGDS'],
  ['Logistics',       'nonFinancial', 9000,      0.15,    0.11,      16.0,    30.0,   0,      0.55,   0.10,     'LGX'],
  ['Aerospace & Defense','nonFinancial', 11000,  0.17,    0.12,      19.0,    40.0,   0,      0.10,   0.03,     'AERD'],
  ['Real Estate',     'nonFinancial', 9000,      0.16,    0.11,      14.0,    34.0,   0,      0.60,   0.14,     'RE'],
  ['Infrastructure',  'nonFinancial', 18000,     0.12,    0.09,      13.5,    26.0,   0,      0.70,   0.11,     'INFR'],
  ['Telecom',         'nonFinancial', 38000,     0.12,    0.10,      15.0,    30.0,   0,      0.95,   0.04,     'TELC'],
  ['Media',           'nonFinancial', 5500,      0.11,    0.10,      13.5,    26.0,   0,      0.35,   0.18,     'MEDA'],
  ['Textiles',        'nonFinancial', 7000,      0.09,    0.08,      12.0,    20.0,   0,      0.70,   0.12,     'TEXT'],
  ['Agriculture',     'nonFinancial', 9500,      0.11,    0.10,      13.5,    22.0,   0,      0.30,   0.05,     'AGRI'],
].map((r) => ({
  name: r[0], reporting: r[1], baseRevCr: r[2], revCagr: r[3], netMargin: r[4],
  roeMean: r[5], peMean: r[6], pbMean: r[7], deMean: r[8], covidDip: r[9], prefix: r[10],
}));

// ---------- Cohort definitions ----------
// Each cohort has a tier multiplier against sector baseRevCr.
const COHORTS = [
  {
    slug: 'niftylargemidcap250',
    name: 'Nifty LargeMidcap 250',
    prefix: 'LM',
    tierMin: 0.55,
    tierMax: 2.20,
    sizeNoise: 0.12,
  },
  {
    slug: 'niftysmallcap250',
    name: 'Nifty Smallcap 250',
    prefix: 'SC',
    tierMin: 0.07,
    tierMax: 0.22,
    sizeNoise: 0.18,
  },
  {
    slug: 'niftymicrocap250',
    name: 'Nifty Microcap 250',
    prefix: 'MC',
    tierMin: 0.012,
    tierMax: 0.045,
    sizeNoise: 0.25,
  },
];

// ---------- Sector composition (sums to 250) ----------
// Chosen to approximate the real Indian mid/small/micro universe mix while
// staying stable across tiers for easy comparison.
const SECTOR_COUNTS = {
  'Banks': 12,
  'NBFC': 14,
  'Insurance': 6,
  'Information Technology': 20,
  'Pharmaceuticals': 14,
  'Healthcare': 10,
  'Consumer Staples': 10,
  'Consumer Discretionary': 14,
  'Consumer Durables': 8,
  'Automobiles': 8,
  'Auto Components': 10,
  'Energy': 6,
  'Utilities': 6,
  'Chemicals': 12,
  'Specialty Chemicals': 10,
  'Metals': 8,
  'Materials': 6,
  'Cement': 6,
  'Industrials': 14,
  'Capital Goods': 12,
  'Logistics': 6,
  'Aerospace & Defense': 4,
  'Real Estate': 6,
  'Infrastructure': 8,
  'Telecom': 4,
  'Media': 4,
  'Textiles': 6,
  'Agriculture': 6,
};

// sanity check
const _sectorSum = Object.values(SECTOR_COUNTS).reduce((a, b) => a + b, 0);
if (_sectorSum !== 250) {
  throw new Error(`SECTOR_COUNTS must sum to 250, got ${_sectorSum}`);
}

// ---------- Helpers ----------
function buildFinancials(seed, latestRevCr) {
  const out = [];
  // Back-compute FY2017 revenue from FY2026 using CAGR.
  const backYears = FISCAL_YEARS.length - 1;
  const startRev = latestRevCr / Math.pow(1 + seed.revCagr, backYears);

  // ROE improves ~+3pp over the decade (mean reversion from discount to target).
  const roeStart = Math.max(6, seed.roeMean - 3 + (rand() * 2 - 1));
  const roeEnd = seed.roeMean + (rand() * 1.6 - 0.8);

  // Margin expands slightly, dips in covid.
  const marginStart = Math.max(0.03, seed.netMargin - 0.02);
  const marginEnd = seed.netMargin + (rand() * 0.02 - 0.01);

  // Valuation drifts higher with noise, dips in covid.
  const peStart = seed.peMean === 0 ? 0 : Math.max(8, seed.peMean - 6);
  const peEnd = seed.peMean === 0 ? 0 : seed.peMean + (rand() * 4 - 2);
  const pbStart = seed.pbMean === 0 ? 0 : Math.max(0.8, seed.pbMean - 0.6);
  const pbEnd = seed.pbMean === 0 ? 0 : seed.pbMean + (rand() * 0.4 - 0.2);

  // D/E slowly delevers.
  const deStart = seed.reporting === 'financial' ? 0 : seed.deMean + 0.1;
  const deEnd = seed.reporting === 'financial' ? 0 : Math.max(0.05, seed.deMean - 0.1);

  for (let i = 0; i < FISCAL_YEARS.length; i++) {
    const t = i / (FISCAL_YEARS.length - 1); // 0..1
    let rev = startRev * Math.pow(1 + seed.revCagr, i) * jitter(0.04);
    let margin = marginStart + (marginEnd - marginStart) * t;
    let roe = roeStart + (roeEnd - roeStart) * t + (rand() * 1.2 - 0.6);
    let pe = peStart === 0 ? 0 : peStart + (peEnd - peStart) * t + (rand() * 2 - 1);
    let pb = pbStart === 0 ? 0 : pbStart + (pbEnd - pbStart) * t + (rand() * 0.2 - 0.1);
    let de = seed.reporting === 'financial' ? undefined : Math.max(0, deStart + (deEnd - deStart) * t + (rand() * 0.08 - 0.04));

    if (i === COVID_FY_INDEX) {
      rev *= 1 - seed.covidDip;
      margin *= 0.85;
      roe *= 0.82;
      if (pe > 0) pe *= 0.88;
      if (pb > 0) pb *= 0.9;
      if (de !== undefined) de *= 1.1;
    }

    const record = {
      fiscalYear: FISCAL_YEARS[i],
      revenueCr: round0(rev),
      netProfitCr: round0(rev * margin),
      roePct: round1(Math.max(-5, roe)),
    };

    if (seed.reporting === 'financial') {
      record.pb = round1(Math.max(0.3, pb));
    } else {
      record.pe = round1(Math.max(5, pe));
      record.debtToEquity = round1(Math.max(0, de ?? 0));
    }

    out.push(record);
  }
  return out;
}

function buildCompany(seed, cohort, cohortRank, globalRank) {
  const tierT = (cohortRank - 1) / 249; // 0..1 within cohort
  const tierMult = cohort.tierMin + (cohort.tierMax - cohort.tierMin) * tierT;
  const latestRevCr = seed.baseRevCr * tierMult * jitter(cohort.sizeNoise);

  const rankStr = String(cohortRank).padStart(3, '0');
  const symbol = `${seed.prefix}${cohort.prefix}${rankStr}`;
  const companyName = `${seed.name} ${cohort.prefix === 'LM' ? 'LargeMid' : cohort.prefix === 'SC' ? 'Smallcap' : 'Microcap'} ${cohortRank}`;

  return {
    symbol,
    companyName,
    sector: seed.name,
    reportingType: seed.reporting,
    financials: buildFinancials(seed, latestRevCr),
  };
}

function buildBatch(cohort) {
  const companies = [];
  let cohortRank = 1;

  // Deterministic ordering: iterate sectors in SECTOR_COUNTS insertion order.
  for (const [sectorName, count] of Object.entries(SECTOR_COUNTS)) {
    const seed = SECTORS.find((s) => s.name === sectorName);
    if (!seed) throw new Error(`Seed missing for sector: ${sectorName}`);
    for (let i = 0; i < count; i++) {
      companies.push(buildCompany(seed, cohort, cohortRank, cohortRank));
      cohortRank++;
    }
  }

  // Sort within batch by latest revenue desc for nicer default ordering.
  companies.sort(
    (a, b) =>
      b.financials[b.financials.length - 1].revenueCr -
      a.financials[a.financials.length - 1].revenueCr,
  );

  return {
    indexSlug: cohort.slug,
    indexName: cohort.name,
    asOfDate: '2026-03-31',
    constituentCount: companies.length,
    companies,
  };
}

// ---------- Main ----------
const dataset = {
  generatedAt: new Date('2026-04-22T00:00:00Z').toISOString(),
  source: 'synthetic',
  sourceNote:
    'Deterministic synthetic panel produced by scripts/generate_nifty_750_10y.mjs. ' +
    'Not audited; do not use for investment decisions. Swap in real data by replacing this JSON with the same schema.',
  schemaVersion: 1,
  fiscalYears: FISCAL_YEARS,
  batches: COHORTS.map((c) => buildBatch(c)),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(dataset) + '\n');

const totalCompanies = dataset.batches.reduce((s, b) => s + b.companies.length, 0);
const totalRows = totalCompanies * FISCAL_YEARS.length;
const sizeBytes = JSON.stringify(dataset).length;
console.log(
  `[generate_nifty_750_10y] wrote ${OUT_PATH}\n` +
    `  batches: ${dataset.batches.length}\n` +
    `  companies: ${totalCompanies}\n` +
    `  financial rows: ${totalRows}\n` +
    `  size: ${(sizeBytes / 1024).toFixed(1)} KiB`,
);
