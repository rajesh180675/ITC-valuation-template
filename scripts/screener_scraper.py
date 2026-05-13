#!/usr/bin/env python3
"""
Screener.in Financial Data Scraper — v3
Extracts P&L, BS, CF from screener.in, outputs AnnualReportDataFile JSON.
Handles per-year KPIs, correct fiscal year mapping, all field aliases.
Supports parallel workers, resume, and Nifty 750 batch mode.

Usage:
  python scripts/screener_scraper.py --ticker ITC           # Single
  python scripts/screener_scraper.py --batch nifty50         # Nifty 50
  python scripts/screener_scraper.py --batch nifty750        # All ~750
  python scripts/screener_scraper.py --batch nifty750 --workers 4 --resume
"""
import re, json, os, sys, time, requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "ar")
os.makedirs(OUTPUT_DIR, exist_ok=True)

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
RATE_LIMIT_DELAY = 3.5
TIMEOUT = 60
MAX_WORKERS = 3

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

# ── Logging ──────────────────────────────────────────────────────────────────
def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

# ── Parsing ───────────────────────────────────────────────────────────────────
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

# ── Fetching ──────────────────────────────────────────────────────────────────
def fetch_page(ticker, attempt=0):
    url = f'https://www.screener.in/company/{ticker}/consolidated/'
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 429:
            wait = 60 * (attempt + 1)
            log(f'  {ticker}: 429! Cooling {wait}s...')
            time.sleep(wait)
            if attempt < 3:
                return fetch_page(ticker, attempt + 1)
            return None, '429 after retries'
        r.raise_for_status()
        return r.text, None
    except requests.exceptions.HTTPError as e:
        # If consolidated page 404s, try standalone page
        if e.response is not None and e.response.status_code == 404 and attempt == 0:
            standalone_url = f'https://www.screener.in/company/{ticker}/'
            log(f'  {ticker}: consolidated 404, trying standalone...')
            try:
                r = requests.get(standalone_url, headers=HEADERS, timeout=TIMEOUT)
                if r.status_code == 429:
                    return None, '429'
                r.raise_for_status()
                return r.text, None
            except Exception as e2:
                return None, str(e2)[:100]
        if attempt < 3:
            time.sleep(10 * (attempt + 1))
            return fetch_page(ticker, attempt + 1)
        return None, str(e)[:100]
    except requests.exceptions.ConnectionError as e:
        if attempt < 2:
            log(f'  {ticker}: connection error, retrying in 30s...')
            time.sleep(30)
            return fetch_page(ticker, attempt + 1)
        return None, str(e)[:100]
    except Exception as e:
        return None, str(e)[:100]

# ── Extraction ────────────────────────────────────────────────────────────────
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

# ── Single ticker ─────────────────────────────────────────────────────────────
def scrape_ticker(ticker):
    try:
        html, err = fetch_page(ticker)
        if err:
            return {'ticker': ticker, 'ok': False, 'error': err}

        tables = extract_tables(html)
        if not tables:
            return {'ticker': ticker, 'ok': False, 'error': 'No financial tables found'}

        kpis = extract_kpis(tables)
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

        # Summary stats
        latest_kpis = list(kpis.values())[-1] if kpis else {}
        fields = [k for k, v in latest_kpis.items() if v is not None]
        return {
            'ticker': ticker, 'ok': True,
            'years': len(year_data),
            'fields': len(fields),
            'fy_range': f'{list(year_data.keys())[0]}-{list(year_data.keys())[-1]}' if year_data else 'none',
            'pl_rows': len(tables.get('profitLoss', {}).get('label_values', {})),
            'bs_rows': len(tables.get('balanceSheet', {}).get('label_values', {})),
            'cf_rows': len(tables.get('cashFlow', {}).get('label_values', {})),
        }
    except Exception as e:
        return {'ticker': ticker, 'ok': False, 'error': str(e)[:100]}

# ── Batch runs ────────────────────────────────────────────────────────────────
def batch_tickers(tickers, workers=1, resume=False):
    if resume:
        existing = set(f.replace('.json', '') for f in os.listdir(OUTPUT_DIR) if f.endswith('.json'))
        to_scrape = [t for t in tickers if t not in existing]
        skipped = len(tickers) - len(to_scrape)
        if skipped:
            log(f'Resume mode: skipping {skipped} already scraped')
        tickers = to_scrape
    else:
        skipped = 0

    if not tickers:
        log('Nothing to scrape.')
        return {'success': 0, 'fail': 0, 'skipped': skipped}

    log(f'Scraping {len(tickers)} tickers with {workers} workers...')
    start_time = time.time()
    results = {'success': 0, 'fail': 0, 'skipped': skipped, 'details': []}

    if workers <= 1:
        # Sequential (with delay)
        for i, ticker in enumerate(tickers):
            pct = f'{(i+1)/len(tickers)*100:.0f}%'
            log(f'[{i+1}/{len(tickers)}] ({pct}) {ticker}...')
            r = scrape_ticker(ticker)
            results['details'].append(r)
            if r['ok']:
                results['success'] += 1
            else:
                results['fail'] += 1
                log(f'  FAIL: {ticker} - {r.get("error","?")}')
            if i < len(tickers) - 1:
                time.sleep(RATE_LIMIT_DELAY)
    else:
        # Parallel with per-worker rate limiting
        done_count = 0
        lock = __import__('threading').Lock()

        def worker_fn(ticker):
            nonlocal done_count
            r = scrape_ticker(ticker)
            with lock:
                done_count += 1
                pct = f'{done_count/len(tickers)*100:.0f}%'
                status = 'OK' if r['ok'] else 'FAIL'
                detail = f'  {r.get("years","?")}y {r.get("fields","?")}f' if r['ok'] else f'  {r.get("error","?")}'
                log(f'[{done_count}/{len(tickers)}] ({pct}) {status} {ticker}{detail}')
            time.sleep(RATE_LIMIT_DELAY)
            return r

        with ThreadPoolExecutor(max_workers=workers) as ex:
            fut_map = {ex.submit(worker_fn, t): t for t in tickers}
            for fut in as_completed(fut_map):
                try:
                    r = fut.result()
                    results['details'].append(r)
                    if r['ok']:
                        results['success'] += 1
                    else:
                        results['fail'] += 1
                except Exception as e:
                    ticker = fut_map[fut]
                    results['fail'] += 1
                    results['details'].append({'ticker': ticker, 'ok': False, 'error': str(e)[:100]})

    elapsed = time.time() - start_time
    results['elapsed'] = elapsed
    results['rate'] = f'{len(tickers)/elapsed:.1f} tickers/min'
    log(f'Done. {results["success"]} OK, {results["fail"]} FAIL, {results["skipped"]} skipped in {elapsed/60:.1f}min ({results["rate"]})')
    return results

def load_nifty750_tickers():
    """Load all unique tickers from nifty750_real.json"""
    path = os.path.join(ROOT, 'public', 'data', 'nifty750_real.json')
    if not os.path.exists(path):
        log(f'ERROR: {path} not found')
        return []
    d = json.load(open(path, 'r', encoding='utf-8'))
    tickers = set()
    for b in d.get('batches', []):
        for c in b.get('companies', []):
            t = c.get('ticker', c.get('id', '')).upper()
            if t:
                tickers.add(t)
    return sorted(tickers)

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--ticker')
    parser.add_argument('--batch', choices=['test', 'nifty50', 'nifty750'])
    parser.add_argument('--workers', type=int, default=1)
    parser.add_argument('--resume', action='store_true', help='Skip already-scraped tickers')
    args = parser.parse_args()

    if args.batch == 'test':
        tickers = ['ITC', 'TCS', 'HDFCBANK']
    elif args.batch == 'nifty50':
        tickers = NIFTY50
    elif args.batch == 'nifty750':
        tickers = load_nifty750_tickers()
        if not tickers:
            sys.exit(1)
        log(f'Loaded {len(tickers)} tickers from nifty750_real.json')
    elif args.ticker:
        tickers = [args.ticker]
    else:
        parser.print_help()
        sys.exit(1)

    workers = args.workers

    results = batch_tickers(tickers, workers=workers, resume=args.resume)

    # Print summary
    if results['fail'] > 0:
        log(f'FAILED tickers:')
        for r in results['details']:
            if not r.get('ok'):
                log(f'  {r["ticker"]}: {r.get("error","?")}')

    # Save report
    report = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'args': {'batch': args.batch, 'workers': workers, 'resume': args.resume},
        'total': len(tickers),
        'success': results['success'],
        'fail': results['fail'],
        'skipped': results.get('skipped', 0),
        'elapsed_seconds': results.get('elapsed', 0),
        'failures': [{'ticker': r['ticker'], 'error': r.get('error','?')}
                     for r in results.get('details', []) if not r.get('ok')],
    }
    report_path = os.path.join(ROOT, 'scripts', 'screener_scrape_report.json')
    json.dump(report, open(report_path, 'w'), indent=2)
    log(f'Report saved: {report_path}')
