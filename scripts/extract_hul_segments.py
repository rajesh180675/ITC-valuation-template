#!/usr/bin/env python3
"""
Extract HUL segment data from consolidated financial notes.
Row-based format: seg_name | ext_curr | '-' | total_curr | ext_prev | '-' | total_prev
"""
import re, json, fitz
from pathlib import Path

PDF_DIR  = Path("public/data/annual_reports/HUL")
OUT_FILE = Path("public/data/segment_data_hindunilvr.json")

SEG_NORM = {
    'home care': 'Home Care',
    'personal care': 'Personal Care',
    'beauty & personal care': 'Beauty & Personal Care',
    'beauty and personal care': 'Beauty & Personal Care',
    'foods & refreshment': 'Foods & Refreshment',
    'foods and refreshment': 'Foods & Refreshment',
    'foods': 'Foods',
    'refreshment': 'Refreshment',
    'others': 'Others',
    # Pre-Ind AS (FY2013-FY2016) segment names
    'soaps and detergents': 'Soaps & Detergents',
    'soaps & detergents': 'Soaps & Detergents',
    'personal products': 'Personal Products',
    'beverages': 'Beverages',
    'packaged foods': 'Packaged Foods',
}

def norm_seg(s):
    k = re.sub(r'\x07|\*+', '', s).strip().lower()
    # Exact match
    if k in SEG_NORM: return SEG_NORM[k]
    # Prefix match
    for alias, canon in SEG_NORM.items():
        if k.startswith(alias): return canon
    return None

def parse_num(s):
    s = s.strip().replace(',', '')
    neg = s.startswith('(') and s.endswith(')')
    s = s.strip('()')
    if re.match(r'^[-–—]$', s): return 0.0
    try: return float(s) * (-1 if neg else 1)
    except: return None

def find_seg_note_page(doc):
    """Find page with segment information note (note number varies by year)."""
    for i in range(int(len(doc) * 0.4), len(doc)):
        txt = doc[i].get_text()
        # Post-Ind AS (FY2017+): note + home care + revenue
        if (re.search(r'(NOTE\s+\d+.*SEGMENT|SEGMENT INFORMATION)', txt, re.I)
                and re.search(r'(Home [Cc]are|Personal [Cc]are|Beauty)', txt)
                and re.search(r'Revenue', txt)):
            return i, txt
        # Post-Ind AS relaxed: segment note + home care definition (data on next page)
        if (re.search(r'(NOTE\s+\d+.*SEGMENT|SEGMENT INFORMATION)', txt, re.I)
                and re.search(r'Home [Cc]are include', txt)):
            if i + 1 < len(doc):
                txt2 = txt + "\n" + doc[i + 1].get_text()
                if re.search(r'Revenue', txt2):
                    return i, txt2
        # Pre-Ind AS (FY2013-FY2016): "SEGMENT INFORMATION FOR THE YEAR ENDED" + Soaps
        if (re.search(r'SEGMENT INFORMATION FOR THE YEAR ENDED', txt, re.I)
                and re.search(r'(Soaps|Detergent)', txt)
                and re.search(r'REVENUE', txt, re.I)):
            return i, txt
    return None, None

def extract_hul_segments(txt):
    """
    Parse row-based segment table.
    Each segment: name, [external, interseg, total] * 2 years
    Revenue and Result are separate blocks.
    """
    tokens = [l.strip() for l in txt.split('\n') if l.strip()]

    def find_section(label_re, start=0):
        for i in range(start, len(tokens)):
            if re.match(label_re, tokens[i], re.I):
                return i
        return None

    rev_idx  = find_section(r'^Revenue$')
    res_idx  = find_section(r'^Result$', (rev_idx or 0) + 1) or find_section(r'^RESULT$', (rev_idx or 0) + 1)

    if rev_idx is None:
        return {}

    out = {}

    def read_seg_block(start_idx, key):
        """Read segment rows: seg_name, num, '-', num, num, '-', num ..."""
        i = start_idx + 1
        while i < min(start_idx + 60, len(tokens)):
            t = tokens[i]
            seg = norm_seg(t)
            if not seg:
                # Multi-token segment name (e.g. "Others (includes Exports," + "Consignment, etc.)")
                candidate = t
                if i + 1 < len(tokens):
                    candidate2 = (t + ' ' + tokens[i+1]).strip()
                    seg2 = norm_seg(candidate2)
                    if seg2:
                        seg = seg2; i += 1
            if seg:
                # Next tokens are the numbers
                nums = []
                j = i + 1
                while j < len(tokens) and len(nums) < 6:
                    v = parse_num(tokens[j])
                    if v is not None:
                        nums.append(v)
                    elif re.match(r'^[-–—]$', tokens[j]):
                        nums.append(0.0)
                    elif re.search(r'[a-zA-Z]{3,}', tokens[j]):
                        break
                    j += 1
                if nums:
                    out.setdefault(seg, {})[key] = nums[0]  # external current year
                i = j
            elif re.search(r'^(Total|TOTAL|Un-allocated|Operating|Finance)', t, re.I):
                break
            else:
                i += 1

    read_seg_block(rev_idx, 'revenue')
    if res_idx is not None:
        read_seg_block(res_idx, 'ebit')

    return out


# ── Main ──────────────────────────────────────────────────────────────────────
flat_series = {}
def add_series(key, fy, val): flat_series.setdefault(key, {})[fy] = val

pdfs = sorted(PDF_DIR.glob("HUL_AR_*.pdf"))
print(f"Extracting from {len(pdfs)} PDFs...")

for pdf_path in pdfs:
    yr_str = re.search(r'_(\d{4})\.pdf$', pdf_path.name).group(1)
    fy = f"FY{yr_str}"
    print(f"\n{fy}: ", end='', flush=True)
    try:
        doc = fitz.open(str(pdf_path))
        pg_idx, txt = find_seg_note_page(doc)
        if pg_idx and pg_idx + 1 < len(doc):
            txt = txt + "\n" + doc[pg_idx + 1].get_text()
        doc.close()
    except Exception as e:
        print(f"ERROR: {e}"); continue
    if pg_idx is None:
        print("no page"); continue

    seg_data = extract_hul_segments(txt)
    if not seg_data:
        print("parse failed"); continue

    parts = []
    for seg, vals in seg_data.items():
        parts.append(f"{seg[:12]}(r={vals.get('revenue')},e={vals.get('ebit')})")
        if 'revenue' in vals: add_series(f"revenue|{seg}", fy, vals['revenue'])
        if 'ebit' in vals:    add_series(f"ebit|{seg}",    fy, vals['ebit'])
    print(", ".join(parts))

all_fy   = sorted(set(fy for d in flat_series.values() for fy in d))
all_segs = sorted(set(k.split('|')[1] for k in flat_series if '|' in k))

out = {
    "symbol": "HINDUNILVR", "basis": "consolidated",
    "company": "Hindustan Unilever Limited",
    "currency": "INR Crore",
    "source": "hul.co.in Annual Reports — Note 46 Segment Information (Ind AS 108)",
    "segments": all_segs, "years": all_fy,
    "segment_time_series": flat_series,
}
OUT_FILE.write_text(json.dumps(out, indent=2))
print(f"\n=== HUL Done ===")
if all_fy: print(f"Years: {all_fy[0]} – {all_fy[-1]} ({len(all_fy)} years)")
print(f"Series: {len(flat_series)} | Segments: {all_segs}")
