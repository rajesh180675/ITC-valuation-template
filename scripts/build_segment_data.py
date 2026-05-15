#!/usr/bin/env python3
"""
Segment Data Pipeline — NSE Discovery + PDF Extraction
=======================================================
Automatically discovers annual reports from NSE filings and extracts
segment data. Supports three input methods:
  1. --ticker: Discover ARs via NSE announcements API
  2. --pdf-dir: Process local PDFs matching pattern <TICKER>_AR_<YYYY>.pdf
  3. --urls: Provide URLs directly (JSON file with {ticker: [urls]})

Usage:
  python scripts/build_segment_data.py --ticker ITC
  python scripts/build_segment_data.py --ticker RELIANCE --years 5
  python scripts/build_segment_data.py --pdf-dir public/data/annual_reports --ticker ITC
  python scripts/build_segment_data.py --urls scripts/ar_urls.json
"""

import sys, os, re, json, time, math, hashlib
import requests
import fitz  # PyMuPDF
from datetime import datetime
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
PDF_DIR = os.path.join(ROOT, "public", "data", "annual_reports")
OUTPUT_DIR = os.path.join(ROOT, "public", "data")
os.makedirs(PDF_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json,text/html,*/*",
    "Referer": "https://www.nseindia.com/",
}

# ── Known company IR pages for manual URL fallback ───────────────────────────
# These are common patterns where companies host their annual reports.
# If NSE API doesn't find ARs, the user can provide URLs directly.
COMPANY_IR_PATTERNS = {
    # 'TICKER': 'https://example.com/ar/{year}.pdf'
}

# ── NSE Session ──────────────────────────────────────────────────────────────
_NSE = None
def nse_session():
    global _NSE
    if _NSE is None:
        s = requests.Session()
        s.headers.update(HEADERS)
        s.get("https://www.nseindia.com", timeout=15)
        _NSE = s
    return _NSE

# ── Discover AR PDFs via NSE ─────────────────────────────────────────────────
def discover_ar_from_nse(ticker, max_years=10):
    """
    Search NSE corporate announcements for annual report PDFs.
    Returns list of (fy, url) tuples.
    """
    try:
        s = nse_session()
        r = s.get(
            f"https://www.nseindia.com/api/corporate-announcements?index=equities&symbol={ticker}",
            timeout=20
        )
        if r.status_code != 200:
            print(f"  NSE API error: {r.status_code}")
            return []

        items = r.json()
        if not isinstance(items, list):
            print(f"  NSE API returned unexpected format")
            return []

        # AR filename patterns
        ar_patterns = [
            r'annualreport', r'integratedannual', r'reportandaccounts',
            r'noticeiar', r'_iar[_.]', r'annual_report', r'annual-report',
            r'integrated_report', r'integrated-report', r'_ar[_.]',
            r'integrated_results'
        ]

        reports = []
        seen_years = set()

        for item in items:
            pdf = item.get('attchmntFile', '')
            if not pdf or '.pdf' not in pdf:
                continue

            pdf_lower = pdf.lower()

            # Check if filename matches AR pattern
            is_ar = any(re.search(p, pdf_lower) for p in ar_patterns)

            # Check description/text for AR mentions
            desc = str(item.get('desc', '')).lower()
            text = str(item.get('attchmntText', '')).lower()
            combined = desc + ' ' + text

            # Exclude noise
            is_noise = any(kw in pdf_lower for kw in [
                'compliance', 'brsr', 'secretarial', 'newspaper', 'voting',
                'scrutinizer', 'demat', 'remat', 'monthly', 'limited review',
                'agm', 'proceeding', 'chairman'
            ])

            if is_ar and not is_noise:
                # Extract year from date
                date_str = item.get('an_dt', '')
                year_match = re.search(r'(20\d{2})', date_str)
                if not year_match:
                    # Try to extract from filename
                    year_match = re.search(r'(20\d{2})', pdf)
                if not year_match:
                    continue

                year = int(year_match.group(1))
                fy = f"FY{year}"

                if fy in seen_years:
                    continue
                seen_years.add(fy)

                reports.append((fy, pdf, date_str))

        # Sort by date (most recent first) and limit to max_years
        reports.sort(key=lambda x: x[2], reverse=True)
        reports = reports[:max_years]

        return [(fy, url) for fy, url, _ in reports]
    except Exception as e:
        print(f"  NSE discovery error: {e}")
        return []

# ── Download PDF ─────────────────────────────────────────────────────────────
def download_pdf(url, symbol, fy):
    """Download PDF, return path or None."""
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    path = os.path.join(PDF_DIR, f"{symbol}_{fy}_{url_hash}.pdf")

    if os.path.exists(path) and os.path.getsize(path) > 5000:
        return path

    try:
        r = requests.get(url, headers=HEADERS, stream=True, timeout=60)
        if r.status_code != 200:
            return None
        with open(path, 'wb') as f:
            for chunk in r.iter_content(8192):
                if chunk:
                    f.write(chunk)
        return path if os.path.getsize(path) > 5000 else None
    except Exception:
        return None

# ── Parse Numbers ────────────────────────────────────────────────────────────
def parse_num(t):
    """Parse a numeric string, handling Indian formatting."""
    if not t or t.strip() in ('-', '–', '—', '', 'nil', 'NA', 'N/A'):
        return None
    t = t.replace(',', '').replace('(', '-').replace(')', '').replace('\u20b9', '').replace('`', '')
    t = re.sub(r'[^0-9.\-]', '', t)
    try:
        v = float(t)
        return round(v, 2) if math.isfinite(v) else None
    except ValueError:
        return None

# ── Extract Segment Data from PDF ────────────────────────────────────────────
def extract_segment_data_from_pdf(pdf_path, target_fy):
    """
    Extract segment revenue/results/assets/liabilities from a single annual report PDF.
    Returns dict: { section: { segment_name: { 'cur': val, 'pri': val } } }

    Strategy: scan all pages, find segment reporting sections, prefer standalone.
    """
    try:
        doc = fitz.open(pdf_path)
    except Exception:
        return None

    # First pass: find all candidate pages with segment data
    candidates = []
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        text = page.get_text().lower()

        if 'segment' not in text:
            continue

        # Check if this is a standalone or consolidated section
        page_text_full = page.get_text()
        is_standalone = 'standalone' in page_text_full.lower()
        is_consolidated = 'consolidated' in page_text_full.lower()

        # Score: standalone preferred, consolidated secondary
        if is_standalone and not is_consolidated:
            score = 2
        elif is_standalone and is_consolidated:
            score = 1
        elif is_consolidated:
            score = 0
        else:
            score = -1

        candidates.append((page_idx, score))

    if not candidates:
        doc.close()
        return None

    # Sort by score (standalone first), then by page number
    candidates.sort(key=lambda x: (-x[1], x[0]))

    # Extract from the best candidate page
    results = {}
    source_pages = {}

    for page_idx, score in candidates:
        page = doc[page_idx]
        extracted = _extract_from_page(page, page_idx)
        if extracted:
            results.update(extracted[0])
            source_pages.update(extracted[1])
            # If we got data from a standalone page, stop
            if score >= 2:
                break

    doc.close()
    return (results, source_pages) if results else None

def _extract_from_page(page, page_idx):
    """Extract segment data from a single page. Returns (section_data, source_pages) or None."""
    blocks = page.get_text('dict')['blocks']
    cells = []
    for block in blocks:
        if 'lines' in block:
            for line in block['lines']:
                spans = line['spans']
                t = ''.join(s['text'] for s in spans).strip()
                if t:
                    cells.append((spans[0]['bbox'][0], line['bbox'][1], t))

    if not cells:
        return None

    cells.sort(key=lambda c: (c[1], c[0]))

    # Group into rows
    rows = []
    cur_y, cur_row = None, []
    for x, y, t in cells:
        if cur_y is None or abs(y - cur_y) < 6:
            cur_row.append((x, t))
            cur_y = y
        else:
            if cur_row:
                rows.append((cur_y, sorted(cur_row, key=lambda c: c[0])))
            cur_row = [(x, t)]
            cur_y = y
    if cur_row:
        rows.append((cur_y, sorted(cur_row, key=lambda c: c[0])))

    results = {}
    source_pages = {}
    current_section = None

    for y, row_cells in rows:
        label_text = ' '.join(t for x, t in row_cells if x < 200).strip()
        data_cells = [(x, t) for x, t in row_cells if x >= 200]
        label_lower = label_text.lower().strip(':,. ')

        # Detect section headings
        if _is_segment_revenue_heading(label_lower):
            current_section = 'revenue'
            continue
        elif _is_segment_results_heading(label_lower):
            current_section = 'results'
            continue
        elif _is_segment_assets_liabilities_heading(label_lower):
            current_section = 'assets_liabilities'
            continue
        elif _is_skip_heading(label_lower):
            current_section = None
            continue

        if not current_section or not label_text:
            continue

        segment_name = _clean_segment_label(label_text)
        if not segment_name or _is_excluded_segment(segment_name):
            continue

        all_data_cells = [(x, t) for x, t in row_cells if x >= 200]
        cell_count = len(all_data_cells)
        vals = [parse_num(t) for _, t in all_data_cells]
        numeric_vals = [v for v in vals if v is not None]

        if not numeric_vals:
            continue

        if current_section == 'revenue':
            if cell_count >= 6:
                cur_val = vals[0]
                pri_val = vals[3]
            elif cell_count >= 4:
                cur_val = vals[0]
                pri_val = vals[2]
            else:
                cur_val = vals[0]
                pri_val = vals[1] if len(vals) >= 2 else None
            _set_segment(results, 'revenue', segment_name, cur_val, pri_val)
            source_pages.setdefault('revenue', page_idx + 1)

        elif current_section == 'results':
            cur_val = vals[0] if len(vals) >= 1 else None
            pri_val = vals[1] if len(vals) >= 2 else None
            _set_segment(results, 'results', segment_name, cur_val, pri_val)
            source_pages.setdefault('results', page_idx + 1)

        elif current_section == 'assets_liabilities':
            if len(vals) >= 4:
                _set_segment(results, 'assets', segment_name, vals[0], vals[2])
                _set_segment(results, 'liabilities', segment_name, vals[1], vals[3])
                source_pages.setdefault('assets', page_idx + 1)
                source_pages.setdefault('liabilities', page_idx + 1)
            elif len(vals) >= 2:
                _set_segment(results, 'assets', segment_name, vals[0], vals[1])
                source_pages.setdefault('assets', page_idx + 1)

    return (results, source_pages) if results else None

def _is_segment_revenue_heading(l):
    return any(kw in l for kw in [
        'segment revenue', 'revenue from operations', 'segment wise revenue',
        'revenue - gross', 'revenue by segment', 'segment - revenue'
    ])

def _is_segment_results_heading(l):
    return any(kw in l for kw in [
        'segment results', 'segment profit', 'segment operating profit',
        'results from operations', 'segment wise results', 'ebitda by segment',
        'operating profit by segment', 'segment - results'
    ])

def _is_segment_assets_liabilities_heading(l):
    return any(kw in l for kw in [
        'segment assets', 'segment liabilities', 'assets employed',
        'capital employed', 'other information', 'segment - assets'
    ])

def _is_skip_heading(l):
    """Headings that signal end of segment data or irrelevant sections."""
    return any(kw in l for kw in [
        'accounting policies', 'notes to', 'significant accounting',
        'basis of preparation', 'in our opinion', 'auditor', 'director',
        'balance sheet', 'profit and loss', 'cash flow', 'income statement'
    ])

def _clean_segment_label(raw):
    """Clean a segment label to extract the segment name."""
    ll = re.sub(r'\(refer note [^)]+\)', '', raw, flags=re.I).strip()
    ll = re.sub(r'\[.*?\]', '', ll).strip()
    ll = re.sub(r'^(?:\d+\.?\s*)+', '', ll).strip()
    ll = re.sub(r'^[a-e]\)\s*', '', ll).strip()
    ll = ll.strip(':,. ')
    ll = re.sub(r'\s+', ' ', ll).strip()
    return ll if len(ll) > 2 and len(ll) < 60 else None

def _is_excluded_segment(name):
    """Check if segment should be excluded (totals, eliminations, etc.)."""
    lower = name.lower()
    return any(kw in lower for kw in [
        'total', 'elimination', 'unallocated', 'discontinued', 'corporate',
        'inter-segment', 'inter segment', 'consolidation'
    ])

def _set_segment(results, section, name, cur_val, pri_val):
    """Add segment data to results dict."""
    if section not in results:
        results[section] = {}
    results[section][name] = {
        'cur': cur_val,
        'pri': pri_val,
    }

# ── Build Time Series ────────────────────────────────────────────────────────
def build_time_series(all_data, target_fys):
    """
    Combine per-PDF extractions into a single segment_time_series dict.
    all_data: list of (fy, section_data_dict, source_pages)
    Returns: { "metric|segment": { "FY2016": val, ... }, ... }
    """
    time_series = defaultdict(dict)

    for fy, section_data, _ in all_data:
        fy_key = fy

        for section, segments in section_data.items():
            metric_prefix = section

            for seg_name, values in segments.items():
                key = f"{metric_prefix}|{seg_name}"

                if values.get('cur') is not None:
                    time_series[key][fy_key] = values['cur']

                if values.get('pri') is not None:
                    pri_year = _fy_to_prior(fy_key)
                    if pri_year:
                        if pri_year not in time_series[key]:
                            time_series[key][pri_year] = values['pri']

    return {k: dict(sorted(v.items())) for k, v in time_series.items()}

def _fy_to_prior(fy_key):
    """Get the prior FY from a FY key. e.g. FY2024 -> FY2023."""
    m = re.search(r'FY(\d{4})', fy_key)
    if m:
        year = int(m.group(1))
        return f"FY{year - 1}"
    return None

# ── Process One Company (NSE Discovery) ──────────────────────────────────────
def process_ticker(ticker, max_years=10):
    """Full pipeline: discover ARs via NSE, download, extract."""
    print(f"\n{'='*60}")
    print(f"  {ticker}: Discovering annual reports from NSE (max {max_years} years)...")

    reports = discover_ar_from_nse(ticker, max_years=max_years)
    if not reports:
        print(f"  {ticker}: No annual reports found on NSE")
        print(f"  {ticker}: Try providing PDFs via --pdf-dir or --urls")
        return None

    print(f"  {ticker}: Found {len(reports)} report(s): {', '.join(fy for fy, _ in reports)}")

    return _process_reports(ticker, reports, max_years)

# ── Process One Company (Local PDFs) ─────────────────────────────────────────
def find_local_pdfs(ticker, pdf_dir):
    """Find local PDF files matching <TICKER>_AR_<YYYY>.pdf pattern."""
    if not os.path.isdir(pdf_dir):
        return []
    pdfs = []
    for f in sorted(os.listdir(pdf_dir)):
        if f.startswith(f"{ticker}_AR_") and f.endswith('.pdf'):
            m = re.search(r'(\d{4})\.pdf$', f)
            if m:
                year = int(m.group(1))
                fy = f"FY{year}"
                pdfs.append((fy, os.path.join(pdf_dir, f)))
    return pdfs

def process_local_pdfs(ticker, pdfs, max_years=10):
    """Process local PDFs instead of downloading from NSE."""
    print(f"\n{'='*60}")
    print(f"  {ticker}: Found {len(pdfs)} local PDFs: {', '.join(fy for fy, _ in pdfs)}")

    reports = [(fy, path) for fy, path in pdfs[:max_years]]
    return _process_reports(ticker, reports, max_years, is_local=True)

# ── Process Reports (shared logic) ───────────────────────────────────────────
def _process_reports(ticker, reports, max_years=10, is_local=False):
    """Common pipeline: download (if needed) -> extract -> build time series."""
    all_data = []
    warnings = []
    source_pages_by_year = {}

    for fy, source in reports[:max_years]:
        if is_local:
            pdf_path = source
            print(f"  {ticker} {fy}: Extracting from local PDF...", end='', flush=True)
        else:
            pdf_url = source
            print(f"  {ticker} {fy}: Downloading...", end='', flush=True)
            pdf_path = download_pdf(pdf_url, ticker, fy)
            if not pdf_path:
                print(" download failed")
                warnings.append(f"{fy}: Download failed")
                continue
            print(f" done ({os.path.getsize(pdf_path)//1024} KB)", flush=True)
            print(f"  {ticker} {fy}: Extracting...", end='', flush=True)

        result = extract_segment_data_from_pdf(pdf_path, fy)
        if not result:
            print(" no segment data found")
            warnings.append(f"{fy}: No segment data in PDF")
            continue

        section_data, source_pages = result
        num_segments = len(section_data.get('revenue', {}))
        print(f" {num_segments} segments")
        all_data.append((fy, section_data, source_pages))
        source_pages_by_year[fy] = source_pages

    if not all_data:
        print(f"  {ticker}: No segment data extracted from any PDF")
        return None

    time_series = build_time_series(all_data, [fy for fy, _ in reports])
    basis = _determine_basis(reports, is_local)

    output = {
        "symbol": ticker,
        "basis": basis,
        "source": f"NSE Annual Reports - Segment Reporting ({basis.title()})",
        "sourcePagesByYear": source_pages_by_year,
        "warnings": warnings,
        "segment_time_series": time_series,
    }

    return output

def _determine_basis(reports, is_local=False):
    """Try to determine if data is standalone or consolidated."""
    for fy, source in reports:
        if is_local:
            name = os.path.basename(source).lower()
        else:
            name = source.lower()
        if 'standalone' in name:
            return 'standalone'
        if 'consolidated' in name or 'consol' in name:
            return 'consolidated'
    # Default: prefer standalone if we found standalone pages
    return 'standalone'

# ── Process from URL list ────────────────────────────────────────────────────
def process_from_urls(url_file):
    """Process tickers from a JSON file with {ticker: [url1, url2, ...]}."""
    with open(url_file) as f:
        data = json.load(f)

    results = {}
    for ticker, urls in data.items():
        reports = []
        for url in urls:
            # Try to extract year from URL
            year_match = re.search(r'(20\d{2})', url)
            fy = f"FY{year_match.group(1)}" if year_match else "FYUnknown"
            reports.append((fy, url))

        result = _process_reports(ticker, reports)
        if result:
            output_path = os.path.join(OUTPUT_DIR, f"segment_data_{ticker.lower()}.json")
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"  {ticker}: Saved to {output_path}")
            results[ticker] = result
        time.sleep(2)

    return results

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    import argparse
    parser = argparse.ArgumentParser(description="Extract segment data from annual report PDFs")
    parser.add_argument('--ticker', help='Single ticker (e.g., ITC)')
    parser.add_argument('--list', help='File with tickers (one per line)')
    parser.add_argument('--pdf-dir', help='Directory with local PDFs (pattern: <TICKER>_AR_<YYYY>.pdf)')
    parser.add_argument('--urls', help='JSON file with {ticker: [url1, url2, ...]}')
    parser.add_argument('--years', type=int, default=10, help='Max years to extract (default: 10)')
    args = parser.parse_args()

    if args.urls:
        # Process from URL file
        process_from_urls(args.urls)
        return

    tickers = []
    if args.ticker:
        tickers = [args.ticker.upper()]
    elif args.list:
        list_path = os.path.join(ROOT, args.list)
        with open(list_path) as f:
            tickers = [line.strip().upper() for line in f if line.strip()]
    else:
        tickers = ['ITC']

    print(f"Processing {len(tickers)} ticker(s) for up to {args.years} years...")

    success = 0
    for ticker in tickers:
        # Priority: local PDFs > NSE discovery
        local_pdfs = find_local_pdfs(ticker, args.pdf_dir or PDF_DIR)
        if local_pdfs:
            result = process_local_pdfs(ticker, local_pdfs, max_years=args.years)
        else:
            result = process_ticker(ticker, max_years=args.years)

        if result:
            ts = result['segment_time_series']
            fys = set()
            for key, values in ts.items():
                fys.update(values.keys())
            print(f"  {ticker}: {len(ts)} series, {len(fys)} years: {sorted(fys)}")

            output_path = os.path.join(OUTPUT_DIR, f"segment_data_{ticker.lower()}.json")
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"  {ticker}: Saved to {output_path}")
            success += 1
        time.sleep(2)

    print(f"\nDone. {success}/{len(tickers)} tickers processed successfully.")

if __name__ == '__main__':
    main()
