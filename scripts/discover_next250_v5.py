#!/usr/bin/env python3
"""
discover_next250_v5.py — Fast discovery using NSE CSV + yfinance batch download.

1. Get all 2367 NSE companies from EQUITY_L.csv
2. Filter to ~1600 new ones
3. Use yfinance.download() for batch market cap (fast!)
4. Sort by market cap, pick top 300
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

def main():
    log("=" * 60)
    log("DISCOVER NEXT 250+ (v5 — NSE CSV + yfinance batch)")
    log("=" * 60)
    
    existing = get_existing_tickers()
    log(f"Current AR count: {len(existing)}")
    
    # Step 1: Get NSE equity list
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.nseindia.com/',
    })
    session.get('https://www.nseindia.com')
    time.sleep(2)
    
    r = session.get('https://archives.nseindia.com/content/equities/EQUITY_L.csv', timeout=30)
    reader = csv.DictReader(io.StringIO(r.text))
    nse_companies = []
    for row in reader:
        sym = row.get('SYMBOL', '').strip().upper()
        name = row.get('NAME OF COMPANY', '').strip()
        series = row.get(' SERIES', '').strip()
        if sym and 'EQ' in series:
            nse_companies.append({'symbol': sym, 'name': name})
    
    log(f"NSE equity list: {len(nse_companies)} companies")
    
    # Step 2: Filter to new companies
    new_companies = [c for c in nse_companies if c['symbol'] not in existing]
    log(f"New companies (not in AR): {len(new_companies)}")
    
    if len(new_companies) == 0:
        log("No new companies to add!")
        return []
    
    # Step 3: Get market cap using yfinance batch download
    import yfinance as yf
    import pandas as pd
    
    # Download in batches of 100 (yfinance handles this well)
    new_tickers = [c['symbol'] for c in new_companies]
    ns_tickers = [f"{t}.NS" for t in new_tickers]
    
    log(f"Downloading market data for {len(ns_tickers)} tickers in batches...")
    
    all_data = {}
    batch_size = 100
    
    for i in range(0, len(ns_tickers), batch_size):
        batch = ns_tickers[i:i+batch_size]
        batch_syms = new_tickers[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(ns_tickers) + batch_size - 1) // batch_size
        log(f"  Batch {batch_num}/{total_batches}: {len(batch)} tickers")
        
        try:
            # Download just current price data (fast)
            data = yf.download(batch, period="1d", group_by="ticker", 
                              threads=True, progress=False)
            
            for j, sym in enumerate(batch_syms):
                ns_sym = batch[j]
                try:
                    if hasattr(data.columns, 'get_level_values'):
                        # MultiIndex columns
                        if ns_sym in data.columns.get_level_values(0):
                            row = data[ns_sym]
                            close = row.get('Close', [None])
                            if close is not None and not (isinstance(close, float) and close != close):
                                all_data[sym] = float(close) if close else 0
                            else:
                                all_data[sym] = 0
                        else:
                            all_data[sym] = 0
                    else:
                        # Single ticker or flat columns
                        close = data.get('Close', None)
                        if close is not None:
                            val = close.iloc[-1] if hasattr(close, 'iloc') else close
                            all_data[sym] = float(val) if val else 0
                        else:
                            all_data[sym] = 0
                except Exception:
                    all_data[sym] = 0
                    
        except Exception as e:
            log(f"  Batch error: {str(e)[:80]}")
            for sym in batch_syms:
                all_data[sym] = 0
        
        time.sleep(1)
    
    # Step 4: Get shares outstanding for market cap calculation
    # Alternative: use yf.Ticker().info for top candidates only
    # Since batch download only gives price, let's use a different approach
    
    # Get market cap from yfinance .info for each ticker (sequential but fast)
    log(f"Getting market cap via yfinance .info for {len(new_tickers)} tickers...")
    mcap_data = {}
    
    for i, ticker in enumerate(new_tickers):
        try:
            t = yf.Ticker(f"{ticker}.NS")
            info = t.info
            mcap = info.get('marketCap', 0) or 0
            sector = info.get('sector', '') or ''
            industry = info.get('industry', '') or ''
            mcap_data[ticker] = {
                'marketCapCr': round(mcap / 10_000_000, 2) if mcap else 0,
                'sector': sector,
                'industry': industry,
            }
        except:
            mcap_data[ticker] = {'marketCapCr': 0, 'sector': '', 'industry': ''}
        
        if (i + 1) % 100 == 0:
            log(f"  {i+1}/{len(new_tickers)} done")
        
        # Rate limit: yfinance doesn't need much delay but be safe
        if (i + 1) % 50 == 0:
            time.sleep(2)
    
    # Step 5: Merge and sort by market cap
    for c in new_companies:
        d = mcap_data.get(c['symbol'], {})
        c['marketCapCr'] = d.get('marketCapCr', 0)
        c['sector'] = d.get('sector', '')
        c['industry'] = d.get('industry', '')
    
    new_companies.sort(key=lambda x: x.get('marketCapCr', 0), reverse=True)
    
    with_mcap = [c for c in new_companies if c.get('marketCapCr', 0) > 0]
    zero_mcap = [c for c in new_companies if c.get('marketCapCr', 0) == 0]
    log(f"With market cap > 0: {len(with_mcap)}")
    log(f"Zero market cap (likely delisted/unknown): {len(zero_mcap)}")
    
    # Step 6: Pick top 300
    target = with_mcap[:300]
    log(f"Selected top {len(target)} companies by market cap")
    
    # Print summary
    log("\nTop 30 new companies by market cap:")
    for c in target[:30]:
        log(f"  {c['symbol']:15s}  {c['marketCapCr']:>10,.0f} Cr  {c['sector']}")
    
    if len(target) > 250:
        log(f"\n#250-300:")
        for c in target[250:]:
            log(f"  {c['symbol']:15s}  {c['marketCapCr']:>10,.0f} Cr  {c['sector']}")
    
    # Save
    out_path = os.path.join(SCRIPT_DIR, 'next250_tickers.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'existingCount': len(existing),
            'totalNSE': len(nse_companies),
            'totalNew': len(new_companies),
            'withMcap': len(with_mcap),
            'selectedCount': len(target),
            'tickers': [c['symbol'] for c in target],
            'companies': target,
        }, f, indent=2, ensure_ascii=False)
    
    log(f"\nSaved {len(target)} tickers to {out_path}")
    return target

if __name__ == '__main__':
    main()
