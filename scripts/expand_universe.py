#!/usr/bin/env python3
"""
Expand NSE universe beyond Nifty 750.
Fetches ALL listed NSE companies and their 10y financials via yfinance.

Strategy:
1. Load existing 749 companies from nifty750_real.json + nifty250_real.json
2. Fetch NSE Total Market / BSE 500 constituent lists
3. Diff to find NEW tickers not in our current feeds
4. Batch-fetch via yfinance for the new tickers
5. Build nifty_expanded.json feed with same schema

Usage:
  python scripts/expand_universe.py --fetch-constituents   # Step 1-2
  python scripts/expand_universe.py --yfinance-batch        # Step 3-4
  python scripts/expand_universe.py --build-feed             # Step 5
  python scripts/expand_universe.py --all                    # All steps
"""

import sys, os, json, time, argparse
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
DATA_DIR = os.path.join(ROOT, "public", "data")
AR_DIR = os.path.join(DATA_DIR, "ar")
EXPANDED_DIR = os.path.join(ROOT, "scripts", "expanded")

os.makedirs(EXPANDED_DIR, exist_ok=True)
os.makedirs(AR_DIR, exist_ok=True)

# ── Step 1: Load existing universe ──────────────────────────────────────────

def load_existing_ids():
    """Get all company IDs we already have in our feeds."""
    existing = set()
    n750 = json.load(open(os.path.join(DATA_DIR, "nifty750_real.json"), "r", encoding="utf-8"))
    for b in n750.get("batches", []):
        for c in b.get("companies", []):
            existing.add(c["id"].upper())
    n250 = json.load(open(os.path.join(DATA_DIR, "nifty250_real.json"), "r", encoding="utf-8"))
    for c in n250.get("constituents", []):
        existing.add(c["id"].upper())
    # Also count AR files
    for f in os.listdir(AR_DIR):
        if f.endswith(".json") and f != "company_index.json":
            existing.add(f.replace(".json", "").upper())
    return existing

# ── Step 2: Fetch NSE constituents via NSE India API ────────────────────────

def nse_session():
    """Establish NSE session with cookie."""
    import requests
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.nseindia.com/",
    })
    s.get("https://www.nseindia.com", timeout=15)
    return s

def fetch_nse_index_constituents(index_name, session=None):
    """Fetch constituents from NSE API for a given index."""
    import requests
    if session is None:
        session = nse_session()
    url = f"https://www.nseindia.com/api/equity-stockIndices?index={index_name}"
    try:
        r = session.get(url, timeout=15)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"  ERROR fetching {index_name}: {e}")
        return []
    
    companies = []
    for row in data.get("data", []):
        info = row.get("info", {})
        symbol = info.get("symbol", "")
        if not symbol or symbol == index_name:
            continue
        companies.append({
            "symbol": symbol,
            "name": info.get("companyName", symbol),
            "sector": info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
            "marketCapCr": round(row.get("marketCap", 0) / 1e7, 2),
            "weightPct": round(row.get("weight", 0), 4),
        })
    return companies

def fetch_all_nse_constituents():
    """Fetch constituents from multiple NSE indices and deduplicate."""
    INDICES = [
        "NIFTY 50",
        "NIFTY NEXT 50", 
        "NIFTY 100",
        "NIFTY 200",
        "NIFTY 500",
        "NIFTY MIDCAP 150",
        "NIFTY SMALLCAP 250",
        "NIFTY MICROCAP 250",
        "NIFTY MIDSMALLCAP 400",
        "NIFTY TOTAL MARKET",
    ]
    
    all_companies = {}  # symbol → company data
    session = nse_session()
    
    for idx in INDICES:
        print(f"Fetching {idx}...")
        cos = fetch_nse_index_constituents(idx.replace(" ", ""), session)
        new_count = 0
        for c in cos:
            sym = c["symbol"]
            if sym not in all_companies:
                all_companies[sym] = c
                new_count += 1
        print(f"  Got {len(cos)} companies, {new_count} new → total {len(all_companies)}")
        time.sleep(1)  # Be polite
    
    # Save
    out_path = os.path.join(EXPANDED_DIR, "nse_all_constituents.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "source": "NSE India API",
            "fetchedAt": datetime.now().isoformat(),
            "totalCompanies": len(all_companies),
            "companies": list(all_companies.values()),
        }, f, indent=2)
    print(f"\nSaved {len(all_companies)} unique companies to {out_path}")
    return all_companies

# ── Step 3: yfinance batch fetch ────────────────────────────────────────────

def yfinance_batch_fetch(tickers, max_workers=4):
    """Fetch 10y financials for a list of tickers via yfinance."""
    import yfinance as yf
    
    results = {}
    errors = []
    
    for i, ticker in enumerate(tickers):
        sym = ticker.upper()
        ns_ticker = sym + ".NS"
        print(f"  [{i+1}/{len(tickers)}] {sym}...", end=" ", flush=True)
        try:
            t = yf.Ticker(ns_ticker)
            info = t.info or {}
            
            if not info.get("marketCap"):
                print("SKIP (no marketCap)")
                errors.append((sym, "no marketCap"))
                continue
            
            # Extract key metrics from info
            result = {
                "symbol": sym,
                "name": info.get("shortName", info.get("longName", sym)),
                "sector": info.get("sector", "Unknown"),
                "industry": info.get("industry", "Unknown"),
                "marketCapCr": round(info.get("marketCap", 0) / 1e7, 2),
                "cmp": info.get("currentPrice", 0),
                "pe": info.get("trailingPE"),
                "pb": info.get("priceToBook"),
                "roePct": round((info.get("returnOnEquity", 0) or 0) * 100, 2),
                "revenueTtmCr": round((info.get("totalRevenue", 0) or 0) / 1e7, 2),
                "netProfitTtmCr": round((info.get("netIncomeToCommon", 0) or 0) / 1e7, 2),
                "dividendYieldPct": round((info.get("dividendYield", 0) or 0) * 100, 2),
                "beta": info.get("beta"),
                "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
                "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
            }
            
            # Fetch income_stmt for 10y history
            history = []
            try:
                income = t.income_stmt
                if income is not None and hasattr(income, "columns"):
                    for col in income.columns:
                        fy = f"FY{col.year}" if hasattr(col, "year") else str(col)[:4]
                        rev = _get_val(income, col, ["Total Revenue", "Revenue From Contract With Customer Excluding Assessed Tax"])
                        op = _get_val(income, col, ["Operating Income", "EBIT"])
                        np_ = _get_val(income, col, ["Net Income", "Net Income Common Stockholders"])
                        interest = _get_val(income, col, ["Interest Expense", "Interest Expense Non Operating"])
                        dep = _get_val(income, col, ["Depreciation And Amortization", "Depreciation Income Statement"])
                        tax = _get_val(income, col, ["Tax Provision"])
                        eps = _get_val(income, col, ["Diluted EPS", "Basic EPS"])
                        
                        if rev or np_:
                            history.append({
                                "fy": fy,
                                "revenueCr": _to_cr(rev),
                                "operatingProfitCr": _to_cr(op),
                                "netProfitCr": _to_cr(np_),
                                "interestCr": _to_cr(interest),
                                "depreciationCr": _to_cr(dep),
                                "taxCr": _to_cr(tax),
                                "epsRs": round(eps, 2) if eps else None,
                            })
            except Exception as e:
                pass
            
            result["history"] = history
            results[sym] = result
            print(f"OK ({len(history)} FYs, MCap={result['marketCapCr']:.0f}Cr)")
            
        except Exception as e:
            print(f"ERROR: {e}")
            errors.append((sym, str(e)[:60]))
        
        time.sleep(0.3)
    
    return results, errors

def _get_val(df, col, labels):
    """Get a value from a yfinance DataFrame for a given column and list of possible row labels."""
    for label in labels:
        if label in df.index:
            val = df.loc[label, col]
            if val is not None and val == val:  # NaN check
                return val
    return None

def _to_cr(val):
    """Convert yfinance value (in USD or raw) to crores. yfinance returns values in the company's reporting currency."""
    if val is None:
        return None
    return round(val / 1e7, 2)  # Assuming INR raw values

# ── Step 4: Build expanded feed ─────────────────────────────────────────────

def build_expanded_feed(yf_results, existing_ids):
    """Build the nifty_expanded.json feed from yfinance results."""
    new_companies = []
    for sym, data in yf_results.items():
        if sym in existing_ids:
            continue
        if not data.get("history") or len(data["history"]) < 2:
            continue
        new_companies.append({
            "id": sym.lower(),
            "name": data.get("name", sym),
            "sector": data.get("sector", "Unknown"),
            "industry": data.get("industry", "Unknown"),
            "marketCapCr": data.get("marketCapCr", 0),
            "history": data["history"],
            "latest": {
                "pe": data.get("pe"),
                "pb": data.get("pb"),
                "roePct": data.get("roePct"),
                "revenueTtmCr": data.get("revenueTtmCr"),
                "netProfitTtmCr": data.get("netProfitTtmCr"),
                "dividendYieldPct": data.get("dividendYieldPct"),
                "beta": data.get("beta"),
                "fiftyTwoWeekHigh": data.get("fiftyTwoWeekHigh"),
                "fiftyTwoWeekLow": data.get("fiftyTwoWeekLow"),
                "cmp": data.get("cmp"),
            },
        })
    
    # Sort by market cap descending
    new_companies.sort(key=lambda c: c.get("marketCapCr", 0), reverse=True)
    
    # Split into batches by market cap bracket
    mega = [c for c in new_companies if c["marketCapCr"] >= 200000]  # >2L Cr
    large = [c for c in new_companies if 50000 <= c["marketCapCr"] < 200000]
    mid = [c for c in new_companies if 10000 <= c["marketCapCr"] < 50000]
    small = [c for c in new_companies if c["marketCapCr"] < 10000]
    
    # Determine fiscal years
    all_fys = set()
    for c in new_companies:
        for h in c.get("history", []):
            all_fys.add(h["fy"])
    fiscal_years = sorted(all_fys)
    
    dataset = {
        "schemaVersion": 5,
        "title": "Nifty Expanded Universe",
        "description": f"Companies beyond Nifty 750 with yfinance 10y financial data",
        "fiscalYears": fiscal_years,
        "batches": [
            {"indexSlug": "mega_cap", "label": "Mega Cap (>₹2L Cr)", "companies": mega},
            {"indexSlug": "large_cap", "label": "Large Cap (₹50K-2L Cr)", "companies": large},
            {"indexSlug": "mid_cap", "label": "Mid Cap (₹10K-50K Cr)", "companies": mid},
            {"indexSlug": "small_cap", "label": "Small Cap (<₹10K Cr)", "companies": small},
        ],
        "provenance": {
            "source": "Yahoo Finance (yfinance)",
            "fetchedAt": datetime.now().isoformat(),
            "notes": "Revenue/profit from yfinance income_stmt. No balance sheet or cash flow — use screener.in for full data.",
        },
    }
    
    out_path = os.path.join(DATA_DIR, "nifty_expanded.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)
    
    print(f"\nBuilt nifty_expanded.json:")
    print(f"  Total new companies: {len(new_companies)}")
    print(f"  Mega: {len(mega)}, Large: {len(large)}, Mid: {len(mid)}, Small: {len(small)}")
    print(f"  Fiscal years: {fiscal_years}")
    print(f"  Saved to: {out_path}")
    
    return dataset

# ── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Expand NSE universe beyond Nifty 750")
    parser.add_argument("--fetch-constituents", action="store_true", help="Fetch NSE index constituents")
    parser.add_argument("--yfinance-batch", action="store_true", help="Run yfinance batch fetch for new tickers")
    parser.add_argument("--build-feed", action="store_true", help="Build nifty_expanded.json feed")
    parser.add_argument("--all", action="store_true", help="Run all steps")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of tickers to fetch (0=all)")
    args = parser.parse_args()
    
    if not any([args.fetch_constituents, args.yfinance_batch, args.build_feed, args.all]):
        parser.print_help()
        sys.exit(1)
    
    existing_ids = load_existing_ids()
    print(f"Existing universe: {len(existing_ids)} companies")
    
    if args.fetch_constituents or args.all:
        print("\n── Step 1: Fetching NSE index constituents ──")
        all_nse = fetch_all_nse_constituents()
        new_tickers = [sym for sym in all_nse if sym not in existing_ids]
        print(f"\nNew tickers not in our feeds: {len(new_tickers)}")
        # Save new tickers list
        tickers_path = os.path.join(EXPANDED_DIR, "new_tickers.json")
        with open(tickers_path, "w") as f:
            json.dump(new_tickers, f, indent=2)
        print(f"Saved to {tickers_path}")
    
    if args.yfinance_batch or args.all:
        print("\n── Step 2: yfinance batch fetch ──")
        # Load new tickers
        tickers_path = os.path.join(EXPANDED_DIR, "new_tickers.json")
        if os.path.exists(tickers_path):
            new_tickers = json.load(open(tickers_path, "r"))
        else:
            print("No new_tickers.json found. Run --fetch-constituents first.")
            sys.exit(1)
        
        if args.limit > 0:
            new_tickers = new_tickers[:args.limit]
            print(f"Limited to {args.limit} tickers")
        
        print(f"Fetching {len(new_tickers)} new companies via yfinance...")
        results, errors = yfinance_batch_fetch(new_tickers)
        
        # Save results
        results_path = os.path.join(EXPANDED_DIR, "yfinance_results.json")
        with open(results_path, "w", encoding="utf-8") as f:
            json.dump({
                "results": results,
                "errors": errors,
                "fetchedAt": datetime.now().isoformat(),
            }, f, indent=2, default=str)
        print(f"\nSaved results to {results_path}")
        print(f"Success: {len(results)}, Errors: {len(errors)}")
    
    if args.build_feed or args.all:
        print("\n── Step 3: Building expanded feed ──")
        results_path = os.path.join(EXPANDED_DIR, "yfinance_results.json")
        if os.path.exists(results_path):
            yf_data = json.load(open(results_path, "r"))
            results = yf_data.get("results", {})
        else:
            print("No yfinance_results.json found. Run --yfinance-batch first.")
            sys.exit(1)
        
        build_expanded_feed(results, existing_ids)

if __name__ == "__main__":
    main()
