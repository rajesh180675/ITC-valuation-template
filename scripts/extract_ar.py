#!/usr/bin/env python3
"""
Annual Report Data Engine — Extract ALL financial statements from PDFs
=======================================================================
Extracts: Standalone P&L, Balance Sheet, Cash Flow from annual report PDFs.
Compiles multi-year time-series.

Usage: python scripts/extract_ar.py --ticker ITC
"""

import fitz, re, json, os, sys, time, requests
from collections import OrderedDict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
PDF_DIR = os.path.join(ROOT, "public", "data", "annual_reports")
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "ar")
os.makedirs(OUTPUT_DIR, exist_ok=True)

AR_URLS = {
    'ITC': lambda y: f"https://www.itcportal.com/content/dam/itc-corporate/pdfs/report-and-accounts/ITC-Report-and-Accounts-{y}.pdf",
}

# Known tickers that can be extracted once URLs are discovered
NIFTY50_TICKERS = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'WIPRO', 'ICICIBANK',
    'SBIN', 'BHARTIARTL', 'BAJFINANCE', 'KOTAKBANK', 'LT', 'HCLTECH',
    'AXISBANK', 'MARUTI', 'ITC', 'TITAN', 'ONGC', 'NTPC', 'POWERGRID',
    'ULTRACEMCO', 'ASIANPAINT', 'M&M', 'SUNPHARMA', 'BAJAJFINSV',
    'HINDUNILVR', 'TATAMOTORS', 'NESTLEIND', 'ADANIENT', 'ADANIPORTS',
    'JSWSTEEL', 'COALINDIA', 'GRASIM', 'BRITANNIA', 'DIVISLAB',
    'DRREDDY', 'APOLLOHOSP', 'WIPRO', 'TECHM', 'BAJAJ-AUTO', 'EICHERMOT',
    'INDUSINDBK', 'HEROMOTOCO', 'CIPLA', 'BEL', 'IOC', 'HAL', 'BPCL',
    'TRENT', 'SHRIRAMFIN',
]

def discover_ar_url(ticker, year):
    """Discover annual report URL for a company using web search."""
    name_map = {
        'RELIANCE': 'Reliance+Industries', 'TCS': 'Tata+Consultancy+Services',
        'HDFCBANK': 'HDFC+Bank', 'INFY': 'Infosys', 'ICICIBANK': 'ICICI+Bank',
        'SBIN': 'SBI', 'MARUTI': 'Maruti+Suzuki', 'TITAN': 'Titan+Company',
        'LT': 'Larsen+%26+Tourbo', 'SUNPHARMA': 'Sun+Pharmaceutical',
        'HINDUNILVR': 'Hindustan+Unilever', 'TATAMOTORS': 'Tata+Motors',
        'NESTLEIND': 'Nestle+India', 'BAJAJ-AUTO': 'Bajaj+Auto',
        'EICHERMOT': 'Eicher+Motors', 'HEROMOTOCO': 'Hero+MotoCorp',
        'M&M': 'Mahindra+%26+Mahindra', 'APOLLOHOSP': 'Apollo+Hospitals',
    }
    name = name_map.get(ticker, ticker)
    query = f'{name}+annual+report+{year-1}+-{year%1000}+PDF'
    try:
        r = requests.get(f'https://www.google.com/search?q={query}+filetype%3Apdf', 
                        headers={'User-Agent': 'Mozilla/5.0'}, timeout=15)
        if r.status_code == 200:
            urls = re.findall(r'href="(https?://[^"]*\.pdf)"', r.text)
            for url in urls:
                if 'annual' in url.lower() or 'annualreport' in url.lower():
                    return url
    except:
        pass
    return None

def download_ar(ticker, year):
    path = os.path.join(PDF_DIR, f"{ticker}_AR_{year}.pdf")
    if os.path.exists(path) and os.path.getsize(path) > 10000: return path
    url_fn = AR_URLS.get(ticker)
    if not url_fn:
        url = discover_ar_url(ticker, year)
        if not url: return None
    else:
        url = url_fn(year)
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        r = requests.get(url, headers=headers, stream=True, timeout=60)
        if r.status_code != 200: return None
        with open(path, 'wb') as f:
            for chunk in r.iter_content(8192):
                if chunk: f.write(chunk)
        return path if os.path.getsize(path) > 10000 else None
    except: return None

def find_pnl_page(doc, fy_cur):
    """Find standalone P&L page robustly across all report formats."""
    for i in range(50, min(320, len(doc))):
        text = doc[i].get_text()
        tl = text.lower()
        # Must have revenue + expenses + total income (any format)
        has_rev = 'revenue from operations' in tl or 'revenue from operations*' in tl
        has_costs = 'cost of materials' in tl or 'employee benefits' in tl
        has_total = 'total income' in tl or 'total revenue' in tl
        has_numbers = len(re.findall(r'\b\d{3,}\.\d{2}\b', text)) >= 3
        if has_rev and has_costs and has_total and has_numbers:
            if 'consolidated' in tl[:400]: continue
            return i
    # Broader: just check for revenue items + lots of numbers
    for i in range(50, min(320, len(doc))):
        text = doc[i].get_text()
        tl = text.lower()
        has_rev = 'revenue from operations' in tl or 'gross revenue' in tl or 'revenue from operations*' in tl
        has_items = 'cost of materials' in tl and 'depreciation' in tl
        numbers = re.findall(r'\b\d{3,}\.\d{2}\b', text)
        if has_rev and has_items and len(numbers) >= 5:
            if 'consolidated' in tl[:400]: continue
            return i
    return None

def find_bs_page(doc):
    for i in range(50, min(320, len(doc))):
        text = doc[i].get_text()
        tl = text.lower()
        if 'balance sheet' in tl and 'as at' in tl:
            if 'consolidated' in tl[:400]: continue
            # Check for total values (either 'total assets' or just 'total' with numbers)
            has_total = 'total assets' in tl or ('total' in tl and 'equity' in tl)
            has_numbers = len(re.findall(r'\b\d{3,}\.\d{2}\b', text)) >= 3
            if has_total or has_numbers:
                return i
    return None

def find_cf_page(doc):
    for i in range(50, min(320, len(doc))):
        text = doc[i].get_text()
        tl = text.lower()
        # Must say "Cash Flow Statement" or "Statement of Cash Flows"
        if ('cash flow statement' in tl or 'statement of cash flow' in tl) and 'for the year ended' in tl:
            if 'consolidated' in tl[:400]: continue
            if 'profit before tax' in tl or 'operating activities' in tl:
                return i
    return None

def parse_statement(page, fy_cur, fy_pri):
    """Parse a 2-column financial statement with position-based extraction."""
    blocks = page.get_text('dict')['blocks']
    lines = []
    for block in blocks:
        if 'lines' in block:
            for line in block['lines']:
                spans = line['spans']
                text = ''.join(s['text'] for s in spans)
                lines.append((spans[0]['bbox'][0], line['bbox'][1], text))
    
    lines.sort(key=lambda l: (l[1], l[0]))
    
    # Group into rows
    rows = []
    cur_y, cur_cells = None, []
    for x, y, text in lines:
        if cur_y is None or abs(y - cur_y) < 8:
            cur_cells.append((x, text))
            cur_y = y
        else:
            if cur_cells: rows.append((cur_y, cur_cells))
            cur_cells = [(x, text)]
            cur_y = y
    if cur_cells: rows.append((cur_y, cur_cells))
    
    items = []
    in_section = None
    
    section_keywords = ['equity', 'equity and liabilities', 'assets', 'non-current assets',
                       'current assets', 'current liabilities', 'non-current liabilities',
                       'revenue', 'expenses', 'income']
    
    for y, cells in rows:
        cells = sorted(cells, key=lambda c: c[0])
        left = [c for c in cells if c[0] < 280]
        mid = [c for c in cells if 280 <= c[0] < 400]
        right = [c for c in cells if c[0] >= 400]
        
        label_parts = [c[1].strip().rstrip(',').strip() for c in left
                       if not re.match(r'^[\dA-Z,\s/]+$', c[1].strip()) or len(c[1].strip()) > 8]
        label = ' '.join(label_parts) if label_parts else (left[0][1].strip() if left else '')
        
        ll = label.lower()
        if any(ll.startswith(k) for k in ['equity', 'assets', 'non-current', 'current ']):
            in_section = label
            items.append({'type': 'section', 'label': label})
            continue
        
        if not label: continue
        
        # Note ref from middle
        note_ref = ''
        for c in mid:
            ct = c[1].strip()
            if re.match(r'^[\dA-Z,\s/]+$', ct) and len(ct) < 15:
                if not re.match(r'^-?\d+\.?\d*$', ct) or ',' in ct:
                    note_ref = ct
                    break
        
        # Values from right
        vals = []
        for c in right:
            ct = c[1].strip().replace(',', '').replace('(', '-').replace(')', '')
            if re.match(r'^-?[\d.]+$', ct):
                vals.append(round(float(ct), 2))
        
        cur_val = vals[0] if len(vals) >= 1 else None
        pri_val = vals[1] if len(vals) >= 2 else None
        
        if cur_val is not None:
            items.append({
                'type': 'item', 'label': label, 'note_ref': note_ref,
                'current': cur_val, 'prior': pri_val, 'section': in_section,
            })
    
    return items

def extract_kpis(items, stmt_type):
    """Extract key KPIs from parsed items."""
    kpis = {}
    if stmt_type == 'pnl':
        rev = next((i for i in items if 'revenue from operations' in i['label'].lower()), None)
        ti = next((i for i in items if 'total income' in i['label'].lower() and 'expense' not in i['label'].lower()), None)
        pbt = next((i for i in items if 'profit before tax' in i['label'].lower() and 'exceptional' not in i['label'].lower()), None)
        pat = next((i for i in items if 'profit for the year' in i['label'].lower() and 'continuing' in i['label'].lower()), None)
        pat2 = next((i for i in items if 'profit for the year' in i['label'].lower() and 'discontinued' not in i['label'].lower()), None)
        ebitda_item = next((i for i in items if 'ebitda' in i['label'].lower()), None)
        eps_item = next((i for i in items if 'earning per share' in i['label'].lower() and 'diluted' not in i['label'].lower()), None)
        kpis['revenueCr'] = rev['current'] if rev else None
        kpis['totalIncomeCr'] = ti['current'] if ti else None
        kpis['pbtCr'] = pbt['current'] if pbt else None
        kpis['patCr'] = pat['current'] if pat else pat2['current'] if pat2 else None
        kpis['ebitdaCr'] = ebitda_item['current'] if ebitda_item else None
        kpis['epsRs'] = eps_item['current'] if eps_item else None
    elif stmt_type == 'bs':
        ta = next((i for i in items if 'total assets' in i['label'].lower() and i['type'] == 'item'), None)
        tel = next((i for i in items if 'total equity and liability' in i['label'].lower() and i['type'] == 'item'), None)
        kpis['totalAssetsCr'] = ta['current'] if ta else None
        kpis['totalEquityLiabCr'] = tel['current'] if tel else None
    return kpis

def extract_all(ticker, years=range(2019, 2026)):
    """Extract all financial data for a ticker (focus on recent years first)."""
    all_data = {'ticker': ticker, 'years': {}, 'metadata': {'source': 'Annual Reports', 'pdf_paths': {}}}
    
    for year in years:
        path = os.path.join(PDF_DIR, f"{ticker}_AR_{year}.pdf")
        if not os.path.exists(path):
            path = download_ar(ticker, year)
            if not path:
                print(f"  FY{year}: download FAILED", flush=True)
                continue
        
        print(f"  FY{year}: ", end='', flush=True)
        t0 = time.time()
        try:
            doc = fitz.open(path)
        except Exception as e:
            print(f"FAILED to open PDF: {e}", flush=True)
            continue
        
        fy_cur, fy_pri = year, year - 1
        year_data = {}
        
        try:
            # P&L
            pnl_idx = find_pnl_page(doc, fy_cur)
            if pnl_idx is not None:
                items = parse_statement(doc[pnl_idx], fy_cur, fy_pri)
                kpis = extract_kpis(items, 'pnl')
                year_data['profitLoss'] = {'fy': f"FY{fy_cur}", 'items': items, 'kpIs': kpis}
                print(f"P&L(p{pnl_idx+1},{len(items)}i) ", end='', flush=True)
            else:
                print("P&L(?) ", end='', flush=True)
            
            # BS
            bs_idx = find_bs_page(doc)
            if bs_idx is not None:
                items = parse_statement(doc[bs_idx], fy_cur, fy_pri)
                kpis = extract_kpis(items, 'bs')
                year_data['balanceSheet'] = {'fy': f"FY{fy_cur}", 'items': items, 'kpIs': kpis}
                print(f"BS(p{bs_idx+1},{len(items)}i) ", end='', flush=True)
            else:
                print("BS(?) ", end='', flush=True)
            
            # CF
            cf_idx = find_cf_page(doc)
            if cf_idx is not None:
                items = parse_statement(doc[cf_idx], fy_cur, fy_pri)
                year_data['cashFlow'] = {'fy': f"FY{fy_cur}", 'items': items, 'kpIs': {}}
                print(f"CF(p{cf_idx+1},{len(items)}i)", end='', flush=True)
        except Exception as e:
            print(f"EXTRACT ERROR: {e}", end='', flush=True)
        finally:
            if year_data:
                all_data['years'][f"FY{year}"] = year_data
            doc.close()
            print(f" ({time.time()-t0:.1f}s)", flush=True)
    
    return all_data

def save(all_data):
    path = os.path.join(OUTPUT_DIR, f"{all_data['ticker']}.json")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, default=str)
    print(f"\nSaved: {path}", flush=True)
    return path

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--ticker', default='ITC')
    parser.add_argument('--years', default='2019-2025')
    args = parser.parse_args()
    parts = args.years.split('-')
    years = range(int(parts[0]), int(parts[1]) + 1)
    print(f"Extracting {args.ticker}...\n", flush=True)
    data = extract_all(args.ticker, years)
    save(data)
    print(f"Done.", flush=True)

if __name__ == '__main__':
    main()
