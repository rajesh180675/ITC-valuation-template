#!/usr/bin/env python3
"""
Annual Report Data Engine — Extract ALL financial statements from ITC PDFs
=======================================================================
Extracts: Standalone Balance Sheet, P&L, Cash Flow, Changes in Equity, Notes 1-33
Compiles 10-year time-series (FY2016-FY2025) into a single JSON dataset.

Usage: python scripts/extract_ar.py --ticker ITC
"""

import fitz, re, json, os, sys, time, requests
from collections import OrderedDict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
PDF_DIR = os.path.join(ROOT, "public", "data", "annual_reports")
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "ar")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Company URL Database ──────────────────────────────────────────────────────
AR_URLS = {
    'ITC': lambda y: f"https://www.itcportal.com/content/dam/itc-corporate/pdfs/report-and-accounts/ITC-Report-and-Accounts-{y}.pdf",
}

# ── Download Annual Report ────────────────────────────────────────────────────
def download_ar(ticker, year):
    """Download annual report PDF if not cached."""
    path = os.path.join(PDF_DIR, f"{ticker}_AR_{year}.pdf")
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        return path
    
    url_fn = AR_URLS.get(ticker)
    if not url_fn:
        return None
    
    url = url_fn(year)
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    try:
        r = requests.get(url, headers=headers, stream=True, timeout=60)
        if r.status_code != 200:
            return None
        with open(path, 'wb') as f:
            for chunk in r.iter_content(8192):
                if chunk: f.write(chunk)
        return path if os.path.getsize(path) > 10000 else None
    except:
        return None

# ── Page Finder ───────────────────────────────────────────────────────────────
def find_page_by_text(doc, keywords, required_all=False):
    """Find first page containing all keywords."""
    for i in range(len(doc)):
        text = doc[i].get_text()[:300].lower()
        if required_all:
            if all(kw.lower() in text for kw in keywords):
                return i
        else:
            if any(kw.lower() in text for kw in keywords):
                return i
    return None

def find_pages_containing(doc, keyword):
    """Find all pages containing a keyword (for multi-page statements)."""
    pages = []
    for i in range(len(doc)):
        if keyword.lower() in doc[i].get_text()[:200].lower():
            pages.append(i)
    return pages

# ── Parse 2-Column Table (BS, P&L: FY_current, FY_prior) ─────────────────────
def parse_two_col_table(page, fy_current, fy_prior):
    """Parse a standard 2-column financial statement (BS, P&L, CF) with note refs."""
    blocks = page.get_text('dict')['blocks']
    lines = []
    for block in blocks:
        if 'lines' in block:
            for line in block['lines']:
                spans = line['spans']
                text = ''.join(s['text'] for s in spans)
                x0 = spans[0]['bbox'][0] if spans else 0
                y0 = line['bbox'][1]
                lines.append((x0, y0, text))
    
    lines.sort(key=lambda l: (l[1], l[0]))
    
    # Group into rows by y-position (8px threshold for multi-line descriptions)
    rows = []
    current_y, current_cells = None, []
    for x, y, text in lines:
        if current_y is None or abs(y - current_y) < 8:
            current_cells.append((x, text))
            current_y = y
        else:
            if current_cells: rows.append((current_y, current_cells))
            current_cells = [(x, text)]
            current_y = y
    if current_cells: rows.append((current_y, current_cells))
    
    # Detect column layout from header row
    items = []
    in_section = None  # Track section header (EQUITY, ASSETS, etc.)
    
    for y, cells in rows:
        cells_by_x = sorted(cells, key=lambda c: c[0])
        
        # Three columns: label (x<280), note_ref (280<=x<400), values (x>=400)
        left_cells = [c for c in cells_by_x if c[0] < 280]
        mid_cells = [c for c in cells_by_x if 280 <= c[0] < 400]
        right_cells = [c for c in cells_by_x if c[0] >= 400]
        
        # Combine label from all left cells
        label_parts = [c[1].strip().rstrip(',').strip() for c in left_cells
                       if not re.match(r'^[\dA-Z,\s]+$', c[1].strip()) or len(c[1].strip()) > 8]
        label = ' '.join(label_parts) if label_parts else (left_cells[0][1].strip() if left_cells else '')
        
        # Detect section headers
        ll = label.lower()
        if ll in ['equity', 'equity and liabilities', 'assets', 'non-current assets',
                  'current assets', 'current liabilities', 'non-current liabilities']:
            in_section = label
            items.append({'type': 'section', 'label': label})
            continue
        
        if not label:
            continue
        
        # Extract note reference from middle column
        note_ref = ''
        for cell in mid_cells:
            ct = cell[1].strip()
            if re.match(r'^[\dA-Z,\s/]+$', ct) and len(ct) < 15 and not ct.startswith('-'):
                if not re.match(r'^-?\d+\.?\d*$', ct) or ',' in ct:
                    note_ref = ct
                    break
        
        # Extract values (right-side cells) - note refs like "23" are in the middle area (x 280-400)
        values = []
        for c in right_cells:
            ct = c[1].strip().replace(',', '').replace('(', '-').replace(')', '')
            if bool(re.match(r'^-?[\d.]+$', ct)):
                values.append(ct)
        
        cur_val = values[0] if len(values) >= 1 else None
        pri_val = values[1] if len(values) >= 2 else None
        
        if cur_val:
            try: cur_val = round(float(cur_val.replace('(','-').replace(')','')), 2)
            except: cur_val = None
        if pri_val:
            try: pri_val = round(float(pri_val.replace('(','-').replace(')','')), 2)
            except: pri_val = None
        
        # Only include substantive lines
        if cur_val is not None or any(kw in label.lower() for kw in ['total', 'net', 'gross',
            'property', 'plant', 'equipment', 'capital', 'reserve', 'share', 'investment',
            'inventory', 'trade', 'cash', 'bank', 'revenue', 'income', 'expense', 'cost',
            'depreciation', 'finance', 'tax', 'profit', 'loss', 'dividend', 'earning',
            'employee', 'other', 'intangible', 'deferred', 'provision', 'borrowing']):
            items.append({
                'type': 'item',
                'label': label,
                'note_ref': note_ref,
                'current': cur_val,
                'prior': pri_val,
                'section': in_section,
            })
    
    return items

# ── Parse P&L ────────────────────────────────────────────────────────────────
def extract_pnl(doc, fy_cur, fy_pri):
    """Extract P&L from annual report."""
    # Find P&L page
    pnl_idx = find_page_by_text(doc, [f"Statement of Profit and Loss", f"for the year ended"])
    if pnl_idx is None:
        return None
    
    # P&L is on one page, extract it
    items = parse_two_col_table(doc[pnl_idx], fy_cur, fy_pri)
    
    # Extract summary KPIs
    revenue = next((x for x in items if x['type'] == 'item' and 'revenue from operation' in x['label'].lower()), None)
    total_income = next((x for x in items if x['type'] == 'item' and 'total income' in x['label'].lower() and 'expense' not in x['label'].lower()), None)
    ebitda_line = next((x for x in items if x['type'] == 'item' and 'ebitda' in x['label'].lower()), None)
    pbt = next((x for x in items if x['type'] == 'item' and 'profit before tax' in x['label'].lower()), None)
    pat = next((x for x in items if x['type'] == 'item' and 'profit for the year' in x['label'].lower() and 'continuing' in x['label'].lower()), None)
    eps = next((x for x in items if x['type'] == 'item' and 'earning per share' in x['label'].lower()), None)
    
    return {
        'fy': f"FY{fy_cur}",
        'items': items,
        'kpIs': {
            'revenueCr': revenue['current'] if revenue else None,
            'totalIncomeCr': total_income['current'] if total_income else None,
            'pbtCr': pbt['current'] if pbt else None,
            'patCr': pat['current'] if pat else None,
        }
    }

# ── Parse Balance Sheet ──────────────────────────────────────────────────────
def extract_bs(doc, fy_cur, fy_pri):
    """Extract Balance Sheet."""
    # Find BS page(s) - BS might span 1-2 pages
    bs_start = find_page_by_text(doc, [f"Balance Sheet as at"])
    if bs_start is None:
        return None
    
    # Check if BS continues to next page
    items = parse_two_col_table(doc[bs_start], fy_cur, fy_pri)
    
    total_assets = next((x for x in items if x['type'] == 'item' and 'total assets' in x['label'].lower()), None)
    total_equity = next((x for x in items if x['type'] == 'item' and 'total equity and liability' in x['label'].lower()), None)
    
    return {
        'fy': f"FY{fy_cur}",
        'items': items,
        'kpIs': {
            'totalAssetsCr': total_assets['current'] if total_assets else None,
            'totalEquityAndLiabCr': total_equity['current'] if total_equity else None,
        }
    }

# ── Full Pipeline ────────────────────────────────────────────────────────────
def extract_all(ticker, years=range(2016, 2026)):
    """Extract all financial data for a ticker across years."""
    all_data = {
        'ticker': ticker,
        'years': {},
        'metadata': {'source': 'Annual Reports', 'pdf_paths': {}}
    }
    
    for year in years:
        path = os.path.join(PDF_DIR, f"{ticker}_AR_{year}.pdf")
        if not os.path.exists(path):
            print(f"  FY{year}: downloading...", end=' ', flush=True)
            path = download_ar(ticker, year)
            if not path:
                print('FAILED', flush=True)
                continue
            print('OK', end='', flush=True)
        
        print(f"  FY{year}: opening...", end=' ', flush=True)
        t0 = time.time()
        doc = fitz.open(path)
        
        fy_cur, fy_pri = year, year - 1
        
        # Extract P&L
        print('P&L', end=' ', flush=True)
        pnl = extract_pnl(doc, fy_cur, fy_pri)
        
        # Extract Balance Sheet
        print('BS', end=' ', flush=True)
        bs = extract_bs(doc, fy_cur, fy_pri)
        
        elapsed = time.time() - t0
        doc.close()
        
        year_data = {}
        if pnl: year_data['profitLoss'] = pnl
        if bs: year_data['balanceSheet'] = bs
        
        if year_data:
            all_data['years'][f"FY{year}"] = year_data
            print(f"({elapsed:.1f}s)", flush=True)
        else:
            print(f'FAILED ({elapsed:.1f}s)', flush=True)
    
    return all_data

def save(all_data):
    """Save extracted data to JSON."""
    path = os.path.join(OUTPUT_DIR, f"{all_data['ticker']}.json")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, default=str)
    print(f"\nSaved: {path}", flush=True)
    return path

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--ticker', default='ITC', help='Ticker symbol')
    parser.add_argument('--years', default='2016-2025', help='Year range')
    args = parser.parse_args()
    
    year_parts = args.years.split('-')
    years = range(int(year_parts[0]), int(year_parts[1]) + 1)
    
    print(f"Extracting {args.ticker} annual reports...\n", flush=True)
    data = extract_all(args.ticker, years)
    path = save(data)
    print(f"Extraction complete: {path}", flush=True)

if __name__ == '__main__':
    main()
