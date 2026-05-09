#!/usr/bin/env python3
"""
ITC Data Collector — fetches real-time and historical data from yfinance.

Usage:
  python3 scripts/data_collector/fetch_itc_data.py live-quote
  python3 scripts/data_collector/fetch_itc_data.py price-history [--years 30]
  python3 scripts/data_collector/fetch_itc_data.py financials
  python3 scripts/data_collector/fetch_itc_data.py dividends
  python3 scripts/data_collector/fetch_itc_data.py all

Output: JSON files written to public/data/ matching itcDataSchemas.ts interfaces.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

try:
    import yfinance as yf
    import pandas as pd
except ImportError:
    print("ERROR: yfinance and pandas are required.")
    print("Install with: pip install yfinance pandas")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
OUT_DIR = PROJECT_ROOT / "public" / "data"

TICKER = "ITC.NS"
SYMBOL = "ITC.NS"
SCHEMA_VERSION = 1

now_iso = datetime.now().isoformat()


def ensure_out_dir():
    OUT_DIR.mkdir(parents=True, exist_ok=True)


def write_json(filename: str, data: dict):
    ensure_out_dir()
    path = OUT_DIR / filename
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    size_kb = round(len(json.dumps(data)) / 1024)
    print(f"  ✓ {filename} ({size_kb} KB) → {path}")


# ─── Live Quote ────────────────────────────────────────────────────────────────

def fetch_live_quote():
    print("Fetching live quote from yfinance...")
    ticker = yf.Ticker(TICKER)
    info = ticker.info or {}

    # yfinance may return None or empty dict for some fields
    def safe_float(val, default=0.0):
        try:
            f = float(val)
            return f if abs(f) != float('inf') else default
        except (TypeError, ValueError):
            return default

    data = {
        "symbol": SYMBOL,
        "exchange": "NSE",
        "lastPrice": safe_float(info.get("currentPrice") or info.get("regularMarketPrice")),
        "change": safe_float(info.get("regularMarketChange") or 0.0),
        "changePercent": safe_float(info.get("regularMarketChangePercent") or 0.0),
        "open": safe_float(info.get("regularMarketOpen") or info.get("open")),
        "high": safe_float(info.get("dayHigh") or info.get("regularMarketDayHigh")),
        "low": safe_float(info.get("dayLow") or info.get("regularMarketDayLow")),
        "previousClose": safe_float(info.get("previousClose") or info.get("regularMarketPreviousClose")),
        "volume": safe_float(info.get("regularMarketVolume") or info.get("volume")),
        "marketCap": safe_float(info.get("marketCap", 0)) / 1e7,  # Convert to Cr
        "pe": safe_float(info.get("trailingPE") or info.get("forwardPE")),
        "pb": safe_float(info.get("priceToBook")),
        "dividendYield": safe_float(info.get("dividendYield", 0)) * 100 if info.get("dividendYield") else 0.0,
        "fiftyTwoWeekHigh": safe_float(info.get("fiftyTwoWeekHigh")),
        "fiftyTwoWeekLow": safe_float(info.get("fiftyTwoWeekLow")),
        "ttmRevenue": safe_float(info.get("totalRevenue", 0)) / 1e7,  # Convert to Cr
        "ttmNetProfit": safe_float(info.get("netIncomeToCommon", 0)) / 1e7,  # Convert to Cr
        "source": "yfinance",
        "fetchedAt": now_iso,
    }

    write_json("itc_live_quote.json", data)


# ─── Price History ─────────────────────────────────────────────────────────────

def fetch_price_history(years: int = 30):
    print(f"Fetching {years}-year price history from yfinance...")
    ticker = yf.Ticker(TICKER)
    hist = ticker.history(period=f"{years}y", interval="1d")

    if hist.empty:
        print("  ERROR: No price history data returned from yfinance")
        return

    days = []
    for date_idx, row in hist.iterrows():
        days.append({
            "date": date_idx.strftime("%Y-%m-%d"),
            "open": round(float(row["Open"]), 2),
            "high": round(float(row["High"]), 2),
            "low": round(float(row["Low"]), 2),
            "close": round(float(row["Close"]), 2),
            "volume": int(row["Volume"]),
            "adjClose": round(float(row["Close"]), 2),  # yfinance adjusts close via "Adj Close"
        })

    data = {
        "symbol": SYMBOL,
        "source": "yfinance",
        "startDate": days[0]["date"] if days else "1996-01-01",
        "endDate": days[-1]["date"] if days else now_iso[:10],
        "totalDays": len(days),
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": now_iso,
        "days": days,
    }

    write_json("itc_price_history.json", data)


# ─── Financials ────────────────────────────────────────────────────────────────

def fetch_financials():
    print("Fetching financial statements from yfinance...")
    ticker = yf.Ticker(TICKER)

    income_stmt = ticker.financials  # Annual income statement
    balance_sheet = ticker.balance_sheet  # Annual balance sheet
    cashflow = ticker.cashflow  # Annual cash flow

    if income_stmt.empty:
        print("  ERROR: No financial data returned from yfinance")
        return

    rows = []
    # yfinance returns columns as fiscal year end dates
    for col in income_stmt.columns:
        date_str = col.strftime("%Y-%m-%d") if hasattr(col, "strftime") else str(col)
        fy_year = col.year if hasattr(col, "year") else int(str(col)[:4])
        fy_label = f"FY{fy_year}"

        def safe_get(df, label, default=0.0):
            try:
                val = df.loc[label, col] if label in df.index else default
                return float(val) if pd.notna(val) else default
            except (KeyError, TypeError, ValueError):
                return default

        rev = safe_get(income_stmt, "Total Revenue")
        ebitda = safe_get(income_stmt, "EBITDA")
        ebit = safe_get(income_stmt, "EBIT") or safe_get(income_stmt, "Operating Revenue") * 0.2
        net_profit = safe_get(income_stmt, "Net Income") or safe_get(income_stmt, "Net Income Common Stockholders")

        eps = net_profit / 1249 if net_profit > 0 else 0  # Approx shares outstanding in Cr

        rows.append({
            "fiscalYear": fy_label,
            "periodEndDate": date_str,
            "revenue": round(rev / 1e7, 2),  # Convert to Cr
            "ebitda": round(ebitda / 1e7, 2),
            "ebit": round(ebit / 1e7, 2),
            "netProfit": round(net_profit / 1e7, 2),
            "eps": round(eps, 2),
            "dps": 0,  # Not available from income statement alone
            "totalAssets": round(safe_get(balance_sheet, "Total Assets") / 1e7, 2) if not balance_sheet.empty else 0,
            "shareholdersEquity": round(safe_get(balance_sheet, "Stockholders Equity") / 1e7, 2) if not balance_sheet.empty else 0,
            "grossDebt": round(safe_get(balance_sheet, "Total Debt") / 1e7, 2) if not balance_sheet.empty else 0,
            "freeCashFlow": round(safe_get(cashflow, "Free Cash Flow") / 1e7, 2) if not cashflow.empty else 0,
            "operatingCashFlow": round(safe_get(cashflow, "Operating Cash Flow") / 1e7, 2) if not cashflow.empty else 0,
            "cigaretteRevenue": 0,
            "fmcgRevenue": 0,
            "hotelsRevenue": 0,
            "paperRevenue": 0,
            "agriRevenue": 0,
            "otherRevenue": 0,
            "ebitdaMargin": round((ebitda / rev) * 100, 1) if rev > 0 else 0,
            "netMargin": round((net_profit / rev) * 100, 1) if rev > 0 else 0,
            "roe": round((net_profit / safe_get(balance_sheet, "Stockholders Equity")) * 100, 1) if safe_get(balance_sheet, "Stockholders Equity") != 0 else 0,
            "roce": 0,
        })

    # Sort by fiscal year ascending
    rows.sort(key=lambda r: r["fiscalYear"])

    data = {
        "symbol": SYMBOL,
        "source": "yfinance",
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": now_iso,
        "statementType": "consolidated",
        "currency": "INR",
        "unit": "Cr",
        "rows": rows,
    }

    write_json("itc_financials.json", data)


# ─── Dividends ────────────────────────────────────────────────────────────────

def fetch_dividends():
    print("Fetching dividend history from yfinance...")
    ticker = yf.Ticker(TICKER)
    divs = ticker.dividends

    if divs.empty:
        print("  ERROR: No dividend data returned from yfinance")
        return

    dividend_entries = []
    for date_idx, amount in divs.items():
        date_str = date_idx.strftime("%Y-%m-%d") if hasattr(date_idx, "strftime") else str(date_idx)
        year = date_idx.year if hasattr(date_idx, "year") else int(str(date_idx)[:4])

        # Classify dividend type (simplified)
        # yfinance doesn't distinguish interim/final/special, so we mark all as 'final'
        # The synthetic data generator does a better job with FY-aligned classification
        dividend_entries.append({
            "exDate": date_str,
            "recordDate": None,
            "dividendType": "final",
            "amountPerShare": round(float(amount), 2),
            "fiscalYear": f"FY{year}",
            "source": "yfinance",
        })

    # Sort by exDate ascending
    dividend_entries.sort(key=lambda d: d["exDate"])

    data = {
        "symbol": SYMBOL,
        "source": "yfinance",
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": now_iso,
        "dividends": dividend_entries,
    }

    write_json("itc_dividend_history.json", data)


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch ITC data from yfinance")
    parser.add_argument("command", choices=["live-quote", "price-history", "financials", "dividends", "all"],
                        help="What to fetch")
    parser.add_argument("--years", type=int, default=30, help="Years of price history (default: 30)")

    args = parser.parse_args()

    if args.command == "live-quote" or args.command == "all":
        fetch_live_quote()

    if args.command == "price-history" or args.command == "all":
        fetch_price_history(args.years)

    if args.command == "financials" or args.command == "all":
        fetch_financials()

    if args.command == "dividends" or args.command == "all":
        fetch_dividends()

    if args.command == "all":
        print("\nAll ITC data files refreshed.")


if __name__ == "__main__":
    main()