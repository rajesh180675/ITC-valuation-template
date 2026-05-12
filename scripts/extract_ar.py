#!/usr/bin/env python3
"""
Annual Report Data Engine — Extract ALL financial statements from PDFs
=======================================================================
Extracts: Standalone P&L, Balance Sheet, Cash Flow from annual report PDFs.
Compiles multi-year time-series.

Usage: python scripts/extract_ar.py --ticker ITC
"""

import fitz, re, json, os, sys, time, requests
from datetime import datetime, timezone
from collections import OrderedDict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
PDF_DIR = os.path.join(ROOT, "public", "data", "annual_reports")
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "ar")
os.makedirs(OUTPUT_DIR, exist_ok=True)

AR_URLS = {
    'ITC': lambda y: f"https://www.itcportal.com/content/dam/itc-corporate/pdfs/report-and-accounts/ITC-Report-and-Accounts-{y}.pdf",
}

SCHEMA_VERSION = 2
REQUIRED_CF_KPIS = ['cfoCr', 'cfiCr', 'cffCr', 'capexCr', 'fcfCr', 'dividendCr', 'netChangeCr', 'openingCashCr', 'closingCashCr']
REQUIRED_CF_SECTIONS = ['Operating Activities', 'Investing Activities', 'Financing Activities', 'Summary']
CF_LABEL_ALIASES = [
    (re.compile(r'^net cash from operating activities$', re.I), 'Net cash from operating activities'),
    (re.compile(r'^net cash used in operating activities$', re.I), 'Net cash used in operating activities'),
    (re.compile(r'^net cash from investing activities$', re.I), 'Net cash from investing activities'),
    (re.compile(r'^net cash used in investing activities$', re.I), 'Net cash used in investing activities'),
    (re.compile(r'^net cash from financing activities$', re.I), 'Net cash from financing activities'),
    (re.compile(r'^net cash used in financing activities$', re.I), 'Net cash used in financing activities'),
    (re.compile(r'^net increase \/ \(decrease\) in cash and cash equivalents$', re.I), 'Net increase / (decrease) in cash and cash equivalents'),
    (re.compile(r'^opening cash and cash equivalents$', re.I), 'Opening cash and cash equivalents'),
    (re.compile(r'^closing cash and cash equivalents$', re.I), 'Closing cash and cash equivalents'),
    (re.compile(r'^cash and cash equivalents at the beginning$', re.I), 'Opening cash and cash equivalents'),
    (re.compile(r'^cash and cash equivalents at the end$', re.I), 'Closing cash and cash equivalents'),
    (re.compile(r'^dividend paid$', re.I), 'Dividend paid'),
]

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

def find_cf_pages(doc):
    """Find standalone CF page plus continuation pages with financing/summary rows."""
    start = find_cf_page(doc)
    if start is None:
        return []

    pages = [start]
    for i in range(start + 1, min(start + 4, len(doc))):
        tl = doc[i].get_text().lower()
        has_cf_continuation = any(k in tl for k in [
            'cash flow from financing activities',
            'net cash used in financing activities',
            'net cash from financing activities',
            'net increase',
            'opening cash and cash equivalents',
            'closing cash and cash equivalents',
        ])
        if has_cf_continuation:
            pages.append(i)
        elif pages[-1] != start:
            break
    return pages

def clean_text(text):
    text = text.replace('\u2009', ' ').replace('\xa0', ' ')
    text = text.replace('\u2013', '-').replace('\u2014', '-')
    text = text.replace('\ufeff', '').replace('\b', '')
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def canonical_label(label):
    cleaned = clean_text(label)
    for pattern, replacement in CF_LABEL_ALIASES:
        if pattern.match(cleaned):
            return replacement
    return cleaned

def parse_number(text):
    text = clean_text(text).replace(',', '')
    if text in {'', '-', '\u2013', '\u2014', '...'}:
        return None
    text = text.replace('(', '-').replace(')', '')
    if re.match(r'^-?\d+(?:\.\d+)?$', text):
        return round(float(text), 2)
    return None

def is_probable_label(text):
    text = clean_text(text)
    if not text or parse_number(text) is not None:
        return False
    if re.match(r'^[A-Z]$', text):
        return False
    if re.match(r'^(`|₹|rs\.?|in crores)$', text.lower()):
        return False
    if re.match(r'^(for the year ended|as at|31st march|notes?|note no\.?)', text.lower()):
        return False
    return True

def extract_page_rows(page):
    blocks = page.get_text('dict')['blocks']
    lines = []
    for block in blocks:
        if 'lines' in block:
            for line in block['lines']:
                spans = line['spans']
                text = clean_text(''.join(s['text'] for s in spans))
                if text:
                    lines.append((line['bbox'][0], line['bbox'][2], line['bbox'][1], text))
    
    lines.sort(key=lambda l: (l[2], l[0]))
    
    rows = []
    cur_y, cur_cells = None, []
    for x1, x2, y, text in lines:
        if cur_y is None or abs(y - cur_y) < 8:
            cur_cells.append((x1, x2, text))
            cur_y = y
        else:
            if cur_cells: rows.append((cur_y, cur_cells))
            cur_cells = [(x1, x2, text)]
            cur_y = y
    if cur_cells: rows.append((cur_y, cur_cells))
    return [(y, sorted(cells, key=lambda c: c[0])) for y, cells in rows]

def detect_value_columns(rows):
    paired = []
    for _, cells in rows:
        numeric_xs = sorted(x2 for _, x2, text in cells if x2 > 250 and parse_number(text) is not None)
        if len(numeric_xs) == 2:
            paired.append(numeric_xs)
    if len(paired) >= 5:
        first = sorted(p[0] for p in paired)[len(paired) // 2]
        second = sorted(p[1] for p in paired)[len(paired) // 2]
        return [first, second]

    xs = []
    for _, cells in rows:
        for x1, x2, text in cells:
            if x2 > 250 and parse_number(text) is not None:
                xs.append(x2)
    if not xs:
        return []

    clusters = []
    for x in sorted(xs):
        if not clusters or abs(x - clusters[-1][-1]) > 24:
            clusters.append([x])
        else:
            clusters[-1].append(x)

    centers = [(sum(c) / len(c), len(c)) for c in clusters if len(c) >= 3]
    if len(centers) < 2:
        centers = [(sum(c) / len(c), len(c)) for c in clusters]
    return sorted([c[0] for c in sorted(centers, key=lambda c: c[1], reverse=True)[:2]])

def nearest_value_column(x, value_cols):
    if not value_cols:
        return None
    idx, center = min(enumerate(value_cols), key=lambda p: abs(p[1] - x))
    dist = abs(center - x)
    return idx if dist <= 70 else None

def section_for_label(label, stmt_type):
    ll = label.lower()
    if stmt_type == 'cf':
        if 'cash flow from operating activities' in ll:
            return 'Operating Activities'
        if 'cash flow from investing activities' in ll:
            return 'Investing Activities'
        if 'cash flow from financing activities' in ll:
            return 'Financing Activities'
        if 'net' in ll and ('increase' in ll or 'decrease' in ll) and 'cash' in ll and 'equivalents' in ll:
            return 'Summary'
        return None
    if any(ll.startswith(k) for k in ['equity', 'assets', 'non-current', 'current ']):
        return label
    return None

def parse_statement(pages, fy_cur, fy_pri, stmt_type='generic'):
    """Parse a 2-column financial statement with dynamic value columns."""
    if not isinstance(pages, list):
        pages = [pages]

    items = []
    in_section = None
    pending_label = []

    page_row_sets = []
    for page in pages:
        rows = extract_page_rows(page)
        value_cols = detect_value_columns(rows)
        first_value_x = min(value_cols) - 28 if value_cols else 280
        page_row_sets.append((rows, value_cols, first_value_x))

    for rows, value_cols, first_value_x in page_row_sets:
      for y, cells in rows:
        values = [None, None]
        note_ref = ''
        label_parts = []

        for x1, x2, text in cells:
            num = parse_number(text)
            col = nearest_value_column(x2, value_cols) if num is not None else None
            if col is not None and col < 2:
                if values[col] is None:
                    values[col] = num
                continue
            # Handle cells with multiple space-separated numbers (e.g. "(b) Other Equity"
            # shows "66648.73  67900.14" where the SECOND value is the closing balance)
            parts = [p for p in text.split() if parse_number(p) is not None]
            if len(parts) >= 2:
                n = parse_number(parts[-1])
                col = nearest_value_column(x1, value_cols)  # use x1 (left edge) not x2 — concatenated span is too wide
                if col is not None and col < 2 and values[col] is None:
                    values[col] = n
                continue
            if x1 < first_value_x and is_probable_label(text):
                label_parts.append(text.rstrip(',').strip())
            elif x1 < first_value_x and re.match(r'^[\dA-Z,\s/]+$', text) and len(text) < 15:
                note_ref = text

        row_label = clean_text(' '.join(label_parts))
        cur_val, pri_val = values
        section = section_for_label(row_label, stmt_type)
        if section:
            in_section = section
            if not items or items[-1].get('label') != section:
                items.append({'type': 'section', 'label': section})
            pending_label = []
            if cur_val is None and pri_val is None:
                continue

        if cur_val is None and pri_val is None:
            # Buffer partial labels for ALL statement types (fixes fragmented multi-line PDF labels in BS too)
            if row_label:
                pending_label.append(row_label)
            continue

        label = clean_text(' '.join(pending_label + ([row_label] if row_label else [])))
        pending_label = []
        if not label:
            continue

        if cur_val is not None:
            items.append({
                'type': 'item', 'label': label, 'note_ref': note_ref,
                'current': cur_val, 'prior': pri_val, 'section': in_section,
            })

    if stmt_type == 'cf':
        for idx, item in enumerate(items):
            if item.get('type') == 'item' and 'closing cash and cash equivalents' in item.get('label', '').lower():
                return items[:idx + 1]
    return items

def extract_kpis(items, stmt_type):
    """Extract key KPIs from parsed items."""
    kpis = {}
    if stmt_type == 'pnl':
        # Revenue: prefer exact label match (GST-era) → net revenue (pre-GST) → any partial match.
        # This prevents picking up the gross-including-excise-duty line in FY2016-FY2018 reports.
        rev = (
            next((i for i in items if i['label'].lower() == 'revenue from operations'), None)
            or next((i for i in items if 'net revenue from sale' in i['label'].lower()), None)
            or next((i for i in items if 'revenue from operations' in i['label'].lower()
                     and 'gross' not in i['label'].lower()), None)
        )
        # Pre-GST adjustment: if excise duty appears as an EXPENSE (after revenue in the items
        # list), it was included in the reported gross revenue — subtract to get net comparable.
        # If it appears BEFORE revenue (labelled 'Less: Excise Duty'), it was already deducted.
        rev_idx = items.index(rev) if rev in items else -1
        excise = None
        for idx, i in enumerate(items):
            if i['type'] == 'item' and idx > rev_idx and i.get('current') is not None:
                lbl = i['label'].lower()
                if 'excise duty' in lbl and 'less' not in lbl and i['current'] > 0:
                    excise = i
                    break
        rev_value = None
        if rev and rev.get('current') is not None:
            rev_value = rev['current']
            if excise and excise.get('current') is not None:
                # Gross revenue was picked (includes excise) — subtract to normalise
                rev_value = round(rev_value - excise['current'], 2)
        ti = next((i for i in items if 'total income' in i['label'].lower() and 'expense' not in i['label'].lower()), None)
        pbt = next((i for i in items if 'profit before tax' in i['label'].lower() and 'exceptional' not in i['label'].lower()), None)
        pat = next((i for i in items if 'profit for the year' in i['label'].lower() and 'continuing' in i['label'].lower()), None)
        pat2 = next((i for i in items if 'profit for the year' in i['label'].lower() and 'discontinued' not in i['label'].lower()), None)
        ebitda_item = next((i for i in items if 'ebitda' in i['label'].lower()), None)
        eps_item = next((i for i in items if 'earning per share' in i['label'].lower() and 'diluted' not in i['label'].lower()), None)
        kpis['revenueCr'] = rev_value
        kpis['totalIncomeCr'] = ti['current'] if ti else None
        kpis['pbtCr'] = pbt['current'] if pbt else None
        kpis['patCr'] = pat['current'] if pat else pat2['current'] if pat2 else None
        kpis['ebitdaCr'] = ebitda_item['current'] if ebitda_item else None
        kpis['epsRs'] = eps_item['current'] if eps_item else None
    elif stmt_type == 'bs':
        ta = next((i for i in items if i['type'] == 'item' and ('total assets' in i['label'].lower() or i['label'] == 'TOTAL')), None)
        tel = next((i for i in items if i['type'] == 'item' and ('total equity and liabilit' in i['label'].lower() or i['label'] == 'TOTAL')), None)
        # For pre-2019 reports where both 'TOTAL' lines exist, pick the last one for TEL
        if ta and tel and ta == tel:
            ta_idx = next((idx for idx, i in enumerate(items) if i is ta), 0)
            tel_idx = next((idx for idx, i in enumerate(items) if i is tel), len(items))
            if tel_idx < ta_idx:
                # Flip: first TOTAL is equity, second is assets
                tel, ta = ta, None
                ta = next((i for i in items if i['type'] == 'item' and i['label'] == 'TOTAL' and i is not tel), None)
        kpis['totalAssetsCr'] = ta['current'] if ta else None
        kpis['totalEquityLiabCr'] = tel['current'] if tel else None
        # Extract equity: look for dedicated total equity line (exact match only),
        # then fall back to summing share capital + reserves.
        # IMPORTANT: must NOT match 'TOTAL EQUITY AND LIABILITIES' (which equals total assets).
        total_eq = next((i for i in items if i['type'] == 'item' and
            i['label'].lower() in [
                'total equity',
                "total shareholders' equity",
                'total shareholders equity',
                "shareholders' funds",
                'shareholders funds',
                'total shareholders funds',
                "total shareholders' funds",
            ]), None)
        if total_eq:
            kpis['equityCr'] = total_eq['current']
        else:
            # Fallback: find equity share capital + reserves lines and sum them.
            # Handles both modern ("Equity Share capital") and pre-2019 ("Shareholders' funds Share capital") labels.
            sc = next((i for i in items if i['type'] == 'item' and (
                'equity share capital' in i['label'].lower()
                or i['label'].lower() == 'share capital'
                or ("shareholders" in i['label'].lower() and "share capital" in i['label'].lower())
            )), None)
            reserves = next((i for i in items if i['type'] == 'item' and (
                'reserves and surplus' in i['label'].lower()
                or ('reserve' in i['label'].lower() and 'surplus' in i['label'].lower())
                or i['label'].lower() in ['reserves', 'reserves & surplus']
                or 'other equity' in i['label'].lower()  # Ind AS modern label: '(b) Other equity'
            )), None)
            if sc and reserves and sc['current'] is not None and reserves['current'] is not None:
                kpis['equityCr'] = round(sc['current'] + reserves['current'], 2)
            else:
                # Cannot reliably compute equity: modern Ind AS BS has '(b) Other equity' on a
                # line whose PDF coordinates don't align with the value columns reliably.
                # Leave as None rather than derive an inaccurate figure from assets - liabilities.
                kpis['equityCr'] = None
    elif stmt_type == 'cf':
        all_cf = [i for i in items if i['type'] == 'item']  # items with values only, skip section markers
        def label_has(item, *parts):
            label = canonical_label(item['label']).lower()
            return all(part in label for part in parts)

        cfo = next((i for i in all_cf if label_has(i, 'net cash', 'operating activities')), None)
        cfi = next((i for i in all_cf if label_has(i, 'net cash', 'investing activities')), None)
        cff = next((i for i in all_cf if label_has(i, 'net cash', 'financing activities')), None)
        capex = next((i for i in all_cf if label_has(i, 'purchase') and (
            label_has(i, 'fixed asset') or
            label_has(i, 'property', 'plant') or
            label_has(i, 'rou asset') or
            label_has(i, 'intangibles')
        )), None)
        div = next((i for i in all_cf if 'dividend paid' in i['label'].lower()), None)
        netchg = next((i for i in all_cf if label_has(i, 'net') and ('increase' in i['label'].lower() or 'decrease' in i['label'].lower()) and label_has(i, 'cash', 'equivalents')), None)
        clos = next((i for i in all_cf if label_has(i, 'closing cash and cash equivalents') or label_has(i, 'cash and cash equivalents at the end')), None)
        open_bal = next((i for i in all_cf if label_has(i, 'opening cash and cash equivalents') or label_has(i, 'cash and cash equivalents at beginning')), None)
        kpis['cfoCr'] = cfo.get('current') if cfo else None
        kpis['cfiCr'] = cfi.get('current') if cfi else None
        kpis['cffCr'] = cff.get('current') if cff else None
        kpis['capexCr'] = capex.get('current') if capex else None
        kpis['dividendCr'] = abs(div.get('current')) if div and div.get('current') else None
        kpis['netChangeCr'] = netchg.get('current') if netchg else None
        kpis['closingCashCr'] = clos.get('current') if clos else None
        kpis['openingCashCr'] = open_bal.get('current') if open_bal else None
        # Derived — round to 2dp to avoid floating-point artifacts (e.g. 7067.370000000001)
        if kpis['cfoCr'] is not None and kpis['capexCr'] is not None and kpis['capexCr'] < 0:
            kpis['fcfCr'] = round(kpis['cfoCr'] + kpis['capexCr'], 2)
        else:
            kpis['fcfCr'] = None
    return kpis

def collect_cash_flow_warnings(items, kpis):
    warnings = []
    sections = [item.get('label') for item in items if item.get('type') == 'section']
    for section in REQUIRED_CF_SECTIONS:
        if section not in sections:
            warnings.append(f'missing section: {section}')
    for key in REQUIRED_CF_KPIS:
        if kpis.get(key) is None:
            warnings.append(f'missing KPI: {key}')
    if kpis.get('cfoCr') is not None and kpis.get('capexCr') is not None and kpis.get('fcfCr') is not None:
        derived = kpis['cfoCr'] + kpis['capexCr']
        if abs(derived - kpis['fcfCr']) >= 0.05:
            warnings.append('fcf mismatch: cfoCr + capexCr != fcfCr')
    return warnings

def extract_all(ticker, years=range(2016, 2026)):
    """Extract all financial data for a ticker (focus on recent years first)."""
    all_data = {
        'ticker': ticker,
        'years': {},
        'metadata': {
            'schemaVersion': SCHEMA_VERSION,
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'source': 'Annual Reports',
            'yearsCovered': [],
            'pdfPaths': {},
            'warnings': [],
        },
    }
    
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
        year_meta = {
            'pdfName': os.path.basename(path),
            'pdfPath': os.path.relpath(path, ROOT).replace('\\', '/'),
            'cashFlowPages': [],
            'warnings': [],
        }
        
        try:
            # P&L
            pnl_idx = find_pnl_page(doc, fy_cur)
            if pnl_idx is not None:
                items = parse_statement(doc[pnl_idx], fy_cur, fy_pri, 'pnl')
                kpis = extract_kpis(items, 'pnl')
                year_data['profitLoss'] = {'fy': f"FY{fy_cur}", 'items': items, 'kpIs': kpis}
                print(f"P&L(p{pnl_idx+1},{len(items)}i) ", end='', flush=True)
            else:
                print("P&L(?) ", end='', flush=True)
            
            # BS
            bs_idx = find_bs_page(doc)
            if bs_idx is not None:
                items = parse_statement(doc[bs_idx], fy_cur, fy_pri, 'bs')
                kpis = extract_kpis(items, 'bs')
                year_data['balanceSheet'] = {'fy': f"FY{fy_cur}", 'items': items, 'kpIs': kpis}
                print(f"BS(p{bs_idx+1},{len(items)}i) ", end='', flush=True)
            else:
                print("BS(?) ", end='', flush=True)
            
            # CF
            cf_pages = find_cf_pages(doc)
            if cf_pages:
                items = parse_statement([doc[i] for i in cf_pages], fy_cur, fy_pri, 'cf')
                kpis = extract_kpis(items, 'cf')
                year_data['cashFlow'] = {'fy': f"FY{fy_cur}", 'items': items, 'kpIs': kpis}
                year_meta['cashFlowPages'] = [i + 1 for i in cf_pages]
                year_meta['warnings'] = collect_cash_flow_warnings(items, kpis)
                page_label = f"p{cf_pages[0]+1}" if len(cf_pages) == 1 else f"p{cf_pages[0]+1}-{cf_pages[-1]+1}"
                print(f"CF({page_label},{len(items)}i)", end='', flush=True)
            else:
                year_meta['warnings'].append('cash flow pages not found')
        except Exception as e:
            print(f"EXTRACT ERROR: {e}", end='', flush=True)
            year_meta['warnings'].append(str(e))
        finally:
            if year_data:
                year_data['metadata'] = year_meta
                all_data['years'][f"FY{year}"] = year_data
                all_data['metadata']['yearsCovered'].append(f"FY{year}")
                all_data['metadata']['pdfPaths'][f"FY{year}"] = year_meta['pdfPath']
                if year_meta['warnings']:
                    all_data['metadata']['warnings'].extend([f"FY{year}: {warning}" for warning in year_meta['warnings']])
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
    parser.add_argument('--years', default='2016-2025')
    args = parser.parse_args()
    parts = args.years.split('-')
    years = range(int(parts[0]), int(parts[1]) + 1)
    print(f"Extracting {args.ticker}...\n", flush=True)
    data = extract_all(args.ticker, years)
    save(data)
    print(f"Done.", flush=True)

if __name__ == '__main__':
    main()
