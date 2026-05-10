#!/usr/bin/env python3
"""
Nifty 250 — Real Data Feed from Screener.in
=============================================
Scrapes annual financial data from screener.in for all Nifty 250 stocks.
Outputs source-pack JSONs: constituents.json, financials.json, market_data.json

Usage:
  python scripts/data_collector/fetch_nifty250_data.py

Output → scripts/nifty250/source-pack/
"""

import json, os, sys, time, re
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("ERROR: Install: pip install beautifulsoup4 lxml requests")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", ".."))
SOURCE_DIR = os.path.join(ROOT_DIR, "scripts", "nifty250", "source-pack")
TICKER_FILE = os.path.join(SCRIPT_DIR, "nifty250_tickers.txt")
PARALLEL_WORKERS = 6
RATE_LIMIT_DELAY = 1.5  # seconds between requests per worker

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

FINANCIAL_KEYWORDS = [
    "bank", "nbfc", "finance", "insurance", "housing finance",
    "housing development", "mutual fund", "asset management",
    "stock broking", "credit", "microfinance", "financial services",
]

# ── Helpers ──────────────────────────────────────────────────────────────────

def to_cr(v_str):
    """Convert a screener.in number string (e.g. '374,372' or '10.5%') to Crores."""
    if not v_str or v_str == '-' or v_str.strip() == '':
        return None
    v = v_str.strip()
    try:
        # Remove commas, handle percentages
        if v.endswith('%'):
            return round(float(v.replace('%', '').replace(',', '')), 2)
        return round(float(v.replace(',', '')), 2)
    except (ValueError, TypeError):
        return None

def parse_pl_value(v_str):
    """Parse P&L values (in lakhs as screener.in shows them) to crores."""
    if not v_str or v_str == '-' or v_str.strip() == '':
        return None
    v = v_str.strip()
    try:
        # Screener.in shows values in lakhs. Convert to crores by dividing by 100
        return round(float(v.replace(',', '')) / 100, 2)
    except (ValueError, TypeError):
        return None

# ── Screener.in ticker name overrides ───────────────────────────────────────
# Some NSE tickers differ from screener.in's URL slug
SCREENER_TICKER_MAP = {
    'LTIM': 'MINDTREE',       # LTIMindtree (merged entity, screener.in uses old name)
    'M&MFIN': 'MMFIN',        # Mahindra & Mahindra Financial Services
    'BAJAJ-AUTO': 'BAJAJAUTO', # Bajaj Auto (hyphen vs no hyphen)
    'MCDOWELL-N': 'MCDOWELL',  # United Spirits
    'ARE&M': 'AMARARAJA',      # Amara Raja Energy & Mobility (renamed)
    'TRIDENT': 'TRIDENT',      # Already OK, but for mapping
}

SCREENER_SECTOR_MAP = {
    'Banks': 'Banks',
    'NBFC': 'NBFC',
    'Insurance': 'Insurance',
    'Information Technology': 'Information Technology',
    'Consumer Staples': 'Consumer Staples',
    'Consumer Discretionary': 'Consumer Discretionary',
    'Consumer Durables': 'Consumer Durables',
    'Healthcare': 'Healthcare',
    'Pharmaceuticals': 'Pharmaceuticals',
    'Automobiles': 'Automobiles',
    'Auto Components': 'Auto Components',
    'Energy': 'Energy',
    'Utilities': 'Utilities',
    'Metals': 'Metals',
    'Materials': 'Materials',
    'Cement': 'Cement',
    'Industrials': 'Industrials',
    'Capital Goods': 'Capital Goods',
    'Chemicals': 'Chemicals',
    'Telecom': 'Telecom',
    'Media': 'Media',
    'Real Estate': 'Real Estate',
    'Aerospace & Defense': 'Aerospace & Defense',
    'Logistics': 'Logistics',
    'Agriculture': 'Agriculture',
    'Textiles': 'Textiles',
    'Internet': 'Internet',
}

def classify_reporting_type(sector):
    """Determine if a sector is financial or non-financial."""
    sector_lower = sector.lower() if sector else ''
    is_financial = any(kw in sector_lower for kw in FINANCIAL_KEYWORDS)
    return 'financial' if is_financial else 'nonFinancial'

# ── Screener.in scraping ─────────────────────────────────────────────────────

_fetch_cache = {}

def fetch_screener_page(ticker):
    """Fetch screener.in page for a ticker with caching.
    Tries consolidated first; falls back to standalone if no real data found.
    """
    for suffix in ['/consolidated/', '/']:
        full_url = f'https://www.screener.in/company/{ticker}{suffix}'
        if full_url in _fetch_cache:
            return _fetch_cache[full_url], suffix
        
        for attempt in range(3):
            try:
                resp = requests.get(full_url, headers=HEADERS, timeout=25)
                if resp.status_code == 200:
                    # Quick check: does the page have at least 2 tables with data?
                    soup = BeautifulSoup(resp.text, 'html.parser')
                    tables = soup.find_all('table')
                    if len(tables) >= 2:
                        rows = tables[1].find_all('tr')
                        if rows:
                            headers = rows[0].find_all(['th', 'td'])
                            # Skip pages where headers are empty (e.g. some consolidated pages)
                            header_texts = [h.get_text(strip=True) for h in headers[1:]]
                            has_real_headers = any(
                                bool(re.search(r'(Mar|Sep|Dec|Jun)\s+\d{4}', h))
                                for h in header_texts
                            )
                            if has_real_headers:
                                _fetch_cache[full_url] = resp.text
                                return resp.text, suffix
                    # Also cache empty pages to avoid re-fetching
                    _fetch_cache[full_url] = resp.text
                elif resp.status_code == 429:
                    time.sleep(5 * (attempt + 1))
                elif resp.status_code == 404:
                    break  # Try next suffix
                else:
                    time.sleep(2 * (attempt + 1))
            except Exception as e:
                if attempt < 2:
                    time.sleep(3 * (attempt + 1))
                else:
                    raise e
    return None, None

def parse_financials(ticker):
    """
    Parse annual financial data from screener.in for a given ticker.
    Returns dict with financials, sector, name, etc.
    """
    html, suffix = fetch_screener_page(ticker)
    if not html:
        return None
    
    soup = BeautifulSoup(html, 'html.parser')
    tables = soup.find_all('table')
    
    if len(tables) < 2:
        return None
    
    # Get company name from the page title
    company_name_tag = soup.find('h1', class_='company-name')
    company_name = company_name_tag.get_text(strip=True) if company_name_tag else ticker
    
    # Get sector from page
    sector_tag = soup.find('a', href=lambda x: x and '/sector/' in (x or ''))
    sector = sector_tag.get_text(strip=True) if sector_tag else 'Unknown'
    
    # Annual P&L table (index 1)
    annual_pl = tables[1]
    pl_rows = annual_pl.find_all('tr')
    
    if len(pl_rows) < 2:
        return None
    
    # Extract fiscal year headers — convert "Mar 2015" -> "FY2015"
    header_cells = pl_rows[0].find_all(['th', 'td'])
    years_raw = [c.get_text(strip=True) for c in header_cells[1:]]
    fiscal_years = []
    for y in years_raw:
        # Match "Mar 2015", "Dec 2015", etc.
        match = re.search(r'(?:Mar|Sep|Dec|Jun)\s+(\d{4})', y)
        if match:
            fiscal_years.append(f"FY{match.group(1)}")
        # Skip "TTM" (trailing twelve months) — not a fiscal year
    
    # Build row_name -> values dictionary
    pl_data = {}
    for row in pl_rows[1:]:
        cells = row.find_all(['th', 'td'])
        if len(cells) > 1:
            name = cells[0].get_text(strip=True)
            values = [c.get_text(strip=True) for c in cells[1:]]
            pl_data[name] = values
    
    # Determine topline key (Sales+ for non-financial, Revenue+ for financial/banks)
    topline_key = 'Sales+' if 'Sales+' in pl_data else ('Revenue+' if 'Revenue+' in pl_data else None)
    profit_key = 'Net Profit+' if 'Net Profit+' in pl_data else None
    
    # Build financial history array
    history = []
    for i, fy in enumerate(fiscal_years):
        entry = {
            "fy": fy,
            "toplineCr": parse_pl_value(pl_data.get(topline_key, [None] * len(fiscal_years))[i]) if topline_key and i < len(pl_data.get(topline_key, [])) else None,
            "netProfitCr": parse_pl_value(pl_data.get(profit_key, [None] * len(fiscal_years))[i]) if profit_key and i < len(pl_data.get(profit_key, [])) else None,
            "operatingProfitCr": None,  # Not consistently available across all company types
        }
        # Only include if it has at least one real value
        if any(v is not None for v in entry.values()):
            history.append(entry)
    
    # Extract ROE and ROCE from sidebar ratios
    roe = None
    roce = None
    for li in soup.find_all('li'):
        text = li.get_text(strip=True)
        spans = li.find_all('span')
        vals = [to_cr(s.get_text(strip=True)) for s in spans if s.get_text(strip=True).replace('.', '').replace('-', '').isdigit()]
        if 'ROE' in text and vals:
            roe = vals[0]
        if 'ROCE' in text and vals:
            roce = vals[0]
    
    return {
        "ticker": ticker,
        "name": company_name,
        "sector": sector,
        "reportingType": classify_reporting_type(sector),
        "fiscalYears": fiscal_years,
        "history": history,
        "roe": roe,
        "roce": roce,
        "latestToplineCr": history[-1]['toplineCr'] if history else None,
        "latestNetProfitCr": history[-1]['netProfitCr'] if history else None,
    }

# ── Main collection ──────────────────────────────────────────────────────────

def load_tickers():
    """Load tickers from the ticker file."""
    if os.path.exists(TICKER_FILE):
        with open(TICKER_FILE) as f:
            return [line.strip() for line in f if line.strip()]
    # Fallback: extract from nifty250Data.ts
    ts_path = os.path.join(ROOT_DIR, 'src', 'data', 'nifty250Data.ts')
    with open(ts_path) as f:
        content = f.read()
    tickers = re.findall(r"ticker:\s+'([^']+)'", content)
    return tickers

def collect_one(ticker):
    """Collect data for a single ticker."""
    try:
        # Apply ticker name mapping if needed
        screener_ticker = SCREENER_TICKER_MAP.get(ticker, ticker)
        result = parse_financials(screener_ticker)
        if result:
            # Use original ticker name in the result
            result['ticker'] = ticker
            print(f"  ✓ {ticker:15s} ({len(result['history'])} yrs)")
            return result
        else:
            print(f"  ✗ {ticker:15s} no data")
            return None
    except Exception as e:
        print(f"  ✗ {ticker:15s} error: {str(e)[:60]}")
        return None

def main():
    print("=" * 60)
    print("Nifty 250 — Screener.in Data Collector")
    print(f"  Workers: {PARALLEL_WORKERS}")
    print(f"  Source-pack: {SOURCE_DIR}")
    print("=" * 60)
    
    os.makedirs(SOURCE_DIR, exist_ok=True)
    
    # Load tickers
    print("\n[1/4] Loading tickers...")
    tickers = load_tickers()
    print(f"  {len(tickers)} tickers loaded")
    
    # Collect financial data
    print(f"\n[2/4] Scraping screener.in ({len(tickers)} companies)...")
    results = []
    errors = 0
    start = time.time()
    
    with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as ex:
        fut_map = {ex.submit(collect_one, t): t for t in tickers}
        done = 0
        for fut in as_completed(fut_map):
            ticker = fut_map[fut]
            data = fut.result()
            done += 1
            if data:
                results.append(data)
            else:
                errors += 1
            
            if done % 50 == 0 or done == len(tickers):
                elapsed = time.time() - start
                print(f"    {done}/{len(tickers)} ({errors} errors) in {elapsed:.0f}s")
            
            # Rate limiting between batches
            time.sleep(RATE_LIMIT_DELAY / PARALLEL_WORKERS)
    
    elapsed = time.time() - start
    print(f"  Completed: {len(results)} companies, {errors} errors in {elapsed:.0f}s")
    
    if len(results) == 0:
        print("  ERROR: No data collected!")
        return 1
    
    # Sort by ticker
    results.sort(key=lambda x: x['ticker'])
    
    # Build fiscal year set
    all_fys = set()
    for r in results:
        for fy in r['fiscalYears']:
            if fy.startswith('FY'):
                all_fys.add(fy)
    all_fys = sorted(all_fys)
    print(f"\n  Fiscal years: {all_fys[0]} to {all_fys[-1]} ({len(all_fys)} years)")
    
    # ── Build source-pack files ──────────────────────────────────────────
    now = datetime.now(timezone.utc)
    timestamp = now.isoformat()
    
    print(f"\n[3/4] Building source-pack files...")
    
    # 3a. constituents.json
    constituents = []
    sectors_map = {}
    for r in results:
        sector = SCREENER_SECTOR_MAP.get(r['sector'], r['sector'])
        constituents.append({
            "symbol": r['ticker'],
            "name": r['name'],
            "sector": sector,
            "industry": r['sector'],
            "reportingType": r['reportingType'],
            "listingExchange": "NSE",
            "source": "screener-in",
        })
    # Also track sector
    const_json = {
        "generatedAt": timestamp,
        "asOfDate": now.strftime("%Y-%m-%d"),
        "source": "real",
        "sourcePolicy": "screener-in",
        "schemaVersion": 2,
        "fiscalYears": all_fys,
        "sourceName": "NSE Indices (via screener.in scraping)",
        "downloadedAt": timestamp,
        "constituents": constituents,
    }
    with open(os.path.join(SOURCE_DIR, "constituents.json"), "w", encoding="utf-8") as f:
        json.dump(const_json, f, indent=2)
    print(f"  ✓ constituents.json ({len(constituents)} companies)")
    
    # 3b. financials.json
    fin_rows = []
    for r in results:
        for h in r['history']:
            fin_rows.append({
                "symbol": r['ticker'],
                "fiscalYear": h['fy'],
                "periodEndDate": None,
                "statementType": "consolidated",
                "revenueCr": h['toplineCr'],
                "netProfitCr": h['netProfitCr'],
                "operatingProfitCr": h['operatingProfitCr'],
                "sourceName": "Screener.in",
                "sourceType": "scraped_financial_data",
                "qualityFlags": [],
            })
    fin_json = {
        "generatedAt": timestamp,
        "rows": fin_rows,
        "sourceName": "Screener.in",
        "downloadedAt": timestamp,
        "licenseBasis": "publicly_available_via_screener_in",
        "fiscalYears": all_fys,
    }
    with open(os.path.join(SOURCE_DIR, "financials.json"), "w", encoding="utf-8") as f:
        json.dump(fin_json, f, indent=2)
    print(f"  ✓ financials.json ({len(fin_rows)} rows, {len(all_fys)} fiscal years)")
    
    # 3c. market_data.json (derived from latest financials)
    mkt_rows = []
    for r in results:
        latest_fy = r['fiscalYears'][-1] if r['fiscalYears'] else None
        if latest_fy:
            mkt_rows.append({
                "symbol": r['ticker'],
                "name": r['name'],
                "reportingType": r['reportingType'],
                "fiscalYear": latest_fy,
                "latestToplineCr": r['latestToplineCr'],
                "latestNetProfitCr": r['latestNetProfitCr'],
                "roePct": r['roe'],
                "rocePct": r['roce'],
                "dataStartFy": r['fiscalYears'][0] if r['fiscalYears'] else None,
                "dataEndFy": latest_fy,
                "yearsOfData": len(r['history']),
            })
    mkt_json = {
        "generatedAt": timestamp,
        "rows": mkt_rows,
        "sourceName": "Screener.in",
        "downloadedAt": timestamp,
    }
    with open(os.path.join(SOURCE_DIR, "market_data.json"), "w", encoding="utf-8") as f:
        json.dump(mkt_json, f, indent=2)
    print(f"  ✓ market_data.json ({len(mkt_rows)} rows)")
    
    # ── Summary ───────────────────────────────────────────────────────────
    companies_with_data = sum(1 for r in results if len(r['history']) >= 5)
    avg_years = sum(len(r['history']) for r in results) / max(1, len(results))
    
    print(f"\n[4/4] Collection summary")
    print(f"  Companies collected: {len(results)}/{len(tickers)}")
    print(f"  Companies with 5+ yrs data: {companies_with_data}")
    print(f"  Average years per company: {avg_years:.1f}")
    print(f"  Fiscal year range: {all_fys[0]} to {all_fys[-1]}")
    print(f"  Source-pack: {SOURCE_DIR}")
    print(f"\n  Next: npm run generate:nifty250")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
