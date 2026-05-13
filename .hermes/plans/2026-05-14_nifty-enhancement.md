# Nifty 250/750 Enhancement Plan

## Current State

Both Nifty250UniverseSection (483 lines) and Nifty750UniverseSection (712 lines) share the same architecture:
- Hero banner with 8 KPIs
- Range selector
- UniverseEarningsPower chart + SectorComposition pie
- SectorAnalyticsTable
- SectorMomentumHeatmap
- TopWeightsChart + GrowthValuationScatter
- ImpliedVsRealizedScatter
- MagicFormulaCard
- FactorScorecard
- ConstituentLedger (sortable table)
- DrillDown on selected company

Nifty250 has additional: ValuationBucketsTable, search query + sector multi-select filter.
Nifty750 has: batch selector (3 indices), data quality warnings panel.

Both use the same analytics pipeline from sensexAnalytics.ts.

## Enhancement Plan

### Phase 1: Nifty 250 Enhancements

1. **Earnings Quality Scorecard** — new chart showing earnings stability, PAT consistency, accruals ratio
2. **ROCE Distribution Chart** — histogram of ROCE across universe, with sector overlay
3. **Free Cash Flow Yield Chart** — FCF yield scatter + sector average bars
4. **Valuation vs Quality Matrix** — bubble chart: X = composite quality score, Y = valuation z-score
5. **Dividend Aristocrats Panel** — companies with 5+ years of consistent dividend growth
6. **Export to CSV** for ledger data (Nifty250 already has sector analytics export)
7. **Add Piotroski F-Score** to factor scores
8. **Add EPS consistency metric** to analytics

### Phase 2: Nifty 750 Parity + Enhancements

9. **Add search + sector multi-select filter** to 750 (parity with 250)
10. **Add ValuationBucketsTable** to 750
11. **Add Export All Analytics button** to 750
12. **Add peer comparison** to DrillDown in 750
13. **Cross-batch comparison** — compare metrics across LargeMid/Small/Micro

### Phase 3: Shared New Components

14. **ROCE Trend Chart** — line chart showing ROCE trend for selected company
15. **Debt Analysis Chart** — debt-to-equity trend + interest coverage
16. **Revenue/Profit Growth Bars** — horizontal bar chart of top growers/decliners
17. **Margin Expansion Tracker** — operating margin trend across sectors
18. **Capital Efficiency Quadrant** — ROCE vs Revenue Growth scatter
