#!/usr/bin/env python3
"""
Nifty 750 — Real Data Feed from Screener.in
=============================================
Scrapes annual financial data from screener.in for all Nifty 750 stocks
across 3 indices: LargeMidcap 250, Smallcap 250, Microcap 250.

Extracts P&L, Balance Sheet, Cash Flow, and Ratios from free pages.

Outputs per-index source-pack JSONs (constituents.json from NSE API):
  scripts/nifty750/{largemidcap250,smallcap250,microcap250}/
    constituents.json, financials.json, market_data.json,
    balance_sheets.json, cashflows.json, company_ratios.json

Usage:
  python scripts/data_collector/fetch_nifty750_data.py
"""

import json, os, sys, time, re
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("ERROR: Install: pip install beautifulsoup4 lxml requests")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", ".."))
SOURCE_BASE = os.path.join(ROOT_DIR, "scripts", "nifty750")
PARALLEL_WORKERS = 6
RATE_LIMIT_DELAY = 1.5

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

FINANCIAL_KEYWORDS = [
    "bank", "nbfc", "finance", "insurance", "housing finance",
    "housing development", "mutual fund", "asset management",
    "stock broking", "credit", "microfinance", "financial services",
]

NIFTY_INDICES = {
    "niftylargemidcap250": "NIFTY LARGEMIDCAP 250",
    "niftysmallcap250":    "NIFTY SMALLCAP 250",
    "niftymicrocap250":    "NIFTY MICROCAP 250",
}

INDEX_SLUG_MAP = {
    "niftylargemidcap250": "largemidcap250",
    "niftysmallcap250":    "smallcap250",
    "niftymicrocap250":    "microcap250",
}

_NSE_SESSION = None

def nse_session():
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

# ── Helpers ──────────────────────────────────────────────────────────────────

def parse_cr(v_str):
    """Parse a screener.in crores value (e.g. '33,228' or '-' or '38%')."""
    if not v_str or v_str == '-' or v_str.strip() == '':
        return None
    v = v_str.strip()
    try:
        return round(float(v.replace(',', '')), 2)
    except (ValueError, TypeError):
        return None

def parse_pct(v_str):
    """Parse a percentage like '38%' → 38.0."""
    if not v_str or v_str == '-' or v_str.strip() == '':
        return None
    v = v_str.strip().replace('%', '').replace(',', '')
    try:
        return round(float(v), 2)
    except (ValueError, TypeError):
        return None

# ── Ticker mappings ──────────────────────────────────────────────────────────

SCREENER_TICKER_MAP = {
    'LTIM': 'MINDTREE',
    'M&MFIN': 'MMFIN',
    'BAJAJ-AUTO': 'BAJAJAUTO',
    'MCDOWELL-N': 'MCDOWELL',
    'ARE&M': 'AMARARAJA',
    'TRIDENT': 'TRIDENT',
}

def classify_reporting_type(sector):
    sector_lower = sector.lower() if sector else ''
    is_financial = any(kw in sector_lower for kw in FINANCIAL_KEYWORDS)
    return 'financial' if is_financial else 'nonFinancial'

# ── Fetch NSE constituents ───────────────────────────────────────────────────

def fetch_constituents(index_name):
    """Fetch constituents from NSE API."""
    session = nse_session()
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
        companies.append({
            "symbol": entry["symbol"],
            "name": meta.get("companyName", entry["symbol"]),
            "sector": industry.title(),
            "industry": industry.title(),
            "listingExchange": "NSE",
            "reportingType": "financial" if any(kw in industry for kw in FINANCIAL_KEYWORDS) else "nonFinancial",
        })
    return companies

# ── Screener.in scraping ─────────────────────────────────────────────────────

_fetch_cache = {}

def fetch_screener_page(ticker):
    for suffix in ['/consolidated/', '/']:
        full_url = f'https://www.screener.in/company/{ticker}{suffix}'
        if full_url in _fetch_cache:
            return _fetch_cache[full_url], suffix
        for attempt in range(3):
            try:
                resp = requests.get(full_url, headers=HEADERS, timeout=25)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, 'html.parser')
                    tables = soup.find_all('table')
                    if len(tables) >= 2:
                        rows = tables[1].find_all('tr')
                        if rows:
                            hdrs = rows[0].find_all(['th', 'td'])
                            htxt = [h.get_text(strip=True) for h in hdrs[1:]]
                            if any(re.search(r'(Mar|Sep|Dec|Jun)\s+\d{4}', h) for h in htxt):
                                _fetch_cache[full_url] = resp.text
                                return resp.text, suffix
                    _fetch_cache[full_url] = resp.text
                elif resp.status_code == 429:
                    time.sleep(5 * (attempt + 1))
                elif resp.status_code == 404:
                    break
                else:
                    time.sleep(2 * (attempt + 1))
            except Exception as e:
                if attempt < 2:
                    time.sleep(3 * (attempt + 1))
                else:
                    raise e
    return None, None

def extract_table_rows(table):
    rows = table.find_all('tr')
    if not rows:
        return {}
    data = {}
    for row in rows[1:]:
        cells = row.find_all(['th', 'td'])
        if len(cells) > 1:
            name = cells[0].get_text(strip=True)
            values = [c.get_text(strip=True) for c in cells[1:]]
            if name:
                data[name] = values
    return data

def extract_year_headers(table):
    rows = table.find_all('tr')
    if not rows:
        return []
    hdrs = rows[0].find_all(['th', 'td'])
    years_raw = [c.get_text(strip=True) for c in hdrs[1:]]
    fiscal_years = []
    for y in years_raw:
        match = re.search(r'(?:Mar|Sep|Dec|Jun)\s+(\d{4})', y)
        if match:
            fy = f"FY{match.group(1)}"
            if fy not in fiscal_years:
                fiscal_years.append(fy)
    return fiscal_years

def parse_financials(ticker):
    """Parse annual financial data from screener.in for a given ticker."""
    html, suffix = fetch_screener_page(ticker)
    if not html:
        return None

    soup = BeautifulSoup(html, 'html.parser')
    tables = soup.find_all('table')
    if len(tables) < 2:
        return None

    company_name_tag = soup.find('h1', class_='company-name')
    company_name = company_name_tag.get_text(strip=True) if company_name_tag else ticker

    sector_tag = soup.find('a', href=lambda x: x and '/sector/' in (x or ''))
    sector = sector_tag.get_text(strip=True) if sector_tag else 'Unknown'

    # P&L (table[1])
    pl_data = extract_table_rows(tables[1])
    fiscal_years = extract_year_headers(tables[1])

    # Balance Sheet (table[6])
    bs_data = {}
    if len(tables) > 6:
        bs_data = extract_table_rows(tables[6])

    # Cash Flow (table[7])
    cf_data = {}
    if len(tables) > 7:
        cf_data = extract_table_rows(tables[7])

    # Ratios (table[8])
    ratio_data = {}
    if len(tables) > 8:
        ratio_data = extract_table_rows(tables[8])

    # Determine key row names
    topline_key = 'Sales+' if 'Sales+' in pl_data else ('Revenue+' if 'Revenue+' in pl_data else None)
    expenses_key = 'Expenses+' if 'Expenses+' in pl_data else None
    op_key = 'Operating Profit' if 'Operating Profit' in pl_data else ('Financing Profit' if 'Financing Profit' in pl_data else None)
    opm_key = 'OPM %' if 'OPM %' in pl_data else ('Financing Margin %' if 'Financing Margin %' in pl_data else None)
    other_income_key = 'Other Income+' if 'Other Income+' in pl_data else None
    interest_key = 'Interest' if 'Interest' in pl_data else None
    depr_key = 'Depreciation' if 'Depreciation' in pl_data else None
    pbt_key = 'Profit before tax' if 'Profit before tax' in pl_data else None
    tax_key = 'Tax %' if 'Tax %' in pl_data else None
    profit_key = 'Net Profit+' if 'Net Profit+' in pl_data else None
    eps_key = 'EPS in Rs' if 'EPS in Rs' in pl_data else None
    dpr_key = 'Dividend Payout %' if 'Dividend Payout %' in pl_data else None

    # Build history
    history = []
    for i, fy in enumerate(fiscal_years):
        def pl_val(key):
            if key and i < len(pl_data.get(key, [])):
                return parse_cr(pl_data[key][i])
            return None

        def bs_val(key):
            if key:
                idx = next((j for j, bfy in enumerate(extract_year_headers(tables[6]) if len(tables) > 6 else []) if bfy == fy), None)  # simplified below
            return None

        # Simpler approach: just iterate by position
        def get_val_at(data_dict, key, idx):
            if key and key in data_dict and idx < len(data_dict[key]):
                return parse_cr(data_dict[key][idx])
            return None

        def get_pct_at(data_dict, key, idx):
            if key and key in data_dict and idx < len(data_dict[key]):
                return parse_pct(data_dict[key][idx])
            return None

        entry = {
            "fy": fy,
            "toplineCr": pl_val(topline_key),
            "expensesCr": pl_val(expenses_key),
            "operatingProfitCr": pl_val(op_key),
            "opmPct": parse_pct(pl_data.get(opm_key, [None] * len(fiscal_years))[i]) if opm_key and i < len(pl_data.get(opm_key, [])) else None,
            "otherIncomeCr": pl_val(other_income_key),
            "interestCr": pl_val(interest_key),
            "depreciationCr": pl_val(depr_key),
            "profitBeforeTaxCr": pl_val(pbt_key),
            "taxPct": parse_pct(pl_data.get(tax_key, [None] * len(fiscal_years))[i]) if tax_key and i < len(pl_data.get(tax_key, [])) else None,
            "netProfitCr": pl_val(profit_key),
            "epsRs": pl_val(eps_key),
            "dividendPayoutPct": parse_pct(pl_data.get(dpr_key, [None] * len(fiscal_years))[i]) if dpr_key and i < len(pl_data.get(dpr_key, [])) else None,
            # BS at same index position
            "equityCapitalCr": get_val_at(bs_data, 'Equity Capital', i),
            "reservesCr": get_val_at(bs_data, 'Reserves', i),
            "borrowingsCr": get_val_at(bs_data, 'Borrowings+', i) or get_val_at(bs_data, 'Borrowing', i),
            "otherLiabilitiesCr": get_val_at(bs_data, 'Other Liabilities+', i),
            "totalLiabilitiesCr": get_val_at(bs_data, 'Total Liabilities', i),
            "fixedAssetsCr": get_val_at(bs_data, 'Fixed Assets+', i),
            "cwipCr": get_val_at(bs_data, 'CWIP', i),
            "investmentsCr": get_val_at(bs_data, 'Investments', i),
            "otherAssetsCr": get_val_at(bs_data, 'Other Assets+', i),
            "totalAssetsCr": get_val_at(bs_data, 'Total Assets', i),
            # CF
            "operatingCFCr": get_val_at(cf_data, 'Cash from Operating Activity+', i),
            "investingCFCr": get_val_at(cf_data, 'Cash from Investing Activity+', i),
            "financingCFCr": get_val_at(cf_data, 'Cash from Financing Activity+', i),
            "netCashFlowCr": get_val_at(cf_data, 'Net Cash Flow', i),
            "freeCashFlowCr": get_val_at(cf_data, 'Free Cash Flow', i),
            "cfoToOpPct": get_pct_at(cf_data, 'CFO/OP', i),
            # Ratios
            "debtorDays": get_val_at(ratio_data, 'Debtor Days', i),
            "inventoryDays": get_val_at(ratio_data, 'Inventory Days', i),
            "daysPayable": get_val_at(ratio_data, 'Days Payable', i),
            "cashConversionCycle": get_val_at(ratio_data, 'Cash Conversion Cycle', i),
            "workingCapitalDays": get_val_at(ratio_data, 'Working Capital Days', i),
            "rocePct": get_pct_at(ratio_data, 'ROCE %', i),
        }
        if any(v is not None for v in entry.values()):
            history.append(entry)

    return {
        "ticker": ticker,
        "name": company_name,
        "sector": sector,
        "reportingType": classify_reporting_type(sector),
        "fiscalYears": fiscal_years,
        "history": history,
    }

# ── Main collection ──────────────────────────────────────────────────────────

def collect_one(ticker):
    try:
        st = SCREENER_TICKER_MAP.get(ticker, ticker)
        result = parse_financials(st)
        if result:
            result['ticker'] = ticker
            return result
        return None
    except Exception as e:
        print(f"  ✗ {ticker:15s} error: {str(e)[:60]}")
        return None

def build_source_pack(companies, slug, output_dir):
    """Fetch screener.in data for all companies and write source-pack files."""
    os.makedirs(output_dir, exist_ok=True)

    tickers = [c["symbol"] for c in companies]
    print(f"\n  Scraping screener.in ({slug}, {len(tickers)} companies)...")

    results = []
    errors = 0
    start = time.time()

    with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as ex:
        fut_map = {ex.submit(collect_one, t): t for t in tickers}
        done = 0
        for fut in as_completed(fut_map):
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

    if not results:
        print("  WARNING: No data collected for this index")
        return

    results.sort(key=lambda x: x['ticker'])

    all_fys = set()
    for r in results:
        for fy in r['fiscalYears']:
            if fy.startswith('FY'):
                all_fys.add(fy)
    all_fys = sorted(all_fys)

    now = datetime.now(timezone.utc)
    timestamp = now.isoformat()

    # Map company data
    company_map = {c["symbol"]: c for c in companies}

    # constituents.json
    constituents = []
    for r in results:
        c = company_map.get(r["ticker"], {})
        constituents.append({
            "symbol": r["ticker"],
            "name": r["name"],
            "sector": r["sector"],
            "industry": r["sector"],
            "reportingType": r["reportingType"],
            "listingExchange": "NSE",
            "source": "screener-in",
        })
    const_json = {
        "generatedAt": timestamp,
        "asOfDate": now.strftime("%Y-%m-%d"),
        "source": "real",
        "sourcePolicy": "screener-in",
        "schemaVersion": 3,
        "fiscalYears": all_fys,
        "sourceName": f"NSE {slug} (via screener.in)",
        "downloadedAt": timestamp,
        "constituents": constituents,
    }
    with open(os.path.join(output_dir, "constituents.json"), "w", encoding="utf-8") as f:
        json.dump(const_json, f, indent=2)
    print(f"  ✓ constituents.json ({len(constituents)} companies)")

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
    fin_json = {"generatedAt": timestamp, "rows": fin_rows, "sourceName": "Screener.in",
                "downloadedAt": timestamp, "licenseBasis": "publicly_available_via_screener_in",
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
        json.dump({"generatedAt": timestamp, "rows": bs_rows}, f, indent=2)
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
        json.dump({"generatedAt": timestamp, "rows": cf_rows}, f, indent=2)
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
        json.dump({"generatedAt": timestamp, "rows": ratio_rows}, f, indent=2)
    print(f"  ✓ company_ratios.json ({len(ratio_rows)} rows)")

    # market_data.json
    mkt_rows = []
    for r in results:
        h = r['history'][-1] if r['history'] else {}
        fy = r['fiscalYears'][-1] if r['fiscalYears'] else None
        if fy:
            mkt_rows.append({
                "symbol": r['ticker'], "name": r['name'],
                "reportingType": r['reportingType'],
                "fiscalYear": fy,
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
                "dataEndFy": fy,
                "yearsOfData": len(r['history']),
                "marketCapCr": None, "stockPe": None,
                "bookValue": None, "dividendYieldPct": None, "currentPrice": None,
            })
    with open(os.path.join(output_dir, "market_data.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": timestamp, "rows": mkt_rows, "sourceName": "Screener.in"}, f, indent=2)
    print(f"  ✓ market_data.json ({len(mkt_rows)} rows)")

    print(f"  Fiscal years: {all_fys[0] if all_fys else 'N/A'} to {all_fys[-1] if all_fys else 'N/A'} ({len(all_fys)})")

def main():
    print("=" * 70)
    print("Nifty 750 — Screener.in Data Collector")
    print(f"  Workers:   {PARALLEL_WORKERS}")
    print(f"  Source:    {SOURCE_BASE}")
    print("=" * 70)

    # Fetch NSE constituents
    print("\n[1/3] Fetching NSE index constituents...")
    index_data = {}
    for slug, name in NIFTY_INDICES.items():
        print(f"  {name}...")
        comps = fetch_constituents(name)
        index_data[slug] = comps
        print(f"    {len(comps)} constituents")

    # Collect screener.in data per index
    print("\n[2/3] Collecting financial data from screener.in...")
    for slug in NIFTY_INDICES:
        output_slug = INDEX_SLUG_MAP[slug]
        output_dir = os.path.join(SOURCE_BASE, output_slug, "source-pack")
        build_source_pack(index_data[slug], output_slug, output_dir)

    print("\n[3/3] All done!")
    print("=" * 70)

if __name__ == "__main__":
    main()
