#!/usr/bin/env python3
"""Investigate screener.in single-column format — look for embedded data."""
import requests, re, json
from bs4 import BeautifulSoup

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

ticker = 'SBILIFE'
r = requests.get(f'https://www.screener.in/company/{ticker}/consolidated/', headers=HEADERS, timeout=30)

# Search for embedded JSON/JS data containers
for script in re.findall(r'<script[^>]*>([\s\S]*?)</script>', r.text):
    s = script.strip()
    # Look for data objects that might contain financial data
    markers = ['companyData', 'initialData', 'financialData', '__INITIAL', 'window.__', 'dataLayer',
               'Company.', 'getInfo', 'companyId']
    for m in markers:
        if m in s:
            lines = [l.strip() for l in s.split('\n') if m in l]
            for l in lines[:3]:
                print(f'[{m}] {l[:200]}')
            break

# Check for data attributes in the single-column tables
soup = BeautifulSoup(r.text, 'lxml')
for stmt_name, pattern in [('P&L', r'Profit\s*[&]\s*Loss'), ('BS', r'Balance\s*Sheet'), ('CF', r'Cash\s*Flows?')]:
    h2 = soup.find('h2', string=re.compile(pattern, re.I))
    if not h2: continue
    tbl = h2.find_next('table', class_=re.compile(r'data-table'))
    if not tbl: continue
    for tr in tbl.find_all('tr'):
        tds = tr.find_all('td')
        if len(tds) >= 1:
            # Check all attrs for data-* or value-like patterns
            for td in tds:
                for k, v in td.attrs.items():
                    if k.startswith('data-') or 'value' in k.lower():
                        print(f'{stmt_name}: [{k}]="{v}"')

# Also check span or hidden elements inside cells
print('\n--- Checking for hidden data in P&L table cells ---')
if soup.find('h2', string=re.compile(r'Profit\s*[&]\s*Loss', re.I)):
    h2 = soup.find('h2', string=re.compile(r'Profit\s*[&]\s*Loss', re.I))
    tbl = h2.find_next('table', class_=re.compile(r'data-table'))
    if tbl:
        tr = tbl.find('tr')  # First row = Sales
        td = tr.find('td')
        # Get full inner HTML
        print(f'Full cell HTML: {str(td)[:500]}')

# Find the getInfo() data embedded in the page
for match in re.finditer(r'getInfo[\s\S]{0,500}', r.text):
    snippet = match.group()
    if 'companyId' in snippet:
        print(f'\n--- getInfo data ---')
        print(snippet[:500])
        break
