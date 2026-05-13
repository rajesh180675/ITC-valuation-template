#!/usr/bin/env python3
"""
Scrape missing companies — those not in company_index but in Nifty750.
Sequential scrape with 4.5s delay between each.
"""
import json, os, sys, time

# Add parent dir to path for imports
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

# Import the scraper function
from screener_scraper import scrape_ticker, OUTPUT_DIR, ROOT

# Load manifest
manifest_path = os.path.join(ROOT, 'public', 'data', 'ar', 'company_index.json')
idx = json.load(open(manifest_path, 'r', encoding='utf-8'))

missing = sorted([c for c in idx['companies'] if not c.get('hasAr')], key=lambda x: x['ticker'])
print(f'Missing companies to scrape: {len(missing)}')
for c in missing:
    print(f'  {c["ticker"]:20s} {c["name"][:40]} [{c["indexSlug"]}]')

total = len(missing)
success = 0
fail = 0
start = time.time()

for i, c in enumerate(missing):
    ticker = c['ticker']
    pct = f'{(i+1)/total*100:.0f}%'
    print(f'\n[{i+1}/{total}] ({pct}) {ticker}...')
    result = scrape_ticker(ticker)
    if result.get('ok'):
        success += 1
        print(f'  ✅ {result.get("years","?")}y, {result.get("fields","?")} fields ({result.get("fy_range","?")})')
    else:
        fail += 1
        print(f'  ❌ {result.get("error","?")}')
    if i < total - 1:
        time.sleep(4.5)

elapsed = time.time() - start
print(f'\n{"="*50}')
print(f'Done: {success} OK, {fail} FAIL in {elapsed/60:.1f}min')

# Rebuild manifest
print('\nRebuilding manifest...')
from build_company_manifest import build_manifest
manifest = build_manifest()

# Print updated coverage
with_ar = sum(1 for c in manifest['companies'] if c.get('hasAr'))
without_ar = sum(1 for c in manifest['companies'] if not c.get('hasAr'))
print(f'Updated coverage: {with_ar}/{len(manifest["companies"])} with AR data ({without_ar} remaining)')
