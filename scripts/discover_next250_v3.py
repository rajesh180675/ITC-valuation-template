#!/usr/bin/env python3
"""
discover_next250_v3.py — Fast discovery of next 250+ companies.

Strategy: scrape screener.in screen pages (sorted by market cap)
to get tickers + market cap without needing yfinance for 1600 tickers.
Then pick top 300 new tickers by market cap.
"""
import re, json, os, time, requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "ar")
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
}
RATE_LIMIT_DELAY = 4

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def get_existing_tickers():
    tickers = set()
    if os.path.exists(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            if f.endswith('.json') and f != 'company_index.json':
                tickers.add(f.replace('.json', '').upper())
    return tickers

def scrape_screener_screen(url, session):
    """Scrape a screener.in screen page, return list of (ticker, name, mcap_cr)."""
    log(f"  Fetching: {url}")
    try:
        r = session.get(url, timeout=30)
        if r.status_code == 429:
            log(f"  429! Cooling 120s...")
            time.sleep(120)
            return []
        if r.status_code != 200:
            log(f"  HTTP {r.status_code}")
            return []
        
        soup = BeautifulSoup(r.text, 'lxml')
        table = soup.find('table', class_='data-table')
        if not table:
            log(f"  No data table found")
            return []
        
        companies = []
        for tr in table.find_all('tr')[1:]:  # Skip header
            tds = tr.find_all('td')
            if len(tds) < 3:
                continue
            
            # Get ticker from link
            link = tds[0].find('a', href=True)
            if not link:
                continue
            href = link['href']
            m = re.match(r'/company/([A-Z][A-Z0-9&\-]+)/', href)
            if not m:
                continue
            ticker = m.group(1).upper()
            name = link.get_text(strip=True)
            
            # Market cap is usually the last column or a specific one
            # The screen table has: S.No, Company, Qtr, Sales, NP, etc.
            # We just need ticker + name; market cap can come later
            companies.append(ticker)
        
        return companies
        
    except Exception as e:
        log(f"  Error: {str(e)[:80]}")
        return []

def main():
    log("=" * 60)
    log("DISCOVER NEXT 250+ (v3 — screener screens)")
    log("=" * 60)
    
    existing = get_existing_tickers()
    log(f"Current AR count: {len(existing)}")
    
    session = requests.Session()
    session.headers.update(HEADERS)
    
    # Warmup
    log("Warming up screener.in session...")
    session.get('https://www.screener.in/')
    time.sleep(3)
    
    # Scrape multiple screen pages to discover companies
    # Use popular screens sorted by market cap
    all_new = []
    seen = set()
    
    screens = [
        # All stocks sorted by market cap (pages 1-50 = ~1000 companies)
        'https://www.screener.in/stocks/?page={}',
    ]
    
    for screen_url in screens:
        page = 1
        consecutive_empty = 0
        while len(all_new) < 350 and consecutive_empty < 3 and page <= 60:
            url = screen_url.format(page)
            tickers = scrape_screener_screen(url, session)
            
            page_new = 0
            for t in tickers:
                if t not in seen:
                    seen.add(t)
                    if t not in existing:
                        all_new.append(t)
                        page_new += 1
            
            if not tickers:
                consecutive_empty += 1
            else:
                consecutive_empty = 0
            
            log(f"  Page {page}: {len(tickers)} tickers, {page_new} new. Total new: {len(all_new)}")
            page += 1
            time.sleep(RATE_LIMIT_DELAY)
    
    # Now get market cap for the top new tickers using yfinance (only 300, fast)
    log(f"\nDiscovered {len(all_new)} new tickers. Getting market cap for top candidates...")
    
    # Quick yfinance check for top tickers to sort by market cap
    try:
        import yfinance as yf
        mcap_data = {}
        batch = all_new[:350]  # Check more than we need
        for i, ticker in enumerate(batch):
            try:
                t = yf.Ticker(f"{ticker}.NS")
                info = t.info
                mcap = info.get('marketCap', 0) or 0
                sector = info.get('sector', '') or ''
                mcap_data[ticker] = {
                    'marketCapCr': round(mcap / 10_000_000, 2) if mcap else 0,
                    'sector': sector,
                }
            except:
                mcap_data[ticker] = {'marketCapCr': 0, 'sector': ''}
            if (i + 1) % 50 == 0:
                log(f"  yfinance: {i+1}/{len(batch)} done")
            time.sleep(0.3)
        
        # Sort by market cap
        all_new_with_mcap = []
        for t in all_new[:350]:
            d = mcap_data.get(t, {'marketCapCr': 0, 'sector': ''})
            all_new_with_mcap.append({
                'symbol': t,
                'marketCapCr': d['marketCapCr'],
                'sector': d.get('sector', ''),
            })
        all_new_with_mcap.sort(key=lambda x: x['marketCapCr'], reverse=True)
        
        # Filter out zero mcap
        with_mcap = [c for c in all_new_with_mcap if c['marketCapCr'] > 0]
        log(f"New companies with market cap: {len(with_mcap)}")
        
        target = with_mcap[:300]
    except ImportError:
        log("yfinance not available, using order from screener discovery")
        target = [{'symbol': t, 'marketCapCr': 0, 'sector': ''} for t in all_new[:300]]
    
    # Print summary
    log(f"\nSelected {len(target)} tickers for scraping:")
    for c in target[:20]:
        log(f"  {c['symbol']:15s}  {c.get('marketCapCr',0):>10,.0f} Cr  {c.get('sector','')}")
    log(f"  ...")
    for c in target[-5:]:
        log(f"  {c['symbol']:15s}  {c.get('marketCapCr',0):>10,.0f} Cr  {c.get('sector','')}")
    
    # Save
    out_path = os.path.join(SCRIPT_DIR, 'next250_tickers.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'existingCount': len(existing),
            'totalDiscovered': len(all_new),
            'selectedCount': len(target),
            'tickers': [c['symbol'] for c in target],
            'companies': target,
        }, f, indent=2, ensure_ascii=False)
    
    log(f"\nSaved to {out_path}")
    return target

if __name__ == '__main__':
    main()
