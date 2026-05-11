#!/usr/bin/env python3
"""Check which NIFTY 50, NEXT 50, MIDCAP 150 companies are missing from our data."""
import requests, json

s = requests.Session()
s.headers.update({'User-Agent':'Mozilla/5.0','Accept':'application/json','Referer':'https://www.nseindia.com/'})
s.get('https://www.nseindia.com', timeout=15)

with open('scripts/nifty750/largemidcap250/constituents.json') as f:
    have = {c['symbol'] for c in json.load(f)['constituents']}

indices = {
    'NIFTY 50': 'NIFTY+50',
    'NIFTY NEXT 50': 'NIFTY+NEXT+50',
    'NIFTY MIDCAP 150': 'NIFTY+MIDCAP+150',
}

for label, slug in indices.items():
    r = s.get(f'https://www.nseindia.com/api/equity-stockIndices?index={slug}', timeout=20)
    nse = {d['symbol'] for d in r.json().get('data',[])[1:]}
    missing = nse - have
    print(f'{label}: {len(nse)} total, {len(nse & have)} in data, missing={len(missing)}')
    if missing:
        for m in sorted(missing):
            print(f'  {m}')
    print()
