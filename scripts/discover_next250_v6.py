#!/usr/bin/env python3
"""
discover_next250_v6.py — Discover next 250 companies using screener.in 
screen pages with market cap data.

Uses the 'All stocks sorted by market cap' screen to get tickers + MCap.
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
    'Accept-Language': 'en-US,en;q=0.9',
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

def parse_num(s):
    """Parse Indian number format (with commas)"""
    if not s:
        return 0
    s = s.replace(',', '').replace('Cr.', '').strip()
    try:
        return float(s)
    except:
        return 0

def scrape_screen_page(session, url):
    """Scrape a screener screen page, return list of companies with market cap."""
    try:
        r = session.get(url, timeout=30)
        if r.status_code == 429:
            log(f"  429! Cooling 120s...")
            time.sleep(120)
            return [], True
        if r.status_code != 200:
            log(f"  HTTP {r.status_code}")
            return [], r.status_code == 404
        
        soup = BeautifulSoup(r.text, 'lxml')
        table = soup.find('table', class_='data-table')
        if not table:
            return [], True
        
        rows = table.find_all('tr')
        if len(rows) <= 1:
            return [], True
        
        # Find market cap column index from header
        header_row = rows[0]
        headers = [th.get_text(strip=True) for th in header_row.find_all('th')]
        mcap_col = -1
        for i, h in enumerate(headers):
            if 'mar cap' in h.lower() or 'market cap' in h.lower():
                mcap_col = i
                break
        
        companies = []
        for row in rows[1:]:
            tds = row.find_all('td')
            if len(tds) < 3:
                continue
            
            # Get ticker from link
            link = tds[1].find('a', href=True) if len(tds) > 1 else None
            if not link:
                continue
            m = re.match(r'/company/([A-Z][A-Z0-9&\-]+)/', link['href'])
            if not m:
                continue
            
            ticker = m.group(1).upper()
            name = link.get_text(strip=True)
            mcap = parse_num(tds[mcap_col].get_text(strip=True)) if mcap_col >= 0 and mcap_col < len(tds) else 0
            
            companies.append({
                'ticker': ticker,
                'name': name,
                'marketCapCr': mcap,
            })
        
        return companies, False
        
    except Exception as e:
        log(f"  Error: {str(e)[:80]}")
        return [], False

def main():
    log("=" * 60)
    log("DISCOVER NEXT 250+ (v6 — screener screens + MCap)")
    log("=" * 60)
    
    existing = get_existing_tickers()
    log(f"Current AR count: {len(existing)}")
    
    session = requests.Session()
    session.headers.update(HEADERS)
    
    # Warmup
    log("Warming up screener.in session...")
    session.get('https://www.screener.in/')
    time.sleep(3)
    
    # Use multiple screen URLs that have market cap column
    # These screens list all companies with market cap
    screens = [
        # Bluest of Blue Chips (large caps sorted by various metrics)
        'https://www.screener.in/screens/234/bluest-of-the-blue-chips/?page={}',
        # Growth Stocks
        'https://www.screener.in/screens/178/growth-stocks/?page={}',
        # Bull Cartel
        'https://www.screener.in/screens/1/the-bull-cartel/?page={}',
        # Magic Formula  
        'https://www.screener.in/screens/59/magic-formula/?page={}',
        # Value Stocks
        'https://www.screener.in/screens/184/value-stocks/?page={}',
        # High Growth High ROE Low PE
        'https://www.screener.in/screens/18/high-growth-high-roe-low-pe/?page={}',
        # Highest Dividend Yield
        'https://www.screener.in/screens/3/highest-dividend-yield-shares/?page={}',
        # Piotroski Scan
        'https://www.screener.in/screens/2/piotroski-scan/?page={}',
        # FII Buying
        'https://www.screener.in/screens/343087/fii-buying/?page={}',
        # Debt Reduction
        'https://www.screener.in/screens/126864/debt-reduction/?page={}',
        # Loss to Profit
        'https://www.screener.in/screens/49/loss-to-profit-companies/?page={}',
        # Capacity Expansion
        'https://www.screener.in/screens/97687/capacity-expansion/?page={}',
        # Coffee Can Portfolio
        'https://www.screener.in/screens/57601/coffee-can-portfolio/?page={}',
        # Benjamin Graham
        'https://www.screener.in/screens/15310/benjamin-graham-and-warren-buffett/?page={}',
    ]
    
    all_companies = {}  # ticker -> data
    new_companies = {}  # ticker -> data
    
    for screen_url in screens:
        page = 1
        max_pages = 5  # Each screen has ~5 pages of 20 companies = 100 per screen
        
        while page <= max_pages:
            url = screen_url.format(page)
            companies, is_empty = scrape_screen_page(session, url)
            
            page_new = 0
            for c in companies:
                t = c['ticker']
                if t not in all_companies:
                    all_companies[t] = c
                    if t not in existing:
                        new_companies[t] = c
                        page_new += 1
                # Update mcap if we have a better value
                elif c['marketCapCr'] > all_companies[t].get('marketCapCr', 0):
                    all_companies[t]['marketCapCr'] = c['marketCapCr']
            
            log(f"  Page {page}: {len(companies)} tickers, {page_new} new. Total new: {len(new_companies)}")
            
            if is_empty or not companies:
                break
            page += 1
            time.sleep(RATE_LIMIT_DELAY)
        
        if len(new_companies) >= 350:
            break
    
    log(f"\nTotal discovered: {len(all_companies)}, New: {len(new_companies)}")
    
    # Sort new companies by market cap descending
    sorted_new = sorted(new_companies.values(), key=lambda x: x.get('marketCapCr', 0), reverse=True)
    
    # Filter out zero mcap
    with_mcap = [c for c in sorted_new if c.get('marketCapCr', 0) > 0]
    log(f"New with market cap > 0: {len(with_mcap)}")
    
    # Pick top 300
    target = with_mcap[:300]
    log(f"Selected top {len(target)} companies")
    
    # Print summary
    if target:
        log("\nTop 20 new companies by market cap:")
        for c in target[:20]:
            log(f"  {c['ticker']:15s}  {c['marketCapCr']:>10,.0f} Cr  {c['name']}")
        
        if len(target) > 250:
            log(f"\n#250+:")
            for c in target[250:]:
                log(f"  {c['ticker']:15s}  {c['marketCapCr']:>10,.0f} Cr  {c['name']}")
    
    # Save
    out_path = os.path.join(SCRIPT_DIR, 'next250_tickers.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'existingCount': len(existing),
            'totalDiscovered': len(all_companies),
            'totalNew': len(new_companies),
            'selectedCount': len(target),
            'tickers': [c['ticker'] for c in target],
            'companies': target,
        }, f, indent=2, ensure_ascii=False)
    
    log(f"\nSaved {len(target)} tickers to {out_path}")
    return target

if __name__ == '__main__':
    main()
