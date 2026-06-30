#!/usr/bin/env python3
"""
Download Reliance Industries annual reports from ProQuest.
Uses doc IDs from reliance_proquest_index.json (page 1: 20 reports).
"""
import json, time, re
from pathlib import Path
from playwright.sync_api import sync_playwright

COOKIE_FILE   = "scripts/proquest_cookies.json"
INDEX_FILE    = "scripts/reliance_proquest_index.json"
PDF_DIR       = Path("public/data/annual_reports/RELIANCE")

with open(COOKIE_FILE) as f:
    raw = json.load(f)

cookies = []
for c in raw:
    entry = {"name": c["name"], "value": c["value"], "domain": c["domain"], "path": c.get("path", "/")}
    if c.get("httpOnly"): entry["httpOnly"] = True
    if c.get("secure"):   entry["secure"]   = True
    ss = c.get("sameSite", "").lower()
    if ss in ("strict", "lax", "none"):
        entry["sameSite"] = ss.capitalize()
    cookies.append(entry)

with open(INDEX_FILE) as f:
    docs = json.load(f)  # list of {year, doc_id, size}

# De-duplicate by doc_id; keep latest year when same year appears twice
seen_ids = {}
deduped = []
for d in docs:
    if d["doc_id"] not in seen_ids:
        seen_ids[d["doc_id"]] = True
        deduped.append(d)

docs = sorted(deduped, key=lambda x: x["year"])
print(f"Total unique doc IDs: {len(docs)}")
for d in docs:
    print(f"  {d['year']}: {d['doc_id']} ({d.get('size','?')})")

PDF_DIR.mkdir(parents=True, exist_ok=True)

# Check what's already downloaded (by year)
existing_years = set()
for f in PDF_DIR.glob("RELIANCE_AR_*.pdf"):
    if f.stat().st_size > 50_000:  # >50 KB = real PDF
        m = re.search(r"_AR_(\d{4})", f.stem)
        if m:
            existing_years.add(m.group(1))

missing = [d for d in docs if d["year"] not in existing_years]
have    = [d for d in docs if d["year"] in existing_years]

print(f"\nAlready have: {len(have)} ({', '.join(sorted(d['year'] for d in have))})")
print(f"Need to download: {len(missing)} ({', '.join(sorted(d['year'] for d in missing))})")

if not missing:
    print("Nothing to download.")
    raise SystemExit(0)

with sync_playwright() as p:
    b   = p.chromium.launch(headless=False)
    ctx = b.new_context(accept_downloads=True, viewport={"width": 1400, "height": 900})
    ctx.add_cookies(cookies)
    page = ctx.new_page()

    # Warm up session
    print("\nWarming up ProQuest session...")
    page.goto("https://www.proquest.com/?accountid=9902", timeout=60000, wait_until="domcontentloaded")
    time.sleep(4)
    try:
        btn = page.query_selector("#onetrust-accept-btn-handler")
        if btn:
            btn.click()
            time.sleep(1)
            print("  Cookie popup dismissed.")
    except:
        pass

    errors = []
    for i, doc in enumerate(missing):
        year   = doc["year"]
        doc_id = doc["doc_id"]
        fp     = PDF_DIR / f"RELIANCE_AR_{year}.pdf"

        print(f"\n[{i+1}/{len(missing)}] Year {year} — doc_id {doc_id}")
        try:
            page.goto(
                f"https://www.proquest.com/docview/{doc_id}/abstract?accountid=9902",
                timeout=60000, wait_until="domcontentloaded"
            )
            time.sleep(8)

            # Dismiss popup if it reappears
            try:
                btn = page.query_selector("#onetrust-accept-btn-handler")
                if btn: btn.click(); time.sleep(1)
            except:
                pass

            # Find PDF button
            pdf_btn = page.query_selector("a[href*='fulltextPDF'], a[href*='media.proquest']")
            if not pdf_btn:
                for a in page.query_selector_all("a"):
                    try:
                        txt = a.inner_text().strip()
                        if "PDF" in txt.upper() and len(txt) < 40:
                            pdf_btn = a
                            break
                    except:
                        pass

            if not pdf_btn:
                print(f"  ERROR: no PDF button found — skipping")
                errors.append(f"{year} ({doc_id}): no PDF button")
                continue

            print(f"  Clicking PDF button...")
            with page.expect_download(timeout=120000) as dl_info:
                pdf_btn.click()
            download = dl_info.value
            download.save_as(str(fp))
            size_mb = fp.stat().st_size / 1e6
            if size_mb < 0.05:
                print(f"  WARNING: file too small ({size_mb:.2f} MB) — likely HTML error page")
                errors.append(f"{year} ({doc_id}): tiny file {size_mb:.2f} MB")
            else:
                print(f"  Saved: {fp.name} ({size_mb:.1f} MB)")

        except Exception as e:
            print(f"  ERROR: {e}")
            errors.append(f"{year} ({doc_id}): {e}")

        time.sleep(5)  # polite delay between downloads

    b.close()

print("\n=== Download Summary ===")
real = sorted([f for f in PDF_DIR.glob("RELIANCE_AR_*.pdf") if f.stat().st_size > 50_000])
print(f"Total valid PDFs: {len(real)}")
for f in real:
    print(f"  {f.name}: {f.stat().st_size/1e6:.1f} MB")

if errors:
    print(f"\nErrors ({len(errors)}):")
    for e in errors:
        print(f"  {e}")
else:
    print("\nNo errors.")
