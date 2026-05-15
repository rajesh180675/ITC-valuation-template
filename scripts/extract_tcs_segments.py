#!/usr/bin/env python3
"""
TCS Segment Data Extractor v2 — reads Performance Trend summary tables
from each year's AR. Handles multiple FY formats and corrupted segment names.

Output: public/data/segment_data_tcs.json
"""
import json, re, sys
from pathlib import Path
from collections import defaultdict
import fitz

BASE = Path(__file__).resolve().parent.parent
AR_DIR = BASE / 'public' / 'data' / 'annual_reports' / 'TCS'
OUT = BASE / 'public' / 'data' / 'segment_data_tcs.json'

# Known corrupted segment name mappings (from old PDFs with bad text layers)
NAME_FIXES = {
    '.ORTH!MERICA': 'North America',
    '.EW GROWTH': 'Others',
    'NORTH AMERICA': 'North America',
    'NEW GROWTH': 'Others',
    'UK': 'UK',
    'EUROPE': 'Europe',
    'INDIA': 'India',
    'AMERICAS': 'Americas',
    'LATIN AMERICA': 'Latin America',
    'REST OF WORLD': 'Others',
    'MIDDLE EAST': 'Others',
    'MIDDLE EAST AND AFRICA': 'Others',
    'MEADOWS': 'Others',
}

# Standard segment names: normalize to these
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


def normalize_fy(raw):
    """Normalize any FY format to FY20XX."""
    raw = raw.strip().strip('*')
    # FY2017-18 → FY2018
    m = re.match(r'(?:FY\s*)?(\d{4})-(\d{2})', raw)
    if m:
        year1 = int(m.group(1))
        year2 = int(m.group(2))
        # 2017-18 → FY2018, 2008-09 → FY2009
        return f'FY{year1 + 1}' if year2 == (year1 + 1) % 100 else f'FY{year1}'
    # Fiscal 2014 → FY2014
    m = re.match(r'Fiscal\s*(\d{4})', raw, re.I)
    if m:
        return f'FY{m.group(1)}'
    # FY2025 or 2025
    m = re.match(r'(?:FY\s*)?(\d{4})', raw)
    if m:
        return f'FY{m.group(1)}'
    return None


def normalize_geo_name(raw):
    """Normalize geographic segment name to canonical form."""
    name = raw.strip()
    # Fix known corruptions (null bytes, special chars)
    name_clean = re.sub(r'[\x00-\x1f]', ' ', name)  # strip control chars
    name_upper = name_clean.upper().strip()

    # Direct pattern matches for corrupted names
    if 'MERICA' in name_upper or 'ORTH' in name_upper:
        return 'Americas'  # Same as newer ARs
    if ('GROWTH' in name_upper and 'NEW' in name_upper) or '.EW' in name:
        return 'Others'
    if name_upper.startswith('NORTH'):
        return 'Americas'  # Normalize North America → Americas

    # Standard normalization
    lower = name_clean.lower().strip()
    for pattern, canonical in GEO_NORMALIZE.items():
        if pattern in lower or lower in pattern:
            return canonical
    # Capitalize first letter of each word if not already
    if name_clean.isupper() or name_clean.islower():
        return name_clean.title()
    return name_clean


def parse_performance_trend(pdf_path):
    """Extract geographic segment revenue from Performance Trend table."""
    doc = fitz.open(str(pdf_path))
    result = {}

    for page_num in range(len(doc)):
        page = doc[page_num]
        text_lower = page.get_text('text').lower()

        # Skip pages without performance trend or geographic data
        if 'performance trend' not in text_lower and 'revenue by geographic' not in text_lower:
            continue

        # Get spans with positions
        spans = []
        for b in page.get_text('dict')['blocks']:
            if 'lines' in b:
                for l in b['lines']:
                    for s in l['spans']:
                        t = s['text'].strip()
                        if t:
                            spans.append({
                                'text': t,
                                'x': round(s['bbox'][0]),
                                'y': round(s['bbox'][1]),
                            })

        # Find "Revenue by geographic" section
        geo_start_y = None
        for s in spans:
            if 'revenue by geographic' in s['text'].lower():
                geo_start_y = s['y']
                break
            # Also match "Revenue by" + next line "geographic segments"
            if s['text'].lower() == 'revenue by' and geo_start_y is None:
                # Check if next line says geographic
                below = [s2 for s2 in spans if s2['y'] > s['y'] and s2['y'] < s['y'] + 30]
                for s2 in below:
                    if 'geographic' in s2['text'].lower():
                        geo_start_y = s['y']
                        break

        if geo_start_y is None:
            continue

        # Find header FY columns — look above and around geo_start_y
        header_fys = []

        # Strategy 1: Single spans like "FY 2025" or "FY2025"
        for s in spans:
            if geo_start_y - 130 < s['y'] <= geo_start_y + 20:
                fy = normalize_fy(s['text'])
                if fy:
                    header_fys.append({'fy': fy, 'x': s['x']})

        # Strategy 2: "Fiscal" row + year row below it (old ARs)
        if not header_fys:
            fiscal_spans = [s for s in spans if geo_start_y - 130 < s['y'] <= geo_start_y + 20
                           and s['text'].lower() in ('fiscal', 'fy')]
            for fs in fiscal_spans:
                # Find the year number directly below
                below = [s for s in spans
                        if abs(s['x'] - fs['x']) < 15
                        and fs['y'] < s['y'] < fs['y'] + 20
                        and re.match(r'\d{4}', s['text'].strip())]
                for bs in below:
                    fy = normalize_fy(bs['text'])
                    if fy:
                        header_fys.append({'fy': fy, 'x': bs['x']})

        # Strategy 3: Just bare year numbers in header area
        if not header_fys:
            for s in spans:
                if geo_start_y - 130 < s['y'] <= geo_start_y + 20:
                    m = re.match(r'^(\d{4})$', s['text'].strip())
                    if m:
                        header_fys.append({'fy': f'FY{m.group(1)}', 'x': s['x']})

        if not header_fys:
            continue

        header_fys = sorted(header_fys, key=lambda h: h['x'])

        # Find end of geographic section (next section heading)
        geo_end_y = geo_start_y + 120
        for s in spans:
            if s['y'] > geo_start_y + 20:
                lower = s['text'].lower().strip()
                if lower.startswith('cost') or lower.startswith('employee') or lower.startswith('revenue by industry'):
                    geo_end_y = s['y']
                    break

        # Collect segment rows
        row_labels = {}  # y → name
        for s in spans:
            if geo_start_y < s['y'] < geo_end_y and s['x'] < 100:
                name = s['text'].strip()
                if name and not re.match(r'^[\d,\.]+$', name) and not re.match(r'^segment', name, re.I):
                    # Skip "segments" label that's part of heading
                    if name.lower() in ('segments', 'geographic'):
                        continue
                    if s['y'] in row_labels:
                        row_labels[s['y']] += ' ' + name
                    else:
                        row_labels[s['y']] = name

        # For each row, collect values
        geo_section = {}
        for row_y, raw_name in sorted(row_labels.items()):
            name = normalize_geo_name(raw_name)
            if not name or len(name) < 2:
                continue

            # Get number spans on this row
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
                # Match to closest FY header
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
            result['revenue'] = geo_section
            break  # Use first matching page per PDF

    doc.close()
    return result


def main():
    pdfs = sorted(AR_DIR.glob('TCS_AR_*.pdf'))
    if not pdfs:
        print(f'No TCS PDFs found in {AR_DIR}')
        sys.exit(1)

    print(f'Processing {len(pdfs)} TCS PDFs...\n')

    # Merge data from all PDFs (newest first to prefer recent data)
    all_series = defaultdict(dict)

    for pdf in reversed(pdfs):
        year_match = re.search(r'(\d{4})', pdf.stem)
        if not year_match:
            continue
        source_year = year_match.group(1)
        size_mb = pdf.stat().st_size / 1e6

        try:
            data = parse_performance_trend(pdf)
        except Exception as e:
            print(f'[FY{source_year}] {size_mb:.1f} MB... ERROR: {e}')
            continue

        if not data:
            print(f'[FY{source_year}] {size_mb:.1f} MB... NO DATA')
            continue

        new_count = 0
        for section, segments in data.items():
            for seg_name, fy_vals in segments.items():
                key = f'{section}|{seg_name}'
                for fy, val in fy_vals.items():
                    if fy not in all_series[key]:
                        all_series[key][fy] = val
                        new_count += 1

        print(f'[FY{source_year}] {size_mb:.1f} MB... OK ({new_count} new values)')

    if not all_series:
        print('\nNo segment data extracted!')
        sys.exit(1)

    # Build output
    final_series = {k: dict(sorted(v.items())) for k, v in sorted(all_series.items())}

    out = {
        'symbol': 'TCS',
        'basis': 'consolidated',
        'source': 'TCS Annual Reports - Performance Trend Tables (2005-2025)',
        'segment_time_series': final_series,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(out, f, indent=2)

    all_fys = sorted(set(fy for v in final_series.values() for fy in v))
    print(f'\nSaved: {OUT}')
    print(f'Segments: {len(final_series)}')
    print(f'Years: {all_fys}')

    for section in ['revenue', 'results', 'assets']:
        keys = [k for k in final_series if k.startswith(f'{section}|')]
        if keys:
            print(f'\n{section.upper()}:')
            for k in sorted(keys):
                name = k.split('|', 1)[1]
                fys = sorted(final_series[k].keys())
                print(f'  {name}: {fys[0]}-{fys[-1]} ({len(fys)} yrs)')


if __name__ == '__main__':
    main()
