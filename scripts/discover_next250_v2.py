#!/usr/bin/env python3
"""
discover_next250_v2.py — Find next 250 companies beyond Nifty 750, 
sorted by market cap (largest first), sourced from NSE full equity list.

Strategy:
1. Get ALL 2367 NSE-listed companies from EQUITY_L.csv
2. Exclude the 751 we already have
3. Use yfinance to get market cap for the remaining ~1600
4. Sort by market cap descending
5. Pick top 300 (to allow for scraping failures)
6. Save list for batch screener scraping
"""
import json, os, sys, time, csv, io, requests
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "ar")

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def get_existing_tickers():
    tickers = set()
    if os.path.exists(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            if f.endswith('.json') and f != 'company_index.json':
                tickers.add(f.replace('.json', '').upper())
    return tickers

def get_nse_equity_list():
    """Download NSE full equity list CSV."""
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.nseindia.com/',
    })
    session.get('https://www.nseindia.com')
    time.sleep(2)
    
    r = session.get('https://archives.nseindia.com/content/equities/EQUITY_L.csv', timeout=30)
    if r.status_code != 200:
        log(f"NSE CSV failed: {r.status_code}")
        return []
    
    reader = csv.DictReader(io.StringIO(r.text))
    companies = []
    for row in reader:
        sym = row.get('SYMBOL', '').strip().upper()
        name = row.get('NAME OF COMPANY', '').strip()
        series = row.get(' SERIES', '').strip()
        # Only EQ series (regular equity)
        if sym and 'EQ' in series:
            companies.append({'symbol': sym, 'name': name})
    
    return companies

def get_market_caps_yfinance(tickers, batch_size=50, delay=0.5):
    """Get market cap from yfinance for a list of tickers."""
    import yfinance as yf
    
    results = {}
    total = len(tickers)
    
    for i in range(0, total, batch_size):
        batch = tickers[i:i+batch_size]
        log(f"yfinance batch {i//batch_size + 1}/{(total+batch_size-1)//batch_size}: {len(batch)} tickers")
        
        for ticker in batch:
            try:
                yf_ticker = f"{ticker}.NS"
                t = yf.Ticker(yf_ticker)
                info = t.info
                mcap = info.get('marketCap', 0) or 0
                sector = info.get('sector', '') or ''
                industry = info.get('industry', '') or ''
                results[ticker] = {
                    'marketCapCr': round(mcap / 10_000_000, 2) if mcap else 0,
                    'sector': sector,
                    'industry': industry,
                }
            except Exception as e:
                results[ticker] = {'marketCapCr': 0, 'sector': '', 'industry': ''}
        
        if i + batch_size < total:
            time.sleep(delay)
    
    return results

def main():
    log("=" * 60)
    log("DISCOVER NEXT 250+ COMPANIES (v2 — market cap sorted)")
    log("=" * 60)
    
    existing = get_existing_tickers()
    log(f"Current AR count: {len(existing)}")
    
    # Step 1: Get all NSE-listed companies
    nse_companies = get_nse_equity_list()
    log(f"NSE equity list: {len(nse_companies)} companies")
    
    # Step 2: Filter to new companies only
    new_companies = [c for c in nse_companies if c['symbol'] not in existing]
    log(f"New companies (not in AR): {len(new_companies)}")
    
    # Step 3: Get market cap from yfinance
    new_tickers = [c['symbol'] for c in new_companies]
    log(f"Getting market cap for {len(new_tickers)} tickers from yfinance...")
    
    mcap_data = get_market_caps_yfinance(new_tickers)
    
    # Merge market cap into company data
    for c in new_companies:
        data = mcap_data.get(c['symbol'], {})
        c['marketCapCr'] = data.get('marketCapCr', 0)
        c['sector'] = data.get('sector', '')
        c['industry'] = data.get('industry', '')
    
    # Step 4: Sort by market cap descending
    new_companies.sort(key=lambda x: x['marketCapCr'], reverse=True)
    
    # Step 5: Filter out zero-mcap (delisted/inactive)
    with_mcap = [c for c in new_companies if c['marketCapCr'] > 0]
    zero_mcap = [c for c in new_companies if c['marketCapCr'] == 0]
    log(f"With market cap > 0: {len(with_mcap)}")
    log(f"Zero market cap (likely delisted): {len(zero_mcap)}")
    
    # Step 6: Pick top 300
    target = with_mcap[:300]
    log(f"Selected top {len(target)} companies by market cap")
    
    # Print top 30
    log("\nTop 30 new companies by market cap:")
    for c in target[:30]:
        log(f"  {c['symbol']:15s}  {c['marketCapCr']:>10,.0f} Cr  {c['sector']}")
    
    log(f"\n#250-300:")
    for c in target[250:300]:
        log(f"  {c['symbol']:15s}  {c['marketCapCr']:>10,.0f} Cr  {c['sector']}")
    
    # Save
    out_path = os.path.join(SCRIPT_DIR, 'next250_tickers.json')
    output = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'existingCount': len(existing),
        'totalNSE': len(nse_companies),
        'totalNew': len(new_companies),
        'withMcap': len(with_mcap),
        'selectedCount': len(target),
        'tickers': [c['symbol'] for c in target],
        'companies': target,  # Full data for enrichment later
    }
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    log(f"\nSaved {len(target)} tickers to {out_path}")
    return target

if __name__ == '__main__':
    main()
