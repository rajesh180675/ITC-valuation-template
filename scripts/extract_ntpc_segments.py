"""
NTPC segment extractor.
Source: Standalone — Note 64 Operating Segments (Generation + Others)
Segments: Generation of energy, Others
Currency: Crores
Columns: Generation | Others | Total (both year-pairs)
Run: py -3.14 scripts/extract_ntpc_segments.py
"""
import re, json, fitz
from pathlib import Path

BASE    = Path("C:/Users/rajesh/WindsurfAPI/ITC-valuation-template")
PDF_DIR = BASE / "public/data/annual_reports/NTPC"
OUT     = BASE / "public/data/segment_data_ntpc.json"

def parse_num(s):
    s = s.strip().replace(',', '')
    try: return float(s)
    except: return None

def find_seg_page(doc):
    """Find Note 64 segment page with Segment Revenue as TABLE HEADER (not in description)."""
    for i, page in enumerate(doc):
        t = page.get_text()
        tl = t.lower()
        if 'segment revenue' in tl and 'generation' in tl:
            # Must have actual table numbers (not just description text)
            nums = re.findall(r'[\d,]+\.\d+', t)
            # Count large numbers (potential revenue values)
            big_nums = [n for n in nums if float(n.replace(',','')) > 5000]
            if len(big_nums) >= 3:
                return i, t
    return None, None

flat = {}
def add(key, fy, val): flat.setdefault(key, {})[fy] = round(val, 2)

pdfs = sorted(PDF_DIR.glob("NTPC_AR_*.pdf"))
print(f"Processing {len(pdfs)} NTPC PDFs...")

for pdf_path in pdfs:
    m = re.search(r'FY(\d{4})', pdf_path.name)
    if not m: continue
    fy = f"FY{m.group(1)}"
    try:
        doc = fitz.open(str(pdf_path))
        pg, txt = find_seg_page(doc)
        # Merge up to 3 subsequent pages to catch data tables spanning pages
        if pg is not None:
            for offset in range(1, 5):
                if pg + offset < len(doc):
                    txt = txt + "\n" + doc[pg + offset].get_text()
        doc.close()
    except Exception as e:
        print(f"{fy}: ERROR {e}"); continue
    if pg is None:
        print(f"{fy}: no page"); continue

    lines = [l.strip() for l in txt.split('\n') if l.strip()]

    # Find LAST "Segment revenue" occurrence (table header, not description)
    rev_start = None
    for i, l in enumerate(lines):
        if l.lower() == 'segment revenue' or re.match(r'^Segment revenue\s*$', l, re.I):
            rev_start = i
    if rev_start is None:
        # Fallback: find segment revenue anywhere
        for i, l in enumerate(lines):
            if 'segment revenue' in l.lower():
                rev_start = i; break
    if rev_start is None:
        print(f"{fy}: no Segment Revenue label"); continue

    # After "Segment revenue", find numbers
    nums = []
    for i in range(rev_start, min(rev_start + 25, len(lines))):
        # Find all numeric values in each line (handles "1,64,239.99  1,56,175.40" on one line)
        for m in re.finditer(r'[\d,]+\.\d+', lines[i]):
            v = parse_num(m.group())
            if v and v > 5000:
                nums.append(v)
        if len(nums) >= 4:
            break

    if len(nums) >= 4:
        # Format: generation_curr, generation_prev, others_curr, others_prev
        add(f"revenue|Generation of energy", fy, nums[0])
        add(f"revenue|Others", fy, nums[2])
        print(f"{fy}: Generation={nums[0]:.0f}, Others={nums[2]:.0f}")
    else:
        print(f"{fy}: parse failed (nums={len(nums)})")

all_fy   = sorted(set(y for d in flat.values() for y in d))
all_segs = sorted(set(k.split('|')[1] for k in flat if '|' in k))

out = {
    "symbol": "NTPC", "basis": "standalone",
    "company": "NTPC Limited",
    "currency": "INR_Cr",
    "source": "NSE Annual Reports — Note 64 Operating Segments (Standalone)",
    "segments": all_segs, "years": all_fy,
    "segment_time_series": flat,
}
OUT.write_text(json.dumps(out, indent=2))
print(f"\nDone: {all_fy[0] if all_fy else '?'} - {all_fy[-1] if all_fy else '?'} ({len(all_fy)} years)")
print(f"Segments: {all_segs}")
