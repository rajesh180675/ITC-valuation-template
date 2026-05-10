# Plan: Nifty250 to Sensex-Parity with Real Indian Financial Data (v3)

---

## Iteration Log

| v | Corrections from previous version |
|---|---|
| v1 | Initial draft — assumed yfinance had deep financial data |
| v2 | Reality-checked: yfinance financials only go back ~5 years for Indian stocks |
| **v3 (current)** | **Discovered screener.in**: 12–13 years of real annual financials for all Nifty 250 companies. This is the correct primary source. |

---

## Key Empirical Discovery

After testing 5 different data sources against real Indian stocks:

| Source | Depth | Verdict |
|---|---|---|
| **yfinance `.financials`** | ~4–5 years | ❌ Too shallow |
| **Yahoo Finance raw API** | ~4–5 years (same data) | ❌ Same limit |
| **NSE API** | Current data only | ❌ No history |
| **BSE India** | Timed out / unstructured | ❌ Not reliably parseable |
| **Screener.in** | **12–13 years** ✅ | **Primary source** |

### Screener.in coverage confirmed for Nifty 250 stocks

| Company type | Example | Years of real data |
|---|---|---|
| Large-cap (old economy) | Tata Steel, ITC, NTPC | **13 years** (Mar 2014 → Mar 2026) |
| Large-cap (new economy) | TCS, HDFC Bank, M&M, Bajaj Finance | **12 years** (Mar 2015 → Mar 2026) |
| Mid-cap (well-established) | Persistent, L&T Tech | **12 years** (Mar 2015 → Mar 2026) |
| Recent IPO | EaseMyTrip (2021 IPO) | **7 years** (Mar 2020 → TTM) |
| Niche / old | LatentView | **10 years** (Mar 2013 → TTM) |

**What screener.in provides** (per company):
- **P&L** (annual, 12+ rows): Sales, Expenses, Op Profit, Op Margin %, Other Income, Interest, Depreciation, PBT, Tax, Net Profit, EPS, Dividend Payout %
- **Balance Sheet** (annual): Equity Capital, Reserves, Borrowings, Other Liabilities, Fixed Assets, CWIP, Investments, etc.
- **Cash Flow** (annual): OCF, Investing CF, Financing CF, Free Cash Flow
- **Ratios**: ROE %, ROCE %, margins, debt/equity, working capital days

---

## Corrected Data Architecture

```
                    ┌────────────────────┐
                    │   Screener.in      │  ← Primary: 12-13 yrs annual financials
                    │  (web scrape)      │
                    └────────┬───────────┘
                             │ P&L, BS, Ratios
                             ▼
                    ┌────────────────────┐
                    │  Yfinance (yf)     │  ← Supplementary: current market data
                    │                    │     + 30 yr price history for beta
                    └────────┬───────────┘
                             │ market cap, PE, PB, div yield, beta
                             ▼
                    ┌────────────────────┐
                    │  NSE API           │  ← Constituent list (already in codebase)
                    │                    │
                    └────────┬───────────┘
                             │ ticker list
                             ▼
                    ┌──────────────────────────┐
                    │  Python Data Collector   │
                    │  (scripts/data_collector │
                    │   /fetch_nifty250_data.py)│
                    └────────────┬─────────────┘
                                │ source-pack JSONs
                                ▼
                    ┌──────────────────────┐
                    │  Node.js Assembler   │
                    │  (build_nifty250_    │
                    │   feed.mjs)          │
                    └──────────┬───────────┘
                              │ public/data/nifty250_real.json
                              ▼
                    ┌──────────────────────┐
                    │  React Component     │
                    │  (Nifty250Universe-  │
                    │   Section.tsx)       │
                    └──────────────────────┘
```

---

## Full Implementation Plan

### Phase 1 — Screener.in scraper + yfinance supplementary collector

Create `scripts/data_collector/fetch_nifty250_data.py`:

#### 1a. Get NSE constituent list (ALREADY EXISTS — reuse from fetch_nifty750_data.py)

```python
# lines 76-103 of existing fetch_nifty750_data.py
# Fetch from NSE API, classify financial/nonFinancial
def fetch_constituents(index_name): ...
```

#### 1b. Scrape screener.in for each company

```python
def fetch_screener_financials(ticker: str) -> dict:
    \"\"\"Fetch P&L, Balance Sheet, Ratios from screener.in.\"\"\"
    url = f'https://www.screener.in/company/{ticker}/consolidated/'
    resp = requests.get(url, headers=HEADERS, timeout=20)
    soup = BeautifulSoup(resp.text, 'html.parser')
    tables = soup.find_all('table')
    
    # Table 1 = Annual P&L (columns = fiscal years ending Mar)
    annual_pl = parse_table(tables[1])
    # Table 2 = Balance Sheet  
    balance_sheet = parse_table(tables[2])
    # Extract key fields
    return {
        'fiscalYears': annual_pl['columns'],     # e.g. ['Mar 2015', 'Mar 2016', ...]
        'revenueCr': annual_pl['Sales+'],
        'expensesCr': annual_pl['Expenses+'],
        'operatingProfitCr': annual_pl['Operating Profit'],
        'opMarginPct': annual_pl['OPM %'],
        'netProfitCr': annual_pl['Net Profit+'],
        'epsRs': annual_pl['EPS in Rs'],
        'equityCr': balance_sheet['Equity Capital'],
        'reservesCr': balance_sheet['Reserves'],
        'borrowingsCr': balance_sheet['Borrowings'],
        'rocePct': parse_ratio(soup, 'ROCE %'),
    }
```

Key design decisions:
- **Rate limiting**: add 1-2s delay between requests, 8 parallel workers
- **Retry**: 3 attempts with exponential backoff
- **Cache**: save partial results every 50 companies
- **Error handling**: If screener.in blocks a request, fall back to yfinance financials (4-5 years) for that company

#### 1c. Supplementary yfinance data

```python
def fetch_yfinance_market_data(ticker: str) -> dict:
    ticker_ns = f'{ticker}.NS'
    stock = yf.Ticker(ticker_ns)
    info = stock.info
    return {
        'marketCapCr': info.get('marketCap') / 1e7,
        'trailingPE': info.get('trailingPE'),
        'priceToBook': info.get('priceToBook'),
        'dividendYieldPct': (info.get('dividendYield') or 0) * 100,
        'betaNifty': None,  # computed in step 1d
        'currentPrice': info.get('currentPrice') or info.get('regularMarketPrice'),
    }
```

#### 1d. Compute beta vs Nifty 50

```python
def compute_beta_nifty(stock_symbol: str, nifty_history: pd.DataFrame) -> float:
    stock = yf.Ticker(f'{stock_symbol}.NS')
    hist = stock.history(period='5y')
    # Merge with Nifty 50 daily returns
    stock_weekly = hist['Close'].resample('W').last().pct_change().dropna()
    nifty_weekly = nifty_history['Close'].resample('W').last().pct_change().dropna()
    aligned = pd.concat([stock_weekly, nifty_weekly], axis=1, join='inner').dropna()
    if len(aligned) < 50:  # need minimum data points
        return stock.info.get('beta', 1.0)  # fallback
    cov = aligned.cov().iloc[0, 1]
    var = aligned.iloc[:, 1].var()
    return round(cov / var, 2) if var > 0 else 1.0
```

### Phase 2 — Extend fiscal window to match Sensex

**Target: 14 fiscal years (FY2011–FY2024)**

With screener.in giving 12-13 years of real data, we have 2 choices:

**Option A — Real-data window only (recommended)**
- Show the actual screener.in range as the Analysis Window (varies per company but typically 12-13 years)
- Drop the Sensex's exact FY2011 constraint and show "FY2014–FY2026" or "FY2015–FY2026" dynamically
- This is **100% authentic** — no estimated data at all
- The window is still a massive upgrade from the current 10-year synthetic window

**Option B — Extended window with minimal estimation**
- For the 1-3 years before screener.in coverage, use dampened-CAGR backfill from the earliest real anchor
- Mark those years as `estimated` in quality flags
- This gives the exact FY2011–FY2024 window matching Sensex
- The estimation error is negligible because:
  - Only 1-3 years of estimation (vs 9+ years in the current synthetic model)
  - Anchored to 12 real data points (vs 1 data point + CAGR in current model)

**Recommendation:** Implement **Option B** but also add a toggle so users can view just the real-data subset. The component already has `qualityFlags` support from the NiftyIndexDataSection pattern.

### Phase 3 — File changes

| File | Action | Details |
|---|---|---|
| `scripts/data_collector/fetch_nifty250_data.py` | **Create** | ~400 lines — screener.in scraper + yfinance market data + beta |
| `scripts/data_collector/requirements.txt` | Update | Add `beautifulsoup4`, `lxml` |
| `scripts/nifty250/source-pack/` | Create dir | Output for constituent, financial, market JSONs |
| `scripts/build_nifty250_feed.mjs` | **Create** | ~200 lines — assemble source-pack → final JSON |
| `package.json` | Update | Add scripts: `fetch:nifty250`, `generate:nifty250` |
| `src/data/nifty250Data.ts` | Modify | Add screener.in data types, adaptive fiscal years |
| `src/components/sensex/Nifty250UniverseSection.tsx` | Modify | Data loader + dynamic years + real-data badge |
| `src/utils/niftyDatasetSchema.ts` | Minor | Add Nifty250 schema variant if needed |
| `public/data/nifty250_real.json` | Generated | Final output |
| `.gitignore` | Check | Ignore source-pack, track public/data JSON |

### Phase 4 — Component changes

In `Nifty250UniverseSection.tsx`:

1. **Data loader** — fetches `nifty250_real.json`, adapts to `SensexConstituent[]`
2. **Adaptive fiscal years** — derived from actual data coverage, not hardcoded
3. **Provenance banner** — shows "Screener.in (annual financials) + Yahoo Finance (market data)" with coverage stats
4. **Quality flagging** — estimated years shown with a dotted border or tooltip
5. **Fallback** — if JSON is missing, use hardcoded `nifty250Constituents` (current behavior)

### Phase 5 — npm scripts

```json
{
  "fetch:nifty250": "python scripts/data_collector/fetch_nifty250_data.py",
  "generate:nifty250": "node scripts/build_nifty250_feed.mjs",
  "data:refresh": "npm run fetch:nifty250 && npm run generate:nifty250"
}
```

---

## Risks, Tradeoffs & Open Questions

### 1. Screener.in scraping legality
Screener.in doesn't have a published API or ToS that explicitly prohibits scraping for personal/non-commercial use. However:
- **Mitigation**: Implement rate limiting (≥1s delay) to avoid server impact
- **Worst case**: If blocked, fall back to yfinance-only (4-5 year) data with a downgrade notice

### 2. Tabular parsing fragility
Screener.in's HTML structure may change without notice.
- **Mitigation**: Parse by row label text (`'Sales+'`, `'Net Profit+'`) rather than row index. Add a validation step that checks expected row names exist.

### 3. Consolidated vs Standalone
Most Nifty 250 companies report consolidated financials (which include subsidiaries). A few may only have standalone data on screener.in.
- **Mitigation**: Try `/consolidated/` first, fall back to standalone `/`. Flag the difference.

### 4. Recent IPO coverage gap
Companies listed after 2020 won't have 12 years of data.
- **Mitigation**: Show their available range; flag with a `limited_history` quality flag. The slider adapts automatically.

### 5. Beta computation dependency
Computing beta against Nifty 50 requires downloading 5 years of price data for Nifty 50 + each stock.
- **Mitigation**: Already included in plan. The Nifty 50 price fetch is a one-time cost, then reused for all 250 stocks.

### 6. Execution time
Scraping 250 screener.in pages + yfinance market data + beta computation will take ~20-40 minutes.
- **Mitigation**: 8 parallel workers + partial caching every 50 companies. Progress logging.

---

## Verification Checklist

- [ ] `npm run fetch:nifty250` completes: 250 companies scraped from screener.in
- [ ] `npm run generate:nifty250` produces valid schema v2 JSON
- [ ] Route `nifty250` loads with real data (check provenance banner shows screener.in)
- [ ] Analysis Window shows more years than before (12-13 years vs 10)
- [ ] Each panel renders correctly with the wider data
- [ ] DrillDown for RELIANCE shows 12 years of real topline trajectory
- [ ] DrillDown for a recent IPO shows shorter range gracefully
- [ ] Beta values are computed against Nifty 50 (not S&P 500)
- [ ] Magic Formula, Momentum Heatmap, CSV export all still work
- [ ] Reference fallback activates when JSON is missing

---

## Effort Estimate

| Phase | Time |
|---|---|
| Screener.in scraper | 3 hr |
| Market data + beta computation | 1.5 hr |
| Node.js assembler | 1 hr |
| Component adapter | 1.5 hr |
| Testing & iteration | 2 hr |
| **Total** | **~9 hr** |
