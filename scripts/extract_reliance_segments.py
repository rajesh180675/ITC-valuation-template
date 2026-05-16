#!/usr/bin/env python3
"""
Extract segment revenue and EBIT from Reliance Industries annual reports.
Token-aware parser — handles split names and multi-value tokens.
"""
import fitz, re, json
from pathlib import Path

PDF_DIR  = Path("public/data/annual_reports/RELIANCE")
OUT_FILE = Path("public/data/segment_data_reliance.json")

SEG_ALIASES = {
    "o2c": "O2C", "oil to chemicals": "O2C",
    "refining": "Refining",
    "petrochemicals": "Petrochemicals",
    "petrochemical": "Petrochemicals",
    "oil and gas": "Oil and Gas",
    "oil & gas": "Oil and Gas",
    "organised retail": "Retail",
    "organized retail": "Retail",
    "retail": "Retail",
    "digital services": "Digital Services",
    "financial services": "Financial Services",
    "others": "Others",
    "unallocable": "Unallocable",
    "total": "Total",
}
KNOWN_SEGS = set(SEG_ALIASES.keys())
# prefixes that need accumulation
PARTIAL_PREFIXES = {'oil and', 'oil &', 'digital', 'organised', 'organized', 'financial'}

def norm_seg(s):
    k = re.sub(r'\*+', '', s).strip().lower()
    return SEG_ALIASES.get(k, s.strip())

def extract_nums_from_token(t):
    """Extract all numbers from a token string (handles multi-value like '19,957  3,26,872')."""
    results = []
    # Find all number patterns (digits with commas/decimals, optionally in parens)
    for m in re.finditer(r'\([\d,]+\.?\d*\)|[\d,]+\.?\d*', t):
        s = m.group(0)
        neg = s.startswith('(')
        s = s.strip('()')
        s = s.replace(',', '')
        try:
            v = float(s)
            results.append(-v if neg else v)
        except:
            pass
    # Handle bare dash = 0
    if not results and re.fullmatch(r'[-–—]', t.strip()):
        results.append(0.0)
    return results

def extract_row_nums(tokens, start_idx, max_tokens=25):
    """Collect all numbers from start_idx until a non-numeric label is hit."""
    nums = []
    for i in range(start_idx, min(start_idx + max_tokens, len(tokens))):
        t = tokens[i]
        # Stop at text labels (but not row counters like '1', '2')
        if re.search(r'[a-zA-Z]{3,}', t) and not re.match(r'^\d+$', t):
            # Check if it's a row label signalling next section
            if re.search(r'(Segment|Turnover|Revenue|Less|Inter|Value|Finance|Tax|Profit|Deprec)', t, re.I):
                break
        row_nums = extract_nums_from_token(t)
        nums.extend(row_nums)
    return nums

def detect_is_paired(tokens, psi_idx, n_tokens=100):
    """Pre-scan for year-pair headers. Handles both hyphen and en-dash year formats."""
    year_pat = re.compile(r'^\d{4}[-–\u2013]\d{2,4}$')
    pair_line = re.compile(r'\d{4}[-–\u2013]\d{2}.*\d{4}[-–\u2013]\d{2}')
    for i in range(psi_idx, min(psi_idx + n_tokens, len(tokens))):
        t = tokens[i]
        if pair_line.search(t):
            return True
        if year_pat.match(t):
            if i + 1 < len(tokens) and year_pat.match(tokens[i + 1]):
                return True
        if re.search(r'External Turnover', t, re.I):
            break
    return False


def detect_segments(tokens, psi_idx):
    """
    Read segment column headers after PSI token.
    Anchors to 'Particulars' row if present (early ARs have long desc before headers).
    Handles split names like 'Oil and' + 'Gas'.
    """
    segs = []
    buf = ''

    # If 'Particulars' exists between PSI and External Turnover, start from there
    start_idx = psi_idx + 1
    for i in range(psi_idx + 1, min(psi_idx + 80, len(tokens))):
        if tokens[i].lower().strip() == 'particulars':
            start_idx = i + 1
            break
        if re.search(r'External Turnover', tokens[i], re.I):
            break

    for i in range(start_idx, min(start_idx + 60, len(tokens))):
        t = tokens[i]
        tl = t.strip().lower()

        # Row separator — numbered rows start table data
        if re.match(r'^\d+$', t) and segs:
            break

        # Skip meta tokens
        if re.match(r'^\(.*crore.*\)$', tl, re.I):
            continue
        if tl in ('particulars', '(` in crore)', '(c in crore)', '(rs. in crore)',
                  'sub-total', 'eliminations'):
            continue
        # Skip year tokens
        if re.match(r'^\d{4}[-–]\d{2,4}$', t):
            continue
        if re.search(r'\d{4}[-–]\d{2}.*\d{4}[-–]\d{2}', t):
            continue

        # Accumulate multi-word names
        candidate = (buf + ' ' + t).strip() if buf else t
        cl = re.sub(r'\*+', '', candidate).strip().lower()

        matched = SEG_ALIASES.get(cl)
        if matched:
            segs.append(matched)
            buf = ''
            if matched == 'Total':
                break
            continue

        # Check if current token alone matches
        tl_clean = re.sub(r'\*+', '', tl).strip()
        if tl_clean in SEG_ALIASES:
            segs.append(SEG_ALIASES[tl_clean])
            buf = ''
            continue

        # Partial prefix — accumulate
        if tl_clean in PARTIAL_PREFIXES or cl in PARTIAL_PREFIXES:
            buf = candidate
            continue

        # Buffer flush
        if buf:
            bl = re.sub(r'\*+', '', buf).strip().lower()
            if bl in SEG_ALIASES:
                segs.append(SEG_ALIASES[bl])
            buf = t
        else:
            buf = t

    # Flush buffer
    if buf:
        bl = re.sub(r'\*+', '', buf).strip().lower()
        if bl in SEG_ALIASES:
            segs.append(SEG_ALIASES[bl])

    return segs

def find_primary_seg_page(doc):
    total = len(doc)
    for i in range(int(total * 0.4), total):
        txt = doc[i].get_text()
        if (re.search(r'Primary Segment Information', txt, re.I)
                and re.search(r'External Turnover', txt, re.I)
                and re.search(r'\d{3,}', txt)):
            return i, txt
    return None, None

def parse_segment_page(txt):
    tokens = [l.strip() for l in txt.split('\n') if l.strip()]

    psi_idx = next((i for i, t in enumerate(tokens)
                    if re.search(r'Primary Segment Information', t, re.I)), None)
    if psi_idx is None:
        return {}

    segs      = detect_segments(tokens, psi_idx)
    is_paired = detect_is_paired(tokens, psi_idx)
    work_segs = [s for s in segs if s not in ('Unallocable', 'Total')]

    if len(work_segs) < 2:
        return {}

    ext_idx = next((i for i, t in enumerate(tokens) if i > psi_idx
                    and re.search(r'External Turnover', t, re.I)), None)

    # Segment Result may be split: "Segment" + "Result before" across tokens
    res_idx = None
    for i in range(psi_idx, len(tokens)):
        t = tokens[i]
        if re.search(r'Segment Result', t, re.I):
            res_idx = i
            break
        # Split case: "Segment" on one line, "Result..." on next
        if re.search(r'^Segment$', t, re.I) and i + 1 < len(tokens):
            if re.search(r'^Result', tokens[i + 1], re.I):
                res_idx = i
                break

    out = {}

    def assign(nums, key, paired, seg_list):
        n = len(seg_list)
        if not nums:
            return
        if paired and len(nums) >= 2 * n:
            for j, s in enumerate(seg_list):
                out.setdefault(s, {})[key] = nums[j * 2]
        else:
            for j, s in enumerate(seg_list):
                if j < len(nums):
                    out.setdefault(s, {})[key] = nums[j]

    if ext_idx is not None:
        nums = extract_row_nums(tokens, ext_idx + 1, max_tokens=30)
        assign(nums, 'revenue', is_paired, work_segs)

    if res_idx is not None:
        # Skip label tokens after "Segment Result" (e.g. "before Interest and", "Taxes")
        start = res_idx + 1
        while start < len(tokens) and not re.search(r'\d', tokens[start]):
            start += 1
        nums = extract_row_nums(tokens, start, max_tokens=30)
        assign(nums, 'ebit', is_paired, work_segs)

    return out

# ── Main ──────────────────────────────────────────────────────────────────────
flat_series = {}

def add_series(key, fy, val):
    flat_series.setdefault(key, {})[fy] = val

pdfs = sorted(PDF_DIR.glob("RELIANCE_AR_*.pdf"))
relevant = [f for f in pdfs
            if int(re.search(r'_(\d{4})\.pdf$', f.name).group(1)) >= 2003]

print(f"Scanning {len(relevant)} PDFs...")

for pdf_path in relevant:
    yr_str = re.search(r'_(\d{4})\.pdf$', pdf_path.name).group(1)
    fy = f"FY{yr_str}"
    print(f"\n{fy}: ", end='', flush=True)

    try:
        doc = fitz.open(str(pdf_path))
        pg_idx, txt = find_primary_seg_page(doc)
        if pg_idx is not None and pg_idx + 1 < len(doc):
            txt = txt + "\n" + doc[pg_idx + 1].get_text()
        doc.close()
    except Exception as e:
        print(f"ERROR: {e}")
        continue

    if pg_idx is None:
        print("no segment page")
        continue

    seg_data = parse_segment_page(txt)

    if not seg_data:
        print("parse failed")
        continue

    parts = []
    for seg, vals in seg_data.items():
        parts.append(f"{seg}(r={vals.get('revenue')},e={vals.get('ebit')})")
        if 'revenue' in vals:
            add_series(f"revenue|{seg}", fy, vals['revenue'])
        if 'ebit' in vals:
            add_series(f"ebit|{seg}", fy, vals['ebit'])
    print(", ".join(parts))

# ── Output ─────────────────────────────────────────────────────────────────────
all_fy   = sorted(set(fy for d in flat_series.values() for fy in d))
all_segs = sorted(set(k.split('|')[1] for k in flat_series if '|' in k))

out = {
    "symbol": "RELIANCE",
    "basis": "consolidated",
    "company": "Reliance Industries Limited",
    "currency": "INR Crore",
    "source": "ril.com Annual Reports — Consolidated Segment Note (Ind AS 108 / AS 17)",
    "segments": all_segs,
    "years": all_fy,
    "segment_time_series": flat_series,
}

OUT_FILE.write_text(json.dumps(out, indent=2))
print(f"\n=== Done ===")
if all_fy:
    print(f"Years: {all_fy[0]} – {all_fy[-1]} ({len(all_fy)} years)")
print(f"Series keys: {len(flat_series)}")
print(f"Segments: {all_segs}")
print(f"Output: {OUT_FILE}")
