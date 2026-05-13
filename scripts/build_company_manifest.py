#!/usr/bin/env python3
"""
Build company manifest from nifty750_real.json + scraped AR data.
Outputs a single JSON index: public/data/ar/company_index.json

Structure:
{
  "manifestVersion": 1,
  "generatedAt": "...",
  "count": 748,
  "companies": [
    {"ticker": "RELIANCE", "name": "Reliance Industries", "indexSlug": "largemidcap250", "hasAr": true, "years": 12, "fyRange": "FY2015-FY2026"},
    ...
  ],
  "byTicker": {
    "RELIANCE": { "name": "...", "indexSlug": "...", "hasAr": true, ... }
  }
}
"""
import json, os, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
AR_DIR = os.path.join(ROOT, "public", "data", "ar")
NIFTY750_PATH = os.path.join(ROOT, "public", "data", "nifty750_real.json")
OUTPUT_PATH = os.path.join(ROOT, "public", "data", "ar", "company_index.json")

def build_manifest():
    # Load Nifty750 data for all companies
    if not os.path.exists(NIFTY750_PATH):
        print(f"ERROR: {NIFTY750_PATH} not found")
        sys.exit(1)

    with open(NIFTY750_PATH, 'r', encoding='utf-8') as f:
        nifty750 = json.load(f)

    # Build ticker→metadata from nifty750
    all_companies = {}
    for batch in nifty750.get('batches', []):
        slug = batch.get('indexSlug', 'unknown')
        for c in batch.get('companies', []):
            ticker = (c.get('ticker') or c.get('id') or '').upper().strip()
            if not ticker:
                continue
            if ticker not in all_companies:
                all_companies[ticker] = {
                    'ticker': ticker,
                    'name': c.get('name', ticker),
                    'indexSlug': slug,
                    'sector': c.get('sector', 'Unknown'),
                    'reportingType': c.get('reportingType', 'unknown'),
                    'hasAr': False,
                    'years': 0,
                    'fyRange': None,
                }

    # Enrich with AR data (scraped files)
    ar_dir = AR_DIR
    scraped_count = 0
    if os.path.exists(ar_dir):
        for fname in sorted(os.listdir(ar_dir)):
            if not fname.endswith('.json') or fname == 'company_index.json':
                continue
            ticker = fname.replace('.json', '').upper()
            try:
                with open(os.path.join(ar_dir, fname), 'r', encoding='utf-8') as f:
                    ar_data = json.load(f)
                years = ar_data.get('years', {})
                year_keys = sorted(years.keys())
                has_pl_bs_cf = all(
                    any(year_keys and years[yk].get(s) for yk in year_keys)
                    for s in ['profitLoss', 'balanceSheet', 'cashFlow']
                )
                metadata = ar_data.get('metadata', {})

                if ticker in all_companies:
                    all_companies[ticker]['hasAr'] = True
                    all_companies[ticker]['years'] = len(year_keys)
                    all_companies[ticker]['fyRange'] = f"{year_keys[0]}-{year_keys[-1]}" if year_keys else None
                    all_companies[ticker]['arSchema'] = metadata.get('schemaVersion')
                    all_companies[ticker]['arSource'] = metadata.get('source', '')
                else:
                    # Company not in Nifty750 but has AR data
                    all_companies[ticker] = {
                        'ticker': ticker,
                        'name': ticker,
                        'indexSlug': 'other',
                        'sector': 'Unknown',
                        'reportingType': 'unknown',
                        'hasAr': True,
                        'years': len(year_keys),
                        'fyRange': f"{year_keys[0]}-{year_keys[-1]}" if year_keys else None,
                        'arSchema': metadata.get('schemaVersion'),
                        'arSource': metadata.get('source', ''),
                    }
                scraped_count += 1
            except (json.JSONDecodeError, KeyError) as e:
                print(f"  WARN: {fname} - {e}")

    # Build output
    companies_list = sorted(all_companies.values(), key=lambda x: x['ticker'])
    by_ticker = {c['ticker']: c for c in companies_list}

    manifest = {
        'manifestVersion': 1,
        'generatedAt': __import__('datetime').datetime.now().isoformat(),
        'count': len(companies_list),
        'scrapedCount': scraped_count,
        'companies': companies_list,
        'byTicker': by_ticker,
    }

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"Manifest written: {OUTPUT_PATH}")
    print(f"  Total companies: {len(companies_list)}")
    print(f"  With AR data: {scraped_count}")
    print(f"  Without AR data: {len(companies_list) - scraped_count}")

    return manifest

if __name__ == '__main__':
    build_manifest()
