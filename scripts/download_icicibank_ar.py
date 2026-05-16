"""
Download ICICI Bank ARs from NSE archives.
Run: py -3.14 scripts/download_icicibank_ar.py
"""

import os, json, zipfile, re, requests, io

BASE_DIR = r"C:\Users\rajesh\WindsurfAPI\ITC-valuation-template"
PDF_DIR  = os.path.join(BASE_DIR, "public", "data", "annual_reports", "ICICIBANK")
IDX_FILE = os.path.join(BASE_DIR, "scripts", "icicibank_ar_index.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer":    "https://www.nseindia.com/",
    "Accept":     "application/pdf,application/zip,*/*",
}

SOURCES = [
    {"fy": "FY2025", "url": "https://nsearchives.nseindia.com/annual_reports/AR_27289_ICICIBANK_2024_2025_A_05082025201317.pdf"},
    {"fy": "FY2024", "url": "https://nsearchives.nseindia.com/annual_reports/AR_26260_ICICIBANK_2023_2024_26092024174020.pdf"},
    {"fy": "FY2023", "url": "https://nsearchives.nseindia.com/annual_reports/AR_22610_ICICIBANK_2022_2023_02082023161500_08022023170012.zip"},
    {"fy": "FY2022", "url": "https://nsearchives.nseindia.com/annual_reports/AR_20607_ICICIBANK_2021_2022_04082022225231_08042022230002.zip"},
    {"fy": "FY2021", "url": "https://nsearchives.nseindia.com/annual_reports/AR_18515_ICICIBANK_2020_2021_23072021215554_23072021220003.zip"},
    {"fy": "FY2020", "url": "https://nsearchives.nseindia.com/annual_reports/AR_16489_ICICIBANK_2019_2020_18072020180415.zip"},
    {"fy": "FY2019", "url": "https://nsearchives.nseindia.com/annual_reports/AR_14710_ICICIBANK_2018_2019_04072019214610_04072019220011.zip"},
    {"fy": "FY2018", "url": "https://nsearchives.nseindia.com/annual_reports/AR_13491_ICICIBANK_2017_2018_20092018162117.zip"},
    {"fy": "FY2017", "url": "https://nsearchives.nseindia.com/annual_reports/AR_10760_ICICIBANK_2016_2017_05072017153040.zip"},
    {"fy": "FY2016", "url": "https://nsearchives.nseindia.com/annual_reports/AR_8990_ICICIBANK_2015_2016_14072016111011.zip"},
]

SKIP_KEYWORDS = ["subsidiary", "abridged", "notice", "agm", "scrutinizer", "voting", "attendance", "proxy", "csr", "brr"]
MAIN_KEYWORDS = ["annual report", "annual_report", "icici bank", "icicibankltd"]


def pick_main_pdf(zf):
    names = [n for n in zf.namelist() if n.lower().endswith(".pdf")]
    if not names:
        return None, None
    candidates = [n for n in names if not any(k in n.lower() for k in SKIP_KEYWORDS)]
    if not candidates:
        candidates = names
    scored = []
    for name in candidates:
        nl = name.lower()
        score = sum(1 for k in MAIN_KEYWORDS if k in nl)
        size = zf.getinfo(name).file_size
        scored.append((score, size, name))
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    best = scored[0][2]
    return best, zf.read(best)


def download_one(fy, url, dest):
    print(f"  [{fy}] {url[-70:]}...")
    try:
        r = requests.get(url, headers=HEADERS, timeout=120, stream=True)
        if r.status_code != 200:
            print(f"  [{fy}] HTTP {r.status_code}")
            return False
        content = r.content
        print(f"  [{fy}] {len(content)//1024} KB")
        if url.endswith(".pdf"):
            if len(content) < 100_000:
                print(f"  [{fy}] too small")
                return False
            open(dest, "wb").write(content)
            return True
        else:
            zf = zipfile.ZipFile(io.BytesIO(content))
            pdfs = [n for n in zf.namelist() if n.lower().endswith(".pdf")]
            print(f"  [{fy}] ZIP: {[n[-50:] for n in pdfs[:5]]}")
            name, data = pick_main_pdf(zf)
            if not data or len(data) < 100_000:
                print(f"  [{fy}] no suitable PDF")
                return False
            open(dest, "wb").write(data)
            print(f"  [{fy}] extracted '{name}' ({len(data)//1024} KB)")
            return True
    except Exception as e:
        print(f"  [{fy}] error: {e}")
        return False


def main():
    os.makedirs(PDF_DIR, exist_ok=True)
    index = []
    for src in SOURCES:
        fy, url = src["fy"], src["url"]
        dest = os.path.join(PDF_DIR, f"ICICIBANK_AR_{fy}.pdf")
        if os.path.exists(dest) and os.path.getsize(dest) > 100_000:
            print(f"  [{fy}] exists ({os.path.getsize(dest)//1024} KB)")
            index.append({"fy": fy, "url": url, "size": os.path.getsize(dest)})
            continue
        if download_one(fy, url, dest):
            index.append({"fy": fy, "url": url, "size": os.path.getsize(dest)})
        print()
    json.dump(index, open(IDX_FILE, "w"), indent=2)
    print(f"\nDone: {len(index)} PDFs")
    for e in index:
        print(f"  {e['fy']}: {e['size']//1024} KB")


if __name__ == "__main__":
    main()
