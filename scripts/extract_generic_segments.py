"""
Generic row-based segment extractor for multiple companies.
Handles: SUNPHARMA, ONGC, TITAN, TECHM, TATASTEEL, SBIN

Usage: py -3.14 scripts/extract_generic_segments.py [TICKER ...]
       py -3.14 scripts/extract_generic_segments.py --all
"""
import re, json, fitz, os, sys
from pathlib import Path

BASE_DIR = Path("C:/Users/rajesh/WindsurfAPI/ITC-valuation-template")
AR_BASE  = BASE_DIR / "public" / "data" / "annual_reports"
OUT_BASE = BASE_DIR / "public" / "data"

# ── Company config ─────────────────────────────────────────────────────────────
# Each entry: ticker -> {
#   basis, company, currency, scale (Cr divisor: 1=Cr, 10=M to Cr),
#   segment_finder: callable(page_text) -> bool,
#   seg_names: canonical list (order matters for column-based),
#   mode: "row" | "column",
#   row_patterns: list of (regex, canonical_name) for row mode,
#   col_order: list of col indices to keep for column mode,
#   metric_map: dict of row-label regex -> metric key
# }

CONFIGS = {
    "SUNPHARMA": {
        "basis": "consolidated", "company": "Sun Pharmaceutical Industries Ltd",
        "currency": "INR_Cr", "scale": 10,
        "page_trigger": lambda t: re.search(r'NOTE.*52.*SEGMENT|SEGMENT REPORTING', t, re.I) is not None and "India" in t and ("Emerging" in t or "United States" in t),
        "mode": "row",
        "segs": ["India", "USA", "Emerging Markets", "Rest of World"],
        "row_patterns": [
            (r"^India$", "India"),
            (r"^United States", "USA"),
            (r"^Emerging [Mm]arkets?", "Emerging Markets"),
            (r"^Rest of [Tt]he [Ww]orld|^Rest of [Ww]orld", "Rest of World"),
        ],
        "metric_label": r"Revenue by geography|^India$",
        "metric_key": "revenue",
        "skip_after": r"Non-current assets|non-current",
    },
    "ONGC": {
        "basis": "standalone", "company": "Oil and Natural Gas Corporation Ltd",
        "currency": "INR_Cr", "scale": 10,
        "page_trigger": lambda t: ("Offshore" in t and "Onshore" in t and
                                   re.search(r'Segment revenue|44\.2', t) is not None and
                                   re.search(r'[\d,]{5,}', t) is not None),
        "mode": "row",
        "segs": ["Offshore", "Onshore"],
        "row_patterns": [
            (r"^Offshore\s*$", "Offshore"),
            (r"^Onshore\s*$", "Onshore"),
        ],
        "metric_label": r"Segment revenue|Segment Revenue",
        "metric_key": "revenue",
        "result_pattern": r"Segment profit|Segment Profit",
    },
    "TITAN": {
        "basis": "standalone", "company": "Titan Company Limited",
        "currency": "INR_Cr", "scale": 1,
        "page_trigger": lambda t: "Segment total income" in t and "Watches" in t and "Jewellery" in t and "Revenue" in t,
        "mode": "titan",
        "segs": ["Watches & Wearables", "Jewellery", "Eyecare", "Others"],
        "row_patterns": [
            (r"^Watches and wearables$|^Watches & [Ww]earables", "Watches & Wearables"),
            (r"^Jewellery$", "Jewellery"),
            (r"^Eyecare$", "Eyecare"),
            (r"^Others$", "Others"),
        ],
        "metric_label": r"Revenue \(including|^Revenue$",
        "metric_key": "revenue",
        "result_pattern": r"Profit/\(loss\)",
    },
    "TECHM": {
        "basis": "consolidated", "company": "Tech Mahindra Limited",
        "currency": "INR_Cr", "scale": 10,
        "page_trigger": lambda t: ("Revenue disaggregation by industry" in t or
                                   "Industry vertical" in t) and
                                  "Communications" in t and re.search(r'[\d,]{5,}', t) is not None,
        "mode": "row",
        "segs": ["Communications", "Manufacturing", "Hi-Tech & Media", "BFSI", "Retail & Logistics", "Healthcare & Life Sciences", "Others"],
        "row_patterns": [
            (r"^Communications$", "Communications"),
            (r"^Manufacturing$", "Manufacturing"),
            (r"^Hi-[Tt]ech.*[Mm]edia|^Hi-[Tt]ech$", "Hi-Tech & Media"),
            (r"^Banking.*financial|^BFSI", "BFSI"),
            (r"^Retail.*transport|^Retail.*logistics", "Retail & Logistics"),
            (r"^Healthcare|^Health.*[Ll]ife", "Healthcare & Life Sciences"),
            (r"^Others$", "Others"),
        ],
        "metric_label": r"Communications|industry vertical",
        "metric_key": "revenue",
    },
    "TATASTEEL": {
        "basis": "consolidated", "company": "Tata Steel Limited",
        "currency": "INR_Cr", "scale": 1,
        "page_trigger": lambda t: "Tata Steel" in t and "Europe" in t and
                                  re.search(r'[Ss]egment.*[Rr]evenue|[Rr]evenue.*[Ss]egment|Net [Rr]evenue', t) is not None and
                                  re.search(r'[\d,]{5,}', t) is not None,
        "mode": "row",
        "segs": ["Tata Steel India", "Tata Steel Europe", "South-East Asia", "Other Indian Operations"],
        "row_patterns": [
            (r"^Tata Steel\s*India|^Tata Steel India", "Tata Steel India"),
            (r"^Tata Steel\s*Europe|^Tata Steel Europe", "Tata Steel Europe"),
            (r"^South.East.*Asia|^South East.*Asia", "South-East Asia"),
            (r"^Neelachal|^Other.*Indian|^Other Indian", "Other Indian Operations"),
        ],
        "metric_label": r"Revenue|Net revenue|Segment revenue",
        "metric_key": "revenue",
    },
    "SBIN": {
        "basis": "consolidated", "company": "State Bank of India",
        "currency": "INR_Cr", "scale": 1,
        "page_trigger": lambda t: ("SEGMENT INFORMATION" in t or "Segment Information" in t) and
                                  "Treasury" in t and "Retail Banking" in t and
                                  re.search(r'Revenue.*exceptional|Revenue\s*\(before', t) is not None,
        "mode": "sbin_banking",
        "segs": ["Treasury", "Corporate/Wholesale Banking", "Retail Banking", "Insurance Business", "Other Banking"],
    },
}


def parse_num(s):
    s = s.strip().replace(',', '').replace(' ', '')
    neg = s.startswith('(') and s.endswith(')')
    s = s.strip('()')
    if re.match(r'^[-–—]$', s): return 0.0
    try: return float(s) * (-1 if neg else 1)
    except: return None


def extract_row_mode(cfg, pages_text):
    """Parse segment tables where segments are row labels."""
    out = {}
    text = "\n".join(pages_text)
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    # Find revenue block start
    rev_start = 0
    metric_label = cfg.get("metric_label", "Revenue")
    for i, l in enumerate(lines):
        if re.search(metric_label, l, re.I):
            rev_start = i
            break

    # How many unique segments to find before stopping
    n_segs = len(cfg.get("segs", cfg.get("row_patterns", [])))

    # Scan for segment rows - stop once all found or terminator hit
    found = {}
    i = rev_start
    while i < min(rev_start + 60, len(lines)):
        line = lines[i]
        for pat, canon in cfg["row_patterns"]:
            if re.match(pat, line, re.I) and canon not in found:
                # Collect next nums
                nums = []
                j = i + 1
                while j < min(i + 8, len(lines)) and len(nums) < 2:
                    v = parse_num(lines[j])
                    if v is not None and abs(v) > 0.1:
                        nums.append(v)
                    elif re.search(r'[A-Za-z]{3,}', lines[j]):
                        break
                    j += 1
                if nums:
                    found[canon] = nums[0] / cfg['scale']
                break
        # Once all segments found, stop
        if len(found) >= n_segs:
            break
        i += 1

    for seg, val in found.items():
        out.setdefault(seg, {})['revenue'] = val

    # Result/profit block
    result_pat = cfg.get("result_pattern")
    if result_pat and rev_start < len(lines):
        res_start = None
        for i in range(rev_start + 1, min(rev_start + 80, len(lines))):
            if re.search(result_pat, lines[i], re.I):
                res_start = i
                break
        if res_start:
            found_res = {}
            i = res_start
            while i < min(res_start + 40, len(lines)):
                line = lines[i]
                for pat, canon in cfg["row_patterns"]:
                    if re.match(pat, line, re.I) and canon not in found_res:
                        nums = []
                        j = i + 1
                        while j < min(i + 8, len(lines)) and len(nums) < 1:
                            v = parse_num(lines[j])
                            if v is not None:
                                nums.append(v)
                            elif re.search(r'[A-Za-z]{3,}', lines[j]):
                                break
                            j += 1
                        if nums:
                            found_res[canon] = nums[0] / cfg['scale']
                        break
                if len(found_res) >= n_segs:
                    break
                i += 1
            for seg, val in found_res.items():
                out.setdefault(seg, {})['ebit'] = val

    return out


def extract_sbin(pages_text):
    """SBIN: column-based like AXIS/HDFC."""
    text = "\n".join(pages_text)
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    out = {}

    seg_order = ["Treasury", "Corporate/Wholesale Banking", "Retail Banking", "Other Banking"]

    # Find "Revenue" or "Revenue and Net Interest Income" row
    rev_idx = None
    for i, l in enumerate(lines):
        if re.match(r'^Revenue$|^Revenue and Net Interest Income|^Total Income|^Net Interest Income', l, re.I):
            rev_idx = i
            break
    if rev_idx is None:
        # Try to find any row with 4+ large numbers matching segment count
        for i, l in enumerate(lines):
            if re.search(r'\d{5,}', l):
                # collect nums on this line
                nums = re.findall(r'[\d,]+\.\d+|[\d,]{5,}', l)
                if len(nums) >= 3:
                    rev_idx = i - 1
                    break

    if rev_idx is not None:
        nums = []
        j = rev_idx + 1
        while j < min(rev_idx + 20, len(lines)) and len(nums) < 6:
            v = parse_num(lines[j])
            if v is not None and abs(v) > 100:
                nums.append(v)
            elif re.search(r'[A-Za-z]{3,}', lines[j]):
                break
            j += 1
        # Map to segments (skip Digital/OtherRetail sub-splits if present)
        # SBIN usually: Treasury, Corp/Wholesale, Digital, OtherRetail, TotalRetail, OtherBanking
        if len(nums) >= 4:
            # Use indices 0,1,4,5 if 6 nums (with digital sub), else 0,1,2,3
            if len(nums) >= 6:
                vals = [nums[0], nums[1], nums[4], nums[5]]
            else:
                vals = nums[:4]
            for seg, v in zip(seg_order, vals):
                out[seg] = {'revenue': v}
    return out


def extract_company(ticker):
    cfg = CONFIGS[ticker]
    pdf_dir = AR_BASE / ticker
    pdfs = sorted(pdf_dir.glob(f"{ticker}_AR_FY*.pdf"))
    if not pdfs:
        print(f"  No PDFs for {ticker}")
        return None

    flat_series = {}
    def add(key, fy, val): flat_series.setdefault(key, {})[fy] = round(val, 2)

    print(f"\n=== {ticker} ===")
    for pdf_path in pdfs:
        m = re.search(r'FY(\d{4})', pdf_path.name)
        if not m: continue
        fy = f"FY{m.group(1)}"

        try:
            doc = fitz.open(str(pdf_path))
        except:
            print(f"  {fy}: open error")
            continue

        seg_pages = []
        trigger = cfg["page_trigger"]
        alt_trigger = cfg.get("alt_page_trigger")

        for i, page in enumerate(doc):
            t = page.get_text()
            try:
                matched = trigger(t)
            except: matched = False
            if not matched and alt_trigger:
                try: matched = alt_trigger(t)
                except: pass
            if matched:
                seg_pages.append(i)
                if len(seg_pages) >= 2: break
        doc.close()

        if not seg_pages:
            print(f"  {fy}: no seg page")
            continue

        # Re-open to get text
        doc = fitz.open(str(pdf_path))
        pages_text = [doc[i].get_text() for i in seg_pages]
        if seg_pages[-1] + 1 < len(doc):
            pages_text.append(doc[seg_pages[-1] + 1].get_text())
        doc.close()

        if cfg["mode"] == "sbin_banking":
            seg_data = extract_sbin(pages_text)
        else:
            # titan/tatasteel/row all use extract_row_mode
            seg_data = extract_row_mode(cfg, pages_text)

        if not seg_data:
            print(f"  {fy}: parse failed")
            continue

        parts = []
        for seg, vals in seg_data.items():
            if 'revenue' in vals: add(f"revenue|{seg}", fy, vals['revenue'])
            if 'ebit' in vals:    add(f"ebit|{seg}",    fy, vals['ebit'])
            parts.append(f"{seg[:10]}={vals.get('revenue','?')}")
        print(f"  {fy}: {', '.join(parts)}")

    if not flat_series:
        return None

    all_fy   = sorted(set(y for d in flat_series.values() for y in d))
    all_segs = sorted(set(k.split('|')[1] for k in flat_series if '|' in k))

    return {
        "symbol": ticker,
        "basis": cfg["basis"],
        "company": cfg["company"],
        "currency": cfg["currency"],
        "source": f"NSE Annual Reports — Segment Reporting Note",
        "segments": all_segs,
        "years": all_fy,
        "segment_time_series": flat_series,
    }


def make_stub(ticker, cfg_name, reason):
    return {
        "symbol": ticker,
        "basis": "standalone",
        "company": cfg_name,
        "currency": "INR_Cr",
        "source": f"Note: {reason}",
        "segments": [],
        "years": [],
        "segment_time_series": {},
    }


if __name__ == "__main__":
    args = sys.argv[1:]
    run_all = "--all" in args
    tickers = [a for a in args if not a.startswith("--")]
    if run_all or not tickers:
        tickers = list(CONFIGS.keys())

    # Stub companies
    stubs = {
        "MARUTI": ("Maruti Suzuki India Limited", "Single reportable segment (Automobiles) per Ind AS 108. No business segment breakdown disclosed."),
        "ASIANPAINT": ("Asian Paints Limited", "Single reportable segment (Paints and Home Decor) per Ind AS 108. No business segment breakdown disclosed."),
    }
    for ticker, (company, reason) in stubs.items():
        if run_all or ticker in tickers:
            out = make_stub(ticker, company, reason)
            path = OUT_BASE / f"segment_data_{ticker.lower()}.json"
            path.write_text(json.dumps(out, indent=2))
            print(f"{ticker}: single-segment stub written")

    # Multi-segment companies
    for ticker in tickers:
        if ticker in stubs: continue
        if ticker not in CONFIGS:
            print(f"Unknown ticker: {ticker}")
            continue
        result = extract_company(ticker)
        if result:
            out_path = OUT_BASE / f"segment_data_{ticker.lower()}.json"
            out_path.write_text(json.dumps(result, indent=2))
            print(f"  -> saved {out_path.name}, {len(result['years'])} years")
