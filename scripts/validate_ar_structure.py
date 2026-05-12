#!/usr/bin/env python3
"""Validate BS and P&L page contents for ITC AR 2025."""
import fitz, re

doc = fitz.open('C:/Users/rajesh/WindsurfAPI/ITC-valuation-template/public/data/annual_reports/ITC_AR_2025.pdf')

# Balance Sheet (Page 156)
page = doc[155]
text = page.get_text()
print('=== BALANCE SHEET (Page 156) ===')
lines = [l.strip() for l in text.split('\n') if l.strip()]
for l in lines[:25]:
    print(f'  {l[:120]}')

print()

# P&L (Page 157)
page = doc[156]
text = page.get_text()
print('=== PROFIT & LOSS (Page 157) ===')
lines = [l.strip() for l in text.split('\n') if l.strip()]
for l in lines[:25]:
    print(f'  {l[:120]}')

# Cash Flow (Page 158)
page = doc[157]
text = page.get_text()
print()
print('=== CASH FLOW (Page 158) ===')
lines = [l.strip() for l in text.split('\n') if l.strip()]
for l in lines[:20]:
    print(f'  {l[:120]}')

# Notes 1-28 (Pages 160-200)
print()
print('=== NOTES 1-28 ===')
for i in range(159, 201):
    text = doc[i].get_text()
    m = re.match(r'^\s*(\d+)\.\s+(.*)', text)
    if m:
        num = int(m.group(1))
        if 1 <= num <= 28:
            title = m.group(2).strip()[:60]
            print(f'  Page {i+1}: Note {num} - {title}')

doc.close()
