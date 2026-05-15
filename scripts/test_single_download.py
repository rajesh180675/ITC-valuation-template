#!/usr/bin/env python3
"""Simple: Dismiss cookie popup, click PDF button, save file."""
import json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

COOKIE_FILE = "scripts/proquest_cookies.json"
PDF_DIR = Path("public/data/annual_reports") / "TCS"
DOC_ID = "3250368554"
YEAR = "2025"

with open(COOKIE_FILE) as f:
    raw = json.load(f)

cookies = []
for c in raw:
    pw = {"name": c["name"], "value": c["value"], "domain": c["domain"], "path": c.get("path", "/")}
    if c.get("httpOnly"): pw["httpOnly"] = True
    if c.get("secure"): pw["secure"] = True
    cookies.append(pw)

PDF_DIR.mkdir(parents=True, exist_ok=True)
fp = PDF_DIR / f"TCS_AR_{YEAR}.pdf"

with sync_playwright() as p:
    b = p.chromium.launch(headless=False)
    ctx = b.new_context(accept_downloads=True)
    ctx.add_cookies(cookies)
    page = ctx.new_page()

    print("Opening ProQuest...")
    page.goto("https://www.proquest.com/?accountid=9902", timeout=60000)
    time.sleep(5)

    # Dismiss cookie consent
    try:
        accept_btn = page.query_selector("#onetrust-accept-btn-handler")
        if accept_btn:
            accept_btn.click()
            print("Cookie consent accepted")
            time.sleep(2)
    except:
        print("No cookie popup")

    url = f"https://www.proquest.com/docview/{DOC_ID}/abstract?accountid=9902"
    print(f"Going to document...")
    page.goto(url, timeout=60000)
    time.sleep(8)

    # Dismiss cookie consent again (if it appears)
    try:
        accept_btn = page.query_selector("#onetrust-accept-btn-handler")
        if accept_btn:
            accept_btn.click()
            print("Cookie consent accepted (2)")
            time.sleep(2)
    except:
        pass

    # Find PDF button and click
    btn = page.query_selector("a[href*='fulltextPDF'], a[href*='media.proquest']")
    if not btn:
        # Fallback: find by text
        for a in page.query_selector_all("a"):
            if "PDF" in a.inner_text():
                btn = a
                break
    
    if btn:
        href = btn.get_attribute("href") or ""
        print(f"PDF button href: {href[:80]}...")
        
        with page.expect_download(timeout=120000) as dl_info:
            btn.click()
            print("Clicked, waiting for download...")
        
        dl = dl_info.value
        print(f"Download: {dl.suggested_filename}")
        dl.save_as(str(fp))
        sz = fp.stat().st_size
        print(f"Saved {fp.name} ({sz/1e6:.1f} MB)")
    else:
        print("No PDF button found")
        page.screenshot(path="debug.png")

    b.close()
