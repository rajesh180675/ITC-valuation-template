"""
ONGC segment extractor (v2) — direct parser.
Source: Standalone Note 44 — 'Segment revenue and results'
Format: Offshore / Onshore rows with curr + prev year values
Currency: millions INR -> /10 -> Crores
Run: py -3.14 scripts/extract_ongc_segments.py
"""
import re, json, fitz
from pathlib import Path

BASE    = Path("C:/Users/rajesh/WindsurfAPI/ITC-valuation-template")
PDF_DIR = BASE / "public/data/annual_reports/ONGC"
OUT     = BASE / "public/data/segment_data_ongc.json"

def parse_num(s):
    s = s.strip().replace(',', '')
    try: return float(s)
    except: return None

def find_seg_page(doc):
    """Find the Note 44 standalone segment revenue page."""
    for i, page in enumerate(doc):
        t = page.get_text()
        tl = t.lower()
        if 'segment revenue' in tl and 'offshore' in tl and 'onshore' in tl:
            nums = re.findall(r'\d[\d,]*\.\d+', t)
            if len(nums) >= 4:
                return i, t
    return None, None

flat = {}
def add(key, fy, val): flat.setdefault(key, {})[fy] = round(val / 10, 2)

pdfs = sorted(PDF_DIR.glob("ONGC_AR_*.pdf"))
print(f"Processing {len(pdfs)} ONGC PDFs...")

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

    # Find "Segment revenue and results" anchor first, then parse Offshore/Onshore below it
    segs = {}
    anchor = None
    for i, l in enumerate(lines):
        if re.search(r'segment revenue and results', l, re.I):
            anchor = i; break
    if anchor is None:
        # fallback: use last occurrence of Offshore
        for i, l in enumerate(lines):
            if re.match(r'^Offshore\s*$', l, re.I): anchor = max(0, i-2)

    i = anchor + 1 if anchor is not None else 0
    while i < len(lines):
        ln = lines[i]
        seg = None
        if re.match(r'^Offshore\s*$', ln.strip(), re.I): seg = 'Offshore'
        elif re.match(r'^Onshore\s*$', ln.strip(), re.I): seg = 'Onshore'

        if seg:
            nums = []
            for k in range(i+1, min(i+5, len(lines))):
                parts = re.findall(r'\d[\d,]*\.?\d*', lines[k])
                for p in parts:
                    v = parse_num(p)
                    if v and v > 10000:
                        nums.append(v)
            if nums:
                segs[seg] = nums[0]
        i += 1

    if segs:
        for seg, val in segs.items():
            add(f"revenue|{seg}", fy, val)
        print(f"{fy}: {segs}")
    else:
        print(f"{fy}: parse failed")

all_fy   = sorted(set(y for d in flat.values() for y in d))
all_segs = sorted(set(k.split('|')[1] for k in flat if '|' in k))

out = {
    "symbol": "ONGC", "basis": "standalone",
    "company": "Oil and Natural Gas Corporation Limited",
    "currency": "INR_Cr",
    "source": "NSE Annual Reports — Note 44 Segment Revenue (Standalone)",
    "segments": all_segs, "years": all_fy,
    "segment_time_series": flat,
}
OUT.write_text(json.dumps(out, indent=2))
print(f"\nDone: {all_fy[0] if all_fy else '?'} - {all_fy[-1] if all_fy else '?'} ({len(all_fy)} years)")
print(f"Segments: {all_segs}")
