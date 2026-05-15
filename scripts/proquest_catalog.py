#!/usr/bin/env python3
"""ProQuest Catalog — Robust Version"""
import json, re, time, csv
from pathlib import Path
from playwright.sync_api import sync_playwright

COOKIE_FILE = "scripts/proquest_cookies.json"
CATALOG_FILE = "public/data/proquest_catalog.csv"
PUB_ID = "1356372"
ACCOUNT_ID = "9902"

COMPANIES = [
    {"symbol": "TCS", "search": "tata consultancy services"},
    {"symbol": "INFY", "search": "infosys"},
    {"symbol": "RELIANCE", "search": "reliance industries"},
    {"symbol": "HDFCBANK", "search": "hdfc bank"},
    {"symbol": "ICICIBANK", "search": "icici bank"},
    {"symbol": "WIPRO", "search": "wipro"},
    {"symbol": "HCLTECH", "search": "hcl technologies"},
    {"symbol": "ITC", "search": "itc limited"},
    {"symbol": "LT", "search": "larsen toubro"},
    {"symbol": "SUNPHARMA", "search": "sun pharmaceutical"},
    {"symbol": "TATAMOTORS", "search": "tata motors"},
    {"symbol": "TATASTEEL", "search": "tata steel"},
    {"symbol": "MARUTI", "search": "maruti suzuki"},
    {"symbol": "ASIANPAINT", "search": "asian paints"},
    {"symbol": "BHARTIARTL", "search": "bharti airtel"},
    {"symbol": "AXISBANK", "search": "axis bank"},
    {"symbol": "SBIN", "search": "state bank of india"},
    {"symbol": "KOTAKBANK", "search": "kotak mahindra bank"},
    {"symbol": "BAJFINANCE", "search": "bajaj finance"},
    {"symbol": "HINDUNILVR", "search": "hindustan unilever"},
]

def main():
    print("Starting ProQuest Catalog...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to ProQuest...")
        page.goto("https://www.proquest.com/?accountid=9902", timeout=20000, wait_until="domcontentloaded")
        time.sleep(5) # Stabilize

        # Save cookies immediately
        cookies = context.cookies()
        with open(COOKIE_FILE, "w") as f:
            json.dump(cookies, f)
        print(f"Cookies saved ({len(cookies)}).")

        all_data = []
        for co in COMPANIES:
            print(f"\n> Searching {co['symbol']}...")
            query = f'"{co["search"]}" AND PUBID({PUB_ID}) AND DOCTYPE(report)'
            url = f"https://www.proquest.com/reports/results/index?accountid={ACCOUNT_ID}&q={query}&startPage=0&rows=20"
            
            try:
                page.goto(url, timeout=20000, wait_until="domcontentloaded")
                time.sleep(4)
                
                # Get total count if possible
                count_text = page.text_content("#totalResultsCount") or "0"
                print(f"  Total: {count_text}")

                # Parse page 1
                items = parse_page(page)
                for i in items: i["symbol"] = co["symbol"]
                all_data.extend(items)
                print(f"  Page 1: {len(items)} items")

                # Pagination (max 5 pages to avoid infinite loops)
                for p_idx in range(1, 5):
                    nxt = page.query_selector("a[aria-label='Next page']")
                    if not nxt: break
                    nxt.click()
                    time.sleep(3)
                    
                    more = parse_page(page)
                    if not more: break
                    for i in more: i["symbol"] = co["symbol"]
                    all_data.extend(more)
                    print(f"  Page {p_idx+1}: {len(more)} items")
            except Exception as e:
                print(f"  Error: {e}")

        # Save
        Path(CATALOG_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(CATALOG_FILE, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["symbol", "title", "year", "type", "has_pdf", "size"])
            w.writeheader()
            w.writerows(all_data)
        
        print(f"\nDONE. Cataloged {len(all_data)} items.")
        print(f"Saved to {CATALOG_FILE}")
        browser.close()

def parse_page(page):
    items = []
    try:
        # Try multiple selectors
        rows = page.query_selector_all(".resultItem, li.result-item, article.result-item")
        if not rows:
            # Fallback for newer UI
            rows = page.query_selector_all('[data-testid="search-result"]')
        
        for r in rows:
            try:
                t_el = r.query_selector("a.titleLink, h3.title a, a[data-testid='result-title']")
                if not t_el: continue
                title = t_el.inner_text().strip()
                url = t_el.get_attribute("href") or ""
                doc_id = re.search(r'/docview/(\d+)', url)
                
                year_m = re.search(r"\b(19|20)\d{2}\b", title)
                t_lower = title.lower()
                r_type = "annual" if "annual" in t_lower else ("interim" if any(x in t_lower for x in ["interim", "quarter", "q1"]) else "other")
                
                p_el = r.query_selector("a:has-text('PDF')")
                has_pdf = bool(p_el)
                size = "unknown"
                if p_el:
                    s_m = re.search(r"\((\d+\s*(?:MB|KB))\)", p_el.inner_text())
                    size = s_m.group(1) if s_m else "small"

                items.append({
                    "symbol": "", "title": title, "doc_id": doc_id.group(1) if doc_id else "",
                    "year": year_m.group(0) if year_m else "unknown", "type": r_type,
                    "has_pdf": has_pdf, "size": size
                })
            except: continue
    except Exception as e:
        print(f"  Parse error: {e}")
    return items

if __name__ == "__main__":
    main()
