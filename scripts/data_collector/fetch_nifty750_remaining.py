#!/usr/bin/env python3
"""
Collect Nifty Smallcap 250 / Microcap 250 data from screener.in
Uses the proven Nifty250 scraper to collect data, then writes
Nifty750 source-pack files.

Usage:
  python scripts/data_collector/fetch_nifty750_remaining.py
"""

import sys, os, json
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# Import the proven Nifty250 scraper
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from scripts.data_collector.fetch_nifty250_data import (
    parse_financials, SCREENER_TICKER_MAP, collect_one, HEADERS, RATE_LIMIT_DELAY, PARALLEL_WORKERS
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..'))
SOURCE_BASE = os.path.join(ROOT_DIR, 'scripts', 'nifty750')

INDICES = [
    ('smallcap250', os.path.join(SCRIPT_DIR, 'niftysmallcap250_tickers.txt')),
    ('microcap250', os.path.join(SCRIPT_DIR, 'niftymicrocap250_tickers.txt')),
]

def load_tickers(path):
    with open(path) as f:
        return [line.strip() for line in f if line.strip()]

def write_source_pack(tickers, results, slug, output_dir):
    """Write source-pack files for a batch of results."""
    os.makedirs(output_dir, exist_ok=True)
    results.sort(key=lambda x: x['ticker'])

    all_fys = set()
    for r in results:
        for fy in r['fiscalYears']:
            if fy.startswith('FY'):
                all_fys.add(fy)
    all_fys = sorted(all_fys)

    now = datetime.now(timezone.utc)
    ts = now.isoformat()

    # constituents.json
    constituents = []
    for r in results:
        constituents.append({
            "symbol": r['ticker'], "name": r['name'],
            "sector": r['sector'], "industry": r['sector'],
            "reportingType": r['reportingType'],
            "listingExchange": "NSE", "source": "screener-in",
        })
    const_json = {
        "generatedAt": ts, "asOfDate": now.strftime("%Y-%m-%d"),
        "source": "real", "sourcePolicy": "screener-in",
        "schemaVersion": 3, "fiscalYears": all_fys,
        "sourceName": f"NSE {slug} (via screener.in)",
        "downloadedAt": ts, "constituents": constituents,
    }
    with open(os.path.join(output_dir, "constituents.json"), "w", encoding="utf-8") as f:
        json.dump(const_json, f, indent=2)
    print(f"  ✓ constituents.json ({len(constituents)} cos)")

    # financials.json
    fin_rows = []
    for r in results:
        for h in r['history']:
            fin_rows.append({
                "symbol": r['ticker'], "fiscalYear": h['fy'],
                "periodEndDate": None, "statementType": "consolidated",
                "revenueCr": h['toplineCr'], "expensesCr": h['expensesCr'],
                "operatingProfitCr": h['operatingProfitCr'], "opmPct": h['opmPct'],
                "otherIncomeCr": h['otherIncomeCr'], "interestCr": h['interestCr'],
                "depreciationCr": h['depreciationCr'], "profitBeforeTaxCr": h['profitBeforeTaxCr'],
                "taxPct": h['taxPct'], "netProfitCr": h['netProfitCr'],
                "epsRs": h['epsRs'], "dividendPayoutPct": h['dividendPayoutPct'],
                "sourceName": "Screener.in", "sourceType": "scraped_financial_data",
                "qualityFlags": [],
            })
    fin_json = {"generatedAt": ts, "rows": fin_rows, "sourceName": "Screener.in",
                "downloadedAt": ts, "licenseBasis": "publicly_available_via_screener_in",
                "fiscalYears": all_fys}
    with open(os.path.join(output_dir, "financials.json"), "w", encoding="utf-8") as f:
        json.dump(fin_json, f, indent=2)
    print(f"  ✓ financials.json ({len(fin_rows)} rows)")

    # balance_sheets.json
    bs_rows = []
    for r in results:
        for h in r['history']:
            bs_rows.append({
                "symbol": r['ticker'], "fiscalYear": h['fy'],
                "equityCapitalCr": h['equityCapitalCr'], "reservesCr": h['reservesCr'],
                "borrowingsCr": h['borrowingsCr'],
                "otherLiabilitiesCr": h['otherLiabilitiesCr'],
                "totalLiabilitiesCr": h['totalLiabilitiesCr'],
                "fixedAssetsCr": h['fixedAssetsCr'], "cwipCr": h['cwipCr'],
                "investmentsCr": h['investmentsCr'], "otherAssetsCr": h['otherAssetsCr'],
                "totalAssetsCr": h['totalAssetsCr'],
            })
    with open(os.path.join(output_dir, "balance_sheets.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": ts, "rows": bs_rows}, f, indent=2)
    print(f"  ✓ balance_sheets.json ({len(bs_rows)} rows)")

    # cashflows.json
    cf_rows = []
    for r in results:
        for h in r['history']:
            cf_rows.append({
                "symbol": r['ticker'], "fiscalYear": h['fy'],
                "operatingCFCr": h['operatingCFCr'], "investingCFCr": h['investingCFCr'],
                "financingCFCr": h['financingCFCr'], "netCashFlowCr": h['netCashFlowCr'],
                "freeCashFlowCr": h['freeCashFlowCr'], "cfoToOpPct": h['cfoToOpPct'],
            })
    with open(os.path.join(output_dir, "cashflows.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": ts, "rows": cf_rows}, f, indent=2)
    print(f"  ✓ cashflows.json ({len(cf_rows)} rows)")

    # company_ratios.json
    ratio_rows = []
    for r in results:
        for h in r['history']:
            ratio_rows.append({
                "symbol": r['ticker'], "fiscalYear": h['fy'],
                "debtorDays": h['debtorDays'], "inventoryDays": h['inventoryDays'],
                "daysPayable": h['daysPayable'], "cashConversionCycle": h['cashConversionCycle'],
                "workingCapitalDays": h['workingCapitalDays'], "rocePct": h['rocePct'],
            })
    with open(os.path.join(output_dir, "company_ratios.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": ts, "rows": ratio_rows}, f, indent=2)
    print(f"  ✓ company_ratios.json ({len(ratio_rows)} rows)")

    # market_data.json
    mkt_rows = []
    for r in results:
        h = r['history'][-1] if r['history'] else {}
        fy = r['fiscalYears'][-1] if r['fiscalYears'] else None
        if fy:
            mkt_rows.append({
                "symbol": r['ticker'], "name": r['name'],
                "reportingType": r['reportingType'], "fiscalYear": fy,
                "latestToplineCr": h.get('toplineCr'),
                "latestNetProfitCr": h.get('netProfitCr'),
                "latestOperatingProfitCr": h.get('operatingProfitCr'),
                "latestEpsRs": h.get('epsRs'),
                "roePct": None, "rocePct": h.get('rocePct'),
                "opmPct": h.get('opmPct'),
                "equityCapitalCr": h.get('equityCapitalCr'),
                "reservesCr": h.get('reservesCr'),
                "borrowingsCr": h.get('borrowingsCr'),
                "totalAssetsCr": h.get('totalAssetsCr'),
                "freeCashFlowCr": h.get('freeCashFlowCr'),
                "operatingCFCr": h.get('operatingCFCr'),
                "dataStartFy": r['fiscalYears'][0] if r['fiscalYears'] else None,
                "dataEndFy": fy, "yearsOfData": len(r['history']),
                "marketCapCr": None, "stockPe": None,
                "bookValue": None, "dividendYieldPct": None, "currentPrice": None,
            })
    with open(os.path.join(output_dir, "market_data.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": ts, "rows": mkt_rows, "sourceName": "Screener.in"}, f, indent=2)
    print(f"  ✓ market_data.json ({len(mkt_rows)} rows)")
    print(f"  Fiscal years: {all_fys[0] if all_fys else 'N/A'} to {all_fys[-1] if all_fys else 'N/A'} ({len(all_fys)})")

def main():
    print("=" * 70)
    print("Nifty 750 Remaining — Screener.in Collector")
    print(f"  Workers: {PARALLEL_WORKERS}")
    print("=" * 70)

    for slug, ticker_path in INDICES:
        if not os.path.exists(ticker_path):
            print(f"\n  ✗ Ticker file not found: {ticker_path}")
            continue

        tickers = load_tickers(ticker_path)
        print(f"\n{'='*50}")
        print(f"  {slug}: {len(tickers)} tickers")
        print(f"{'='*50}")

        output_dir = os.path.join(SOURCE_BASE, slug)

        # Collect data
        print(f"\n  Scraping screener.in...")
        results = []
        errors = 0
        start = time.time()

        with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as ex:
            fut_map = {ex.submit(collect_one, t): t for t in tickers}
            done = 0
            for fut in as_completed(fut_map):
                ticker = fut_map[fut]
                data = fut.result()
                done += 1
                if data:
                    results.append(data)
                else:
                    errors += 1
                if done % 50 == 0 or done == len(tickers):
                    elapsed = time.time() - start
                    print(f"    {done}/{len(tickers)} ({errors} errors) in {elapsed:.0f}s")
                time.sleep(RATE_LIMIT_DELAY / PARALLEL_WORKERS)

        elapsed = time.time() - start
        print(f"  Completed: {len(results)}/{len(tickers)} in {elapsed:.0f}s")

        if results:
            write_source_pack(tickers, results, slug, output_dir)
        else:
            print("  ⚠ No results — skipping source-pack write")

    print("\n" + "=" * 70)
    print("ALL DONE")
    print("=" * 70)

if __name__ == '__main__':
    main()
