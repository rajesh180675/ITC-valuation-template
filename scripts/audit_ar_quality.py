#!/usr/bin/env python3
"""
Nifty 750 — Data Quality Audit
Scans all AR files and the Nifty750 manifest, produces a JSON report
with coverage stats, missing data, outliers, and company-level quality flags.

Usage:
  python scripts/audit_ar_quality.py
"""
import json, os, sys
from datetime import datetime

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
AR_DIR = os.path.join(ROOT, "public", "data", "ar")
MANIFEST_PATH = os.path.join(AR_DIR, "company_index.json")
NIFTY750_PATH = os.path.join(ROOT, "public", "data", "nifty750_real.json")
OUTPUT_PATH = os.path.join(ROOT, "scripts", "ar_quality_report.json")

EXPECTED_KPIS = [
    'revenueCr', 'patCr', 'pbtCr', 'operatingProfitCr', 'totalExpensesCr',
    'financeCostCr', 'depreciationCr', 'otherIncomeCr', 'epsRs',
    'equityCr', 'totalAssetsCr', 'borrowingsCr', 'fixedAssetsCr', 'investmentsCr',
    'cfoCr', 'cfiCr', 'cffCr', 'fcfCr', 'netChangeCr', 'closingCashCr',
]

def audit_company(ticker: str, ar_path: str) -> dict:
    """Audit a single AR file."""
    try:
        with open(ar_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        return {'ticker': ticker, 'ok': False, 'error': str(e)[:100]}

    years = data.get('years', {})
    if not years:
        return {'ticker': ticker, 'ok': False, 'error': 'Empty years data'}

    year_keys = sorted(years.keys())
    metadata = data.get('metadata', {})

    # Per-year checks
    year_stats = {}
    all_present_kpis = set()
    missing_kpis_per_year = {}
    total_pl_items = 0
    total_bs_items = 0
    total_cf_items = 0

    for fy in year_keys:
        yd = years[fy]
        present_kpis = set()

        for stmt in ['profitLoss', 'balanceSheet', 'cashFlow']:
            s = yd.get(stmt, {})
            items = s.get('items', [])
            kpis = s.get('kpIs', {})

            if stmt == 'profitLoss':
                total_pl_items = max(total_pl_items, len(items))
            elif stmt == 'balanceSheet':
                total_bs_items = max(total_bs_items, len(items))
            elif stmt == 'cashFlow':
                total_cf_items = max(total_cf_items, len(items))

            for k, v in kpis.items():
                if v is not None:
                    present_kpis.add(k)

        all_present_kpis.update(present_kpis)
        missing = [k for k in EXPECTED_KPIS if k not in present_kpis]
        if missing:
            missing_kpis_per_year[fy] = missing

        year_stats[fy] = {
            'kpiCount': len(present_kpis),
            'plItems': len(yd.get('profitLoss', {}).get('items', [])),
            'bsItems': len(yd.get('balanceSheet', {}).get('items', [])),
            'cfItems': len(yd.get('cashFlow', {}).get('items', [])),
        }

    # Revenue/Profit sanity checks
    revenue_growth_warnings = []
    for i in range(1, len(year_keys)):
        fy_curr = year_keys[i]
        fy_prev = year_keys[i - 1]
        try:
            rev_curr = years[fy_curr]['profitLoss']['kpIs'].get('revenueCr')
            rev_prev = years[fy_prev]['profitLoss']['kpIs'].get('revenueCr')
            if rev_curr and rev_prev and rev_prev > 0:
                growth = (rev_curr - rev_prev) / rev_prev
                if growth > 5:  # 500% YoY growth — likely data error
                    revenue_growth_warnings.append(f'{fy_curr}: {growth*100:.0f}% YoY')
                if growth < -0.9:  # 90% drop — likely data error
                    revenue_growth_warnings.append(f'{fy_curr}: {growth*100:.0f}% YoY')
        except (TypeError, KeyError):
            pass

    return {
        'ticker': ticker,
        'ok': True,
        'years': len(year_keys),
        'fyRange': f'{year_keys[0]}-{year_keys[-1]}',
        'source': metadata.get('source', 'unknown'),
        'schemaVersion': metadata.get('schemaVersion'),
        'kpiCount': len(all_present_kpis),
        'presentKpis': sorted(all_present_kpis),
        'missingKpis': [k for k in EXPECTED_KPIS if k not in all_present_kpis],
        'missingKpisPerYear': missing_kpis_per_year,
        'maxPlItems': total_pl_items,
        'maxBsItems': total_bs_items,
        'maxCfItems': total_cf_items,
        'yearStats': year_stats,
        'revenueWarnings': revenue_growth_warnings,
    }


def audit_all():
    if not os.path.exists(AR_DIR):
        print(f'ERROR: AR directory not found: {AR_DIR}')
        return

    ar_files = sorted([f for f in os.listdir(AR_DIR) if f.endswith('.json') and f != 'company_index.json'])
    print(f'Auditing {len(ar_files)} AR files...')

    results = []
    for fname in ar_files:
        ticker = fname.replace('.json', '')
        path = os.path.join(AR_DIR, fname)
        result = audit_company(ticker, path)
        results.append(result)

    # Load manifest for index info
    manifest = None
    if os.path.exists(MANIFEST_PATH):
        manifest = json.load(open(MANIFEST_PATH, 'r', encoding='utf-8'))

    # Aggregate stats
    total = len(results)
    ok = sum(1 for r in results if r.get('ok'))
    fail = sum(1 for r in results if not r.get('ok'))

    companies_with_10y = sum(1 for r in results if r.get('ok') and r.get('years', 0) >= 10)
    companies_with_5y = sum(1 for r in results if r.get('ok') and r.get('years', 0) >= 5)
    companies_with_2y = sum(1 for r in results if r.get('ok') and r.get('years', 0) >= 2)

    # Count missing KPI frequency
    kpi_missing_count = {}
    for r in results:
        if r.get('ok'):
            for k in r.get('missingKpis', []):
                kpi_missing_count[k] = kpi_missing_count.get(k, 0) + 1

    # Revenue warnings
    all_warnings = []
    for r in results:
        if r.get('revenueWarnings'):
            all_warnings.append({
                'ticker': r['ticker'],
                'warnings': r['revenueWarnings']
            })

    # Coverage stats per index
    index_coverage = {}
    if manifest:
        for c in manifest.get('companies', []):
            slug = c.get('indexSlug', 'other')
            if slug not in index_coverage:
                index_coverage[slug] = {'total': 0, 'withAr': 0, 'withoutAr': 0}
            index_coverage[slug]['total'] += 1
            if c.get('hasAr'):
                index_coverage[slug]['withAr'] += 1
            else:
                index_coverage[slug]['withoutAr'] += 1

    report = {
        'generatedAt': datetime.utcnow().isoformat(),
        'totalFiles': total,
        'valid': ok,
        'invalid': fail,
        'coverage': {
            '>=10 years': companies_with_10y,
            '>=5 years': companies_with_5y,
            '>=2 years': companies_with_2y,
            '< 2 years or invalid': total - companies_with_2y,
        },
        'indexCoverage': index_coverage,
        'kpiMissingFrequency': dict(sorted(kpi_missing_count.items(), key=lambda x: -x[1])),
        'kpiTotalExpected': len(EXPECTED_KPIS),
        'revenueAnomalies': all_warnings,
        'failures': [{'ticker': r['ticker'], 'error': r.get('error', '?')} for r in results if not r.get('ok')],
        'allResults': results,
    }

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f'\n=== QUALITY REPORT ===')
    print(f'  Files audited: {total}')
    print(f'  Valid: {ok}, Invalid: {fail}')
    print(f'  Coverage: {companies_with_10y} >= 10y, {companies_with_5y} >= 5y, {companies_with_2y} >= 2y')
    if index_coverage:
        for slug, cov in sorted(index_coverage.items()):
            print(f'  {slug}: {cov["withAr"]}/{cov["total"]} with AR data')
    if kpi_missing_count:
        print(f'\n  Top missing KPIs:')
        for k, v in sorted(kpi_missing_count.items(), key=lambda x: -x[1])[:10]:
            print(f'    {k}: missing in {v} companies')
    if all_warnings:
        print(f'\n  Revenue anomalies: {len(all_warnings)} companies')
        for w in all_warnings[:10]:
            print(f'    {w["ticker"]}: {w["warnings"]}')
    print(f'\n  Report saved: {OUTPUT_PATH}')


if __name__ == '__main__':
    audit_all()
