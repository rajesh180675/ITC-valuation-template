#!/usr/bin/env python3
"""
Compute CAPM beta for Nifty stocks using 5 years of weekly returns
regressed against ^NSEI (Nifty 50 Index).

Usage:
  python scripts/compute_betas.py
  python scripts/compute_betas.py --ticker RELIANCE  # single stock

Output updates market_data.json source-pack files with computed beta.
"""

import json, os, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import yfinance as yf
    import pandas as pd
    import numpy as np
except ImportError:
    print("ERROR: Install: pip install yfinance pandas numpy")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))

NS = 20  # tickers per batch to avoid yfinance rate limits

def compute_beta(ticker):
    """Compute beta vs ^NSEI using 5 years of weekly returns."""
    try:
        # Download 5 years of weekly data
        stock = yf.download(f"{ticker}.NS", period="5y", interval="1wk",
                           progress=False, auto_adjust=True)
        index = yf.download("^NSEI", period="5y", interval="1wk",
                           progress=False, auto_adjust=True)

        if stock.empty or index.empty or len(stock) < 52 or len(index) < 52:
            return ticker, None

        # yfinance returns MultiIndex columns with auto_adjust
        # Extract Close prices as Series
        stock_close = stock.xs('Close', axis=1, level=0).iloc[:, 0]
        index_close = index.xs('Close', axis=1, level=0).iloc[:, 0]

        # Align dates
        combined = stock_close.to_frame('stock').join(index_close.to_frame('index'), how='inner')
        if len(combined) < 52:
            return ticker, None

        # Compute weekly returns
        returns = combined.pct_change().dropna()

        # Linear regression via numpy: stock_return = alpha + beta * market_return
        beta = round(float(np.polyfit(returns['index'], returns['stock'], 1)[0]), 2)

        return ticker, beta
    except Exception as e:
        print(f"      [DEBUG] {ticker} error: {e}", flush=True)
        return ticker, None

def compute_betas(tickers, output_paths):
    """Compute betas for a list of tickers and update output files."""
    results = {}

    print(f"Computing beta for {len(tickers)} tickers vs ^NSEI (5Y weekly)...")

    # Process in batches to respect rate limits
    for i in range(0, len(tickers), NS):
        batch = tickers[i:i+NS]
        with ThreadPoolExecutor(max_workers=5) as ex:
            fut_map = {ex.submit(compute_beta, t): t for t in batch}
            for fut in as_completed(fut_map):
                t, b = fut.result()
                if b is not None:
                    results[t] = b
                    print(f"  {t:15s} β={b:.2f}")
                else:
                    print(f"  {t:15s} β=N/A")
                time.sleep(0.3)

        if i + NS < len(tickers):
            time.sleep(2)  # cooldown between batches

    print(f"\nComputed {len(results)}/{len(tickers)} betas")

    # Update all output files
    for path in output_paths:
        if not os.path.exists(path):
            continue
        try:
            with open(path) as f:
                data = json.load(f)

            updated = 0
            for row in data.get('rows', []):
                sym = row.get('symbol') or row.get('ticker', '')
                if sym in results:
                    # Store beta in market_data
                    if 'beta' not in row:
                        row['beta'] = results[sym]
                    updated += 1

            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print(f"  Updated {updated} in {os.path.basename(path)}")
        except Exception as e:
            print(f"  ✗ {path}: {e}")

    return results

def main():
    # Collect all unique tickers from all source-packs
    all_tickers = set()

    search_paths = [
        os.path.join(ROOT_DIR, 'scripts', 'nifty250', 'source-pack', 'market_data.json'),
    ]

    for path in search_paths:
        if os.path.exists(path):
            with open(path) as f:
                data = json.load(f)
            for row in data.get('rows', []):
                sym = row.get('symbol', '')
                if sym:
                    all_tickers.add(sym)

    tickers = sorted(all_tickers)
    print(f"Found {len(tickers)} unique tickers across all indices")
    print(f"E.g.: {tickers[:5]}...")

    # Only compute for requested ticker if --ticker flag
    if '--ticker' in sys.argv:
        idx = sys.argv.index('--ticker')
        t = sys.argv[idx + 1]
        tickers = [t]
        print(f"Single ticker mode: {t}")

    compute_betas(tickers, search_paths)

    print("\nDone! Run assemblers to rebuild feeds:")
    print("  node scripts/build_nifty250_feed.mjs")
    print("  node scripts/build_nifty750_feed.mjs")

if __name__ == '__main__':
    main()
