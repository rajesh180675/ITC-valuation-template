#!/usr/bin/env python3
"""Check search results — shows yearly breakdown, no download."""
import json, time, re
from pathlib import Path
from playwright.sync_api import sync_playwright

COOKIE_FILE = "scripts/proquest_cookies.json"

with open(COOKIE_FILE) as f:
    raw = json.load(f)

cookies = []
for c in raw:
    pw = {"name": c["name"], "value": c["value"], "domain": c["domain"], "path": c.get("path", "/")}
    if c.get("httpOnly"): pw["httpOnly"] = True
    if c.get("secure"): pw["secure"] = True
    cookies.append(pw)

with sync_playwright() as p:
    b = p.chromium.launch(headless=False)
    ctx = b.new_context()
    ctx.add_cookies(cookies)
    page = ctx.new_page()

    # Warm up
    page.goto("https://www.proquest.com/?accountid=9902", timeout=60000)
    time.sleep(3)
    try:
        btn = page.query_selector("#onetrust-accept-btn-handler")
        if btn: btn.click(); time.sleep(1)
    except: pass

    # Navigate to exact search results URL
    url = "https://www.proquest.com/results/C46784A1EEB54C22PQ/1?accountid=9902"
    print(f"Opening results page...")
    page.goto(url, timeout=60000)
    time.sleep(8)

    # Get total count
    count_el = page.query_selector("#totalResultsCount, .resultCount")
    total = count_el.inner_text().strip() if count_el else "?"
    print(f"\nTotal results: {total}\n")

    # Extract each result
    docs = []
    results = page.query_selector_all(".resultItem, li.result-item, article.result-item")
    
    for r in results:
        try:
            t_el = r.query_selector("a")
            if not t_el: continue
            title = t_el.inner_text().strip()
            href = t_el.get_attribute("href") or ""
            doc_id = re.search(r'/docview/(\d+)', href)
            
            year_m = re.search(r"\b(19|20)\d{2}\b", title)
            year = year_m.group(0) if year_m else "unknown"
            
            pdf_el = r.query_selector("a:has-text('PDF')")
            pdf_size = "?"
            if pdf_el:
                sz_m = re.search(r"\((\d+\s*(?:MB|KB))\)", pdf_el.inner_text())
                pdf_size = sz_m.group(1) if sz_m else "?"
            
            docs.append({
                "year": year,
                "doc_id": doc_id.group(1) if doc_id else "?",
                "title": title[:80],
                "pdf_size": pdf_size
            })
            print(f"  {year}: ID={doc['doc_id']}, PDF={pdf_size}")
        except: pass

    # Show which years we already have vs missing
    print(f"\n--- Report {len(docs)} results found ---")
    existing = [f.stem.split("_")[-1] for f in Path("public/data/annual_reports/TCS").glob("*.pdf") if f.stat().st_size > 10000]
    print(f"Already downloaded: {', '.join(sorted(existing))}")
    missing = [d["year"] for d in docs if d["year"] not in existing]
    print(f"Need to download:  {', '.join(missing) if missing else 'NONE'}")
    print(f"Estimated total:   {sum(int(d['pdf_size'].split()[0]) for d in docs if d['pdf_size'] not in ['?', 'unknown'])} MB")

    b.close()
