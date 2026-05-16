#!/usr/bin/env python3
"""
Extract Infosys segment revenue + operating income from MDA section.
Source: 'Business segments – Consolidated' table in MDA.

Segment abbreviation map (older ARs use short codes):
  FS = Financial Services
  MFG = Manufacturing  
  ECS = Energy/Utilities/Resources/Services
  RCL = Retail/CPG/Logistics
  HILIFE = Life Sciences/Healthcare
  Hi-Tech = Hi-Tech
  All other segments = Others
"""
import re, json, fitz
from pathlib import Path

PDF_DIR  = Path("public/data/annual_reports/INFY")
OUT_FILE = Path("public/data/segment_data_infy.json")

# Canonical segment names
SEG_NORM = {
    # Full names (recent ARs)
    'financial services': 'Financial Services',
    'financial': 'Financial Services',      # split token
    'retail communication': 'Retail, Communication',
    'retail': 'Retail, Communication',
    'communication': 'Retail, Communication',
    'energy, utilities, resources and services': 'Energy/Utilities/Resources/Services',
    'energy, utilities,': 'Energy/Utilities/Resources/Services',
    'energy': 'Energy/Utilities/Resources/Services',
    'manufacturing': 'Manufacturing',
    'hi-tech': 'Hi-Tech',
    'hitech': 'Hi-Tech',
    'life sciences': 'Life Sciences/Healthcare',
    'life': 'Life Sciences/Healthcare',
    'all other segments': 'Others',
    'all other': 'Others',
    # Short codes (older ARs up to ~FY2019)
    'fs': 'Financial Services',
    'mfg': 'Manufacturing',
    'ecs': 'Energy/Utilities/Resources/Services',
    'rcl': 'Retail, Communication',
    'hilife': 'Life Sciences/Healthcare',
    'hi-tech all other': 'Hi-Tech',   # merged in some years
    'total': 'Total',
}

def norm_seg(s):
    k = re.sub(r'\*+|\(.*?\)', '', s).strip().lower()
    # Direct match
    if k in SEG_NORM:
        return SEG_NORM[k]
    # Prefix match
    for alias, canon in SEG_NORM.items():
        if k.startswith(alias) and len(alias) >= 3:
            return canon
    return None

def parse_num(s):
    s = s.strip().replace(',', '')
    neg = s.startswith('(') and s.endswith(')')
    s = s.strip('()')
    if re.match(r'^[-–—]$', s): return 0.0
    try:
        v = float(s)
        return -v if neg else v
    except:
        return None

def find_biz_seg_page(doc):
    """Find page with consolidated segment table (phrasing varies by era)."""
    patterns = [
        r'Business segments\s*[–-]\s*[Cc]onsolidated',
        r'Industry segments\s*[–-]\s*[Cc]onsolidated',
        r'Business segments\s*[–-]\s*consolidated',
        r'Industry verticals\s*[–-]\s*[Cc]onsolidated',
    ]
    for i in range(len(doc)):
        txt = doc[i].get_text()
        for pat in patterns:
            if (re.search(pat, txt)
                    and re.search(r'Segmental revenues', txt, re.I)
                    and re.search(r'\d{4,}', txt)):
                return i, txt
    return None, None


def find_consol_marker(tokens, biz_idx):
    """Find index of the consolidated section (skip standalone if present)."""
    # Look for 'consolidated' keyword after biz_idx
    for i in range(biz_idx, min(biz_idx + 5, len(tokens))):
        if re.search(r'[Cc]onsolidated', tokens[i]):
            return i
    return biz_idx

def extract_infy_segments(txt, fy_year):
    tokens = [l.strip() for l in txt.split('\n') if l.strip()]

    # Find consolidated section start — could be "Business segments – Consolidated"
    # or "Industry segments – consolidated"
    biz_idx = None
    for i, t in enumerate(tokens):
        if re.search(r'(Business|Industry) segments\s*[–-]\s*[Cc]onsolidated', t):
            biz_idx = i; break
        if re.search(r'Industry verticals\s*[–-]\s*[Cc]onsolidated', t):
            biz_idx = i; break
    if biz_idx is None:
        return {}

    # Find "Segmental revenues" row
    rev_idx = next((i for i, t in enumerate(tokens)
                    if i > biz_idx and re.search(r'Segmental revenues', t, re.I)), None)
    if rev_idx is None:
        return {}

    # Extract segment names from header tokens[biz_idx+1 : rev_idx]
    segs = []
    buf = ''
    for i in range(biz_idx + 1, rev_idx):
        t = tokens[i]
        tl = t.lower().strip()

        # Skip meta tokens
        if re.match(r'^\(.*[Cc]rore.*\)$', t) or tl in ('particulars', 'in ` crore', '(in ₹ crore)'):
            continue

        # Direct single-token match
        direct = norm_seg(t)
        if direct and direct != 'Total':
            if buf:
                b = norm_seg(buf)
                if b and b != 'Total' and b not in segs:
                    segs.append(b)
                buf = ''
            if direct not in segs:
                segs.append(direct)
            continue

        # Multi-token accumulation
        candidate = (buf + ' ' + t).strip() if buf else t
        c = norm_seg(candidate)
        if c and c != 'Total':
            if c not in segs:
                segs.append(c)
            buf = ''
        else:
            buf = candidate

    # Flush buffer
    if buf:
        b = norm_seg(buf)
        if b and b != 'Total' and b not in segs:
            segs.append(b)

    work_segs = [s for s in segs if s != 'Total']
    if len(work_segs) < 3:
        return {}

    # Revenue numbers: after "Segmental revenues" + optional year token
    nums_start = rev_idx + 1
    if nums_start < len(tokens) and re.match(r'^\d{4}$', tokens[nums_start]):
        nums_start += 1

    rev_nums = []
    for i in range(nums_start, min(nums_start + len(work_segs) + 5, len(tokens))):
        t = tokens[i]
        if re.search(r'[a-zA-Z]{3,}', t):
            break
        v = parse_num(t)
        if v is not None and abs(v) > 10:
            rev_nums.append(v)

    # Operating income
    oi_idx = next((i for i, t in enumerate(tokens)
                   if i > rev_idx and re.search(r'Segmental operating income', t, re.I)), None)
    oi_nums = []
    if oi_idx is not None:
        oi_start = oi_idx + 1
        if oi_start < len(tokens) and re.match(r'^\d{4}$', tokens[oi_start]):
            oi_start += 1
        for i in range(oi_start, min(oi_start + len(work_segs) + 5, len(tokens))):
            t = tokens[i]
            if re.search(r'[a-zA-Z]{3,}', t):
                break
            v = parse_num(t)
            if v is not None:
                oi_nums.append(v)

    out = {}
    for j, seg in enumerate(work_segs):
        if j < len(rev_nums):
            out.setdefault(seg, {})['revenue'] = rev_nums[j]
        if j < len(oi_nums):
            out.setdefault(seg, {})['ebit'] = oi_nums[j]

    return out


# ── Main extraction loop ──────────────────────────────────────────────────────
flat_series = {}

def add_series(key, fy, val):
    flat_series.setdefault(key, {})[fy] = val

pdfs = sorted(PDF_DIR.glob("INFY_AR_*.pdf"))
print(f"Extracting segments from {len(pdfs)} PDFs...")

for pdf_path in pdfs:
    yr_str = re.search(r'_(\d{4})\.pdf$', pdf_path.name).group(1)
    fy = f"FY{yr_str}"
    if int(yr_str) < 2008:
        continue
    print(f"\n{fy}: ", end='', flush=True)

    try:
        doc = fitz.open(str(pdf_path))
        pg_idx, txt = find_biz_seg_page(doc)
        doc.close()
    except Exception as e:
        print(f"ERROR: {e}"); continue

    if pg_idx is None:
        print("no page"); continue

    seg_data = extract_infy_segments(txt, fy)
    if not seg_data:
        print("parse failed"); continue

    parts = []
    for seg, vals in seg_data.items():
        parts.append(f"{seg[:12]}(r={vals.get('revenue')},e={vals.get('ebit')})")
        if 'revenue' in vals:
            add_series(f"revenue|{seg}", fy, vals['revenue'])
        if 'ebit' in vals:
            add_series(f"ebit|{seg}", fy, vals['ebit'])
    print(", ".join(parts))

# ── Output ─────────────────────────────────────────────────────────────────────
all_fy   = sorted(set(fy for d in flat_series.values() for fy in d))
all_segs = sorted(set(k.split('|')[1] for k in flat_series if '|' in k))

out = {
    "symbol": "INFY",
    "basis": "consolidated",
    "company": "Infosys Limited",
    "currency": "INR Crore",
    "source": "infosys.com Annual Reports — MDA Business Segments Consolidated table",
    "segments": all_segs,
    "years": all_fy,
    "segment_time_series": flat_series,
}

OUT_FILE.write_text(json.dumps(out, indent=2))
print(f"\n=== INFY Done ===")
if all_fy:
    print(f"Years: {all_fy[0]} – {all_fy[-1]} ({len(all_fy)} years)")
print(f"Series: {len(flat_series)} | Segments: {all_segs}")
