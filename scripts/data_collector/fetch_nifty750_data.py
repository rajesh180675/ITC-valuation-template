#!/usr/bin/env python3
"""
Nifty 750 — Real Data Feed Builder (Parallel)
================================================
Uses ThreadPoolExecutor to parallelize yfinance calls across 750 companies.

Output -> scripts/nifty750/source-pack/:
  constituents.json, financials.json, market_data.json

Usage:
  npm run generate:nifty750:real
"""

import json, os, sys, time
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import yfinance as yf
    import requests
except ImportError:
    print("ERROR: Install: pip install yfinance pandas requests")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", ".."))
SOURCE_DIR = os.path.join(ROOT_DIR, "scripts", "nifty750", "source-pack")
PARALLEL_WORKERS = 8  # yfinance rate limit-safe

NIFTY_INDICES = {
    "niftylargemidcap250": "NIFTY LARGEMIDCAP 250",
    "niftysmallcap250":    "NIFTY SMALLCAP 250",
    "niftymicrocap250":    "NIFTY MICROCAP 250",
}

FINANCIAL_KEYWORDS = [
    "bank", "nbfc", "finance", "insurance", "housing finance",
    "housing development", "mutual fund", "asset management",
    "stock broking", "credit", "microfinance", "financial services",
]

_NSE_SESSION = None

def nse():
    global _NSE_SESSION
    if _NSE_SESSION is None:
        s = requests.Session()
        s.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.nseindia.com/",
        })
        s.get("https://www.nseindia.com", timeout=15)
        _NSE_SESSION = s
    return _NSE_SESSION


def to_cr(v):
    if v is None: return None
    try:
        f = float(v)
        if not (f == f) or abs(f) > 1e18: return None  # NaN or absurd
        return round(f / 100_000_00, 2)
    except: return None


def round2(v):
    if v is None: return None
    try:
        f = float(v)
        if not (f == f) or abs(f) > 1e18: return None
        return round(f, 2)
    except: return None


def fetch_constituents(index_name):
    """Fetch constituents from NSE API + classify financial/nonFinancial."""
    session = nse()
    url = f"https://www.nseindia.com/api/equity-stockIndices?index={index_name.replace(' ', '%20')}"
    resp = session.get(url, timeout=20)
    if resp.status_code != 200:
        print(f"  ✗ HTTP {resp.status_code} for {index_name}")
        return []
    data = resp.json().get("data", [])
    companies = []
    for entry in data[1:]:
        meta = entry.get("meta", {})
        industry = (meta.get("industry") or "").lower()
        is_financial = any(kw in industry for kw in FINANCIAL_KEYWORDS)
        companies.append({
            "symbol": entry["symbol"],
            "name": meta.get("companyName", entry["symbol"]),
            "isin": meta.get("isin", ""),
            "sector": industry.title(),
            "industry": industry.title(),
            "listingExchange": "NSE",
            "reportingType": "financial" if is_financial else "nonFinancial",
            "ffmc": entry.get("ffmc"),
            "lastPrice": entry.get("lastPrice"),
            "yearHigh": entry.get("yearHigh"),
            "yearLow": entry.get("yearLow"),
        })
    return companies


def fetch_one_company(symbol, retries=2):
    """Fetch financial data for a single company via yfinance."""
    for attempt in range(retries):
        try:
            import time as _time
            if attempt > 0:
                _time.sleep(3 * (attempt + 1))  # backoff

            tk = yf.Ticker(f"{symbol}.NS")
            info = tk.info
            result = {
                "marketCap": info.get("marketCap"),
                "trailingPE": info.get("trailingPE"),
                "priceToBook": info.get("priceToBook"),
                "returnOnEquity": info.get("returnOnEquity"),
                "debtToEquity": info.get("debtToEquity"),
                "totalRevenue": info.get("totalRevenue"),
                "netIncome": info.get("netIncomeToCommon"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "financials": [],
            }
            # Financial statements
            try:
                fs = tk.financials
                if fs is not None and not fs.empty:
                    for col in fs.columns:
                        row = {"fy": f"FY{col.year}", "end": col.strftime("%Y-%m-%d")}
                        for k in ["Total Revenue", "Net Income", "Net Income Common Stockholders",
                                   "EBITDA", "Reconciled Depreciation", "Interest Expense"]:
                            if k in fs.index:
                                try: row[k] = round(float(fs.loc[k, col]), 2)
                                except: row[k] = None
                        result["financials"].append(row)
            except:
                pass
            return symbol, result, None
        except Exception as e:
            err_msg = str(e)[:80]
            if "rate limit" in err_msg.lower() or "too many" in err_msg.lower() or "401" in err_msg:
                if attempt < retries - 1:
                    continue  # retry
            return symbol, None, err_msg
    return symbol, None, "max retries exceeded"

def fetch_all_financials(companies):
    """Fetch financials for all companies in parallel using ThreadPoolExecutor."""
    total = len(companies)
    results = {}
    errors = 0

    print(f"    Starting {total} fetches with {PARALLEL_WORKERS} workers...")
    start = time.time()

    with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as ex:
        fut_map = {ex.submit(fetch_one_company, c["symbol"]): c["symbol"] for c in companies}
        done = 0
        for fut in as_completed(fut_map):
            sym, data, err = fut.result()
            done += 1
            if data is not None:
                results[sym] = data
            else:
                errors += 1
                results[sym] = None
                if errors <= 3:
                    print(f"    ✗ {sym}: {err}")
            if done % 100 == 0 or done == total:
                elapsed = time.time() - start
                print(f"    {done}/{total} ({errors} errors) in {elapsed:.0f}s")

    elapsed = time.time() - start
    print(f"    Completed: {len(results)} companies, {errors} errors in {elapsed:.0f}s")
    return results


def write_json(data, filename):
    path = os.path.join(SOURCE_DIR, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, allow_nan=False, default=str)
    size = os.path.getsize(path) / 1024
    print(f"  ✓ {filename} ({size:.1f} KB)")


def main():
    print("=" * 60)
    print("Nifty 750 — Real Data Feed Builder")
    print(f"  Workers: {PARALLEL_WORKERS}")
    print(f"  Source-pack: {SOURCE_DIR}")
    print("=" * 60)

    # ── 1. Constituents ───────────────────────────────────────────
    print("\n[1/4] Fetching NSE index constituents...")
    all_constituents = {}
    total = 0
    for slug, name in NIFTY_INDICES.items():
        print(f"  {name}...")
        comps = fetch_constituents(name)
        all_constituents[slug] = comps
        total += len(comps)
        print(f"    {len(comps)} constituents")
    print(f"  Total: {total} companies")

    fin_c = sum(1 for comps in all_constituents.values() for c in comps if c["reportingType"] == "financial")
    print(f"  Financial: {fin_c} | Non-financial: {total - fin_c}")

    # ── 2. Financials (parallel) ──────────────────────────────────
    print(f"\n[2/4] Fetching financial data from yfinance ({total} companies)...")
    flat = [c for comps in all_constituents.values() for c in comps]
    fin_results = fetch_all_financials(flat)

    # ── 3. Build source-pack ──────────────────────────────────────
    print(f"\n[3/4] Building source-pack files...")
    now = datetime.now(timezone.utc)
    fiscal_years = set()

    # 3a. constituents.json
    name_map = {"niftylargemidcap250": "Nifty LargeMidcap 250",
                "niftysmallcap250": "Nifty Smallcap 250",
                "niftymicrocap250": "Nifty Microcap 250"}
    const_batches = []
    for slug, comps in all_constituents.items():
        batch_companies = [{
            "symbol": c["symbol"],
            "name": c["name"],
            "isin": c["isin"],
            "sector": c["sector"],
            "industry": c["industry"],
            "reportingType": c["reportingType"],
            "listingExchange": "NSE",
            "source": "real",
            "sourceUrl": f"https://www.nseindia.com/get-quotes/equity?symbol={c['symbol']}",
            "qualityFlags": [],
        } for c in comps]
        const_batches.append({
            "indexSlug": slug,
            "indexName": name_map[slug],
            "asOfDate": now.strftime("%Y-%m-%d"),
            "sourceName": "NSE Indices",
            "sourceUrl": f"https://www.nseindia.com/api/equity-stockIndices?index={name_map[slug].replace(' ', '%20')}",
            "sourceType": "official_index_constituent_file",
            "licenseBasis": "publicly_available_nse_website_data",
            "companies": batch_companies,
        })
    constituents = {
        "generatedAt": now.isoformat(),
        "asOfDate": now.strftime("%Y-%m-%d"),
        "source": "real",
        "sourcePolicy": "official-only",
        "schemaVersion": 2,
        "fiscalYears": [],
        "sourceName": "NSE Indices",
        "downloadedAt": now.isoformat(),
        "batches": const_batches,
    }
    write_json(constituents, "constituents.json")
    for b in const_batches:
        print(f"    {b['indexSlug']}: {len(b['companies'])} companies")

    # 3b. financials.json
    fin_rows = []
    for sym, data in fin_results.items():
        if data is None: continue
        for inc in data.get("financials", []):
            fy = inc.get("fy", "")
            fiscal_years.add(fy)
            rev = inc.get("Total Revenue")
            profit = inc.get("Net Income") or inc.get("Net Income Common Stockholders")
            fin_rows.append({
                "symbol": sym,
                "fiscalYear": fy,
                "periodEndDate": inc.get("end"),
                "statementType": "consolidated",
                "revenueCr": to_cr(rev),
                "netProfitCr": to_cr(profit),
                "shareholdersEquityCr": None,
                "totalDebtCr": None,
                "sourceName": "Yahoo Finance (yfinance)",
                "sourceType": "aggregated_financial_data",
                "qualityFlags": [],
            })
    financials = {
        "generatedAt": now.isoformat(),
        "rows": fin_rows,
        "sourceName": "Yahoo Finance (yfinance)",
        "downloadedAt": now.isoformat(),
        "licenseBasis": "publicly_available_via_yfinance",
        "fiscalYears": sorted(fiscal_years),
    }
    write_json(financials, "financials.json")
    covered = len(set(r["symbol"] for r in fin_rows))
    print(f"    {len(fin_rows)} rows across {len(fiscal_years)} FYs, {covered} companies with financial data")

    # 3c. market_data.json
    mkt_rows = []
    for slug, comps in all_constituents.items():
        for c in comps:
            dat = fin_results.get(c["symbol"])
            mkt_rows.append({
                "symbol": c["symbol"],
                "fiscalYear": f"FY{now.year if now.month > 3 else now.year - 1}",
                "marketCapCr": to_cr(c.get("ffmc")),
                "pe": round2(dat.get("trailingPE") if dat else None),
                "pb": round2(dat.get("priceToBook") if dat else None),
                "marketDataAsOfDate": now.strftime("%Y-%m-%d"),
                "sourceName": "NSE Indices + Yahoo Finance",
                "sourceType": "official_index_and_market_data",
                "qualityFlags": [],
            })
    market_data = {
        "generatedAt": now.isoformat(),
        "rows": mkt_rows,
        "sourceName": "NSE Indices (market cap) + Yahoo Finance (PE/PB)",
        "downloadedAt": now.isoformat(),
    }
    write_json(market_data, "market_data.json")
    print(f"    {len(mkt_rows)} market data rows")

    # ── Summary ───────────────────────────────────────────────────
    print(f"\n[4/4] Source-pack ready!")
    print(f"  Directory: {SOURCE_DIR}")
    print(f"\n  Next: npm run generate:nifty750")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
