"""
Power Grid Corporation segment extractor.
Source: Standalone — Segment Revenue (Transmission + Consultancy)
Currency: Crores
Run: py -3.14 scripts/extract_powergrid_segments.py
"""
import re, json, fitz
from pathlib import Path

BASE    = Path("C:/Users/rajesh/WindsurfAPI/ITC-valuation-template")
PDF_DIR = BASE / "public/data/annual_reports/POWERGRID"
OUT     = BASE / "public/data/segment_data_powergrid.json"

SEGS = ['Transmission', 'Consultancy']

def parse_num(s):
    s = s.strip().replace(',', '')
    try: return float(s)
    except: return None

def find_seg_page(doc):
    for i, page in enumerate(doc):
        t = page.get_text()
        tl = t.lower()
        if 'segment revenue' in tl and 'transmission' in tl and 'consultancy' in tl:
            nums = re.findall(r'[\d,]+\.\d+', t)
            if len(nums) >= 4: return i, t
    return None, None

flat = {}
def add(key, fy, val): flat.setdefault(key, {})[fy] = round(val, 2)

pdfs = sorted(PDF_DIR.glob("POWERGRID_AR_*.pdf"))
print(f"Processing {len(pdfs)} POWERGRID PDFs...")

for pdf_path in pdfs:
    m = re.search(r'FY(\d{4})', pdf_path.name)
    if not m: continue
    fy = f"FY{m.group(1)}"
    try:
        doc = fitz.open(str(pdf_path))
        pg, txt = find_seg_page(doc)
        if pg is not None and pg + 1 < len(doc):
            txt = txt + "\n" + doc[pg+1].get_text()
        doc.close()
    except Exception as e:
        print(f"{fy}: ERROR {e}"); continue
    if pg is None:
        print(f"{fy}: no page"); continue

    lines = [l.strip() for l in txt.split('\n') if l.strip()]

    # Find "Segment Revenue" section first, then parse values below
    sevs_start = None
    for i, l in enumerate(lines):
        if re.search(r'segment revenue', l, re.I):
            sevs_start = i; break
    if sevs_start is None:
        print(f"{fy}: no Segment Revenue section"); continue

    segs = {}
    for i in range(sevs_start, min(sevs_start + 30, len(lines))):
        l = lines[i]
        if l.startswith('-') and len(l) < 40:
            seg_name = l.lstrip('- ').strip()
            if seg_name.lower() in ['transmission', 'consultancy']:
                j = i + 1
                while j < min(i + 5, len(lines)):
                    v = parse_num(lines[j])
                    if v and v > 100:
                        segs[seg_name] = v; break
                    j += 1

    if segs:
        for seg, val in segs.items():
            add(f"revenue|{seg}", fy, val)
        print(f"{fy}: {segs}")
    else:
        print(f"{fy}: parse failed")

all_fy   = sorted(set(y for d in flat.values() for y in d))
all_segs = sorted(set(k.split('|')[1] for k in flat if '|' in k))

out = {
    "symbol": "POWERGRID", "basis": "standalone",
    "company": "Power Grid Corporation of India Limited",
    "currency": "INR_Cr",
    "source": "NSE Annual Reports — Segment Revenue (Standalone)",
    "segments": all_segs, "years": all_fy,
    "segment_time_series": flat,
}
OUT.write_text(json.dumps(out, indent=2))
print(f"\nDone: {all_fy[0] if all_fy else '?'} - {all_fy[-1] if all_fy else '?'} ({len(all_fy)} years)")
