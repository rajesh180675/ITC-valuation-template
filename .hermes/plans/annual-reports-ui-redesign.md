# Annual Reports UI Redesign Plan

## Current Problems
1. Charts tab is default — tables should be primary for financial analysis
2. No side-by-side year comparison — single column per year, hard to spot trends
3. KPI cards are generic — not tailored per tab
4. No visual hierarchy — everything looks the same
5. Common-size toggle is hidden, not intuitive
6. No drill-down from KPIs to line items
7. Segments view is just tables — no trend charts
8. No margin/efficiency analysis view
9. Cash flow view has good structure but charts waste space

## New Design: "Financial Command Center"

### Layout Architecture
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Company selector + Year filter chips               │
├─────────────────────────────────────────────────────────────┤
│  KPI STRIP: Context-aware cards (changes per tab)          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────────────────────────────┐    │
│  │ NAV      │  │  MAIN CONTENT AREA                   │    │
│  │ · Overview│  │  (tab-specific layout)               │    │
│  │ · P&L    │  │                                      │    │
│  │ · Balance│  │                                      │    │
│  │ · Cash   │  │                                      │    │
│  │ · Segment│  │                                      │    │
│  │ · Ratios │  │                                      │    │
│  └──────────┘  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Tab Designs

#### 1. OVERVIEW (new default)
- 10-year sparkline grid: Revenue, PAT, CFO, FCF, ROE, Margins
- Mini charts in cards (trend line per KPI)
- Key ratios table: ROE, ROA, Margin, Asset Turnover, Leverage
- Cash conversion waterfall (latest year)
- Segment revenue mix donut (latest)

#### 2. P&L TABLE (replaces old flat table)
- Multi-year table with ALL 10 years visible
- Section headers: Revenue, Expenses, Profits
- Common-size toggle as column mode (not separate view)
- YoY growth column
- CAGR column
- Color coding: green=positive, red=negative growth
- Sticky first column for labels

#### 3. BALANCE SHEET
- Sectioned: Assets (Current/Non-current), Equity, Liabilities
- Asset-Liability side-by-side view option
- Equity bridge: Opening + PAT - Dividends = Closing
- Key ratios: Current ratio, Debt/Equity, Asset turnover

#### 4. CASH FLOW
- Keep current grouped table (Operating/Investing/Financing/Summary)
- Add waterfall chart: CFO → Capex → FCF → Dividend → Net Cash
- Cash conversion trend
- FCF yield calculation

#### 5. SEGMENTS
- Revenue trend chart (all segments over time)
- Segment margin analysis
- Revenue mix evolution (stacked area)
- Keep detailed tables below

#### 6. RATIOS (new tab)
- DuPont analysis: ROE = Margin × Turnover × Leverage
- Margin trend: Gross, EBITDA, PBT, PAT
- Efficiency: Asset turnover, Inventory days, Receivable days
- Returns: ROE, ROA, ROCE
- Valuation: P/E implied from model, EV/EBITDA

### Implementation Strategy

Create NEW file: `AnnualReportsSection.tsx` — complete rewrite
Keep OLD file as backup: `AnnualReportsSection.tsx.bak`

Key components to build:
1. `OverviewTab` — sparkline cards + ratio table + waterfall
2. `PnLTab` — multi-year table with growth columns
3. `BalanceSheetTab` — structured BS with AL view
4. `CashFlowTab` — enhanced current CF view
5. `SegmentsTab` — charts + tables
6. `RatiosTab` — DuPont + margin + efficiency

Shared utilities:
- `Sparkline` — mini SVG line chart
- `KpiCard` — enhanced with sparkline
- `MultiYearTable` — reusable table with growth/CAGR
- `WaterfallChart` — for CF bridge
- `RatioCalculator` — compute all ratios from raw data

### Data Verification Plan
After implementation, verify EVERY cell against ITC AR PDF:
1. FY2025 P&L: Revenue 74,236.07 gross → 69,323.52 net, PAT 20,091.85
2. FY2025 BS: Total Assets 84,009.20, Equity 69,151.55
3. FY2025 CF: CFO 16,751.01, CFI 141.48, CFF -16,765.62
4. All 10 years: cross-check 50+ data points
5. Segment data: Cigarettes 32,631, FMCG-Others 21,975

### Gates
- typecheck 0 errors
- tests 570+ pass
- build <20s
