# Cash Flow Tab Overhaul — Implementation Plan

**Date:** 2026-05-12  
**Status:** Planning  
**Goal:** Transform the Cash Flow tab from a flat item dump into a structured, insightful view matching P&L/BS quality.

## Current State (Problems)

1. **No section markers** — CF items from `extract_ar.py` have zero `type: 'section'` entries. The section keyword detector checks for `'equity', 'assets', 'non-current', 'current '` — none match CF labels. Flat list renders without Operating/Investing/Financing grouping.

2. **Missing investing/financing anchors** — FY2016-FY2020 and FY2023 lack extracted "NET CASH FROM INVESTING ACTIVITIES" and "NET CASH FROM FINANCING ACTIVITIES" items. Section detection can't rely on them alone.

3. **No derived KPIs** — Free Cash Flow (CFO - Capex), Cash Conversion Ratio (CFO/PAT), Dividend Payout are not computed anywhere.

4. **Section boundaries implicit** — Labels like "OPERATING PROFIT BEFORE WORKING CAPITAL CHANGES", "CASH GENERATED FROM OPERATIONS", "NET CASH FROM OPERATING ACTIVITIES" are in the data but not used as section anchors.

## Plan

### Phase 1: Extractor Fix (extract_ar.py)

**1a. Section detection for CF**
Add CF-specific section keyword detection in `parse_statement()`:
```python
cf_section_keywords = ['cash flow from operating', 'cash flow from investing', 'cash flow from financing', 
                       'operating activities', 'investing activities', 'financing activities',
                       'operating profit before', 'cash generated from']
```
When any item label matches a CF section keyword, emit a `type: 'section'` entry before the item.

**1b. Derived KPIs in CF statement**
Compute and store in `kpIs`:
- `cfoCr` — "NET CASH FROM OPERATING ACTIVITIES" value
- `cfiCr` — "NET CASH FROM INVESTING ACTIVITIES" value  
- `cffCr` — "NET CASH FROM FINANCING ACTIVITIES" value
- `capexCr` — "Purchase of property, plant and equipment" or "Purchase of fixed assets" (negative)
- `fcfCr` — cfoCr - |capexCr| where capexCr < 0
- `dividendCr` — "Dividend paid" value (negative → absolute)
- `cashConvPct` — cfoCr / patCr * 100
- `netChangeCr` — "Net increase in cash and cash equivalents"
- `closingCashCr` — "Cash and cash equivalents at the end of the year"

**1c. Better anchor extraction for all years**
CF anchor labels vary by year:
- "NET CASH FROM OPERATING ACTIVITIES" — all years present
- "NET CASH FROM\\u2009/\\u2009(USED IN) INVESTING ACTIVITIES" — FY2021, FY2022, FY2024
- "NET CASH FROM INVESTING ACTIVITIES" — FY2025  
- Use `'net cash from' in label.lower() and 'investing' in label.lower()` to unify

### Phase 2: UI Component (AnnualReportsSection.tsx)

**2a. Cash Flow grouped view**
Instead of flat DataDrivenTable, use a dedicated `CfView` component with:
- **Operating** section (items before first CFO total)
- **Investing** section (items between CFO total and CFI total)
- **Financing** section (items between CFI total and CFF total)
- **Summary** section (items after CFF total: net change, opening, closing)

Detection: iterate items, find anchor labels, split into groups.

**2b. CF-specific KPI cards**
- CFO (with YoY trend)
- Free Cash Flow (CFO - Capex)
- Cash Conversion Ratio (CFO/PAT, as percentage)
- Dividend Paid (absolute)
- Capex (as % of CFO)

**2c. CF-specific charts**
- CFO vs PAT bar chart (cash conversion quality)
- Cash Conversion Ratio trend line
- CFO, CFI, CFF waterfall (Operating vs Investing vs Financing)
- Capex trend as % of CFO

### Phase 3: Planning, execution, and validation

**3a. Extract then regenerate**
1. Apply extractor patch
2. Run `python scripts/extract_ar.py --ticker ITC --years 2016-2025`
3. Verify CF KPIs populated

**3b. UI patch**
1. Add `CfView` component
2. Update tab routing 

**3c. Validation tests**
Add Vitest tests:
- Verify CF KPIs are non-null for all 10 years
- Verify CFO < PAT (cash conversion < 100% is normal for growing companies)
- Verify section grouping produces Operating/Investing/Financing/Summary buckets

## Files Changed

| File | Change |
|------|--------|
| `scripts/extract_ar.py` | CF section detection + derived KPIs |
| `src/components/sensex/AnnualReportsSection.tsx` | CfView component + tab routing |
| `src/utils/ (new test file)` | CF validation tests |

## Verification

- `python scripts/extract_ar.py --ticker ITC --years 2016-2025` — all years, all KPIs
- `npm run typecheck` — 0 errors
- `npm test` — existing 558 + new CF tests pass
- `npm run build` — clean

## Risks

- CF label variance across 20+ companies (this initial pass focuses on ITC)
- Capex label varies: "Purchase of property, plant and equipment" vs "Purchase of fixed assets" vs "Capital expenditure"
- Financing section has few items in ITC (low debt company) — may render sparse
