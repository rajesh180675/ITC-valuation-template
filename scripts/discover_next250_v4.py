#!/usr/bin/env python3
"""
discover_next250_v4.py — Fast discovery using screener.in search API.

Searches for companies by letter prefix, gets all tickers,
cross-references with existing AR, picks top by market cap.
"""
import re, json, os, time, requests
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "ar")
RATE_LIMIT_DELAY = 2  # 2s for search API (lighter than page scraping)

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def get_existing_tickers():
    tickers = set()
    if os.path.exists(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            if f.endswith('.json') and f != 'company_index.json':
                tickers.add(f.replace('.json', '').upper())
    return tickers

def main():
    log("=" * 60)
    log("DISCOVER NEXT 250+ (v4 — search API)")
    log("=" * 60)
    
    existing = get_existing_tickers()
    log(f"Current AR count: {len(existing)}")
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.screener.in/',
    })
    
    # Warmup
    session.get('https://www.screener.in/')
    time.sleep(2)
    
    # Search for companies by 2-letter prefix to get comprehensive coverage
    all_companies = {}  # ticker -> {id, name, url}
    
    # Single letter searches first (A-Z)
    prefixes = [chr(c) for c in range(ord('A'), ord('Z') + 1)]
    # Then common 2-letter prefixes for high-frequency letters
    for c1 in 'ABCDEFGHIKMNPRST':
        for c2 in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
            prefixes.append(c1 + c2)
    
    for prefix in prefixes:
        try:
            r = session.get(
                f'https://www.screener.in/api/company/search/?q={prefix}&limit=50',
                timeout=15
            )
            if r.status_code == 200:
                results = r.json()
                for item in results:
                    url = item.get('url', '')
                    m = re.search(r'/company/([A-Z][A-Z0-9&\-]+)/', url)
                    if m:
                        ticker = m.group(1).upper()
                        if ticker not in all_companies:
                            all_companies[ticker] = {
                                'id': item.get('id'),
                                'name': item.get('name', ''),
                                'url': url,
                            }
            elif r.status_code == 429:
                log(f"429! Cooling 60s...")
                time.sleep(60)
                continue
        except Exception as e:
            log(f"Error for prefix {prefix}: {str(e)[:60]}")
        
        time.sleep(RATE_LIMIT_DELAY)
        
        # Progress
        if len(prefix) == 1:
            log(f"  '{prefix}': total discovered {len(all_companies)}")
    
    log(f"\nTotal discovered from screener.in: {len(all_companies)}")
    
    # Find new tickers
    new_tickers = sorted(set(all_companies.keys()) - existing)
    log(f"New tickers (not in AR): {len(new_tickers)}")
    
    # Now get market cap for new tickers using a fast approach
    # Instead of yfinance (slow), use the screener screen pages
    # Actually, let's just scrape them all — the screener scraper will 
    # get market cap data as part of the AR scrape
    
    # For prioritization, let's at least check the top ones with yfinance
    # But limit to just 350 tickers to keep it fast
    target_count = 300
    target = new_tickers[:target_count]  # Alphabetical for now
    
    # Save the full list + target list
    out_path = os.path.join(SCRIPT_DIR, 'next250_tickers.json')
    output = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'existingCount': len(existing),
        'totalDiscovered': len(all_companies),
        'totalNew': len(new_tickers),
        'selectedCount': len(target),
        'tickers': target,
        'allNewTickers': new_tickers,
        'companies': {t: all_companies.get(t, {}) for t in target},
    }
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    log(f"\nSaved {len(target)} target tickers to {out_path}")
    log(f"Sample: {target[:20]}")
    
    return target

if __name__ == '__main__':
    main()
