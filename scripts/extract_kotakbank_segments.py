"""
Kotak Mahindra Bank segment extractor (v2).
Format: Labeled rows: "a. Treasury BMU  15,246.03  10,122.25" (with tabs after a./b./c.)
Currency: Crores
Run: py -3.14 scripts/extract_kotakbank_segments.py
"""
import fitz, json, os, re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR  = os.path.join(BASE_DIR, "public", "data", "annual_reports", "KOTAKBANK")
OUTPUT   = os.path.join(BASE_DIR, "public", "data", "segment_data_kotakbank.json")

SEG_NORMALIZE = {
    "treasury, bmu and corporate centre": "Treasury BMU",
    "treasury bmu and corporate centre":  "Treasury BMU",
    "treasury":                           "Treasury BMU",
    "corporate / wholesale banking":      "Wholesale Banking",
    "corporate/wholesale banking":        "Wholesale Banking",
    "retail banking":                     "Retail Banking",
    "vehicle financing":                  "Vehicle Financing",
    "other lending activities":           "Other Lending",
    "broking":                            "Broking",
    "advisory and transactional":         "Advisory",
    "asset management":                   "Asset Management",
    "insurance":                          "Insurance",
}
SKIP_SEGS = {"digital banking", "other retail", "sub-total", "total", "unallocated",
             "inter-segment", "other banking business"}

ROW_METRICS = {
    "segment revenue":     "revenue",
    "segment results":     "results",
    "segment assets":      "assets",
    "segment liabilities": "liabilities",
}


def parse_number(s):
    s = re.sub(r"[H₹\s]", "", s.strip()).replace(",","")
    if not s or s in ("-","–","—",""):
        return 0.0
    if s.startswith("(") and s.endswith(")"):
        try:    return -float(s[1:-1])
        except: return None
    try:    return float(s)
    except: return None


def find_segment_pages(doc):
    pages = []
    for i, page in enumerate(doc):
        t = page.get_text().lower()
        if "segment revenue" in t and ("treasury" in t or "retail banking" in t):
            pages.append(i)
    return pages


def extract_from_pdf(pdf_path, fy_hint):
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"  Cannot open: {e}")
        return {}

    seg_pages = find_segment_pages(doc)
    print(f"  Segment pages: {[p+1 for p in seg_pages]}")

    all_results = {}

    for pn in seg_pages:
        # Merge adjacent pages
        pages_text = doc[pn].get_text()
        if pn + 1 < len(doc):
            nx = doc[pn+1].get_text()
            if "segment assets" in nx.lower() or "segment liabilities" in nx.lower():
                pages_text += "\n" + nx

        lines = [l.strip() for l in pages_text.split("\n") if l.strip()]

        # Extract year(s) from this page
        years_on_page = []
        for line in lines:
            m = re.search(r"(\d{1,2})(?:st|nd|rd|th)?\s+march[,\s]+(\d{4})", line, re.IGNORECASE)
            if m:
                yr = f"FY{m.group(2)}"
                if yr not in years_on_page:
                    years_on_page.append(yr)

        if not years_on_page:
            years_on_page = [fy_hint]

        # Parse current year (index 0) and prior year (index 1) from two-column table
        cur_fy   = years_on_page[0] if years_on_page else fy_hint
        prior_fy = years_on_page[1] if len(years_on_page) > 1 else f"FY{int(cur_fy[2:])-1}"

        cur_data   = {}
        prior_data = {}
        current_metric = None

        i = 0
        while i < len(lines):
            line = lines[i]
            ll = line.lower()
            i += 1

            # Detect metric
            for pat, key in ROW_METRICS.items():
                if ll.strip().startswith(pat):
                    current_metric = key
                    cur_data.setdefault(key, {})
                    prior_data.setdefault(key, {})
                    break

            if current_metric is None:
                continue

            # Stop if we hit geographic or capital expenditure
            if "geographic" in ll or "capital expenditure" in ll:
                break

            # Detect labeled segment row prefix: "a.", "b." etc. (name may be on same or next line)
            seg_prefix = re.match(r"^[a-e]\.\s*\t?\s*(.*)", line)
            if not seg_prefix:
                continue

            seg_raw = seg_prefix.group(1).strip()

            # If name is empty, the segment name is on the NEXT line
            if not seg_raw and i < len(lines):
                seg_raw = lines[i].strip()
                i += 1  # consume that line

            # Remove footnote markers
            seg_raw = re.sub(r"[#*@]$", "", seg_raw).strip()
            seg_lower = seg_raw.lower()

            # Skip sub-items, known skip segs, or junk lines (too long)
            if re.match(r"^\(i+\)", line) or any(sk in seg_lower for sk in SKIP_SEGS):
                continue
            if len(seg_raw) > 60:  # not a valid segment name
                continue

            # Normalize
            seg_name = seg_raw
            for alias, canon in SEG_NORMALIZE.items():
                if alias in seg_lower:
                    seg_name = canon
                    break

            # Collect numbers from rest of current line + next lines (up to 3)
            # Numbers may be inline or on separate lines
            rest_of_line = line[line.index(seg_raw) + len(seg_raw):] if seg_raw in line else ""
            all_nums = re.findall(r"[\d,]+\.?\d*", rest_of_line)
            j = i
            while j < i + 4 and j < len(lines):
                next_line = lines[j]
                if re.match(r"^[a-e]\.", next_line) or any(p in next_line.lower() for p in list(ROW_METRICS.keys()) + ["geographic", "sub-total", "total", "less"]):
                    break
                raw_nums = re.findall(r"[\d,]+\.?\d*", next_line)
                if raw_nums:
                    all_nums.extend(raw_nums)
                j += 1

            parsed = [parse_number(n) for n in all_nums if parse_number(n) is not None and parse_number(n) != 0.0 or n != "-"]
            parsed = [parse_number(n) for n in all_nums if parse_number(n) is not None]

            if len(parsed) >= 2:
                cur_data[current_metric][seg_name] = parsed[0]
                prior_data[current_metric][seg_name] = parsed[1]
            elif len(parsed) == 1:
                cur_data[current_metric][seg_name] = parsed[0]

        # Save data
        for metric, segs in cur_data.items():
            if segs:
                if cur_fy not in all_results:
                    all_results[cur_fy] = {}
                all_results[cur_fy][metric] = segs
                metrics_str = f"{metric}({len(segs)}segs)"
                print(f"    {cur_fy}: {metrics_str}")

        for metric, segs in prior_data.items():
            if segs and prior_fy not in all_results:
                all_results.setdefault(prior_fy, {})[metric] = segs

    doc.close()
    return all_results


def main():
    pdfs = sorted(f for f in os.listdir(PDF_DIR) if f.endswith(".pdf"))
    print(f"Processing {len(pdfs)} PDFs...\n")

    all_data = {}
    for fname in pdfs:
        fy_hint = fname.replace("KOTAKBANK_AR_", "").replace(".pdf", "")
        path = os.path.join(PDF_DIR, fname)
        print(f"--- {fy_hint} ---")
        extracted = extract_from_pdf(path, fy_hint)
        for fy, data in extracted.items():
            existing = all_data.get(fy, {})
            if len(data) > len(existing):
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
        "symbol":   "KOTAKBANK",
        "basis":    "standalone",
        "company":  "Kotak Mahindra Bank Limited",
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
        print(f"  {fy}: metrics={list(d.keys())} | Treasury={rev.get('Treasury BMU')} | Retail={rev.get('Retail Banking')}")
    print(f"\nSaved: {OUTPUT}")
    print(f"Years: {years[0]} – {years[-1]} ({len(years)} years)")
    print(f"Series: {len(series)} | Segments: {sorted(seg_set)}")


if __name__ == "__main__":
    main()
