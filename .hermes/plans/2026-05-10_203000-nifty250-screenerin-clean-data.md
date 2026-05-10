# Plan: Nifty250 Real Data from Screener.in — Clean Data Only

## Goal

Replace the current Nifty 250 synthetic/hardcoded data with **real annual financial data** scraped from **Screener.in**. Only real, reported data — no dampened backfill, no CAGR extrapolation, no estimates.

## Data Source: Screener.in

Screener.in provides 12–13 years of annual financial statements for most NSE-listed Indian companies:

| Company type | Real data range | Years |
|---|---|---|
| Large-cap (old economy) | Mar 2014 → Mar 2026 | 13 years |
| Large-cap (new economy) | Mar 2015 → Mar 2026 | 12 years |
| Mid-cap (well-established) | Mar 2015 → Mar 2026 | 12 years |
| Recent IPO (2020+) | Mar 2020 → TTM | 5–7 years |

**Data collected per company:**
- **P&L** (annual): Sales (revenue), Expenses, Operating Profit, OPM %, Other Income, Interest, Depreciation, PBT, Tax, Net Profit, EPS, Dividend Payout %
- **Select ratios**: ROE %, ROCE %, from the ratios section

**No estimates, no backfilling.** Each company shows exactly the years Screener.in has data for. Companies with shorter history (recent IPOs) simply show fewer data points.

## Data Architecture

```
Screener.in (web scrape) ──→ Python Collector ──→ source-pack JSON files
                                    │
                                    ▼
                           Node.js Assembler
                                    │
                                    ▼
                        public/data/nifty250_real.json
                                    │
                                    ▼
                        React Component (dynamic years)
```

## Implementation Steps (in order)

### Step 1: Python Screener.in scraper

Create `scripts/data_collector/fetch_nifty250_data.py`:

```python
def scrape_screener(ticker, max_retries=3):
    for attempt in range(max_retries):
        resp = requests.get(
            f"https://www.screener.in/company/{ticker}/consolidated/",
            headers=HEADERS, timeout=20
        )
        if resp.status_code == 200:
            return parse_page(resp.text)
        time.sleep(2 * (attempt + 1))
    return None

def parse_page(html):
    soup = BeautifulSoup(html, 'html.parser')
    tables = soup.find_all('table')
    # Table 1: Annual P&L (columns = fiscal years)
    annual_pl = parse_table(tables[1])
    # Table 2: Balance Sheet
    balance_sheet = parse_table(tables[2])
    # Extract ratios from sidebar
    ratios = extract_ratios(soup)
    return {
        "ticker": ticker,
        "fiscalYears": annual_pl['years'],  # e.g. ["Mar 2015", "Mar 2016", ...]
        "revenue": annual_pl['Sales+'],      # array per year
        "netProfit": annual_pl['Net Profit+'],
        "eps": annual_pl['EPS in Rs'],
        "roe": ratios['ROE'],
        "roce": ratios['ROCE'],
        # ... etc
    }
```

Key design:
- **8 parallel workers** with 1.5s delay between requests
- **Rate limiting**: Respect screener.in servers — 250 companies × ~3s = ~12 min total
- **Retry**: 3 attempts with exponential backoff
- **Save progress**: Every 50 companies, save intermediate results
- **NSE API** for constituent list (reuse existing code from `fetch_nifty750_data.py`)
- **Error handling**: If a company fails after 3 retries, skip it and log the error

### Step 2: Data Assembly

Create `scripts/build_nifty250_feed.mjs` (similar to existing `build_nifty_750_official.mjs`):

Takes the scraped data and outputs:
```json
{
  "generatedAt": "2026-05-10T...",
  "source": "real",
  "sourcePolicy": "screener-in",
  "schemaVersion": 2,
  "fiscalYears": ["FY2015", "FY2016", ..., "FY2026"],
  "provenance": {
    "universe": { "sourceName": "NSE Indices" },
    "financials": [{ "sourceName": "Screener.in" }]
  },
  "constituents": [
    {
      "id": "hdfc-bank",
      "ticker": "HDFCBANK",
      "name": "HDFC Bank",
      "sector": "Banks",
      "reportingType": "financial",
      "color": "#2563eb",
      "history": [
        { "fy": "FY2015", "toplineCr": 50666, "netProfitCr": 10221, "roePct": 16.5 },
        { "fy": "FY2016", "toplineCr": 60023, "netProfitCr": 12295, "roePct": 17.1 },
        // ... only years with real data
      ]
    }
  ]
}
```

### Step 3: Component Changes

The Nifty250UniverseSection already has all the panels needed. Changes:

1. **Dynamic fiscal years**: Instead of `NIFTY250_FISCAL_YEARS` constant, derive from actual data:
   ```typescript
   const fiscalYears = useMemo(() => {
     if (!realData) return NIFTY250_FISCAL_YEARS;  // fallback
     const years = new Set<string>();
     realData.forEach(c => c.history.forEach(h => years.add(h.fy)));
     return Array.from(years).sort();
   }, [realData]);
   ```

2. **Data loader**: Fetch JSON on mount, fall back to hardcoded
3. **Provenance banner**: Show "Screener.in" as source with coverage stats
4. **Variable-length history**: Charts and tables automatically adapt
5. **Quality flags**: No flags needed since all data is real

### Step 4: Add npm scripts

```json
{
  "fetch:nifty250": "python scripts/data_collector/fetch_nifty250_data.py",
  "generate:nifty250": "node scripts/build_nifty250_feed.mjs", 
  "data:refresh": "npm run fetch:nifty250 && npm run generate:nifty250"
}
```

### Step 5: Commands

```bash
# Collect data (after credentials configured)
npm run fetch:nifty250

# Build the JSON feed
npm run generate:nifty250

# Verify in browser
npm run dev  # → route: nifty250
```

## Code Changes Summary

### New files
- `scripts/data_collector/fetch_nifty250_data.py` — ~400 lines: main scraper
- `scripts/build_nifty250_feed.mjs` — ~200 lines: JSON assembler

### Modified files
- `src/data/nifty250Data.ts` — Add real-data adapters, dynamic years export
- `src/components/sensex/Nifty250UniverseSection.tsx` — Add data loader, dynamic window
- `package.json` — Add npm scripts
- `scripts/data_collector/requirements.txt` — Add beautifulsoup4, lxml

### Generated files
- `scripts/nifty250/source-pack/*.json` — Intermediate source data
- `public/data/nifty250_real.json` — Final feed (tracked in git)

## Fiscal Year Range Strategy

Since different companies have different data coverage:

| Approach | Description |
|---|---|
| **Union** (all years any company has) | Shows FY2014–FY2026 range, but early years have very few companies |
| **Intersection** (years ALL companies have) | Shows FY2021–FY2026, all companies fully covered |
| **Adaptive** (per-panel, per-company) | Charts show available data; Analysis Window slider sets max range |

**Recommended: Union + null handling.** The Analysis Window slider shows the full FY2014–FY2026 range, but individual charts handle missing data gracefully. The slider's default range is the last 10 years (or the available range, whichever is smaller).

## Verification Checklist

- [ ] `npm run fetch:nifty250` completes with ≥240/250 companies collected
- [ ] `npm run generate:nifty250` produces valid JSON
- [ ] Route `nifty250` loads and shows Screener.in data
- [ ] Analysis Window shows dynamic year range
- [ ] Charts render correctly with variable-length data
- [ ] Companies with shorter history show fewer bars/data points
- [ ] Provenance banner shows "Screener.in" as source
- [ ] Fallback to hardcoded data works when JSON is missing
- [ ] Nifty250-exclusive features (Magic Formula, Momentum, CSV, Z-score) still work
- [ ] `npm run build` compiles without errors
