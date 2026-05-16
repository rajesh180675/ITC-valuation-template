#!/usr/bin/env python3
"""Download + extract HUL segment data. FY2013-FY2024 from hul.co.in."""
import re, json, requests, fitz
from pathlib import Path

PDF_DIR  = Path("public/data/annual_reports/HUL")
OUT_FILE = Path("public/data/segment_data_hindunilvr.json")
PDF_DIR.mkdir(parents=True, exist_ok=True)

ENTRIES = [
    {"fy": "FY2013", "url": "https://www.hul.co.in/files/origin/61043051f357c1b538774f6707a6455fbae5b0d1.pdf/hul_annual_report_2012-13.pdf"},
    {"fy": "FY2014", "url": "https://www.hul.co.in/files/origin/f541a427b540ed4a2c248d53ba13e8edd087869b.pdf/hul-annual-report-2013-14.pdf"},
    {"fy": "FY2015", "url": "https://www.hul.co.in/files/origin/3c916b4fb90743d5e5b22d266c56a8081e47aa25.pdf/hul-annual-report-2014-15.pdf"},
    {"fy": "FY2016", "url": "https://www.hul.co.in/files/origin/6408d0fc9458ec0b09b8f32cb280b00b493c9502.pdf/annual-report-2015-16.pdf"},
    {"fy": "FY2017", "url": "https://www.hul.co.in/files/origin/069691910c93504ec65b89ec93cdfbfcb07ee9c3.pdf/Annual-Report-2016-17.pdf"},
    {"fy": "FY2018", "url": "https://www.hul.co.in/files/origin/0241a82e81aede2eab9a4eb73cccaa485975ce3a.pdf/HUL-Annual-Report-2017-18.pdf"},
    {"fy": "FY2019", "url": "https://www.hul.co.in/files/origin/6897756a8345ea5e63970e2cf2749d5e5df6c588.pdf/86th%20Annual%20General%20Meeting%20of%20the%20Company.pdf"},
    {"fy": "FY2020", "url": "https://www.hul.co.in/files/origin/79f29c32efc37179ba879973fac9596804fabd71.pdf/Annual%20Report%202019-20.pdf"},
    {"fy": "FY2021", "url": "https://www.hul.co.in/files/b9f18469-f98a-460d-949c-1a1c441fd84e/88th-annual-general-meeting-of-the-company-yz0epm.pdf"},
    {"fy": "FY2022", "url": "https://www.hul.co.in/files/e5b18048-4605-4e45-b78d-60805d896004/hul-annual-report-2021-22-nzy0do.pdf"},
    {"fy": "FY2023", "url": "https://www.hul.co.in/files/a99c4e3d-61a1-4555-8145-d89da79b281a/hul-annual-report-2022-23-prfppu.pdf"},
    {"fy": "FY2024", "url": "https://www.hul.co.in/files/annual-report-2023-24.pdf"},
    {"fy": "FY2025", "url": "https://www.hul.co.in/files/annual-report-2024-25.pdf"},  # guess pattern
]

json.dump(ENTRIES, open("scripts/hul_ar_index.json","w"), indent=2)

# ── Download ──────────────────────────────────────────────────────────────────
print(f"Downloading {len(ENTRIES)} HUL annual reports...")
session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                         "Referer": "https://www.hul.co.in/"})
errors = []

for e in ENTRIES:
    fy = e['fy']; yr = fy.replace('FY','')
    fp = PDF_DIR / f"HUL_AR_{yr}.pdf"
    if fp.exists() and fp.stat().st_size > 100_000:
        print(f"  {fy}: exists ({fp.stat().st_size/1e6:.1f} MB) — skip"); continue
    print(f"  {fy}: {e['url'][-50:]}...")
    try:
        r = session.get(e['url'], timeout=120, stream=True)
        r.raise_for_status()
        with open(fp, 'wb') as f:
            for chunk in r.iter_content(1024*1024): f.write(chunk)
        sz = fp.stat().st_size
        if sz < 100_000:
            print(f"    WARNING: tiny {sz/1e3:.0f}KB"); fp.unlink(); errors.append(f"{fy}: tiny")
        else:
            print(f"    saved {sz/1e6:.1f} MB")
    except Exception as ex:
        print(f"    ERROR: {ex}"); errors.append(f"{fy}: {ex}")

# ── Segment extraction ────────────────────────────────────────────────────────
# HUL segments (Ind AS 108): Home Care, Beauty & Personal Care (BPC), Foods & Refreshment
# Older: Soaps & Detergents, Personal Products, Beverages, Foods, Ice Creams & Frozen Desserts, Others
SEG_NORM = {
    'home care': 'Home Care',
    'beauty & personal care': 'Beauty & Personal Care',
    'beauty and personal care': 'Beauty & Personal Care',
    'bpc': 'Beauty & Personal Care',
    'foods & refreshment': 'Foods & Refreshment',
    'foods and refreshment': 'Foods & Refreshment',
    'soaps & detergents': 'Home Care',
    'soaps and detergents': 'Home Care',
    'personal products': 'Beauty & Personal Care',
    'beverages': 'Foods & Refreshment',
    'foods': 'Foods & Refreshment',
    'ice creams': 'Foods & Refreshment',
    'ice creams & frozen desserts': 'Foods & Refreshment',
    'others': 'Others',
    'total': 'Total',
}

def norm_seg(s):
    k = re.sub(r'\*+', '', s).strip().lower()
    for alias, canon in SEG_NORM.items():
        if k == alias or k.startswith(alias):
            return canon
    return None

def parse_num(s):
    s = s.strip().replace(',', '')
    neg = s.startswith('(') and s.endswith(')')
    s = s.strip('()')
    if re.match(r'^[-–—]$', s): return 0.0
    try: return float(s) * (-1 if neg else 1)
    except: return None

def find_seg_page(doc):
    for i in range(len(doc)):
        txt = doc[i].get_text()
        if (re.search(r'(Home Care|Beauty.*Personal Care|Soaps.*Detergents)', txt, re.I)
                and re.search(r'(Segment Revenue|Segment Result|Revenue from operations)', txt, re.I)
                and re.search(r'\d{4,}', txt)):
            return i, txt
    return None, None

def extract_hul_segments(txt):
    tokens = [l.strip() for l in txt.split('\n') if l.strip()]

    # Find segment header — look for row with 2+ known segment names
    header_idx = None
    for i, t in enumerate(tokens):
        hits = sum(1 for alias in SEG_NORM if alias in t.lower() and alias != 'total')
        if hits >= 2:
            header_idx = i; break
        # Also check adjacent tokens
        window = ' '.join(tokens[max(0,i-1):i+3]).lower()
        if sum(1 for alias in SEG_NORM if alias in window and alias != 'total') >= 2:
            header_idx = i; break

    if header_idx is None:
        return {}

    # Extract segment names around header
    segs = []
    buf = ''
    for i in range(max(0, header_idx - 2), min(header_idx + 15, len(tokens))):
        t = tokens[i]
        tl = t.lower().strip()

        # Skip meta
        if re.match(r'^\(.*crore.*\)$', tl) or tl in ('particulars', 'total'):
            continue
        if re.match(r'^\d{4}$', t): continue
        # Stop at numbers
        if re.match(r'^[\d,\(\)]+$', t) and re.search(r'\d{3,}', t): break

        direct = norm_seg(t)
        if direct and direct != 'Total':
            if buf:
                b = norm_seg(buf)
                if b and b != 'Total' and b not in segs: segs.append(b)
                buf = ''
            if direct not in segs: segs.append(direct)
            continue

        candidate = (buf + ' ' + t).strip() if buf else t
        c = norm_seg(candidate)
        if c and c != 'Total':
            if c not in segs: segs.append(c)
            buf = ''
        else:
            # Check if partial match
            any_prefix = any(alias.startswith(candidate.lower()[:8]) for alias in SEG_NORM if len(candidate) >= 4)
            if any_prefix or len(buf.split()) < 4:
                buf = candidate
            else:
                buf = t

    if buf:
        b = norm_seg(buf)
        if b and b != 'Total' and b not in segs: segs.append(b)

    work_segs = [s for s in segs if s != 'Total']
    if len(work_segs) < 2:
        return {}

    # Find Segment Revenue row
    rev_idx = next((i for i, t in enumerate(tokens)
                    if i > header_idx and re.search(r'(Segment Revenue|Revenue from operations)', t, re.I)), None)
    # Find Segment Result row
    res_idx = next((i for i, t in enumerate(tokens)
                    if i > header_idx and re.search(r'Segment Result', t, re.I)), None)

    out = {}

    def read_nums(start_idx, n):
        nums = []
        i = start_idx
        while i < len(tokens) and len(nums) < n + 3:
            t = tokens[i]
            if re.search(r'[a-zA-Z]{4,}', t): break
            for m in re.finditer(r'\(?[\d,]+\.?\d*\)?', t):
                v = parse_num(m.group(0))
                if v is not None and abs(v) > 5:
                    nums.append(v)
            i += 1
        return nums

    if rev_idx is not None:
        start = rev_idx + 1
        if start < len(tokens) and re.match(r'^\d{4}$', tokens[start]): start += 1
        nums = read_nums(start, len(work_segs))
        for j, seg in enumerate(work_segs):
            if j < len(nums): out.setdefault(seg, {})['revenue'] = nums[j]

    if res_idx is not None:
        start = res_idx + 1
        while start < len(tokens) and not re.search(r'\d', tokens[start]): start += 1
        nums = read_nums(start, len(work_segs))
        for j, seg in enumerate(work_segs):
            if j < len(nums): out.setdefault(seg, {})['ebit'] = nums[j]

    return out

# ── Main ──────────────────────────────────────────────────────────────────────
flat_series = {}
def add_series(key, fy, val): flat_series.setdefault(key, {})[fy] = val

pdfs = sorted(PDF_DIR.glob("HUL_AR_*.pdf"))
print(f"\nExtracting from {len(pdfs)} PDFs...")
for pdf_path in pdfs:
    yr_str = re.search(r'_(\d{4})\.pdf$', pdf_path.name).group(1)
    fy = f"FY{yr_str}"
    print(f"\n{fy}: ", end='', flush=True)
    try:
        doc = fitz.open(str(pdf_path))
        pg_idx, txt = find_seg_page(doc)
        if pg_idx and pg_idx + 1 < len(doc):
            txt = txt + "\n" + doc[pg_idx + 1].get_text()
        doc.close()
    except Exception as e:
        print(f"ERROR: {e}"); continue
    if pg_idx is None: print("no page"); continue
    seg_data = extract_hul_segments(txt)
    if not seg_data: print("parse failed"); continue
    parts = []
    for seg, vals in seg_data.items():
        parts.append(f"{seg[:12]}(r={vals.get('revenue')},e={vals.get('ebit')})")
        if 'revenue' in vals: add_series(f"revenue|{seg}", fy, vals['revenue'])
        if 'ebit' in vals: add_series(f"ebit|{seg}", fy, vals['ebit'])
    print(", ".join(parts))

all_fy   = sorted(set(fy for d in flat_series.values() for fy in d))
all_segs = sorted(set(k.split('|')[1] for k in flat_series if '|' in k))
out = {
    "symbol": "HINDUNILVR", "basis": "consolidated",
    "company": "Hindustan Unilever Limited",
    "currency": "INR Crore",
    "source": "hul.co.in Annual Reports — Consolidated Segment Note (Ind AS 108)",
    "segments": all_segs, "years": all_fy, "segment_time_series": flat_series,
}
OUT_FILE.write_text(json.dumps(out, indent=2))
print(f"\n=== HUL Done ===")
if all_fy: print(f"Years: {all_fy[0]} – {all_fy[-1]} ({len(all_fy)} years)")
print(f"Series: {len(flat_series)} | Segments: {all_segs}")
if errors: print(f"Download errors: {errors}")
