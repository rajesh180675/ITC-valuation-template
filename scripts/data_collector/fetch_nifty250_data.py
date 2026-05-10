#!/usr/bin/env python3
"""
Nifty 250 — Real Data Feed from Screener.in
============================================
Scrapes annual financial data from screener.in for all Nifty 250 stocks.
Extracts P&L, Balance Sheet, Cash Flow, and Ratios — all from free pages.

Outputs source-pack JSONs:
  constituents.json, financials.json, market_data.json,
  balance_sheets.json, cashflows.json, company_ratios.json

Usage:
  python scripts/data_collector/fetch_nifty250_data.py

Output → scripts/nifty250/source-pack/
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
SOURCE_DIR = os.path.join(ROOT_DIR, "scripts", "nifty250", "source-pack")
TICKER_FILE = os.path.join(SCRIPT_DIR, "nifty250_tickers.txt")
PARALLEL_WORKERS = 6
RATE_LIMIT_DELAY = 1.5  # seconds between requests per worker

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

# ── Helpers ──────────────────────────────────────────────────────────────────

def to_cr(v_str):
    """Convert a screener.in number string (e.g. '374,372' or '10.5%') to Crores."""
    if not v_str or v_str == '-' or v_str.strip() == '':
        return None
    v = v_str.strip()
    try:
        if v.endswith('%'):
            return round(float(v.replace('%', '').replace(',', '')), 2)
        return round(float(v.replace(',', '')), 2)
    except (ValueError, TypeError):
        return None

def parse_pl_value(v_str):
    """Parse P&L values — screener.in shows them in Rs. Crores."""
    if not v_str or v_str == '-' or v_str.strip() == '':
        return None
    v = v_str.strip()
    try:
        return round(float(v.replace(',', '')), 2)
    except (ValueError, TypeError):
        return None

def parse_bs_value(v_str):
    """Parse balance sheet values (already in crores) to crores."""
    if not v_str or v_str == '-' or v_str.strip() == '':
        return None
    v = v_str.strip()
    try:
        return round(float(v.replace(',', '')), 2)
    except (ValueError, TypeError):
        return None

def parse_pct_value(v_str):
    """Parse a percentage string like '38%' to float."""
    if not v_str or v_str == '-' or v_str.strip() == '':
        return None
    v = v_str.strip()
    try:
        return round(float(v.replace('%', '').replace(',', '')), 2)
    except (ValueError, TypeError):
        return None

def parse_eps(v_str):
    """Parse EPS value like '7.36' to float."""
    if not v_str or v_str == '-' or v_str.strip() == '':
        return None
    v = v_str.strip()
    try:
        return round(float(v.replace(',', '')), 2)
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

SCREENER_SECTOR_MAP = {
    'Financial Services': 'Banks',
    'Financial Svcs': 'NBFC',
}

def classify_reporting_type(sector):
    sector_lower = sector.lower() if sector else ''
    is_financial = any(kw in sector_lower for kw in FINANCIAL_KEYWORDS)
    return 'financial' if is_financial else 'nonFinancial'

# ── Screener.in scraping ─────────────────────────────────────────────────────

_fetch_cache = {}

def fetch_screener_page(ticker):
    """Fetch screener.in page for a ticker with caching.
    Tries consolidated first; falls back to standalone if no real data found."""
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
                            headers = rows[0].find_all(['th', 'td'])
                            header_texts = [h.get_text(strip=True) for h in headers[1:]]
                            has_real_headers = any(
                                bool(re.search(r'(Mar|Sep|Dec|Jun)\s+\d{4}', h))
                                for h in header_texts
                            )
                            if has_real_headers:
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
    """Extract row names and values from a screener.in data table.
    Returns dict: {row_name: [values_per_year]}"""
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
    """Extract fiscal year names from the first row of a table.
    Returns: ['FY2014', 'FY2015', ...]"""
    rows = table.find_all('tr')
    if not rows:
        return []
    header_cells = rows[0].find_all(['th', 'td'])
    years_raw = [c.get_text(strip=True) for c in header_cells[1:]]
    fiscal_years = []
    for y in years_raw:
        match = re.search(r'(?:Mar|Sep|Dec|Jun)\s+(\d{4})', y)
        if match:
            year_str = f"FY{match.group(1)}"
            # Only add if not already present (avoid duplicate years)
            if year_str not in fiscal_years:
                fiscal_years.append(year_str)
    return fiscal_years

def parse_financials(ticker):
    """
    Parse annual financial data from screener.in for a given ticker.
    Extracts P&L, Balance Sheet, Cash Flow, and Ratios from free pages.
    """
    html, suffix = fetch_screener_page(ticker)
    if not html:
        return None

    soup = BeautifulSoup(html, 'html.parser')
    tables = soup.find_all('table')

    if len(tables) < 2:
        return None

    # ── Company info ──────────────────────────────────────────────────────
    company_name_tag = soup.find('h1', class_='company-name')
    company_name = company_name_tag.get_text(strip=True) if company_name_tag else ticker

    sector_tag = soup.find('a', href=lambda x: x and '/sector/' in (x or ''))
    sector = sector_tag.get_text(strip=True) if sector_tag else 'Unknown'

    # ── P&L Table (table[1]) ──────────────────────────────────────────────
    annual_pl = tables[1]
    pl_data = extract_table_rows(annual_pl)
    fiscal_years = extract_year_headers(annual_pl)

    # ── Balance Sheet (table[6]) ──────────────────────────────────────────
    bs_data = {}
    bs_fys = []
    if len(tables) > 6:
        bs_data = extract_table_rows(tables[6])
        bs_fys = extract_year_headers(tables[6])

    # ── Cash Flow (table[7]) ──────────────────────────────────────────────
    cf_data = {}
    cf_fys = []
    if len(tables) > 7:
        cf_data = extract_table_rows(tables[7])
        cf_fys = extract_year_headers(tables[7])

    # ── Ratios (table[8]) ─────────────────────────────────────────────────
    ratio_data = {}
    ratio_fys = []
    if len(tables) > 8:
        ratio_data = extract_table_rows(tables[8])
        ratio_fys = extract_year_headers(tables[8])

    # ── Determine key P&L row names (differ between banks and non-financial) ─
    is_financial = classify_reporting_type(sector) == 'financial'

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

    # ── Build financial history array ─────────────────────────────────────
    history = []
    for i, fy in enumerate(fiscal_years):
        def pl_val(key):
            if key and i < len(pl_data.get(key, [])):
                return parse_pl_value(pl_data[key][i])
            return None

        # BS value (match by year position)
        def bs_val(key):
            if key and bs_fys:
                idx = next((j for j, bfy in enumerate(bs_fys) if bfy == fy), None)
                if idx is not None and key in bs_data and idx < len(bs_data[key]):
                    return parse_bs_value(bs_data[key][idx])
            return None

        # CF value
        def cf_val(key):
            if key and cf_fys:
                idx = next((j for j, cfy in enumerate(cf_fys) if cfy == fy), None)
                if idx is not None and key in cf_data and idx < len(cf_data[key]):
                    return parse_bs_value(cf_data[key][idx])
            return None

        # Ratio value
        def ratio_val(key):
            if key and ratio_fys:
                idx = next((j for j, rfy in enumerate(ratio_fys) if rfy == fy), None)
                if idx is not None and key in ratio_data and idx < len(ratio_data[key]):
                    return parse_pct_value(ratio_data[key][idx])
            return None

        entry = {
            "fy": fy,
            # P&L
            "toplineCr": pl_val(topline_key),
            "expensesCr": pl_val(expenses_key),
            "operatingProfitCr": pl_val(op_key),
            "opmPct": pl_val(opm_key),
            "otherIncomeCr": pl_val(other_income_key),
            "interestCr": pl_val(interest_key),
            "depreciationCr": pl_val(depr_key),
            "profitBeforeTaxCr": pl_val(pbt_key),
            "taxPct": pl_val(tax_key),
            "netProfitCr": pl_val(profit_key),
            "epsRs": pl_val(eps_key),
            "dividendPayoutPct": pl_val(dpr_key),
            # Balance Sheet
            "equityCapitalCr": bs_val('Equity Capital'),
            "reservesCr": bs_val('Reserves'),
            "borrowingsCr": bs_val('Borrowings+') if not is_financial else bs_val('Borrowing'),
            "otherLiabilitiesCr": bs_val('Other Liabilities+'),
            "totalLiabilitiesCr": bs_val('Total Liabilities'),
            "fixedAssetsCr": bs_val('Fixed Assets+'),
            "cwipCr": bs_val('CWIP'),
            "investmentsCr": bs_val('Investments'),
            "otherAssetsCr": bs_val('Other Assets+'),
            "totalAssetsCr": bs_val('Total Assets'),
            # Cash Flow
            "operatingCFCr": cf_val('Cash from Operating Activity+'),
            "investingCFCr": cf_val('Cash from Investing Activity+'),
            "financingCFCr": cf_val('Cash from Financing Activity+'),
            "netCashFlowCr": cf_val('Net Cash Flow'),
            "freeCashFlowCr": cf_val('Free Cash Flow'),
            "cfoToOpPct": cf_val('CFO/OP'),
            # Ratios
            "debtorDays": ratio_val('Debtor Days'),
            "inventoryDays": ratio_val('Inventory Days'),
            "daysPayable": ratio_val('Days Payable'),
            "cashConversionCycle": ratio_val('Cash Conversion Cycle'),
            "workingCapitalDays": ratio_val('Working Capital Days'),
            "rocePct": ratio_val('ROCE %'),
        }

        # Only include if it has at least one real value
        if any(v is not None for v in entry.values()):
            history.append(entry)

    # ── Extract ROE from sidebar ──────────────────────────────────────────
    roe = None
    roce = None
    for li in soup.find_all('li'):
        text = li.get_text(strip=True)
        spans = li.find_all('span')
        vals = [to_cr(s.get_text(strip=True)) for s in spans if s.get_text(strip=True).replace('.', '').replace('-', '').isdigit()]
        if 'ROE' in text and vals:
            roe = vals[0]
        if 'ROCE' in text and vals:
            roce = vals[0]

    # ── Extract market data from header ───────────────────────────────────
    market_cap_cr = None
    stock_pe = None
    book_value = None
    div_yield = None
    current_price = None

    for li in soup.find_all('li', class_=lambda x: x and 'flex' in x and 'space-between' in x):
        name_span = li.find('span', class_='name')
        value_span = li.find('span', class_='number')
        if not name_span or not value_span:
            continue
        name = name_span.get_text(strip=True)
        val_str = value_span.get_text(strip=True).replace(',', '')
        try:
            val = float(val_str)
        except (ValueError, TypeError):
            continue

        if 'Market Cap' in name:
            market_cap_cr = val
        elif 'Current Price' in name:
            current_price = val
        elif 'Stock P/E' in name:
            stock_pe = val
        elif 'Book Value' in name:
            book_value = val
        elif 'Dividend Yield' in name:
            div_yield = val

    return {
        "ticker": ticker,
        "name": company_name,
        "sector": sector,
        "reportingType": classify_reporting_type(sector),
        "fiscalYears": fiscal_years,
        "history": history,
        "roe": roe,
        "roce": roce,
        "latestToplineCr": history[-1]['toplineCr'] if history else None,
        "latestNetProfitCr": history[-1]['netProfitCr'] if history else None,
        "marketCapCr": market_cap_cr,
        "stockPe": stock_pe,
        "bookValue": book_value,
        "dividendYieldPct": div_yield,
        "currentPrice": current_price,
    }

# ── Main collection ──────────────────────────────────────────────────────────

def load_tickers():
    """Load tickers from the ticker file."""
    if os.path.exists(TICKER_FILE):
        with open(TICKER_FILE) as f:
            return [line.strip() for line in f if line.strip()]
    ts_path = os.path.join(ROOT_DIR, 'src', 'data', 'nifty250Data.ts')
    with open(ts_path) as f:
        content = f.read()
    tickers = re.findall(r"ticker:\s+'([^']+)'", content)
    return tickers

def collect_one(ticker):
    """Collect data for a single ticker."""
    try:
        screener_ticker = SCREENER_TICKER_MAP.get(ticker, ticker)
        result = parse_financials(screener_ticker)
        if result:
            result['ticker'] = ticker
            y, pl, bs, cf = count_extras(result)
            print(f"  ✓ {ticker:15s} ({y}y P&L:{pl} BS:{bs} CF:{cf})")
            return result
        else:
            print(f"  ✗ {ticker:15s} no data")
            return None
    except Exception as e:
        print(f"  ✗ {ticker:15s} error: {str(e)[:80]}")
        return None

def count_extras(r):
    """Count non-None P&L, BS, CF fields in the latest history entry."""
    h = r['history'][-1] if r['history'] else {}
    pl = sum(1 for k in ['toplineCr','expensesCr','operatingProfitCr','opmPct',
                         'otherIncomeCr','interestCr','depreciationCr',
                         'profitBeforeTaxCr','taxPct','netProfitCr','epsRs',
                         'dividendPayoutPct'] if h.get(k) is not None)
    bs = sum(1 for k in ['equityCapitalCr','reservesCr','borrowingsCr',
                         'totalLiabilitiesCr','fixedAssetsCr','investmentsCr',
                         'totalAssetsCr'] if h.get(k) is not None)
    cf = sum(1 for k in ['operatingCFCr','freeCashFlowCr','netCashFlowCr'] if h.get(k) is not None)
    return len(r['history']), pl, bs, cf

def main():
    print("=" * 70)
    print("Nifty 250 — Screener.in Enhanced Data Collector")
    print(f"  Workers:    {PARALLEL_WORKERS}")
    print(f"  Source:     {SOURCE_DIR}")
    print(f"  New:        Full P&L, Balance Sheet, Cash Flow, Ratios")
    print("=" * 70)

    os.makedirs(SOURCE_DIR, exist_ok=True)

    # Load tickers
    print("\n[1/4] Loading tickers...")
    tickers = load_tickers()
    print(f"  {len(tickers)} tickers loaded")

    # Collect financial data
    print(f"\n[2/4] Scraping screener.in ({len(tickers)} companies)...")
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
    print(f"  Completed: {len(results)} companies, {errors} errors in {elapsed:.0f}s")

    if len(results) == 0:
        print("  ERROR: No data collected!")
        return 1

    results.sort(key=lambda x: x['ticker'])

    # Build fiscal year set
    all_fys = set()
    for r in results:
        for fy in r['fiscalYears']:
            if fy.startswith('FY'):
                all_fys.add(fy)
    all_fys = sorted(all_fys)
    print(f"\n  Fiscal years: {all_fys[0]} to {all_fys[-1]} ({len(all_fys)} years)")

    # ── Build source-pack files ──────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    timestamp = now.isoformat()

    print(f"\n[3/4] Building source-pack files...")

    # 3a. constituents.json
    constituents = []
    sectors_map = {}
    for r in results:
        sector = SCREENER_SECTOR_MAP.get(r['sector'], r['sector'])
        constituents.append({
            "symbol": r['ticker'],
            "name": r['name'],
            "sector": sector,
            "industry": r['sector'],
            "reportingType": r['reportingType'],
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
        "sourceName": "NSE Indices (via screener.in scraping)",
        "downloadedAt": timestamp,
        "constituents": constituents,
    }
    with open(os.path.join(SOURCE_DIR, "constituents.json"), "w", encoding="utf-8") as f:
        json.dump(const_json, f, indent=2)
    print(f"  ✓ constituents.json ({len(constituents)} companies)")

    # 3b. financials.json — one row per company per year, with full P&L
    fin_rows = []
    for r in results:
        for h in r['history']:
            row = {
                "symbol": r['ticker'],
                "fiscalYear": h['fy'],
                "periodEndDate": None,
                "statementType": "consolidated",
                "sourceName": "Screener.in",
                "sourceType": "scraped_financial_data",
                "qualityFlags": [],
                # P&L
                "revenueCr": h['toplineCr'],
                "expensesCr": h['expensesCr'],
                "operatingProfitCr": h['operatingProfitCr'],
                "opmPct": h['opmPct'],
                "otherIncomeCr": h['otherIncomeCr'],
                "interestCr": h['interestCr'],
                "depreciationCr": h['depreciationCr'],
                "profitBeforeTaxCr": h['profitBeforeTaxCr'],
                "taxPct": h['taxPct'],
                "netProfitCr": h['netProfitCr'],
                "epsRs": h['epsRs'],
                "dividendPayoutPct": h['dividendPayoutPct'],
            }
            fin_rows.append(row)
    fin_json = {
        "generatedAt": timestamp,
        "rows": fin_rows,
        "sourceName": "Screener.in",
        "downloadedAt": timestamp,
        "licenseBasis": "publicly_available_via_screener_in",
        "fiscalYears": all_fys,
    }
    with open(os.path.join(SOURCE_DIR, "financials.json"), "w", encoding="utf-8") as f:
        json.dump(fin_json, f, indent=2)
    pl_count = sum(1 for r in fin_rows if r['revenueCr'] is not None)
    print(f"  ✓ financials.json ({len(fin_rows)} rows, {pl_count} with revenue, {len(all_fys)} FYs)")

    # 3c. balance_sheets.json
    bs_rows = []
    for r in results:
        for h in r['history']:
            row = {
                "symbol": r['ticker'],
                "fiscalYear": h['fy'],
                "equityCapitalCr": h['equityCapitalCr'],
                "reservesCr": h['reservesCr'],
                "borrowingsCr": h['borrowingsCr'],
                "otherLiabilitiesCr": h['otherLiabilitiesCr'],
                "totalLiabilitiesCr": h['totalLiabilitiesCr'],
                "fixedAssetsCr": h['fixedAssetsCr'],
                "cwipCr": h['cwipCr'],
                "investmentsCr": h['investmentsCr'],
                "otherAssetsCr": h['otherAssetsCr'],
                "totalAssetsCr": h['totalAssetsCr'],
            }
            bs_rows.append(row)
    bs_json = {
        "generatedAt": timestamp,
        "rows": bs_rows,
        "sourceName": "Screener.in",
        "downloadedAt": timestamp,
    }
    with open(os.path.join(SOURCE_DIR, "balance_sheets.json"), "w", encoding="utf-8") as f:
        json.dump(bs_json, f, indent=2)
    print(f"  ✓ balance_sheets.json ({len(bs_rows)} rows)")

    # 3d. cashflows.json
    cf_rows = []
    for r in results:
        for h in r['history']:
            row = {
                "symbol": r['ticker'],
                "fiscalYear": h['fy'],
                "operatingCFCr": h['operatingCFCr'],
                "investingCFCr": h['investingCFCr'],
                "financingCFCr": h['financingCFCr'],
                "netCashFlowCr": h['netCashFlowCr'],
                "freeCashFlowCr": h['freeCashFlowCr'],
                "cfoToOpPct": h['cfoToOpPct'],
            }
            cf_rows.append(row)
    cf_json = {
        "generatedAt": timestamp,
        "rows": cf_rows,
        "sourceName": "Screener.in",
        "downloadedAt": timestamp,
    }
    with open(os.path.join(SOURCE_DIR, "cashflows.json"), "w", encoding="utf-8") as f:
        json.dump(cf_json, f, indent=2)
    print(f"  ✓ cashflows.json ({len(cf_rows)} rows)")

    # 3e. company_ratios.json
    ratio_rows = []
    for r in results:
        for h in r['history']:
            row = {
                "symbol": r['ticker'],
                "fiscalYear": h['fy'],
                "debtorDays": h['debtorDays'],
                "inventoryDays": h['inventoryDays'],
                "daysPayable": h['daysPayable'],
                "cashConversionCycle": h['cashConversionCycle'],
                "workingCapitalDays": h['workingCapitalDays'],
                "rocePct": h['rocePct'],
            }
            ratio_rows.append(row)
    ratio_json = {
        "generatedAt": timestamp,
        "rows": ratio_rows,
        "sourceName": "Screener.in",
        "downloadedAt": timestamp,
    }
    with open(os.path.join(SOURCE_DIR, "company_ratios.json"), "w", encoding="utf-8") as f:
        json.dump(ratio_json, f, indent=2)
    print(f"  ✓ company_ratios.json ({len(ratio_rows)} rows)")

    # 3f. market_data.json (latest period snapshot per company)
    mkt_rows = []
    for r in results:
        latest_fy = r['fiscalYears'][-1] if r['fiscalYears'] else None
        h = r['history'][-1] if r['history'] else {}
        if latest_fy:
            mkt_rows.append({
                "symbol": r['ticker'],
                "name": r['name'],
                "reportingType": r['reportingType'],
                "fiscalYear": latest_fy,
                # P&L latest
                "latestToplineCr": r['latestToplineCr'],
                "latestNetProfitCr": r['latestNetProfitCr'],
                "latestOperatingProfitCr": h.get('operatingProfitCr'),
                "latestEpsRs": h.get('epsRs'),
                # Profitability
                "roePct": r['roe'],
                "rocePct": h.get('rocePct') or r['roce'],
                "opmPct": h.get('opmPct'),
                # BS latest
                "equityCapitalCr": h.get('equityCapitalCr'),
                "reservesCr": h.get('reservesCr'),
                "borrowingsCr": h.get('borrowingsCr'),
                "totalAssetsCr": h.get('totalAssetsCr'),
                # CF latest
                "freeCashFlowCr": h.get('freeCashFlowCr'),
                "operatingCFCr": h.get('operatingCFCr'),
                # Data range
                "dataStartFy": r['fiscalYears'][0] if r['fiscalYears'] else None,
                "dataEndFy": latest_fy,
                "yearsOfData": len(r['history']),
                # Market data
                "marketCapCr": r.get('marketCapCr'),
                "stockPe": r.get('stockPe'),
                "bookValue": r.get('bookValue'),
                "dividendYieldPct": r.get('dividendYieldPct'),
                "currentPrice": r.get('currentPrice'),
            })
    mkt_json = {
        "generatedAt": timestamp,
        "rows": mkt_rows,
        "sourceName": "Screener.in",
        "downloadedAt": timestamp,
    }
    with open(os.path.join(SOURCE_DIR, "market_data.json"), "w", encoding="utf-8") as f:
        json.dump(mkt_json, f, indent=2)
    print(f"  ✓ market_data.json ({len(mkt_rows)} rows)")

    # ── Summary ───────────────────────────────────────────────────────────────
    companies_with_data = sum(1 for r in results if len(r['history']) >= 5)
    avg_years = sum(len(r['history']) for r in results) / max(1, len(results))

    print(f"\n[4/4] Collection summary")
    print(f"  Companies collected:     {len(results)}/{len(tickers)}")
    print(f"  Companies with 5+ yrs:   {companies_with_data}")
    print(f"  Average years per co:    {avg_years:.1f}")
    print(f"  Fiscal year range:       {all_fys[0]} to {all_fys[-1]}")
    print(f"  Fields extracted:        30+ per year (P&L, BS, CF, ratios)")
    print(f"  Source-pack:             {SOURCE_DIR}")
    print(f"\n  Next: npm run generate:nifty250")
    print("=" * 70)
    return 0

if __name__ == "__main__":
    sys.exit(main())
