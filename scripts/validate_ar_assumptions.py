#!/usr/bin/env python3
"""Validate consolidated statements location and BS structure."""
import fitz, re

doc = fitz.open('C:/Users/rajesh/WindsurfAPI/ITC-valuation-template/public/data/annual_reports/ITC_AR_2025.pdf')

# Find consolidated statements
for i in range(len(doc)):
    text = doc[i].get_text()
    tl = text.lower()
    if 'consolidated' in tl:
        if 'balance sheet' in tl:
            print(f'Page {i+1}: Consolidated Balance Sheet')
        elif 'profit' in tl and 'loss' in tl:
            print(f'Page {i+1}: Consolidated P&L')
        elif 'cash flow' in tl:
            print(f'Page {i+1}: Consolidated Cash Flow')
        elif 'changes in equity' in tl:
            print(f'Page {i+1}: Consolidated Changes in Equity')

# Show standalone BS equity side (also on page 156)
# Check if there are more BS pages
page = doc[155]
text = page.get_text()
print('\n=== STANDALONE BS LINES ===')
lines = [l.strip() for l in text.split('\n') if l.strip()]
for i, l in enumerate(lines):
    if any(kw in l.lower() for kw in ['equity', 'liability', 'total', 'share capital', 'reserve']):
        print(f'  Line {i}: {l[:100]}')

doc.close()
