#!/usr/bin/env python3
"""
Segment Data Pipeline — NSE Annual Report PDF Extraction
===========================================================
Downloads annual/integrated reports from NSE corporate filings
and extracts segment revenue/profit/asset tables.

Pipeline:
  NSE API → find annual report PDF → download → pdfplumber → segment tables → JSON

Usage:
  python scripts/extract_segments.py --ticker ITC
  python scripts/extract_segments.py --list scripts/data_collector/nifty250_tickers.txt --max 10
"""

import sys, os, re, json, time, requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
PDF_DIR = os.path.join(ROOT, "public", "data", "annual_reports")
OUTPUT_FILE = os.path.join(ROOT, "public", "data", "segment_data.json")
os.makedirs(PDF_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

# ── NSE Session ──────────────────────────────────────────────────────────────
_NSE = None
def nse():
    global _NSE
    if _NSE is None:
        s = requests.Session()
        s.headers.update({"User-Agent": HEADERS["User-Agent"], "Accept": "application/json,text/html,*/*", "Referer": "https://www.nseindia.com/"})
        s.get("https://www.nseindia.com", timeout=15)
        _NSE = s
    return _NSE

# ── Find Annual Report PDF ──────────────────────────────────────────────────
def find_annual_report(symbol, max_items=200):
    """Search NSE corporate announcements for the latest annual/integrated report."""
    try:
        s = nse()
        r = s.get(f"https://www.nseindia.com/api/corporate-announcements?index=equities&symbol={symbol}", timeout=20)
        if r.status_code != 200:
            return None, None
        
        items = r.json()
        items = items if isinstance(items, list) else items.get('items', items.get('data', []))
        
        # Find the BEST annual/integrated report (scan all, pick highest score)
        best_url, best_date, best_score = None, None, 0
        
        for item in items[:max_items]:
            desc = str(item.get('desc', '')).lower() + str(item.get('attchmntText', '')).lower()
            pdf = item.get('attchmntFile', '')
            
            # Skip non-financial filings
            skip_keywords = ['voting', 'newspaper', 'newspaper publication', 'scrutinizer', 'newspaper advert']
            if any(sk in desc for sk in skip_keywords):
                continue
            
            score = 0
            if 'integrated' in desc and 'result' in desc and pdf and pdf.endswith('.pdf'):
                score = 3  # Best: Integrated Results
            elif 'integrated' in desc and pdf and pdf.endswith('.pdf'):
                score = 2  # Good: Integrated Report
            elif 'annual' in desc and 'result' in desc and pdf and pdf.endswith('.pdf'):
                score = 1  # OK: Annual Results
            
            if score > best_score:
                best_url, best_date, best_score = pdf, item.get('an_dt', ''), score
        
        if best_url:
            return best_url, best_date, best_score

def find_annual_report_direct(symbol):
    """Try direct URL patterns for known company annual reports.
    Returns list of (year, pdf_url) tuples."""
    # ITC annual reports on itcportal.com
    if symbol == 'ITC':
        base = 'https://www.itcportal.com/content/dam/itc-corporate/pdfs/report-and-accounts'
        results = []
        for year in range(2016, 2026):
            url = f'{base}/ITC-Report-and-Accounts-{year}.pdf'
            results.append((year, url))
        return results
    return []
        
        # Fallback: try BSE
        return None, None, 0
    except Exception as e:
        print(f"  NSE search error: {e}", flush=True)
        return None, None, 0

# ── Download PDF ─────────────────────────────────────────────────────────────
def download_pdf(url, symbol):
    """Download PDF, return path or None."""
    # Create a sensible filename from the URL
    import hashlib
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    path = os.path.join(PDF_DIR, f"{symbol}_{url_hash}.pdf")
    
    if os.path.exists(path) and os.path.getsize(path) > 5000:
        return path
    
    try:
        r = requests.get(url, headers=HEADERS, stream=True, timeout=30)
        if r.status_code != 200:
            return None
        with open(path, 'wb') as f:
            for chunk in r.iter_content(8192):
                if chunk: f.write(chunk)
        return path if os.path.getsize(path) > 5000 else None
    except:
        return None

# ── Extract Segment Tables ──────────────────────────────────────────────────
def extract_segment_table(pdf_path):
    """Extract segment data from PDF using text-based parsing (tables are too complex for pdfplumber's table detector)."""
    try:
        import pdfplumber
    except ImportError:
        print("  Install pdfplumber: pip install pdfplumber", flush=True)
        return None

    results = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                text_lower = text.lower()
                
                if 'segment' not in text_lower:
                    continue
                
                # Find segment data sections by looking for patterns like "1. Segment Revenue"
                sections = re.findall(r'(\d+)\.\s*(Segment\s+\w+)', text, re.IGNORECASE)
                
                # Extract segment lines: parse text lines with numeric data
                segment_lines = []
                for line in text.split('\n'):
                    line_stripped = line.strip()
                    # Match segment lines like: "a) FMCG -Cigarettes 8136.29 7548.75 ..."
                    m = re.match(r'^([a-e]\)\s*.+?)\s+(\d[\d.,\s-]+)$', line_stripped)
                    if m:
                        name = m.group(1).strip()
                        nums = re.findall(r'[\d,.]+', m.group(2))
                        segment_lines.append({
                            'name': name,
                            'values': nums,
                        })
                
                if sections or segment_lines:
                    results.append({
                        'page': page.page_number,
                        'raw_text': text,
                        'sections_found': [f"{s[0]}. {s[1]}" for s in sections],
                        'segment_lines': segment_lines[:20],
                    })
        
        return results if results else None
    except Exception as e:
        print(f"  PDF error: {e}", flush=True)
        return None

# ── Process One Company ─────────────────────────────────────────────────────
def process_one(symbol):
    """Full pipeline for one company. Returns segment data dict or None."""
    print(f"  {symbol}: ", end='', flush=True)
    
    pdf_url, date, score = find_annual_report(symbol)
    if not pdf_url:
        print(f"no annual report found", flush=True)
        return None
    
    pdf_path = download_pdf(pdf_url, symbol)
    if not pdf_path:
        print(f"download failed", flush=True)
        return None
    
    segments = extract_segment_table(pdf_path)
    if not segments:
        print(f"no segment data in PDF", flush=True)
        return None
    
    print(f"{len(segments)} segment tables ({os.path.getsize(pdf_path)//1024} KB)", flush=True)
    return {
        'symbol': symbol,
        'pdf_url': pdf_url,
        'filing_date': date,
        'tables': segments,
    }

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--ticker', help='Single ticker')
    parser.add_argument('--list', help='File with tickers')
    parser.add_argument('--max', type=int, default=0, help='Max companies to process')
    args = parser.parse_args()
    
    all_results = {}
    
    if args.ticker:
        r = process_one(args.ticker.upper())
        if r: all_results[r['symbol']] = r
    
    elif args.list:
        with open(os.path.join(ROOT, args.list)) as f:
            tickers = [line.strip() for line in f if line.strip()]
        if args.max > 0: tickers = tickers[:args.max]
        print(f"Processing up to {len(tickers)} companies...\n", flush=True)
        
        for t in tickers:
            r = process_one(t)
            if r: all_results[r['symbol']] = r
            time.sleep(2)  # be respectful
    
    else:
        # Default: test with a few companies
        for t in ['ITC', 'RELIANCE', 'TCS', 'HDFCBANK']:
            r = process_one(t)
            if r: all_results[r['symbol']] = r
            time.sleep(2)
    
    # Save results
    if all_results:
        output = {
            'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'source': 'nse-annual-reports',
            'companies': all_results,
        }
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, default=str)
        print(f"\nSaved {len(all_results)} companies to {OUTPUT_FILE}", flush=True)
    else:
        print("\nNo segment data extracted", flush=True)

if __name__ == '__main__':
    main()
