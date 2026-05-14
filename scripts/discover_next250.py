#!/usr/bin/env python3
"""
discover_next250.py — Find the next 250+ Indian companies beyond Nifty 750.

Sources tickers from:
1. Screener.in stock screener pages (paginated, sorted by market cap)
2. Cross-references with existing AR files to find gaps
3. Outputs a ticker list for batch scraping

Rate-limited per the screener-in-scraping skill (3-4s delay, max 2-3 workers).
"""
import re, json, os, sys, time, requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "ar")
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
}
RATE_LIMIT_DELAY = 4  # 4s between page requests (conservative)

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def get_existing_tickers():
    """Get tickers we already have AR data for."""
    tickers = set()
    if os.path.exists(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            if f.endswith('.json') and f != 'company_index.json':
                tickers.add(f.replace('.json', '').upper())
    return tickers

def get_nifty750_tickers():
    """Get tickers from nifty750 feed."""
    path = os.path.join(ROOT, 'public', 'data', 'nifty750_real.json')
    if not os.path.exists(path):
        return set()
    d = json.load(open(path, 'r', encoding='utf-8'))
    tickers = set()
    for b in d.get('batches', []):
        for c in b.get('companies', []):
            t = c.get('ticker', c.get('id', '')).upper()
            if t:
                tickers.add(t)
    return tickers

def discover_from_screener_pages(max_pages=30, target_new=300):
    """
    Scrape screener.in stock list pages to find tickers beyond Nifty 750.
    Uses the /stocks/ page which lists all companies sorted by market cap.
    """
    session = requests.Session()
    session.headers.update(HEADERS)
    
    # First warm up with homepage
    log("Warming up screener.in session...")
    try:
        session.get('https://www.screener.in/', timeout=30)
        time.sleep(2)
    except Exception as e:
        log(f"Warning: warmup failed: {e}")
    
    existing = get_existing_tickers()
    nifty750 = get_nifty750_tickers()
    log(f"Existing AR: {len(existing)}, Nifty 750: {len(nifty750)}")
    
    all_tickers = []
    new_tickers = []
    seen = set()
    
    # Strategy: Scrape multiple screener pages sorted by market cap
    # The /stocks/ page shows companies in pages of 20
    # We need enough pages to find 300+ new tickers beyond our 750
    urls = [
        # Market cap sorted pages (largest first)
        f'https://www.screener.in/screens/117824/large-cap-stocks/?page={p}'
        for p in range(1, 8)
    ] + [
        f'https://www.screener.in/screens/117825/mid-cap-stocks/?page={p}'
        for p in range(1, 12)
    ] + [
        f'https://www.screener.in/screens/117826/small-cap-stocks/?page={p}'
        for p in range(1, 15)
    ] + [
        # Also try the general stocks page
        f'https://www.screener.in/stocks/?page={p}'
        for p in range(1, max_pages + 1)
    ]
    
    for url in urls:
        if len(new_tickers) >= target_new:
            break
            
        log(f"Fetching: {url}")
        try:
            r = session.get(url, timeout=30)
            if r.status_code == 429:
                log("429! Cooling down 120s...")
                time.sleep(120)
                continue
            if r.status_code != 200:
                log(f"HTTP {r.status_code}, skipping")
                time.sleep(RATE_LIMIT_DELAY)
                continue
            
            soup = BeautifulSoup(r.text, 'lxml')
            
            # Find ticker links in the table
            # Screener links look like /company/TICKER/
            tickers_on_page = set()
            for a in soup.find_all('a', href=True):
                href = a['href']
                m = re.match(r'/company/([A-Z][A-Z0-9&\-]+)/', href)
                if m:
                    tickers_on_page.add(m.group(1).upper())
            
            # Also check data attributes
            for tr in soup.find_all('tr'):
                for a in tr.find_all('a', href=True):
                    href = a['href']
                    m = re.match(r'/company/([A-Z][A-Z0-9&\-]+)/', href)
                    if m:
                        tickers_on_page.add(m.group(1).upper())
            
            page_new = 0
            for t in tickers_on_page:
                if t not in seen:
                    seen.add(t)
                    all_tickers.append(t)
                    if t not in existing:
                        new_tickers.append(t)
                        page_new += 1
            
            log(f"  Found {len(tickers_on_page)} tickers ({page_new} new). Total new: {len(new_tickers)}")
            
        except Exception as e:
            log(f"  Error: {str(e)[:100]}")
        
        time.sleep(RATE_LIMIT_DELAY)
    
    return new_tickers, all_tickers

def discover_from_screener_search():
    """
    Alternative: use screener.in search/API to get full company list.
    The /api/company/search/ endpoint returns matches.
    """
    # This approach is too slow (one search per letter prefix)
    # Skip for now
    pass

def discover_from_nse_equity_list():
    """
    Get the full NSE equity list from the NSE website.
    This has ALL listed companies (2000+).
    """
    import requests
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv,application/json',
        'Referer': 'https://www.nseindia.com/',
    })
    
    # Warmup
    log("Warming up NSE session...")
    session.get('https://www.nseindia.com')
    time.sleep(2)
    
    # Try the equity list CSV
    try:
        # NSE provides a CSV of all equity securities
        r = session.get('https://archives.nseindia.com/content/equities/EQUITY_L.csv', timeout=30)
        if r.status_code == 200 and r.text:
            import csv, io
            reader = csv.DictReader(io.StringIO(r.text))
            symbols = set()
            for row in reader:
                sym = row.get('SYMBOL', '').strip().upper()
                if sym and sym not in ['SYMBOL']:
                    symbols.add(sym)
            log(f"NSE equity list CSV: {len(symbols)} companies")
            return symbols
    except Exception as e:
        log(f"NSE CSV failed: {e}")
    
    # Try the NSE API for full equity list
    try:
        r = session.get('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20TOTAL%20MARKET', timeout=30)
        if r.status_code == 200:
            data = r.json()
            items = data.get('data', [])
            symbols = set()
            for item in items[1:]:  # Skip index itself
                sym = item.get('symbol', '').upper()
                if sym:
                    symbols.add(sym)
            log(f"NSE Total Market API: {len(symbols)} companies")
            return symbols
    except Exception as e:
        log(f"NSE API failed: {e}")
    
    return set()

def main():
    log("=" * 60)
    log("DISCOVER NEXT 250+ COMPANIES")
    log("=" * 60)
    
    existing = get_existing_tickers()
    log(f"Current AR count: {len(existing)}")
    
    # Strategy 1: NSE full equity list (has 2000+ companies)
    nse_symbols = discover_from_nse_equity_list()
    nse_new = sorted(nse_symbols - existing)
    log(f"NSE: {len(nse_symbols)} total, {len(nse_new)} new")
    
    if len(nse_new) >= 250:
        # We have enough from NSE
        target = nse_new[:300]  # Get 300 to account for failures
        log(f"Using {len(target)} tickers from NSE equity list")
    else:
        # Strategy 2: Screener.in pages
        log("Not enough from NSE, supplementing with screener.in discovery...")
        scr_new, scr_all = discover_from_screener_pages()
        # Combine and deduplicate
        combined = sorted(set(nse_new + scr_new))
        target = combined[:300]
        log(f"Combined: {len(target)} new tickers to scrape")
    
    # Filter out known problematic tickers
    skip = {'ELLEN', 'SKFINDUS', 'LGEINDIA'}  # delisted/renamed
    target = [t for t in target if t not in skip]
    
    # Save the target list
    out_path = os.path.join(SCRIPT_DIR, 'next250_tickers.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'totalNew': len(target),
            'existingCount': len(existing),
            'tickers': target,
        }, f, indent=2)
    
    log(f"\nSaved {len(target)} tickers to {out_path}")
    log(f"Sample: {target[:20]}")
    
    return target

if __name__ == '__main__':
    main()
