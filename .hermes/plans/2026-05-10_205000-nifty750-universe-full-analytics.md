# Plan: Nifty 750 Universe — Full Analytics with Screener.in Data

## Iteration Log

| Iteration | Change | Why |
|---|---|---|
| v1 (current) | Initial plan | — |

---

## Current Context / Assumptions

### Empirically validated

- **Screener.in covers ALL market caps**: Tested 12 companies from large to micro-cap — all have data. Even micro-caps like REPRO, SADBHIN have 9-13 years of history. ✅
- **Existing scraper works**: `fetch_nifty250_data.py` successfully collects 222/230 Nifty 250 companies. ✅
- **Existing NSE API works**: `fetch_nifty750_data.py` fetches constituents for all 3 Nifty 750 indices. ✅
- **750 companies at ~3s each with 6 workers** = ~6-7 minutes total. ✅

### Data pipeline landscape

| Index | Current source | Current years | Target |
|---|---|---|---|
| Nifty LargeMidcap 250 | Screener.in ✅ (done) | 13 years | Keep as-is |
| Nifty Smallcap 250 | yfinance (in nifty_750_10y.json) | 6 years (FY2021-FY2026) | Screener.in, 12-13 years |
| Nifty Microcap 250 | yfinance (in nifty_750_10y.json) | 6 years (FY2021-FY2026) | Screener.in, 9-13 years |

### Navigation (App.tsx)
```
sensex → SensexUniverseSection        (full analytics)
nifty250 → Nifty250UniverseSection     (full analytics)
nifty750data → NiftyIndexDataSection   (data hub table only — NO analytics panels)
```

### DRY problem
The 3 universe components (Sensex, Nifty250, and now Nifty750) share ~75% identical sub-components (HeroBanner, RangeSelector, 12 chart panels, DrillDown). Currently all duplicated inline. Adding a 3rd copy would make maintenance unsustainable.

---

## Proposed Approach (v1)

### Option A: Refactor shared components first, then build Nifty750 (recommended)
1. Extract 14 shared sub-components from Sensex/Nifty250 into `src/components/sensex/shared/`
2. Wire both existing components to use the shared library
3. Extend screener.in scraper for Smallcap 250 + Microcap 250
4. Build a new `Nifty750UniverseSection` using the shared library
5. No regression in Sensex or Nifty250

### Option B: Quick build (copy-paste)
1. Copy Nifty250UniverseSection → Nifty750UniverseSection
2. Swap data source
3. Add screener.in collection for all 750
4. Accept the triple-maintenance cost

**Recommendation: Option A.** The DRY issue between Sensex and Nifty250 is already painful — adding a 3rd without refactoring multiplies future work by 3x. The shared-component extraction is a one-time effort that pays for itself immediately.

---

## Step-by-Step Plan (Option A)

### Phase 1 — Extract shared sub-component library

Create `src/components/sensex/shared/` with:

| File | Source | Changes needed |
|---|---|---|
| `HeroBanner.tsx` | Nifty250 version (more complete) | Generic `universeLabel`, `constituentCount` props |
| `RangeSelector.tsx` | Identical in both | No changes |
| `UniverseEarningsPower.tsx` | Identical | No changes |
| `SectorComposition.tsx` | Identical | No changes |
| `SectorAnalyticsTable.tsx` | Identical | No changes |
| `TopWeightsChart.tsx` | Identical | No changes |
| `GrowthValuationScatter.tsx` | Identical | No changes |
| `ImpliedVsRealizedScatter.tsx` | Identical | No changes |
| `FactorScorecard.tsx` | Identical | No changes |
| `ConstituentLedger.tsx` | Nifty250 (has CSV + Z-score) | None |
| `DrillDown.tsx` | Nifty250 | None |
| `FactorBar.tsx` | Identical | None |
| `ScoreChip.tsx` | Identical | None |
| `InlineLegend.tsx` | Identical | None |
| `Kpi.tsx` | Identical | None |
| `SmallStat.tsx` | Identical | None |
| `DataProvenanceBanner.tsx` | Nifty250 (has dataSource prop) | None |

All components accept typed props from `@/utils/sensexAnalytics` and `@/data/sensexData`.

### Phase 2 — Wire SensexUniverseSection to shared library

- Remove ~800 lines of inline sub-components
- Import from `./shared/`
- Pass universe-specific config (labels, colors) via props

### Phase 3 — Wire Nifty250UniverseSection to shared library

Same as Phase 2. No feature regression — CSV export, Magic Formula, Momentum Heatmap, Z-scores all preserved.

### Phase 4 — Extend data collector for Smallcap 250 + Microcap 250

**4a. Add ticker files**: Create `nifty250_smallcap_tickers.txt` and `nifty250_microcap_tickers.txt` from NSE API (reuse `fetch_constituents()` from `fetch_nifty750_data.py`)

**4b. Update scraper**: Modify `fetch_nifty250_data.py` to accept a batch parameter:
```bash
python fetch_nifty250_data.py --batch largemidcap250  # existing behavior
python fetch_nifty250_data.py --batch smallcap250      # NEW
python fetch_nifty250_data.py --batch microcap250      # NEW
python fetch_nifty250_data.py --batch all              # run all 3
```

**4c. Source-pack structure**: Update source-pack directory to include all 3 indices:
```
scripts/nifty750/source-pack/
├── largemidcap250/  ← existing, move from nifty250/
│   ├── constituents.json
│   ├── financials.json
│   └── market_data.json
├── smallcap250/
│   ├── constituents.json
│   ├── financials.json
│   └── market_data.json
└── microcap250/
    ├── constituents.json
    ├── financials.json
    └── market_data.json
```

Or simpler: keep flat but add indexSlug to each record.

### Phase 5 — Build assembler for Nifty 750

Create or extend `scripts/build_nifty750_feed.mjs` to:
- Read source-pack from all 3 indices
- Build a single `public/data/nifty750_real.json`
- Schema: similar to existing `nifty_750_10y.json` but with 12-13 year history
- Each constituent has `history[]` with toplineCr, netProfitCr, roePct, rocePct
- Top-level market data: marketCapCr, valuationMultiple, dividendYieldPct

### Phase 6 — Create Nifty750UniverseSection component

Create `src/components/sensex/Nifty750UniverseSection.tsx` that:
- Fetches `nifty750_real.json` on mount
- Has a dropdown/batch selector to choose: LargeMidcap 250 | Smallcap 250 | Microcap 250 | All 750
- Uses shared components from `./shared/`
- All analytics: Factor Scorecard, Magic Formula, Sector Momentum, etc.
- Falls back to existing `nifty_750_10y.json` if new JSON unavailable

### Phase 7 — Wire in App.tsx

Add route `nifty750` with a "Nifty 750 Universe" nav entry alongside the existing "Nifty 750 Data Hub".

---

## Files Likely to Change

| File | Action | Size |
|---|---|---|
| `src/components/sensex/shared/*.tsx` | **Create** (16 files) | ~50 lines each |
| `src/components/sensex/SensexUniverseSection.tsx` | Refactor → use shared | -800 lines |
| `src/components/sensex/Nifty250UniverseSection.tsx` | Refactor → use shared | -800 lines |
| `src/components/sensex/Nifty750UniverseSection.tsx` | **Create** | ~300 lines |
| `public/data/nifty750_real.json` | **Generated** | Large |
| `scripts/data_collector/fetch_nifty250_data.py` | Extend for multi-batch | +100 lines |
| `scripts/build_nifty750_feed.mjs` | **Create** (or extend) | ~200 lines |
| `src/App.tsx` | Add route + nav | +5 lines |
| `public/data/nifty250_smallcap_tickers.txt` | **Create** | ~250 lines |
| `public/data/nifty250_microcap_tickers.txt` | **Create** | ~250 lines |

---

## Risks, Tradeoffs & Open Questions

### 1. Micro-cap data quality
**Risk:** Some micro-cap companies on screener.in may have incomplete data or missing P&L rows.
**Mitigation:** The scraper already handles missing data gracefully. Flag low-coverage companies.

### 2. 750 companies scraping time
~750 × 3s / 6 workers ≈ 6-7 minutes. This is long but acceptable for a data refresh.
**Mitigation:** Add progress logging + savepoints every 100 companies.

### 3. Component count in the shared extraction
Extracting 16 sub-components is tedious but mechanical. The risk is introducing subtle layout/behavior differences.
**Mitigation:** Compare rendered output side-by-side after extraction.

### 4. "All 750" view
Showing 750 companies in the same view might be slow (percentile ranking of 750 items is O(n log n)).
**Mitigation:** Default to individual index views, with "All 750" as a hidden/experimental option.

### 5. Duplicate nav entries
Both "Nifty 750 Data Hub" and the new "Nifty 750 Universe" coexist. Consider merging or clearly distinguishing them.

---

## Verification Checklist

- [ ] `npm run build` compiles cleanly
- [ ] `nifty250` route: all panels render identically to before refactor
- [ ] `sensex` route: all panels render identically to before refactor
- [ ] `nifty750` route: loads and shows LargeMidcap 250 by default
- [ ] Batch selector switches between 3 indices
- [ ] Factor Scorecard shows real data
- [ ] Magic Formula chart shows visible points
- [ ] Constituent Ledger with CSV export works
- [ ] DrillDown shows correct financials
- [ ] Smallcap/Microcap tickers all collect successfully (≥90% coverage)
- [ ] Fallback to existing nifty_750_10y.json works
