"""
HDFC Bank segment extractor.
Source: Standalone Financial Statements — "Segment reporting for the year ended March 31, YYYY"
Format: Numbered row table — Sr.No | Particulars | Treasury | Digital# | Non-Digital | Wholesale | Other | Total
Currency: Already in Crore (no conversion)
Segments: Treasury, Retail Banking (Digital + Non-Digital combined), Wholesale Banking, Other Banking Operations

Run: py -3.14 scripts/extract_hdfcbank_segments.py
"""

import fitz
import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR  = os.path.join(BASE_DIR, "public", "data", "annual_reports", "HDFCBANK")
OUTPUT   = os.path.join(BASE_DIR, "public", "data", "segment_data_hdfcbank.json")

# Row numbers that map to metrics we want
# FY2016-2025: Row 1=revenue, 5=results, 9=assets, 12=liabilities
# Older years may vary — detect by Particulars label
ROW_METRICS = {
    "segment revenue":    "revenue",
    "segment results":    "results",
    "segment assets":     "assets",
    "segment liabilities":"liabilities",
}

def parse_number(s):
    s = s.strip().replace(",", "").replace("\xa0", "")
    if not s or s in ("-", "–", "—", ""):
        return 0.0
    if s.startswith("(") and s.endswith(")"):
        try:    return -float(s[1:-1])
        except: return None
    try:    return float(s)
    except: return None


def is_number_token(s):
    s = s.strip()
    return bool(re.match(r"^[\d,().\-]+$", s)) and any(c.isdigit() for c in s)


def find_segment_pages(doc):
    pages = []
    for i, page in enumerate(doc):
        t = page.get_text().lower()
        if "segment reporting for the year ended" in t and "business segment" in t:
            pages.append(i)
    return pages


def parse_segment_table(text, fy_hint=None):
    """
    Parse one segment reporting block.
    Returns {metric: {seg: value}} or None.
    HDFC Bank column order: Treasury | Digital Banking | Non-Digital Banking | Wholesale | Other | Total
    We combine Digital + Non-Digital -> Retail Banking
    """
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Find year
    fy = None
    for line in lines:
        m = re.search(r"march\s+31,?\s*(\d{4})", line, re.IGNORECASE)
        if m:
            fy = f"FY{m.group(1)}"
            break
    if not fy:
        fy = fy_hint

    # Find segment header — look for "Particulars" line followed by segment column names
    # Segment columns appear after "Sr.\nNo.\nParticulars"
    start = None
    for i, line in enumerate(lines):
        ll = line.lower()
        if "business segment" in ll:
            start = i
            break
    if start is None:
        return None, None

    # Parse segment column names
    # After "Business segments:" we have header lines then data rows (numbered)
    seg_names = []
    seg_buffer = []
    data_start = None

    # Known segments for HDFC Bank
    SEG_KEYWORDS = {
        "treasury":              "Treasury",
        "retail banking":        "Retail Banking",
        "digital banking":       None,   # sub-segment, will be merged
        "non-digital banking":   None,   # sub-segment, will be merged
        "wholesale banking":     "Wholesale Banking",
        "other banking":         "Other Banking Operations",
    }
    SKIP_WORDS = {"sr", "no", "particulars", "total", "unallocated", "crore"}

    i = start + 1
    while i < len(lines):
        line = lines[i]
        ll = line.lower().strip()

        # Number prefix = start of data rows
        if re.match(r"^\d+$", line):
            data_start = i
            break

        # Skip header decorators
        if ll in SKIP_WORDS or ll.startswith("(") or not ll:
            i += 1
            continue

        # Check if line matches a segment keyword
        matched_seg = None
        for kw, canon in SEG_KEYWORDS.items():
            if kw in ll:
                matched_seg = (kw, canon)
                break

        if matched_seg:
            kw, canon = matched_seg
            if canon and canon not in seg_names:
                seg_names.append(canon)
        i += 1

    if not seg_names or data_start is None:
        return None, None

    # --- Parse data rows ---
    # Format: row_num\nParticulars\nval1\nval2\n...\nTotal
    # Digital and Non-Digital are sub-columns of Retail Banking
    # Column order: Treasury | Digital# | Non-Digital | Wholesale | Other | Total
    # We want: Treasury, Retail(=Digital+NonDigital), Wholesale, Other

    result = {}
    i = data_start

    while i < len(lines):
        line = lines[i].strip()
        ll = line.lower()
        i += 1

        if not line:
            continue

        # Stop at geographic segments or next year block
        if "geographic segment" in ll or "segment reporting for" in ll:
            break

        # Detect metric rows by label (skip row number)
        if re.match(r"^\d+$", line):
            # Next line should be the label
            if i < len(lines):
                label = lines[i].strip().lower()
                label = re.sub(r"\s+", " ", label)
                # Remove row number suffix if concatenated
                label = re.sub(r"^\d+\s*", "", label).strip()
                i += 1
            else:
                continue

            metric = None
            for pattern, key in ROW_METRICS.items():
                if pattern in label:
                    metric = key
                    break
            if metric is None:
                continue

            # Collect numeric values
            values = []
            j = i
            while j < len(lines) and len(values) <= 10:
                tok = lines[j].strip()
                if not tok:
                    j += 1
                    continue
                # Split multi-number lines
                sub = tok.split()
                if all(is_number_token(s) for s in sub) and sub:
                    for s in sub:
                        n = parse_number(s)
                        if n is not None:
                            values.append(n)
                    j += 1
                elif is_number_token(tok):
                    n = parse_number(tok)
                    if n is not None:
                        values.append(n)
                    j += 1
                elif re.match(r"^\d+$", tok):
                    break  # next row number
                elif any(p in tok.lower() for p in ["geographic", "segment report", "unallocated", "income from", "net profit", "total assets", "total liab", "capital employed"]):
                    break
                else:
                    j += 1
            i = j

            # Map values to segments
            # Expected column order: Treasury | Digital# | Non-Digital | Wholesale | Other | Total
            # If only 4 columns (older years): Treasury | Retail | Wholesale | Other
            if len(values) >= 6:
                # Has Digital sub-split
                treasury   = values[0]
                digital    = values[1]
                nondigital = values[2]
                wholesale  = values[3]
                other      = values[4]
                retail     = round(digital + nondigital, 2)
                row_data = {
                    "Treasury":                 treasury,
                    "Retail Banking":           retail,
                    "Wholesale Banking":        wholesale,
                    "Other Banking Operations": other,
                }
            elif len(values) >= 4:
                # Older format: Treasury | Retail | Wholesale | Other
                row_data = {
                    "Treasury":                 values[0],
                    "Retail Banking":           values[1],
                    "Wholesale Banking":        values[2],
                    "Other Banking Operations": values[3],
                }
            else:
                continue

            result[metric] = row_data

    return fy, result


def extract_from_pdf(pdf_path):
    """Extract segment data from all pages of a PDF."""
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"  Cannot open: {e}")
        return {}

    seg_pages = find_segment_pages(doc)
    print(f"  Segment pages: {[p+1 for p in seg_pages]}")

    all_results = {}
    for pn in seg_pages:
        # Merge current + next page (table can span pages)
        text = doc[pn].get_text()
        if pn + 1 < len(doc):
            next_text = doc[pn+1].get_text()
            if "segment reporting for the year ended" not in next_text.lower():
                text = text + "\n" + next_text

        # Split on "Segment reporting for the year ended" to get individual year blocks
        blocks = re.split(r"(?=Segment reporting for the year ended)", text, flags=re.IGNORECASE)
        for block in blocks:
            if not block.strip():
                continue
            fy, data = parse_segment_table(block)
            if fy and data:
                existing = all_results.get(fy, {})
                if len(data) >= len(existing):
                    all_results[fy] = data
                    metrics_str = ", ".join(f"{k}({len(v)}segs)" for k, v in data.items())
                    print(f"    {fy}: {metrics_str}")

    doc.close()
    return all_results


def main():
    pdfs = sorted(f for f in os.listdir(PDF_DIR) if f.endswith(".pdf"))
    print(f"Processing {len(pdfs)} PDFs...\n")

    all_data = {}
    for fname in pdfs:
        fy_hint = fname.replace("HDFCBANK_AR_", "").replace(".pdf", "")
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
                series.setdefault(f"{metric}|{seg}", {})[fy] = val

    output = {
        "symbol":   "HDFCBANK",
        "basis":    "standalone",
        "company":  "HDFC Bank Limited",
        "currency": "INR_Cr",
        "source":   "NSE archives — Standalone Financial Statements",
        "segments": sorted(seg_set),
        "years":    years,
        "segment_time_series": series,
    }

    with open(OUTPUT, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n=== Done ===")
    for fy in years:
        d = all_data[fy]
        rev = d.get("revenue", {})
        print(f"  {fy}: metrics={list(d.keys())} | Treasury_rev={rev.get('Treasury')} | Retail_rev={rev.get('Retail Banking')}")

    print(f"\nSaved: {OUTPUT}")
    print(f"Years: {years[0]} – {years[-1]} ({len(years)} years)")
    print(f"Series: {len(series)} | Segments: {sorted(seg_set)}")


if __name__ == "__main__":
    main()
