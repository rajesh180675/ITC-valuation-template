#!/usr/bin/env python3
"""
Discover + download ALL 20 TCS annual reports from ProQuest.
Uses the session-specific results URL: C46784A1EEB54C22PQ
"""
import json, time, re
from pathlib import Path
from playwright.sync_api import sync_playwright

COOKIE_FILE = "scripts/proquest_cookies.json"
PDF_DIR = Path("public/data/annual_reports") / "TCS"
INDEX_FILE = Path("scripts") / "tcs_all_years.json"

with open(COOKIE_FILE) as f:
    raw = json.load(f)

cookies = []
for c in raw:
    pw = {"name": c["name"], "value": c["value"], "domain": c["domain"], "path": c.get("path", "/")}
    if c.get("httpOnly"): pw["httpOnly"] = True
    if c.get("secure"): pw["secure"] = True
    cookies.append(pw)

PDF_DIR.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(headless=False)
    ctx = b.new_context(accept_downloads=True)
    ctx.add_cookies(cookies)
    page = ctx.new_page()

    page.goto("https://www.proquest.com/?accountid=9902", timeout=60000)
    time.sleep(3)
    try:
        btn = page.query_selector("#onetrust-accept-btn-handler")
        if btn: btn.click(); time.sleep(1)
    except: pass

    url = "https://www.proquest.com/results/C46784A1EEB54C22PQ/1?accountid=9902"
    print("Opening search results...")
    page.goto(url, timeout=60000)
    time.sleep(8)

    docs = []
    results = page.query_selector_all(".resultItem, li.result-item, article.result-item")
    
    for r in results:
        try:
            text = r.inner_text()
            # Year from title
            year_m = re.search(r"Annual Report[\s,\-\.]*(\d{4})", text)
            year = year_m.group(1) if year_m else "?"
            
            # Doc ID from any link
            doc_id = None
            for lnk in r.query_selector_all("a"):
                h = lnk.get_attribute("href")
                if h:
                    m = re.search(r'/docview/(\d+)', h)
                    if m: doc_id = m.group(1); break
            
            # PDF size
            sz_m = re.search(r"\((\d+\s*MB)\)", text)
            pdf_size = sz_m.group(1) if sz_m else "?"
            
            if year != "?" and doc_id:
                docs.append({"year": year, "doc_id": doc_id, "pdf_size": pdf_size})
                print(f"  {year}: ID={doc_id}, PDF={pdf_size}")
        except: pass

    print(f"\n=== Found {len(docs)} TCS annual reports ===")
    
    existing = set()
    for f in PDF_DIR.glob("*.pdf"):
        if f.stat().st_size > 10000:
            existing.add(f.stem.split("_")[-1])
    
    missing = [d for d in docs if d["year"] not in existing]
    have = [d for d in docs if d["year"] in existing]
    
    print(f"Already have: {len(have)} years ({', '.join(sorted(d['year'] for d in have))})")
    print(f"Need to download: {len(missing)} years ({', '.join(sorted(d['year'] for d in missing))})")
    
    if missing:
        print(f"\n=== Downloading {len(missing)} PDFs ===")
        for i, doc in enumerate(missing):
            year = doc["year"]
            fp = PDF_DIR / f"TCS_AR_{year}.pdf"
            print(f"[{i+1}/{len(missing)}] {year}: {doc['pdf_size']}...")
            
            page.goto(f"https://www.proquest.com/docview/{doc['doc_id']}/abstract?accountid=9902", timeout=60000)
            time.sleep(8)
            
            btn = page.query_selector("a[href*='fulltextPDF'], a[href*='media.proquest']")
            if not btn:
                for a in page.query_selector_all("a"):
                    if "PDF" in a.inner_text():
                        btn = a; break
            
            if btn:
                with page.expect_download(timeout=120000) as dl:
                    btn.click()
                dl.value.save_as(str(fp))
                print(f"  saved ({fp.stat().st_size/1e6:.1f} MB)")
            else:
                print(f"  no PDF button")
            time.sleep(5)
    
    b.close()
    
    print(f"\n=== Complete ===")
    real = [f for f in sorted(PDF_DIR.glob("*.pdf")) if f.stat().st_size > 10000]
    print(f"Total: {len(real)} PDFs")
    for f in real:
        print(f"  {f.stem}: {f.stat().st_size/1e6:.1f} MB")
