#!/usr/bin/env python3
"""Batch yfinance collector for expanded NSE universe beyond Nifty750."""
import os, sys, json, time, re, math
from datetime import datetime, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
DATA_DIR = os.path.join(ROOT, "public", "data")
AR_DIR = os.path.join(DATA_DIR, "ar")
os.makedirs(AR_DIR, exist_ok=True)

import yfinance as yf

NSE_SUFFIX = ".NS"

def to_ns(ticker):
    return ticker + NSE_SUFFIX if not ticker.endswith(NSE_SUFFIX) else ticker

def load_existing():
    """Load existing nifty750_real.json + nifty250_real.json + AR files to know what we have."""
    existing = set()
    
    # From nifty750_real.json
    n750 = json.load(open(os.path.join(DATA_DIR, "nifty750_real.json"), "r", encoding="utf-8"))
    for b in n750.get("batches", []):
        for c in b.get("companies", []):
            existing.add(c["id"].upper())
    
    # From nifty250_real.json
    n250 = json.load(open(os.path.join(DATA_DIR, "nifty250_real.json"), "r", encoding="utf-8"))
    for c in n250.get("constituents", []):
        existing.add(c["id"].upper())
    
    # From AR files
    for f in os.listdir(AR_DIR):
        if f.endswith(".json") and f != "company_index.json":
            existing.add(f.replace(".json", "").upper())
    
    return existing

def fetch_company_financials(ticker):
    """Fetch 10y financials via yfinance."""
    ns_ticker = to_ns(ticker)
    t = yf.Ticker(ns_ticker)
    
    info = {}
    try:
        info = t.info or {}
    except:
        return None
    
    if not info.get("marketCap"):
        return None
    
    market_cap_cr = info.get("marketCap", 0) / 1e7  # Convert to crores
    cmp = info.get("currentPrice", info.get("regularMarketPrice", 0))
    pe = info.get("trailingPE", 0)
    pb = info.get("priceToBook", 0)
    sector = info.get("sector", "Unknown")
    industry = info.get("industry", "Unknown")
    roe = info.get("returnOnEquity", 0)  # percentage value like 18.5
    revenue_ttm = (info.get("totalRevenue", 0) or 0) / 1e7
    net_income_ttm = (info.get("netIncomeToCommon", 0) or 0) / 1e7
    
    # Fetch income statement
    income = None
    try:
        income = t.income_stmt
        if income is not None and hasattr(income, 'columns'):
            income = income
        else:
            income = None
    except:
        pass
    
    # Fetch balance sheet
    balance = None
    try:
        balance = t.balance_sheet
    except:
        pass
    
    # Fetch cash flow
    cashflow = None
    try:
        cashflow = t.cashflow
    except:
        pass
    
    return {
        'ticker': ticker,
        'market_cap_cr': market_cap_cr,
        'cmp': cmp,
        'pe': pe,
        'pb': pb,
        'sector': sector,
        'industry': industry,
        'roe': roe,
        'revenue_ttm': revenue_ttm,
        'net_profit_ttm': net_income_ttm,
        'income': income,
        'balance': balance,
        'cashflow': cashflow,
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python batch_yfinance_collect.py tickers.txt")
        print("  tickers.txt: one ticker per line")
        sys.exit(1)
    
    ticker_file = sys.argv[1]
    with open(ticker_file, 'r') as f:
        tickers = [line.strip().upper() for line in f if line.strip()]
    
    print(f"Fetching {len(tickers)} companies via yfinance...")
    
    results = []
    errors = []
    
    for i, ticker in enumerate(tickers):
        print(f"[{i+1}/{len(tickers)}] {ticker}...")
        try:
            data = fetch_company_financials(ticker)
            if data:
                results.append(data)
                print(f"  OK: MCap {data['market_cap_cr']:.0f}Cr, PE {data['pe']:.1f}, Sector {data['sector']}")
            else:
                errors.append((ticker, "no data"))
                print(f"  SKIPPED: no data")
        except Exception as e:
            errors.append((ticker, str(e)[:50]))
            print(f"  ERROR: {e}")
        time.sleep(0.5)  # Be polite to yfinance
    
    print(f"\n=== SUMMARY ===")
    print(f"Success: {len(results)}")
    print(f"Errors: {len(errors)}")
    
    if errors:
        print(f"Failed tickers: {[t[0] for t in errors[:10]]}")
    
    # Save results
    output_path = os.path.join(DATA_DIR, "yfinance_batch_results.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            'results': results,
            'errors': errors,
            'timestamp': datetime.now().isoformat(),
        }, f, indent=2)
    
    print(f"\nSaved to {output_path}")

if __name__ == '__main__':
    main()
