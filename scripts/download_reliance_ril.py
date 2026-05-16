#!/usr/bin/env python3
"""
Download Reliance Industries annual reports from ril.com/investors/financial-reporting
Much better coverage than ProQuest — goes back to 2001-2002.
"""
import time, re, json, requests
from pathlib import Path
from playwright.sync_api import sync_playwright

PDF_DIR   = Path("public/data/annual_reports/RELIANCE")
INDEX_OUT = Path("scripts/reliance_ril_index.json")
PDF_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "https://www.ril.com/investors/financial-reporting"

def fy_from_label(label):
    """'Annual Report for the year 2024-2025' → 'FY2025'"""
    m = re.search(r"(\d{4})-(\d{4})", label)
    if m:
        return f"FY{m.group(2)}"
    m = re.search(r"(\d{4})", label)
    if m:
        return f"FY{m.group(1)}"
    return None

with sync_playwright() as p:
    b   = p.chromium.launch(headless=False)
    ctx = b.new_context(accept_downloads=True, viewport={"width": 1400, "height": 900})
    page = ctx.new_page()

    print("Loading ril.com financial reporting page...")
    page.goto(BASE_URL, timeout=60000, wait_until="domcontentloaded")
    time.sleep(5)

    # Click Annual Reports tab if not already active
    try:
        tab = page.query_selector('button[role="tab"]:has-text("Annual Reports"), [role="tab"]:has-text("Annual Reports")')
        if tab:
            tab.click()
            time.sleep(2)
    except:
        pass

    all_entries = []   # {fy, label, href}
    page_num = 1

    while True:
        print(f"\n--- Page {page_num} ---")
        time.sleep(3)

        # Extract links from current page — try multiple selectors
        entries = page.evaluate("""() => {
            const results = [];
            // Find all links inside the tab panel
            const panel = document.querySelector('[role="tabpanel"]') || document.querySelector('.tab-content') || document.body;
            const links = Array.from(panel.querySelectorAll('a'));
            for (const a of links) {
                const text = a.innerText.trim();
                const href = a.href || a.getAttribute('href') || '';
                if (text && (href.includes('.pdf') || href.includes('PDF') || text.toLowerCase().includes('annual report'))) {
                    results.push({text, href});
                }
            }
            return results;
        }""")

        if not entries:
            # Fallback: grab ALL links and filter
            entries = page.evaluate("""() => {
                const results = [];
                for (const a of document.querySelectorAll('a')) {
                    const text = a.innerText.trim();
                    const href = a.href || a.getAttribute('href') || '';
                    if (href.includes('.pdf') || href.includes('/download') || text.toLowerCase().includes('annual report')) {
                        results.push({text, href});
                    }
                }
                return results;
            }""")

        print(f"  Raw links found: {len(entries) if entries else 0}")
        if entries:
            for e in entries[:5]:
                print(f"    {e['text'][:60]} | {e['href'][:80]}")

        # Collect valid entries
        new_count = 0
        if entries:
            for e in entries:
                fy = fy_from_label(e['text'])
                if fy and e['href'] and e['href'] not in [x['href'] for x in all_entries]:
                    all_entries.append({'fy': fy, 'label': e['text'], 'href': e['href']})
                    new_count += 1

        print(f"  New entries added: {new_count}, total so far: {len(all_entries)}")

        # Click Next via JS (element may be off-screen/invisible)
        clicked = page.evaluate("""() => {
            for (const el of document.querySelectorAll('a, button, span, li')) {
                const txt = (el.innerText || el.textContent || '').trim();
                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                if (txt === 'Next' || txt === '›' || txt === 'Next page' || aria.includes('next')) {
                    el.click();
                    return true;
                }
            }
            return false;
        }""")
        if clicked and new_count > 0:
            print(f"  Clicked Next — going to page {page_num + 1}...")
            page_num += 1
            time.sleep(4)
        else:
            print("  No more pages.")
            break

    print(f"\n=== Total entries found: {len(all_entries)} ===")
    for e in sorted(all_entries, key=lambda x: x['fy']):
        print(f"  {e['fy']}: {e['label'][:50]} | {e['href'][:70]}")

    # Save index
    INDEX_OUT.write_text(json.dumps(all_entries, indent=2))
    print(f"\nIndex saved to {INDEX_OUT}")

    if not all_entries:
        print("No entries found — check the page manually.")
        b.close()
        raise SystemExit(1)

    b.close()

# Download PDFs via requests (CDN links need no browser session)
print(f"\n=== Downloading PDFs ===")
errors  = []
skipped = []
session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

for i, entry in enumerate(sorted(all_entries, key=lambda x: x['fy'])):
    fy   = entry['fy']
    href = entry['href']
    year = fy.replace('FY', '')
    fp   = PDF_DIR / f"RELIANCE_AR_{year}.pdf"

    if fp.exists() and fp.stat().st_size > 50_000:
        print(f"[{i+1}/{len(all_entries)}] {fy}: already exists ({fp.stat().st_size/1e6:.1f} MB) — skip")
        skipped.append(fy)
        continue

    if not href or not href.startswith('http'):
        print(f"[{i+1}/{len(all_entries)}] {fy}: no valid URL — skip")
        errors.append(f"{fy}: no URL")
        continue

    print(f"[{i+1}/{len(all_entries)}] {fy}: {href[:80]}...")
    try:
        r = session.get(href, timeout=120, stream=True)
        r.raise_for_status()
        with open(fp, 'wb') as f:
            for chunk in r.iter_content(chunk_size=1024*1024):
                f.write(chunk)
        size_mb = fp.stat().st_size / 1e6
        if size_mb < 0.05:
            print(f"  WARNING: tiny {size_mb:.2f} MB")
            errors.append(f"{fy}: tiny {size_mb:.2f} MB")
            fp.unlink()
        else:
            print(f"  Saved: {fp.name} ({size_mb:.1f} MB)")
    except Exception as e:
        print(f"  ERROR: {e}")
        errors.append(f"{fy}: {e}")

print("\n=== Summary ===")
real = sorted([f for f in PDF_DIR.glob("RELIANCE_AR_*.pdf") if f.stat().st_size > 50_000])
print(f"Total valid PDFs: {len(real)}")
for f in real:
    print(f"  {f.name}: {f.stat().st_size/1e6:.1f} MB")
if skipped:
    print(f"Skipped (already had): {', '.join(skipped)}")
if errors:
    print(f"\nErrors ({len(errors)}):")
    for e in errors:
        print(f"  {e}")
