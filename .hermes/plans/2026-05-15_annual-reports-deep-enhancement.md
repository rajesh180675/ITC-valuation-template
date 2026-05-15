# Annual Reports Section — Deep Enhancement Spec

**Status:** Draft for Kimi implementation
**Author:** Opus 4.7 (architecture + design)
**Target file count:** ~25 new files / ~10 modified
**Estimated LOC:** ~6,500 net new
**Phasing:** 7 phases, each independently shippable

---

## 0. Spec Conventions & Implementation Rules

Read this section before writing any code.

1. **Module convention:** Each major analytics domain gets its own pure-TS file in `src/utils/ar/` and a sibling test in `src/utils/ar/__tests__/`. UI components go in `src/components/sensex/ar/` (move existing extracted views in Phase 0).
2. **Pure functions only** in `src/utils/ar/`. No React, no fetch, no DOM. They take typed inputs, return typed outputs.
3. **Null-safety:** Every numeric computation must handle `null | undefined | 0 | NaN | Infinity`. Use the helpers in `src/utils/ar/safe.ts` (Phase 0). Never return NaN or Infinity from public functions.
4. **No silent fallbacks:** When a derivation can't be computed, return `null` and surface a `dataQualityFlag` on the row. Never paper over with zero.
5. **Currency:** All ₹ values in **Crores (Cr)**, internal type alias `Cr = number`. Per-share values in **₹** (rupees). Yields/returns/margins in **percent (0-100)**, never as fractions, except where the schema explicitly says fraction (clearly labeled). Keep unit conventions explicit on every interface.
6. **Year keys:** Always `FYxxxx` strings sortable lexicographically. Never use raw numeric years internally.
7. **Determinism:** Any randomized routine (Monte Carlo) seeds via mulberry32 — never `Math.random()` directly. The default seed lives in `MODEL_DEFAULTS`.
8. **Tests required for:** every util function in `src/utils/ar/`. Aim for 1 happy path + 2 edge cases (null inputs, zero inputs) per public function.
9. **Diagnostic tags:** Each phase ends with `npx tsc --noEmit && npm run build && npx vitest --run` all green before merging.
10. **Backward compat:** The existing `AnnualReportYearData` schema in `annualReportCashFlow.ts` is the source of truth — extend it, don't reshape it.

---

## 1. Current State Snapshot

### 1.1 What exists today (post-refactor on `main`)
- `AnnualReportsSection.tsx` (463 lines) — orchestrator: data fetch, ticker selection, KPI strip, tab routing.
- `OverviewTab.tsx` — sparkline KPIs + segment mini-donut + ratio table.
- `RatiosTab.tsx` — margin/return/DuPont charts with bank vs non-bank branching.
- `CashFlowView.tsx` — CFO/FCF cards, conversion trend, waterfall bridge, statement.
- `ChartsView.tsx` — revenue/profit/margin/YoY grid.
- `BalanceSheetSideBySide.tsx` — assets vs equity-liabilities latest year.
- `DataDrivenTable.tsx` — generic statement table with YoY + CAGR + common-size.
- `SegmentsView.tsx` — ITC-only stacked area + donut + ROCE bars + scatter.
- `ChartPanel.tsx`, `KpiCard.tsx`, `ErrorBoundary.tsx`, `LoadingSkeleton.tsx`, `SegmentMiniDonut.tsx`, `TrendChart.tsx`, `utils.ts`.
- Utilities: `annualReportCashFlow.ts`, `annualReportRatios.ts`, `annualReportSegments.test.ts`.
- 1,913 ticker JSONs in `public/data/ar/`.
- Auxiliary data: `itc_live_quote.json`, `itc_price_history.json`, `peers_data.json`, `segment_data_itc.json`.

### 1.2 Gaps from a buyside / equity research perspective

| Domain | Gap |
|---|---|
| Valuation | Zero per-ticker valuation (DCF, RIM, EVA, multiples, reverse-DCF). The ITC `ValuationSection` is hardcoded to ITC's own dataset. |
| Forecasts | No projection model. P&L/BS/CF history has no forward view. |
| Quality of earnings | No accruals analysis, no Beneish M-Score, no Sloan accruals ratio, no earnings persistence. |
| Bankruptcy / distress | No Altman Z, Piotroski F-score, or Ohlson O-score. |
| Capital intensity | No reinvestment rate, no incremental ROIC, no growth-decomposition (ROIC × reinvestment). |
| Working capital | No CCC, DSO/DPO/DIO breakdown, no NWC trend. |
| Capital structure | No interest-coverage timeline, no debt-maturity wall (when notes provide it), no FFO/Debt. |
| Comparables | No peer-relative table; the existing `peers_data.json` is not consumed. |
| Fundamental scoring | No composite quality/value/growth/momentum/risk score per ticker. |
| Charts | No drawdown chart, no rolling-window ratios, no scatter clusters with peer overlay, no contribution-to-growth waterfalls. |
| Audit trail | No "as-restated" reconciliation, no per-line note linkage to PDF page. |
| Export | No CSV / XLSX / PDF report export. |
| Time travel | No "what-if I held since FYxx" cumulative-return overlay against price history. |
| Watchlist & alerts | No save/star, no diff between two companies on same screen. |
| Segments | ITC-only. Logic should generalize to any company that has segment data. |
| Annual report PDF integration | PDF files are uploaded but never linked to the line items. |
| Dividend & buyback | `itc_dividend_history.json` exists but is not consumed in this section. |
| Inflation/real-terms toggle | All numbers are nominal; no inflation-adjusted view. |

---

## 2. Goals & Non-Goals

**Goals**
- Make this section the single best free-tier Indian-listed-company financial workbench.
- Cover any of the 1,913 tickers without ITC hardcoding.
- Ship buyside-grade valuation: 3-statement projection → DCF + multiples + RIM + EVA + reverse-DCF.
- Expose forensic-accounting heuristics (Beneish, Sloan, Altman, Piotroski, accruals quality).
- Respect the existing data shape — extend, don't break.

**Non-Goals (out of scope for this spec)**
- Real-time intraday market data (live ticks).
- Options chain / derivatives analytics.
- Anything that requires live broker API.
- ML-based scoring or LLM calls.
- Currency conversion for non-INR statements.

---

## 3. Architecture

### 3.1 Folder layout (after enhancement)

```
src/
├── components/sensex/
│   ├── AnnualReportsSection.tsx          (orchestrator, ~500 lines)
│   ├── ar/                                (NEW — group all AR tab views)
│   │   ├── tabs/
│   │   │   ├── OverviewTab.tsx           (move existing)
│   │   │   ├── PnLTab.tsx                (NEW — wraps DataDrivenTable + accruals strip)
│   │   │   ├── BalanceSheetTab.tsx       (NEW — wraps BalanceSheetSideBySide + capital structure)
│   │   │   ├── CashFlowTab.tsx           (move existing CashFlowView)
│   │   │   ├── SegmentsTab.tsx           (move existing SegmentsView, generalized)
│   │   │   ├── ChartsTab.tsx             (move existing ChartsView)
│   │   │   ├── RatiosTab.tsx             (move existing)
│   │   │   ├── ValuationTab.tsx          (NEW — DCF/RIM/Multiples/Reverse)
│   │   │   ├── QualityTab.tsx            (NEW — Beneish/Altman/Piotroski/Accruals)
│   │   │   ├── ForecastsTab.tsx          (NEW — 3-stmt projection + assumptions)
│   │   │   ├── PeersTab.tsx              (NEW — peer comparison)
│   │   │   ├── DividendsTab.tsx          (NEW — payout history + sustainability)
│   │   │   └── ReportsTab.tsx            (NEW — PDF index + line-item provenance)
│   │   ├── shared/
│   │   │   ├── ChartPanel.tsx            (move)
│   │   │   ├── KpiCard.tsx               (move)
│   │   │   ├── KpiStrip.tsx              (NEW — shared KPI row)
│   │   │   ├── DataQualityBadge.tsx      (NEW — small ⚠ chip with tooltip)
│   │   │   ├── ErrorBoundary.tsx         (move)
│   │   │   ├── LoadingSkeleton.tsx       (move)
│   │   │   ├── ProvenanceTooltip.tsx     (NEW — links FY value to PDF page + label)
│   │   │   ├── ValueCell.tsx             (NEW — formats Cr/₹/%/x with null + sign coloring)
│   │   │   ├── HeatmapCell.tsx           (NEW)
│   │   │   ├── ExportMenu.tsx            (NEW)
│   │   │   └── CompanySelector.tsx       (NEW — extract from AnnualReportsSection)
│   │   ├── tables/
│   │   │   ├── DataDrivenTable.tsx       (move)
│   │   │   ├── BalanceSheetSideBySide.tsx(move)
│   │   │   └── PeerCompareTable.tsx      (NEW)
│   │   └── charts/
│   │       ├── TrendChart.tsx            (move)
│   │       ├── SegmentMiniDonut.tsx      (move)
│   │       ├── WaterfallChart.tsx        (NEW — generalize from CashFlowWaterfall)
│   │       ├── DrawdownChart.tsx         (NEW)
│   │       ├── HeatmapChart.tsx          (NEW)
│   │       ├── DupontStack.tsx           (NEW)
│   │       ├── BridgeChart.tsx           (NEW — used by valuation)
│   │       ├── SensitivityHeatmap.tsx    (NEW)
│   │       └── PriceVsBookChart.tsx      (NEW — needs price history)
│   └── … (existing non-AR files unchanged)
├── utils/ar/                              (NEW — pure analytics)
│   ├── safe.ts                            (safeDiv/safePct/safeSub/safeSum/cagr/yoy)
│   ├── kpiResolver.ts                     (fallback chain: kpIs → items by label → null)
│   ├── derivedKPIs.ts                     (EBITDA, NOPAT, NWC, IC, NetDebt, FCF*)
│   ├── ratios.ts                          (refactor existing annualReportRatios.ts)
│   ├── ratiosDuPont.ts                    (5-step DuPont)
│   ├── ratiosWorkingCapital.ts            (DSO, DPO, DIO, CCC)
│   ├── ratiosCapitalStructure.ts          (intCov, FFO/Debt, debtMix)
│   ├── accruals.ts                        (Sloan, Richardson, accrual quality)
│   ├── beneish.ts                         (M-Score 8-variable)
│   ├── altman.ts                          (Z, Z', Z" for India)
│   ├── piotroski.ts                       (F-score 9 components)
│   ├── ohlson.ts                          (O-score)
│   ├── projection.ts                      (3-stmt forecasting engine)
│   ├── valuationDCF.ts                    (FCFF DCF + mid-year + terminal)
│   ├── valuationRIM.ts                    (Residual Income)
│   ├── valuationEVA.ts                    (Economic Value Added stream)
│   ├── valuationMultiples.ts              (P/E, EV/EBITDA, P/B, EV/Sales, dividend yield)
│   ├── valuationReverse.ts                (solve growth that justifies price)
│   ├── monteCarlo.ts                      (mulberry32 + Iman-Conover correlated draws)
│   ├── peerCompare.ts                     (load peers_data.json, normalize)
│   ├── segmentsGeneric.ts                 (works for any ticker that has segments)
│   ├── dividendsAnalytics.ts              (yield, payout, growth, sustainability)
│   ├── inflationAdjust.ts                 (CPI deflator → real terms)
│   ├── exportCSV.ts                       (CSV serializer)
│   ├── exportXLSX.ts                      (lightweight XLSX via SheetJS-style minimal)
│   ├── compositeScore.ts                  (Quality/Value/Growth/Risk composite)
│   ├── universe.ts                        (consume company_index.json with sector tags)
│   └── __tests__/
│       └── *.test.ts                      (one test file per util)
└── data/ar/
    └── inflationCPI.ts                    (NEW — India CPI series, hardcoded annual)
```

### 3.2 Data flow

```
public/data/ar/<TICKER>.json
       │
       ▼
┌─────────────────────┐
│  fetchAnnualReport  │ ← in AnnualReportsSection.tsx
└──────────┬──────────┘
           │ AnnualReportDataFile
           ▼
┌─────────────────────┐
│  derivedKPIs.ts     │ ← computes EBITDA, NOPAT, NWC, NetDebt, FCFF/E
│  kpiResolver.ts     │
└──────────┬──────────┘
           │ DerivedFinancials[]
           ▼
   ┌───────┴───────┬───────┬───────┬───────┐
   ▼               ▼       ▼       ▼       ▼
ratios.ts   accruals.ts  altman piotr.  beneish
   │               │       │       │       │
   ▼               ▼       ▼       ▼       ▼
   └───────────────┴───────┴───────┴───────┘
                   │
          QualityScores + Ratios
                   │
   ┌───────────────┼─────────────────┐
   ▼               ▼                 ▼
projection.ts  valuationDCF.ts  peerCompare.ts
   │               │                 │
   ▼               ▼                 ▼
   ProjectedFinancials  Valuations  PeerStats
                   │
                   ▼
              UI tabs (read-only)
```

All analytics happen in `useMemo` in tab components, computed once per (ticker, displayYears, assumptions).

### 3.3 Shared assumption store

`AnnualReportsSection.tsx` owns top-level state for all tabs:

```typescript
interface ARSectionState {
  ticker: string;
  selectedYears: string[];
  commonSize: boolean;
  realTerms: boolean;          // NEW — inflation-adjusted toggle
  unitsScale: 'cr' | 'mn' | 'bn'; // NEW — display scale
  assumptions: ProjectionAssumptions;  // NEW — shared between Forecasts and Valuation tabs
  starred: Set<string>;        // NEW — watchlist persisted to localStorage
}
```

`assumptions` are surfaced via `<AssumptionsBar>` (a sticky sidebar/drawer in tabs that need it). The bar persists per-ticker to `localStorage` under `ar.assumptions.<TICKER>`.

---

## 4. Phase Plan

Each phase is independently shippable. Verification gate at end of each phase.

| Phase | Theme | Files | LOC est | Verify |
|-------|-------|-------|---------|--------|
| 0 | Foundation: folders, safe helpers, kpiResolver, derivedKPIs, generalize existing | 12 | 800 | tsc + tests + build + visual unchanged |
| 1 | Quality of earnings: Beneish, Sloan accruals, Altman, Piotroski, Ohlson + Quality tab | 11 | 1,200 | tests + visual smoke on ITC, RELIANCE, HDFCBANK |
| 2 | Working capital, capital structure, advanced ratios | 6 | 600 | tests + RatiosTab now shows new charts |
| 3 | Forecasting engine + Forecasts tab | 6 | 1,000 | tests + Forecasts tab loads for ITC |
| 4 | Valuation engines + Valuation tab + Reverse-DCF + Sensitivity heatmap | 9 | 1,400 | tests + Valuation tab works for ITC, INFY |
| 5 | Peers tab + composite score + dividend tab | 7 | 700 | tests + Peers tab works for ITC |
| 6 | Reports tab (PDF index), Export, Provenance tooltips, Inflation toggle | 8 | 600 | manual click-through |
| 7 | Polish: starred watchlist, two-company side-by-side, drawdown chart, segments-generic | 6 | 500 | manual click-through |

---

## 5. Phase 0 — Foundation

### 5.1 Folder reorganization
1. Create `src/components/sensex/ar/{tabs,shared,tables,charts}` directories.
2. **Move** (use `smartRelocate` to preserve imports):
   - `OverviewTab.tsx` → `ar/tabs/OverviewTab.tsx`
   - `RatiosTab.tsx` → `ar/tabs/RatiosTab.tsx`
   - `CashFlowView.tsx` → `ar/tabs/CashFlowTab.tsx`
   - `SegmentsView.tsx` → `ar/tabs/SegmentsTab.tsx`
   - `ChartsView.tsx` → `ar/tabs/ChartsTab.tsx`
   - `BalanceSheetSideBySide.tsx` → `ar/tables/BalanceSheetSideBySide.tsx`
   - `DataDrivenTable.tsx` → `ar/tables/DataDrivenTable.tsx`
   - `ChartPanel.tsx`, `KpiCard.tsx`, `ErrorBoundary.tsx`, `LoadingSkeleton.tsx` → `ar/shared/`
   - `SegmentMiniDonut.tsx`, `TrendChart.tsx` → `ar/charts/`
   - `utils.ts` → keep or move to `ar/shared/utils.ts`
3. Verify build still passes.

### 5.2 `src/utils/ar/safe.ts`

```typescript
export type Cr = number;          // currency in Crores
export type Pct = number;          // 0..100
export type Ratio = number;        // unitless
export type Years = number;        // count of periods

/** Safe division. Returns null on null/zero/non-finite. */
export function safeDiv(a: number | null | undefined, b: number | null | undefined): number | null;

/** Safe percentage = safeDiv * 100, rounded to 2dp. Returns null if either input is null. */
export function safePct(a: number | null | undefined, b: number | null | undefined): Pct | null;

/** Safe subtraction. Returns null if either input is null. */
export function safeSub(a: number | null | undefined, b: number | null | undefined): number | null;

/** Safe sum. Skips nulls. Returns null if all inputs are null. */
export function safeSum(...xs: (number | null | undefined)[]): number | null;

/** Safe arithmetic mean. */
export function safeMean(xs: (number | null | undefined)[]): number | null;

/** Safe geometric mean (only over positive values). */
export function safeGeomean(xs: (number | null | undefined)[]): number | null;

/** CAGR = (last/first)^(1/(n-1)) - 1, in %. Returns null on null/non-positive. */
export function cagrPct(first: number | null, last: number | null, periods: Years): Pct | null;

/** YoY % change. */
export function yoyPct(curr: number | null, prev: number | null): Pct | null;

/** Round to N decimals, preserving null. */
export function round(x: number | null | undefined, dp = 2): number | null;

/** Clamp x to [lo, hi]. */
export function clamp(x: number, lo: number, hi: number): number;

/** Linear interpolate between a and b at t in [0,1]. */
export function lerp(a: number, b: number, t: number): number;

/** Z-score against a series. */
export function zscore(x: number, series: number[]): number | null;

/** Min-max normalize a value against a series, returns 0..1. */
export function rankPct(x: number, series: number[]): number | null;
```

Tests cover: null inputs, zero denom, NaN propagation, Infinity guard, CAGR with 0 first / negative first / single period.

### 5.3 `src/utils/ar/kpiResolver.ts`

Centralized fallback chain. Anywhere we need a KPI, we go through this. Bank-vs-non-bank branching lives here, not scattered.

```typescript
export interface ResolvedKPI {
  value: number | null;
  source: 'kpis' | 'item' | 'derived' | 'missing';
  itemLabel?: string;          // when source === 'item'
  derivation?: string;         // when source === 'derived'
  fy: string;
}

export interface KPIResolver {
  revenue(fy: string): ResolvedKPI;       // revenueCr → totalIncomeCr (banks) → search items
  pat(fy: string): ResolvedKPI;
  pbt(fy: string): ResolvedKPI;
  ebitda(fy: string): ResolvedKPI;        // pbt + finCost + depr
  ebit(fy: string): ResolvedKPI;          // pbt + finCost
  totalAssets(fy: string): ResolvedKPI;
  equity(fy: string): ResolvedKPI;
  totalDebt(fy: string): ResolvedKPI;     // borrowings (current + non-current)
  netDebt(fy: string): ResolvedKPI;       // totalDebt - cash
  cash(fy: string): ResolvedKPI;          // cash + ce + bank balances
  workingCapital(fy: string): ResolvedKPI;// (CA - cash) - (CL - shortDebt)
  cfo(fy: string): ResolvedKPI;
  cfi(fy: string): ResolvedKPI;
  cff(fy: string): ResolvedKPI;
  capex(fy: string): ResolvedKPI;
  fcf(fy: string): ResolvedKPI;            // cfo - |capex|
  dividendsPaid(fy: string): ResolvedKPI;
  // bank-specific
  netInterestIncome(fy: string): ResolvedKPI;
  provisions(fy: string): ResolvedKPI;
  // ITC-style
  segmentRevenue(fy: string, segment: string): ResolvedKPI;
}

export function makeKPIResolver(data: Record<string, AnnualReportYearData>): KPIResolver;
```

Each method tries: (1) `kpIs` field, (2) item label search using a curated alias list per metric, (3) safe derivation if possible, else `null`. Records the source for provenance.

Add aliases dictionary in same file:
```typescript
const REVENUE_ALIASES = ['revenue from operations', 'sales', 'total income', 'gross income'];
const PAT_ALIASES = ['profit for the year', 'net profit after tax', 'profit/(loss) for the year', 'net profit'];
// … etc
```

### 5.4 `src/utils/ar/derivedKPIs.ts`

```typescript
export interface DerivedFinancialsRow {
  fy: string;
  // P&L
  revenue: Cr | null;
  ebitda: Cr | null;
  ebit: Cr | null;
  pbt: Cr | null;
  pat: Cr | null;
  netInterestIncome: Cr | null;     // banks
  // Balance Sheet
  totalAssets: Cr | null;
  equity: Cr | null;
  totalDebt: Cr | null;
  netDebt: Cr | null;
  cash: Cr | null;
  workingCapital: Cr | null;        // operating NWC
  investedCapital: Cr | null;       // equity + total debt - cash
  // Cash Flow
  cfo: Cr | null;
  cfi: Cr | null;
  cff: Cr | null;
  capex: Cr | null;                 // signed: outflow negative
  fcf: Cr | null;                   // cfo - |capex|
  fcfe: Cr | null;                  // fcf - net debt repayments + new debt
  dividendsPaid: Cr | null;
  // Derived ratios live in ratios.ts, not here
  isFinancial: boolean;
  qualityFlags: string[];           // e.g. ['REVENUE_MISSING', 'PAT_FROM_ITEM_LABEL']
}

export function buildDerivedFinancials(
  data: Record<string, AnnualReportYearData>,
  years: string[],
): DerivedFinancialsRow[];
```

This becomes the canonical input for **every** downstream analytic. Replace direct `kpIs.*` reads in current `RatiosTab` etc with this.

### 5.5 Generalize `SegmentsTab`

Currently hardcoded to ITC. Make it consume `public/data/segment_data_<ticker>.json` (lowercase ticker). When file is missing, show "No segment data available for {ticker}". Move `SEGMENT_DONUT_ORDER` to a per-ticker config file `src/data/ar/segmentOrder.ts`:

```typescript
export const SEGMENT_DONUT_ORDER: Record<string, string[]> = {
  ITC: ['FMCG - Cigarettes', 'FMCG - Others', 'Agri Business', 'Paperboards, Paper and Packaging', 'Others'],
  RELIANCE: ['Oil to Chemicals', 'Digital Services', 'Retail', 'Oil & Gas', 'Others'],
  // … extend as we identify
};
export const getSegmentOrder = (ticker: string): string[] => SEGMENT_DONUT_ORDER[ticker] ?? [];
```

When no order is defined, sort donut by descending value.

### 5.6 Verification gate
- `npx tsc --noEmit` clean
- `npm run build` clean
- `npx vitest --run` clean
- Visual: ITC tab still renders identically (Overview, P&L, BS, CF, Segments, Charts, Ratios all working).

---

## 6. Phase 1 — Quality of Earnings

### 6.1 Quality tab structure

Tab key: `'quality'`. Position right after `'ratios'` in `TABS` array.

Layout (top to bottom):
1. **Composite Quality Strip** — 4 large score cards (Beneish, Altman, Piotroski, Sloan accruals) with traffic-light color coding.
2. **Beneish M-Score Panel** — 8-component bar chart + line of M over time.
3. **Altman Z-Score Panel** — Z + Z' + Z" tracks over time with three threshold bands shaded.
4. **Piotroski F-Score Panel** — 9 boolean checks with green/red ticks per year.
5. **Sloan Accruals Panel** — total accruals / avg total assets, plus working-capital accruals decomposition.
6. **Ohlson O-Score** — single line chart with bankruptcy probability shading.
7. **Earnings Persistence Panel** — regression of next-year PAT on current PAT, R² printed.

### 6.2 Beneish M-Score (`src/utils/ar/beneish.ts`)

8 indices computed year-over-year (need t and t-1):

| Variable | Formula |
|---|---|
| DSRI | (AR_t / Sales_t) / (AR_{t-1} / Sales_{t-1}) |
| GMI | GM_{t-1} / GM_t |
| AQI | (1 - (CA + PPE)_t / TA_t) / (1 - (CA + PPE)_{t-1} / TA_{t-1}) |
| SGI | Sales_t / Sales_{t-1} |
| DEPI | (Depr_{t-1} / (Depr_{t-1} + PPE_{t-1})) / (Depr_t / (Depr_t + PPE_t)) |
| SGAI | (SGA_t / Sales_t) / (SGA_{t-1} / Sales_{t-1}) |
| LVGI | TL_t/TA_t / (TL_{t-1}/TA_{t-1}) |
| TATA | (ΔWC - ΔCash + ΔTaxPayable - Depr) / TA |

```
M = -4.84 + 0.92·DSRI + 0.528·GMI + 0.404·AQI + 0.892·SGI + 0.115·DEPI - 0.172·SGAI + 4.679·TATA - 0.327·LVGI
```

**Interpretation:** M > -1.78 → flagged; M > -1.49 → likely manipulation. Color thresholds:
- M ≤ -2.22 → green ("conservative")
- -2.22 < M ≤ -1.78 → amber ("watch")
- M > -1.78 → red ("flagged")

```typescript
export interface BeneishYear {
  fy: string;
  dsri: number | null;
  gmi: number | null;
  aqi: number | null;
  sgi: number | null;
  depi: number | null;
  sgai: number | null;
  lvgi: number | null;
  tata: number | null;
  m: number | null;
  classification: 'conservative' | 'watch' | 'flagged' | 'unknown';
}

export function computeBeneish(rows: DerivedFinancialsRow[]): BeneishYear[];
```

Notes:
- Receivables (AR) extracted via item-label search "Trade Receivables" in BS items.
- PPE via "Property, Plant and Equipment" or "Fixed Assets".
- SGA via "Selling and Distribution" + "Other Expenses" — heuristic; if neither found, return null for SGAI and don't penalize the M-score (treat as 1.0). Add a quality flag.
- TATA simplified: `(ΔWC - Depr) / TA` if tax payable not available.
- Banks: Beneish doesn't apply to banks. Set all to null and show a note "Beneish does not apply to financial firms" when `isFinancial = true`.

### 6.3 Altman Z-Score (`src/utils/ar/altman.ts`)

Three variants:

| Variant | Use | Formula |
|---|---|---|
| Z (original 1968) | Listed manufacturing | 1.2·X1 + 1.4·X2 + 3.3·X3 + 0.6·X4 + 1.0·X5 |
| Z' (private firm) | Private | 0.717·X1 + 0.847·X2 + 3.107·X3 + 0.420·X4 + 0.998·X5 |
| Z" (non-mfg / EM) | Service / India | 6.56·X1 + 3.26·X2 + 6.72·X3 + 1.05·X4 |

Where:
- X1 = Working Capital / Total Assets
- X2 = Retained Earnings / Total Assets
- X3 = EBIT / Total Assets
- X4 = Market Value Equity / Book Value Liab (use Book Value Equity / Total Liab if MV missing — flag)
- X5 = Sales / Total Assets

For Indian listed: prefer Z" because most are not pure US-mfg. Show all three.

Thresholds (Z"):
- > 2.6 → safe (green)
- 1.1 to 2.6 → grey (amber)
- < 1.1 → distress (red)

For banks, Altman doesn't apply — show note.

```typescript
export interface AltmanYear {
  fy: string;
  x1: number | null; x2: number | null; x3: number | null; x4: number | null; x5: number | null;
  z: number | null; zPrime: number | null; zDoublePrime: number | null;
  classification: 'safe' | 'grey' | 'distress' | 'unknown';
  marketCapUsed: boolean;     // false → book value used as fallback
}
```

### 6.4 Piotroski F-Score (`src/utils/ar/piotroski.ts`)

9 binary tests (1 if pass, else 0):

| # | Test |
|---|---|
| 1 | Net Income > 0 |
| 2 | CFO > 0 |
| 3 | ROA increased YoY |
| 4 | CFO > Net Income (earnings backed by cash) |
| 5 | Long-term debt / TA decreased YoY |
| 6 | Current ratio increased YoY |
| 7 | No new shares issued (shares outstanding flat or down) |
| 8 | Gross margin increased YoY |
| 9 | Asset turnover increased YoY |

F = sum, range 0-9. ≥7 strong, ≤3 weak.

Special handling for share count: many AR JSONs don't expose share count. If unavailable, mark test 7 as `null` and report F-score over the **8 available components** with a flag `partial: true`.

### 6.5 Sloan Accruals (`src/utils/ar/accruals.ts`)

**Balance-sheet method:**
```
AccrualsBS = (ΔCA - ΔCash) - (ΔCL - ΔShortDebt - ΔTaxPayable) - Depreciation
SloanRatio = AccrualsBS / Avg(TA_t, TA_{t-1})
```

**Cash flow method:**
```
AccrualsCF = NI - CFO - CFI_operating
SloanRatioCF = AccrualsCF / Avg(TA_t, TA_{t-1})
```

Use CF method when CFO available (preferred). Fall back to BS method.

Output:
```typescript
export interface AccrualsYear {
  fy: string;
  accrualsBS: number | null;
  accrualsCF: number | null;
  sloanRatio: number | null;     // -1 to 1, lower = higher quality
  decile: number | null;          // computed against own history (1=best, 10=worst)
  qualityFlag: 'high' | 'medium' | 'low';
}
```

Threshold (% of TA):
- |Sloan| < 5% → high quality
- 5-10% → medium
- > 10% → low quality

### 6.6 Ohlson O-Score (`src/utils/ar/ohlson.ts`)

```
O = -1.32 - 0.407·log(TA/GNP)
   + 6.03·(TL/TA) - 1.43·(WC/TA) + 0.0757·(CL/CA)
   - 1.72·OENEG - 2.37·(NI/TA) - 1.83·(FFO/TL)
   + 0.285·INTWO - 0.521·(NI_t - NI_{t-1})/(|NI_t| + |NI_{t-1}|)
```

OENEG = 1 if TL > TA else 0; INTWO = 1 if NI < 0 in two consecutive years.

Probability of bankruptcy: P = e^O / (1 + e^O).

Show as line chart with shading at P = 50%.

### 6.7 Composite Quality Score

```typescript
export interface QualityScores {
  fy: string;
  beneish: BeneishYear;
  altman: AltmanYear;
  piotroski: PiotroskiYear;
  sloan: AccrualsYear;
  ohlson: OhlsonYear;
  composite: number;          // 0-100, higher is better
}

// Composite weights:
// 30% Piotroski (normalized to 0-100)
// 25% Altman Z" (normalized 0-100)
// 20% Sloan (1 - |sloan|/0.2 clamped 0-1) × 100
// 15% Beneish (linear from M=-2.22 → 100 to M=-1.49 → 0)
// 10% Ohlson (1 - probBankruptcy) × 100
```

Add a 5-segment radar chart on Quality tab showing all 5 normalized scores for the latest year.

### 6.8 Tests
- Beneish: synthetic case from the original Beneish 1999 paper (use Enron-like ratios) → expect M > -1.78.
- Altman: bankrupt benchmark (Z < 1.1) and safe benchmark (Z > 2.6).
- Piotroski: all-pass case → 9, all-fail → 0.
- Sloan: equal NI and CFO → near-zero accruals.
- Use ITC's actual data for golden snapshots (write expected values to a JSON fixture).

### 6.9 Verification gate
- All Phase 0 tests still pass.
- New tests pass.
- Quality tab loads and shows non-null values for at least 5 tickers (ITC, RELIANCE, INFY, HDFCBANK, MARUTI).

---

## 7. Phase 2 — Working Capital, Capital Structure, Advanced Ratios

### 7.1 `src/utils/ar/ratiosWorkingCapital.ts`

```typescript
export interface WorkingCapitalYear {
  fy: string;
  receivablesCr: number | null;
  payablesCr: number | null;
  inventoryCr: number | null;
  dso: number | null;       // (AR / Revenue) * 365
  dpo: number | null;       // (AP / COGS or |Materials cost|) * 365
  dio: number | null;       // (Inv / COGS) * 365
  ccc: number | null;       // DSO + DIO - DPO
  nwcCr: number | null;
  nwcPctOfRev: number | null;
  changeInNwcCr: number | null;
}
```

### 7.2 `src/utils/ar/ratiosCapitalStructure.ts`

```typescript
export interface CapitalStructureYear {
  fy: string;
  totalDebtCr: number | null;
  netDebtCr: number | null;
  equityCr: number | null;
  debtToEquity: number | null;
  debtToEbitda: number | null;
  netDebtToEbitda: number | null;
  interestCoverage: number | null;        // EBIT / interest
  cashInterestCoverage: number | null;    // CFO / interest
  ffoToDebt: number | null;               // (NI + Depr) / TotalDebt
  debtToCapital: number | null;
  weightedAvgInterestCost: number | null; // interest expense / avg debt
}
```

### 7.3 New charts in `RatiosTab.tsx`

Add 4 new ChartPanels at the bottom of the existing grid:

1. **Cash Conversion Cycle** — stacked bar of DSO (green) + DIO (amber) - DPO (red), line for CCC.
2. **Debt Coverage Trends** — multi-line: Interest Coverage, Net Debt/EBITDA, FFO/Debt.
3. **Working Capital Intensity** — area chart of NWC % of Revenue.
4. **5-Step DuPont** — stacked bar: Tax Burden × Interest Burden × EBIT Margin × Asset Turnover × Leverage = ROE. Verify product equals ROE within rounding.

### 7.4 5-step DuPont (`src/utils/ar/ratiosDuPont.ts`)

```
ROE = (NI/PBT) × (PBT/EBIT) × (EBIT/Sales) × (Sales/TA) × (TA/Equity)
        Tax       Interest      Operating       Asset       Equity
        Burden    Burden        Margin          Turnover    Multiplier
```

Each component as a separate band in a horizontal stacked bar per year.

### 7.5 Tests
- DSO: 1000 AR / 5000 Rev → 73 days.
- CCC for negative-NWC retailer (Maruti, etc.) returns negative number.
- Interest coverage with zero interest → null (not Infinity).
- 5-step DuPont multiplied → matches simple ROE within 0.5pp.

---

## 8. Phase 3 — Forecasting Engine

### 8.1 Three-statement projection (`src/utils/ar/projection.ts`)

```typescript
export interface ProjectionAssumptions {
  // Revenue
  revenueGrowthYears: number[];    // explicit per-year growth %, length = forecastYears
  terminalGrowth: number;          // %
  forecastYears: number;           // default 5
  // Margins
  ebitdaMargin: number[];          // % per year, length = forecastYears
  daPctOfRevenue: number[];        // %
  taxRate: number;                 // %, e.g. 25.17
  // Capital intensity
  capexPctOfRevenue: number[];     // %
  nwcPctOfRevenue: number[];       // %
  // Capital structure
  netDebtToEbitdaTarget: number;   // x
  payoutRatio: number;             // % of NI as dividends
  // Cost of capital
  riskFreeRate: number;            // %, default 7.0 (India 10Y)
  equityRiskPremium: number;       // %, default 5.5
  beta: number;                    // default 1.0
  costOfDebt: number;              // pre-tax %, default 8.5
  targetDebtWeight: number;        // %, e.g. 30
}

export interface ProjectedYear {
  fy: string;                      // FY{startYear+i}
  revenue: number;
  ebitda: number;
  da: number;
  ebit: number;
  taxes: number;
  nopat: number;
  capex: number;
  changeNwc: number;
  fcff: number;
  netIncome: number;
  fcfe: number;
  dividend: number;
  endingNetDebt: number;
  endingEquity: number;
  endingTotalAssets: number;
  endingInvestedCapital: number;
  roic: number;
  reinvestmentRate: number;
  growthRateImplied: number;       // ROIC × reinvestmentRate
}

export interface ProjectionResult {
  startingValues: DerivedFinancialsRow;  // base year (last historical)
  years: ProjectedYear[];
  wacc: number;
  costOfEquity: number;
  assumptions: ProjectionAssumptions;
  warnings: string[];
}

export function buildProjection(
  history: DerivedFinancialsRow[],
  assumptions: ProjectionAssumptions,
): ProjectionResult;
```

**Default assumption derivation** (so forecast tab works without user input):
- `revenueGrowthYears`: linearly interpolate from `last5yRevCAGR` down to `terminalGrowth`.
- `ebitdaMargin`: hold last-year margin flat for years 1-2, then revert 50% toward 5-year mean by year 5.
- `daPctOfRevenue`: 5-year mean.
- `taxRate`: India default 25.17 (corporate tax post-2019 cut, base scenario).
- `capexPctOfRevenue`: 5-year mean.
- `nwcPctOfRevenue`: 5-year mean.
- `payoutRatio`: 5-year mean of dividends/NI.
- `wacc`: computed from `costOfEquity = rf + beta × erp`, then `wacc = wd × kd × (1-t) + we × ke`.

### 8.2 Forecasts tab (`src/components/sensex/ar/tabs/ForecastsTab.tsx`)

Layout:
1. **Assumptions Bar** — collapsible drawer with sliders for all assumptions. Live-updates the projection.
2. **Forecast P&L Table** — horizontal table: revenue, EBITDA margin, EBIT margin, tax, NOPAT, NI, EPS — historical 3y + projected 5y, vertical bar separating actuals/forecast.
3. **Forecast BS Snapshot** — TA, Equity, Net Debt, IC for each year.
4. **Forecast CF Table** — CFO, Capex, FCFF, Dividends.
5. **Quality of Forecast Strip** — checks: revenue growth between 0% and 30%, margins within ±5pp of historical mean, ROIC trending toward WACC, no zero-coupon implied (debt > 0 → interest expense).
6. **Projection Charts** — revenue, EBITDA margin, ROIC, FCF — all with historical solid line and projected dashed.

### 8.3 Reverse-engineered "implied growth"

Helper: given current price (from `itc_live_quote.json` or per-ticker quote file), solve for the revenue growth path that justifies the price. Spec lives in Phase 4 (`valuationReverse.ts`).

### 8.4 Tests
- ITC golden case: rev_g = 8%, margin = 35%, capex = 2%, tax = 25.17 → assert FCFF year-5 within ±5% of expected number.
- Edge: revenue declining (negative growth) → projection still completes, no NaN.
- Edge: zero starting revenue → return ProjectionResult with warning, no projection.

---

## 9. Phase 4 — Valuation Engines + Valuation Tab

### 9.1 DCF (`src/utils/ar/valuationDCF.ts`)

```typescript
export interface DCFInput {
  projection: ProjectionResult;
  midYearConvention: boolean;  // default true
  terminalMethod: 'gordon' | 'exitMultiple';
  exitMultiple?: number;        // EV/EBITDA if terminalMethod = 'exitMultiple'
  netDebtAtValuationDate: number;
  sharesOutstandingMn: number;
}

export interface DCFOutput {
  pvFcffByYear: number[];       // length = forecastYears
  terminalValue: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  perShareValueINR: number;
  terminalValueWeight: number;  // pvTV / EV
  impliedExitEbitdaMultiple: number;
  impliedExitPE: number;
  impliedFcffYield: number;
  isValid: boolean;
  validationErrors: string[];   // e.g. 'TERMINAL_GROWTH_GE_WACC'
}

export function calculateDCF(input: DCFInput): DCFOutput;
```

Validation rules (all must pass for `isValid = true`):
- terminalGrowth < wacc
- wacc > 0 and < 25
- forecastYears between 3 and 15
- All projected FCFFs are finite

### 9.2 Residual Income Model (`src/utils/ar/valuationRIM.ts`)

```
RIM Equity Value = Book Value of Equity_0 + Σ PV of Residual Income_t + PV of Terminal RI

where Residual Income_t = NI_t - (CostOfEquity × Equity_{t-1})
```

```typescript
export interface RIMInput {
  projection: ProjectionResult;
  costOfEquity: number;
  terminalGrowth: number;
  startingBookValue: number;
  sharesOutstandingMn: number;
}
export interface RIMOutput {
  residualIncomeByYear: number[];
  pvResidualIncome: number[];
  pvTerminal: number;
  equityValue: number;
  perShareValueINR: number;
  isValid: boolean;
  validationErrors: string[];
}
```

RIM is **especially valuable for banks** where DCF is awkward. Recommend RIM as primary for `isFinancial = true`.

### 9.3 EVA (`src/utils/ar/valuationEVA.ts`)

```
EVA_t = NOPAT_t - WACC × InvestedCapital_{t-1}
MVA = Σ PV(EVA) + IC_0 = Enterprise Value
```

Useful as a sanity-check overlay. Same EV result as FCFF DCF if assumptions are internally consistent.

### 9.4 Multiples (`src/utils/ar/valuationMultiples.ts`)

```typescript
export interface MultiplesInput {
  history: DerivedFinancialsRow[];
  marketCapCr?: number;          // for trailing multiples
  pricePerShareINR?: number;
  sharesOutstandingMn?: number;
  peerStats?: PeerStats;
}

export interface MultiplesOutput {
  trailing: { pe: number | null; evEbitda: number | null; pb: number | null; evSales: number | null; divYield: number | null; };
  forward: { pe: number | null; evEbitda: number | null; pb: number | null; };
  vsPeers: { pe: 'cheap' | 'inline' | 'premium' | null; /* etc */ };
  historicalRange: {
    pe: { min: number; med: number; max: number; current: number; pctile: number };
    evEbitda: { /* same shape */ };
    // …
  };
}
```

The historical range is derived from per-year P/E using each FY's average price (need price history; if missing, only show forward multiples and trailing-on-current-price).

### 9.5 Reverse DCF (`src/utils/ar/valuationReverse.ts`)

Bisection search: find `revenueGrowth` in `[reverseGrowthMin, reverseGrowthMax]` that makes DCF per-share = current market price ± tolerance.

```typescript
export interface ReverseDCFInput {
  baseAssumptions: ProjectionAssumptions;  // hold all but revenueGrowth
  history: DerivedFinancialsRow[];
  netDebtAtValuationDate: number;
  sharesOutstandingMn: number;
  currentPriceINR: number;
}
export interface ReverseDCFOutput {
  impliedRevenueGrowth: number;       // as % uniform across forecast
  impliedPATCagr: number;
  impliedROIC: number;
  iterations: number;
  converged: boolean;
}
```

### 9.6 Sensitivity heatmap

2D grid: rows = WACC (8% to 14% step 0.5%), cols = terminal growth (3% to 7% step 0.5%). Cell = per-share value, color-scaled. Highlight current price as a contour line.

### 9.7 Monte Carlo (`src/utils/ar/monteCarlo.ts`)

Sample triangular distributions over (revenueGrowth, ebitdaMargin, terminalGrowth, wacc). 500 draws by default with mulberry32 seed=42. Return per-share distribution; show histogram + percentile fan chart on the tab.

```typescript
export interface MonteCarloDraw {
  revenueGrowth: number;
  ebitdaMargin: number;
  terminalGrowth: number;
  wacc: number;
  perShareValue: number;
}

export interface MonteCarloResult {
  draws: MonteCarloDraw[];          // length = N
  p5: number; p25: number; p50: number; p75: number; p95: number;
  meanPerShare: number;
  stdPerShare: number;
  probAbovePrice: number;            // P(value > current price)
}
```

### 9.8 Valuation tab layout

Sub-tabs (pill switcher inside the Valuation tab): `DCF | RIM | EVA | Multiples | Reverse | Monte Carlo`.

Top of tab: Master valuation summary card showing all 5 methods side by side with per-share values, plus current price for benchmark. Color: green if value > price, red if value < price.

### 9.9 Tests
- DCF: input where wacc = terminalGrowth → `isValid = false`, error code present.
- RIM: when ROE = costOfEquity exactly → equity value = book value (no premium).
- EVA equals DCF EV within 0.5% on the same assumptions.
- Reverse DCF: feeding in DCF-implied price → recovers original revenue growth.
- Monte Carlo: 500 draws produce monotonic percentiles (p5 < p50 < p95).

---

## 10. Phase 5 — Peers Tab + Composite Score + Dividends Tab

### 10.1 Peers tab

Source: `public/data/peers_data.json` + `public/data/ar/<peer>.json` for each peer ticker. Use `company_index.json` (sector field) to auto-suggest peers when peers_data lacks the active ticker.

UI:
1. **Peer selector** — multi-select pills, max 8 peers + active ticker.
2. **Peer Compare Table** — rows = tickers, cols = revenue, EBITDA margin, ROE, ROCE, D/E, P/E, EV/EBITDA, P/B, dividend yield, FCF yield, 5y revenue CAGR. Active ticker highlighted; sortable.
3. **Peer Scatter** — bubble chart: x = ROCE, y = EV/EBITDA, size = revenue, color = sector.
4. **Relative Score Bar** — horizontal bars per peer of composite score, active ticker bolded.

### 10.2 Composite score (`src/utils/ar/compositeScore.ts`)

For each ticker against the peer set:

```
compositeScore = w_q × QualityScore + w_v × ValueScore + w_g × GrowthScore + w_m × MomentumScore + w_r × (1 - RiskScore)
```

- `QualityScore` from Phase 1 composite (0-100).
- `ValueScore` = 100 - percentile(ticker EV/EBITDA, peers) — 100 means cheapest.
- `GrowthScore` = percentile(5y rev CAGR, peers).
- `MomentumScore` = percentile(1y price return, peers) — needs price history.
- `RiskScore` = percentile(D/E + (1 - interestCoverage clipped), peers).

Default weights: q=0.30, v=0.25, g=0.20, m=0.15, r=0.10.

### 10.3 Dividends tab

Reuses `itc_dividend_history.json` shape but generalized. If a per-ticker dividend file is missing, derive from `dividendsPaid` in CF and approximate per-share dividends if shares known.

Charts:
1. **Dividend per share** — line + area.
2. **Payout ratio** — bar (% of NI) + bar (% of FCF) side by side.
3. **Yield over time** — line at average price per FY.
4. **Sustainability index** — three-state traffic light: dividends covered by FCF for 5/5 years (green), 3-4/5 (amber), <3 (red).
5. **Buyback table** — when share count drops, infer buybacks (Δ shares × avg price).

### 10.4 Tests
- Composite score: synthetic 3-peer set, verify percentiles correct.
- Dividend payout > 100% of NI in a year → flag rendered.

---

## 11. Phase 6 — Reports Tab, Export, Provenance, Inflation Toggle

### 11.1 Reports tab

UI:
1. PDF index (using `metadata.pdfPaths` per FY).
2. Click any line item in P&L/BS/CF tables → tooltip pops with FY, original label from PDF, page reference (when `note_ref` exists), and a link to open the PDF in a new tab at the relevant page (use PDF.js anchor: `#page=N`).
3. Coverage matrix: ticker × FY × statement (P&L / BS / CF / Segments) → green/amber/red cell.

### 11.2 Provenance tooltip

`<ProvenanceTooltip resolved={ResolvedKPI} />` — shows source ('kpis' / 'item: <label>' / 'derived: <formula>') + PDF page link when available. Wraps any cell that can be traced.

### 11.3 Export

- **CSV per tab** — flatten the visible table to CSV.
- **XLSX bundle** — one workbook with sheets: Overview, P&L, BS, CF, Ratios, Quality, Forecast, Valuation, Peers. Use a minimal pure-TS XLSX writer (write a small one rather than pulling in xlsx; ~100 LOC).
- **PDF report** — defer to Phase 7+ unless trivially achievable via `window.print()` with a print stylesheet.

### 11.4 Inflation toggle

`src/data/ar/inflationCPI.ts`:
```typescript
// India CPI annual averages, base 2024 = 100
export const CPI_INDIA: Record<string, number> = {
  FY2016: 67.5, FY2017: 70.7, FY2018: 73.2, FY2019: 75.8, FY2020: 81.0,
  FY2021: 85.1, FY2022: 89.6, FY2023: 95.5, FY2024: 100.0, FY2025: 104.2,
};
```

When `realTerms = true`, multiply every nominal value by `CPI_latest / CPI_thatYear` before display. Computations stay in nominal; display only is adjusted.

### 11.5 Tests
- CSV exporter: round-trip a sample table.
- Inflation: ITC FY2016 revenue × CPI_2025/CPI_2016 ≈ 1.54x.

---

## 12. Phase 7 — Polish

### 12.1 Starred watchlist
Persist `Set<string>` in localStorage `ar.starred`. Star button next to the company selector. Starred list shows at top of dropdown.

### 12.2 Two-company side-by-side
Toggle "Compare Mode" → second company selector appears. All tabs render two columns (or row-paired for tables). Use `<Tabs>` controlled at section level; both companies share selected years.

### 12.3 Drawdown chart (price tab, optional)
If `priceHistory` JSON exists, compute rolling drawdown (current price vs prior all-time high). Show on Charts tab with shaded bear-market periods.

### 12.4 Generic segments
- Revisit `SegmentsTab` to drop the `if (activeTicker !== 'ITC')` short-circuit.
- Fetch `segment_data_<ticker>.json` (lowercase) on every ticker change.
- If file missing or empty, render empty state.

### 12.5 Diff tooltip on table cells
Hover a cell → tooltip shows YoY abs change + YoY % + source (provenance).

---

## 13. Detailed Data Contracts

### 13.1 Extended `AnnualReportYearData`

No breaking changes. Add **optional** fields:

```typescript
export interface AnnualReportItem {
  type: 'item' | 'section';
  label: string;
  note_ref?: string;
  current?: number | null;
  prior?: number | null;
  section?: string | null;
  // NEW (optional, populated by future scrape passes; safe defaults if absent)
  pageNumber?: number;
  isAuditor?: boolean;
  unit?: 'cr' | 'lakh' | 'mn';
}

export interface AnnualReportYearMetadata {
  pdfName?: string;
  pdfPath?: string;
  cashFlowPages?: number[];
  warnings?: string[];
  // NEW
  qualityFlags?: string[];      // ['SEGMENT_MISSING', 'TAX_RATE_OUTLIER']
  auditorOpinion?: 'unqualified' | 'qualified' | 'adverse' | 'disclaimer';
  reportDate?: string;          // ISO date
  pageCount?: number;
}
```

### 13.2 Per-ticker quote file (optional, used by Valuation/Peers)
`public/data/quotes/<TICKER>.json`:
```typescript
interface TickerQuote {
  ticker: string;
  currency: 'INR';
  pricePerShare: number;
  marketCapCr: number;
  sharesOutstandingMn: number;
  source: string;
  fetchedAt: string;
}
```

When missing, valuation tab degrades gracefully: shows DCF/RIM/EVA per-share but no comparison vs current price; reverse-DCF disabled.

---

## 14. UI / UX Conventions

### 14.1 Tab order (final)
`Overview | P&L | Balance Sheet | Cash Flow | Segments | Charts | Ratios | Quality | Forecasts | Valuation | Peers | Dividends | Reports`

13 tabs is too many for one row. Group into **Foundations** (Overview, P&L, BS, CF, Segments) | **Analytics** (Charts, Ratios, Quality, Dividends) | **Forward** (Forecasts, Valuation, Peers) | **Provenance** (Reports). Render as two-row tab bar with section labels above each row, OR collapse into a `<Select>` on viewport < 1024px.

### 14.2 Color tokens (extend Tailwind)
- Quality green: `text-emerald-300 bg-emerald-500/10 border-emerald-500/20`
- Quality amber: `text-amber-300 bg-amber-500/10 border-amber-500/20`
- Quality red: `text-rose-300 bg-rose-500/10 border-rose-500/20`
- Forecast accent: `text-purple-300 border-purple-500/30` (distinguish from historical emerald)

### 14.3 Loading & error states
- Use `<LoadingSkeleton />` per tab while data loads.
- Per-section `<ErrorBoundary>` (already in place) — keep.
- "No data" state: minimal glass card with helpful CTA (e.g., "Re-run extract_ar.py with --years 2016-2025 for this ticker").

### 14.4 Numeric display
- `<ValueCell value={x} unit="cr" />` is the canonical formatter. Handles null (em-dash), sign coloring (gray for null, white for positive, rose for negative), unit suffix, optional realTerms adjustment.
- Numbers ≥ 100 Cr → 0 dp. < 100 → 1 dp. < 1 → 2 dp.
- Always tabular-nums.

### 14.5 Interaction
- All charts: `ResponsiveContainer width="100%" height={N}`.
- Tooltip: dark glass card with bordered emerald accent, font 12.
- Year selector chips: emerald when active.

---

## 15. Performance Budget

- Section initial render < 800ms on a typical laptop after data fetched.
- Tab switch < 100ms.
- Memoize all derivations (`useMemo` keyed on `[ticker, displayYears, assumptions]`).
- Lazy-load Valuation, Forecasts, Peers tabs via `React.lazy + Suspense` to keep initial bundle slim.
- Bundle increase: aim for ≤ 60KB gzipped over current.

---

## 16. Testing Strategy

### 16.1 Unit tests
Every util function in `src/utils/ar/`. Snapshot test for ITC golden data: `src/utils/ar/__tests__/itcGoldenSnapshot.test.ts` asserts ratios, valuations, and quality scores against a checked-in `itc_golden.json` fixture.

### 16.2 Integration tests (vitest + happy-dom)
Render `<AnnualReportsSection>` with mocked fetch returning ITC data. Assert each tab renders without error.

### 16.3 Visual smoke (manual checklist)
For each release, manually click through 5 tickers covering: large-cap mfg (RELIANCE), bank (HDFCBANK), IT (INFY), small-cap (random), conglomerate (ITC). Confirm:
- All tabs render.
- No NaN / Infinity in any cell.
- Quality scores reasonable (Altman Z" > 2.6 for HDFCBANK, etc.).

### 16.4 Performance regression
After each phase, record bundle size and largest contentful paint. Add to `OPUS7_HANDOFF.md` perf log.

---

## 17. Open Questions / Future Work (post Phase 7)

| Q | Note |
|---|---|
| ESG / governance scoring | Need separate data source. Out of scope for this spec. |
| Reverse engineering goodwill / acquisitions | Need detailed notes-to-accounts; current scrape doesn't capture. |
| Pension / OPEB obligations | Same — needs deeper PDF extraction. |
| Quarterly data | Current scrape is annual-only. Expanding to quarterly would 4x storage and many UI assumptions break. Defer. |
| Multi-currency | All Indian-listed → INR. If we add ADRs, build a currency layer. Defer. |
| Real-time price | Wire to Yahoo / NSE. Out of scope; orthogonal. |
| Notes-to-accounts text search | Requires text extraction beyond tables. Phase 8+. |

---

## 18. Definition of Done (per phase)

A phase is **done** when:
1. All TS files in scope have unit tests.
2. `npx tsc --noEmit` clean.
3. `npm run build` clean.
4. `npx vitest --run` green.
5. Manual click-through on 3+ tickers across the new feature.
6. `OPUS7_HANDOFF.md` updated with phase summary, file count, LOC delta.
7. Single squashed commit with conventional-commit message: `feat(ar): phase N — <theme>`.
8. Pushed to `origin/main` only after user explicit confirmation.

---

## 19. Quick Reference — Implementation Order Within Phase 0

1. Create `src/utils/ar/safe.ts` + tests.
2. Create `src/utils/ar/kpiResolver.ts` + tests.
3. Create `src/utils/ar/derivedKPIs.ts` + tests.
4. Move existing components into `src/components/sensex/ar/{tabs,shared,tables,charts}` using `smartRelocate`.
5. Update imports in `AnnualReportsSection.tsx` and any consumers (`App.tsx` if it imports).
6. Replace direct `kpIs.*` reads in `RatiosTab.tsx`, `OverviewTab.tsx`, `CashFlowTab.tsx` with `KPIResolver`.
7. Generalize `SegmentsTab.tsx` to fetch per-ticker segment file.
8. Build, test, smoke. Commit. **Stop. Do not start Phase 1 without explicit go-ahead.**

---

## 20. Notes for Kimi

- Read this doc end-to-end before writing any code.
- For every util file, write the test file first (TDD). The test fixtures should reuse ITC's actual JSON — load it in tests and assert numeric outputs.
- Match the existing code style: 2-space indent, single-quote strings, no semicolons inside JSX expression containers, named exports preferred over default.
- Don't introduce new dependencies without checking `package.json` first. Prefer pure-TS implementations over libraries.
- When a phase is done, update `OPUS7_HANDOFF.md` with: files touched, LOC, perf snapshot, manual test result.
- If you find an ambiguity in this spec, **stop and ask the user** rather than guessing.

— end of spec —
