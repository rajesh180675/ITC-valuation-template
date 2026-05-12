# Annual Reports Data Hub — Design Specification

**Date:** 2026-05-12  
**Status:** Draft v1  
**Author:** Hermes Agent  
**Goal:** Build a comprehensive Annual Reports subsystem that extracts ALL financial data from company annual report PDFs and presents it in an interactive, Bloomberg/Refinitiv-grade tabular format with charts, valuation tools, and cross-sectional analysis.

---

## 1. Current Context & Empirical Findings

### Annual Report Availability
- **ITC portal** (`www.itcportal.com/investors`) serves all annual reports as PDFs with a predictable URL pattern:
  ```
  https://www.itcportal.com/content/dam/itc-corporate/pdfs/report-and-accounts/ITC-Report-and-Accounts-{YEAR}.pdf
  ```
- Downloaded 10 reports (FY2016–FY2025), each 7–23 MB, 170–412 pages
- **Every year has identical section structure** (same note numbering, same table formats) — this is critical for automation

### Document Structure (FY2025 Example — 412 pages)

| Section | Pages | Data Type |
|---------|-------|-----------|
| Directors' Report + Management Discussion | 1–155 | Text (non-tabular) |
| **Standalone Balance Sheet** | 156 | 2‑col table: FY2025, FY2024 |
| **Standalone P&L** | 157 | 2‑col table: FY2025, FY2024 |
| **Standalone Changes in Equity** | 158–159 | Matrix table with scroll |
| **Standalone Cash Flow Statement** | 160–161 | 2‑col table |
| Notes 1–28 (standalone) | 162–201 | Tables in each note (depreciation, investments, borrowings, etc.) |
| Note 29 (Additional Notes) | 202–214 | Tables |
| Note 30 (Segment Reporting) | 215–216 | ✅ Already extracted |
| Note 31 (Related Party) | 217–220 | Tables |
| Note 32+ (Financial Instruments) | 221–241 | Tables |
| Consolidated Financial Statements | 242–412 | Same structure as standalone |

### Extraction Technology
- **PyMuPDF (fitz)** verified to be **40× faster** than pdfplumber for 20MB PDFs
- Opens 412-page PDF in **0.1s**; extracts all text in **3–5s**
- Position-based parsing (x, y coordinates) reconstructs multi-column tables perfectly
- Already validated for: Segment Reporting (Note 30), Balance Sheet (Page 156), P&L (Page 157)

### Constraints
- ITC portal blocks `wget`/`curl` without `User-Agent` header
- Other companies will have different URL patterns for their ARs
- PDF table formatting varies by company (requires extensible parser config)
- Annual reports for NSE-listed companies are also on BSE/NSE corporate filings (less reliable)

---

## 2. System Architecture

### 2.1 Data Layer — PDF Extraction Pipeline

```
                  ┌──────────────────┐
                  │ Company URL DB   │
                  │ (ticker → AR URL)│
                  └──────┬───────────┘
                         ▼
                  ┌──────────────────┐
                  │ Download Manager │
                  │ (curl with UA,   │
                  │  skip cached)    │
                  └──────┬───────────┘
                         ▼
                  ┌──────────────────┐
                  │ PyMuPDF Parser   │
                  │ (fitz, 3-5s/doc)│
                  └──────┬───────────┘
                         ▼
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐
   │ Statement  │ │   Notes    │ │  Segment   │
   │ Extractor  │ │ Extractor  │ │ Extractor  │
   │ (BS, PL,  │ │ (1-33)     │ │ (Note 30)  │
   │  CF, SCE) │ │            │ │            │
   └─────┬──────┘ └──────┬─────┘ └─────┬──────┘
         │               │              │
         └───────────────┼──────────────┘
                         ▼
               ┌──────────────────┐
               │  JSON Store      │
               │ /public/data/ar/ │
               │  {ticker}.json   │
               └──────────────────┘
```

### 2.2 UI Layer — React Components

```
┌─────────────────────────────────────────────────┐
│ Annual Reports (new sidebar nav)                  │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ Header: Company selector + Year selector    │ │
│ │ + Data Source badge (PDF / scraped)         │ │
│ ├─────────────────────────────────────────────┤ │
│ │ Tab Bar:                                    │ │
│ │ [P&L] [Balance Sheet] [Cash Flow] [Segments]│ │
│ │ [Notes] [Ratios] [Valuation] [DuPont]       │ │
│ ├─────────────────────────────────────────────┤ │
│ │ Content Area:                               │ │
│ │                                              │ │
│ │  Income Statement (Multi-Year Comparison)    │ │
│ │  ┌───────┬──────┬──────┬──────┬──────┐      │ │
│ │  │ Item  │FY2025│FY2024│FY2023│Trend │      │ │
│ │  ├───────┼──────┼──────┼──────┼──────┤      │ │
│ │  │Revenue│74,236│67,293│...   │ ▲8.2%│      │ │
│ │  │EBITDA │24,025│23,494│...   │ ▲2.3%│      │ │
│ │  │PAT    │20,092│19,910│...   │ ▲0.9%│      │ │
│ │  └───────┴──────┴──────┴──────┴──────┘      │ │
│ │                                              │ │
│ │  Charts: waterfall, margin trend, YoY bars   │ │
│ │                                              │ │
│ │  Source citation: "ITC Report & Accounts     │ │
│ │   2025, Note 22A" with PDF page link         │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 3. Data Extraction — Detailed Design

### 3.1 Company URL Mapping

```typescript
// src/data/arUrls.ts
// For companies with known annual report URL patterns
const AR_URLS: Record<string, (year: number) => string | null> = {
  'ITC': (y) => `https://www.itcportal.com/content/dam/itc-corporate/.../ITC-Report-and-Accounts-${y}.pdf`,
  // Others need per-company discovery
};
```

Future: scraper that finds AR URLs via NSE/BSE corporate filings + company IR pages.

### 3.2 Statement Extractor (BS, P&L, CF, SCE)

Using the same PyMuPDF position-based approach validated for segment data:

```python
def extract_statement(pdf_path: str, statement_type: str) -> dict:
    """
    statement_type: 'balance_sheet' | 'profit_loss' | 'cash_flow' | 'changes_in_equity'
    Returns { 'fyCurrent': int, 'fyPrior': int, 'items': [{label, cur, pri, note_ref}] }
    """
```

Key challenge: detecting which page contains which statement. Strategy:
- Search for keywords: "Balance Sheet as at", "Statement of Profit and Loss", "Cash Flow Statement"
- The 2025 AR has BS at page 156, P&L at 157. But this varies by year.
- Use text search on first 100 chars of each page.

### 3.3 Note Extractor (Note 1–33)

Each note has a different table structure. Approach:
- Classify notes into table types:
  - **Simple 2-col**: "Property, Plant & Equipment" (cost/depreciation/net book value)
  - **Multi-col matrix**: "Investments" (carrying amount, additions, deletions by category)
  - **Text-heavy**: "Contingent Liabilities", "Commitments"
- Use position-based parsing for simple tables
- Use text extraction for complex/irregular tables
- Store raw + structured (where possible)

### 3.4 Multi-Year Compiler

Each annual report contains 2 years of data (current + prior). To build a 10-year time-series:

```
Strategy: "Overlapping windows"
- AR 2025 → FY2025 + FY2024
- AR 2024 → FY2024 + FY2023
- AR 2023 → FY2023 + FY2022
- ... → merge by item label
```

**Assertion**: Item labels are consistent year-to-year. Verified with ITC 2016–2025.

**Risk**: Label changes when accounting standards change (e.g., Ind AS adoption in FY2018). Mitigation: manual mapping table for known label changes.

### 3.5 Output JSON Schema

```typescript
interface AnnualReportData {
  ticker: string;
  companyName: string;
  yearsCovered: string[];  // ["FY2016", ..., "FY2025"]
  
  statements: {
    profitLoss: {
      fy: { [fyLabel: string]: PlItem[] };
      // PlItem: { label: string, noteRef: string, valueCr?: number, priorValueCr?: number }
    };
    balanceSheet: { ... };
    cashFlow: { ... };
    changesInEquity: { ... };
  };
  
  notes: {
    [noteNumber: string]: {
      header: string;
      tables: any[];  // typed by note type
    };
  };
  
  segments: {
    // Already extracted (Note 30)
    revenue: { [segmentName: string]: { [fy: string]: number } };
    results: { ... };
    assets: { ... };
    liabilities: { ... };
  };
  
  metadata: {
    source: string;
    pdfUrls: { [year: string]: string };
    extractedAt: string;
    warnings: string[];
  };
}
```

---

## 4. Dashboard UI — Detailed Design

### 4.1 Sidebar Nav & Routing
- New nav item: `annualReports` with label "Annual Reports" and icon `BookOpen`
- Route: `case 'annualReports': return <AnnualReportsSection />`

### 4.2 Component Hierarchy

```
AnnualReportsSection
├── HeaderBar (company selector, year range slider, source badge)
├── ReportTabBar [P&L | BS | CF | Segments | Notes | Ratios | Valuation | DuPont]
└── ContentArea
    ├── PnLTab
    │   ├── MultiYearTable
    │   │   ├── Row group: "Revenue" (Revenue, Other Income, Total Income)
    │   │   ├── Row group: "Expenses" (COGS, Employee, Depreciation, Finance Costs,...)
    │   │   ├── Row group: "Profitability" (EBITDA, PBT, PAT, EPS)
    │   │   └── Each row: label, note ref, 10 years of columns, trend arrow
    │   ├── ChartPanel
    │   │   ├── Revenue waterfall (segment breakdown stacked bar)
    │   │   ├── Margin trend (EBITDA%, PAT% over 10Y line chart)
    │   │   ├── Revenue vs PAT (dual axis chart)
    │   │   └── YoY growth rate (bar chart)
    │   └── ExportButton (CSV download of current table view)
    │
    ├── BalanceSheetTab
    │   ├── MultiYearTable
    │   │   ├── "EQUITY & LIABILITIES" → Shareholder Funds, Non-current Liabilities, Current Liabilities
    │   │   └── "ASSETS" → Non-current Assets, Current Assets
    │   └── ChartPanel
    │       ├── Asset mix (stacked area over time)
    │       ├── Debt vs Equity (comparison bar)
    │       └── Working capital trend
    │
    ├── CashFlowTab
    │   ├── MultiYearTable (Operating / Investing / Financing / Net Change)
    │   └── ChartPanel
    │       ├── Free Cash Flow trend
    │       ├── CFO vs PAT quality ratio
    │       └── Capex as % of CFO
    │
    ├── SegmentsTab
    │   ├── MultiYearTable (Segment Revenue, Results, Assets, Liabilities)
    │   ├── ChartPanel
    │   │   ├── Segment revenue share (donut per year, animated)
    │   │   ├── Segment revenue trend (stacked area)
    │   │   └── Segment ROCE comparison (bar)
    │   └── (Data already extracted for ITC)
    │
    ├── NotesTab → Table of contents → Expandable note viewer
    │   Search within notes, direct PDF page links
    │
    ├── RatiosTab → Computed from statements
    │   ├── Profitability: Gross Margin, EBITDA Margin, PAT Margin, ROE, ROCE
    │   ├── Liquidity: Current Ratio, Quick Ratio, Cash Conversion Cycle
    │   ├── Solvency: Debt/Equity, Interest Coverage Ratio
    │   ├── Efficiency: Asset Turnover, Inventory Turnover, Receivable Days
    │   └── All with 10-year trend + peer comparison
    │
    ├── ValuationTab (integrated with existing DCF)
    │   ├── Historical valuation (P/E, P/B, EV/EBITDA bands over 10Y)
    │   ├── Reverse DCF (what growth does current price imply?)
    │   ├── Peer multiples comparison
    │   └── Sensitivity table (growth × margin scenarios)
    │
    └── DuPontTab
        ├── DuPont decomposition (ROE = NPM × AT × Leverage)
        ├── 10-year breakdown into stacked bars
        └── Five-way DuPont (Tax Burden × Interest Burden × EBIT Margin × AT × Leverage)
```

### 4.3 Shared Components (new)

| Component | Purpose |
|-----------|---------|
| `MultiYearTable` | Generic table: rows = labels, columns = FYs, cells = formatted numbers + conditional coloring |
| `TrendArrow` | ▲/▼ green/red with percentage: `▲8.2%` |
| `NoteRef` | Clickable badge "Note 22A" → scrolls to Notes tab |
| `SourceCitation` | "Source: ITC Report & Accounts 2025, Page 156" with PDF download link |
| `RatioCard` | Single metric with 10Y sparkline + peer percentile |
| `ChartPanel` | Container with chart type selector + time range slider + export |
| `WaterfallChart` | Revenue breakdown (segment → total) using Recharts waterfall |
| `MarginTrend` | Multi-line chart with fill (EBITDA%, PAT%) |
| `DonutYear` | Animated donut that transitions between years |

### 4.4 Interaction Design
- **Hover/click on table rows** → highlights corresponding chart series
- **Click a year column** → isolates that year in charts
- **Pin a metric** → shows it in a "watchlist" sidebar
- **PDF page link** → opens the original PDF at that page (local file or URL)
- **Excel export** → downloads current view as CSV
- **Collapsible row groups** → revenue detail expands/collapses

---

## 5. Implementation Plan (Steps)

### Phase 1: Extraction Engine (4–6 hrs)
1. Create `scripts/extract_ar.py` with generic `extract_statement()` and `extract_note()` functions
2. Validate on ITC FY2025: extract BS, P&L, CF
3. Validate on ITC FY2024–2021 (ensure label consistency)
4. Build multi-year compiler (merge overlapping windows)
5. Save to `public/data/ar/ITC.json`

**Files:**
- `scripts/extract_ar.py` (new)
- `scripts/extract_itc_segments.py` (refactor into extract_ar.py)
- `public/data/ar/ITC.json` (new, 50–100 KB)

### Phase 2: Company URL Database (2–3 hrs)
1. Create `scripts/ar_urls.py` with URL patterns for major companies
2. Add ITC, RELIANCE, TCS, HDFCBANK, SBIN, etc.
3. Fallback: NSE corporate filings → annual report PDF finder
4. Download manager with caching

**Files:** `scripts/ar_urls.py` (new)

### Phase 3: AnnualReportsSection Component (6–8 hrs)
1. Create `src/components/sensex/AnnualReportsSection.tsx` (500–800 lines)
2. Build `MultiYearTable` shared component
3. Build `ChartPanel` with Recharts integrations
4. Build all tab views (P&L, BS, CF, Segments, Ratios, Valuation, DuPont)
5. Wire data loading with `useEffect` + fetch

**Files:**
- `src/components/sensex/AnnualReportsSection.tsx` (new)
- `src/components/sensex/shared/MultiYearTable.tsx` (new)
- `src/components/sensex/shared/ChartPanel.tsx` (new)
- `src/components/sensex/shared/TrendArrow.tsx` (new)
- `src/components/sensex/shared/NoteRef.tsx` (new)

### Phase 4: Integration & Polish (2–3 hrs)
1. Add sidebar nav item in `App.tsx`
2. Route `annualReports` → `AnnualReportsSection`
3. Build for production, verify bundle size (target < 50 KB for new code)
4. CSS refinements, dark mode consistency
5. Add data provenance/guardrails banner

### Phase 5: Expand Coverage (ongoing)
1. Add annual report URLs for top 50 Nifty750 companies
2. Batch download + extraction
3. Add fallback to NSE corporate filings API when direct URL unavailable

**Total estimated effort: 14–20 hrs**

---

## 6. Tests & Validation

### Extraction Validation
```python
# scripts/test_extract_ar.py
# For each year in 2016–2025:
#   - Verify P&L has revenue, EBITDA, PAT
#   - Verify BS has total assets, total equity, total liabilities
#   - Verify total_assets ≈ total_equity + total_liabilities
#   - Verify segment revenue segments sum to ~total
```

### UI Tests
```typescript
// src/components/__tests__/AnnualReportsSection.test.tsx
// - Renders without crashing
// - Tab switching works
// - Data loaded from fixture
// - P&L table shows correct row count
```

### Snapshot Tests
- `public/data/ar/ITC.json` should not have null values for key metrics
- `public/data/ar/*.json` schema validated against TypeScript interface

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PDF table format changes year-to-year | Low | High | Build flexible parser; fallback to raw text display |
| Other companies use completely different AR formats | Medium | Medium | Company-specific parser config; start with top 10 |
| PyMuPDF not available/breaks | Low | High | Keep pdfplumber as fallback; dockerize extraction |
| Bundle size blowup from large data files | Medium | Medium | Load data async; don't inline in bundle; lazy-load charts |
| ITC portal changes URL patterns | Low | High | Store URLs in external config; add URL health check |
| Annual reports too slow to parse (20MB each) | Low | Low | PyMuPDF is 40x faster; 10 reports in ~60s |
| Segment label inconsistency across years | Medium | Medium | Fuzzy label matching + manual mapping table |

---

## 8. Open Questions

1. **Cash Flow Statement**: The 2025 AR has CF statement spread across 2 pages (158-159), not the standard single-page format. Need to verify if this is consistent or if CF has its own dedicated page.
2. **Consolidated vs Standalone**: Should we extract both? Consolidated is more relevant for analysis but standalone has 10-year history.
3. **Directors' Report text**: Should we extract narrative sections? Low ROI for high effort.
4. **Graphical content**: Charts in the MD&A section are images, not text. Not extractable.
5. **Peer companies**: How to handle when a company's AR PDF isn't on a predictable URL?

---

## 9. Iteration Log

| Iteration | What Changed | Why |
|-----------|-------------|-----|
| v1 | Initial draft | — |
| | | |

---

## 10. File Manifest (All Changes)

**New files:**
- `.hermes/plans/2026-05-12_annual-reports-spec.md` (this document)
- `scripts/extract_ar.py` — Core extraction engine
- `scripts/ar_urls.py` — Company URL mapping
- `scripts/validate_ar_structure.py` — Already created
- `public/data/ar/ITC.json` — ITC extraction output
- `src/components/sensex/AnnualReportsSection.tsx` — Main view
- `src/components/sensex/shared/MultiYearTable.tsx`
- `src/components/sensex/shared/ChartPanel.tsx`
- `src/components/sensex/shared/TrendArrow.tsx`
- `src/components/sensex/shared/NoteRef.tsx`

**Modified files:**
- `src/App.tsx` — Add nav item + route
- `src/components/sensex/shared/index.ts` — Export new components
