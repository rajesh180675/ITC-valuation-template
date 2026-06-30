#!/usr/bin/env python3
"""
Discover annual report PDF links from company IR pages using Playwright.
Run with: py -3.14 scripts/discover_ir_links.py <TICKER>
"""
import sys, re, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

IR_PAGES = {
    'INFY':       'https://www.infosys.com/investors/reports-filings/annual-report/annual-reports.html',
    'HINDUNILVR': 'https://www.hul.co.in/investor-relations/annual-reports/',
    'BHARTIARTL': 'https://www.airtel.in/investors/investor-reports/annual-reports',
    'HDFCBANK':   'https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?folderPath=/Common/Investor-Relations/Annual-Reports/',
    'ICICIBANK':  'https://www.icicibank.com/investor-relations/annualreport',
}

TICKER = sys.argv[1].upper() if len(sys.argv) > 1 else 'INFY'
URL    = IR_PAGES.get(TICKER)
if not URL:
    print(f"Unknown ticker: {TICKER}. Available: {list(IR_PAGES.keys())}")
    sys.exit(1)

OUT = Path(f"scripts/{TICKER.lower()}_ir_index.json")

print(f"Navigating to {TICKER} IR page: {URL}")

with sync_playwright() as p:
    b   = p.chromium.launch(headless=False)
    ctx = b.new_context(viewport={"width": 1400, "height": 900})
    page = ctx.new_page()
    page.goto(URL, timeout=60000, wait_until="domcontentloaded")
    time.sleep(6)

    # Dismiss cookie banners
    for sel in ["#onetrust-accept-btn-handler", "button:has-text('Accept')",
                "button:has-text('Accept All')", "button:has-text('I Accept')"]:
        try:
            btn = page.query_selector(sel)
            if btn and btn.is_visible():
                btn.click(); time.sleep(1); break
        except: pass

    time.sleep(3)

    # Extract all PDF links
    links = page.evaluate("""() => {
        const results = [];
        for (const a of document.querySelectorAll('a')) {
            const href = a.href || '';
            const text = a.innerText.trim();
            if (href.includes('.pdf') || href.includes('/download') ||
                text.toLowerCase().includes('annual report') ||
                text.toLowerCase().includes('download')) {
                if (href && href.startsWith('http')) {
                    results.push({text: text.substring(0, 100), href});
                }
            }
        }
        return results;
    }""")

    print(f"\nFound {len(links)} candidate links:")
    for l in links[:30]:
        print(f"  {l['text'][:60]:<60} | {l['href'][:80]}")

    # Also show full page text snapshot for year detection
    page_text = page.evaluate("() => document.body.innerText.substring(0, 3000)")
    print(f"\n--- Page text (first 1500 chars) ---")
    print(page_text[:1500])

    b.close()

# Save raw links for manual inspection / further processing
OUT.write_text(json.dumps(links, indent=2))
print(f"\nSaved {len(links)} links to {OUT}")
