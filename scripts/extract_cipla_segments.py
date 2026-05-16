"""
Cipla segment extractor.
Source: Consolidated Note 56 — Segment Information (Pharmaceuticals + New ventures)
Format: Labeled rows a) / b) with values
Currency: Crores
Run: py -3.14 scripts/extract_cipla_segments.py
"""
import re, json, fitz
from pathlib import Path

BASE    = Path("C:/Users/rajesh/WindsurfAPI/ITC-valuation-template")
PDF_DIR = BASE / "public/data/annual_reports/CIPLA"
OUT     = BASE / "public/data/segment_data_cipla.json"

def parse_num(s):
    s = s.strip().replace(',', '')
    try: return float(s)
    except: return None

def find_seg_page(doc):
    for i, page in enumerate(doc):
        t = page.get_text()
        tl = t.lower()
        if 'segment wise revenue and results' in tl and 'pharmaceuticals' in tl:
            return i, t
    return None, None

flat = {}
def add(key, fy, val): flat.setdefault(key, {})[fy] = round(val, 2)

pdfs = sorted(PDF_DIR.glob("CIPLA_AR_*.pdf"))
print(f"Processing {len(pdfs)} CIPLA PDFs...")

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
        # Try alternate search
        try:
            doc = fitz.open(str(pdf_path))
            for i, page in enumerate(doc):
                t = page.get_text()
                if re.search(r'(segment revenues|segment revenue)', t, re.I) and re.search(r'pharma', t, re.I):
                    pg, txt = i, t; break
            doc.close()
        except: pass
    if pg is None:
        print(f"{fy}: no page"); continue

    lines = [l.strip() for l in txt.split('\n') if l.strip()]

    segs = {}
    for i, l in enumerate(lines):
        ll = l.lower()
        if re.match(r'^[ab]\)\s*', l):
            # Get segment name from this line or next
            if 'pharmaceuticals' in ll or 'pharma' in ll:
                seg = 'Pharmaceuticals'
            elif 'new ventures' in ll or 'ventures' in ll or 'new' in ll:
                seg = 'New Ventures'
            else:
                continue

            j = i + 1
            while j < min(i + 5, len(lines)):
                v = parse_num(lines[j])
                if v and v > 100:
                    segs[seg] = v; break
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
    "symbol": "CIPLA", "basis": "consolidated",
    "company": "Cipla Limited",
    "currency": "INR_Cr",
    "source": "NSE Annual Reports — Note 56 Segment Information (Consolidated)",
    "segments": all_segs, "years": all_fy,
    "segment_time_series": flat,
}
OUT.write_text(json.dumps(out, indent=2))
print(f"\nDone: {all_fy[0] if all_fy else '?'} - {all_fy[-1] if all_fy else '?'} ({len(all_fy)} years)")
print(f"Segments: {all_segs}")
