"""
Download HDFC Bank ARs from NSE archives.
FY2025/FY2024: direct PDFs
FY2016-FY2023: ZIPs — extract largest PDF (main AR)

Run: py -3.14 scripts/download_hdfcbank_ar.py
"""

import os, json, zipfile, re, requests, io

BASE_DIR = r"C:\Users\rajesh\WindsurfAPI\ITC-valuation-template"
PDF_DIR  = os.path.join(BASE_DIR, "public", "data", "annual_reports", "HDFCBANK")
IDX_FILE = os.path.join(BASE_DIR, "scripts", "hdfcbank_ar_index.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer":    "https://www.nseindia.com/",
    "Accept":     "application/pdf,application/zip,*/*",
}

SOURCES = [
    {"fy": "FY2025", "url": "https://nsearchives.nseindia.com/annual_reports/AR_27115_HDFCBANK_2024_2025_U_25072025220054.pdf"},
    {"fy": "FY2024", "url": "https://nsearchives.nseindia.com/annual_reports/AR_24576_HDFCBANK_2023_2024_18072024183453.pdf"},
    {"fy": "FY2023", "url": "https://nsearchives.nseindia.com/annual_reports/AR_22445_HDFCBANK_2022_2023_19072023141052_07192023150000.zip"},
    {"fy": "FY2022", "url": "https://nsearchives.nseindia.com/annual_reports/AR_20085_HDFCBANK_2021_2022_21062022163130_06212022170003.zip"},
    {"fy": "FY2021", "url": "https://nsearchives.nseindia.com/annual_reports/AR_18179_HDFCBANK_2020_2021_22062021195835_22062021200007.zip"},
    {"fy": "FY2020", "url": "https://nsearchives.nseindia.com/annual_reports/AR_16315_HDFCBANK_2019_2020_24062020213340.zip"},
    {"fy": "FY2019", "url": "https://nsearchives.nseindia.com/annual_reports/AR_14530_HDFCBANK_2018_2019_11062019151036.zip"},
    {"fy": "FY2018", "url": "https://nsearchives.nseindia.com/annual_reports/AR_12544_HDFCBANK_2017_2018_19072018143735.zip"},
    {"fy": "FY2017", "url": "https://nsearchives.nseindia.com/annual_reports/AR_10840_HDFCBANK_2016_2017_25072017151900.zip"},
    {"fy": "FY2016", "url": "https://nsearchives.nseindia.com/annual_reports/AR_9108_HDFCBANK_2015_2016_26072016101219.zip"},
]

# Keywords that identify the MAIN annual report PDF inside a ZIP
MAIN_AR_KEYWORDS = [
    "annual report", "annual_report", "annualreport",
    "hdfc bank", "hdfcbank",
]
# Keywords to SKIP (subsidiary statements, notices, etc.)
SKIP_KEYWORDS = [
    "subsidiary", "abridged", "notice", "agm", "scrutinizer",
    "voting", "attendance", "proxy", "csr",
]


def pick_main_pdf(zip_file):
    """Pick the main annual report PDF from a ZIP. Returns (name, bytes) or None."""
    names = [n for n in zip_file.namelist() if n.lower().endswith(".pdf")]
    if not names:
        return None, None

    # Filter out skip keywords
    candidates = []
    for name in names:
        nl = name.lower()
        if any(k in nl for k in SKIP_KEYWORDS):
            continue
        candidates.append(name)

    if not candidates:
        candidates = names  # fallback: use all PDFs

    # Prefer files with main AR keywords
    scored = []
    for name in candidates:
        nl = name.lower()
        score = sum(1 for k in MAIN_AR_KEYWORDS if k in nl)
        size = zip_file.getinfo(name).file_size
        scored.append((score, size, name))

    # Sort by score desc, then size desc (largest = most complete)
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    best_name = scored[0][2]
    data = zip_file.read(best_name)
    return best_name, data


def download_one(fy, url, dest_path):
    """Download PDF or ZIP, extract main PDF if ZIP. Returns True on success."""
    print(f"  [{fy}] downloading {url[-60:]}...")
    try:
        r = requests.get(url, headers=HEADERS, timeout=120, stream=True)
        if r.status_code != 200:
            print(f"  [{fy}] HTTP {r.status_code}")
            return False

        content = r.content
        print(f"  [{fy}] {len(content)//1024} KB")

        if url.endswith(".pdf"):
            if len(content) < 100_000:
                print(f"  [{fy}] too small, likely error page")
                return False
            with open(dest_path, "wb") as f:
                f.write(content)
            print(f"  [{fy}] saved PDF")
            return True

        elif url.endswith(".zip"):
            zf = zipfile.ZipFile(io.BytesIO(content))
            pdf_names = [n for n in zf.namelist() if n.lower().endswith(".pdf")]
            print(f"  [{fy}] ZIP contains {len(pdf_names)} PDFs: {[n[-50:] for n in pdf_names[:5]]}")

            best_name, pdf_data = pick_main_pdf(zf)
            if not pdf_data or len(pdf_data) < 100_000:
                print(f"  [{fy}] no suitable PDF found in ZIP")
                return False

            with open(dest_path, "wb") as f:
                f.write(pdf_data)
            print(f"  [{fy}] extracted '{best_name}' ({len(pdf_data)//1024} KB)")
            return True

    except Exception as e:
        print(f"  [{fy}] error: {e}")
        return False


def main():
    os.makedirs(PDF_DIR, exist_ok=True)
    index = []

    for src in SOURCES:
        fy, url = src["fy"], src["url"]
        dest = os.path.join(PDF_DIR, f"HDFCBANK_AR_{fy}.pdf")

        if os.path.exists(dest) and os.path.getsize(dest) > 100_000:
            sz = os.path.getsize(dest) // 1024
            print(f"  [{fy}] already exists ({sz} KB)")
            index.append({"fy": fy, "url": url, "size": os.path.getsize(dest)})
            continue

        if download_one(fy, url, dest):
            index.append({"fy": fy, "url": url, "size": os.path.getsize(dest)})
        print()

    with open(IDX_FILE, "w") as f:
        json.dump(index, f, indent=2)

    print(f"\nDone: {len(index)} PDFs downloaded")
    for e in index:
        print(f"  {e['fy']}: {e['size']//1024} KB")


if __name__ == "__main__":
    main()
