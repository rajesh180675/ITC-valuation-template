#!/usr/bin/env python3
"""
yfinance-based Financial Data Collector — for Indian stocks (NSE/BSE).
Produces the same AR JSON format as the screener.in scraper, but uses
Yahoo Finance's fundamental data API (free, no API key).

Usage:
  python scripts/yfinance_collector.py --ticker SBILIFE     # Single
  python scripts/yfinance_collector.py --batch all           # All 749
  python scripts/yfinance_collector.py --batch missing       # Only 53 missing
  python scripts/yfinance_collector.py --batch existing      # Refresh existing 696
"""
import sys, os, json, time
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "ar")
os.makedirs(OUTPUT_DIR, exist_ok=True)

import yfinance as yf

RATE_LIMIT_DELAY = 1.0  # yfinance is generous, but be polite

# ── Label mapping: yfinance GAAP labels → our KPI keys ──────────────────────
# yfinance returns DataFrames with specific row labels.
# These are the standardized labels we want to extract.
LABEL_MAP = {
    # P&L (income_stmt)
    'Total Revenue': 'revenueCr',
    'Revenue From Contract With Customer Excluding Assessed Tax': 'revenueCr',
    'Operating Revenue': 'revenueCr',
    'Gross Profit': 'grossProfitCr',
    'Operating Income': 'operatingProfitCr',
    'Operating Expense': 'totalExpensesCr',
    'Total Operating Expenses': 'totalExpensesCr',
    'Interest Expense': 'financeCostCr',
    'Interest Expense Non Operating': 'financeCostCr',
    'Depreciation And Amortization': 'depreciationCr',
    'Depreciation Income Statement': 'depreciationCr',
    'Reconciled Depreciation': 'depreciationCr',
    'Net Income From Continuing Operation Net Minority Interest': 'patCr',
    'Net Income': 'patCr',
    'Net Income Common Stockholders': 'patCr',
    'Pretax Income': 'pbtCr',
    'Income Before Tax': 'pbtCr',
    'Tax Provision': 'taxCr',
    'Normalized EBITDA': 'ebitdaCr',
    'EBITDA': 'ebitdaCr',
    'EBIT': 'ebitCr',
    'Other Income Expense': 'otherIncomeCr',
    'Total Other Income Expense Net': 'otherIncomeCr',
    'Diluted Average Shares': 'sharesOutstanding',
    'Diluted EPS': 'epsRs',
    'Basic EPS': 'epsRs',
    'Diluted EPS TTM': 'epsRs',
    'Dividend Per Share': 'dividendPerShare',
    'Interest Income Non Operating': 'interestIncomeCr',
    'Net Interest Income': 'interestIncomeCr',
    'Total Premiums Earned': 'revenueCr',        # Insurance
    'Premium Income': 'revenueCr',               # Insurance
    'Fee Income': 'revenueCr',                   # Insurance
    'Net Premium Written': 'revenueCr',          # Insurance
    'Commission Income': 'revenueCr',            # Insurance
    'Benefits Losses And Adjustments': 'totalExpensesCr',  # Insurance
    'Claims And Benefits': 'totalExpensesCr',    # Insurance
    'Commission Expenses': 'totalExpensesCr',    # Insurance
    
    # Balance Sheet
    'Total Assets': 'totalAssetsCr',
    'Total Non Current Assets': 'nonCurrentAssetsCr',
    'Total Current Assets': 'currentAssetsCr',
    'Total Liabilities Net Minority Interest': 'totalLiabilitiesCr',
    'Total Non Current Liabilities Net Minority Interest': 'nonCurrentLiabilitiesCr',
    'Total Current Liabilities': 'currentLiabilitiesCr',
    'Stockholders Equity': 'equityCr',
    'Common Stock Equity': 'equityCr',
    'Total Equity Gross Minority Interest': 'equityCr',
    'Total Debt': 'totalDebtCr',
    'Net Debt': 'netDebtCr',
    'Current Debt': 'currentDebtCr',
    'Current Capital Lease Obligation': 'currentLeaseCr',
    'Long Term Debt': 'longTermDebtCr',
    'Long Term Capital Lease Obligation': 'longTermLeaseCr',
    'Cash And Cash Equivalents': 'cashAndEquivalentsCr',
    'Cash Cash Equivalents And Short Term Investments': 'cashAndEquivalentsCr',
    'Invested Capital': 'investedCapitalCr',
    'Working Capital': 'workingCapitalCr',
    'Goodwill': 'goodwillCr',
    'Current Investments': 'currentInvestmentsCr',
    'Other Short Term Investments': 'shortTermInvestmentsCr',
    'Property Plant Equipment Gross': 'fixedAssetsCr',
    'Net PPE': 'fixedAssetsCr',
    'Accumulated Depreciation': 'accumDepreciationCr',
    'Retained Earnings': 'retainedEarningsCr',
    'Total Capitalization': 'totalCapitalizationCr',
    'Capital Stock': 'equityCapitalCr',
    'Common Stock': 'equityCapitalCr',
    'Ordinary Shares Number': 'sharesOutstanding',
    
    # Cash Flow
    'Operating Cash Flow': 'cfoCr',
    'Cash From Operating Activities': 'cfoCr',
    'Cash Flow From Operating Activities': 'cfoCr',
    'Free Cash Flow': 'fcfCr',
    'Capital Expenditure': 'capexCr',
    'Investing Cash Flow': 'cfiCr',
    'Cash From Investing Activities': 'cfiCr',
    'Cash Flow From Investing Activities': 'cfiCr',
    'Financing Cash Flow': 'cffCr',
    'Cash From Financing Activities': 'cffCr',
    'Cash Flow From Financing Activities': 'cffCr',
    'Dividends Paid': 'dividendCr',
    'Stock Repurchase': 'stockBuybackCr',
    'Change To Operating Activities': 'changeInWorkingCapitalCr',
    'Change In Working Capital': 'changeInWorkingCapitalCr',
    'Change In Other Working Capital': 'changeInWorkingCapitalCr',
    'Repayment Of Debt': 'debtRepaymentCr',
    'Issuance Of Debt': 'debtIssuanceCr',
    'End Cash Position': 'closingCashCr',
    'Beginning Cash Position': 'openingCashCr',
    'Changes In Cash': 'netChangeCr',
    'Net Change In Cash': 'netChangeCr',
    'Effect Of Exchange Rate Changes': 'forexEffectCr',
    'Other Investing Activities': 'otherInvestingCr',
    'Other Financing Activities': 'otherFinancingCr',
}

REVERSE_MAP = {}
for k, v in LABEL_MAP.items():
    REVERSE_MAP[v] = k  # We'll use the first found label

def parse_num(val):
    """Convert yfinance value to float in crores. yfinance returns raw INR."""
    if val is None:
        return None
    try:
        v = float(val)
        if v != v:  # NaN check (NaN != NaN in IEEE 754)
            return None
        # yfinance returns raw rupees. Convert to crores (1 Cr = 10,000,000)
        return round(v / 10_000_000, 2)
    except (ValueError, TypeError):
        return None

def extract_yfinance_data(ticker_symbol):
    """Extract P&L, BS, CF from yfinance and convert to our AR format."""
    try:
        t = yf.Ticker(ticker_symbol)
    except Exception as e:
        return None, str(e)[:100]
    
    try:
        income = t.income_stmt
        bs = t.balance_sheet
        cf = t.cash_flow
    except Exception as e:
        return None, str(e)[:100]
    
    if income is None or income.empty:
        return None, 'No income statement data'
    
    # Collect all fiscal years from all statements
    all_dates = set()
    for df in [income, bs, cf]:
        if df is not None and not df.empty:
            for col in df.columns:
                all_dates.add(col)
    
    if not all_dates:
        return None, 'No fiscal year data'
    
    year_data = {}
    for date in sorted(all_dates, reverse=True):
        fy = f'FY{date.year}'
        if date.year > datetime.now().year + 1:
            continue  # Skip future years
        
        # Extract KPIs
        pl_kpis = {}
        bs_kpis = {}
        cf_kpis = {}
        
        for df, stmt_type, kpi_dict in [
            (income, 'income_stmt', pl_kpis),
            (bs, 'balance_sheet', bs_kpis),
            (cf, 'cash_flow', cf_kpis),
        ]:
            if df is None or df.empty or date not in df.columns:
                continue
            col_data = df[date]
            for label in col_data.index:
                # Try exact match first, then substring
                label_str = str(label)
                mapped = LABEL_MAP.get(label_str)
                if mapped is None:
                    # Try suffix matching for ambiguous labels
                    for pattern, kpi_name in LABEL_MAP.items():
                        if pattern in label_str:
                            mapped = kpi_name
                            break
                if mapped:
                    val = parse_num(col_data[label])
                    if val is not None:
                        kpi_dict[mapped] = val
        
        year_data[fy] = {
            'profitLoss': {
                'kpIs': pl_kpis,
                'items': [{'label': k, 'current': v} for k, v in pl_kpis.items()],
            },
            'balanceSheet': {
                'kpIs': bs_kpis,
                'items': [{'label': k, 'current': v} for k, v in bs_kpis.items()],
            },
            'cashFlow': {
                'kpIs': cf_kpis,
                'items': [{'label': k, 'current': v} for k, v in cf_kpis.items()],
            },
        }
    
    # Compute derived KPIs
    for fy in year_data:
        yd = year_data[fy]
        pl = yd['profitLoss']['kpIs']
        cfk = yd['cashFlow']['kpIs']
        
        # FCF = CFO - Capex (if FCF not directly available)
        if cfk.get('fcfCr') is None and cfk.get('cfoCr') is not None and cfk.get('capexCr') is not None:
            cfk['fcfCr'] = round(cfk['cfoCr'] + cfk['capexCr'], 2)  # capex is negative
        
        # Operating Profit = EBITDA - Depreciation (if not directly available)
        if pl.get('operatingProfitCr') is None and pl.get('ebitdaCr') is not None and pl.get('depreciationCr') is not None:
            ebitda = pl['ebitdaCr']
            depr = abs(pl['depreciationCr'])
            pl['operatingProfitCr'] = round(ebitda - depr, 2)
        
        # Total assets as a fallback
        bs = yd['balanceSheet']['kpIs']
        if pl.get('totalExpensesCr') is None and pl.get('revenueCr') is not None and pl.get('operatingProfitCr') is not None:
            pl['totalExpensesCr'] = round(pl['revenueCr'] - pl['operatingProfitCr'], 2)
        
        # Equity from balance sheet
        if pl.get('equityCr') is None and bs.get('equityCr') is not None:
            pl['equityCr'] = bs['equityCr']
        
        # Borrowings from balance sheet
        if pl.get('borrowingsCr') is None and bs.get('totalDebtCr') is not None:
            pl['borrowingsCr'] = bs['totalDebtCr']
    
    # Sort years chronologically
    sorted_fys = sorted(year_data.keys())
    
    return {
        'ticker': ticker_symbol.replace('.NS', ''),
        'years': {fy: year_data[fy] for fy in sorted_fys},
        'metadata': {
            'schemaVersion': 2,
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'source': f'yfinance/{ticker_symbol}',
            'yearsCovered': sorted_fys,
        }
    }, None


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def scrape_ticker(ticker):
    """Scrape a single ticker via yfinance and save to AR JSON."""
    yf_ticker = f'{ticker}.NS'
    log(f'{ticker}: fetching via yfinance...')
    
    data, err = extract_yfinance_data(yf_ticker)
    if err:
        return {'ticker': ticker, 'ok': False, 'error': err}
    
    years = len(data['years'])
    if years == 0:
        return {'ticker': ticker, 'ok': False, 'error': 'No years extracted'}
    
    path = os.path.join(OUTPUT_DIR, f'{ticker}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    fy_range = f'{list(data["years"].keys())[0]}-{list(data["years"].keys())[-1]}'
    return {'ticker': ticker, 'ok': True, 'years': years, 'fy_range': fy_range}


def batch_scrape(tickers, resume=True):
    """Scrape multiple tickers."""
    if resume:
        existing = set(f.replace('.json', '') for f in os.listdir(OUTPUT_DIR) if f.endswith('.json') and f != 'company_index.json')
        before = len(tickers)
        tickers = [t for t in tickers if t not in existing]
        log(f'Resume mode: skipping {before - len(tickers)} already scraped, {len(tickers)} remaining')
    
    if not tickers:
        log('Nothing to scrape.')
        return {'success': 0, 'fail': 0, 'skipped': 0}
    
    success = fail = 0
    start = time.time()
    
    for i, ticker in enumerate(tickers):
        pct = f'{(i+1)/len(tickers)*100:.0f}%'
        log(f'[{i+1}/{len(tickers)}] ({pct}) {ticker}...')
        result = scrape_ticker(ticker)
        if result.get('ok'):
            success += 1
        else:
            fail += 1
            log(f'  FAIL: {result.get("error","?")}')
        if i < len(tickers) - 1:
            time.sleep(RATE_LIMIT_DELAY)
    
    elapsed = time.time() - start
    log(f'Done: {success} OK, {fail} FAIL in {elapsed/60:.1f}min ({elapsed/len(tickers):.1f}s per ticker)')
    return {'success': success, 'fail': fail, 'elapsed': elapsed}


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--ticker')
    parser.add_argument('--batch', choices=['test', 'missing', 'existing', 'all'])
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args()
    
    # Load company index
    manifest_path = os.path.join(ROOT, 'public', 'data', 'ar', 'company_index.json')
    if os.path.exists(manifest_path):
        idx = json.load(open(manifest_path, 'r'))
        all_tickers = [c['ticker'] for c in idx['companies']]
    else:
        all_tickers = []
    
    if args.batch == 'test':
        tickers = ['SBILIFE', 'BANDHANBNK', 'BDL']
    elif args.batch == 'missing':
        idx = json.load(open(manifest_path, 'r'))
        tickers = [c['ticker'] for c in idx['companies'] if not c.get('hasAr')]
    elif args.batch == 'existing':
        idx = json.load(open(manifest_path, 'r'))
        tickers = [c['ticker'] for c in idx['companies'] if c.get('hasAr')]
    elif args.batch == 'all':
        idx = json.load(open(manifest_path, 'r'))
        tickers = [c['ticker'] for c in idx['companies']]
    elif args.ticker:
        tickers = [args.ticker]
    else:
        parser.print_help()
        sys.exit(1)
    
    log(f'Starting batch: {len(tickers)} tickers (resume={args.resume})')
    results = batch_scrape(tickers, resume=args.resume)
    
    # Rebuild manifest
    if results['success'] > 0:
        log('Rebuilding manifest...')
        from build_company_manifest import build_manifest
        m = build_manifest()
        with_ar = sum(1 for c in m['companies'] if c.get('hasAr'))
        log(f'Coverage: {with_ar}/{len(m["companies"])} with AR data')


if __name__ == '__main__':
    main()
