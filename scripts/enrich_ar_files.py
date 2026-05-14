#!/usr/bin/env python3
"""
enrich_ar_files.py — Enrich all 750 AR files with:
1. Sector/industry/MCap metadata from N750 feed + NSE session
2. Proper items arrays for 5 yfinance-only companies
3. Data authenticity cross-checks (kpIs vs items sums)
4. Rebuild company_index.json with full metadata

Usage:
  python scripts/enrich_ar_files.py              # enrich all
  python scripts/enrich_ar_files.py --verify-only # only run cross-checks
"""

import json, os, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AR_DIR = ROOT / 'public' / 'data' / 'ar'
FEED_PATH = ROOT / 'public' / 'data' / 'nifty750_real.json'
INDEX_PATH = AR_DIR / 'company_index.json'

# ── Company metadata from feed ──────────────────────────────────────────────
def load_feed_metadata():
    """Extract sector/name/reportingType from N750 feed."""
    feed = json.load(open(FEED_PATH, 'r', encoding='utf-8'))
    meta = {}
    for b in feed.get('batches', []):
        slug = b.get('indexSlug', '')
        for c in b.get('companies', []):
            t = c.get('ticker', '')
            meta[t] = {
                'name': c.get('name', ''),
                'sector': c.get('sector', 'Unknown'),
                'reportingType': c.get('reportingType', 'nonFinancial'),
                'indexSlug': slug,
                'weightPct': c.get('weightPct', 0),
                'marketCapCr': c.get('marketCapCr', 0) or 0,
            }
    return meta


# ── Cross-check: verify kpIs values match items sums ────────────────────────
def crosscheck_year(ticker, fy, year_data, is_financial):
    """Run cross-checks on a single FY. Returns list of quality flags."""
    flags = []
    
    pl = year_data.get('profitLoss', {})
    bs = year_data.get('balanceSheet', {})
    cf = year_data.get('cashFlow', {})
    pl_kpis = pl.get('kpIs', {})
    bs_kpis = bs.get('kpIs', {})
    cf_kpis = cf.get('kpIs', {})
    
    # Check 1: PL items sum should match kpis
    pl_items = pl.get('items', [])
    for item in pl_items:
        label = item.get('label', '')
        val = item.get('current')
        if val is None:
            continue
        # Match screener labels to kpi keys
        mapping = {
            'Sales+': 'revenueCr', 'Revenue+': 'revenueCr',
            'Expenses+': 'totalExpensesCr',
            'Operating Profit': 'operatingProfitCr',
            'OPM %': None,  # skip percentages
            'Other Income+': 'otherIncomeCr',
            'Interest': 'financeCostCr',
            'Depreciation': 'depreciationCr',
            'Profit before tax': 'pbtCr',
            'Tax %': None,
            'Net Profit+': 'patCr',
            'EPS in Rs': 'epsRs',
            'Dividend Payout %': None,
            'Financing Profit': None,  # financial-specific
            'Financing Margin %': None,
        }
        kpi_key = mapping.get(label)
        if kpi_key and kpi_key in pl_kpis:
            kpi_val = pl_kpis[kpi_key]
            if kpi_val is not None and val is not None:
                diff = abs(kpi_val - val)
                if diff > 1:  # allow 1 Cr rounding
                    flags.append(f'PL mismatch: {label}={val} vs kpi {kpi_key}={kpi_val} (diff={diff:.1f})')
    
    # Check 2: BS total assets consistency
    if 'totalAssetsCr' in pl_kpis and 'totalAssetsCr' in bs_kpis:
        pl_ta = pl_kpis.get('totalAssetsCr')
        bs_ta = bs_kpis.get('totalAssetsCr')
        if pl_ta and bs_ta and abs(pl_ta - bs_ta) > 1:
            flags.append(f'BS totalAssets mismatch: PL kpi={pl_ta} vs BS kpi={bs_ta}')
    
    # Check 3: CF net change = closing - opening
    if 'closingCashCr' in cf_kpis and 'openingCashCr' in cf_kpis and 'netChangeCr' in cf_kpis:
        expected = (cf_kpis['closingCashCr'] or 0) - (cf_kpis['openingCashCr'] or 0)
        actual = cf_kpis.get('netChangeCr', 0) or 0
        if abs(expected - actual) > 1:
            flags.append(f'CF netChange mismatch: closing-opening={expected} vs netChange={actual}')
    
    # Check 4: CFO + CFI + CFF ≈ netChange
    cfo = cf_kpis.get('cfoCr', 0) or 0
    cfi = cf_kpis.get('cfiCr', 0) or 0
    cff = cf_kpis.get('cffCr', 0) or 0
    net = cf_kpis.get('netChangeCr', 0) or 0
    if cfo and cfi and cff:
        expected_net = cfo + cfi + cff
        if abs(expected_net - net) > max(abs(net) * 0.02, 5):
            flags.append(f'CF flow mismatch: cfo+cfi+cff={expected_net:.0f} vs netChange={net:.0f}')
    
    # Check 5: PAT = PBT - Tax (approximate)
    pbt = pl_kpis.get('pbtCr')
    pat = pl_kpis.get('patCr')
    if pbt and pat and pbt != 0:
        implied_tax_rate = (pbt - pat) / pbt * 100 if pbt > 0 else None
        if implied_tax_rate is not None and (implied_tax_rate < 5 or implied_tax_rate > 60):
            flags.append(f'Unusual tax rate: {(pbt-pat):.0f}/{pbt:.0f} = {implied_tax_rate:.1f}%')
    
    # Check 6: Revenue > 0 (for non-financial)
    if not is_financial and 'revenueCr' in pl_kpis:
        rev = pl_kpis['revenueCr']
        if rev is not None and rev <= 0:
            flags.append(f'Non-positive revenue: {rev}')
    
    return flags


# ── Generate items arrays from kpIs for yfinance-only companies ─────────────
def generate_items_from_kpis(ticker, fy, year_data, is_financial):
    """Create proper items arrays from flat kpIs dict."""
    pl_kpis = year_data.get('profitLoss', {}).get('kpIs', {})
    bs_kpis = year_data.get('balanceSheet', {}).get('kpIs', {})
    cf_kpis = year_data.get('cashFlow', {}).get('kpIs', {})
    
    if is_financial:
        pl_items = [
            {'label': 'Revenue+', 'current': pl_kpis.get('totalIncomeCr'), 'type': 'item'},
            {'label': 'Interest', 'current': pl_kpis.get('financeCostCr'), 'type': 'item'},
            {'label': 'Expenses+', 'current': pl_kpis.get('totalExpensesCr'), 'type': 'item'},
            {'label': 'Financing Profit', 'current': pl_kpis.get('operatingProfitCr'), 'type': 'item'},
            {'label': 'Financing Margin %', 'current': pl_kpis.get('opmPct'), 'type': 'item'},
            {'label': 'Other Income+', 'current': pl_kpis.get('otherIncomeCr'), 'type': 'item'},
            {'label': 'Depreciation', 'current': pl_kpis.get('depreciationCr'), 'type': 'item'},
            {'label': 'Profit before tax', 'current': pl_kpis.get('pbtCr'), 'type': 'item'},
            {'label': 'Tax %', 'current': pl_kpis.get('taxPct'), 'type': 'item'},
            {'label': 'Net Profit+', 'current': pl_kpis.get('patCr'), 'type': 'item'},
            {'label': 'EPS in Rs', 'current': pl_kpis.get('epsRs'), 'type': 'item'},
            {'label': 'Dividend Payout %', 'current': pl_kpis.get('dividendPayoutPct'), 'type': 'item'},
        ]
        bs_items = [
            {'label': 'Equity Capital', 'current': bs_kpis.get('equityCapitalCr'), 'type': 'item'},
            {'label': 'Reserves', 'current': bs_kpis.get('retainedEarningsCr'), 'type': 'item'},
            {'label': 'Borrowing', 'current': bs_kpis.get('borrowingsCr'), 'type': 'item'},
            {'label': 'Other Liabilities+', 'current': bs_kpis.get('totalLiabilitiesCr'), 'type': 'item'},
            {'label': 'Total Liabilities', 'current': bs_kpis.get('totalLiabilitiesCr'), 'type': 'total'},
            {'label': 'Fixed Assets+', 'current': bs_kpis.get('fixedAssetsCr'), 'type': 'item'},
            {'label': 'CWIP', 'current': bs_kpis.get('cwipCr'), 'type': 'item'},
            {'label': 'Investments', 'current': bs_kpis.get('investmentsCr'), 'type': 'item'},
            {'label': 'Other Assets+', 'current': bs_kpis.get('otherAssetsCr'), 'type': 'item'},
            {'label': 'Total Assets', 'current': bs_kpis.get('totalAssetsCr'), 'type': 'total'},
        ]
    else:
        pl_items = [
            {'label': 'Sales+', 'current': pl_kpis.get('revenueCr'), 'type': 'item'},
            {'label': 'Expenses+', 'current': pl_kpis.get('totalExpensesCr'), 'type': 'item'},
            {'label': 'Operating Profit', 'current': pl_kpis.get('operatingProfitCr'), 'type': 'item'},
            {'label': 'OPM %', 'current': pl_kpis.get('opmPct'), 'type': 'item'},
            {'label': 'Other Income+', 'current': pl_kpis.get('otherIncomeCr'), 'type': 'item'},
            {'label': 'Interest', 'current': pl_kpis.get('financeCostCr'), 'type': 'item'},
            {'label': 'Depreciation', 'current': pl_kpis.get('depreciationCr'), 'type': 'item'},
            {'label': 'Profit before tax', 'current': pl_kpis.get('pbtCr'), 'type': 'item'},
            {'label': 'Tax %', 'current': pl_kpis.get('taxPct'), 'type': 'item'},
            {'label': 'Net Profit+', 'current': pl_kpis.get('patCr'), 'type': 'item'},
            {'label': 'EPS in Rs', 'current': pl_kpis.get('epsRs'), 'type': 'item'},
            {'label': 'Dividend Payout %', 'current': pl_kpis.get('dividendPayoutPct'), 'type': 'item'},
        ]
        bs_items = [
            {'label': 'Equity Capital', 'current': bs_kpis.get('equityCapitalCr'), 'type': 'item'},
            {'label': 'Reserves', 'current': bs_kpis.get('retainedEarningsCr'), 'type': 'item'},
            {'label': 'Borrowings+', 'current': bs_kpis.get('borrowingsCr'), 'type': 'item'},
            {'label': 'Other Liabilities+', 'current': bs_kpis.get('otherLiabilitiesCr'), 'type': 'item'},
            {'label': 'Total Liabilities', 'current': bs_kpis.get('totalLiabilitiesCr'), 'type': 'total'},
            {'label': 'Fixed Assets+', 'current': bs_kpis.get('fixedAssetsCr'), 'type': 'item'},
            {'label': 'CWIP', 'current': bs_kpis.get('cwipCr'), 'type': 'item'},
            {'label': 'Investments', 'current': bs_kpis.get('investmentsCr'), 'type': 'item'},
            {'label': 'Other Assets+', 'current': bs_kpis.get('otherCurrentAssetsCr'), 'type': 'item'},
            {'label': 'Total Assets', 'current': bs_kpis.get('totalAssetsCr'), 'type': 'total'},
        ]
    
    cf_items = [
        {'label': 'Cash from Operating Activity+', 'current': cf_kpis.get('cfoCr'), 'type': 'item'},
        {'label': 'Cash from Investing Activity+', 'current': cf_kpis.get('cfiCr'), 'type': 'item'},
        {'label': 'Cash from Financing Activity+', 'current': cf_kpis.get('cffCr'), 'type': 'item'},
        {'label': 'Net Cash Flow', 'current': cf_kpis.get('netChangeCr'), 'type': 'item'},
        {'label': 'CFO/OP', 'current': None, 'type': 'ratio'},
        {'label': 'Free Cash Flow', 'current': cf_kpis.get('fcfCr'), 'type': 'item'},
    ]
    
    # Filter out items where current is None and not a header
    def clean(items):
        return [i for i in items if i.get('current') is not None or i.get('type') in ('header', 'total')]
    
    return clean(pl_items), clean(bs_items), clean(cf_items)


# ── Main enrichment logic ────────────────────────────────────────────────────
def enrich_all(verify_only=False):
    feed_meta = load_feed_metadata()
    print(f'Loaded metadata for {len(feed_meta)} companies from feed')
    
    ar_files = [f for f in os.listdir(AR_DIR) if f.endswith('.json') and f != 'company_index.json']
    print(f'Found {len(ar_files)} AR files to process')
    
    stats = {'enriched': 0, 'items_generated': 0, 'flags_found': 0, 'errors': 0}
    all_flags = {}  # ticker -> [flags]
    company_index_entries = []
    
    for i, fname in enumerate(sorted(ar_files)):
        ticker = fname.replace('.json', '').upper()
        fpath = AR_DIR / fname
        
        try:
            ar = json.load(open(fpath, 'r', encoding='utf-8'))
        except Exception as e:
            print(f'  ERROR reading {fname}: {e}')
            stats['errors'] += 1
            continue
        
        years = ar.get('years', {})
        if not years:
            continue
        
        meta = ar.get('metadata', {})
        feed = feed_meta.get(ticker, {})
        is_financial = feed.get('reportingType', 'nonFinancial') == 'financial'
        
        # Detect from kpIs if not in feed
        first_fy = list(years.values())[0]
        first_pl = first_fy.get('profitLoss', {}).get('kpIs', {})
        if 'revenueCr' not in first_pl and 'totalIncomeCr' not in first_pl:
            is_financial = True
        
        # ── 1. Enrich metadata ──────────────────────────────────────────
        if not verify_only:
            changed = False
            if not meta.get('sector') and feed.get('sector'):
                meta['sector'] = feed['sector']
                changed = True
            if not meta.get('name') and feed.get('name'):
                meta['name'] = feed['name']
                changed = True
            if not meta.get('reportingType'):
                meta['reportingType'] = 'financial' if is_financial else 'nonFinancial'
                changed = True
            if not meta.get('indexSlug') and feed.get('indexSlug'):
                meta['indexSlug'] = feed['indexSlug']
                changed = True
            if not meta.get('source'):
                src = meta.get('source', '')
                if not src:
                    meta['source'] = 'screener.in' if 'screener' not in src else src
                    changed = True
            # Add data version
            if not meta.get('dataVersion'):
                meta['dataVersion'] = 2
                changed = True
            if changed:
                ar['metadata'] = meta
        
        # ── 2. Generate items for yfinance-only companies ───────────────
        if not verify_only:
            for fy, yd in years.items():
                pl = yd.get('profitLoss', {})
                if 'items' not in pl or len(pl.get('items', [])) == 0:
                    pl_items, bs_items, cf_items = generate_items_from_kpis(ticker, fy, yd, is_financial)
                    if pl_items:
                        if 'profitLoss' not in yd:
                            yd['profitLoss'] = {}
                        yd['profitLoss']['items'] = pl_items
                    if bs_items:
                        if 'balanceSheet' not in yd:
                            yd['balanceSheet'] = {}
                        yd['balanceSheet']['items'] = bs_items
                    if cf_items:
                        if 'cashFlow' not in yd:
                            yd['cashFlow'] = {}
                        yd['cashFlow']['items'] = cf_items
                    stats['items_generated'] += 1
        
        # ── 3. Cross-check each FY ──────────────────────────────────────
        ticker_flags = []
        for fy, yd in sorted(years.items()):
            fy_flags = crosscheck_year(ticker, fy, yd, is_financial)
            if fy_flags:
                ticker_flags.extend([f'[{fy}] {f}' for f in fy_flags])
                # Add qualityFlags to year metadata
                if not verify_only:
                    if 'metadata' not in yd:
                        yd['metadata'] = {}
                    yd['metadata']['qualityFlags'] = fy_flags
        
        if ticker_flags:
            all_flags[ticker] = ticker_flags
            stats['flags_found'] += len(ticker_flags)
            if len(ticker_flags) <= 3:
                for f in ticker_flags:
                    print(f'  ⚠ {ticker}: {f}')
            else:
                print(f'  ⚠ {ticker}: {len(ticker_flags)} flags (e.g. {ticker_flags[0]})')
        
        # ── 4. Save enriched file ───────────────────────────────────────
        if not verify_only:
            with open(fpath, 'w', encoding='utf-8') as f:
                json.dump(ar, f, indent=2)
                f.write('\n')
            stats['enriched'] += 1
        
        # ── 5. Build company index entry ────────────────────────────────
        fy_list = sorted(years.keys())
        entry = {
            'ticker': ticker,
            'name': meta.get('name', '') or feed.get('name', ticker),
            'sector': meta.get('sector', '') or feed.get('sector', 'Unknown'),
            'reportingType': meta.get('reportingType', 'financial' if is_financial else 'nonFinancial'),
            'indexSlug': meta.get('indexSlug', '') or feed.get('indexSlug', ''),
            'hasAr': True,
            'fyCount': len(fy_list),
            'firstFy': fy_list[0] if fy_list else None,
            'lastFy': fy_list[-1] if fy_list else None,
            'source': meta.get('source', 'unknown'),
            'qualityFlags': len(ticker_flags),
            'marketCapCr': feed.get('marketCapCr', 0) or 0,
        }
        company_index_entries.append(entry)
        
        if (i + 1) % 100 == 0:
            print(f'  Processed {i+1}/{len(ar_files)}...')
    
    # ── 6. Write company_index.json ─────────────────────────────────────
    if not verify_only:
        company_index_entries.sort(key=lambda x: x['ticker'])
        index_data = {
            'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'companies': company_index_entries,
            'byTicker': {e['ticker']: e for e in company_index_entries},
            'count': len(company_index_entries),
            'scrapedCount': sum(1 for e in company_index_entries if e['hasAr']),
            'verificationSummary': {
                'totalFlags': stats['flags_found'],
                'flaggedCompanies': len(all_flags),
                'itemsGenerated': stats['items_generated'],
            }
        }
        with open(INDEX_PATH, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, indent=2)
            f.write('\n')
        print(f'\nWrote company_index.json with {len(company_index_entries)} companies')
    
    # ── 7. Print verification summary ───────────────────────────────────
    print(f'\n{"="*60}')
    print(f'VERIFICATION SUMMARY')
    print(f'{"="*60}')
    print(f'Files processed:    {len(ar_files)}')
    print(f'Files enriched:     {stats["enriched"]}')
    print(f'Items generated:    {stats["items_generated"]} (yfinance-only companies)')
    print(f'Total quality flags:{stats["flags_found"]}')
    print(f'Flagged companies:  {len(all_flags)}')
    print(f'Errors:             {stats["errors"]}')
    
    # Group flags by type
    flag_types = {}
    for ticker, flags in all_flags.items():
        for f in flags:
            # Extract the check type (before the colon details)
            ftype = f.split('] ')[1].split(':')[0] if '] ' in f else f.split(':')[0]
            flag_types[ftype] = flag_types.get(ftype, 0) + 1
    
    print(f'\nFlag breakdown:')
    for ftype, count in sorted(flag_types.items(), key=lambda x: -x[1]):
        print(f'  {ftype}: {count}')
    
    if all_flags:
        # Show top 10 most-flagged companies
        top_flagged = sorted(all_flags.items(), key=lambda x: -len(x[1]))[:10]
        print(f'\nTop flagged companies:')
        for ticker, flags in top_flagged:
            print(f'  {ticker}: {len(flags)} flags')
    
    return all_flags


if __name__ == '__main__':
    verify_only = '--verify-only' in sys.argv
    flags = enrich_all(verify_only=verify_only)
    if flags:
        print(f'\n⚠ {len(flags)} companies have data quality flags')
    else:
        print(f'\n✓ All companies pass cross-checks')
