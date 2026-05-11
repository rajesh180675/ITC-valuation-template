# ITC Valuation Template — Dashboard Features Reference

**Purpose:** Comprehensive index of all dashboard sections, their data sources, features, and which data fields they consume. Use this to understand the app's capabilities and where to add new features.

## Navigation Structure

The sidebar has 22 sections (ordered as displayed):

### Company Analysis (ITC-specific)
| # | Route | Component | Description |
|---|-------|-----------|-------------|
| 1 | `dashboard` | DashboardSection | ITC company overview — KPI cards, performance charts |
| 2 | `stockPerf` | StockPerfSection | Stock price performance, returns analysis |
| 3 | `financials` | FinancialsSection | Financial statements (P&L, BS, CF) |
| 4 | `segments` | SegmentsSection | Segment revenue breakdown (Premium feature) |
| 5 | `businessModel` | BusinessModelSection | Business model analysis, moat assessment |
| 6 | `tax` | TaxAnalyzerSection | Tax rate analysis |
| 7 | `dividend` | DividendSection | Dividend history, payout analysis |
| 8 | `capitalAllocation` | CapitalAllocationSection | Capital allocation decisions |
| 9 | `workingCapital` | WorkingCapitalSection | Working capital efficiency |

### Valuation & Strategy
| # | Route | Component | Description |
|---|-------|-----------|-------------|
| 10 | `valuation` | ValuationSection | DCF / multiples valuation with user assumptions |
| 11 | `advanced` | AdvancedValuationSection | Advanced valuation lab |
| 12 | `ideaLab` | IdeaLabSection | Investment idea generation |
| 13 | `universe` | CompanyUniverseSection | Full company universe browser |
| 14 | `projections` | ProjectionsSection | Financial projections model |
| 15 | `playbook` | PlaybookSection | Budget / resource allocation playbook |

### Universe / Index Analytics
| # | Route | Component | Description |
|---|-------|-----------|-------------|
| 16 | `global` | GlobalCompareSection | Global peer comparison |
| 17 | `sensex` | SensexUniverseSection | Sensex (30 companies) — KPI, sector, CAGR, Magic Formula, factor scores |
| 18 | `nifty250` | Nifty250UniverseSection | **Nifty 250** — full analytics (30 fields) |
| 19 | `nifty750data` | NiftyIndexDataSection | Nifty 750 raw data browser |
| 20 | `nifty750` | Nifty750UniverseSection | **Nifty 750** — full analytics (740 cos) |
| 21 | `ralph` | RalphSection | Ralph Lab — special analysis |
| 22 | `deepdive55y` | DeepDive55YSection | 55-year deep dive |
| 23 | `itDeepDive` | IndianITDeepDiveSection | IT services sector deep dive |

## Key Universe Section Features

### Nifty250UniverseSection (also Nifty750 / Sensex)

#### Header KPI Bar
- **Constituents**: Total companies (dynamic from data) / Active filter count
- **Market Cap**: Aggregate float market cap
- **BFSI / Corp Mix**: Financial vs non-financial weight split
- **Lead Sector**: Largest sector by weight
- **Universe PAT CAGR**: Aggregate net profit CAGR
- **Median PAT CAGR**: Constituent median CAGR
- **Wt. β / CoE**: Weighted average beta and cost of equity (CAPM)
- **HHI / Effective N**: Herfindahl concentration index

#### Filter Bar
- **All / Corporates / BFSI**: Quick filter by reporting type
- **Sector filter**: Multi-select sector dropdown (new in `a438f22`)
- **Search**: Company name/ticker search (new in `a438f22`)

#### Analysis Window Slider
- Adjustable start/end fiscal year range
- All analytics recompute live on range change

#### Analytics Panels

| Panel | Component | Description |
|-------|-----------|-------------|
| Universe Earnings Power | `UniverseEarningsPower` | Aggregate topline & net profit over time + CAGR + Avg ROE |
| Sector Composition | `SectorComposition` | Donut chart of sector weights |
| Sector Analytics | `SectorAnalyticsTable` | Per-sector: companies, weight, mcap, ROE, PAT CAGR, β, CoE, multiple, HHI |
| Sector Momentum Heatmap | `SectorMomentumHeatmap` | YoY PAT growth by sector, shows rotation across cycles |
| Top Weights | `TopWeightsChart` | Bar chart of top weighted companies |
| Growth × Valuation Map | `GrowthValuationScatter` | Scatter: PAT CAGR vs P/E (or P/B) multiple, bubble = log mcap |
| Market-Implied vs Delivered Growth | (reverse Gordon) | Scatter: implied perpetual growth vs realized PAT CAGR |
| Magic Formula | `MagicFormulaCard` | Greenblatt rank: capital efficiency (ROCE/ROE) + earnings yield (E/P or ROE/PB) |
| Factor Scorecard | `FactorScorecard` | Percentile-ranked: Quality / Value / Growth / Momentum |
| Valuation Buckets | `ValuationBucketsTable` | Cheap/Fair/Expensive by sector z-scores (new in `a438f22`) |
| Constituent Ledger | `ConstituentLedger` | Sortable table with all companies, CSV export, pagination (new in `a438f22`) |
| Data Provenance Banner | `DataProvenanceBanner` | Source attribution, methodology notes |

#### Drilled-Down Company View
- **KPI cards**: Market Cap, CMP, Index Weight, PAT CAGR, CoE, Implied Growth, Earnings Vol
- **Topline/Net Profit chart**: Historical performance
- **Factor Profile**: Radar (Quality/Value/Growth/Momentum)
- **DuPont Decomposition**: ROE breakdown
- **Reverse-Gordon Read**: Market-implied vs delivered growth gap
- **Data Guardrails**: Methodology warnings

## Shared Component Library (`src/components/sensex/shared/`)

| Component | File | Used In | Description |
|-----------|------|---------|-------------|
| Kpi | `Kpi.tsx` | All | KPI display card |
| SmallStat | `SmallStat.tsx` | All | Small stats |
| FactorBar | `FactorBar.tsx` | FactorScorecard | Horizontal factor bar + ScoreChip + InlineLegend |
| ScoreChip | `ScoreChip.tsx` | Various | Colored score chip |
| RangeSelector | `RangeSelector.tsx` | All | Fiscal year range slider |
| UniverseEarningsPower | `UniverseEarningsPower.tsx` | Sensex/Nifty250/Nifty750 | Aggregate topline/profit chart |
| SectorComposition | `SectorComposition.tsx` | All | Sector weight donut |
| SectorAnalyticsTable | `SectorAnalyticsTable.tsx` | All | Sector fundamentals table |
| TopWeightsChart | `TopWeightsChart.tsx` | All | Weight leaderboard bar chart |
| GrowthValuationScatter | `GrowthValuationScatter.tsx` | All | CAGR × P/E scatter |
| FactorScorecard | `FactorScorecard.tsx` | All | Factor percentile grid |
| MagicFormulaCard | `MagicFormulaCard.tsx` | All | Greenblatt rank table + scatter |
| SectorMomentumHeatmap | `SectorMomentumHeatmap.tsx` | All | YoY PAT growth heatmap |
| DataProvenanceBanner | `DataProvenanceBanner.tsx` | All | Data source attribution |
| ConstituentLedger | `ConstituentLedger.tsx` | All | Sortable table + CSV export |
| DrillDown | `DrillDown.tsx` | All | Company drill-down |
| **ValuationBucketsTable** | `ValuationBucketsTable.tsx` | Nifty250/Nifty750 | Cheap/Fair/Expensive by sector (new) |

## Analytics Utilities (`src/utils/`)

| Function | File | Purpose |
|----------|------|---------|
| `buildSensexIndexTimeSeries` | `itcModel.ts` | Aggregate topline/profit/ROE series across all companies |
| `buildSensexSectorSummary` | `itcModel.ts` | Sector weights, counts, market cap |
| `calculateCagr` | `itcModel.ts` | Compound Annual Growth Rate |
| `getLatestSensexFinancial` | `itcModel.ts` | Latest year data for a company |
| `getPrimaryValuationLabel` | `itcModel.ts` | P/E or P/B label based on reporting type |
| `buildFactorScores` | `sensexAnalytics.ts` | Quality/Value/Growth/Momentum factor scores |
| `buildMagicFormulaRanks` | `sensexAnalytics.ts` | Greenblatt capital efficiency + earnings yield |
| `buildSectorAnalytics` | `sensexAnalytics.ts` | Per-sector weighted averages |
| `buildSectorMomentumGrid` | `sensexAnalytics.ts` | YoY PAT growth heatmap grid |
| `buildValuationZScores` | `sensexAnalytics.ts` | Z-scores vs sector median multiple |
| **`computeValuationBuckets`** | `sensexAnalytics.ts` | Cheap/Fair/Expensive buckets by sector (new) |
| `computeConcentration` | `sensexAnalytics.ts` | HHI and effective N |
| `computeDuPont` | `sensexAnalytics.ts` | ROE decomposition |
| `costOfEquity` | `sensexAnalytics.ts` | CAPM: Rf + β × ERP |
| `impliedPerpetualGrowth` | `sensexAnalytics.ts` | Reverse Gordon Growth Model |
| `earningsVolatility` | `sensexAnalytics.ts` | Std dev of YoY PAT growth |
| **`adaptNifty250Constituent`** | `adaptNifty250Constituent.ts` | Runtime data validation (new) |
| **`exportCsv` / `csvEscape`** | `export.ts` | Shared CSV export (new) |

## Data Sources

| Source | What It Provides | Update Frequency |
|--------|-----------------|-----------------|
| Screener.in | P&L, BS, CF, Ratios (30+ fields) | On-demand via `npm run data:refresh-nifty250` |
| Screener.in (Peers API) | Peer comparison: CMP, P/E, Mkt Cap, Div Yield, Quarterly NP/Sales, ROCE | On-demand via `scripts/collect_peers.py` |
| yfinance | Beta vs ^NSEI (5Y weekly regression) | On-demand via `python scripts/compute_betas.py` |
| NSE API | Constituent lists, industry classification | On-demand |
| Hardcoded reference | Fallback data when live feed unavailable | Static |

## Data Pipeline

```
Python scraper → source-pack JSONs → Node.js assembler → public/data/*.json → React fetch() → adaptNifty250Constituent() → SensexConstituent[]
```

## Key Interfaces

### SensexConstituent
```typescript
interface SensexConstituent {
  id: string;           // ticker.toLowerCase()
  name: string;
  ticker: string;
  sector: string;
  reportingType: 'financial' | 'nonFinancial';
  weightPct: number;    // topline-based
  marketCapCr: number;
  cmp: number;          // current market price
  valuationMetric: 'pe' | 'pb';
  valuationMultiple: number;
  dividendYieldPct: number;
  color: string;
  beta: number;         // vs ^NSEI, 5Y weekly
  history: SensexYearFinancial[];
}
```

### SensexYearFinancial
```typescript
interface SensexYearFinancial {
  fy: string;            // e.g. "FY2024"
  toplineCr: number;
  netProfitCr: number;
  roePct: number;
  rocePct?: number;
  operatingMarginPct?: number;
  // All 30+ fields populated by enhanced scraper
}
```

## NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Development server |
| `build` | `vite build` | Production build |
| `fetch:nifty250` | Python collector | Scrape Nifty250 data |
| `generate:nifty250` | Node.js assembler | Build Nifty250 feed |
| `data:refresh-nifty250` | Both above | Full refresh |
| `fetch:nifty750` | Python collector | Scrape all 3 Nifty750 indices |
| `generate:nifty750-real` | Node.js assembler | Build Nifty750 feed |
| `data:refresh-nifty750` | Both above | Full refresh |

