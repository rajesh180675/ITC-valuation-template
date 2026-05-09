#!/usr/bin/env python3
"""
Data Schema Validator — validates public/data/*.json against expected schemas.

This script mirrors the TypeScript validators from src/utils/itcDataSchemas.ts
and src/utils/niftyDatasetSchema.ts.

Usage:
  python scripts/data_collector/validate_schemas.py
  python scripts/data_collector/validate_schemas.py --fix  (regenerate missing schemaVersion)

Exit code: 0 = all valid, 1 = errors found
"""

import json
import os
import sys
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DATA_DIR = PROJECT_ROOT / "public" / "data"

# ─── Expected schema versions ────────────────────────────────────────────────

SCHEMA_VERSIONS = {
    "itc_live_quote.json": 1,
    "itc_price_history.json": 1,
    "itc_financials.json": 1,
    "itc_dividend_history.json": 1,
    "nifty_750_10y.json": 2,
}

REQUIRED_FIELDS = {
    "itc_live_quote.json": [
        ("symbol", str),
        ("exchange", str),
        ("lastPrice", (int, float)),
        ("change", (int, float)),
        ("changePercent", (int, float)),
        ("high", (int, float)),
        ("low", (int, float)),
        ("marketCap", (int, float)),
        ("pe", (int, float)),
        ("pb", (int, float)),
        ("dividendYield", (int, float)),
        ("fiftyTwoWeekHigh", (int, float)),
        ("fiftyTwoWeekLow", (int, float)),
        ("ttmRevenue", (int, float)),
        ("ttmNetProfit", (int, float)),
        ("source", str),
        ("fetchedAt", str),
        ("schemaVersion", int),
    ],
    "itc_price_history.json": [
        ("symbol", str),
        ("source", str),
        ("startDate", str),
        ("endDate", str),
        ("totalDays", int),
        ("schemaVersion", int),
        ("generatedAt", str),
        ("days", list),
    ],
    "itc_financials.json": [
        ("symbol", str),
        ("source", str),
        ("schemaVersion", int),
        ("generatedAt", str),
        ("rows", list),
    ],
    "itc_dividend_history.json": [
        ("symbol", str),
        ("source", str),
        ("schemaVersion", int),
        ("generatedAt", str),
        ("dividends", list),
    ],
    "nifty_750_10y.json": [
        ("generatedAt", str),
        ("source", str),
        ("sourcePolicy", str),
        ("schemaVersion", int),
        ("fiscalYears", list),
        ("batches", list),
    ],
}

# ─── Price history day fields ────────────────────────────────────────────────

PRICE_DAY_FIELDS = ["date", "open", "high", "low", "close", "volume", "adjClose"]

FINANCIAL_ROW_FIELDS = [
    "fiscalYear", "periodEndDate", "revenue", "ebitda", "ebit", "netProfit",
    "eps", "dps", "totalAssets", "shareholdersEquity", "grossDebt",
    "freeCashFlow", "operatingCashFlow", "ebitdaMargin", "netMargin", "roe", "roce",
]

DIVIDEND_ROW_FIELDS = ["exDate", "dividendType", "amountPerShare", "fiscalYear", "source"]

NIFTY_BATCH_FIELDS = ["indexSlug", "indexName", "companies"]
NIFTY_COMPANY_FIELDS = ["symbol", "name", "sector", "reportingType", "financials"]
NIFTY_FINANCIAL_ROW_FIELDS = ["fiscalYear", "revenueCr", "netProfitCr", "roePct"]


def check_type(value, expected_type, path):
    """Check if value has the expected type. Returns error string or None."""
    if expected_type is list:
        if not isinstance(value, list):
            return f"{path}: expected list, got {type(value).__name__}"
    elif expected_type is int:
        if not isinstance(value, int) or isinstance(value, bool):
            return f"{path}: expected int, got {type(value).__name__} = {value}"
    elif expected_type is str:
        if not isinstance(value, str):
            return f"{path}: expected string, got {type(value).__name__}"
    elif expected_type is float or expected_type is (int, float):
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            return f"{path}: expected number, got {type(value).__name__}"
    return None


def validate_file(filepath, fix=False):
    """Validate a single JSON file against its expected schema."""
    filename = filepath.name
    if filename not in SCHEMA_VERSIONS:
        return 0  # unknown file, skip

    errors = []

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"  ✗ {filename}: invalid JSON — {e}")
        return 1
    except FileNotFoundError:
        print(f"  ✗ {filename}: file not found")
        return 1

    if not isinstance(data, dict):
        print(f"  ✗ {filename}: expected object at root, got {type(data).__name__}")
        return 1

    # ── 1. Check schemaVersion ───────────────────────────────────────────
    expected_version = SCHEMA_VERSIONS[filename]
    actual_version = data.get("schemaVersion")

    if actual_version is None:
        if fix:
            data["schemaVersion"] = expected_version
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"  ~ {filename}: added schemaVersion={expected_version}")
        else:
            errors.append(f"$.schemaVersion: MISSING (expected {expected_version})")
    elif actual_version != expected_version:
        errors.append(
            f"$.schemaVersion: expected {expected_version}, got {actual_version}"
        )

    # ── 2. Check required top-level fields ───────────────────────────────
    for field_name, field_type in REQUIRED_FIELDS.get(filename, []):
        if field_name not in data:
            errors.append(f"$.{field_name}: MISSING")
            continue
        err = check_type(data[field_name], field_type, f"$.{field_name}")
        if err:
            errors.append(err)

    # ── 3. File-specific validations ─────────────────────────────────────
    if filename == "itc_price_history.json" and "days" in data:
        days = data["days"]
        if isinstance(days, list):
            for i, day in enumerate(days):
                if not isinstance(day, dict):
                    errors.append(f"$.days[{i}]: expected object, got {type(day).__name__}")
                    continue
                for field in PRICE_DAY_FIELDS:
                    if field not in day:
                        errors.append(f"$.days[{i}].{field}: MISSING")
            # Check totalDays matches
            if data.get("totalDays") and len(days) != data["totalDays"]:
                errors.append(f"$.totalDays ({data['totalDays']}) != days.length ({len(days)})")

    if filename == "itc_financials.json" and "rows" in data:
        rows = data["rows"]
        if isinstance(rows, list):
            for i, row in enumerate(rows):
                if not isinstance(row, dict):
                    continue
                for field in FINANCIAL_ROW_FIELDS:
                    if field not in row:
                        errors.append(f"$.rows[{i}].{field}: MISSING")
                # Check fiscalYear format
                fy = row.get("fiscalYear", "")
                if not re.match(r"^FY\d{4}$", str(fy)):
                    errors.append(f"$.rows[{i}].fiscalYear: expected FY2025 format, got '{fy}'")

    if filename == "itc_dividend_history.json" and "dividends" in data:
        divs = data["dividends"]
        if isinstance(divs, list):
            for i, div in enumerate(divs):
                if not isinstance(div, dict):
                    continue
                for field in DIVIDEND_ROW_FIELDS:
                    if field not in div:
                        errors.append(f"$.dividends[{i}].{field}: MISSING")

    if filename == "nifty_750_10y.json" and "batches" in data:
        batches = data["batches"]
        if isinstance(batches, list):
            seen_symbols = set()
            for bi, batch in enumerate(batches):
                for field in NIFTY_BATCH_FIELDS:
                    if field not in batch:
                        errors.append(f"$.batches[{bi}].{field}: MISSING")
                companies = batch.get("companies", [])
                if isinstance(companies, list):
                    for ci, co in enumerate(companies):
                        for field in NIFTY_COMPANY_FIELDS:
                            if field not in co:
                                errors.append(f"$.batches[{bi}].companies[{ci}].{field}: MISSING")
                        sym = co.get("symbol", "")
                        if sym in seen_symbols:
                            errors.append(f"$.batches[{bi}].companies[{ci}].symbol: duplicate '{sym}'")
                        seen_symbols.add(sym)

                        financials = co.get("financials", [])
                        if isinstance(financials, list):
                            for fi, fin in enumerate(financials):
                                for field in NIFTY_FINANCIAL_ROW_FIELDS:
                                    if field not in fin:
                                        errors.append(
                                            f"$.batches[{bi}].companies[{ci}].financials[{fi}].{field}: MISSING"
                                        )

    # ── Report ───────────────────────────────────────────────────────────
    if errors:
        print(f"  ✗ {filename}: {len(errors)} error(s)")
        for err in errors[:10]:  # Show first 10
            print(f"    • {err}")
        if len(errors) > 10:
            print(f"    ... and {len(errors) - 10} more")
        return 1
    else:
        print(f"  ✓ {filename} (v{actual_version or '?'})")
        return 0


def main():
    fix_mode = "--fix" in sys.argv

    data_files = sorted(DATA_DIR.glob("*.json"))
    if not data_files:
        print(f"No JSON files found in {DATA_DIR}")
        return 1

    print(f"Validating {len(data_files)} data files against schemas...")
    if fix_mode:
        print("  (fix mode: adding missing schemaVersion fields)\n")
    else:
        print()

    total_errors = 0
    for fpath in data_files:
        total_errors += validate_file(fpath, fix=fix_mode)

    print(f"\n{'=' * 50}")
    if total_errors == 0:
        print(f"All {len(data_files)} files valid ✓")
        return 0
    else:
        print(f"{total_errors} file(s) with errors ✗")
        print("Run with --fix to add missing schemaVersion fields")
        return 1


if __name__ == "__main__":
    sys.exit(main())
