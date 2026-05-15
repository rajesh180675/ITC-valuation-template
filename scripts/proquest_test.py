#!/usr/bin/env python3
"""ProQuest Catalog — Robust Search (Uses Saved Cookies)"""
import json, re, time, csv
from pathlib import Path
from playwright.sync_api import sync_playwright

COOKIE_FILE = "scripts/proquest_cookies.json"
CATALOG_FILE = "public/data/proquest_catalog.csv"
PUB_ID = "1356372"
ACCOUNT_ID = "9902"

# Just test TCS first
COMPANIES = [
    {"symbol": "TCS", "search": "tata consultancy services"},
]

def main():
    print("=== ProQuest Catalog ===")
    
    # Load cookies
    if not Path(COOKIE_FILE).exists():
        print("ERROR: No cookies found. Run the login script first.")
        return

    with open(COOKIE_FILE) as f:
        cookies = json.load(f)
    print(f"Loaded {len(cookies)} cookies.")

    with sync_playwright() as p:
        # Headless=False to see what's happening
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        context.add_cookies(cookies)
        page = context.new_page()

        for co in COMPANIES:
            print(f"\n> Searching {co['symbol']}...")
            
            # 1. Go to Search URL
            query = f'"{co["search"]}" AND PUBID({PUB_ID}) AND DOCTYPE(report)'
            url = f"https://www.proquest.com/reports/results/index?accountid={ACCOUNT_ID}&q={query}&startPage=0&rows=20"
            
            print(f"  URL: {url}")
            try:
                page.goto(url, timeout=60000, wait_until="domcontentloaded")
                print("  Page loaded. Waiting for results...")
                time.sleep(10) # Long wait for SPA to render
                
                # 2. Check for results
                content = page.content()
                if "No results" in content:
                    print("  No results found.")
                    continue
                
                # 3. Extract Results
                # Try to find result items
                items = []
                rows = page.query_selector_all(".resultItem, li.result-item, article.result-item, [data-testid='search-result']")
                print(f"  Found {len(rows)} result elements.")
                
                for r in rows:
                    try:
                        t_el = r.query_selector("a")
                        if t_el:
                            title = t_el.inner_text().strip()
                            items.append(title)
                            print(f"    - {title[:50]}...")
                    except: pass

                if not items:
                    print("  Could not parse results. Saving screenshot for debug.")
                    page.screenshot(path="debug_search.png")
                    print("  Saved debug_search.png")
                else:
                    print(f"  Success! Found {len(items)} items.")

            except Exception as e:
                print(f"  ERROR: {e}")
                page.screenshot(path="debug_error.png")

        browser.close()

if __name__ == "__main__":
    main()
