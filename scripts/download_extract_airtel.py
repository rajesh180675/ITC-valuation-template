"""
Bharti Airtel: annual report PDF downloader + segment extractor.
Run directly: py -3.14 scripts/download_extract_airtel.py

Strategy:
  Navigate to Airtel IR annual-results page, discover years via Playwright,
  download PDFs to public/data/annual_reports/BHARTIARTL/, extract segments.

Known PDF URL patterns:
  Current (FY2024-FY2025): assets.airtel.in/.../annual_results_YYYY_YY/Integrated_Report_...pdf
  FY2023: assets.airtel.in/teams/simplycms/ADTECH/docs/Integrated_Report...pdf
  FY2022: assets.airtel.in/teams/simplycms/web/docs/Airtel-Integrated_...2022.pdf
  FY2021: same path /docs/Airtel-Integrated_...2021.pdf
  FY2020: same path /docs/Airtel-Integrated_...2019-20.pdf
  FY2011: s3-ap-southeast-1.amazonaws.com/bsy/iportal/images/Bharti_Airtel_annual_report_full_2010-2011_....pdf
"""

import json
import os
import re
import sys
import time

import requests
import fitz  # PyMuPDF
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = os.path.join(BASE_DIR, "public", "data", "annual_reports", "BHARTIARTL")
OUTPUT_FILE = os.path.join(BASE_DIR, "public", "data", "segment_data_bhartiairtel.json")
INDEX_FILE = os.path.join(BASE_DIR, "scripts", "bhartiairtel_ar_index.json")
INDEX_CSV = os.path.join(BASE_DIR, "scripts", "bhartiairtel_ar_index.csv")

# Direct PDF URLs discovered from browser inspection
KNOWN_URLS = {
    "FY2025": "https://assets.airtel.in/static-assets/cms/investor/docs/annual_results_2024_25/Integrated_Report_and_Annual_Financial_Statements.pdf",
    "FY2024": "https://assets.airtel.in/static-assets/cms/investor/docs/annual_results_2023_24/Integrated_Report_and_Financial_Statements.pdf",
    "FY2023": "https://assets.airtel.in/teams/simplycms/ADTECH/docs/Integrated_Report_and_Annual_Financial_Statements.pdf",
    "FY2022": "https://assets.airtel.in/teams/simplycms/web/docs/Airtel-Integrated_Report_and_Annual_Financial_Statements_2022.pdf",
    "FY2021": "https://assets.airtel.in/teams/simplycms/web/docs/Airtel-Integrated_Report_and_Annual_Financial_Statements_2021.pdf",
    "FY2020": "https://assets.airtel.in/teams/simplycms/web/docs/Airtel-Integrated_Report_and_Annual_Financial_Statements_2019-20.pdf",
    "FY2011": "https://s3-ap-southeast-1.amazonaws.com/bsy/iportal/images/Bharti_Airtel_annual_report_full_2010-2011_BA648979A0942D8368CA16C0D9A45955.pdf",
}


def try_construct_url(fy):
    """Try constructing URL for a fiscal year by pattern matching."""
    year_num = int(fy.replace("FY", ""))
    prev = str(year_num - 1)
    cur_short = str(year_num)[-2:]
    # Try both naming conventions
    results = [
        f"https://assets.airtel.in/static-assets/cms/investor/docs/annual_results_{prev}_{cur_short}/Integrated_Report_and_Annual_Financial_Statements.pdf",
        f"https://assets.airtel.in/static-assets/cms/investor/docs/annual_results_{prev}_{cur_short}/Integrated_Report_and_Financial_Statements.pdf",
    ]
    # Add older pattern for FY2019-FY2023 range
    if year_num <= 2023:
        results.append(
            f"https://assets.airtel.in/teams/simplycms/ADTECH/docs/Integrated_Report_and_Annual_Financial_Statements.pdf"
        )
    return results


def discover_years_via_browser():
    """
    Use Playwright to open the IR page and discover all available years &
    PDF links by interacting with the JS-rendered dropdown + accordion.
    """
    print("\n=== Discovering years via browser ===")
    all_pdfs = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(15000)

        try:
            page.goto(
                "https://www.airtel.in/about-bharti/equity/results/annual-results",
                wait_until="domcontentloaded",
                timeout=30000,
            )
            # Wait for JS to render
            page.wait_for_timeout(3000)

            # Strategy: the page has a custom JS year selector.
            # Try to find hidden options in the page's JS data or DOM.

            # Check for <select> elements
            selects = page.locator("select")
            n_selects = selects.count()
            print(f"  <select> elements: {n_selects}")

            for si in range(n_selects):
                sel = selects.nth(si)
                name = sel.get_attribute("name") or sel.get_attribute("id") or ""
                print(f"    Select #{si}: name={name}")
                opts = sel.locator("option")
                n_opts = opts.count()
                for oi in range(n_opts):
                    opt = opts.nth(oi)
                    val = opt.get_attribute("value") or ""
                    txt = opt.text_content() or ""
                    print(f"      option: value={val!r} text={txt!r}")

            # Check for aria-labels/tab-indexed divs that look like year selectors
            selector_div = page.locator(
                '[class*="year"]:has-text("20"), [class*="Year"]:has-text("20"), [class*="select"]'
            ).first
            if selector_div.is_visible():
                print(f"  Found year-related element: {selector_div.evaluate('el => el.outerHTML')[:300]}")

            # Try getting the full page text to find year patterns
            body_text = page.locator("body").text_content()
            year_matches = set(re.findall(r"\b20\d{2}[-/]\d{2}\b", body_text))
            print(f"  Year patterns in body text: {sorted(year_matches)[:30]}")

            # Look for the accordion structure - the page may load all years
            # in separate hidden sections
            accordion_btns = page.locator("button").filter(has_text="Annual Report")
            n_btns = accordion_btns.count()
            print(f"  'Annual Report' buttons: {n_btns}")

            # Click all accordion buttons to expand panels
            for bi in range(n_btns):
                try:
                    btn = accordion_btns.nth(bi)
                    btn.click()
                    page.wait_for_timeout(300)
                except Exception:
                    pass

            # After clicking, look for PDF links in all panels
            pdf_links = page.locator("a[href*='.pdf']").filter(has_text=re.compile(r"integrated|annual", re.I))
            n_pdfs = pdf_links.count()
            print(f"  PDF links (annual/integrated): {n_pdfs}")
            for pi in range(min(n_pdfs, 30)):
                try:
                    href = pdf_links.nth(pi).get_attribute("href")
                    link_text = pdf_links.nth(pi).text_content()[:80]
                    print(f"    [{pi}] {link_text}: {href}")
                    all_pdfs[href] = link_text
                except Exception:
                    pass

        except Exception as e:
            print(f"  Browser error: {e}")
        finally:
            browser.close()

    return all_pdfs


def download_pdf(url, dest_path, fy):
    """Download a PDF file. Returns True on success."""
    try:
        r = requests.get(url, timeout=120, allow_redirects=True)
        if r.status_code == 200 and len(r.content) > 50000:
            with open(dest_path, "wb") as f:
                f.write(r.content)
            print(f"  [{fy}] OK ({len(r.content)//1024} KB)")
            return True
        else:
            print(f"  [{fy}] HTTP {r.status_code} ({len(r.content)} bytes)")
            return False
    except Exception as e:
        print(f"  [{fy}] Error: {e}")
        return False


def extract_segments(pdf_path, fy):
    """Extract segment data from a Bharti Airtel AR PDF using PyMuPDF."""
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"  [{fy}] Cannot open: {e}")
        return None

    total_pages = len(doc)
    print(f"  [{fy}] {total_pages} pages")

    # Find the segment note
    seg_note_num = None
    seg_page = None
    for page_num in range(total_pages):
        text_lower = doc[page_num].get_text().lower()
        # Look for "Note X - Segment" or "Note X : Segment" or similar
        m = re.search(r"note\s+(\d+)[\s:.-]+segment", text_lower)
        if m:
            seg_note_num = int(m.group(1))
            seg_page = page_num
            # Get surrounding text for context
            text = doc[page_num].get_text()
            lines = text.split('\n')
            # Find the line with the segment note and show context
            for i, line in enumerate(lines):
                if re.search(rf"note\s+{seg_note_num}[\s:.-]+segment", line.lower()):
                    start = max(0, i-2)
                    end = min(len(lines), i+15)
                    context = lines[start:end]
                    print(f"    Found Note {seg_note_num} at page {page_num+1}:")
                    for cl in context:
                        print(f"      {cl[:120]}")
                    break

    if seg_note_num is None:
        # Check for segment mentions in text without note number
        for page_num in range(total_pages):
            text_lower = doc[page_num].get_text().lower()
            if "segment information" in text_lower or "reportable segments" in text_lower:
                print(f"    'segment information' found at page {page_num+1}")
                if seg_page is None:
                    seg_page = page_num
            if "business segments" in text_lower and "revenue" in text_lower:
                print(f"    'business segments revenue' at page {page_num+1}")
                if seg_page is None:
                    seg_page = page_num

    if seg_page is None:
        # Try broader search
        for page_num in range(total_pages):
            text_lower = doc[page_num].get_text().lower()
            if "segment" in text_lower:
                text = doc[page_num].get_text()
                print(f"    Page {page_num+1}: 'segment' mentioned (first 300 chars):")
                print(f"      {text[:300]}")
                seg_page = page_num
                break

    if seg_page is None:
        print(f"  [{fy}] No segment data found")
        doc.close()
        return None

    # Now parse the segment data
    # For Airtel, segments are typically:
    # - Mobile Services India
    # - Airtel Business
    # - Africa
    # - Homes (or Broadband)
    # - Others
    # - Tower Infrastructure (Indus Towers)
    # - Digital TV / DTH

    # Get the pages around the segment note
    start_page = max(0, seg_page - 1)
    end_page = min(total_pages, seg_page + 5)

    # Merge text from relevant pages
    merged_text = ""
    for pn in range(start_page, end_page):
        page = doc[pn]
        text = page.get_text()
        merged_text += f"\n--- PAGE {pn+1} ---\n" + text

    doc.close()

    # Parse the merged text for segment data
    segments = {}
    lines = merged_text.split('\n')

    # Find "Segment Revenue" or "Segment Results" sections
    section = None
    current_seg = None

    # Known segment patterns for telecom
    seg_names = [
        "mobile services", "airtel business", "homes", "broadband",
        "africa", "digital tv", "tower infrastructure", "others",
        "india mobile", "india", "south asia",
    ]

    for i, line in enumerate(lines):
        line_stripped = line.strip()
        if not line_stripped:
            continue

        ll = line_stripped.lower()

        # Detect section headers
        if "segment revenue" in ll or "revenue by segment" in ll:
            section = "revenue"
        elif "segment result" in ll or "segment profit" in ll:
            section = "results"
        elif "segment assets" in ll:
            section = "assets"

        # Try to parse segment data rows
        # A row looks like: "Mobile Services India  12345  23456"
        numbers = re.findall(r'[\d,]+\.?\d*', line_stripped)
        if len(numbers) >= 2 and any(name in ll for name in seg_names):
            # Extract segment name (remove numbers)
            name = line_stripped
            for n in numbers:
                name = name.replace(n, "")
            name = re.sub(r'[,\s]+$', '', name).strip()
            name = re.sub(r'^[,\s]+', '', name).strip()
            # Clean up
            name = re.sub(r'\s+', ' ', name)

            # Extract numbers
            nums = []
            for n in numbers:
                try:
                    nums.append(float(n.replace(",", "")))
                except ValueError:
                    pass

            if section and name and nums:
                seg_key = f"{section}|{name}"
                # FY2025 = current year values (first numbers)
                segments[seg_key] = nums[:2]

    return segments


def main():
    os.makedirs(PDF_DIR, exist_ok=True)

    mode = sys.argv[1] if len(sys.argv) > 1 else "download"

    if mode == "discover":
        all_pdfs = discover_years_via_browser()
        print(f"\nTotal unique PDFs found: {len(all_pdfs)}")
        for url, txt in all_pdfs.items():
            print(f"  {txt[:60]}: {url}")

    elif mode == "download":
        print("=== Downloading known Airtel PDFs ===")
        index = []

        # Download known URLs
        for fy, url in sorted(KNOWN_URLS.items()):
            dest = os.path.join(PDF_DIR, f"BHARTIARTL_AR_{fy}.pdf")
            if os.path.exists(dest) and os.path.getsize(dest) > 50000:
                sz = os.path.getsize(dest) // 1024
                print(f"  [{fy}] already exists ({sz} KB)")
                index.append({"fy": fy, "url": url, "size": os.path.getsize(dest)})
                continue
            if download_pdf(url, dest, fy):
                index.append({"fy": fy, "url": url, "size": os.path.getsize(dest)})

        # Also try constructing URLs for missing years (FY2012-FY2019)
        print("\n=== Trying constructed URLs for missing years ===")
        existing_fys = {e["fy"] for e in index}
        for year_num in range(2012, 2026):
            fy_name = f"FY{year_num}"
            if fy_name in existing_fys:
                continue

            patterns = try_construct_url(fy_name)
            downloaded = False
            for url in patterns:
                if downloaded:
                    break
                try:
                    r = requests.head(url, timeout=15, allow_redirects=True)
                    if r.status_code == 200:
                        dest = os.path.join(PDF_DIR, f"BHARTIARTL_AR_{fy_name}.pdf")
                        if download_pdf(url, dest, fy_name):
                            index.append({"fy": fy_name, "url": url, "size": os.path.getsize(dest)})
                            downloaded = True
                    else:
                        head_sz = r.headers.get("content-length", "?")
                        print(f"  [{fy_name}] HEAD {r.status_code} ({head_sz} B)")
                except Exception as e:
                    pass
        # Save index
        with open(INDEX_FILE, "w") as f:
            json.dump(index, f, indent=2)
        print(f"\nIndex saved: {len(index)} entries → {INDEX_FILE}")

    elif mode == "extract":
        print("=== Extracting segments ===")
        if not os.path.exists(INDEX_FILE):
            print(f"Index not found: {INDEX_FILE}")
            return

        with open(INDEX_FILE) as f:
            index = json.load(f)

        segments_data = {}
        for entry in index:
            fy = entry["fy"]
            pdf_path = os.path.join(PDF_DIR, f"BHARTIARTL_AR_{fy}.pdf")
            if not os.path.exists(pdf_path):
                print(f"  [{fy}] PDF not found")
                continue

            print(f"\n--- {fy} ---")
            result = extract_segments(pdf_path, fy)
            if result:
                segments_data[fy] = result

        # Build output
        output = {
            "symbol": "BHARTIARTL",
            "basis": "consolidated",
            "segment_time_series": segments_data,
        }
        with open(OUTPUT_FILE, "w") as f:
            json.dump(output, f, indent=2)
        print(f"\nOutput saved: {OUTPUT_FILE}")

    elif mode == "all":
        main_download()
        main_extract_segments()

    else:
        print(f"Usage: {sys.argv[0]} [discover|download|extract|all]")


def main_download():
    """Download phase wrapper."""
    print("=== Download phase ===")
    os.makedirs(PDF_DIR, exist_ok=True)
    index = []

    for fy, url in sorted(KNOWN_URLS.items()):
        dest = os.path.join(PDF_DIR, f"BHARTIARTL_AR_{fy}.pdf")
        if os.path.exists(dest) and os.path.getsize(dest) > 50000:
            sz = os.path.getsize(dest) // 1024
            print(f"  [{fy}] already exists ({sz} KB)")
            index.append({"fy": fy, "url": url, "size": os.path.getsize(dest)})
            continue
        if download_pdf(url, dest, fy):
            index.append({"fy": fy, "url": url, "size": os.path.getsize(dest)})

    # Save
    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)
    print(f"\nIndex saved: {len(index)} entries")
    return index


def main_extract_segments():
    """Extraction phase wrapper."""
    print("=== Extraction phase ===")
    if not os.path.exists(INDEX_FILE):
        print(f"Index not found: {INDEX_FILE}")
        return
    with open(INDEX_FILE) as f:
        index = json.load(f)

    for entry in index:
        fy = entry["fy"]
        pdf_path = os.path.join(PDF_DIR, f"BHARTIARTL_AR_{fy}.pdf")
        if not os.path.exists(pdf_path):
            print(f"  [{fy}] PDF not found")
            continue
        print(f"\n--- {fy} ---")
        extract_segments(pdf_path, fy)


if __name__ == "__main__":
    main()
