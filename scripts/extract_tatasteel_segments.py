"""
Tata Steel segment extractor (v2).
Source: Consolidated Note 28 — Revenue disaggregated by geography
Segments: India, Outside India (by geography) + Steel/Power/Others (by business)
Currency: Crores
Run: py -3.14 scripts/extract_tatasteel_segments.py
"""
import re, json, fitz
from pathlib import Path

BASE    = Path("C:/Users/rajesh/WindsurfAPI/ITC-valuation-template")
PDF_DIR = BASE / "public/data/annual_reports/TATASTEEL"
OUT     = BASE / "public/data/segment_data_tatasteel.json"

def parse_num(s):
    s = s.strip().replace(',', '').replace('(', '-').replace(')', '')
    try: return float(s)
    except: return None

def find_seg_page(doc):
    """Find revenue disaggregation page."""
    for i, page in enumerate(doc):
        t = page.get_text()
        tl = t.lower()
        if ('revenue from operations' in tl or 'revenue disaggregat' in tl) and \
           'india' in tl and 'outside india' in tl and re.search(r'\d{5,}', t.replace(',', '')):
            return i, t
    return None, None

flat = {}
def add(key, fy, val): flat.setdefault(key, {})[fy] = round(val, 2)

pdfs = sorted(PDF_DIR.glob("TATASTEEL_AR_*.pdf"))
print(f"Processing {len(pdfs)} TATASTEEL PDFs...")

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

    # Find geography block: "(a) India" then "(b) Outside India"
    segs = {}
    for i, l in enumerate(lines):
        ll = l.lower().strip()
        is_outside = bool(re.search(r'outside\s+india', ll))
        # Match lines that are ONLY "india" (with optional lettered prefix)
        is_india = (not is_outside and bool(re.match(r'^(?:\([a-z]\)\s*\t?\s*)?india\s*$', ll)))
        if is_india and not is_outside:
            j = i + 1
            while j < min(i + 5, len(lines)):
                v = parse_num(lines[j])
                if v and v > 1000:
                    segs['India'] = v; break
                j += 1
        elif is_outside:
            j = i + 1
            while j < min(i + 5, len(lines)):
                v = parse_num(lines[j])
                if v and v > 1000:
                    segs['Outside India'] = v; break
                j += 1
        if len(segs) == 2:
            break

    # Also try business segments: Steel, Power
    biz = {}
    for i, l in enumerate(lines):
        if re.match(r'^(\([a-z]\)\s*\t?\s*)?Steel\s*$', l, re.I):
            j = i + 1
            while j < min(i + 5, len(lines)):
                v = parse_num(lines[j])
                if v and v > 1000:
                    biz['Steel'] = v; break
                j += 1

    if segs:
        for seg, val in segs.items():
            add(f"revenue|{seg}", fy, val)
        if biz:
            for seg, val in biz.items():
                add(f"revenue|{seg}", fy, val)
        print(f"{fy}: {segs}")
    else:
        print(f"{fy}: parse failed")

all_fy   = sorted(set(y for d in flat.values() for y in d))
all_segs = sorted(set(k.split('|')[1] for k in flat if '|' in k))

out = {
    "symbol": "TATASTEEL", "basis": "consolidated",
    "company": "Tata Steel Limited",
    "currency": "INR_Cr",
    "source": "NSE Annual Reports — Note 28 Revenue by Geography (Consolidated)",
    "segments": all_segs, "years": all_fy,
    "segment_time_series": flat,
}
OUT.write_text(json.dumps(out, indent=2))
print(f"\nDone: {all_fy[0] if all_fy else '?'} - {all_fy[-1] if all_fy else '?'} ({len(all_fy)} years)")
print(f"Segments: {all_segs}")
