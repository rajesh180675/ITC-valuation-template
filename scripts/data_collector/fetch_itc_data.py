#!/usr/bin/env python3
"""
ITC Valuation Template — Real Data Feed Collector
=================================================
Fetches ITC stock prices, financials, and fundamentals from Yahoo Finance.

Output:
  public/data/itc_live_quote.json       — Current market data (price, PE, yield, etc.)
  public/data/itc_price_history.json    — Max available daily OHLC price history
  public/data/itc_financials.json       — Annual income stmt, balance sheet, cash flow
  public/data/itc_dividend_history.json — Historical dividend payments

Usage:
  python scripts/data_collector/fetch_itc_data.py
"""

import json
import os
import sys
from datetime import datetime, timezone

try:
    import yfinance as yf
except ImportError:
    print("ERROR: yfinance not installed. Run: pip install yfinance pandas")
    sys.exit(1)


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", ".."))
DATA_DIR = os.path.join(ROOT_DIR, "public", "data")
TICKER = "ITC.NS"


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def round_val(v, digits=2):
    if v is None:
        return None
    try:
        f = float(v)
        if not (f == f):
            return None
        return round(f, digits)
    except (ValueError, TypeError):
        return None


def to_cr(value):
    if value is None:
        return None
    try:
        return round(float(value) / 100_000_00, 2)
    except (ValueError, TypeError):
        return None


def fetch_live_quote(ticker):
    """Fetch current market data / snapshot."""
    t = yf.Ticker(ticker)
    info = t.info

    quote = {
        "ticker": "ITC",
        "exchange": "NSE",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Yahoo Finance (yfinance)",
        "companyName": info.get("longName", info.get("shortName", "ITC Limited")),
        "currentPrice": round_val(info.get("currentPrice")),
        "previousClose": round_val(info.get("previousClose")),
        "open": round_val(info.get("open")),
        "dayHigh": round_val(info.get("dayHigh")),
        "dayLow": round_val(info.get("dayLow")),
        "fiftyTwoWeekHigh": round_val(info.get("fiftyTwoWeekHigh")),
        "fiftyTwoWeekLow": round_val(info.get("fiftyTwoWeekLow")),
        "marketCap": to_cr(info.get("marketCap")),
        "trailingPE": round_val(info.get("trailingPE")),
        "forwardPE": round_val(info.get("forwardPE")),
        "priceToBook": round_val(info.get("priceToBook")),
        "bookValue": round_val(info.get("bookValue")),
        "epsTrailing": round_val(info.get("trailingEps")),
        "epsForward": round_val(info.get("forwardEps")),
        "dividendRate": round_val(info.get("dividendRate")),
        "dividendYield": round_val(info.get("dividendYield")),
        "revenueTTM": to_cr(info.get("totalRevenue")),
        "profitTTM": to_cr(info.get("netIncomeToCommon")),
        "ebitdaTTM": to_cr(info.get("ebitda")),
        "profitMargins": round_val(info.get("profitMargins"), 4),
        "ebitdaMargins": round_val(info.get("ebitdaMargins"), 4),
        "returnOnEquity": round_val(info.get("returnOnEquity"), 4),
        "debtToEquity": round_val(info.get("debtToEquity")),
        "revenueGrowth": round_val(info.get("revenueGrowth"), 4),
        "earningsGrowth": round_val(info.get("earningsGrowth"), 4),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "provenance": {
            "sourceName": "Yahoo Finance (yfinance)",
            "sourceType": "aggregated_market_data_api",
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
        },
    }
    return quote


def fetch_price_history(ticker):
    """Fetch daily OHLC price history — max available (30 years for ITC)."""
    t = yf.Ticker(ticker)
    hist = t.history(period="max")

    if hist.empty:
        print(f"  WARNING: No price history returned for {ticker}")
        return []

    records = []
    for date, row in hist.iterrows():
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "open": round(float(row["Open"]), 2),
            "high": round(float(row["High"]), 2),
            "low": round(float(row["Low"]), 2),
            "close": round(float(row["Close"]), 2),
            "volume": int(row["Volume"]),
            "dividends": round(float(row.get("Dividends", 0)), 4),
            "stockSplits": round(float(row.get("Stock Splits", 0)), 4),
        })

    return records


def fetch_dividend_history(ticker):
    """Fetch full dividend history."""
    t = yf.Ticker(ticker)
    div = t.dividends

    if div is None or div.empty:
        print(f"  WARNING: No dividend data for {ticker}")
        return []

    records = []
    for date, amount in div.items():
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "amount": round(float(amount), 4),
            "year": str(date.year),
        })

    return records


def fetch_financials(ticker):
    """Fetch annual income statement, balance sheet, and cash flow."""
    t = yf.Ticker(ticker)

    result = {
        "incomeStatement": [],
        "balanceSheet": [],
        "cashFlow": [],
    }

    def extract_table(source, target_key):
        if source is not None and not source.empty:
            for col in source.columns:
                year_str = str(col.year)
                entry = {
                    "fiscalYearEnd": col.strftime("%Y-%m-%d"),
                    "fiscalYear": f"FY{year_str}",
                }
                for idx in source.index:
                    val = source.loc[idx, col]
                    try:
                        fval = float(val)
                        if fval == fval:
                            entry[idx] = round(fval, 2)
                    except (ValueError, TypeError):
                        entry[idx] = None
                result[target_key].append(entry)

    extract_table(t.financials, "incomeStatement")
    extract_table(t.balance_sheet, "balanceSheet")
    extract_table(t.cashflow, "cashFlow")

    return result


def write_json(data, filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    size_kb = os.path.getsize(path) / 1024
    print(f"  ✓ {filename} ({size_kb:.1f} KB)")
    return path


def main():
    print("=" * 60)
    print("ITC Data Feed Collector")
    print(f"  Ticker: {TICKER}")
    print(f"  Output: {DATA_DIR}")
    print("=" * 60)

    ensure_dir(DATA_DIR)
    errors = []

    # ── 1. Live Quote ──────────────────────────────────────────────
    print("\n[1/4] Fetching live quote...")
    try:
        quote = fetch_live_quote(TICKER)
        write_json(quote, "itc_live_quote.json")
        print(f"  Price: ₹{quote['currentPrice']} | MCap: ₹{quote['marketCap']:.0f}L Cr")
        print(f"  P/E: {quote['trailingPE']} | Div Yield: {quote['dividendYield']}%")
    except Exception as e:
        print(f"  ✗ Error fetching quote: {e}")
        errors.append(f"quote: {e}")

    # ── 2. Price History (max) ─────────────────────────────────────
    print("\n[2/4] Fetching max price history...")
    try:
        prices = fetch_price_history(TICKER)
        price_data = {
            "ticker": TICKER,
            "period": "max",
            "interval": "1d",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "source": "Yahoo Finance (yfinance)",
            "count": len(prices),
            "records": prices,
        }
        write_json(price_data, "itc_price_history.json")
        print(f"  Records: {len(prices)} trading days")
        if prices:
            print(f"  Range: {prices[0]['date']} → {prices[-1]['date']}")
            years = int(prices[-1]["date"][:4]) - int(prices[0]["date"][:4])
            print(f"  Span: {years} years")
    except Exception as e:
        print(f"  ✗ Error fetching prices: {e}")
        errors.append(f"prices: {e}")

    # ── 3. Dividend History ────────────────────────────────────────
    print("\n[3/4] Fetching dividend history...")
    try:
        divs = fetch_dividend_history(TICKER)
        div_data = {
            "ticker": TICKER,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "source": "Yahoo Finance (yfinance)",
            "count": len(divs),
            "records": divs,
        }
        write_json(div_data, "itc_dividend_history.json")
        print(f"  Records: {len(divs)} dividend payments")
        if divs:
            print(f"  Range: {divs[0]['date']} → {divs[-1]['date']}")
    except Exception as e:
        print(f"  ✗ Error fetching dividends: {e}")
        errors.append(f"dividends: {e}")

    # ── 4. Financials ──────────────────────────────────────────────
    print("\n[4/4] Fetching financial statements...")
    try:
        fin_data = fetch_financials(TICKER)
        fin_data["ticker"] = TICKER
        fin_data["generatedAt"] = datetime.now(timezone.utc).isoformat()
        fin_data["source"] = "Yahoo Finance (yfinance)"
        write_json(fin_data, "itc_financials.json")
        print(f"  Income stmt: {len(fin_data['incomeStatement'])} years")
        print(f"  Balance sheet: {len(fin_data['balanceSheet'])} years")
        print(f"  Cash flow: {len(fin_data['cashFlow'])} years")
    except Exception as e:
        print(f"  ✗ Error fetching financials: {e}")
        errors.append(f"financials: {e}")

    # ── Summary ────────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    if errors:
        print(f"Completed with {len(errors)} error(s):")
        for e in errors:
            print(f"  • {e}")
    else:
        print("All data fetched successfully!")
    print(f"Output directory: {DATA_DIR}")
    print(f"{'=' * 60}")

    return errors


if __name__ == "__main__":
    sys.exit(1 if main() else 0)
