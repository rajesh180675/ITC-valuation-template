#!/usr/bin/env python3
"""
Screener.in Schedule Scraper — for single-column (JS-interactive) format.
Extracts financial data via the schedules API using a session cookie.

Usage:
  # From a logged-in browser, copy the sessionid cookie value and pass it:
  python scripts/scraper_schedule.py --ticker SBILIFE --cookie "sessionid=abc123"
  python scripts/scraper_schedule.py --batch missing --cookie "sessionid=abc123"

  # Or if you have cookies.txt (Netscape format):
  python scripts/scraper_schedule.py --batch missing --cookies cookies.txt
"""
import re, json, os, sys, time, requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "ar")
os.makedirs(OUTPUT_DIR, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'X-Requested-With': 'XMLHttpRequest',
}

RATE_LIMIT_DELAY = 3.5
TIMEOUT = 45

# ── Helpers ───────────────────────────────────────────────────────────────────
def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def parse_num(s):
    if not s: return None
    s = re.sub(r'[^\d.,\-]', '', s).strip()
    if not s: return None
    s = s.replace(',', '')
    try: return float(s)
    except: return None

def get_company_id(ticker, session):
    """Get screener.in internal company ID from the page HTML."""
    for suffix in ['/consolidated/', '/']:
        try:
            r = session.get(f'https://www.screener.in/company/{ticker}{suffix}', headers=HEADERS, timeout=30)
            m = re.search(r'company/(\d+)', r.text)
            if m: 
                tid = m.group(1)
                # Also determine if consolidated data exists
                is_consolidated = '/consolidated/' in r.url or 'consolidated' in r.text[:2000]
                return tid, is_consolidated
        except:
            continue
    return None, False

def fetch_schedules(session, company_id, company_ticker, sections=None):
    """Fetch ALL schedule line items via the API for each parent row."""
    if sections is None:
        sections = ['profit-loss', 'balance-sheet', 'cash-flow']
    
    # First, get the main page to find which parent rows exist
    html = session.get(f'https://www.screener.in/company/{company_ticker}/consolidated/', 
                       headers=HEADERS, timeout=30).text
    soup = BeautifulSoup(html, 'lxml')
    
    all_data = {}  # section -> {fy -> {label: value}}
    parent_rows = {}  # section -> [parent names]
    
    for section in sections:
        pattern_map = {
            'profit-loss': r'Profit\s*[&]\s*Loss',
            'balance-sheet': r'Balance\s*Sheet',
            'cash-flow': r'Cash\s*Flows?',
        }
        h2 = soup.find('h2', string=re.compile(pattern_map[section], re.I))
        if not h2: continue
        
        tbl = h2.find_next('table', class_=re.compile(r'data-table'))
        if not tbl: continue
        
        # Extract parent row names from the single-column table
        parents = []
        for tr in tbl.find_all('tr'):
            tds = tr.find_all('td')
            if tds:
                label = tds[0].get_text(strip=True)
                if label:
                    parents.append(label)
        parent_rows[section] = parents
        
        # Now fetch schedule for each parent
        fy_data = defaultdict(dict)
        for parent in parents:
            data = {
                'companyId': int(company_id),
                'parent': parent,
                'section': section,
                'consolidated': '',
            }
            try:
                r = session.post(
                    f'https://www.screener.in/api/company/{company_id}/schedules/',
                    headers={**HEADERS, 'Content-Type': 'application/json'},
                    json=data,
                    timeout=30,
                )
                if r.status_code == 200:
                    rows = r.json()
                    if isinstance(rows, list):
                        for row in rows:
                            # Typical row: {"fy": "Mar 2015", "amount": 12345.67, "label": "..."}
                            fy = row.get('fy', '')
                            amount = row.get('amount')
                            label = row.get('label', parent)
                            if fy and amount is not None:
                                fy_key = f'FY{fy.split()[-1]}' if fy.split()[-1].isdigit() else fy
                                fy_data[fy_key][label] = amount
                elif r.status_code == 403:
                    log(f'  API 403 for {parent}/{section} — need valid session cookie')
                    return None  # Auth failure
                else:
                    log(f'  API {r.status_code} for {parent}/{section}')
            except Exception as e:
                log(f'  Error fetching {parent}/{section}: {e}')
            
            time.sleep(0.5)  # Polite delay between API calls
        
        all_data[section] = dict(fy_data)
    
    return all_data

def build_output(ticker, schedule_data):
    """Convert schedule data to the standard AR output format."""
    if not schedule_data:
        return None
    
    all_fys = set()
    for section_data in schedule_data.values():
        all_fys.update(section_data.keys())
    
    fiscal_fys = sorted([fy for fy in all_fys if fy.startswith('FY') and fy[2:].isdigit()])
    
    year_data = {}
    for fy in fiscal_fys:
        year_data[fy] = {
            'profitLoss': {'kpIs': {}, 'items': []},
            'balanceSheet': {'kpIs': {}, 'items': []},
            'cashFlow': {'kpIs': {}, 'items': []},
        }
        
        for section, sname in [('profit-loss', 'profitLoss'), ('balance-sheet', 'balanceSheet'), ('cash-flow', 'cashFlow')]:
            if section in schedule_data and fy in schedule_data[section]:
                items = schedule_data[section][fy]
                # Build items array
                item_list = [{'label': k, 'current': v} for k, v in items.items()]
                year_data[fy][sname] = {'kpIs': {}, 'items': item_list}
    
    return {
        'ticker': ticker,
        'years': year_data,
        'metadata': {
            'schemaVersion': 2,
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'source': f'screener.in/{ticker}/consolidated (schedule API)',
            'yearsCovered': list(year_data.keys()),
        }
    }

def scrape_via_api(ticker, session):
    """Full scrape pipeline for a single ticker using API."""
    log(f'{ticker}: getting company ID...')
    cid, is_consolidated = get_company_id(ticker, session)
    if not cid:
        log(f'  FAIL: Could not find company ID')
        return {'ticker': ticker, 'ok': False, 'error': 'No company ID'}
    
    log(f'  Company ID: {cid}, consolidated: {is_consolidated}')
    log(f'  Fetching schedules...')
    
    schedule_data = fetch_schedules(session, cid, ticker)
    if schedule_data is None:
        return {'ticker': ticker, 'ok': False, 'error': 'API 403 — need session cookie'}
    
    output = build_output(ticker, schedule_data)
    if not output:
        return {'ticker': ticker, 'ok': False, 'error': 'No data extracted'}
    
    # Save output
    path = os.path.join(OUTPUT_DIR, f'{ticker}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    years = len(output['years'])
    fy_range = f'{list(output["years"].keys())[0]}-{list(output["years"].keys())[-1]}' if output['years'] else 'none'
    log(f'  Saved: {path} ({years} years, {fy_range})')
    
    return {'ticker': ticker, 'ok': True, 'years': years, 'fy_range': fy_range}


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--ticker', help='Single ticker to scrape')
    parser.add_argument('--batch', choices=['missing'], help='Scrape all 53 missing companies')
    parser.add_argument('--cookie', help='Session cookie value (e.g. "sessionid=abc123...")')
    parser.add_argument('--cookies', help='Path to Netscape-format cookies.txt')
    args = parser.parse_args()
    
    if not args.cookie and not args.cookies:
        parser.print_help()
        print('\nERROR: Either --cookie or --cookies is required')
        sys.exit(1)
    
    # Build session with cookies
    session = requests.Session()
    if args.cookie:
        for cookie_pair in args.cookie.split(';'):
            if '=' in cookie_pair:
                k, v = cookie_pair.strip().split('=', 1)
                session.cookies.set(k, v)
    elif args.cookies:
        import http.cookiejar
        cj = http.cookiejar.MozillaCookieJar(args.cookies)
        cj.load()
        session.cookies.update(cj)
    
    # Get tickers
    if args.ticker:
        tickers = [args.ticker]
    elif args.batch == 'missing':
        manifest = json.load(open(os.path.join(ROOT, 'public', 'data', 'ar', 'company_index.json'), 'r'))
        tickers = [c['ticker'] for c in manifest['companies'] if not c.get('hasAr')]
        log(f'Loaded {len(tickers)} missing tickers')
    else:
        tickers = []
    
    if not tickers:
        log('Nothing to scrape.')
        return
    
    success = fail = 0
    for i, ticker in enumerate(tickers):
        pct = f'{(i+1)/len(tickers)*100:.0f}%'
        log(f'[{i+1}/{len(tickers)}] ({pct}) {ticker}...')
        result = scrape_via_api(ticker, session)
        if result.get('ok'):
            success += 1
        else:
            fail += 1
            log(f'  FAIL: {result.get("error","?")}')
        if i < len(tickers) - 1:
            time.sleep(RATE_LIMIT_DELAY)
    
    log(f'\nDone. {success} OK, {fail} FAIL')
    
    # Rebuild manifest
    if success > 0:
        log('Rebuilding manifest...')
        from build_company_manifest import build_manifest
        m = build_manifest()
        with_ar = sum(1 for c in m['companies'] if c.get('hasAr'))
        log(f'Coverage: {with_ar}/{len(m["companies"])} with AR data')


if __name__ == '__main__':
    main()
