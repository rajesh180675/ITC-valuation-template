"""
Tech Mahindra segment extractor.
Source: Consolidated notes — 'Revenue disaggregation by industry verticals'
Currency: millions INR -> /10 -> Crores
Run: py -3.14 scripts/extract_techm_segments.py
"""
import re, json, fitz, os
from pathlib import Path

BASE = Path("C:/Users/rajesh/WindsurfAPI/ITC-valuation-template")
PDF_DIR = BASE / "public/data/annual_reports/TECHM"
OUT = BASE / "public/data/segment_data_techm.json"

SEG_NORM = {
    "communications": "Communications",
    "manufacturing": "Manufacturing",
    "hi-tech and media": "Hi-Tech & Media",
    "hi tech and media": "Hi-Tech & Media",
    "hitech": "Hi-Tech & Media",
    "banking,financial services": "BFSI",
    "banking, financial services": "BFSI",
    "bfsi": "BFSI",
    "retail, transport": "Retail Transport & Logistics",
    "retail,transport": "Retail Transport & Logistics",
    "healthcare and life sciences": "Healthcare & Life Sciences",
    "healthcare & life sciences": "Healthcare & Life Sciences",
    "others": "Others",
}

def norm_seg(s):
    sl = s.strip().lower()
    for k, v in SEG_NORM.items():
        if sl.startswith(k): return v
    return None

def parse_num(s):
    s = s.strip().replace(',', '')
    try: return float(s)
    except: return None

def find_seg_page(doc):
    for i, page in enumerate(doc):
        t = page.get_text()
        if re.search(r'revenue disaggregation by industry vertical', t, re.I) and re.search(r'\d{4,}', t):
            return i, t
    return None, None

def extract_year(text):
    m = re.search(r'March\s+31[,\s]+(\d{4})', text)
    if m: return f"FY{m.group(1)}"
    return None

flat = {}
def add(key, fy, val): flat.setdefault(key, {})[fy] = round(val / 10, 2)  # millions -> Cr

pdfs = sorted(PDF_DIR.glob("TECHM_AR_*.pdf"))
print(f"Processing {len(pdfs)} PDFs...")

for pdf_path in pdfs:
    fy = re.search(r'FY(\d{4})', pdf_path.name)
    if not fy: continue
    fy = f"FY{fy.group(1)}"
    try:
        doc = fitz.open(str(pdf_path))
        pg, txt = find_seg_page(doc)
        doc.close()
    except Exception as e:
        print(f"{fy}: ERROR {e}"); continue
    if pg is None:
        print(f"{fy}: no segment page"); continue

    lines = [l.strip() for l in txt.split('\n') if l.strip()]
    # Find the revenue disaggregation block
    start = None
    for i, l in enumerate(lines):
        if re.search(r'revenue disaggregation by industry vertical', l, re.I):
            start = i; break
    if start is None:
        print(f"{fy}: no start"); continue

    segs_found = {}
    i = start + 1
    while i < min(start + 60, len(lines)):
        seg = norm_seg(lines[i])
        if seg:
            # Next numeric token = current year value
            j = i + 1
            while j < min(i + 5, len(lines)):
                v = parse_num(lines[j])
                if v and v > 100:
                    segs_found[seg] = v
                    break
                j += 1
        elif re.match(r'^Total', lines[i], re.I) and segs_found:
            break
        i += 1

    if segs_found:
        for seg, val in segs_found.items():
            add(f"revenue|{seg}", fy, val)
        print(f"{fy}: {list(segs_found.keys())[:3]}...")
    else:
        print(f"{fy}: parse failed")

all_fy = sorted(set(y for d in flat.values() for y in d))
all_segs = sorted(set(k.split('|')[1] for k in flat if '|' in k))

out = {
    "symbol": "TECHM", "basis": "consolidated",
    "company": "Tech Mahindra Limited",
    "currency": "INR_Cr",
    "source": "NSE Annual Reports — Revenue disaggregation by industry verticals (consolidated)",
    "segments": all_segs, "years": all_fy,
    "segment_time_series": flat,
}
OUT.write_text(json.dumps(out, indent=2))
print(f"\nDone: {all_fy[0] if all_fy else '?'} - {all_fy[-1] if all_fy else '?'} ({len(all_fy)} years)")
print(f"Segments: {all_segs}")
