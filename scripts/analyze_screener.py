#!/usr/bin/env python3
"""Analyze screener.in page structure for P&L, BS, CF tables."""
from bs4 import BeautifulSoup
import re, json

with open(r'C:\Users\rajesh\AppData\Local\Temp\screener.html', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'lxml')

for section_name in ['Profit & Loss', 'Balance Sheet', 'Cash Flows']:
    h2 = soup.find('h2', string=re.compile(section_name, re.I))
    if not h2:
        print(f'\n=== {section_name}: NOT FOUND ===')
        continue
    
    table = h2.find_next('table', class_='data-table')
    if not table:
        print(f'\n=== {section_name}: NO TABLE ===')
        continue
    
    headers = [th.get_text(strip=True) for th in table.find_all('th')]
    rows = []
    for tr in table.find_all('tr'):
        cells = [td.get_text(strip=True) for td in tr.find_all('td')]
        if cells:
            rows.append(cells)
    
    print(f'\n=== {section_name} ({len(rows)} rows) ===')
    print(f'Headers: {headers}')
    print(f'First row: {rows[0] if rows else "empty"}')
    for i, r in enumerate(rows[:8]):
        print(f'  {i}: {r}')
    if len(rows) > 8:
        print(f'  ... ({len(rows) - 8} more rows)')
