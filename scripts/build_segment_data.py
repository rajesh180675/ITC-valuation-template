#!/usr/bin/env python3
"""
Generic Segment Data Pipeline — NSE Annual Report PDF Extraction
=================================================================
Downloads annual/integrated reports from NSE corporate filings and extracts
segment revenue/results/assets/liabilities tables for any NSE-listed company.

Outputs per-ticker JSON in the format expected by SegmentsView frontend:
  public/data/segment_data_<ticker>.json

Usage:
  python scripts/build_segment_data.py --ticker ITC --years 10
  python scripts/build_segment_data.py --ticker RELIANCE --years 5
  python scripts/build_segment_data.py --list scripts/data_collector/nifty50.txt --years 10
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

# ── Find Annual Report PDFs ──────────────────────────────────────────────────
def find_annual_reports(symbol, max_years=10):
    """Search NSE for annual/integrated report PDFs. Returns list of (fy, url)."""
    try:
        s = nse_session()
        r = s.get(
            f"https://www.nseindia.com/api/corporate-announcements?index=equities&symbol={symbol}",
            timeout=20
        )
        if r.status_code != 200:
            return []

        items = r.json()
        items = items if isinstance(items, list) else items.get('items', items.get('data', []))

        reports = []
        seen_years = set()

        for item in items[:300]:
            desc = str(item.get('desc', '')).lower() + str(item.get('attchmntText', '')).lower()
            pdf = item.get('attchmntFile', '')
            if not pdf:
                continue

            # Skip non-financial filings
            skip = ['voting', 'newspaper', 'scrutinizer', 'notice', 'dividend', 'result', 'quarterly']
            if any(sk in desc for sk in skip):
                continue

            score = 0
            if 'integrated' in desc and 'report' in desc:
                score = 3
            elif 'annual' in desc and 'report' in desc:
                score = 2

            if score == 0:
                continue

            # Extract year from description or date
            year_match = re.search(r'(20\d{2})', desc)
            if not year_match:
                date_str = item.get('an_dt', '')
                year_match = re.search(r'(20\d{2})', date_str)
            if not year_match:
                continue

            year = int(year_match.group(1))
            fy = f"FY{year}"
            if fy in seen_years:
                continue
            seen_years.add(fy)

            reports.append((fy, pdf, score))

        # Sort by score (best first) then by year
        reports.sort(key=lambda x: (-x[2], x[0]))

        # Keep only unique best per year, limited to max_years
        seen = set()
        result = []
        for fy, url, _ in reports:
            if fy not in seen:
                seen.add(fy)
                result.append((fy, url))
                if len(result) >= max_years:
                    break

        return result
    except Exception as e:
        print(f"  NSE search error: {e}")
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
    # Remove references, note numbers, etc.
    ll = re.sub(r'\(refer note [^)]+\)', '', raw, flags=re.I).strip()
    ll = re.sub(r'\[.*?\]', '', ll).strip()
    ll = re.sub(r'^(?:\d+\.?\s*)+', '', ll).strip()
    ll = re.sub(r'^[a-e]\)\s*', '', ll).strip()
    ll = ll.strip(':,. ')
    # Normalize whitespace
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
        fy_key = fy  # e.g. "FY2024"

        for section, segments in section_data.items():
            metric_prefix = section  # revenue, results, assets, liabilities

            for seg_name, values in segments.items():
                key = f"{metric_prefix}|{seg_name}"

                # Current year value for this FY
                if values.get('cur') is not None:
                    time_series[key][fy_key] = values['cur']

                # Prior year value -> maps to FY(year-1)
                if values.get('pri') is not None:
                    pri_year = _fy_to_prior(fy_key)
                    if pri_year:
                        # Only set if not already populated (prefer current-year extraction)
                        if pri_year not in time_series[key]:
                            time_series[key][pri_year] = values['pri']

    # Convert defaultdict to regular dict and sort keys
    return {k: dict(sorted(v.items())) for k, v in time_series.items()}

def _fy_to_prior(fy_key):
    """Get the prior FY from a FY key. e.g. FY2024 -> FY2023."""
    m = re.search(r'FY(\d{4})', fy_key)
    if m:
        year = int(m.group(1))
        return f"FY{year - 1}"
    return None

# ── Process One Company ──────────────────────────────────────────────────────
def process_ticker(ticker, max_years=10):
    """Full pipeline for one company. Returns output dict or None."""
    print(f"\n{'='*60}")
    print(f"  {ticker}: Finding annual reports (max {max_years} years)...")

    reports = find_annual_reports(ticker, max_years=max_years)
    if not reports:
        print(f"  {ticker}: No annual reports found on NSE")
        return None

    print(f"  {ticker}: Found {len(reports)} report(s): {', '.join(fy for fy, _ in reports)}")

    all_data = []
    warnings = []
    source_pages_by_year = {}

    for fy, pdf_url in reports:
        print(f"  {ticker} {fy}: Downloading...", end='', flush=True)
        pdf_path = download_pdf(pdf_url, ticker, fy)
        if not pdf_path:
            print(" download failed")
            warnings.append(f"{fy}: Download failed")
            continue

        print(f" done ({os.path.getsize(pdf_path)//1024} KB)", flush=True)
        print(f"  {ticker} {fy}: Extracting segment data...", end='', flush=True)

        result = extract_segment_data_from_pdf(pdf_path, fy)
        if not result:
            print(" extraction failed")
            warnings.append(f"{fy}: Extraction failed")
            continue

        section_data, source_pages = result
        if not section_data:
            print(" no segment data found")
            warnings.append(f"{fy}: No segment data in PDF")
            continue

        num_segments = len(section_data.get('revenue', {}))
        print(f" {num_segments} segments found (revenue)")
        all_data.append((fy, section_data, source_pages))
        source_pages_by_year[fy] = source_pages

    if not all_data:
        print(f"  {ticker}: No segment data extracted from any PDF")
        return None

    # Build time series
    time_series = build_time_series(all_data, [fy for fy, _ in reports])

    # Determine basis (standalone vs consolidated)
    basis = _determine_basis(reports, all_data)

    output = {
        "symbol": ticker,
        "basis": basis,
        "source": f"NSE Annual Reports - Segment Reporting ({basis.title()})",
        "sourcePagesByYear": source_pages_by_year,
        "warnings": warnings,
        "segment_time_series": time_series,
    }

    return output

def _determine_basis(reports, all_data):
    """Try to determine if data is standalone or consolidated."""
    # Check URLs for 'standalone' or 'consolidated'
    for fy, url in reports:
        if 'standalone' in url.lower():
            return 'standalone'
        if 'consolidated' in url.lower():
            return 'consolidated'
    # Default: prefer standalone if available
    return 'standalone'

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    import argparse
    parser = argparse.ArgumentParser(description="Extract segment data from NSE annual reports")
    parser.add_argument('--ticker', help='Single ticker (e.g., ITC)')
    parser.add_argument('--list', help='File with tickers (one per line)')
    parser.add_argument('--pdf-dir', help='Directory with local PDFs (pattern: <TICKER>_AR_<YYYY>.pdf)')
    parser.add_argument('--years', type=int, default=10, help='Max years to extract (default: 10)')
    args = parser.parse_args()

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
        # First check for local PDFs
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

    all_data = []
    warnings = []
    source_pages_by_year = {}

    for fy, pdf_path in pdfs[:max_years]:
        print(f"  {ticker} {fy}: Extracting...", end='', flush=True)
        result = extract_segment_data_from_pdf(pdf_path, fy)
        if not result:
            print(" FAILED")
            warnings.append(f"{fy}: Extraction failed")
            continue

        section_data, source_pages = result
        if not section_data:
            print(" no segment data")
            warnings.append(f"{fy}: No segment data")
            continue

        num_segments = len(section_data.get('revenue', {}))
        print(f" {num_segments} segments")
        all_data.append((fy, section_data, source_pages))
        source_pages_by_year[fy] = source_pages

    if not all_data:
        print(f"  {ticker}: No segment data extracted")
        return None

    time_series = build_time_series(all_data, [fy for fy, _ in pdfs])
    basis = _determine_basis_local(pdf_path)

    output = {
        "symbol": ticker,
        "basis": basis,
        "source": f"NSE Annual Reports - Segment Reporting ({basis.title()})",
        "sourcePagesByYear": source_pages_by_year,
        "warnings": warnings,
        "segment_time_series": time_series,
    }
    return output

def _determine_basis_local(pdf_path):
    """Try to determine basis from PDF filename."""
    name = os.path.basename(pdf_path).lower()
    if 'consol' in name:
        return 'consolidated'
    return 'standalone'

if __name__ == '__main__':
    main()
