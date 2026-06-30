#!/usr/bin/env python3
"""Discover Reliance annual reports — extract years, doc IDs, sizes."""
import json, time, re
from pathlib import Path
from playwright.sync_api import sync_playwright

COOKIE_FILE = "scripts/proquest_cookies.json"
RESULTS_URL = "https://www.proquest.com/results/F3AF46E3B8FD4E84PQ/1?accountid=9902"

def main():
    with open(COOKIE_FILE) as f:
        raw = json.load(f)
    
    cookies = []
    for c in raw:
        entry = {
            "name": c["name"],
            "value": c["value"],
            "domain": c["domain"],
            "path": c.get("path", "/"),
        }
        if c.get("httpOnly"):
            entry["httpOnly"] = True
        if c.get("secure"):
            entry["secure"] = True
        ss = c.get("sameSite", "").lower()
        if ss in ("strict", "lax", "none"):
            entry["sameSite"] = ss.capitalize()
        cookies.append(entry)

    with sync_playwright() as p:
        b = p.chromium.launch(headless=False)
        ctx = b.new_context(viewport={"width": 1400, "height": 900})
        ctx.add_cookies(cookies)
        page = ctx.new_page()
        
        print("Navigating to results page...")
        page.goto(RESULTS_URL, timeout=60000, wait_until="domcontentloaded")
        time.sleep(8)
        
        # Dismiss cookie popup
        try:
            btn = page.query_selector("#onetrust-accept-btn-handler")
            if btn:
                btn.click()
                time.sleep(2)
        except:
            pass
        
        # Get all result items — use the link pattern to find doc IDs
        # Each report has a link like /docview/3088775225
        links = page.query_selector_all("a[href*='/docview/']")
        
        reports = {}
        for a in links:
            href = a.get_attribute("href")
            if not href:
                continue
            m = re.search(r"/docview/(\d+)", href)
            if not m:
                continue
            doc_id = m.group(1)
            
            # Get parent text for year/size
            try:
                text = a.inner_text()
                parent = a.evaluate("el => el.closest('.resultItem, li.result-item')?.innerText || el.parentElement?.innerText || ''")
            except:
                text = ""
                parent = ""
            
            full_text = text + " " + parent
            year_m = re.search(r"Annual Report[,\s]*(\d{4})", full_text)
            year = year_m.group(1) if year_m else "???"
            size_m = re.search(r"PDF\s*\(([^)]+)\)", full_text)
            size = size_m.group(1) if size_m else "?"
            
            if doc_id not in reports:
                reports[doc_id] = {"year": year, "doc_id": doc_id, "size": size}
        
        unique = sorted(reports.values(), key=lambda x: x["year"])
        
        print(f"\n{'Year':<8} {'Doc ID':<12} {'Size':<10}")
        print("-" * 35)
        for r in unique:
            print(f"{r['year']:<8} {r['doc_id']:<12} {r['size']:<10}")
        
        print(f"\nTotal unique: {len(unique)} reports")
        
        with open("scripts/reliance_proquest_index.json", "w") as f:
            json.dump(unique, f, indent=2)
        print("Saved to scripts/reliance_proquest_index.json")
        
        b.close()

if __name__ == "__main__":
    main()
