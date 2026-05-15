#!/usr/bin/env python3
"""Extract segments from all 20 TCS PDFs and build segment_data_tcs.json"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from build_segment_data import extract_segment_data_from_pdf, build_time_series

PDF_DIR = Path("public/data/annual_reports") / "TCS"
OUTPUT = Path("public/data/segment_data_tcs.json")

all_series = {}
pdfs = sorted(PDF_DIR.glob("TCS_AR_*.pdf"))
print(f"Processing {len(pdfs)} TCS PDFs...\n")

success = 0
failed = 0
for fp in pdfs:
    year = fp.stem.split("_")[-1]
    fy = f"FY{year}"
    sz = fp.stat().st_size / 1e6
    print(f"[{fy}] {sz:.1f} MB...", end=" ", flush=True)
    
    result = extract_segment_data_from_pdf(str(fp), fy)
    if result:
        sections, pages = result
        all_series[year] = sections
        seg_count = sum(len(v) for v in sections.values())
        print(f"OK ({seg_count} series)")
        success += 1
    else:
        print(f"NO DATA")
        failed += 1

if all_series:
    # Convert {year: sections} to list of (fy, sections, None)
    data_list = [(fy, all_series[fy], None) for fy in sorted(all_series.keys())]
    ts = build_time_series(data_list, sorted(all_series.keys()))
    out = {
        "symbol": "TCS",
        "basis": "consolidated",
        "source": "ProQuest Annual Reports (2005-2025)",
        "warnings": [],
        "segment_time_series": ts
    }
    OUTPUT.write_text(json.dumps(out, indent=2))
    print(f"\nSaved: {OUTPUT}")
    print(f"Segments: {len(ts)}")
    print(f"Years: {sorted(all_series.keys())}")
else:
    print("No data extracted")

print(f"\nSuccess: {success}, Failed: {failed}")
