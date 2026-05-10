# Plan: Fix Magic Formula Chart + Missing Analytics Data for Nifty250

## Iteration 1 (v1)

### Discovery

The Magic Formula scatter chart is empty because:
1. ROE/ROCE IS scraped from screener.in (218/223 companies) → stored in `market_data.json`
2. But the **assembler** (`build_nifty250_feed.mjs`) ignores this data → no ROE/ROCE in final JSON
3. The **component adapter** (`adaptNifty250Constituent`) hardcodes `roePct: 0` for every year
4. `valuationMultiple`, `beta`, `marketCapCr`, `cmp`, `dividendYieldPct` are all 0

Result: `buildMagicFormulaRanks()` computes `capEff = 0`, `earningsYield = 100/0.1 = 1000` → chart renders invisible points.

### Additional data available on screener.in

Header section of each company page shows:
- Market Cap, Current Price, Stock P/E, Book Value, Dividend Yield, ROCE, ROE

All parseable from the existing scrape — no additional network requests needed.

### Fix strategy

**Phase A — Immediate fix (MF chart + factor scoring):**
Include ROE/ROCE in the constituent JSON and set it on history entries.

**Phase B — Full analytics fix:**
Scrape additional header fields (market cap, P/E, P/B, dividend yield, beta) and flow through.

This plan implements **Phase A + Phase B** since both are needed for correct analytics.

---

## Step-by-step

### Step 1 — Update `build_nifty250_feed.mjs` (assembler)

For each constituent, include:
- `roePct` from market_data → set on last history entry
- `rocePct` from market_data → set on last history entry
- `marketCapCr` from market_data (when available)
- `valuationMultiple` from P/E or P/B (to be scraped)
- `beta` (placeholder 1.0 for now, computed from yfinance later)
- `dividendYieldPct` (to be scraped)

### Step 2 — Update `fetch_nifty250_data.py` (scraper)

Parse the company header to extract:
- Market cap (₹XX,XXX Cr.)
- Current price (₹XXX)
- Stock P/E (XX.X)
- Book value (₹XXX)
- Dividend yield (X.XX%)
- Industry PE (from peer comparison section)

Add these to the scraper output.

### Step 3 — Update `adaptNifty250Constituent` in component

Map ROE/ROCE from constituent-level fields into `history[last].roePct`.

### Step 4 — Verify the fix

- Magic Formula scatter chart shows visible points
- Factor Scorecard shows non-zero quality/growth/value scores
- Constituent Ledger shows valuation multiples
- CAGR and other analytics work correctly

---

## Files to change

| File | Change | Impact |
|---|---|---|
| `scripts/data_collector/fetch_nifty250_data.py` | Parse header: market cap, P/E, P/B, div yield per company | Core data improvement |
| `scripts/build_nifty250_feed.mjs` | Include ROE/ROCE, mkt data in constituent JSON | Fixes MF chart + analytics |
| `src/components/sensex/Nifty250UniverseSection.tsx` | Update adapter: read ROE/ROCE, valuationMultiple | Fixes all company metrics |
