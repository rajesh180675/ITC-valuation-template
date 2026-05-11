# Nifty250 Deep Dive — Debug, Refine & Enhance

Execute the full P1–P4 improvement backlog from `docs/deep_dives/nifty250_deep_dive.md`, add Zod schema validation to the real-data adapter, and introduce new screening/export features.

---

## Phase 1 — Correctness & Data Quality (P1 + P2)

| # | Task | Files | Impact |
|---|---|---|---|
| 1.1 | Add **Zod schema validation** to `adaptNifty250Constituent`; surface parse errors as adapter warnings rather than silently zeroing fields. | `Nifty250UniverseSection.tsx` | Prevents corrupt `nifty250_real.json` from silently breaking the UI. |
| 1.2 | Handle **negative-PAT companies** properly — flag them with a `hasNegativePat` boolean on the row so the Ledger shows "N/A" instead of "0.0%". | `nifty250Data.ts`, `sensexAnalytics.ts`, `Nifty250Ledger.tsx` | Stops suppressing real volatility for loss-making companies (Vodafone, UPL, Paytm, etc.). |
| 1.3 | Fix **BFSI momentum margin score** — already partially fixed (ROE YoY delta used for banks). Verify the fix works end-to-end. | `sensexAnalytics.ts` | Confirms banking momentum is no longer zeroed out. |
| 1.4 | Flag **Gordon-inapplicable names** (payout ≈ 0, high-growth) in `ImpliedVsRealizedScatter` tooltip with a caveat. | `Nifty250Charts.tsx` | Prevents misleading implied-growth readings for pre-payout compounders. |
| 2.1 | Remove duplicate `lic-housing-2` seed and fix ticker to `LICHSGFIN`. | `nifty250Data.ts` | Data hygiene. |
| 2.2 | Add `lastUpdated` timestamp to `NIFTY250_PROVENANCE` and surface it in `DataProvenanceBanner`. | `nifty250Data.ts`, `Nifty250AnalyticsCards.tsx` | Users know when the snapshot was taken. |

## Phase 2 — Code Quality (P3)

| # | Task | Files |
|---|---|---|
| 3.1 | Extract `Kpi` and `FactorBar` to `src/components/sensex/shared/` to eliminate duplication. | New shared file, update 4 import sites |
| 3.2 | Type the scatter chart data props (`data: GrowthValuationPoint[]` etc.) instead of `any[]`. | `Nifty250Charts.tsx` |
| 3.3 | Remove dead `sectorMcap` variable. | `sensexAnalytics.ts` |
| 3.4 | Add missing test coverage for `netProfitCr` sign, `valuationMultiple > 0`, total weight sum ≈ 100%, and the adapter. | `nifty250Data.test.ts`, `sensexAnalytics.test.ts` |

## Phase 3 — UX & Features (P4 + Enhancements)

| # | Task | Files |
|---|---|---|
| 4.1 | **Search bar** on the Constituent Ledger to filter by name/ticker without changing the sector filter. | `Nifty250Ledger.tsx` |
| 4.2 | **Pagination** on the Constituent Ledger (currently renders all 253 rows). | `Nifty250Ledger.tsx` |
| 4.3 | **Peer comparison mode** in DrillDown — show selected company's factor bars alongside sector-median bars. | `Nifty250Ledger.tsx` |
| 4.5 | **Export all analytics** to a ZIP of CSVs (sector analytics, magic formula rankings, factor scores). | New utility |
| NEW | **Sector filter in the Ledger** — allow multi-select sector filtering beyond just BFSI/Corporate. | `Nifty250Ledger.tsx` |
| NEW | **Valuation decile breakdown** — show how many companies fall into cheap/fair/expensive buckets per sector. | `Nifty250AnalyticsCards.tsx` |

## Phase 4 — Performance & Polish

- Memoize `sortedRows` more aggressively to avoid O(n log n) re-sort on every slider tick.
- Add loading skeleton for `DrillDown` panel.
- Ensure all new code has TypeScript strict-mode compliance.

---

## Acceptance Criteria

- All existing 499 tests pass + new tests added for every changed analytics function.
- `npx tsc --noEmit` is clean.
- The Nifty250 section renders without console errors for both `reference` and `screener-in` data sources.
