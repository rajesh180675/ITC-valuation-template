#!/usr/bin/env python3
"""
Download + extract segment data for Infosys (INFY).
Source: infosys.com — direct CDN PDF links (no auth needed).

Infosys segments:
  FY2008+:  Financial Services, Manufacturing, Energy/Utilities/Resources/Services (EURS),
            Retail/CPG/Logistics, Life Sciences/Healthcare, Communications/Technology Media (Hi-Tech/CommTech)
  Modern:   Financial Services, Manufacturing, Energy/Utilities/Resources/Services,
            Retail/Consumer/Logistics, Life Sciences/Healthcare, Hi-Tech, Others
"""
import re, json, requests, fitz
from pathlib import Path

PDF_DIR  = Path("public/data/annual_reports/INFY")
OUT_FILE = Path("public/data/segment_data_infy.json")
PDF_DIR.mkdir(parents=True, exist_ok=True)

# URL pattern: infosys-ar-25.pdf = FY2025, infosys-ar-24.pdf = FY2024, etc.
BASE = "https://www.infosys.com/investors/reports-filings/annual-report/annual/documents/"

def fy_to_suffix(fy_year):
    """FY2025 -> '25', FY2000 -> '2k', FY1999 -> '99'"""
    yr = int(fy_year.replace('FY',''))
    if yr == 2000: return '2k'
    return str(yr)[-2:]

# Build index FY2005-FY2025
entries = []
for yr in range(2005, 2026):
    fy  = f"FY{yr}"
    sfx = fy_to_suffix(fy)
    url = f"{BASE}infosys-ar-{sfx}.pdf"
    entries.append({'fy': fy, 'url': url})

# ── Download ──────────────────────────────────────────────────────────────────
print(f"Downloading {len(entries)} INFY annual reports...")
session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                         "Referer": "https://www.infosys.com/"})
errors = []

for e in entries:
    fy  = e['fy']
    yr  = fy.replace('FY','')
    fp  = PDF_DIR / f"INFY_AR_{yr}.pdf"
    if fp.exists() and fp.stat().st_size > 100_000:
        print(f"  {fy}: exists ({fp.stat().st_size/1e6:.1f} MB) — skip")
        continue
    print(f"  {fy}: {e['url'][-30:]}...")
    try:
        r = session.get(e['url'], timeout=120, stream=True)
        r.raise_for_status()
        with open(fp, 'wb') as f:
            for chunk in r.iter_content(1024*1024): f.write(chunk)
        sz = fp.stat().st_size
        if sz < 100_000:
            print(f"    WARNING: tiny {sz/1e3:.0f} KB")
            fp.unlink(); errors.append(f"{fy}: tiny")
        else:
            print(f"    saved {sz/1e6:.1f} MB")
    except Exception as ex:
        print(f"    ERROR: {ex}")
        errors.append(f"{fy}: {ex}")

# ── Segment extraction ────────────────────────────────────────────────────────
# Infosys uses a columnar segment table (like TCS).
# Segment names as column headers in consolidated financial notes.

SEG_ALIASES = {
    'financial services': 'Financial Services',
    'manufacturing': 'Manufacturing',
    'energy': 'Energy/Utilities/Resources/Services',
    'energy, utilities': 'Energy/Utilities/Resources/Services',
    'energy, utility': 'Energy/Utilities/Resources/Services',
    'energy/utilities': 'Energy/Utilities/Resources/Services',
    'retail': 'Retail/CPG/Logistics',
    'retail, consumer': 'Retail/CPG/Logistics',
    'retail and cpg': 'Retail/CPG/Logistics',
    'life sciences': 'Life Sciences/Healthcare',
    'life science': 'Life Sciences/Healthcare',
    'hi-tech': 'Hi-Tech',
    'high technology': 'Hi-Tech',
    'communication services': 'Hi-Tech',
    'communications': 'Hi-Tech',
    'telecom': 'Hi-Tech',
    'others': 'Others',
    'all other segments': 'Others',
}

def norm_seg(s):
    k = re.sub(r'\*+|\(.*?\)', '', s).strip().lower()
    for alias, canon in SEG_ALIASES.items():
        if k.startswith(alias):
            return canon
    return s.strip()

def parse_num(s):
    s = s.strip().replace(',', '').replace(' ', '')
    neg = s.startswith('(') and s.endswith(')')
    s = s.strip('()')
    if s in ('-', '—', '–', ''): return 0.0
    try:
        v = float(s)
        return -v if neg else v
    except:
        return None

def find_segment_page(doc):
    """Find page with segment revenue note."""
    total = len(doc)
    for i in range(int(total * 0.45), total):
        txt = doc[i].get_text()
        if (re.search(r'(Segment|segment)\s+(revenue|Revenue|information|Information)', txt)
                and re.search(r'(Financial Services|Manufacturing|Life Sciences|Hi-Tech|Retail)', txt, re.I)
                and re.search(r'\d{3,}', txt)):
            return i, txt
    return None, None

def extract_infy_segments(txt):
    """
    Infosys segment note format (Ind AS 108):
    Revenue and segment profit are in a single table with segment names as columns.
    """
    tokens = [l.strip() for l in txt.split('\n') if l.strip()]

    # Find "Segment information" or "Revenue by business segment" header
    seg_start = None
    for i, t in enumerate(tokens):
        if re.search(r'(Revenue from operations|Revenues).*segment', t, re.I):
            seg_start = i; break
        if re.search(r'segment.*information', t, re.I) and seg_start is None:
            seg_start = i

    if seg_start is None:
        # fallback: find first line with 2+ known segment names
        for i, t in enumerate(tokens):
            hits = sum(1 for k in SEG_ALIASES if k in t.lower())
            if hits >= 2:
                seg_start = i; break

    if seg_start is None:
        return {}

    # Collect segment headers (may span multiple tokens)
    segs = []
    buf = ''
    for i in range(seg_start, min(seg_start + 40, len(tokens))):
        t = tokens[i]
        tl = t.lower().strip()

        # Stop at row data
        if re.match(r'^\d{4,}', t) or re.match(r'^\([\d,]+\)', t):
            break
        if tl in ('total', 'unallocated', 'unallocable'):
            break
        if re.search(r'revenue|revenues|turnover', tl) and i > seg_start + 3:
            break

        # Skip year/currency markers
        if re.match(r'^\d{4}$', t) or re.match(r'^\(.*[Cc]rore.*\)', t):
            continue

        candidate = (buf + ' ' + t).strip() if buf else t
        cl = candidate.lower().strip()

        matched = None
        for alias, canon in SEG_ALIASES.items():
            if cl.startswith(alias) or cl == alias:
                matched = canon; break

        if matched:
            segs.append(matched); buf = ''; continue

        # Check partial prefix
        any_prefix = any(alias.startswith(cl) for alias in SEG_ALIASES if len(cl) >= 5)
        if any_prefix:
            buf = candidate; continue

        if buf:
            bl = buf.lower().strip()
            for alias, canon in SEG_ALIASES.items():
                if bl.startswith(alias):
                    segs.append(canon); break
            buf = t
        else:
            buf = t

    if buf:
        bl = buf.lower().strip()
        for alias, canon in SEG_ALIASES.items():
            if bl.startswith(alias):
                segs.append(canon); break

    if len(segs) < 2:
        return {}

    # Find revenue row — first row of large numbers after header
    rev_row_idx = None
    for i in range(seg_start, min(seg_start + 60, len(tokens))):
        nums = re.findall(r'[\d,]+\.?\d*', tokens[i])
        big_nums = [n for n in nums if int(n.replace(',','').split('.')[0]) > 100]
        if len(big_nums) >= len(segs) - 1:
            rev_row_idx = i; break

    if rev_row_idx is None:
        return {}

    # Parse numbers from that row
    all_nums = []
    for i in range(rev_row_idx, min(rev_row_idx + 5, len(tokens))):
        t = tokens[i]
        if re.search(r'[a-zA-Z]{5,}', t) and i > rev_row_idx:
            break
        for m in re.finditer(r'\([\d,]+\.?\d*\)|[\d,]+\.?\d*', t):
            v = parse_num(m.group(0))
            if v is not None and abs(v) > 10:
                all_nums.append(v)

    out = {}
    for j, seg in enumerate(segs):
        if j < len(all_nums):
            out[seg] = {'revenue': all_nums[j]}

    return out


# ── Main extraction loop ──────────────────────────────────────────────────────
flat_series = {}

def add_series(key, fy, val):
    flat_series.setdefault(key, {})[fy] = val

pdfs = sorted(PDF_DIR.glob("INFY_AR_*.pdf"))

print(f"\nExtracting segments from {len(pdfs)} PDFs...")
for pdf_path in pdfs:
    yr_str = re.search(r'_(\d{4})\.pdf$', pdf_path.name).group(1)
    fy = f"FY{yr_str}"
    if int(yr_str) < 2005:
        continue
    print(f"\n{fy}: ", end='', flush=True)

    try:
        doc = fitz.open(str(pdf_path))
        pg_idx, txt = find_segment_page(doc)
        if pg_idx is not None and pg_idx + 1 < len(doc):
            txt = txt + "\n" + doc[pg_idx + 1].get_text()
        doc.close()
    except Exception as e:
        print(f"ERROR: {e}"); continue

    if pg_idx is None:
        print("no segment page"); continue

    seg_data = extract_infy_segments(txt)
    if not seg_data:
        print("parse failed"); continue

    parts = []
    for seg, vals in seg_data.items():
        parts.append(f"{seg[:15]}(r={vals.get('revenue')})")
        if 'revenue' in vals:
            add_series(f"revenue|{seg}", fy, vals['revenue'])
    print(", ".join(parts))

# ── Output ─────────────────────────────────────────────────────────────────────
all_fy   = sorted(set(fy for d in flat_series.values() for fy in d))
all_segs = sorted(set(k.split('|')[1] for k in flat_series if '|' in k))

out = {
    "symbol": "INFY",
    "basis": "consolidated",
    "company": "Infosys Limited",
    "currency": "INR Crore",
    "source": "infosys.com Annual Reports — Consolidated Segment Note (Ind AS 108)",
    "segments": all_segs,
    "years": all_fy,
    "segment_time_series": flat_series,
}

OUT_FILE.write_text(json.dumps(out, indent=2))
print(f"\n=== INFY Done ===")
if all_fy:
    print(f"Years: {all_fy[0]} – {all_fy[-1]} ({len(all_fy)} years)")
print(f"Series: {len(flat_series)} | Segments: {all_segs}")
if errors:
    print(f"Download errors: {errors}")

json.dump([{'fy': e['fy'], 'url': e['url']} for e in entries],
          open('scripts/infy_ar_index.json','w'), indent=2)
print("Index saved to scripts/infy_ar_index.json")
