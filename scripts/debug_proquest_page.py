#!/usr/bin/env python3
"""
Debug: Inspect ProQuest page for PDF download elements
"""
import json, time
from playwright.sync_api import sync_playwright

COOKIE_FILE = "scripts/proquest_cookies.json"

with open(COOKIE_FILE) as f:
    raw_cookies = json.load(f)

pw_cookies = []
for c in raw_cookies:
    pw = {"name": c["name"], "value": c["value"], "domain": c["domain"], "path": c.get("path", "/")}
    if c.get("httpOnly"): pw["httpOnly"] = True
    if c.get("secure"): pw["secure"] = True
    pw_cookies.append(pw)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(accept_downloads=True)
    context.add_cookies(pw_cookies)
    page = context.new_page()

    # Go to TCS 2025 abstract page
    page.goto("https://www.proquest.com/docview/3250368554/abstract?accountid=9902", wait_until="domcontentloaded", timeout=30000)
    time.sleep(5)

    # Dump all links with "PDF" or "Download" text
    links = page.evaluate('''() => {
        const all = document.querySelectorAll('a');
        return Array.from(all).map(a => ({
            text: a.innerText.trim(),
            href: a.href,
            class: a.className,
            onclick: a.getAttribute('onclick') ? a.getAttribute('onclick').substring(0,100) : null
        })).filter(a => a.text.toLowerCase().includes('pdf') || a.text.toLowerCase().includes('download'));
    }''')

    print("=== PDF/Download Links ===")
    for l in links:
        print(f"Text: {l['text']}")
        print(f"Href: {l['href']}")
        print(f"Class: {l['class']}")
        print(f"OnClick: {l['onclick']}")
        print()

    # Also check for PDF viewer iframe/embed
    embeds = page.evaluate('''() => {
        const all = document.querySelectorAll('embed, iframe, object');
        return Array.from(all).map(e => ({
            tag: e.tagName,
            src: e.src || e.getAttribute('data') || '',
            class: e.className
        }));
    }''')

    print("=== Embeds ===")
    for e in embeds:
        print(f"Tag: {e['tag']}, Src: {e['src'][:200]}, Class: {e['class']}")

    browser.close()
