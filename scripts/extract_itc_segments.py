#!/usr/bin/env python3
"""
ITC Multi-Year Segment Data Extraction (FY2016-FY2025)
Uses PyMuPDF for fast position-based table extraction.
"""
import fitz, json, os

PDF_DIR = 'C:/Users/rajesh/WindsurfAPI/ITC-valuation-template/public/data/annual_reports'
OUTPUT = 'C:/Users/rajesh/WindsurfAPI/ITC-valuation-template/public/data/segment_data_itc.json'

def find_segment_note_page(doc):
    """Find the Note page with actual segment data tables."""
    import re
    for i in range(len(doc)):
        text = doc[i].get_text()
        tl = text.lower()
        
        has_seg_rev = 'segment revenue - gross' in tl or '1. segment revenue' in tl
        has_seg_names = any(kw in tl for kw in ['fmcg - cigarette', 'agri business', 'paperboard'])
        has_numbers = bool(re.search(r'\d{4,6}\.\d{2}', text))
        
        if has_seg_rev and has_seg_names and has_numbers:
            return i
    
    for i in range(len(doc)):
        text = doc[i].get_text()
        tl = text.lower()
        if 'segment revenue' in tl and 'cigarette' in tl and re.search(r'note\s+\d+', text[:80].lower()):
            return i
    
    return None

def parse_segment_page(page, fy_current, fy_prior):
    """Parse structured segment data using text positions."""
    blocks = page.get_text('dict')['blocks']
    lines = []
    for block in blocks:
        if 'lines' in block:
            for line in block['lines']:
                spans = line['spans']
                text = ''.join(s['text'] for s in spans).strip()
                x0 = spans[0]['bbox'][0] if spans else 0
                y0 = line['bbox'][1]
                lines.append((x0, y0, text))
    
    lines.sort(key=lambda l: (l[1], l[0]))
    
    # Group into table rows by y-position
    rows = []
    current_y = None
    current_cells = []
    for x, y, text in lines:
        if current_y is None or abs(y - current_y) < 5:
            current_cells.append((x, text))
            current_y = y
        else:
            if current_cells:
                rows.append((current_y, current_cells))
            current_cells = [(x, text)]
            current_y = y
    if current_cells:
        rows.append((current_y, current_cells))
    
    # Classify columns by x-position
    def classify_col(x):
        if x < 150: return 'label'
        elif x < 280: return 'fy_current_ext'
        elif x < 340: return 'fy_current_inter'
        elif x < 390: return 'fy_current_total'
        elif x < 440: return 'fy_prior_ext'
        elif x < 500: return 'fy_prior_inter'
        else: return 'fy_prior_total'
    
    data = {'revenue': {}, 'results': {}, 'assets': {}, 'liabilities': {}}
    current_section = None
    section_keywords = {
        'segment revenue - gross': 'revenue',
        '1. segment revenue': 'revenue',
        '2. segment results': 'results',
        '3.': 'other',
        '4.': None,
    }
    
    for y, cells in rows:
        # Build row text
        row_text = ' '.join(t for _, t in cells)
        rl = row_text.lower().strip()
        
        # Detect section
        if '1. segment revenue' in rl or 'segment revenue - gross' in rl:
            current_section = 'revenue'
            continue
        elif '2. segment results' in rl:
            current_section = 'results'
            continue
        elif '3.' in rl and 'information' not in rl and current_section:
            current_section = 'assets'
            continue
        elif '4.' in rl and current_section:
            current_section = 'liabilities'
            continue
        
        if not current_section:
            continue
        
        # Get the label (first cell with x < 150)
        label = None
        vals = {}
        for x, t in cells:
            col = classify_col(x)
            if col == 'label':
                label = t.strip().rstrip(',').strip()
            else:
                raw = t.strip().replace(',', '').replace('(', '-').replace(')', '')
                try:
                    vals[col] = round(float(raw), 2)
                except:
                    vals[col] = None
        
        if not label or not any(v for v in vals.values()):
            continue
        
        # Only capture segment-related rows
        kws = ['fmcg', 'cigarette', 'agri', 'paperboard', 'hotel', 'others',
               'total fmcg', 'segment total', 'elimination', 'inter-segment',
               'gross revenue', 'segment', 'total']
        if any(kw in label.lower() for kw in kws):
            entry = {}
            if vals.get('fy_current_total'):
                entry[f'FY{fy_current}'] = vals['fy_current_total']
            elif vals.get('fy_current_ext'):
                entry[f'FY{fy_current}'] = vals['fy_current_ext']
            if vals.get('fy_prior_total'):
                entry[f'FY{fy_prior}'] = vals['fy_prior_total']
            elif vals.get('fy_prior_ext'):
                entry[f'FY{fy_prior}'] = vals['fy_prior_ext']
            
            if entry:
                data[current_section][label] = entry
    
    return data

# Process all years
all_data = {}
for year in range(2016, 2026):
    path = os.path.join(PDF_DIR, f'ITC_AR_{year}.pdf')
    if not os.path.exists(path):
        continue
    
    print(f'FY{year}...', end=' ', flush=True)
    fy_cur, fy_pr = year, year - 1
    
    doc = fitz.open(path)
    note_page = find_segment_note_page(doc)
    
    if note_page is None:
        print(f'no Note 30 found', flush=True)
        doc.close()
        continue
    
    print(f'page {note_page+1}', end='', flush=True)
    seg_data = parse_segment_page(doc[note_page], fy_cur, fy_pr)
    
    for section in ['revenue', 'results', 'assets', 'liabilities']:
        if seg_data[section]:
            for name, vals in seg_data[section].items():
                key = f'{section}|{name}'
                if key not in all_data:
                    all_data[key] = {}
                all_data[key].update(vals)
            print(f' [{section}]', end='', flush=True)
    
    doc.close()
    print(flush=True)

# Output compiled time-series
print('\n=== COMPILED ===', flush=True)
for section in ['revenue', 'results', 'assets', 'liabilities']:
    items = {k: v for k, v in all_data.items() if k.startswith(section + '|')}
    if items:
        labels = {'revenue': 'SEGMENT REVENUE', 'results': 'SEGMENT RESULTS', 'assets': 'SEGMENT ASSETS', 'liabilities': 'SEGMENT LIABILITIES'}
        print(f'\n{labels[section]}:', flush=True)
        for key in sorted(items.keys()):
            name = key.split('|', 1)[1]
            fy_vals = items[key]
            sorted_years = sorted(fy_vals.keys(), key=lambda x: int(x[2:]))
            vals_str = ', '.join(f'{y}={fy_vals[y]:.0f}' for y in sorted_years)
            print(f'  {name:50s} {vals_str}', flush=True)

# Save
output = {
    'symbol': 'ITC',
    'source': 'ITC Annual Reports (itcportal.com), Note 30: Segment Reporting',
    'method': 'PyMuPDF position-based table extraction',
    'notes': 'Values in Rs. Crores. Standalone segment data.',
    'segment_time_series': all_data,
}

with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, default=str)
print(f'\nSaved to {OUTPUT}', flush=True)
