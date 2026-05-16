"""
ICICI Bank segment extractor.
Source: Standalone Financial Statements — "Information about business and geographical segments"
Format: Numbered rows — Revenue | Segment results | Segment assets | Segment liabilities
Currency: millions of Indian Rupee -> divide by 10 -> Crores
Segments: Retail Banking, Wholesale Banking, Treasury, Other Banking Business

Run: py -3.14 scripts/extract_icicibank_segments.py
"""

import fitz
import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR  = os.path.join(BASE_DIR, "public", "data", "annual_reports", "ICICIBANK")
OUTPUT   = os.path.join(BASE_DIR, "public", "data", "segment_data_icicibank.json")

ROW_METRICS = {
    "revenue":            "revenue",    # Row 1: "Revenue" (not "Segment revenue")
    "segment revenue":    "revenue",
    "segment results":    "results",
    "segment result":     "results",
    "segment assets":     "assets",
    "segment liabilities":"liabilities",
}

SKIP_ROWS = {
    "less", "inter-segment", "total revenue", "unallocated", "income tax",
    "net profit", "profit before tax", "capital expenditure", "depreciation",
    "provisions",
}

# Segment order for ICICI Bank (consistent across all years)
# Standalone: Retail | Wholesale | Treasury | Other Banking
# Consolidated adds Life Insurance, General Insurance, Others
SEG_ORDER_STANDALONE = [
    "Retail Banking",
    "Wholesale Banking",
    "Treasury",
    "Other Banking Business",
]


def parse_number(s):
    s = s.strip().replace(",", "").replace("\xa0", "")
    if not s or s in ("-", "–", "—"):
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
    """Find segment reporting pages — look for the data table, not just section header."""
    pages = []
    for i, page in enumerate(doc):
        t = page.get_text().lower()
        # Must have segment data indicators (revenue row + banking segments)
        has_seg_data = ("retail banking" in t or "wholesale banking" in t) and \
                       ("treasury" in t) and \
                       ("revenue" in t or "segment result" in t)
        # Must NOT be consolidated (we want standalone first)
        # Skip pages that are clearly consolidated-only
        is_consolidated_only = "consolidated financial statements" in t and \
                               "standalone" not in t and \
                               "life insurance" in t  # ICICI consolidated adds insurance segments
        if has_seg_data and not is_consolidated_only:
            pages.append(i)
    return pages


def parse_segment_table(text, fy_hint=None):
    """
    Parse ICICI Bank segment table. Returns (fy, {metric: {seg: val}}).
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

    # Find "Revenue" row with segment columns
    # The table header line contains: "Retail Banking | Wholesale Banking | Treasury | Other Banking"
    # Data immediately follows

    # Detect if "in million" or "in crore"
    currency_div = 10.0  # default: millions -> Crores
    for line in lines:
        ll = line.lower()
        if "in crore" in ll or "` crore" in ll or "rs. crore" in ll:
            currency_div = 1.0
            break
        if "in million" in ll or "` million" in ll or "in millions" in ll:
            currency_div = 10.0
            break

    # Find segment column headers
    n_segs = 4  # default
    seg_names = SEG_ORDER_STANDALONE.copy()

    # Find the table start (row number "1." or "1")
    table_start = None
    for i, line in enumerate(lines):
        if re.match(r"^1\.$|^1$", line):
            table_start = i
            break
    if table_start is None:
        return None, None

    # Parse data rows
    result = {}
    i = table_start

    while i < len(lines):
        line = lines[i].strip()
        ll = line.lower()
        i += 1

        if not line:
            continue

        # Stop conditions
        if "geographic segment" in ll or "b. geographic" in ll:
            break
        if "information about business" in ll and i > table_start + 5:
            break

        # Detect row by number prefix
        row_num_match = re.match(r"^(\d+)\.?\s*$", line)
        if not row_num_match:
            continue

        # Next line(s) = label
        label = ""
        while i < len(lines):
            next_line = lines[i].strip()
            if is_number_token(next_line) or re.match(r"^\d+\.?\s*$", next_line):
                break
            label = (label + " " + next_line).strip()
            i += 1
            # Stop label collection if it's getting too long
            if len(label) > 80:
                break

        label_lower = re.sub(r"\s+", " ", label).lower()

        # Check if skip
        if any(s in label_lower for s in SKIP_ROWS):
            continue

        # Identify metric
        metric = None
        for pattern, key in ROW_METRICS.items():
            if pattern in label_lower:
                metric = key
                break
        if metric is None:
            continue

        # Collect numeric values
        values = []
        j = i
        while j < len(lines) and len(values) <= n_segs + 2:
            tok = lines[j].strip()
            if not tok:
                j += 1
                continue
            # Multi-number on one line
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
            elif re.match(r"^\d+\.?\s*$", tok):
                break  # next row
            elif any(s in tok.lower() for s in ["geographic", "b. geographic", "less:", "unallocated"]):
                break
            else:
                j += 1
        i = j

        # Map values to segments (skip total = last value)
        if len(values) >= n_segs:
            row_data = {}
            for si, seg in enumerate(seg_names[:n_segs]):
                row_data[seg] = round(values[si] / currency_div, 2)
            result[metric] = row_data

    return fy, result


def extract_from_pdf(pdf_path):
    """Extract segment data from all relevant pages."""
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"  Cannot open: {e}")
        return {}

    seg_pages = find_segment_pages(doc)
    print(f"  Segment pages: {[p+1 for p in seg_pages]}")

    all_results = {}
    for pn in seg_pages:
        text = doc[pn].get_text()
        if pn + 1 < len(doc):
            next_text = doc[pn+1].get_text()
            if "information about business" not in next_text.lower():
                text = text + "\n" + next_text

        # Split on year blocks if multiple years on same page
        blocks = re.split(
            r"(?=For the year ended March 31,\s*\d{4})",
            text, flags=re.IGNORECASE
        )
        if len(blocks) <= 1:
            blocks = [text]

        for block in blocks:
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
        fy_hint = fname.replace("ICICIBANK_AR_", "").replace(".pdf", "")
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
        "symbol":   "ICICIBANK",
        "basis":    "standalone",
        "company":  "ICICI Bank Limited",
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
        print(f"  {fy}: metrics={list(d.keys())} | Retail={rev.get('Retail Banking')} | Treasury={rev.get('Treasury')}")

    print(f"\nSaved: {OUTPUT}")
    print(f"Years: {years[0]} – {years[-1]} ({len(years)} years)")
    print(f"Series: {len(series)} | Segments: {sorted(seg_set)}")


if __name__ == "__main__":
    main()
