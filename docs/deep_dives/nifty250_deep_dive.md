# Nifty LargeMidcap 250 — Rigorous Component Deep Dive

> **Scope:** Full technical audit of the Nifty 250 universe feature — data model, analytics engine, UI component tree, state management, data pipeline, known limitations and a ranked improvement backlog.

---

## 1. Component Map

```
Nifty250UniverseSection          ← orchestrator (state, derived analytics, layout)
├── HeroBanner                   ← KPI summary + filter controls
├── DataProvenanceBanner         ← data-source attestation
├── RangeSelector                ← dual-slider FY window
├── UniverseEarningsPower        ← ComposedChart (topline + PAT area)
├── SectorComposition            ← ranked bar-list of sectors
├── SectorAnalyticsTable         ← full sector × metric table
├── SectorMomentumHeatmap        ← sector × FY YoY-PAT heatmap
├── TopWeightsChart              ← horizontal BarChart top-12 weights
├── GrowthValuationScatter       ← bubble chart PAT CAGR × multiple
├── ImpliedVsRealizedScatter     ← y=x fairness chart
├── MagicFormulaCard             ← Greenblatt top-12 table + scatter
├── FactorScorecard              ← top-12 factor cards (Quality/Value/Growth/Mom)
├── ConstituentLedger            ← full sortable table + CSV export
└── DrillDown                    ← per-company detail panel
    ├── ComposedChart (topline/PAT history)
    ├── FactorBar × 4
    ├── DuPontStack
    └── Reverse-Gordon narrative
```

**File locations:**

| File | Role |
|---|---|
| `src/components/sensex/Nifty250UniverseSection.tsx` | Orchestrator + state |
| `src/components/sensex/Nifty250AnalyticsCards.tsx` | HeroBanner, RangeSelector, UniverseEarningsPower, SectorComposition, TopWeightsChart, DataProvenanceBanner, SectorMomentumHeatmap, MagicFormulaCard |
| `src/components/sensex/Nifty250Charts.tsx` | SectorAnalyticsTable, GrowthValuationScatter, ImpliedVsRealizedScatter, FactorScorecard |
| `src/components/sensex/Nifty250Ledger.tsx` | ConstituentLedger, DrillDown, DuPontStack, FactorBar, ScoreChip |
| `src/data/nifty250Data.ts` | Reference dataset (seeds → hydrated constituents) |
| `src/data/sensexData.ts` | Shared TypeScript schema (`SensexConstituent`, `SensexYearFinancial`) |
| `src/utils/sensexAnalytics.ts` | All quant functions |
| `src/data/nifty250Data.test.ts` | Vitest integrity suite |

---

## 2. Data Architecture

### 2.1 Schema (`SensexConstituent`)

```typescript
interface SensexConstituent {
  id: string;                         // kebab-case unique key
  name: string;
  ticker: string;                     // NSE symbol
  sector: string;
  reportingType: 'financial' | 'nonFinancial';
  weightPct: number;                  // market-cap share of universe total
  marketCapCr: number;
  cmp: number;                        // current market price (Apr 2026 snapshot)
  valuationMetric: 'pe' | 'pb';       // pe for corporates, pb for BFSI
  valuationMultiple: number;
  dividendYieldPct: number;
  color: string;                      // sector hex (from SECTOR_COLOR palette)
  beta: number;                       // 5Y weekly vs Nifty (broker consensus)
  netDebtToEbitda?: number;           // undefined for BFSI
  history: SensexYearFinancial[];     // FY2015–FY2024 (10 rows)
}

interface SensexYearFinancial {
  fy: string;                         // 'FY2015' … 'FY2024'
  toplineCr: number;
  netProfitCr: number;
  roePct: number;
  operatingMarginPct?: number;        // missing for BFSI
  rocePct?: number;                   // missing for BFSI
}
```

### 2.2 Reference Dataset (`nifty250Data.ts`)

**Seed → Constituent pipeline:**

```
Nifty250Seed (raw anchor)
  latestToplineCr, latestNetProfitCr  (FY24 actuals)
  toplineCagrPct, profitCagrPct       (5Y trailing FY19→FY24)
  latestRoePct, latestRocePct, latestOperatingMarginPct
      ↓ buildHistory()
SensexYearFinancial[10]  (FY2015–FY2024)
  toplineCr    = scaleBack(latest, cagr, periodsBack)
  netProfitCr  = scaleBack(latest, cagr, periodsBack)
  roePct       = interpolate(firstRoe, latestRoe, index, 9)
      ↓ buildUniverse()
SensexConstituent[]  (deduplicated, mcap-weighted, sorted desc by mcap)
```

**`scaleBack` algorithm:**
```
yearsBack ≤ 4  →  plain reverse-CAGR:  latest / (1 + cagr)^yearsBack
yearsBack > 4  →  split:
  midValue = latest / (1 + cagr)^4        // exact for recent 4 years
  result   = midValue / (1 + 0.65×cagr)^(yearsBack-4)  // dampened taper
```
The 0.65 dampening factor prevents implausibly low FY2015 values for high-CAGR companies (e.g. Tata Motors, Zomato). CAGR is clamped to [−25%, +80%] to contain pathological edge cases (Laurus Labs at −50%, Nykaa at +50%).

**Universe stats (reference dataset):**
- **253 constituents** (after deduplication of `lic-housing` / `lic-housing-2`)
- **27 sectors** across Banks, NBFC, Insurance, IT, Consumer Staples, Pharma, Healthcare, Autos, Auto Components, Energy, Utilities, Metals, Cement, Materials, Industrials, Capital Goods, Aerospace & Defense, Specialty Chemicals, Chemicals, Consumer Discretionary, Consumer Durables, Real Estate, Telecom, Media, Logistics, Internet
- **Market cap range:** ₹11,000 Cr (Westlife) → ₹2,000,000 Cr (Reliance)
- **Weights:** computed as `(marketCapCr / totalMcap) × 100`; top-5 (Reliance, TCS, HDFC Bank, ICICI Bank, Bharti Airtel) hold ~30%
- **Valuation multiples range:** 0.9× P/B (Union Bank) → 600× P/E (Nykaa, PB Fintech)

### 2.3 Live Data Feed (`/data/nifty250_real.json`)

**Fetch strategy:**
```typescript
fetch('/data/nifty250_real.json')
  → json.constituents[].map(adaptNifty250Constituent)
  → setRealData(adapted); setDataSource('screener-in')
  // on failure or missing file:
  → setDataSource('reference')  // falls back to nifty250Constituents
```

**Adapter (`adaptNifty250Constituent`)** maps raw screener.in JSON fields:
```
raw.id, raw.name, raw.ticker, raw.sector
raw.reportingType, raw.weightPct, raw.marketCapCr, raw.cmp
raw.valuationMetric, raw.valuationMultiple, raw.dividendYieldPct
raw.beta, raw.color
raw.history[].{ fy, toplineCr, netProfitCr, roePct }
```
**No Zod validation** — the adapter uses `?? 0` fallbacks but does not throw on invalid shapes.

**Dynamic FY discovery:** when real data loads, fiscal years are derived from the union of all `h.fy` values across constituents (sorted), replacing the static `NIFTY250_FISCAL_YEARS` constant.

---

## 3. State Model (`Nifty250UniverseSection`)

| State variable | Type | Default | Purpose |
|---|---|---|---|
| `filter` | `'all' \| 'financial' \| 'nonFinancial'` | `'all'` | Corporate / BFSI toggle |
| `selectedId` | `string` | first constituent id | DrillDown selection |
| `sortKey` | `SortKey` | `'composite'` | Ledger sort column |
| `sortDir` | `'asc' \| 'desc'` | `'desc'` | Ledger sort direction |
| `realData` | `SensexConstituent[] \| null` | `null` | Live feed result |
| `dataSource` | `'loading' \| 'screener-in' \| 'reference'` | `'loading'` | Feed status |
| `rangeStart` | `number` | `0` | FY window start index |
| `rangeEnd` | `number` | `totalYears - 1` | FY window end index |

**Derived constants (per render):**
```
activeConstituents = realData ?? nifty250Constituents
years              = unique FY labels from activeConstituents
filteredCompanies  = activeConstituents.filter(reportingType === filter)
startFy / endFy    = years[rangeStart] / years[rangeEnd]
rangePeriods       = max(1, rangeEnd - rangeStart)
```

---

## 4. Analytics Engine (`sensexAnalytics.ts`)

### 4.1 Market Parameters
```typescript
MARKET_PARAMS = {
  riskFreeRatePct: 7.1,         // Indian 10Y G-Sec, Apr 2026
  equityRiskPremiumPct: 5.5,    // Damodaran Jan 2026
  maxTerminalGrowthPct: 7.0,    // GDP growth ceiling
  minImpliedGrowthPct: -2.0,    // floor for Gordon solve
}
```

### 4.2 CAPM Cost of Equity
```
CoE = Rf + β × ERP = 7.1 + β × 5.5
```
Range in universe: **9.3%** (Power Grid, β=0.55) → **15.6%** (Vodafone, β=1.55)

### 4.3 Reverse-Gordon Implied Growth

**For P/E companies:**
```
P/E = payout / (r − g)
payout ≈ dividendYield × P/E    [capped at 0.95]
g = r − payout / P/E
```

**For P/B banks/NBFCs:**
```
P/B = (ROE − g) / (r − g)
g = (r × P/B − ROE) / (P/B − 1)
```
Both clamped to `[minImpliedGrowthPct, min(maxTerminalGrowthPct, r − 0.5)]`.

> [!NOTE]
> The PE route conflates payout ratio with dividend yield × P/E, which underestimates payout for buyback-heavy names (TCS, Infosys). This systematically overstates implied growth for IT majors.

### 4.4 Factor Scores (0–100 percentile ranks)

| Factor | Components | Weighting |
|---|---|---|
| **Quality** | Latest ROE, inverse earnings volatility, leverage headroom | Equal (1/3 each) |
| **Value** | Inverse valuation multiple, dividend yield | Equal (1/2 each) |
| **Growth** | PAT CAGR (range window), Topline CAGR (range window) | Equal (1/2 each) |
| **Momentum** | PAT acceleration (3Y CAGR − full CAGR), operating margin delta | Equal (1/2 each) |
| **Composite** | Average of all four factors | Equal (1/4 each) |

**Leverage proxy by type:**
- `nonFinancial`: `−netDebtToEbitda` (lower leverage → higher score)
- `financial`: `ROE / 2` (higher ROE = stronger capital adequacy proxy)

**Earnings volatility** = population σ of YoY PAT growth rates (requires ≥ 3 years of history; 0 otherwise).

### 4.5 Greenblatt Magic Formula

```
Capital Efficiency:
  nonFinancial  → rocePct (fallback: roePct) from latest FY
  financial     → roePct from latest FY

Earnings Yield:
  P/E names     → 100 / P/E
  P/B names     → ROE / P/B  (bank equivalent of E/P)

Combined rank   = ordinalRank(capEff) + ordinalRank(earningsYield)
                  (lower = better; rank 1 = universe best)
```

### 4.6 Valuation Z-Score
```
Bucket: sector × valuationMetric   (P/E and P/B z-scored separately)
z = (multiple − sectorMedian) / MAD
  where MAD = median(|xi − median|)
  scale = MAD if MAD > 1e-6, else max(median × 0.15, 1)
```
Negative z = cheaper than sector midpoint. Threshold: ≤ −0.5σ (green) / ≥ +0.5σ (red).

### 4.7 Concentration (HHI)
```
HHI = Σ (normalised_weightPct²)    [on 0–10,000 scale]
Effective N = 10,000 / HHI
```
Reference universe HHI ≈ **150–200** (well-diversified; Sensex HHI ≈ 600).

### 4.8 DuPont Decomposition (corporates only)
```
NPM = netProfitCr / toplineCr × 100
ROE contribution split:
  NPM bar                    = NPM %
  Efficiency + Leverage bar  = ROE − NPM   (residual; captures turnover × leverage)
```
Skipped for `reportingType === 'financial'` (NPM on revenue not meaningful for banks).

### 4.9 Sector Momentum Heatmap
```
For each sector × FY pair (FY2016 … FY2024):
  aggregatePAT[fy] = Σ constituent.history[fy].netProfitCr
  YoY% = (aggregate[t] − aggregate[t-1]) / aggregate[t-1] × 100
```
Color scale: `rgba(239,68,68,α)` for negative → `rgba(34,197,94,α)` for positive, capped at ±60% for readability.

---

## 5. Rendering Pipeline (key `useMemo` graph)

```
filteredCompanies
  ├── indexSeries      (buildSensexIndexTimeSeries)
  ├── sectorSummary    (buildSensexSectorSummary)
  ├── sectorAnalytics  (buildSectorAnalytics — range-dependent)
  ├── concentration    (computeConcentration)
  ├── factorScores     (buildFactorScores — range-dependent)
  ├── magicFormula     (buildMagicFormulaRanks)
  ├── sectorMomentum   (buildSectorMomentumGrid)
  ├── valuationZ       (buildValuationZScores)
  └── rows             (per-company row vector — range-dependent)
        └── sortedRows (sort on rows)
```

**Range-dependent memos** (`sectorAnalytics`, `factorScores`, `rows`) recompute on every slider change. With 253 companies × 10 FY rows each, this is O(n) and well within browser performance budgets, but sorting `rows` (O(n log n)) on every keystroke/slider tick should be watched.

---

## 6. Known Limitations & Issues

### 6.1 Data Fidelity

| Issue | Severity | Detail |
|---|---|---|
| **Reconstructed history** | Medium | FY2015–FY2019 are algorithmically back-projected, not sourced from filings. Companies with non-monotone histories (Biocon, Laurus, UPL, Vodafone) show implausible FY15 values. |
| **Negative PAT seeds uncapped** | Medium | Stocks with negative FY24 PAT (Vodafone −₹31,238 Cr, UPL −₹1,373 Cr, PVR INOX −₹36 Cr, ABFRL −₹735 Cr, Paytm −₹1,422 Cr) produce invalid CAGR calculations because `scaleBack` guards for `latest ≤ 0` but `cagr()` in `sensexAnalytics.ts` also guards `start ≤ 0 or end ≤ 0`, returning 0 — **so these companies always show 0% CAGR, suppressing their real volatility story**. |
| **Weight inflation** | Low | `weightPct` is computed as `mcap / totalMcap` of the 253-name subset, not the actual Nifty LargeMidcap 250 float-adjusted index methodology. This means Reliance (₹20L Cr) holds ~5.5% when actual index weight is ~4.5%. |
| **Duplicate LIC Housing** | Low | `id: 'lic-housing'` and `id: 'lic-housing-2'` both appear in `SEEDS_RAW`; the dedup loop in `buildUniverse` silently drops the second. Ticker `LICHOUSE` is not a real NSE symbol. |
| **Stale CMP / multiples** | Low | All `cmp`, `valuationMultiple`, `dividendYieldPct` are Apr 2026 snapshots hardcoded in the TS file. No mechanism to refresh without editing source. |

### 6.2 Model Assumptions

| Issue | Severity | Detail |
|---|---|---|
| **Gordon model for growth firms** | Medium | P/E names with near-zero or no dividend (Zomato, Nykaa, PB Fintech) have `payout ≈ 0`, making `g ≈ r ≈ 9–10%`. This is meaningless — the Gordon model does not apply to pre-payout compounders. |
| **No runtime schema validation** | Medium | `adaptNifty250Constituent` uses `?? 0` fallbacks. A malformed `nifty250_real.json` (wrong field name, null history) will silently produce an all-zero constituent rather than surfacing an error. |
| **BFSI leverage proxy** | Low | Using `ROE / 2` as a capital strength proxy for banks conflates profitability with capital adequacy. A more accurate proxy would be CET1 ratio or Tier-1 capital, which are not in the schema. |
| **Momentum factor: margin delta** | Low | `marginDelta` uses `history[max(rangeStart, h.length - 6)]` as the "past" margin. For BFSI names `operatingMarginPct` is `undefined`, so `pastM = latestM - 0 = 0`, always producing a delta of 0. This zeros out the margin sub-score for all 60+ BFSI names. |
| **Payout ratio cap** | Low | `Math.min(0.95, dividendYield × P/E)` can exceed 0.95 for high-yield PSU stocks (IOC yield 8.1% × P/E 5.6 = 0.45 — fine, but Coal India yield 5.6% × P/E 8 = 0.45 — also fine). The cap is correct but undocumented. |

### 6.3 Component / Code Quality

| Issue | Severity | Detail |
|---|---|---|
| **`Kpi` duplicated** | Low | Identical `Kpi` component defined in both `Nifty250AnalyticsCards.tsx` (line 118) and `Nifty250Ledger.tsx` (line 337). |
| **`FactorBar` duplicated** | Low | Identical `FactorBar` in both `Nifty250Charts.tsx` (line 229) and `Nifty250Ledger.tsx` (line 324). |
| **`any` types in charts** | Low | `GrowthValuationScatter` and `ImpliedVsRealizedScatter` receive `data: any[]` props — no type safety for chart payload shape. |
| **eslint-disable comments** | Low | Two `eslint-disable-line react-hooks/exhaustive-deps` suppressions in `Nifty250UniverseSection.tsx` (lines 84, 118) — the dep arrays are intentionally partial but this suppresses future regression warnings. |
| **`sectorMcap` dead variable** | Low | `sectorMcap` computed in `buildSectorMomentumGrid` (line 508) is immediately `void`-suppressed — dead code from an earlier weight scheme. |
| **Ledger max-height hardcoded** | Low | `max-h-[560px]` on the constituent ledger table is a magic number; at small screen heights this can clip rows without providing a scroll indicator. |

---

## 7. Improvement Backlog (Prioritised)

### P1 — Correctness

| # | Change | File(s) |
|---|---|---|
| 1.1 | Add **Zod schema validation** to `adaptNifty250Constituent`; surface parse errors as a user-visible warning rather than silently zeroing fields. | `Nifty250UniverseSection.tsx` |
| 1.2 | Handle **negative-PAT companies** in `scaleBack` and `cagr()` — flag them with a `hasNegativePat` boolean on the row so the Ledger can show a red "N/A" instead of "0.0%". | `nifty250Data.ts`, `sensexAnalytics.ts`, `Nifty250Ledger.tsx` |
| 1.3 | Fix **BFSI momentum margin score** — skip `marginDelta` for `financial` types and substitute a banking-specific momentum signal (e.g. NIM trend or ROE YoY change). | `sensexAnalytics.ts` |
| 1.4 | Flag **Gordon-inapplicable names** (payout ≈ 0, high-growth) in `ImpliedVsRealizedScatter` tooltip with a caveat: "Gordon model unreliable — near-zero payout". | `Nifty250Charts.tsx` |

### P2 — Data Quality

| # | Change | File(s) |
|---|---|---|
| 2.1 | Remove duplicate `lic-housing-2` seed and fix ticker to `LICHSGFIN`. | `nifty250Data.ts` |
| 2.2 | Add a `lastUpdated` timestamp field to `NIFTY250_PROVENANCE` and surface it in the `DataProvenanceBanner` so users know when the snapshot was taken. | `nifty250Data.ts`, `Nifty250AnalyticsCards.tsx` |
| 2.3 | Extend `SensexYearFinancial` with optional `debtToEquity?: number` for corporate constituents to enable a proper leverage quality signal. | `sensexData.ts`, `nifty250Data.ts` |

### P3 — Code Quality

| # | Change | File(s) |
|---|---|---|
| 3.1 | Extract `Kpi` and `FactorBar` to `src/components/sensex/shared/` to eliminate duplication. | New file, 4 import sites |
| 3.2 | Type the scatter chart data props (`data: GrowthValuationPoint[]` etc.) instead of `any[]`. | `Nifty250Charts.tsx` |
| 3.3 | Replace `sectorMcap` dead variable with `void 0` or remove the line. | `sensexAnalytics.ts` |

### P4 — UX / Features

| # | Change | Files |
|---|---|---|
| 4.1 | **Search bar** on the Constituent Ledger to filter by name/ticker without changing the sector filter. | `Nifty250Ledger.tsx` |
| 4.2 | **Pagination** on the Constituent Ledger (currently renders all 250 rows into a scrollable div — fine today but slow if real data grows). | `Nifty250Ledger.tsx` |
| 4.3 | **Peer comparison mode** in DrillDown — show selected company's factor bars alongside sector-median bars on the same chart. | `Nifty250Ledger.tsx` |
| 4.4 | **Colour-blind-safe palette** — the current red/green heatmap is inaccessible; add a toggle to use a blue/orange scheme. | `Nifty250AnalyticsCards.tsx` |
| 4.5 | **Export all analytics** (not just ledger) to a multi-sheet XLSX or ZIP of CSVs including sector analytics, magic formula rankings, factor scores. | New util |

---

## 8. Test Coverage

Current tests in `nifty250Data.test.ts`:

| Test | Assertion |
|---|---|
| Constituent count | 200 ≤ n ≤ 400 |
| Weight sort | descending by `weightPct` |
| Required fields | id, name, ticker, sector, reportingType, weightPct > 0, marketCapCr > 0, cmp > 0, valuationMetric, valuationMultiple > 0, beta > 0, color starts with #, history.length > 0 |
| Unique tickers | Set size === array length |
| FY range | starts FY2015, ends FY2024, exactly 10 years |
| FY pattern | matches `/^FY\d{4}$/` |
| History values | finite, non-NaN; toplineCr ≥ 0 |
| Sector colour consistency | same sector → same hex across all constituents |

**Gaps in test coverage:**
- No test for `netProfitCr` sign (negative PAT companies pass the finite check)
- No test for `valuationMultiple > 0` (seeds are all positive but no guard in `buildUniverse`)
- No test for `sensexAnalytics.ts` functions (CAPM, Gordon, factor scores, HHI, z-scores)
- No test for the `adaptNifty250Constituent` adapter
- No test verifying `totalWeight` sums to ~100%

---

## 9. Data Flow Summary

```
[Public JSON: /data/nifty250_real.json]
          │ fetch (AbortController)
          ▼
adaptNifty250Constituent()        [no schema validation]
          │
          ▼
realData: SensexConstituent[]     ←── or fallback ──── nifty250Constituents (static)
          │
          ▼
activeConstituents
  → filter(reportingType)         → filteredCompanies
  → buildSensexIndexTimeSeries    → indexSeries
  → buildSensexSectorSummary      → sectorSummary
  → buildSectorAnalytics          → sectorAnalytics    [range-dep]
  → computeConcentration          → concentration
  → buildFactorScores             → factorScores       [range-dep]
  → buildMagicFormulaRanks        → magicFormula
  → buildSectorMomentumGrid       → sectorMomentum
  → buildValuationZScores         → valuationZ
  → rows[]                        [range-dep]
    → sortedRows[]
          │
          ▼
UI Components (recharts, tables, drill-down)
```
