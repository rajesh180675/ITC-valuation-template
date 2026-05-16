#!/usr/bin/env python3
"""
Titan Segment Extractor
Reads: public/data/annual_reports/TITAN/TITAN_AR_FY*.pdf
Finds: 'Segment total income and profit and loss' table in standalone Notes
Columns: Revenue(curr) | Revenue(prev) | Profit(curr) | Profit(prev)
Currency: INR Crores (no conversion needed)
Output: public/data/segment_data_titan.json
"""
import re, json, sys
from pathlib import Path
from collections import defaultdict
import fitz

BASE   = Path('C:/Users/rajesh/WindsurfAPI/ITC-valuation-template')
AR_DIR = BASE / 'public' / 'data' / 'annual_reports' / 'TITAN'
OUT    = BASE / 'public' / 'data' / 'segment_data_titan.json'

SEGMENTS = ['Watches and wearables', 'Jewellery', 'Eyecare', 'Others']

SEG_NORM = {
    'watches and wearables': 'Watches and wearables',
    'watches': 'Watches and wearables',
    'jewellery': 'Jewellery',
    'jewelry': 'Jewellery',
    'eyecare': 'Eyecare',
    'eye care': 'Eyecare',
    'others': 'Others',
    'other segments': 'Others',
}

def norm_seg(raw):
    k = raw.strip().lower()
    if k in SEG_NORM:
        return SEG_NORM[k]
    for alias, canon in SEG_NORM.items():
        if k.startswith(alias):
            return canon
    return None

def parse_num(s):
    s = s.strip().replace(',', '')
    # handle negative in parens
    if s.startswith('(') and s.endswith(')'):
        try:
            return -float(s[1:-1])
        except ValueError:
            return None
    try:
        return float(s)
    except ValueError:
        return None

def extract_titan_segments(pdf_path, fy_from_filename):
    doc = fitz.open(str(pdf_path))
    if len(doc) == 0:
        doc.close()
        return {}

    result = {}

    for page_num in range(len(doc)):
        page   = doc[page_num]
        text   = page.get_text('text')
        tl     = text.lower()

        # Look for the segment income table (standalone notes)
        if not ('segment total income' in tl or
                ('segment information' in tl and 'jewellery' in tl)):
            continue
        if 'jewellery' not in tl and 'jewelry' not in tl:
            continue

        lines = [l.strip() for l in text.split('\n') if l.strip()]

        # Extract FY from page text
        curr_fy = fy_from_filename
        for line in lines:
            m = re.search(r'(?:31st\s+March|March\s+31)[,\s]+(\d{4})', line, re.I)
            if m:
                curr_fy = f'FY{m.group(1)}'
                break
        try:
            prior_fy = f'FY{int(curr_fy[2:]) - 1}'
        except Exception:
            prior_fy = None

        # Find the table block: after 'Segment total income' or 'Revenue (including other income)'
        start_idx = None
        for i, line in enumerate(lines):
            if 'segment total income' in line.lower() or \
               ('revenue' in line.lower() and 'including other income' in line.lower()):
                start_idx = i
                break

        if start_idx is None:
            # try to find by segment name proximity
            for i, line in enumerate(lines):
                if norm_seg(line) == 'Watches and wearables':
                    start_idx = max(0, i - 2)
                    break

        if start_idx is None:
            continue

        # Parse rows: each segment is on its own line followed by 4 numbers
        # (rev_curr, rev_prev, profit_curr, profit_prev)
        # Numbers can be on the same line or immediately after
        seg_data = {}
        i = start_idx
        while i < len(lines) and len(seg_data) < 5:
            line = lines[i]
            canon = norm_seg(line)
            if canon and canon != 'Corporate (unallocated)':
                # Collect up to 4 numbers from this line and subsequent lines
                nums = []
                # Same line
                same_line_nums = re.findall(r'\([\d,]+\.?\d*\)|[\d,]+\.?\d*', line)
                for t in same_line_nums:
                    n = parse_num(t)
                    if n is not None:
                        nums.append(n)
                # Next lines
                j = i + 1
                while len(nums) < 4 and j < min(i + 6, len(lines)):
                    nxt = lines[j]
                    if norm_seg(nxt) or 'corporate' in nxt.lower() or 'total' in nxt.lower():
                        break
                    more = re.findall(r'\([\d,]+\.?\d*\)|[\d,]+\.?\d*', nxt)
                    for t in more:
                        n = parse_num(t)
                        if n is not None:
                            nums.append(n)
                    j += 1

                if nums:
                    rev_curr    = nums[0] if len(nums) > 0 else None
                    rev_prev    = nums[1] if len(nums) > 1 else None
                    profit_curr = nums[2] if len(nums) > 2 else None
                    profit_prev = nums[3] if len(nums) > 3 else None
                    seg_data[canon] = {
                        'revenue':      rev_curr,
                        'revenue_prev': rev_prev,
                        'ebit':         profit_curr,
                        'ebit_prev':    profit_prev,
                    }
                i = j
                continue
            i += 1

        if len(seg_data) >= 3:
            result[curr_fy] = (seg_data, prior_fy)
            break

    doc.close()
    return result


def main():
    pdfs = sorted(AR_DIR.glob('TITAN_AR_FY*.pdf'))
    if not pdfs:
        print(f'No TITAN PDFs found in {AR_DIR}')
        sys.exit(1)

    print(f'Processing {len(pdfs)} TITAN PDFs...\n')

    flat = defaultdict(dict)

    for pdf in pdfs:
        m = re.search(r'FY(\d{4})', pdf.stem)
        if not m:
            continue
        fy = f'FY{m.group(1)}'
        size_mb = pdf.stat().st_size / 1e6
        print(f'[{fy}] {size_mb:.1f} MB...', end=' ', flush=True)

        try:
            data = extract_titan_segments(pdf, fy)
        except Exception as e:
            print(f'ERROR: {e}')
            continue

        if not data:
            print('no table found')
            continue

        count = 0
        for curr_fy, (seg_data, prior_fy) in data.items():
            for seg, metrics in seg_data.items():
                if metrics.get('revenue') is not None:
                    k = f'revenue|{seg}'
                    if curr_fy not in flat[k]:
                        flat[k][curr_fy] = metrics['revenue']
                        count += 1
                    if metrics.get('revenue_prev') is not None and prior_fy:
                        if prior_fy not in flat[k]:
                            flat[k][prior_fy] = metrics['revenue_prev']
                            count += 1
                if metrics.get('ebit') is not None:
                    k = f'ebit|{seg}'
                    if curr_fy not in flat[k]:
                        flat[k][curr_fy] = metrics['ebit']
                        count += 1
                    if metrics.get('ebit_prev') is not None and prior_fy:
                        if prior_fy not in flat[k]:
                            flat[k][prior_fy] = metrics['ebit_prev']
                            count += 1
        print(f'{count} values — {list(seg_data.keys())}')

    all_fys  = sorted(set(fy for d in flat.values() for fy in d))
    all_segs = sorted(set(k.split('|', 1)[1] for k in flat if '|' in k))

    out = {
        'symbol':   'TITAN',
        'basis':    'standalone',
        'company':  'Titan Company Limited',
        'currency': 'INR_Cr',
        'source':   'Titan Annual Reports — Segment total income and profit/loss (Note 26)',
        'segments': SEGMENTS,
        'years':    all_fys,
        'segment_time_series': {k: dict(sorted(v.items())) for k, v in sorted(flat.items())},
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2))

    print(f'\n=== TITAN Done ===')
    print(f'Years: {all_fys[0] if all_fys else "none"} – {all_fys[-1] if all_fys else "none"} ({len(all_fys)} yrs)')
    print(f'Segments: {all_segs}')
    print(f'Series: {len(flat)}')
    print(f'Saved: {OUT}')


if __name__ == '__main__':
    main()
