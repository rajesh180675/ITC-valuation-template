"""
Bharti Airtel segment extractor — text-order based parsing.

The segment table in plain text (get_text()) comes out as:
  Summary of the segmental information for the year ended and as of March 31, 2025 is as follows:
  Mobile \nServices \nIndia\nMobile \nServices \nAfrica\n...\nTotal\n
  Revenue from external customers\n976,886\n413,798\n878\n...\n1,729,852\n
  Segment results^\n264,000\n...\n
  ...

So: segment headers come first (multi-line), then each data row = label + N values.
Two year tables may appear on the same page (current + prior year).

Currency: millions INR -> divide by 10 -> Crores
Run: py -3.14 scripts/extract_airtel_segments.py
"""

import fitz
import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR  = os.path.join(BASE_DIR, "public", "data", "annual_reports", "BHARTIARTL")
OUTPUT   = os.path.join(BASE_DIR, "public", "data", "segment_data_bhartiairtel.json")

EXCLUDE = {"unallocated", "elimination", "adjustment", "total", "others", "other", "notes"}

SEG_NORMALIZE = {
    "mobile services india":           "Mobile Services India",
    "mobile services africa":          "Mobile Services Africa",
    "mobile services south asia":      "Mobile Services South Asia",
    "airtel business":                 "Airtel Business",
    "passive infrastructure services": "Passive Infrastructure Services",
    "homes services":                  "Homes Services",
    "home services":                   "Homes Services",
    "telemedia services":              "Telemedia Services",
    "digital tv services":             "Digital TV Services",
    "digital tv":                      "Digital TV Services",
    "tower services":                  "Tower Services",
}

ROW_METRICS = {
    "revenue from external customers": "revenue",
    "segment results":                 "results",
    "segment assets":                  "assets",
    "segment liabilities":             "liabilities",
}

# Row labels that signal end of segment data (stop parsing values after these)
STOP_ROWS = {"less:", "other segment items", "as of march", "investment in joint"}


def parse_number(s):
    s = s.strip().replace(",", "").replace("\u2013","").replace("\u2014","").replace("\xa0","")
    if not s or s in ("-","–","—"):
        return 0.0
    if s.startswith("(") and s.endswith(")"):
        try:    return -float(s[1:-1])
        except: return None
    try:    return float(s)
    except: return None


def is_number_token(s):
    s = s.strip()
    return bool(re.match(r"^[\d,().\-–]+$", s)) and any(c.isdigit() for c in s)


def normalize_seg(raw):
    """Clean and canonicalize segment name. Returns None if excluded."""
    clean = re.sub(r"[@#%*^]+", "", raw)
    clean = re.sub(r"\s+", " ", clean).strip()
    cl = clean.lower()
    if any(ex == cl or ex in cl.split() for ex in EXCLUDE):
        return None
    if len(clean) > 60:  # junk line
        return None
    for alias, canon in SEG_NORMALIZE.items():
        if alias in cl:
            return canon
    return clean


def join_continuation_lines(lines):
    """
    Pre-process lines: join lines where a row label is split across two lines
    e.g. ["Revenue from external", "customers", "976,886", ...] ->
         ["Revenue from external customers", "976,886", ...]
    """
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        ll = line.lower().strip()
        # Check if this line starts a known metric but next line completes it
        partial_match = False
        for key in ROW_METRICS:
            if ll and key.startswith(ll) and ll != key:
                # Likely split — join with next line
                if i + 1 < len(lines):
                    joined = (line.strip() + " " + lines[i+1].strip())
                    result.append(joined)
                    i += 2
                    partial_match = True
                    break
        if not partial_match:
            result.append(line)
            i += 1
    return result


def parse_one_table(lines, start_idx):
    """
    Parse one segment table block starting at start_idx.
    Returns (fy, {metric: {seg: value_cr}}, next_idx).
    """
    # Pre-join split row labels
    lines = join_continuation_lines(lines)
    # First line should contain "Summary of the segmental information...March 31, YYYY"
    header_line = lines[start_idx]
    m = re.search(r"march\s+31,?\s*(\d{4})", header_line, re.IGNORECASE)
    fy = f"FY{m.group(1)}" if m else None

    # Skip past "is as follows:" continuation and institutional header text
    SKIP_HEADER_PATTERNS = [
        "is as follows", "notes to consolidated", "notes to standalone",
        "all amounts are in", "financial statements", "(all amounts",
    ]
    i = start_idx + 1
    while i < len(lines):
        ll = lines[i].lower().strip()
        if not ll or any(p in ll for p in SKIP_HEADER_PATTERNS):
            i += 1
            continue
        break

    # --- Parse segment header names ---
    # Segment names come as multi-word/multi-line text before the first data row
    # Data rows start when we see a line that is a known ROW_METRICS key
    seg_names = []
    seg_buffer = []

    def flush_seg():
        if seg_buffer:
            combined = re.sub(r"\s+", " ", " ".join(seg_buffer)).strip()
            canon = normalize_seg(combined)
            if canon and canon not in seg_names:
                seg_names.append(canon)
            seg_buffer.clear()

    while i < len(lines):
        line = lines[i].strip()
        ll = line.lower()

        # Check if we've hit the first data row
        is_data_row = any(ll.startswith(k) for k in ROW_METRICS)
        if is_data_row:
            flush_seg()
            break

        # Is this line purely a number? Then it's part of data, flush header
        if is_number_token(line):
            flush_seg()
            break

        # Is this a known stop/skip line?
        if any(ll.startswith(s) for s in STOP_ROWS):
            flush_seg()
            break

        # Otherwise it's part of a segment name
        # A new segment starts when we encounter a known segment keyword
        # or the buffer forms a complete known segment
        if seg_buffer:
            combined_so_far = re.sub(r"\s+", " ", " ".join(seg_buffer + [line])).strip()
            # Check if adding this line COMPLETES a known segment
            for alias in SEG_NORMALIZE:
                if alias in combined_so_far.lower():
                    seg_buffer.append(line)
                    flush_seg()
                    i += 1
                    break
            else:
                # Check if current buffer already forms a segment without this line
                current_combined = re.sub(r"\s+", " ", " ".join(seg_buffer)).strip()
                canon_current = normalize_seg(current_combined)
                # If current buffer is a complete segment, flush and start new
                if canon_current and any(alias in current_combined.lower() for alias in SEG_NORMALIZE):
                    flush_seg()
                    seg_buffer.append(line)
                else:
                    seg_buffer.append(line)
                i += 1
        else:
            seg_buffer.append(line)
            i += 1

    if not seg_names:
        return None, {}, i

    n_segs = len(seg_names)

    # --- Parse data rows ---
    metrics_data = {}
    while i < len(lines):
        line = lines[i].strip()
        ll = line.lower()
        i += 1

        if not line:
            continue

        # Stop at next "Summary of the segmental" (next year table)
        if "summary of the segmental" in ll:
            i -= 1  # rewind so caller can pick it up
            break

        # Stop at footnote lines
        if re.match(r"^[@#%*^]", line) or ll.startswith("notes to"):
            break

        # Identify metric
        metric = None
        for pattern, key in ROW_METRICS.items():
            if ll.startswith(pattern):
                metric = key
                break

        if metric is None:
            continue

        # Collect the next n_segs+1 numeric tokens (last one = total, skip it)
        # A single line may contain multiple space-separated numbers (e.g. "539,396 283,738")
        values = []
        j = i
        while j < len(lines) and len(values) <= n_segs:
            tok = lines[j].strip()
            if not tok:
                j += 1
                continue
            # Try splitting the line into multiple number tokens
            sub_toks = tok.split()
            all_nums = all(is_number_token(s) for s in sub_toks) and len(sub_toks) > 0
            if all_nums:
                for s in sub_toks:
                    n = parse_number(s)
                    if n is not None:
                        values.append(n)
                j += 1
            elif is_number_token(tok):
                n = parse_number(tok)
                if n is not None:
                    values.append(n)
                j += 1
            elif not any(tok.lower().startswith(k) for k in list(ROW_METRICS.keys()) + list(STOP_ROWS)):
                # non-numeric, non-label — continuation label, skip
                j += 1
            else:
                break
        i = j

        # Map values to segments (skip last = total)
        if len(values) >= n_segs:
            seg_vals = values[:n_segs]
            row_data = {}
            for si, seg in enumerate(seg_names):
                row_data[seg] = round(seg_vals[si] / 10, 2)  # millions -> Crores
            metrics_data[metric] = row_data

    return fy, metrics_data, i


def extract_from_pdf(pdf_path):
    """Extract all segment tables from a PDF."""
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"  Cannot open: {e}")
        return {}

    results = {}

    for page_num in range(len(doc)):
        page_text = doc[page_num].get_text()
        if "summary of the segmental information" not in page_text.lower():
            continue

        print(f"  Page {page_num+1}: segment table found")
        lines = page_text.split("\n")

        # Find all "Summary of the segmental" positions
        starts = [i for i, l in enumerate(lines)
                  if "summary of the segmental" in l.lower()]

        for si in starts:
            fy, data, _ = parse_one_table(lines, si)
            if fy and data:
                existing = results.get(fy, {})
                if len(data) > len(existing):
                    results[fy] = data
                    metrics_str = ", ".join(f"{k}({len(v)}segs)" for k, v in data.items())
                    print(f"    {fy}: {metrics_str}")

    doc.close()
    return results


def main():
    pdfs = sorted(f for f in os.listdir(PDF_DIR) if f.endswith(".pdf"))
    print(f"Processing {len(pdfs)} PDFs...\n")

    all_data = {}

    for fname in pdfs:
        fy_hint = fname.replace("BHARTIARTL_AR_", "").replace(".pdf", "")
        path = os.path.join(PDF_DIR, fname)
        print(f"--- {fy_hint} ---")
        extracted = extract_from_pdf(path)
        for fy, data in extracted.items():
            existing = all_data.get(fy, {})
            if len(data) >= len(existing):
                all_data[fy] = data

    if not all_data:
        print("No data extracted!")
        return

    # Build output
    seg_set = set()
    for fy_data in all_data.values():
        for mdata in fy_data.values():
            seg_set.update(mdata.keys())

    years = sorted(all_data.keys())
    series = {}
    for fy, fy_data in all_data.items():
        for metric, mdata in fy_data.items():
            for seg, val in mdata.items():
                key = f"{metric}|{seg}"
                series.setdefault(key, {})[fy] = val

    output = {
        "symbol":   "BHARTIARTL",
        "basis":    "consolidated",
        "company":  "Bharti Airtel Limited",
        "currency": "INR_Cr",
        "source":   "airtel.in Integrated Report & Financial Statements",
        "segments": sorted(seg_set),
        "years":    years,
        "segment_time_series": series,
    }

    with open(OUTPUT, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n=== Done ===")
    for fy in years:
        d = all_data[fy]
        msi = d.get("revenue", {}).get("Mobile Services India")
        print(f"  {fy}: metrics={list(d.keys())} | MSI_rev={msi}")

    print(f"\nSaved: {OUTPUT}")
    print(f"Years: {years[0]} – {years[-1]} ({len(years)} years)")
    print(f"Series: {len(series)} | Segments: {sorted(seg_set)}")


if __name__ == "__main__":
    main()
