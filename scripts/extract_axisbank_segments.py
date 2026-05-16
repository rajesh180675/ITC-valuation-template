"""
Axis Bank segment extractor (v2).
Source: Standalone Financial Statements — column-based table
Column order: Treasury | Wholesale | Digital(sub) | Other Retail(sub) | Total Retail | Other Banking | Unallocated | Total
We extract: Treasury[0], Wholesale[1], Total Retail[4], Other Banking[5]
Currency: Crores
Run: py -3.14 scripts/extract_axisbank_segments.py
"""
import fitz, json, os, re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR  = os.path.join(BASE_DIR, "public", "data", "annual_reports", "AXISBANK")
OUTPUT   = os.path.join(BASE_DIR, "public", "data", "segment_data_axisbank.json")

# Row labels to capture and what metric they map to
ROW_METRICS = {
    "total income as per profit": "revenue",
    "total segment revenue":      "revenue",
    "segment result":             "results",
    "segment assets":             "assets",
    "segment liabilities":        "liabilities",
}

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
    pages = []
    for i, page in enumerate(doc):
        t = page.get_text().lower()
        if "segmental results" in t and ("treasury" in t or "wholesale" in t):
            pages.append(i)
    return pages

def extract_year(text):
    m = re.search(r"(\d{1,2})\s+march[,\s]+(\d{4})", text, re.IGNORECASE)
    if m:
        return f"FY{m.group(2)}"
    m2 = re.search(r"march\s+31,?\s*(\d{4})", text, re.IGNORECASE)
    return f"FY{m2.group(1)}" if m2 else None

def parse_table(text):
    """
    Parse one year's segment table from text.
    Returns {metric: {seg: val}}.
    Column order: Treasury | Wholesale | DigitalSub | OtherRetailSub | TotalRetail | OtherBanking | Unallocated | Total
    Indices used: 0, 1, 4, 5
    """
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    result = {}
    i = 0

    while i < len(lines):
        line = lines[i]
        ll = line.lower()
        i += 1

        # Identify metric row
        metric = None
        for pat, key in ROW_METRICS.items():
            if ll.startswith(pat):
                metric = key
                break
        if metric is None:
            continue

        # Collect 8 numeric values following this row label
        values = []
        j = i
        while j < len(lines) and len(values) < 8:
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
            elif any(p in tok.lower() for p in list(ROW_METRICS.keys()) + ["geographic", "capital expenditure", "net assets"]):
                break
            else:
                j += 1
        i = j

        # Map to segments: indices 0=Treasury, 1=Wholesale, 4=TotalRetail, 5=OtherBanking
        if len(values) >= 6:
            row_data = {
                "Treasury":              values[0],
                "Wholesale Banking":     values[1],
                "Retail Banking":        values[4],
                "Other Banking Business":values[5],
            }
        elif len(values) >= 4:
            # Older format without Digital sub-split: Treasury | Wholesale | Retail | Other
            row_data = {
                "Treasury":              values[0],
                "Wholesale Banking":     values[1],
                "Retail Banking":        values[2],
                "Other Banking Business":values[3],
            }
        else:
            continue

        if metric not in result or len(row_data) > len(result[metric]):
            result[metric] = row_data

    return result

def extract_from_pdf(pdf_path, fy_hint):
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
    processed_fys = set()

    for pn in seg_pages:
        # Get this page and next (prior year table often on next page)
        pages = [pn]
        if pn + 1 < len(doc):
            nt = doc[pn+1].get_text().lower()
            if "segment result" in nt or "segment assets" in nt:
                pages.append(pn + 1)

        for page_idx in pages:
            text = doc[page_idx].get_text()
            fy = extract_year(text)
            if not fy:
                fy = fy_hint
            if fy in processed_fys:
                continue
            processed_fys.add(fy)

            data = parse_table(text)
            if data:
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
        fy_hint = fname.replace("AXISBANK_AR_", "").replace(".pdf", "")
        path = os.path.join(PDF_DIR, fname)
        print(f"--- {fy_hint} ---")
        extracted = extract_from_pdf(path, fy_hint)
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
        "symbol":   "AXISBANK",
        "basis":    "standalone",
        "company":  "Axis Bank Limited",
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
        print(f"  {fy}: metrics={list(d.keys())} | Treasury={rev.get('Treasury')} | Retail={rev.get('Retail Banking')}")
    print(f"\nSaved: {OUTPUT}")
    print(f"Years: {years[0]} – {years[-1]} ({len(years)} years)")
    print(f"Series: {len(series)} | Segments: {sorted(seg_set)}")

if __name__ == "__main__":
    main()
