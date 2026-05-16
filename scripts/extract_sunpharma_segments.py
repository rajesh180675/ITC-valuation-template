"""
Sun Pharma segment extractor (v2).
Source: Consolidated Note 52 — 'Revenue by geography'
Format: India / USA / Emerging markets / Rest of world rows
Currency: millions INR -> /10 -> Crores
Run: py -3.14 scripts/extract_sunpharma_segments.py
"""
import re, json, fitz
from pathlib import Path

BASE    = Path("C:/Users/rajesh/WindsurfAPI/ITC-valuation-template")
PDF_DIR = BASE / "public/data/annual_reports/SUNPHARMA"
OUT     = BASE / "public/data/segment_data_sunpharma.json"

SEG_NORM = {
    'india': 'India',
    'united states of america': 'United States',
    'united states': 'United States',
    'emerging markets': 'Emerging Markets',
    'emerging market': 'Emerging Markets',
    'rest of the world': 'Rest of World',
    'rest of world': 'Rest of World',
}

def norm_seg(s):
    sl = s.strip().lower()
    for k, v in SEG_NORM.items():
        if sl == k or sl.startswith(k): return v
    return None

def parse_num(s):
    s = re.sub(r'[,\s]', '', s.strip())
    try: return float(s)
    except: return None

def find_seg_page(doc):
    for i, page in enumerate(doc):
        t = page.get_text()
        tl = t.lower()
        if ('revenue by geography' in tl or 'segment reporting' in tl) and \
           'india' in tl and 'united states' in tl and re.search(r'\d[\d,]*\.\d', t):
            return i, t
    return None, None

flat = {}
def add(key, fy, val): flat.setdefault(key, {})[fy] = round(val / 10, 2)

pdfs = sorted(PDF_DIR.glob("SUNPHARMA_AR_*.pdf"))
print(f"Processing {len(pdfs)} SUNPHARMA PDFs...")

for pdf_path in pdfs:
    m = re.search(r'FY(\d{4})', pdf_path.name)
    if not m: continue
    fy = f"FY{m.group(1)}"
    try:
        doc = fitz.open(str(pdf_path))
        pg, txt = find_seg_page(doc)
        doc.close()
    except Exception as e:
        print(f"{fy}: ERROR {e}"); continue
    if pg is None:
        print(f"{fy}: no page"); continue

    lines = [l.strip() for l in txt.split('\n') if l.strip()]

    # Find "Revenue by geography" block
    start = None
    for i, l in enumerate(lines):
        if 'revenue by geography' in l.lower():
            start = i; break
    if start is None:
        # try segment reporting section directly
        for i, l in enumerate(lines):
            if 'india' == l.strip().lower():
                start = max(0, i-2); break
    if start is None:
        print(f"{fy}: no revenue block"); continue

    segs = {}
    i = start + 1
    while i < min(start + 40, len(lines)):
        seg = norm_seg(lines[i])
        if seg:
            # Next numeric token = current year
            j = i + 1
            while j < min(i + 5, len(lines)):
                v = parse_num(lines[j])
                if v and v > 1000:
                    segs[seg] = v; break
                j += 1
            i = j  # advance past the number
        else:
            i += 1
        # Stop only after collecting all 4 segments
        if len(segs) >= 4:
            break

    if segs:
        for seg, val in segs.items():
            add(f"revenue|{seg}", fy, val)
        print(f"{fy}: {segs}")
    else:
        print(f"{fy}: parse failed")

all_fy   = sorted(set(y for d in flat.values() for y in d))
all_segs = sorted(set(k.split('|')[1] for k in flat if '|' in k))

out = {
    "symbol": "SUNPHARMA", "basis": "consolidated",
    "company": "Sun Pharmaceutical Industries Limited",
    "currency": "INR_Cr",
    "source": "NSE Annual Reports — Note 52 Revenue by Geography (Consolidated)",
    "segments": all_segs, "years": all_fy,
    "segment_time_series": flat,
}
OUT.write_text(json.dumps(out, indent=2))
print(f"\nDone: {all_fy[0] if all_fy else '?'} - {all_fy[-1] if all_fy else '?'} ({len(all_fy)} years)")
print(f"Segments: {all_segs}")
