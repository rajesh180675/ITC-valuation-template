# Plan: Sensex Universe Component Improvements

## Goal

Upgrade the Sensex Universe dashboard (`SensexUniverseSection.tsx`) to parity with the Nifty250 Universe, extract shared sub-components to eliminate DRY violations, and fix analytics model gaps identified during code review.

---

## Current Context

- `src/components/sensex/SensexUniverseSection.tsx` — 993 lines, 12 inline sub-components
- `src/components/sensex/Nifty250UniverseSection.tsx` — 1281 lines, ~75% identical sub-components vs Sensex
- `src/components/sensex/NiftyIndexDataSection.tsx` — 640 lines, Nifty 750 data hub (separate concern)
- `src/utils/sensexAnalytics.ts` — 563 lines, shared analytics engine
- `src/data/sensexData.ts` — 153 lines, 30 hardcoded constituents with historical backfill
- `src/utils/itcModel.ts` — shared CAGR/sector helpers

Both Sensex and Nifty250 components import from `@/utils/sensexAnalytics` and `@/utils/itcModel`, but the Sensex component uses **fewer** of the available analytics functions.

---

## Proposed Approach

### Phase 1: Extract shared sub-component library

Move duplicated sub-components from both universe views into a shared module:

```
src/components/sensex/shared/
├── HeroBanner.tsx          (KPI bar + filter/range toggles)
├── RangeSelector.tsx       (FY range sliders)
├── UniverseEarningsPower.tsx  (aggregate topline/profit chart)
├── SectorComposition.tsx   (weight bar list)
├── SectorAnalyticsTable.tsx (weight-weighted sector table)
├── TopWeightsChart.tsx     (horizontal bar chart)
├── GrowthValuationScatter.tsx  (bubble scatter)
├── ImpliedVsRealizedScatter.tsx  (bubble scatter + y=x)
├── FactorScorecard.tsx     (composite factor cards)
├── FactorBar.tsx           (single factor bar)
├── ScoreChip.tsx           (colored score badge)
├── ConstituentLedger.tsx   (sortable table)
├── DrillDown.tsx           (company deep-dive)
├── index.ts                (re-export all)
```

Each component receives typed props from `@/utils/sensexAnalytics` types — no duplicate interfaces needed.

**Files to change:**
- Create `src/components/sensex/shared/` directory with ~14 files
- `SensexUniverseSection.tsx` — import from `./shared/` instead of inline
- `Nifty250UniverseSection.tsx` — import from `./shared/` instead of inline
- Delete inline sub-component definitions from both

**Risk:** Moderate refactor — ensure all prop shapes match. The shared components must be generic enough to serve both `SensexConstituent` and the Nifty250 data shape.

---

### Phase 2: Backport Nifty250 features to Sensex

#### 2a. CSV Export on Constituent Ledger
- Add `handleExport()` function to shared `ConstituentLedger` (already exists in Nifty250's version)
- Add a "CSV" button in the ledger header
- ~30 lines, no new dependencies

#### 2b. Valuation Z-Score Column in Ledger
- Call `buildValuationZScores()` in the Sensex component's data pipeline (analytics function already exists in `sensexAnalytics.ts`)
- Add Z-score column to the ledger table
- Add `valuationZ` and `sectorMedianMultiple` to the row type
- ~20 lines in the component, ~5 lines in the shared ledger

#### 2c. Magic Formula Card
- Call `buildMagicFormulaRanks()` in the Sensex component
- Add `MagicFormulaCard` sub-component to the shared library
- Position after the ImpliedVsRealizedScatter (matching Nifty250 layout)
- ~60 lines

#### 2d. Sector Momentum Heatmap
- Call `buildSectorMomentumGrid()` in the Sensex component
- Add `SectorMomentumHeatmap` sub-component to the shared library
- Position after the SectorAnalyticsTable (matching Nifty250 layout)
- ~80 lines

#### 2e. Data Provenance Banner
- Add a `provenance` object to `sensexData.ts` similar to Nifty250's pattern
- Add `DataProvenanceBanner` component to the shared library
- ~30 lines

---

### Phase 3: Fix analytics model gaps

#### 3a. BFSI Factor Scoring Leverage Proxy
- Current: `ROE / 2` for BFSI — incomparable with corporate `-netDebtToEbitda`
- Fix: In `sensexAnalytics.ts` `buildFactorScores()`, normalize BFSI leverage using a CET1 ratio proxy. Recommended approach:
  - Map each BFSI name to a synthetic CET1 estimate based on ROE (bank ROE ~12-18% maps to CET1 ~13-17%)
  - Use `-(cet1Ratio * 20)` as the leverage value so the range aligns with corporate `-netDebtToEbitda` (typical -2 to +4)
- **File:** `src/utils/sensexAnalytics.ts` lines 160-164

#### 3b. (Optional) Parameterize Historical Dampening
- Current: `scaleBack()` hardcodes 65% CAGR dampening for periods > 4 years
- Fix: Extract dampening factor to a const or make it a parameter of `buildHistory()`
- **File:** `src/data/sensexData.ts` line 74

---

## Detailed Step-by-Step

### Step 1 — Create shared component directory
```bash
mkdir src/components/sensex/shared/
```

### Step 2 — Extract HeroBanner, RangeSelector, Kpi, SmallStat
- Copy from Nifty250 (it's the more feature-complete version)
- Replace `SENSEX_FISCAL_YEARS` / `NIFTY250_FISCAL_YEARS` references with a generic `fiscalYears` prop
- Verify both universe components compile after switching imports

### Step 3 — Extract chart components
- Extract: UniverseEarningsPower, SectorComposition, SectorAnalyticsTable, TopWeightsChart
- Extract: GrowthValuationScatter, ImpliedVsRealizedScatter (these are identical between versions)
- Ensure `ChartTooltip` imports remain from `@/components/itc/shared`

### Step 4 — Extract FactorScorecard, ConstituentLedger, DrillDown
- Make the row type generic enough for both universes
- Nifty250's ledger already has CSV export + Z-score col — keep that version

### Step 5 — Integrate backported features into Sensex
- Wire up `buildValuationZScores()`, `buildMagicFormulaRanks()`, `buildSectorMomentumGrid()`
- Add provenance metadata to `sensexData.ts`
- Add `DataProvenanceBanner` to the component tree

### Step 6 — Fix analytics models
- Patch `sensexAnalytics.ts` BFSI leverage proxy
- (Optional) Parameterize dampening factor in `sensexData.ts`

---

## Files Likely to Change

| File | Change | Risk |
|---|---|---|
| `src/utils/sensexAnalytics.ts` | Fix BFSI leverage proxy (line 160-164) | Low — isolated logic change |
| `src/data/sensexData.ts` | Add provenance metadata; optional dampening const | Low |
| `src/components/sensex/SensexUniverseSection.tsx` | Strip inline sub-components → import from shared; add Magic Formula + Momentum + Z-score | Medium — refactor |
| `src/components/sensex/Nifty250UniverseSection.tsx` | Strip inline sub-components → import from shared | Medium — refactor |
| `src/components/sensex/shared/*` (14 new files) | New shared sub-components | Low — mostly move/copy |
| `src/App.tsx` | No change expected | None |

---

## Tests / Validation

1. **Build check:** `npm run build` — must compile without errors
2. **Visual check:** Load `route='sensex'` and `route='nifty250'` — verify all chart panels render, sorting works, drill-down expands, filter toggles work
3. **CSV export:** Click CSV button on ledger — verify output contains correct columns and data
4. **Z-score column:** Confirm negative z → green text, positive z → red text, matches sector context
5. **Magic Formula:** Verify ranked list appears with combined ordinal rank
6. **Momentum heatmap:** Verify FY × sector grid renders correctly
7. **Regression:** Nifty250 must lose no features during the shared-component migration

---

## Risks, Tradeoffs & Open Questions

1. **Shared component genericity risk:** The `ConstituentLedger` and `DrillDown` props include `SensexConstituent` directly. Making them generic enough for both Sensex (30 names) and Nifty250 (250 names) may require a shared interface or union type.
   - **Mitigation:** Define a `UniverseConstituent` minimal interface in the shared module with the fields both universes need.

2. **Extraction vs pure backport tradeoff:** Pure backport (copying features without extraction) is faster (~1hr) but leaves the DRY problem. Full extraction adds ~2-3hr but eliminates future double-maintenance.
   - **Recommendation:** Do the extraction — the Nifty250 component is already showing divergence (CSV export, Magic Formula, provenance).

3. **BFSI proxy confidence:** The CET1 → score mapping is synthetic. If the user prefers, we could skip this fix and add a ticket to source actual CET1 ratios.
   - **Open question for user.**

4. **Nifty250 is much larger (250 vs 30).** Performance of percentile-ranking across 250 names in the browser is fine, but the heatmap grid rendering should use virtualization if scrolling becomes an issue.

---

## Estimated Effort

| Phase | Est. time |
|---|---|
| Phase 1 (shared components) | 2-3 hr |
| Phase 2a (CSV export) | 15 min |
| Phase 2b (Z-score col) | 10 min |
| Phase 2c (Magic Formula card) | 30 min |
| Phase 2d (Momentum heatmap) | 30 min |
| Phase 2e (Provenance banner) | 15 min |
| Phase 3a (BFSI proxy fix) | 20 min |
| Phase 3b (Dampening param) | 10 min |
| **Total** | **~4-5 hr** |
