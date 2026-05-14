#!/usr/bin/env python3
"""
Autonomous NSE re-scraper: discovers new tickers, scrapes, enriches, commits, pushes.
Designed to run via cron job. Reports summary to stdout.
"""
import requests, csv, io, os, json, time, re, subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(r"C:\Users\rajesh\WindsurfAPI\ITC-valuation-template")
AR_DIR = ROOT / "public" / "data" / "ar"
SCRIPTS_DIR = ROOT / "scripts"
PYTHON = r"C:\Python314\python.exe"

def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"[{ts}] {msg}", flush=True)

def get_existing():
    """Get set of tickers that have actual year data."""
    existing = set()
    for f in os.listdir(AR_DIR):
        if f.endswith('.json') and f != 'company_index.json':
            try:
                d = json.load(open(AR_DIR / f, 'r', encoding='utf-8'))
                if d.get('years') and len(d['years']) > 0:
                    existing.add(f.replace('.json','').upper())
            except:
                pass
    return existing

def get_dead():
    """Load known dead tickers."""
    dead_path = SCRIPTS_DIR / "dead_tickers.json"
    if dead_path.exists():
        return set(json.load(open(dead_path, 'r', encoding='utf-8')))
    return set()

def update_dead(new_dead):
    """Merge new dead tickers into the persistent list."""
    dead_path = SCRIPTS_DIR / "dead_tickers.json"
    existing_dead = get_dead()
    merged = sorted(existing_dead | set(t.upper() for t in new_dead))
    with open(dead_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, indent=2)
    return len(merged)

def get_nse_tickers():
    """Download NSE equity list."""
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.nseindia.com/',
    })
    # Warmup cookie
    r = session.get('https://www.nseindia.com', timeout=10)
    if r.status_code != 200:
        log(f"WARNING: NSE warmup returned {r.status_code}")
    time.sleep(2)
    
    r = session.get('https://archives.nseindia.com/content/equities/EQUITY_L.csv', timeout=30)
    if r.status_code != 200:
        log(f"ERROR: NSE CSV download failed: {r.status_code}")
        return []
    
    reader = csv.DictReader(io.StringIO(r.text))
    tickers = []
    for row in reader:
        sym = row.get('SYMBOL','').strip().upper()
        series = row.get(' SERIES','').strip()
        if sym and 'EQ' in series:
            tickers.append(sym)
    return tickers

def discover_new():
    """Find tickers not yet scraped (excluding known dead)."""
    existing = get_existing()
    dead = get_dead()
    nse = get_nse_tickers()
    
    new_tickers = [t for t in nse if t not in existing and t not in dead]
    return existing, dead, new_tickers

def scrape_batch(tickers):
    """Run screener scraper on the batch. Returns (success, fail, new_dead)."""
    if not tickers:
        return 0, 0, []
    
    batch_path = SCRIPTS_DIR / "screener_batch_current.json"
    batch = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'selected': len(tickers),
        'tickers': tickers,
    }
    with open(batch_path, 'w', encoding='utf-8') as f:
        json.dump(batch, f, indent=2, ensure_ascii=False)
    
    cmd = [
        PYTHON, str(ROOT / "scripts" / "screener_scraper.py"),
        "--batch", "file",
        "--batch-file", str(batch_path),
        "--workers", "2",
        "--resume",
    ]
    log(f"Scraping {len(tickers)} tickers...")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(ROOT), timeout=1800)
    
    # Parse report
    report_path = SCRIPTS_DIR / "screener_scrape_report.json"
    success, fail, new_dead = 0, 0, []
    if report_path.exists():
        r = json.load(open(report_path, 'r', encoding='utf-8'))
        success = r.get('success', 0)
        fail = r.get('fail', 0)
        for t in r.get('results', []):
            if t.get('status') == 'fail':
                new_dead.append(t['ticker'].upper())
    
    return success, fail, new_dead

def enrich():
    """Run enricher on all AR files."""
    log("Enriching all AR files...")
    cmd = [PYTHON, str(ROOT / "scripts" / "enrich_ar_files.py")]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(ROOT), timeout=600)
    if result.returncode != 0:
        log(f"WARNING: Enricher returned {result.returncode}")
    return result.returncode == 0

def git_commit_push():
    """Stage, commit, push."""
    subprocess.run(["git", "add", "-A"], cwd=str(ROOT), capture_output=True, timeout=60)
    msg = f"auto: periodic re-scrape {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
    r = subprocess.run(["git", "commit", "-m", msg], cwd=str(ROOT), capture_output=True, text=True, timeout=30)
    if "nothing to commit" in r.stdout:
        log("No changes to commit")
        return False
    r2 = subprocess.run(["git", "push", "origin", "main"], cwd=str(ROOT), capture_output=True, text=True, timeout=120)
    if r2.returncode == 0:
        log("Pushed successfully")
        return True
    else:
        log(f"Push failed: {r2.stderr[:200]}")
        return False

def main():
    log("=== Autonomous NSE Re-Scraper ===")
    
    # Discover
    existing, dead, new_tickers = discover_new()
    total_nse = len(existing) + len(dead) + len(new_tickers)
    log(f"State: {len(existing)} with data, {len(dead)} dead, {len(new_tickers)} new, {total_nse} NSE total")
    
    if not new_tickers:
        log("No new tickers found. Nothing to do.")
        print(f"RESULT: no_change | existing={len(existing)} | dead={len(dead)} | new=0")
        return
    
    # Scrape (cap at 300 per run)
    batch = new_tickers[:300]
    success, fail, new_dead = scrape_batch(batch)
    log(f"Scrape: {success} OK, {fail} fail from {len(batch)} attempted")
    
    # Update dead list
    if new_dead:
        total_dead = update_dead(new_dead)
        log(f"Dead list updated: +{len(new_dead)} new dead, total {total_dead}")
    
    # Enrich
    enriched = enrich()
    log(f"Enrichment: {'OK' if enriched else 'FAILED'}")
    
    # Commit + push
    pushed = git_commit_push()
    
    # Summary
    new_existing = len(get_existing())
    print(f"RESULT: updated | existing={new_existing} | +{success} scraped | +{len(new_dead)} dead | pushed={pushed}")

if __name__ == "__main__":
    main()
