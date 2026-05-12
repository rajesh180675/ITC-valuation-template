#!/usr/bin/env python3
"""Verify Note 30 segment data from all ITC annual reports."""
import fitz, json

REF = {
    'FY2025': {'FMCG - Cigarettes': 35893.57, 'FMCG - Others': 22005.27, 'Agri Business': 12244.00, 'Paperboards, Paper and Packaging': 6575.88},
}

for year in range(2016, 2026):
    path = f'C:/Users/rajesh/WindsurfAPI/ITC-valuation-template/public/data/annual_reports/ITC_AR_{year}.pdf'
    doc = fitz.open(path)
    
    for i in range(len(doc)-1, 0, -1):
        text = doc[i].get_text().lower()
        if 'segment reporting' in text and ('note 30' in text or 'note 31' in text or 'note 29' in text):
            if 'segment revenue' in text and 'cigarette' in text:
                blocks = doc[i].get_text('dict')['blocks']
                cells = []
                for block in blocks:
                    if 'lines' in block:
                        for line in block['lines']:
                            spans = line['spans']
                            t = ''.join(s['text'] for s in spans).strip()
                            x = spans[0]['bbox'][0]
                            y = line['bbox'][1]
                            cells.append((x, y, t))
                cells.sort(key=lambda l: (l[1], l[0]))
                
                # Group by y
                rows = {}
                for x, y, t in cells:
                    if y not in rows:
                        rows[y] = []
                    rows[y].append((x, t))
                for y in rows:
                    rows[y].sort(key=lambda c: c[0])
                
                # Find row with Cigarettes
                cig_row_y = None
                for y, items in rows.items():
                    label = ' '.join(t for x, t in items if x < 250)
                    if 'cigarette' in label.lower():
                        cig_row_y = y
                        break
                
                if cig_row_y:
                    cig_vals = [(x, t) for x, t in rows[cig_row_y] if x >= 250]
                    print(f'FY{year} (page {i+1}): Cigarettes cells: {cig_vals}')
                    
                    # Also get segment revenue header row for column IDs
                    for y, items in rows.items():
                        label = ' '.join(t for x, t in items)
                        if 'segment revenue' in label.lower() and 'gross' in label.lower():
                            headers = [(x, t) for x, t in items if x >= 250]
                            print(f'  Column headers: {headers}')
                            break
                break
    doc.close()
