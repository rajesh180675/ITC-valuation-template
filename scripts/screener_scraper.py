#!/usr/bin/env python3
"""
Screener.in Financial Data Scraper — v2
Extracts P&L, BS, CF from screener.in, outputs AnnualReportDataFile JSON.
Handles per-year KPIs, correct fiscal year mapping, all field aliases.

Usage:
  python scripts/screener_scraper.py --ticker ITC     # Single company
  python scripts/screener_scraper.py --batch nifty50   # All 50
"""
import re, json, os, sys, time, requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "ar")
os.makedirs(OUTPUT_DIR, exist_ok=True)

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
RATE_LIMIT_DELAY = 3.5
TIMEOUT = 45

NIFTY50 = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL',
    'BAJFINANCE', 'KOTAKBANK', 'LT', 'HCLTECH', 'AXISBANK', 'MARUTI', 'ITC',
    'TITAN', 'ONGC', 'NTPC', 'POWERGRID', 'ULTRACEMCO', 'ASIANPAINT', 'M&M',
    'SUNPHARMA', 'BAJAJFINSV', 'HINDUNILVR', 'TATAMOTORS', 'NESTLEIND',
    'ADANIENT', 'ADANIPORTS', 'JSWSTEEL', 'COALINDIA', 'GRASIM', 'BRITANNIA',
    'DIVISLAB', 'DRREDDY', 'APOLLOHOSP', 'WIPRO', 'TECHM', 'BAJAJ-AUTO',
    'EICHERMOT', 'INDUSINDBK', 'HEROMOTOCO', 'CIPLA', 'BEL', 'IOC', 'HAL',
    'BPCL', 'TRENT', 'SHRIRAMFIN', 'BAJAJHLDNG', 'LTIM',
]


def parse_num(s):
    if not s: return None
    s = re.sub(r'[^\d.,\-]', '', s).strip()
    if not s: return None
    s = s.replace(',', '')
    try: return float(s)
    except: return None


def header_to_fy(h):
    m = re.search(r'(\d{4})', h)
    if m: return f'FY{m.group(1)}'
    return h


def parse_table(table):
    if not table: return None
    headers = []
    for th in table.find_all('th'):
        h = th.get_text(strip=True)
        if h and h != 'Properties':
            headers.append(h)
    header_fys = [header_to_fy(h) for h in headers]

    data = defaultdict(dict)
    all_fys = set()
    for tr in table.find_all('tr'):
        tds = tr.find_all('td')
        if not tds: continue
        label = tds[0].get_text(strip=True)
        if not label: continue
        for i, td in enumerate(tds[1:]):
            if i >= len(header_fys): continue
            fy = header_fys[i]
            val = parse_num(td.get_text(strip=True))
            if val is not None:
                data[fy][label] = val
                all_fys.add(fy)

    label_values = defaultdict(dict)
    for fy, labels in data.items():
        for label, val in labels.items():
            label_values[label][fy] = val

    return {
        'data': dict(data),
        'label_values': dict(label_values),
        'fys': sorted([fy for fy in all_fys if fy != 'TTM']),
    }


def fetch_page(ticker):
    url = f'https://www.screener.in/company/{ticker}/consolidated/'
    for attempt in range(3):
        try:
            r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code == 429:
                wait = 60 * (attempt + 1)
                print(f'  429! Cooling {wait}s...')
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.text
        except requests.exceptions.HTTPError as e:
            if attempt < 2:
                time.sleep(10 * (attempt + 1))
                continue
            raise
    raise Exception(f'Failed after 3 attempts')


def extract_tables(html):
    soup = BeautifulSoup(html, 'lxml')
    tables = {}
    for name, pattern in [('profitLoss', r'Profit\s*[&]\s*Loss'),
                          ('balanceSheet', r'Balance\s*Sheet'),
                          ('cashFlow', r'Cash\s*Flows?')]:
        h2 = soup.find('h2', string=re.compile(pattern, re.I))
        if h2:
            tbl = h2.find_next('table', class_='data-table')
            parsed = parse_table(tbl)
            if parsed and parsed['fys']:
                tables[name] = parsed
    return tables


def extract_kpis(tables):
    kpis = defaultdict(dict)
    equity_parts = defaultdict(lambda: {'capital': None, 'reserves': None})

    label_to_kpi = {
        'sales+': 'revenueCr', 'sales ': 'revenueCr',
        'total revenue': 'revenueCr', 'total income': 'totalIncomeCr',
        'net interest income': 'revenueCr',  # Banks
        'interest income': 'revenueCr',      # Banks
        'expenses+': 'totalExpensesCr', 'operating profit': 'operatingProfitCr',
        'other income+': 'otherIncomeCr',
        'interest': 'financeCostCr', 'depreciation': 'depreciationCr',
        'profit before tax': 'pbtCr',
        'net profit+': 'patCr', 'net profit ': 'patCr',
        'exceptional': 'exceptionalCr', 'eps in rs': 'epsRs',
        'equity capital': None, 'reserves': None,
        'total shareholders funds': 'equityCr', 'total equity': 'equityCr',
        'shareholders funds': 'equityCr',
        'total liabilities': 'totalAssetsCr', 'total assets': 'totalAssetsCr',
        'borrowings+': 'borrowingsCr', 'fixed assets+': 'fixedAssetsCr',
        'investments': 'investmentsCr',
        'cash from operating activity+': 'cfoCr',
        'cash from operating activity ': 'cfoCr',
        'net cash from operating': 'cfoCr',
        'net cash generated from operations': 'cfoCr',
        'cash from investing activity+': 'cfiCr',
        'cash from investing activity ': 'cfiCr',
        'net cash from investing': 'cfiCr',
        'net cash used in investing': 'cfiCr',
        'cash from financing activity+': 'cffCr',
        'cash from financing activity ': 'cffCr',
        'net cash from financing': 'cffCr',
        'net cash used in financing': 'cffCr',
        'net cash flow': 'netChangeCr', 'net increase': 'netChangeCr',
        'opening cash': 'openingCashCr', 'closing cash': 'closingCashCr',
        'free cash flow': 'fcfCr', 'dividend': 'dividendCr',
        'dividend payout': None,
    }

    for stmt_type, parsed in tables.items():
        for label, fy_vals in parsed['label_values'].items():
            label_lower = label.lower().strip()
            for key, kpi_name in label_to_kpi.items():
                if key in label_lower:
                    if kpi_name is None:
                        if 'equity capital' in label_lower:
                            for fy, val in fy_vals.items():
                                equity_parts[fy]['capital'] = val
                        elif label_lower == 'reserves' or label_lower.startswith('reserves '):
                            for fy, val in fy_vals.items():
                                equity_parts[fy]['reserves'] = val
                        break
                    for fy, val in fy_vals.items():
                        if kpi_name not in kpis[fy] or kpis[fy][kpi_name] is None:
                            kpis[fy][kpi_name] = val
                    break

    for fy, parts in equity_parts.items():
        cap, res = parts.get('capital'), parts.get('reserves')
        if cap is not None and res is not None:
            kpis[fy]['equityCr'] = round(cap + res, 2)

    for fy in kpis:
        cfo = kpis[fy].get('cfoCr')
        cfi = kpis[fy].get('cfiCr')
        if cfo is not None and cfi is not None and 'fcfCr' not in kpis[fy]:
            kpis[fy]['fcfCr'] = round(cfo + cfi, 2)

    return dict(kpis)


def build_year_data(tables, kpis):
    all_fys = set()
    for t in tables.values():
        all_fys.update(t['fys'])
    current_year = datetime.now().year
    fiscal_fys = sorted([fy for fy in all_fys if fy.replace('FY', '').isdigit()
                         and int(fy.replace('FY', '')) <= current_year])

    year_data = {}
    for fy in fiscal_fys:
        year_data[fy] = {
            'profitLoss': {'kpIs': kpis.get(fy, {}), 'items': [
                {'label': l, 'current': v} for l, v in tables.get('profitLoss', {}).get('data', {}).get(fy, {}).items()
            ]},
            'balanceSheet': {'kpIs': kpis.get(fy, {}), 'items': [
                {'label': l, 'current': v} for l, v in tables.get('balanceSheet', {}).get('data', {}).get(fy, {}).items()
            ]},
            'cashFlow': {'kpIs': kpis.get(fy, {}), 'items': [
                {'label': l, 'current': v} for l, v in tables.get('cashFlow', {}).get('data', {}).get(fy, {}).items()
            ]},
        }
    return year_data


def scrape_ticker(ticker):
    print(f'\n=== {ticker} ===')
    try:
        html = fetch_page(ticker)
    except Exception as e:
        print(f'  FAIL: {e}')
        return False

    tables = extract_tables(html)
    if not tables:
        print(f'  FAIL: No financial tables found')
        return False

    for tn in tables:
        t = tables[tn]
        print(f'  {tn}: {len(t["fys"])} years ({t["fys"][0]}–{t["fys"][-1]}), {len(t["label_values"])} rows')

    kpis = extract_kpis(tables)
    print(f'  KPIs extracted: {len(kpis)} years')
    latest = list(kpis.items())[-1][1]
    sample = {k: v for k, v in latest.items() if v is not None}
    print(f'  Latest KPIs ({len(sample)}): {json.dumps(sample, indent=2)}')

    year_data = build_year_data(tables, kpis)
    output = {
        'ticker': ticker,
        'years': year_data,
        'metadata': {
            'schemaVersion': 2,
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'source': f'screener.in/{ticker}/consolidated',
            'yearsCovered': list(year_data.keys()),
        }
    }

    path = os.path.join(OUTPUT_DIR, f'{ticker}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f'  Saved: {path} ({len(year_data)} years)')
    return True


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--ticker')
    parser.add_argument('--batch', choices=['test', 'nifty50'])
    args = parser.parse_args()

    if args.batch == 'test':
        tickers = ['ITC', 'TCS', 'HDFCBANK']
    elif args.batch == 'nifty50':
        tickers = NIFTY50
    elif args.ticker:
        tickers = [args.ticker]
    else:
        parser.print_help()
        sys.exit(1)

    success = fail = 0
    for ticker in tickers:
        if scrape_ticker(ticker):
            success += 1
        else:
            fail += 1
        time.sleep(RATE_LIMIT_DELAY)

    print(f'\nDone. {success} succeeded, {fail} failed.')
