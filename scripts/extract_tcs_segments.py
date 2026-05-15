#!/usr/bin/env python3
"""
TCS Segment Data Extractor v3 — extracts industry vertical segments
from Notes to Accounts (Segment Information, Ind AS 108).

Has revenue + segment results for each vertical.
Also keeps geographic revenue from Performance Trend tables.

Output: public/data/segment_data_tcs.json
"""
import json, re, sys
from pathlib import Path
from collections import defaultdict
import fitz

BASE = Path(__file__).resolve().parent.parent
AR_DIR = BASE / 'public' / 'data' / 'annual_reports' / 'TCS'
OUT = BASE / 'public' / 'data' / 'segment_data_tcs.json'

# Industry vertical segment names per year (consistent from 2021 onwards)
VERTICAL_ORDER = [
    'Banking, Financial Services and Insurance',
    'Manufacturing',
    'Consumer Business',
    'Communication, Media and Technology',
    'Life Sciences and Healthcare',
    'Others',
]


def normalize_fy(raw):
    s = str(raw or '').strip().replace('*', '').replace(',', '').strip()
    # Must be a clean year-like token, not a number within text
    if not re.match(r'^(?:FY\s*)?(?:\d{4}|\d{4}-\d{2}|Fiscal\s*\d{4})$', s, re.I):
        return None
    # Range: 2017-18 → FY2018
    m = re.match(r'(?:FY\s*)?(\d{4})-(\d{2})$', s)
    if m:
        return f'FY{int(m.group(1)) + 1}'
    # Fiscal 2014 → FY2014
    m = re.match(r'Fiscal\s*(\d{4})$', s, re.I)
    if m:
        return 'FY' + m.group(1)
    # FY2025 or 2025 (must be a sensible year: 1990-2099)
    m = re.match(r'(?:FY\s*)?(\d{4})$', s)
    if m:
        y = int(m.group(1))
        if 1990 <= y <= 2099:
            return 'FY' + str(y)
        return None
    return None


def extract_geographic_revenue(pdf_path):
    """Extract geographic segment revenue from Performance Trend table."""
    doc = fitz.open(str(pdf_path))
    result = {}

    for page_num in range(len(doc)):
        page = doc[page_num]
        text_lower = page.get_text('text').lower()

        if 'performance trend' not in text_lower and 'revenue by geographic' not in text_lower:
            continue

        spans = []
        for b in page.get_text('dict')['blocks']:
            if 'lines' in b:
                for l in b['lines']:
                    for s in l['spans']:
                        t = s['text'].strip()
                        if t:
                            spans.append({'text': t, 'x': round(s['bbox'][0]), 'y': round(s['bbox'][1])})

        geo_start_y = None
        for s in spans:
            if 'revenue by geographic' in s['text'].lower():
                geo_start_y = s['y']
                break
            if s['text'].lower() == 'revenue by':
                below = [s2 for s2 in spans if s2['y'] > s['y'] and s2['y'] < s['y'] + 30]
                for s2 in below:
                    if 'geographic' in s2['text'].lower():
                        geo_start_y = s['y']
                        break

        if geo_start_y is None:
            continue

        # Find headers
        header_fys = []
        for s in spans:
            if geo_start_y - 130 < s['y'] <= geo_start_y + 20:
                fy = normalize_fy(s['text'])
                if fy:
                    header_fys.append({'fy': fy, 'x': s['x']})

        # Fiscal label + year below
        if not header_fys:
            fiscal_spans = [s for s in spans if geo_start_y - 130 < s['y'] <= geo_start_y + 20
                           and s['text'].lower() in ('fiscal', 'fy')]
            for fs in fiscal_spans:
                below = [s for s in spans
                        if abs(s['x'] - fs['x']) < 15
                        and fs['y'] < s['y'] < fs['y'] + 20
                        and re.match(r'\d{4}', s['text'].strip())]
                for bs in below:
                    fy = normalize_fy(bs['text'])
                    if fy:
                        header_fys.append({'fy': fy, 'x': bs['x']})

        # Bare years
        if not header_fys:
            for s in spans:
                if geo_start_y - 130 < s['y'] <= geo_start_y + 20:
                    m = re.match(r'^(\d{4})$', s['text'].strip())
                    if m:
                        header_fys.append({'fy': f'FY{m.group(1)}', 'x': s['x']})

        if not header_fys:
            continue

        header_fys = sorted(header_fys, key=lambda h: h['x'])

        geo_end_y = geo_start_y + 120
        for s in spans:
            if s['y'] > geo_start_y + 20:
                lower = s['text'].lower().strip()
                if lower.startswith('cost') or lower.startswith('employee') or lower.startswith('revenue by industry'):
                    geo_end_y = s['y']
                    break

        # Collect rows
        row_labels = {}
        for s in spans:
            if geo_start_y < s['y'] < geo_end_y and s['x'] < 100:
                name = s['text'].strip()
                if name and not re.match(r'^[\d,\.]+$', name) and not re.match(r'^segment', name, re.I):
                    if name.lower() in ('segments', 'geographic'):
                        continue
                    if s['y'] in row_labels:
                        row_labels[s['y']] += ' ' + name
                    else:
                        row_labels[s['y']] = name

        geo_section = {}
        for row_y, raw_name in sorted(row_labels.items()):
            name = normalize_geo_name(raw_name)
            if not name or len(name) < 2:
                continue

            y_tol = 8
            num_spans = [s for s in spans
                        if abs(s['y'] - row_y) < y_tol
                        and s['x'] > 100
                        and re.match(r'^[\d,\.]+$', s['text'])]

            if not num_spans:
                continue

            row_data = {}
            for ns in num_spans:
                val = float(ns['text'].replace(',', ''))
                best_fy = None
                best_dist = 999
                for h in header_fys:
                    dist = abs(ns['x'] - h['x'])
                    if dist < best_dist:
                        best_dist = dist
                        best_fy = h['fy']
                if best_fy and best_dist < 40:
                    row_data[best_fy] = val

            if row_data and len(row_data) >= 3:
                geo_section[name] = row_data

        if geo_section:
            result['revenue_geo'] = geo_section
            break

    doc.close()
    return result


def normalize_geo_name(raw):
    name = raw.strip()
    name_clean = re.sub(r'[\x00-\x1f]', ' ', name)
    name_upper = name_clean.upper().strip()

    GEO_NORMALIZE = {
        'north america': 'Americas',
        'uk': 'UK',
        'europe': 'Europe',
        'india': 'India',
        'new growth': 'Others',
        'rest of world': 'Others',
        'others': 'Others',
        'latin america': 'Latin America',
        'middle east and africa': 'Others',
        'middle east': 'Others',
        'mea': 'Others',
        'apac': 'Asia Pacific',
        'asia pacific': 'Asia Pacific',
        'asiapacific': 'Asia Pacific',
        'asia paciﬁc': 'Asia Pacific',
        'iberomericas': 'Latin America',
        'ibero americas': 'Latin America',
        'continental europe': 'Europe',
    }

    if 'MERICA' in name_upper or 'ORTH' in name_upper:
        return 'Americas'
    if ('GROWTH' in name_upper and 'NEW' in name_upper) or '.EW' in name:
        return 'Others'
    if name_upper.startswith('NORTH'):
        return 'Americas'

    lower = name_clean.lower().strip()
    for pattern, canonical in GEO_NORMALIZE.items():
        if pattern in lower or lower in pattern:
            return canonical
    if name_clean.isupper() or name_clean.islower():
        return name_clean.title()
    return name_clean


def extract_industry_verticals(pdf_path):
    """Extract industry vertical revenue + segment results from notes."""
    doc = fitz.open(str(pdf_path))
    result = {}

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text('text')
        text_lower = text.lower()

        if 'segment information' not in text_lower or 'segment result' not in text_lower:
            continue
        if 'revenue from operations' not in text_lower:
            continue

        lines = text.split('\n')

        # Find the FY from context
        # Look for "Year ended March 31, 2025" or similar
        fy_map = {}
        for l in lines:
            m = re.search(r'Year ended\s+.*?(\d{4})', l, re.I)
            if not m:
                m = re.search(r'March\s+31,\s*(\d{4})', l, re.I)
            if m:
                fy = f'FY{m.group(1)}'
                # If year > current month, use FY-1 (e.g. 2025 report = FY2025)
                fy_map[fy] = fy

        # Check if this page has the current year and prior year data
        has_current = any('2025' in l for l in lines[:20])
        has_prior = any('2024' in l for l in lines[:20])

        # Find the revenue and result rows
        revenue_line = None
        result_line = None

        for j, l in enumerate(lines):
            lower = l.strip().lower()
            if 'revenue from operations' in lower:
                revenue_line = j
            if 'segment result' in lower or 'segment results' in lower:
                result_line = j

        if revenue_line is None or result_line is None:
            continue

        # The value columns follow each heading
        # Each vertical has a value, then total at the end
        # We need to know which year this is from the document title

        # Determine the FY from the AR filename
        year_match = re.search(r'(\d{4})', doc.name)
        if not year_match:
            continue
        base_year = int(year_match.group(1))

        # The AR covers FY ending March of that year
        curr_fy = f'FY{base_year}'
        pri_fy = f'FY{base_year - 1}'

        # Parse revenue values after "Revenue from operations"
        def parse_row_values(lines, start_idx):
            """Parse numbers from lines starting at start_idx."""
            values = []
            for j in range(start_idx + 1, min(start_idx + 10, len(lines))):
                line = lines[j].strip()
                nums = re.findall(r'[\d,]+\.?\d*', line.replace(',', ''))
                for n in nums:
                    try:
                        v = float(n)
                        values.append(v)
                    except ValueError:
                        pass
                if len(values) >= 7:  # 6 verticals + total
                    break
            return values[:7]  # max 7 numbers (6 segments + total)

        rev_vals = parse_row_values(lines, revenue_line)
        res_vals = parse_row_values(lines, result_line)

        if len(rev_vals) >= 6 and len(res_vals) >= 6:
            # We have 6 verticals + possibly a total
            verts = VERTICAL_ORDER[:len(rev_vals) - 1] if len(rev_vals) == 7 else VERTICAL_ORDER[:len(rev_vals)]

            iv_data = {}
            for idx, vert in enumerate(verts[:min(len(rev_vals), len(verts), len(res_vals))]):
                iv_data[vert] = {
                    'revenue': {curr_fy: rev_vals[idx]},
                    'results': {curr_fy: res_vals[idx]},
                }

            # Check if there's also prior year data (second table)
            # Look for another "Revenue from operations" later in the page
            second_rev_line = None
            second_res_line = None
            for j in range(revenue_line + 20, min(revenue_line + 80, len(lines))):
                lower = lines[j].strip().lower()
                if 'revenue from operations' in lower:
                    second_rev_line = j
                if 'segment result' in lower or 'segment results' in lower:
                    second_res_line = j

            if second_rev_line and second_res_line:
                rev_vals2 = parse_row_values(lines, second_rev_line)
                res_vals2 = parse_row_values(lines, second_res_line)
                if len(rev_vals2) >= 6 and len(res_vals2) >= 6:
                    for idx, vert in enumerate(verts[:min(len(rev_vals2), len(verts), len(res_vals2))]):
                        iv_data[vert]['revenue'][pri_fy] = rev_vals2[idx]
                        iv_data[vert]['results'][pri_fy] = res_vals2[idx]

            result = iv_data

    doc.close()
    return result


def clean_segment_name(raw):
    """Clean industry vertical segment name."""
    name = raw.strip()
    # Remove footnotes
    name = re.sub(r'\s*\(\d+\)\s*$', '', name)
    return name.strip()


def main():
    pdfs = sorted(AR_DIR.glob('TCS_AR_*.pdf'))
    if not pdfs:
        print(f'No TCS PDFs found in {AR_DIR}')
        sys.exit(1)

    print(f'Processing {len(pdfs)} TCS PDFs...\n')

    all_series = defaultdict(dict)

    # Phase 1: Geographic revenue from Performance Trend
    print('--- Phase 1: Geographic revenue (Performance Trend) ---')
    for pdf in reversed(pdfs):
        year_match = re.search(r'(\d{4})', pdf.stem)
        if not year_match:
            continue
        source_year = year_match.group(1)
        size_mb = pdf.stat().st_size / 1e6

        try:
            data = extract_geographic_revenue(pdf)
        except Exception as e:
            print(f'[FY{source_year}] {size_mb:.1f} MB... ERROR: {e}')
            continue

        if not data:
            continue

        new_count = 0
        for section, segments in data.items():
            for seg_name, fy_vals in segments.items():
                key = f'{section}|{seg_name}'
                for fy, val in fy_vals.items():
                    if fy not in all_series[key]:
                        all_series[key][fy] = val
                        new_count += 1

        print(f'[FY{source_year}] {size_mb:.1f} MB... {new_count} new geographic values')
    geo_keys = [k for k in all_series if k.startswith('revenue|')]
    print(f'Geographic series: {len(geo_keys)}')


    # Phase 2: Industry vertical revenue + results from notes
    print('\n--- Phase 2: Industry vertical segments (Notes to Accounts) ---')
    iv_count = 0
    for pdf in reversed(pdfs):
        year_match = re.search(r'(\d{4})', pdf.stem)
        if not year_match:
            continue
        source_year = int(year_match.group(1))
        size_mb = pdf.stat().st_size / 1e6

        try:
            iv_data = extract_industry_verticals(pdf)
        except Exception as e:
            print(f'[FY{source_year}] {size_mb:.1f} MB... ERROR: {e}')
            continue

        if not iv_data:
            continue

        new_count = 0
        for vert_name, fy_data in iv_data.items():
            for metric, fy_vals in fy_data.items():
                key = f'{metric}|{vert_name}'
                for fy, val in fy_vals.items():
                    if fy not in all_series[key]:
                        all_series[key][fy] = val
                        new_count += 1

        iv_count += new_count
        print(f'[FY{source_year}] {size_mb:.1f} MB... {new_count} new vertical values')

    print(f'\nTotal new values: {iv_count}')

    # Merge and output
    # For geographic vs industry vertical: geographic revenue gets 'revenue_geo|' prefix
    # Industry vertical revenue gets 'revenue|' prefix, results get 'results|' prefix
    final_series = {}
    for key, fy_vals in all_series.items():
        final_series[key] = dict(sorted(fy_vals.items()))

    out = {
        'symbol': 'TCS',
        'basis': 'consolidated',
        'source': 'TCS Annual Reports - Segment Notes + Performance Trend',
        'segment_time_series': dict(sorted(final_series.items())),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(out, f, indent=2)

    all_fys = sorted(set(fy for v in final_series.values() for fy in v))
    print(f'\nSaved: {OUT}')
    print(f'Total series: {len(final_series)}')
    print(f'Years: {all_fys}')

    for section in ['revenue', 'results', 'assets', 'revenue_geo']:
        keys = [k for k in final_series if k.startswith(f'{section}|')]
        if keys:
            print(f'\n{section}:')
            for k in sorted(keys):
                name = k.split('|', 1)[1]
                fys = sorted(final_series[k].keys())
                print(f'  {name}: {fys[0]}-{fys[-1]} ({len(fys)} yrs)')


if __name__ == '__main__':
    main()
