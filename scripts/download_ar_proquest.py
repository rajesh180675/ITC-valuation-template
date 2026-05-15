#!/usr/bin/env python3
"""
ProQuest Annual Report Downloader
==================================
Logs into ProQuest via Playwright, searches for annual reports by company name,
and downloads the PDFs to the local data directory.

Usage:
  python scripts/download_ar_proquest.py --ticker ITC "Reliance Industries" TCS
"""
import os
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

# --- CONFIG ---
USER = os.getenv("PROQUEST_USER", "carnmell")
PWD = os.getenv("PROQUEST_PASS", "welcome")
BASE_URL = "https://www.proquest.com/"
SAVE_DIR = Path("public/data/annual_reports")
SAVE_DIR.mkdir(parents=True, exist_ok=True)

# --- COMPANY NAME MAP ---
COMPANY_NAMES = {
    "ITC": "ITC Limited",
    "RELIANCE": "Reliance Industries Limited",
    "TCS": "Tata Consultancy Services",
    "HDFCBANK": "HDFC Bank",
    "INFY": "Infosys",
    "HUL": "Hindustan Unilever",
    "WIPRO": "Wipro",
    "BAJFINANCE": "Bajaj Finance",
    "TATAMOTORS": "Tata Motors",
}

def clear_overlays(page):
    """Remove OneTrust overlays that block clicks."""
    page.evaluate("""() => {
        const e = document.getElementById('onetrust-consent-sdk'); if(e) e.remove();
        const f = document.querySelector('.onetrust-pc-dark-filter'); if(f) f.remove();
    }""")

def login(page):
    """Log into ProQuest using the known flow."""
    print("Navigating to ProQuest...")
    page.goto(BASE_URL, wait_until='domcontentloaded', timeout=30000)
    clear_overlays(page)
    
    login_btn = page.get_by_text("Log in through your library").first
    login_btn.click()
    page.wait_for_timeout(3000)
    
    pq_account = page.locator(":has-text('ProQuest Account')").first
    if pq_account.count() > 0:
        clear_overlays(page)
        try:
            pq_account.click()
        except:
            pq_account.click(force=True)
        page.wait_for_timeout(3000)
    # 3. Fill credentials and submit
    clear_overlays(page)
    page.evaluate(f"""() => {{
        const u = document.querySelector('input[name="username"]'); if(u) u.value = '{USER}';
        const p = document.querySelector('input[name="password"]'); if(p) p.value = '{PWD}';
    }}""")
    page.locator("input[name='password']").press("Enter")
    page.wait_for_timeout(10000)
    
    # 4. Verify login
    # Check if we see the user profile or "My Research" instead of "Log in through your library"
    if "Log in through your library" in page.content():
        print("Login FAILED (Still seeing login banner).")
        page.screenshot(path="debug_login_fail.png")
        return False
    else:
        print("Login successful.")
        return True
def search_and_download(page, company_name, ticker):
    """Search for a company's annual reports and download PDFs."""
    print(f"\n--- Searching for {company_name} ---")
    clear_overlays(page)
    
    search_box = page.locator("#searchTerm")
    search_box.click(force=True)
    search_box.fill(f'"{company_name}" AND "Annual Report"')
    page.wait_for_timeout(1000)
    # Click the search button explicitly
    search_btn = page.locator("#expandedSearch")
    search_btn.click(force=True)
    page.wait_for_timeout(10000)
    print(f"Search URL: {page.url}")
    page.screenshot(path="debug_after_search.png")
    print("Saved debug_after_search.png")
    
    clear_overlays(page)
    try:
        doc_type_filter = page.get_by_text("Document type").first
        doc_type_filter.click(force=True)
        page.wait_for_timeout(1000)
        annual_report_checkbox = page.get_by_text("Annual report").first
        annual_report_checkbox.click(force=True)
        page.wait_for_timeout(3000)
    except Exception as e:
        print(f"Could not apply filter: {e}")
        # Save screenshot to debug
        page.screenshot(path="debug_search.png")
        print("Saved debug_search.png")
    
    clear_overlays(page)
    pdf_links = page.locator('a[aria-label*="PDF"], a:has-text("Full Text"), a[title*="PDF"]')
    count = pdf_links.count()
    print(f"Found {count} results with PDF/Full Text.")
    
    # If no results, try a broader search without filter
    if count == 0:
        print("No results found. Trying broader search...")
        # Maybe click the first result link directly?
        results = page.locator('h3 a, .result-title a')
        if results.count() > 0:
            print(f"Found {results.count()} general results.")
            # Save screenshot
            page.screenshot(path="debug_results.png")
    
    for i in range(count):
        clear_overlays(page)
        link = pdf_links.nth(i)
        title = link.inner_text()
        
        year_match = re.search(r'(20\d{2})', title)
        year = year_match.group(1) if year_match else "Unknown"
        
        filename = f"{ticker}_AR_{year}.pdf"
        filepath = SAVE_DIR / filename
        
        if filepath.exists():
            print(f"  Skipping {filename} (already exists)")
            continue
            
        print(f"  Downloading {filename}...")
        try:
            # Click the link - it might open a new tab or a PDF viewer
            with page.expect_event("download") as download_info:
                link.click(force=True)
            download = download_info.value
            download.save_as(filepath)
            print(f"  Saved to {filepath}")
        except Exception as e:
            print(f"  Failed to download {filename}: {e}")
            
def main():
    import argparse
    parser = argparse.ArgumentParser(description="Download Annual Reports from ProQuest")
    parser.add_argument("tickers", nargs="*", default=["ITC"], help="Tickers to download")
    args = parser.parse_args()
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        if login(page):
            for ticker in args.tickers:
                name = COMPANY_NAMES.get(ticker, ticker)
                try:
                    search_and_download(page, name, ticker)
                except Exception as e:
                    print(f"Error processing {ticker}: {e}")
        else:
            print("Aborting due to login failure.")
            
        browser.close()

if __name__ == "__main__":
    main()