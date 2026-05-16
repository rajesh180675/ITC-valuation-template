"""
Generic NSE AR batch downloader — downloads ARs for any NSE ticker.
Handles both direct PDFs and ZIPs (extracts largest main AR PDF).

Usage:
  py -3.14 scripts/download_nse_ar.py KOTAKBANK AXISBANK WIPRO BAJFINANCE
  py -3.14 scripts/download_nse_ar.py KOTAKBANK --years 10
"""

import os, json, zipfile, re, sys, requests, io, argparse

BASE_DIR = r"C:\Users\rajesh\WindsurfAPI\ITC-valuation-template"
AR_BASE  = os.path.join(BASE_DIR, "public", "data", "annual_reports")
IDX_DIR  = os.path.join(BASE_DIR, "scripts")

NSE_API  = "https://www.nseindia.com/api/annual-reports?index=equities&symbol={ticker}"
HEADERS  = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer":    "https://www.nseindia.com/",
    "Accept":     "application/pdf,application/zip,*/*",
}

SKIP_KW  = ["subsidiary", "abridged", "notice", "agm", "scrutinizer",
            "voting", "attendance", "proxy", "csr", "brr", "formx"]
MAIN_KW  = ["annual report", "annual_report"]


def pick_main_pdf(zf):
    names = [n for n in zf.namelist() if n.lower().endswith(".pdf")]
    if not names:
        return None, None
    candidates = [n for n in names if not any(k in n.lower() for k in SKIP_KW)]
    if not candidates:
        candidates = names
    scored = []
    for name in candidates:
        nl = name.lower()
        score = sum(1 for k in MAIN_KW if k in nl)
        size  = zf.getinfo(name).file_size
        scored.append((score, size, name))
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    best = scored[0][2]
    return best, zf.read(best)


def fetch_nse_index(ticker, max_years=12):
    url = NSE_API.format(ticker=ticker)
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    data = r.json()["data"]
    return [{"fy": f"FY{d['toYr']}", "url": d["fileName"]} for d in data[:max_years]]


def download_one(fy, url, dest):
    print(f"  [{fy}] fetching...", flush=True)
    try:
        r = requests.get(url, headers=HEADERS, timeout=120, stream=True)
        if r.status_code != 200:
            print(f"  [{fy}] HTTP {r.status_code}")
            return False
        content = r.content
        if url.endswith(".pdf"):
            if len(content) < 50_000:
                print(f"  [{fy}] too small ({len(content)} B)")
                return False
            open(dest, "wb").write(content)
            print(f"  [{fy}] PDF {len(content)//1024} KB")
            return True
        else:
            zf   = zipfile.ZipFile(io.BytesIO(content))
            pdfs = [n for n in zf.namelist() if n.lower().endswith(".pdf")]
            name, data = pick_main_pdf(zf)
            if not data or len(data) < 50_000:
                print(f"  [{fy}] no suitable PDF in ZIP ({[p[-40:] for p in pdfs]})")
                return False
            open(dest, "wb").write(data)
            print(f"  [{fy}] ZIP -> '{name[-50:]}' {len(data)//1024} KB")
            return True
    except Exception as e:
        print(f"  [{fy}] error: {e}")
        return False


def download_ticker(ticker, max_years=12):
    pdf_dir  = os.path.join(AR_BASE, ticker)
    idx_file = os.path.join(IDX_DIR, f"{ticker.lower()}_ar_index.json")
    os.makedirs(pdf_dir, exist_ok=True)

    print(f"\n=== {ticker} ===")
    sources = fetch_nse_index(ticker, max_years)
    print(f"  NSE index: {len(sources)} years")

    index = []
    for src in sources:
        fy, url = src["fy"], src["url"]
        dest = os.path.join(pdf_dir, f"{ticker}_AR_{fy}.pdf")
        if os.path.exists(dest) and os.path.getsize(dest) > 50_000:
            print(f"  [{fy}] exists ({os.path.getsize(dest)//1024} KB)")
            index.append({"fy": fy, "url": url, "size": os.path.getsize(dest)})
            continue
        if download_one(fy, url, dest):
            index.append({"fy": fy, "url": url, "size": os.path.getsize(dest)})

    json.dump(index, open(idx_file, "w"), indent=2)
    print(f"\n  Done: {len(index)} PDFs saved → {idx_file}")
    return index


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("tickers", nargs="+", help="NSE ticker(s) e.g. KOTAKBANK WIPRO")
    parser.add_argument("--years", type=int, default=12, help="Max years to download (default 12)")
    args = parser.parse_args()

    for ticker in args.tickers:
        download_ticker(ticker.upper(), args.years)


if __name__ == "__main__":
    main()
