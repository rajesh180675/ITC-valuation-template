# Annual Reports UI — Phase 2 Plan: Ratios, Segments & Cash Flow Waterfall

**Date:** 2026-05-13  
**Status:** Draft v1  
**Author:** Hermes Agent  
**Goal:** Complete the remaining tabs from the Annual Reports UI redesign after the Overview tab.

---

## 1. Current Context

### What was just delivered (Phase 1)
- **Overview tab** (default): Sparkline KPI cards, key ratios table, trend chart, segment donut, 10-year summary
- Commit: `64e9c9e` on main
- Build: pass (28.21s), Tests: 570/570 pass

### Remaining from redesign spec
1. **Ratios tab** — DuPont analysis, margin trends, efficiency metrics (NOT started)
2. **Segment trend charts** — stacked area showing revenue mix over time (NOT started)
3. **Cash flow waterfall** — CFO → Capex → FCF → Dividend → Net Cash bridge (NOT started)
4. **P&L enhanced** — YoY growth columns in DataDrivenTable (partial — CAGR already exists)
5. **BS side-by-side view** — Asset-Liability facing layout (NOT started)

---

## 2. Empirical Validation

### What exists already
```bash
$ ls src/components/sensex/
AnnualReportsSection.tsx        # main container (734 lines)
AnnualReportsSection.tsx.bak    # backup
OverviewTab.tsx                 # new (323 lines)
SensexUniverseSection.tsx       # separate component

$ ls src/utils/
annualReportCashFlow.ts         # CF types + builders (236 lines)
annualReportCashFlow.test.ts    # 570 tests pass
annualReportRatios.ts           # ratio calculations (90 lines) — UNUSED in UI
```

### Key data available
```
public/data/ar/ITC.json         # 10 years (FY2016-FY2025), ~308KB
├── profitLoss.items[]          # line items + kpIs
├── balanceSheet.items[]        # line items + kpIs
├── cashFlow.items[]            # line items + kpIs
└── metadata                    # schemaVersion=2, source="Annual Reports"

public/data/segment_data_itc.json  # segment time series (standalone)
```

### `annualReportRatios.ts` — already computed, just not wired
- Margins: EBITDA, PBT, PAT
- Returns: ROE, ROA, ROCE (simplified)
- Efficiency: Asset turnover, equity turnover
- Leverage: DebtToEquity, DebtToAssets, equity ratio
- Cash: cashConversion, fcfYield, dividendPayout
- DuPont: margin × turnover × leverage components

**Gap**: No UI component uses this file. It's a complete ratio engine sitting unused.

---

## 3. Proposed Approach

### Priority 1: Ratios Tab (highest impact)
**Why**: `annualReportRatios.ts` is production-ready. Just needs a UI component to display it.
**What**: New `RatiosTab` component with:
- **Margin trends** (gross, ebitda, pbt, pat — 10Y line chart)
- **Returns chart** (ROE, ROA, ROCE — 10Y line chart)  
- **DuPont table** (ROE = NPM × Turnover × Leverage, by year)
- **Efficiency table** (asset turnover, equity turnover, inventory
days)
- **Leverage table** (debt/equity, debt/assets, equity ratio)
- **Cash ratios** (cash conversion, FCF yield, dividend payout)

### Priority 2: Segment Trend Charts (medium impact)
**Why**: Currently only has a pie chart. No temporal view of segment mix evolution.
**What**: Add to SegmentsView:
- **Stacked area chart** — segment revenue over 10 years
- **Segment ROCE comparison** — bar chart by segment
- **Segment margin analysis** — revenue vs results scatter

### Priority 3: Cash Flow Waterfall (medium impact)
**Why**: Visual bridge from CFO to closing cash is more intuitive than a table.
**What**: New waterfall component in CashFlowView:
- Bars: CFO → Capex → Dividends → Investing → Financing → Net Change → Closing
- Color coding: green (inflow), red (outflow), blue (net)

### Priority 4: P&L YoY Growth Columns (low impact)
**What**: Add YoY % columns in DataDrivenTable for P&L tab (next to absolute values).
**Why**: Currently only has CAGR in the last column. Year-on-year helps spot inflection points.

---

## 4. Step-by-Step Plan

### Task A: Ratios Tab (3–4 hrs)

| Step | File | Action |
|------|------|--------|
| 1 | `src/components/sensex/RatiosTab.tsx` | Create new component |
| 2 | `src/components/sensex/AnnualReportsSection.tsx` | Add `'ratios'` to Tab type, TABS array, render condition |
| 3 | `src/utils/annualReportRatios.ts` | Verify all ratio functions work with ITC data, add missing ones if needed |
| 4 | `src/components/sensex/RatiosTab.tsx` | Build margin trends chart (recharts line) |
| 5 | `src/components/sensex/RatiosTab.tsx` | Build returns chart (ROE/ROA/ROCE) |
| 6 | `src/components/sensex/RatiosTab.tsx` | Build DuPont decomposition table |
| 7 | `src/components/sensex/RatiosTab.tsx` | Build efficiency + leverage + cash ratio tables |
| 8 | `src/components/sensex/AnnualReportsSection.tsx` | Hide regular KPI cards when on ratios tab |
| 9 | All | Build, test, verify |

### Task B: Segment Trend Charts (2–3 hrs)

| Step | File | Action |
|------|------|--------|
| 1 | `src/components/sensex/AnnualReportsSection.tsx` | Add stacked area chart using segment time-series data |
| 2 | `src/components/sensex/AnnualReportsSection.tsx` | Add segment ROCE bar chart (needs segment results / segment assets) |
| 3 | `src/components/sensex/AnnualReportsSection.tsx` | Add segment margin scatter (results vs revenue) |

### Task C: Cash Flow Waterfall (2–3 hrs)

| Step | File | Action |
|------|------|--------|
| 1 | `src/components/sensex/WaterfallChart.tsx` | Create generic waterfall using recharts |
| 2 | `src/components/sensex/AnnualReportsSection.tsx` | Build bridge: CFO → add/subtract items → Closing Cash |
| 3 | `src/components/sensex/AnnualReportsSection.tsx` | Color code: green (positive), red (negative), blue (net) |

### Task D: P&L YoY Growth (1–2 hrs)

| Step | File | Action |
|------|------|--------|
| 1 | `src/components/sensex/AnnualReportsSection.tsx` | In DataDrivenTable, add YoY % column next to each FY column |
| 2 | `src/components/sensex/AnnualReportsSection.tsx` | Color code: green (growth > 5%), red (decline < -5%) |

---

## 5. Files Likely to Change

**New files:**
- `src/components/sensex/RatiosTab.tsx` — complete new tab
- `src/components/sensex/WaterfallChart.tsx` — reusable waterfall component

**Modified files:**
- `src/components/sensex/AnnualReportsSection.tsx` — add ratios tab, wire waterfall, enhance segments, add YoY columns
- `src/utils/annualReportRatios.ts` — extend if gaps found during integration

**Unchanged:**
- `src/utils/annualReportCashFlow.ts` — stable
- `scripts/extract_ar.py` — no data changes needed
- `public/data/ar/ITC.json` — no data changes needed

---

## 6. Tests & Validation

| Step | How |
|------|-----|
| Ratios tab renders all 9 metrics | Visual check + data verification against ITC AR |
| DuPont components multiply correctly | ROE ≈ Margin × Turnover × Leverage (±0.1%) |
| Segment stacked area | All segments visible, total ≈ revenue from P&L |
| Waterfall bars sum | CFO + Capex + CFI + CFF + ... = Net Change (±0.01Cr) |
| YoY growth | Manual spot-check 3–5 rows against calculator |
| All tabs still work | Click through all 7 tabs, verify no regressions |
| Build | `npm run build` < 30s, no errors |
| Tests | `npm run test` all 570+ pass |

---

## 7. Risks & Tradeoffs

| Risk | Mitigation |
|------|-----------|
| `annualReportRatios.ts` may need decimal precision fixes | Spot-check 3–5 cells against known values |
| Segment data has missing values for some segments/years | Graceful null handling (already in OverviewTab sparklines) |
| Waterfall chart needs intermediate computed values | Derive from existing CF KPIs (cfoCr, capexCr, dividendCr, cfiCr, cffCr) |
| Recharts waterfall not a built-in chart type | Use stacked bar with invisible base layer trick |
| Adding YoY columns makes table too wide | Only show for P&L tab; hide on BS/CF tabs |
| Ratios tab feels redundant with Overview ratios | Different granularity: overview shows latest snapshot, ratios tab shows full 10-year trend per metric |

---

## 8. Open Questions

1. **Simplification**: Can we skip P&L YoY growth columns if the Overview sparklines + Trends chart cover the same ground? 
   - *Decision*: Yes, deprioritize Task D. Do A, B, C first.
2. **BS side-by-side view**: Is this needed if the Balance Sheet tab already shows both sides?
   - *Decision*: No, existing DataDrivenTable is sufficient. Skip.
3. **Order of operations**: Ratios first (highest ROI, lowest risk), then Segments, then Waterfall.
4. **Peer comparison in Ratios tab**: Should we fetch peer ratios from screener.in/scraped data?
   - *Decision*: No, out of scope. Focus on single-company display.

---

## 9. Estimated Effort

| Task | Hours | Risk |
|------|-------|------|
| A — Ratios Tab | 3–4 | Low (ratios already computed) |
| B — Segment Trends | 2–3 | Low (data already available) |
| C — CF Waterfall | 2–3 | Medium (recharts waterfall trick) |
| D — P&L YoY | 1–2 | Low (simple math) |
| Integration + polish | 1–2 | — |
| **Total** | **9–14 hrs** | **Low overall** |

---

## 10. Success Criteria

- [ ] Ratios tab shows margin trends, returns, DuPont, efficiency, leverage, cash ratios
- [ ] Segment tab has stacked area chart + ROCE bars
- [ ] Cash Flow tab has waterfall bridge chart
- [ ] All 7 tabs (Overview, P&L, BS, CF, Segments, Charts, Ratios) work without errors
- [ ] Build < 30s, tests 570+ pass
- [ ] No TypeScript errors

---

## 11. Iteration Log

| Iteration | What Changed | Why |
|-----------|-----------|-----|
| v1 | Initial draft | — |
| | | |
