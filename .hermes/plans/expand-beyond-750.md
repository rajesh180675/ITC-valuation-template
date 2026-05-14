# Expand Nifty Universe Beyond 750

## Current State (After Fixes)
- Nifty 750 real: 749/750 companies, 13 FYs (FY2014-FY2026), FULL BS/CF/ROCE
  - Missing: BAYERCROP (only has FY2005-2006 data, no data >= FY2014)
- Nifty 250: 246 companies, 17 FYs (FY2010-FY2026), FULL BS/CF/ROCE
- Nifty 750 10y feed: 750 companies, 6 FYs, TOP-LINE ONLY (synthetic, no BS/CF)

## Goal: Expand to Nifty Total Market (~1900+ companies)

### Step 1: Fetch broader NSE index constituents
NSE has index APIs for:
- NIFTY 50 (750 has this)
- NIFTY MidCap 150 (750 has this)
- NIFTY SmallCap 250 (750 has this)
- NIFTY MicroCap 250 (750 has this)

Broader indices available:
- NIFTY500 (500 companies, most overlap with 750)
- NIFTY MidSmallcap 400 (400 companies, partial overlap)
- BSE 500 (500 companies)
- BSE AllCap (~3000+ companies)
- NSE listed all companies (~4800 companies)

### Step 2: Data Collection Strategy
For the expanded universe (~1900 companies):
A. Fetch constituent lists from NSE API
B. Use yfinance (parallel) to fetch 10y financials → much faster than screener.in
C. Use Screener.in scraper for the remaining ~1150 companies (rate-limited, will take hours)
D. Merge all source data into new feed

### Step 3: Build New Feed
- Output: public/data/nifty_total_market.json
- Schema: same as nifty750_real.json but with batch groups:
  - nifty500: 500 cos (full BS/CF/ROCE)
  - nifty_midsmall400: 400 cos (full BS/CF/ROCE)  
  - nifty_next_1000: ~1000 cos (top-line + key metrics from yfinance)

### Step 4: Frontend Integration
- New "Total Market" navigation section
- Same UI patterns as Nifty 750
- Additional filters: market cap brackets (mega/large/mid/small/micro)

## Implementation Order
1. Fetch NSE constituents for NIFTY500 and MidSmallcap400 indices
2. Run yfinance collector for expanded universe (~1900 companies)
3. Run screener scraper for remaining companies (rate-limited, staggered)
4. Build merged feed
5. Wire into frontend as new navigation section
6. Update company manifest and AR coverage
