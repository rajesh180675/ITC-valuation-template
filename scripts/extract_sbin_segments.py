"""
SBI segment extractor (v2) — simple text-based parser.
Source: Standalone Schedules — 'Business Segment' table
Format: Row labels then numbers (Segment Revenue, Segment Result)
Segments: Treasury | Corporate/Wholesale Banking | Retail Banking | Other Banking Operations
Currency: Crores (no conversion)
Run: py -3.14 scripts/extract_sbin_segments.py
"""
import re, json, fitz
from pathlib import Path

BASE    = Path("C:/Users/rajesh/WindsurfAPI/ITC-valuation-template")
PDF_DIR = BASE / "public/data/annual_reports/SBIN"
OUT     = BASE / "public/data/segment_data_sbin.json"

SEGS = ['Treasury', 'Corporate/Wholesale Banking', 'Retail Banking', 'Other Banking Operations']

def parse_num(s):
    s = s.strip().replace(',', '').replace('(', '-').replace(')', '')
    try: return float(s)
    except: return None

def find_seg_page(doc):
    """Find the standalone segment schedule page."""
    for i, page in enumerate(doc):
        t = page.get_text()
        tl = t.lower()
        if ('business segment' in tl or 'segment information' in tl) and \
           'treasury' in tl and ('retail banking' in tl or 'retail' in tl) and \
           ('revenue' in tl or 'result' in tl):
            lines = [l.strip() for l in t.split('\n') if l.strip()]
            # Must have numeric data (Indian format: 1,35,243 or 135243)
            nums = [l for l in lines if re.match(r'^\d[\d,]+\.\d+$', l)]
            if len(nums) >= 3:
                return i, t
    return None, None

flat = {}
def add(key, fy, val): flat.setdefault(key, {})[fy] = round(val, 2)

pdfs = sorted(PDF_DIR.glob("SBIN_AR_*.pdf"))
print(f"Processing {len(pdfs)} SBIN PDFs...")

for pdf_path in pdfs:
    m = re.search(r'FY(\d{4})', pdf_path.name)
    if not m: continue
    fy = f"FY{m.group(1)}"
    try:
        doc = fitz.open(str(pdf_path))
        pg, txt = find_seg_page(doc)
        # Try merging next page if needed
        if pg is not None and pg + 1 < len(doc):
            txt = txt + "\n" + doc[pg+1].get_text()
        doc.close()
    except Exception as e:
        print(f"{fy}: ERROR {e}"); continue
    if pg is None:
        print(f"{fy}: no page"); continue

    lines = [l.strip() for l in txt.split('\n') if l.strip()]

    # Strategy: find "Segment Revenue" row, collect next 4-6 numbers
    # Column order: Treasury | Corp/Wholesale | [Digital] | [Other Retail] | Retail Total | Other Banking | [Unalloc] | Total
    # We want: Treasury[0], Corp/Wholesale[1], Retail Total[-3], Other Banking[-2]
    def extract_row(label_re, lines, min_val=100):
        for i, l in enumerate(lines):
            if re.search(label_re, l, re.I):
                nums = []
                j = i + 1
                while j < min(i + 25, len(lines)) and len(nums) < 8:
                    # Indian number format: 1,35,243.41
                    v = parse_num(lines[j])
                    if v is not None and abs(v) > min_val:
                        nums.append(v)
                    elif nums and re.search(r'^[A-Za-z]{4,}', lines[j]) and not re.search(r'\d', lines[j]):
                        break
                    j += 1
                if len(nums) >= 4:
                    return nums
        return None

    rev_nums = extract_row(r'revenue.*except|^revenue\s*$|segment revenue|total revenue', lines)
    res_nums = extract_row(r'segment result|net profit|operating profit', lines)

    if rev_nums and len(rev_nums) >= 4:
        # Column order varies by year:
        # Post-2020 (7 cols): Treasury|Corp|Digital|OtherRetail|TotalRetail|OtherBanking|Total
        # Pre-2020 (5 cols):  Treasury|Corp|Retail|OtherBanking|Total
        # Note: OtherBanking often '-' so parse_num returns None and it's skipped
        n = len(rev_nums)
        if n >= 6:
            # Digital sub-column present: indices 0=Treas, 1=Corp, 2=Digital, 3=OtherRetail, 4=TotalRetail, 5=Total
            treasury, corp, retail = rev_nums[0], rev_nums[1], rev_nums[4]
            other = 0.0  # Other Banking has no segment revenue in SBI
        elif n == 5:
            treasury, corp, retail, other = rev_nums[0], rev_nums[1], rev_nums[2], rev_nums[3]
        else:
            treasury, corp, retail, other = rev_nums[0], rev_nums[1], rev_nums[2], 0.0

        add(f"revenue|Treasury", fy, treasury)
        add(f"revenue|Corporate/Wholesale Banking", fy, corp)
        add(f"revenue|Retail Banking", fy, retail)
        if other: add(f"revenue|Other Banking Operations", fy, other)

        if res_nums and len(res_nums) >= 4:
            rn = len(res_nums)
            if rn >= 6:
                rt, rc, rr, ro = res_nums[0], res_nums[1], res_nums[4], res_nums[5] if rn > 5 else 0
            elif rn == 5:
                rt, rc, rr, ro = res_nums[0], res_nums[1], res_nums[2], res_nums[3]
            else:
                rt, rc, rr, ro = res_nums[0], res_nums[1], res_nums[2], 0.0
            add(f"ebit|Treasury", fy, rt)
            add(f"ebit|Corporate/Wholesale Banking", fy, rc)
            add(f"ebit|Retail Banking", fy, rr)
            if ro: add(f"ebit|Other Banking Operations", fy, ro)

        print(f"{fy}: Treasury={treasury:.0f}, Corp={corp:.0f}, Retail={retail:.0f}")
    else:
        print(f"{fy}: parse failed (rev_nums={rev_nums})")

all_fy   = sorted(set(y for d in flat.values() for y in d))
all_segs = sorted(set(k.split('|')[1] for k in flat if '|' in k))

out = {
    "symbol": "SBIN", "basis": "standalone",
    "company": "State Bank of India",
    "currency": "INR_Cr",
    "source": "NSE Annual Reports — Schedule Business Segment (Standalone AS-17/Ind AS 108)",
    "segments": SEGS, "years": all_fy,
    "segment_time_series": flat,
}
OUT.write_text(json.dumps(out, indent=2))
print(f"\nDone: {all_fy[0] if all_fy else '?'} - {all_fy[-1] if all_fy else '?'} ({len(all_fy)} years)")
print(f"Segments: {all_segs}")
