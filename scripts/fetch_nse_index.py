#!/usr/bin/env python3
"""
Fetch NSE index constituents for any valid NSE index.
Uses the same session-based approach as fetch_nifty750_data.py.

Usage:
  python scripts/fetch_nse_index.py NIFTY500
  python scripts/fse_index.py NIFTYMIDSMLCAP400

Available indices:
  NIFTY50, NIFTYNEXT50, NIFTY100, NIFTY200, NIFTY500,
  NIFTYMIDCAP50, NIFTYMIDCAP100, NIFTYMIDCAP150,
  NIFTYSMALLCAP50, NIFTYSMALLCAP100, NIFTYSMALLCAP250,
  NIFTYMIDSMLCAP400, NIFTYMICROCAP250, NIFTYTOTALMARKET
"""

import json, os, time, sys

import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
SOURCE_PACK_BASE = os.path.join(ROOT_DIR, 'scripts')

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept": "application/json",
    "Referer": "https://www.nseindia.com/",
    "Accept-Language": "en-US,en;q=0.9",
}

def nse_session():
    """Get a valid NSE session with cookie."""
    s = requests.Session()
    s.headers.update(HEADERS)
    s.get("https://www.nseindia.com", timeout=15)
    return s

def fetch_constituents(index_name):
    """Fetch constituents from NSE API."""
    s = nse_session()
    url = f"https://www.nseindia.com/api/equity-stockIndices?index={index_name.replace(' ', '%20')}"
    try:
        r = s.get(url, timeout=15)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"Error fetching {index_name}: {e}")
        return None

    companies = []
    for row in data.get('data', []):
        info = row.get('info', {})
        symbol = info.get('symbol', '')
        industry = info.get('industry', 'Unknown')
        sector = info.get('sector', 'Unknown')
        market_cap = row.get('marketCap', 0)
        companies.append({
            'symbol': symbol,
            'name': info.get('companyName', symbol),
            'sector': sector,
            'industry': industry,
            'marketCapCr': round(market_cap / 1_000_000, 2) if market_cap else 0,
            'weightPct': round(row.get('weight', 0), 4),
        })

    print(f"  Fetched {len(companies)} companies from NSE for {index_name}")
    return companies

def main():
    if len(sys.argv) < 2:
        print("Usage: python fetch_nse_index.py <INDEX_NAME>")
        print("Examples: NIFTY500, NIFTYMIDSMLCAP400, NIFTYTOTALMARKET")
        sys.exit(1)

    index_name = sys.argv[1]
    output_dir = os.path.join(SOURCE_PACK_BASE, 'nse_indices', index_name.lower())
    os.makedirs(output_dir, exist_ok=True)

    print(f"Fetching {index_name}...")
    companies = fetch_constituents(index_name)
    if not companies:
        print("Failed!")
        sys.exit(1)

    out_path = os.path.join(output_dir, 'constituents.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({'indexSlug': index_name.lower(), 'constituents': companies}, f, indent=2)

    print(f"Saved {len(companies)} companies to {out_path}")

if __name__ == '__main__':
    main()
