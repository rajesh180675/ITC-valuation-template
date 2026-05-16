"""
WIPRO segment extractor (v2).
Source: Consolidated IFRS Notes — "Information on reportable segments for the year ended March 31, YYYY"
Format: Headers on separate lines, then data rows with H/E prefixed numbers
Currency: millions INR -> divide by 10 -> Crores
Run: py -3.14 scripts/extract_wipro_segments.py
"""
import fitz, json, os, re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR  = os.path.join(BASE_DIR, "public", "data", "annual_reports", "WIPRO")
OUTPUT   = os.path.join(BASE_DIR, "public", "data", "segment_data_wipro.json")


def clean_num(s):
    """Strip currency prefix and parse."""
    s = re.sub(r"^[HEI₹\s]+", "", s.strip())
    s = s.replace(",", "").strip()
    if not s or s in ("-","–","—"):
        return 0.0
    if s.startswith("(") and s.endswith(")"):
        try:    return -float(s[1:-1])
        except: return None
    try:    return float(s)
    except: return None


def is_wipro_num(s):
    """Token looks like a WIPRO number: optional H/E prefix + optional space + digits."""
    s = s.strip()
    s2 = re.sub(r"^[HEI₹]+\s*", "", s)  # strip prefix AND trailing space
    return bool(re.match(r"^[\d,().\-]+$", s2)) and any(c.isdigit() for c in s2)


def find_segment_pages(doc):
    pages = []
    for i, page in enumerate(doc):
        t = page.get_text().lower()
        if "information on reportable segments" in t:
            pages.append(i)
    return pages


def extract_year(line):
    m = re.search(r"march\s+31,?\s*(\d{4})", line, re.IGNORECASE)
    return f"FY{m.group(1)}" if m else None


def parse_wipro_block(lines, start_idx):
    """
    Parse a single year's segment table starting at start_idx.
    Expected structure:
      "Information on reportable segments for the year ended March 31, YYYY is as follows:"
      "IT Services"  "IT Products"  "Reconciling Items"  "Total"
      "Americas 1" "Americas 2" "Europe" "APMEA" "Total"
      "Revenue"
      "H 261,270" "H 278,374" "H 256,845" "H 106,812" "E 903,301" "H 6,047" "H-" "H 909,348"
      "Segment result"
      "51,555" ...
    Returns (fy, {metric: {seg: val}}).
    """
    fy = None
    for line in lines[start_idx:start_idx+3]:
        fy = extract_year(line)
        if fy:
            break

    if not fy:
        return None, {}

    result = {}
    # Metrics we care about
    METRIC_MAP = {
        "revenue": "revenue",
        "segment result": "results",
    }
    # Column positions expected:
    # [Americas1, Americas2, Europe, APMEA, IT_Services_Total, IT_Products, Reconciling, Total]
    # We keep: IT_Services_Total[4], IT_Products[5], and 4 geos [0-3]

    i = start_idx
    end = min(start_idx + 30, len(lines))
    while i < end:
        line = lines[i].strip()
        ll = line.lower()
        i += 1

        # Stop at next year block
        if "information on reportable segments" in ll and i > start_idx + 3:
            break

        metric = None
        for pat, key in METRIC_MAP.items():
            if ll.startswith(pat) and ll == pat or ll.startswith(pat + " "):
                metric = key
                break
        if metric is None:
            # Check exact match
            if ll in ("revenue", "segment result"):
                metric = METRIC_MAP.get(ll)
        if metric is None:
            continue

        # Collect up to 8 numeric tokens from following lines
        values = []
        j = i
        while j < end and len(values) < 8:
            tok = lines[j].strip()
            if not tok:
                j += 1
                continue
            # Single token or whole line of space-separated numbers
            sub = tok.split()
            if all(is_wipro_num(s) for s in sub) and sub:
                for s in sub:
                    n = clean_num(s)
                    if n is not None:
                        values.append(n)
                j += 1
            elif is_wipro_num(tok):
                n = clean_num(tok)
                if n is not None:
                    values.append(n)
                j += 1
            elif any(p in tok.lower() for p in ["unallocated", "segment result", "revenue", "depreciation", "finance", "profit before"]):
                break
            else:
                j += 1
        i = j

        # Map values to segments
        if len(values) >= 6:
            row_data = {
                "IT Services Americas 1": round(values[0] / 10, 2),
                "IT Services Americas 2": round(values[1] / 10, 2),
                "IT Services Europe":     round(values[2] / 10, 2),
                "IT Services APMEA":      round(values[3] / 10, 2),
                "IT Services":            round(values[4] / 10, 2),
                "IT Products":            round(values[5] / 10, 2),
            }
        elif len(values) >= 2:
            row_data = {
                "IT Services": round(values[0] / 10, 2),
                "IT Products":  round(values[1] / 10, 2),
            }
        else:
            continue

        result[metric] = row_data

    return fy, result


def extract_from_pdf(pdf_path):
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"  Cannot open: {e}")
        return {}

    seg_pages = find_segment_pages(doc)
    print(f"  Segment pages: {[p+1 for p in seg_pages]}")
    if not seg_pages:
        return {}

    all_results = {}
    for pn in seg_pages:
        # Merge with next page
        text = doc[pn].get_text()
        if pn + 1 < len(doc):
            nx = doc[pn+1].get_text()
            if "information on reportable segments" not in nx.lower():
                text += "\n" + nx

        lines = text.split("\n")
        # Find all "Information on reportable segments" start positions
        starts = [i for i, l in enumerate(lines) if "information on reportable segments" in l.lower()]
        for s in starts:
            fy, data = parse_wipro_block(lines, s)
            if fy and data:
                existing = all_results.get(fy, {})
                if len(data) >= len(existing):
                    all_results[fy] = data
                    ms = ", ".join(f"{k}({len(v)}segs)" for k, v in data.items())
                    print(f"    {fy}: {ms}")

    doc.close()
    return all_results


def main():
    pdfs = sorted(f for f in os.listdir(PDF_DIR) if f.endswith(".pdf"))
    print(f"Processing {len(pdfs)} PDFs...\n")

    all_data = {}
    for fname in pdfs:
        fy_hint = fname.replace("WIPRO_AR_", "").replace(".pdf", "")
        path = os.path.join(PDF_DIR, fname)
        print(f"--- {fy_hint} ---")
        extracted = extract_from_pdf(path)
        for fy, data in extracted.items():
            existing = all_data.get(fy, {})
            if len(data) >= len(existing):
                all_data[fy] = data

    if not all_data:
        print("No data!")
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
        "symbol":   "WIPRO",
        "basis":    "consolidated",
        "company":  "Wipro Limited",
        "currency": "INR_Cr",
        "source":   "NSE archives — Consolidated IFRS Financial Statements",
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
        print(f"  {fy}: IT_Services={rev.get('IT Services')} | IT_Products={rev.get('IT Products')}")
    print(f"\nSaved: {OUTPUT}")
    print(f"Years: {years[0]} – {years[-1]} ({len(years)} years)")
    print(f"Series: {len(series)} | Segments: {sorted(seg_set)}")


if __name__ == "__main__":
    main()
