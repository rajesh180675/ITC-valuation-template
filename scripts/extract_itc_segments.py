#!/usr/bin/env python3
"""
ITC segment data extractor — position-based cell extraction.

Uses PyMuPDF get_text('dict') for cell-level extraction with x,y positions.
Detects column count per row by examining ALL cells (including "–" dashes).
Each row's cells are grouped by y, then mapped to External/Inter/Total by
comparing to the known table structure.

Extracts: Segment Revenue, Results, Assets, Liabilities from standalone Note 30.
"""

import fitz, json, math, os, re, time

PDF_DIR = 'C:/Users/rajesh/WindsurfAPI/ITC-valuation-template/public/data/annual_reports'
OUTPUT = 'C:/Users/rajesh/WindsurfAPI/ITC-valuation-template/public/data/segment_data_itc.json'

SEC_LABELS = ['FMCG - Cigarettes', 'FMCG - Others', 'FMCG - Total', 'Agri Business',
              'Paperboards, Paper and Packaging', 'Others', 'Hotels', 'Segment Total',
              'Eliminations', 'Total', 'Unallocated Corporate Assets/Liabilities',
              'Discontinued Operations']

def parse_num(t):
    t = t.replace(',','').replace('(','-').replace(')','').replace('\u20b9','').replace('`','')
    try: return round(float(t), 2) if math.isfinite(float(t)) else None
    except: return None

def clean_label(ll):
    ll = re.sub(r'\(refer note [^)]+\)', '', ll, flags=re.I).strip()
    ll = re.sub(r'\[.*?\]', '', ll).strip()
    ll = re.sub(r'^(?:\d+\.?\s*)+', '', ll).strip()
    return ll.lower().strip(':,. ')

def match_label(raw):
    ll = clean_label(raw)
    # Order matters: more specific patterns first
    if 'fmcg - cigarettes' in ll: return 'FMCG - Cigarettes'
    if 'fmcg - others' in ll: return 'FMCG - Others'
    if 'fmcg - total' in ll or 'total fmcg' in ll: return 'FMCG - Total'
    if 'agri business' in ll: return 'Agri Business'
    if 'paperboard' in ll: return 'Paperboards, Paper and Packaging'
    if ll.startswith('segment total'): return 'Segment Total'
    if ll == 'eliminations' or ll.startswith('elimination'): return 'Eliminations'
    if ll == 'total' or ll.startswith('total '): return 'Total'
    if 'discontinued' in ll: return 'Discontinued Operations'
    if 'unallocated' in ll: return 'Unallocated Corporate Assets/Liabilities'
    if ll == 'hotels' or ll.startswith('hotels '): return 'Hotels'
    if ll == 'others' or ll.startswith('others '): return 'Others'
    return None

def extract_segment_data(doc):
    """Position-based extraction of segment data from standalone Note 30."""
    for i in range(len(doc)-1, 0, -1):
        text = doc[i].get_text().lower()
        if 'notes to the consolidated' in text: continue
        if 'segment reporting' not in text: continue
        if 'segment revenue' not in text: continue
        if not all(s in text for s in ['fmcg', 'agri', 'paperboard']): continue
        
        page = doc[i]
        blocks = page.get_text('dict')['blocks']
        cells = []
        for block in blocks:
            if 'lines' in block:
                for line in block['lines']:
                    spans = line['spans']
                    t = ''.join(s['text'] for s in spans).strip()
                    if t:
                        cells.append((spans[0]['bbox'][0], line['bbox'][1], t))
        
        cells.sort(key=lambda c: (c[1], c[0]))
        
        # Group into rows
        rows = []
        cur_y, cur_row = None, []
        for x, y, t in cells:
            if cur_y is None or abs(y - cur_y) < 6:
                cur_row.append((x, t))
                cur_y = y
            else:
                if cur_row: rows.append((cur_y, sorted(cur_row, key=lambda c: c[0])))
                cur_row = [(x, t)]
                cur_y = y
        if cur_row: rows.append((cur_y, sorted(cur_row, key=lambda c: c[0])))
        
        # Parse rows in order
        results = {'revenue': [], 'results': [], 'assets': [], 'liabilities': []}
        section = None
        assets_liabilities_mode = False
        
        for y, row_cells in rows:
            # Left (< 250) = label; Right (>= 250) = data cells
            label_text = ' '.join(t for x, t in row_cells if x < 200).strip()
            data_cells = [(x, t) for x, t in row_cells if x >= 200]
            
            l = label_text.lower().strip(':,. ')
            
            # Section detection
            if 'segment revenue - gross' in l or re.match(r'^1\.?\s*segment revenue', l):
                section = 'revenue'
                assets_liabilities_mode = False
                continue
            elif re.match(r'^(2\.?\s*)?segment results', l):
                section = 'results'
                assets_liabilities_mode = False
                continue
            elif re.match(r'^(3\.?\s*)?other information', l) or l == '3.' or l == '3':
                section = 'assets_liabilities'
                assets_liabilities_mode = True
                continue
            elif 'segment assets' in l or 'segment liabilities' in l or 'gross revenue from' in l:
                continue
            
            if not section or not label_text:
                continue
            
            # Match label
            matched = match_label(label_text)
            if matched is None:
                continue
            
            # Count all data cells (valid numbers + dashes) to determine column alignment
            # Each row has: Ext_cur, [Inter_cur,] Total_cur, Ext_pri, [Inter_pri,] Total_pri
            # or for assets/liabilities: Asset_cur, Liab_cur, Asset_pri, Liab_pri
            
            vals = [(x, parse_num(t), t) for x, t in data_cells]
            nums = [v[1] for v in vals if v[1] is not None]
            all_vals = [v[1] for v in vals]  # includes None for dashes
            cell_count = len(vals)
            
            if not nums:
                continue
            
            if section == 'revenue':
                # Determine column count by counting actual cells
                # If 6 cells: Ext_cur, Inter_cur, Total_cur, Ext_pri, Inter_pri, Total_pri
                # If 4 cells (no inter): Ext_cur, Total_cur, Ext_pri, Total_pri
                # If 2 cells: Ext_cur, Ext_pri
                if cell_count >= 6:
                    cur_val = nums[0]  # External current
                    pri_val = nums[3] if len(nums) >= 4 else None  # External prior
                elif cell_count >= 4:
                    cur_val = nums[0]  # External current  
                    pri_val = nums[2] if len(nums) >= 3 else None  # External prior
                else:
                    cur_val = nums[0]
                    pri_val = nums[1] if len(nums) >= 2 else None
                results['revenue'].append((matched, cur_val, pri_val))
                
            elif section == 'results':
                # Results: cur_val, pri_val (single value per column)
                cur_val = nums[0] if len(nums) >= 1 else None
                pri_val = nums[1] if len(nums) >= 2 else None
                results['results'].append((matched, cur_val, pri_val))
                
            elif section == 'assets_liabilities':
                # 4 columns: Asset_cur, Liab_cur, Asset_pri, Liab_pri
                if len(nums) >= 4:
                    results['assets'].append((matched, nums[0], nums[2]))
                    results['liabilities'].append((matched, nums[1], nums[3]))
                elif len(nums) >= 2:
                    results['assets'].append((matched, nums[0], None))
                    results['liabilities'].append((matched, nums[1], None))
        
        return results, i + 1
    
    return None, None

def main():
    all_series = {}
    source_pages = {}
    warnings = []
    
    for year in range(2016, 2026):
        path = os.path.join(PDF_DIR, f'ITC_AR_{year}.pdf')
        if not os.path.exists(path):
            continue
        
        print(f'FY{year}...', end=' ', flush=True)
        doc = fitz.open(path)
        try:
            result, pg = extract_segment_data(doc)
            if result is None:
                print('no segment note', flush=True)
                continue
            
            source_pages[f'FY{year}'] = pg
            counts = {s: len(result[s]) for s in result}
            print(f'p{pg} {counts}', flush=True)
            
            for sec in ['revenue', 'results', 'assets', 'liabilities']:
                for label, cur_val, pri_val in result[sec]:
                    key = f'{sec}|{label}'
                    all_series.setdefault(key, {})
                    if cur_val is not None:
                        all_series[key][f'FY{year}'] = cur_val
                    if pri_val is not None:
                        all_series[key][f'FY{year-1}'] = pri_val
        finally:
            doc.close()
    
    all_series = {k: dict(sorted(v.items(), key=lambda x: int(x[0][2:])))
                  for k, v in sorted(all_series.items())}
    
    output = {
        'symbol': 'ITC', 'basis': 'standalone',
        'source': 'ITC Annual Reports, Note 30 - Segment Reporting (Standalone)',
        'sourcePagesByYear': source_pages, 'warnings': warnings,
        'segment_time_series': all_series,
    }
    
    with open(OUTPUT, 'w') as f:
        json.dump(output, f, indent=2)
    print(f'\nSaved: {OUTPUT}')

if __name__ == '__main__':
    main()
