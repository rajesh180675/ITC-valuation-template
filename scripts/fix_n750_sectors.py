#!/usr/bin/env python3
"""Fix sectors for smallcap250 and microcap250 using full NSE industry mapping."""
import json

with open('scripts/data_collector/nse_sector_map.json') as f:
    nse_map = json.load(f)

# Full industry-to-sector mapping covering 88+ NSE industry categories
IMAP = {
    # BFSI
    'Private Sector Bank': 'Banks', 'Public Sector Bank': 'Banks', 'Other Bank': 'Banks',
    'Non Banking Financial Company (NBFC)': 'NBFC', 'Housing Finance Company': 'NBFC',
    'Financial Institution': 'NBFC', 'Other Financial Services': 'NBFC', 'Investment Company': 'NBFC',
    'Asset Management Company': 'NBFC', 'Financial Technology (Fintech)': 'NBFC', 'Stockbroking & Allied': 'NBFC',
    'Financial Products Distributor': 'NBFC', 'Insurance': 'Insurance', 'Life Insurance': 'Insurance',
    'General Insurance': 'Insurance', 'Reinsurance': 'Insurance',
    # IT
    'Computers - Software & Consulting': 'Information Technology', 'Software Products': 'Information Technology',
    'IT Enabled Services': 'Information Technology',
    # Healthcare
    'Pharmaceuticals': 'Pharmaceuticals', 'Hospital': 'Healthcare', 'Biotechnology': 'Healthcare',
    'Healthcare Equipment & Supplies': 'Healthcare',
    # Auto
    'Passenger Cars & Utility Vehicles': 'Automobiles', 'Commercial Vehicles': 'Automobiles',
    '2/3 Wheelers': 'Automobiles', 'Tractors': 'Automobiles',
    'Auto Components & Equipments': 'Auto Components', 'Tyres & Rubber Products': 'Auto Components',
    'Auto Ancillaries': 'Auto Components',
    # Consumer
    'Diversified FMCG': 'Consumer Staples', 'Personal Care': 'Consumer Staples',
    'Packaged Foods': 'Consumer Staples', 'Tea & Coffee': 'Consumer Staples',
    'Other Beverages': 'Consumer Staples', 'Edible Oil': 'Consumer Staples',
    'Breweries & Distilleries': 'Consumer Discretionary',
    'Cigarettes & Tobacco Products': 'Consumer Staples', 'Sugar': 'Consumer Staples',
    'Household Appliances': 'Consumer Durables', 'Consumer Electronics': 'Consumer Durables',
    'Garments & Apparels': 'Consumer Durables', 'Footwear': 'Consumer Durables',
    'Gems Jewellery And Watches': 'Consumer Durables', 'Diversified Retail': 'Consumer Discretionary',
    'Speciality Retail': 'Consumer Discretionary',    'E-Retail/ E-Commerce': 'Consumer Discretionary',
    'Internet & Catalogue Retail': 'Consumer Discretionary', 'Restaurants': 'Consumer Discretionary',
    'Hotels & Resorts': 'Consumer Discretionary',
    # Energy
    'Refineries & Marketing': 'Energy', 'Oil Exploration & Production': 'Energy',
    'LPG/CNG/PNG/LNG Supplier': 'Energy', 'Coal': 'Energy',
    'Gas Transmission/Marketing': 'Energy', 'Trading - Gas': 'Energy',
    'Oil Storage & Transportation': 'Energy',
    # Utilities
    'Power Generation': 'Utilities', 'Power Distribution': 'Utilities',
    'Power - Transmission': 'Utilities', 'Integrated Power Utilities': 'Utilities',
    # Materials & Industry
    'Cement & Cement Products': 'Cement', 'Iron & Steel': 'Metals',
    'Iron & Steel Products': 'Metals', 'Aluminium': 'Metals', 'Diversified Metals': 'Metals',
    'Zinc': 'Metals', 'Industrial Minerals': 'Materials',
    'Specialty Chemicals': 'Chemicals', 'Pesticides & Agrochemicals': 'Chemicals',
    'Fertilizers': 'Chemicals', 'Paints': 'Chemicals', 'Plastic Products - Industrial': 'Materials',
    'Explosives': 'Chemicals', 'Industrial Gases': 'Chemicals',
    # Capital Goods
    'Heavy Electrical Equipment': 'Capital Goods', 'Cables - Electricals': 'Capital Goods',
    'Other Electrical Equipment': 'Capital Goods', 'Compressors Pumps & Diesel Engines': 'Capital Goods',
    'Industrial Products': 'Capital Goods', 'Castings & Forgings': 'Capital Goods',
    'Electrical Equipment': 'Capital Goods',
    # Industrials
    'Civil Construction': 'Industrials', 'Residential Commercial Projects': 'Real Estate',
    'Logistics Solution Provider': 'Logistics', 'Port & Port services': 'Logistics',
    'Airport & Airport services': 'Logistics', 'Airline': 'Industrials',
    'Tour Travel Related Services': 'Industrials', 'Ship Building & Allied Services': 'Aerospace & Defense',
    'Aerospace & Defense': 'Aerospace & Defense', 'Diversified': 'Industrials',
    'Holding Company': 'Industrials',
    # Telecom
    'Telecom - Cellular & Fixed line services': 'Telecom', 'Telecom - Infrastructure': 'Telecom',
    # Media
    'Exchange and Data Platform': 'Media', 'Media & Entertainment': 'Media',
    'Print Media': 'Media', 'Broadcasting': 'Media',
    # Other / catch-all
    'Other Textile Products': 'Textiles', 'Trading - Minerals': 'Materials',
    'Textiles & Apparels': 'Textiles',
    # Additional missing industries
    'Abrasives & Bearings': 'Industrials',
    'Animal Feed': 'Consumer Staples',
    'Business Process Outsourcing (BPO)/ Knowledge Process Outsourcing (KPO)': 'Information Technology',
    'Carbon Black': 'Chemicals',
    'Ceramics': 'Materials',
    'Commodity Chemicals': 'Chemicals',
    'Dairy Products': 'Consumer Staples',
    'Digital Entertainment': 'Media',
    'Diversified Commercial Services': 'Industrials',
    'Dyes And Pigments': 'Chemicals',
    'E-Learning': 'Information Technology',
    'Electrodes & Refractories': 'Materials',
    'Ferro & Silica Manganese': 'Metals',
    'Film Production Distribution & Exhibition': 'Media',
    'Furniture Home Furnishing': 'Consumer Durables',
    'Glass - Industrial': 'Materials',
    'Healthcare Research Analytics & Technology': 'Healthcare',
    'Healthcare Service Provider': 'Healthcare',
    'Household Products': 'Consumer Staples',
    'Houseware': 'Consumer Durables',
    'Lubricants': 'Energy',
    'Medical Equipment & Supplies': 'Healthcare',
    'Microfinance Institutions': 'NBFC',
    'Other Agricultural Products': 'Agriculture',
    'Other Food Products': 'Consumer Staples',
    'Other Industrial Products': 'Industrials',
    'Other Telecom Services': 'Telecom',
    'Packaging': 'Materials',
    'Paper & Paper Products': 'Materials',
    'Petrochemicals': 'Chemicals',
    'Pharmacy Retail': 'Healthcare',
    'Plastic Products - Consumer': 'Consumer Durables',
    'Plywood Boards/ Laminates': 'Materials',
    'Power Trading': 'Utilities',
    'Railway Wagons': 'Industrials',
    'Sanitary Ware': 'Materials',
    'Stationary': 'Consumer Staples',
    'TV Broadcasting & Software Production': 'Media',
    'Telecom - Equipment & Accessories': 'Telecom',
    'Trading & Distributors': 'Industrials',
    'Trading - Metals': 'Materials',
    'Transport Related Services': 'Logistics',
    'Water Supply & Management': 'Utilities',
    'Wellness': 'Healthcare',
}

FIN = {'Private Sector Bank','Public Sector Bank','Other Bank',
    'Non Banking Financial Company (NBFC)','Housing Finance Company',
    'Financial Institution','Other Financial Services','Investment Company',
    'Asset Management Company','Financial Technology (Fintech)','Stockbroking & Allied',
    'Financial Products Distributor',
    'Life Insurance','General Insurance','Reinsurance','Insurance'}

for slug in ['smallcap250','microcap250']:
    with open(f'scripts/nifty750/{slug}/constituents.json') as f:
        d = json.load(f)
    for c in d['constituents']:
        ind = nse_map.get(c['symbol'],'')
        sec = IMAP.get(ind,'Unknown')
        c['sector'] = sec
        c['industry'] = ind
        c['reportingType'] = 'financial' if ind in FIN else 'nonFinancial'
    unk = sum(1 for c in d['constituents'] if c['sector']=='Unknown')
    with open(f'scripts/nifty750/{slug}/constituents.json','w',encoding='utf-8') as f:
        json.dump(d,f,indent=2)
    print(f'{slug}: {len(d["constituents"])} cos, {unk} Unknown, {len(d["constituents"])-unk} mapped')
    
    with open(f'scripts/nifty750/{slug}/market_data.json') as f:
        m = json.load(f)
    for r in m['rows']:
        ind = nse_map.get(r['symbol'],'')
        r['reportingType'] = 'financial' if ind in FIN else 'nonFinancial'
    with open(f'scripts/nifty750/{slug}/market_data.json','w',encoding='utf-8') as f:
        json.dump(m,f,indent=2)
print('Done')
