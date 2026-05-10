#!/usr/bin/env python3
"""
Fix sector classifications in Nifty250 and Nifty750 data using NSE industry mapping.
Also fixes reportingType (BFSI vs nonFinancial).

Usage:
  python scripts/fix_sectors.py
"""

import json, os, sys
from collections import Counter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)  # go up from scripts/

# NSE Industry -> Dashboard Sector mapping
INDUSTRY_SECTOR_MAP = {
    # BFSI
    'Private Sector Bank': 'Banks',
    'Public Sector Bank': 'Banks',
    'Other Bank': 'Banks',
    'Non Banking Financial Company (NBFC)': 'NBFC',
    'Housing Finance Company': 'NBFC',
    'Financial Institution': 'NBFC',
    'Other Financial Services': 'NBFC',
    'Investment Company': 'NBFC',
    'Asset Management Company': 'NBFC',
    'Financial Technology (Fintech)': 'NBFC',
    'Stockbroking & Allied': 'NBFC',
    'Life Insurance': 'Insurance',
    'General Insurance': 'Insurance',
    
    # IT
    'Computers - Software & Consulting': 'Information Technology',
    'Software Products': 'Information Technology',
    'IT Enabled Services': 'Information Technology',
    
    # Healthcare
    'Pharmaceuticals': 'Pharmaceuticals',
    'Hospital': 'Healthcare',
    'Biotechnology': 'Healthcare',
    
    # Auto
    'Passenger Cars & Utility Vehicles': 'Automobiles',
    'Commercial Vehicles': 'Automobiles',
    '2/3 Wheelers': 'Automobiles',
    'Auto Components & Equipments': 'Auto Components',
    'Tyres & Rubber Products': 'Auto Components',
    'Tractors': 'Automobiles',
    
    # Consumer
    'Diversified FMCG': 'Consumer Staples',
    'Personal Care': 'Consumer Staples',
    'Packaged Foods': 'Consumer Staples',
    'Tea & Coffee': 'Consumer Staples',
    'Other Beverages': 'Consumer Staples',
    'Breweries & Distilleries': 'Consumer Discretionary',
    'Cigarettes & Tobacco Products': 'Consumer Staples',
    'Household Appliances': 'Consumer Durables',
    'Consumer Electronics': 'Consumer Durables',
    'Garments & Apparels': 'Consumer Durables',
    'Gems Jewellery And Watches': 'Consumer Durables',
    'Diversified Retail': 'Consumer Discretionary',
    'Speciality Retail': 'Consumer Discretionary',
    'E-Retail/ E-Commerce': 'Consumer Discretionary',
    'Internet & Catalogue Retail': 'Consumer Discretionary',
    'Restaurants': 'Consumer Discretionary',
    
    # Energy
    'Refineries & Marketing': 'Energy',
    'Oil Exploration & Production': 'Energy',
    'LPG/CNG/PNG/LNG Supplier': 'Energy',
    'Coal': 'Energy',
    'Gas Transmission/Marketing': 'Energy',
    
    # Utilities
    'Power Generation': 'Utilities',
    'Power Distribution': 'Utilities',
    'Power - Transmission': 'Utilities',
    'Integrated Power Utilities': 'Utilities',
    
    # Materials
    'Cement & Cement Products': 'Cement',
    'Iron & Steel': 'Metals',
    'Iron & Steel Products': 'Metals',
    'Aluminium': 'Metals',
    'Diversified Metals': 'Metals',
    'Zinc': 'Metals',
    'Industrial Minerals': 'Materials',
    'Specialty Chemicals': 'Chemicals',
    'Pesticides & Agrochemicals': 'Chemicals',
    'Fertilizers': 'Chemicals',
    'Paints': 'Chemicals',
    'Plastic Products - Industrial': 'Materials',
    'Explosives': 'Chemicals',
    'Industrial Gases': 'Chemicals',
    
    # Capital Goods
    'Heavy Electrical Equipment': 'Capital Goods',
    'Cables - Electricals': 'Capital Goods',
    'Other Electrical Equipment': 'Capital Goods',
    'Compressors Pumps & Diesel Engines': 'Capital Goods',
    'Industrial Products': 'Capital Goods',
    'Castings & Forgings': 'Capital Goods',
    
    # Industrials
    'Civil Construction': 'Industrials',
    'Residential Commercial Projects': 'Real Estate',
    'Logistics Solution Provider': 'Logistics',
    'Port & Port services': 'Logistics',
    'Airport & Airport services': 'Logistics',
    'Airline': 'Industrials',
    'Tour Travel Related Services': 'Industrials',
    'Ship Building & Allied Services': 'Aerospace & Defense',
    'Aerospace & Defense': 'Aerospace & Defense',
    
    # Telecom
    'Telecom - Cellular & Fixed line services': 'Telecom',
    'Telecom - Infrastructure': 'Telecom',
    
    # Media
    'Exchange and Data Platform': 'Media',
    
    # Other
    'Diversified': 'Industrials',
    'Holding Company': 'Industrials',
    'Edible Oil': 'Consumer Staples',
    'Hotels & Resorts': 'Consumer Discretionary',
    'Other Textile Products': 'Textiles',
    'Trading - Minerals': 'Materials',
    'Castings & Forgings': 'Capital Goods',
}

FINANCIAL_INDUSTRIES = {
    'Private Sector Bank', 'Public Sector Bank', 'Other Bank',
    'Non Banking Financial Company (NBFC)', 'Housing Finance Company',
    'Financial Institution', 'Other Financial Services',
    'Life Insurance', 'General Insurance',
    'Asset Management Company',
    'Stockbroking & Allied',
    'Financial Technology (Fintech)',
}

def is_financial(industry):
    return industry in FINANCIAL_INDUSTRIES

def fix_dataset(const_path, fin_path, bs_path, cf_path, ratio_path, mkt_path, output_base=None):
    """Fix sector & reportingType in all source-pack files for one index."""
    
    # Load NSE sector map
    with open(os.path.join(ROOT_DIR, 'scripts', 'data_collector', 'nse_sector_map.json')) as f:
        nse_map = json.load(f)
    
    # Fix constituents
    changed = 0
    with open(const_path) as f:
        const = json.load(f)
    
    unknown_before = sum(1 for c in const['constituents'] if c['sector'] == 'Unknown')
    
    for c in const['constituents']:
        industry = nse_map.get(c['symbol'], '')
        sector = INDUSTRY_SECTOR_MAP.get(industry, 'Unknown')
        if sector != 'Unknown':
            c['sector'] = sector
            c['industry'] = industry
            c['reportingType'] = 'financial' if is_financial(industry) else 'nonFinancial'
            changed += 1
    
    unknown_after = sum(1 for c in const['constituents'] if c['sector'] == 'Unknown')
    print(f'  Unknown sectors: {unknown_before} -> {unknown_after}')
    
    with open(const_path, 'w', encoding='utf-8') as f:
        json.dump(const, f, indent=2)
    print(f'  ✓ Fixed {changed} company sectors in {os.path.basename(const_path)}')
    
    # Also fix market_data.json reportingType
    with open(mkt_path) as f:
        mkt = json.load(f)
    for row in mkt['rows']:
        industry = nse_map.get(row['symbol'], '')
        row['reportingType'] = 'financial' if is_financial(industry) else 'nonFinancial'
    with open(mkt_path, 'w', encoding='utf-8') as f:
        json.dump(mkt, f, indent=2)
    print(f'  ✓ Fixed reportingType in {os.path.basename(mkt_path)}')
    
    return unknown_after

def main():
    print('=' * 60)
    print('Fixing sector classifications...')
    print('=' * 60)
    
    total_unknown = 0
    
    # Nifty250
    print('\n--- Nifty250 ---')
    base = os.path.join(ROOT_DIR, 'scripts', 'nifty250', 'source-pack')
    u = fix_dataset(
        os.path.join(base, 'constituents.json'),
        os.path.join(base, 'financials.json'),
        os.path.join(base, 'balance_sheets.json'),
        os.path.join(base, 'cashflows.json'),
        os.path.join(base, 'company_ratios.json'),
        os.path.join(base, 'market_data.json'),
    )
    total_unknown += u
    
    # Nifty750 - largemidcap250
    print('\n--- Nifty750 LargeMidcap250 ---')
    for slug in ['largemidcap250']:
        base = os.path.join(ROOT_DIR, 'scripts', 'nifty750', slug)
        # Check if files exist at base level (new format)
        if os.path.exists(os.path.join(base, 'constituents.json')):
            u = fix_dataset(
                os.path.join(base, 'constituents.json'),
                os.path.join(base, 'financials.json'),
                os.path.join(base, 'balance_sheets.json'),
                os.path.join(base, 'cashflows.json'),
                os.path.join(base, 'company_ratios.json'),
                os.path.join(base, 'market_data.json'),
            )
            total_unknown += u
    
    print(f'\nTotal remaining Unknown: {total_unknown}')
    print('Done!')
    print('\nNow run: node scripts/build_nifty250_feed.mjs')
    print('And:    node scripts/build_nifty750_feed.mjs')

if __name__ == '__main__':
    main()
