#!/usr/bin/env python3
"""
Extract ITC standalone segment reporting from annual reports.

The ITC segment note is a text-heavy PDF table whose x positions vary across
years. This parser anchors on section headings and known segment labels, then
maps the following numeric sequence according to the active section.
"""

from __future__ import annotations

import json
import math
import os
import re
import time
from collections import defaultdict
from typing import Any

import fitz


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
PDF_DIR = os.path.join(ROOT, "public", "data", "annual_reports")
OUTPUT = os.path.join(ROOT, "public", "data", "segment_data_itc.json")

YEARS = range(2016, 2026)
SECTIONS = ("revenue", "results", "assets", "liabilities")

LABEL_ALIASES = [
    ("FMCG - Cigarettes", [r"^fmcg\s*[-–]\s*cigarettes$"]),
    ("FMCG - Others", [r"^fmcg\s*[-–]\s*others$", r"^-others(?:\s*\[.*\])?$"]),
    ("FMCG - Total", [r"^fmcg\s*[-–]\s*total$", r"^total\s+fmcg$"]),
    ("Hotels", [r"^hotels(?:\s*\[.*\])?$"]),
    ("Agri Business", [r"^agri\s+business$"]),
    ("Paperboards, Paper and Packaging", [r"^paperboards,\s*paper\s+(?:and|&)\s+packaging$"]),
    ("Others", [r"^others$"]),
    ("Segment Total", [r"^segment\s+total$"]),
    ("Eliminations", [r"^eliminations$"]),
    ("Unallocated Corporate Assets/Liabilities", [r"^unallocated\s+corporate\s+assets/liabilities$"]),
    ("Unallocated Corporate Assets/Liabilities", [r"^unallocated\s+corporate\s+assets$"]),
    ("Unallocated Corporate Assets/Liabilities", [r"^unallocated\s+corporate\s+liabilities$"]),
    ("Discontinued Operations", [r"^discontinued\s+operations(?:\s*\[.*\])?$"]),
    ("Total", [r"^total$"]),
]

NOISE_LABEL_PREFIXES = (
    "gross revenue",
    "segment revenue - net",
    "profit before tax",
    "profit for the year",
    "capital expenditure",
    "depreciation",
    "non cash",
    "exceptional items",
)


def normalize_text(value: str) -> str:
    value = value.replace("\u2013", "-").replace("\u2014", "-")
    value = value.replace("\u00a0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize_label(value: str) -> str | None:
    text = normalize_text(value)
    text = re.sub(r"\s*\[.*?\]", "", text)
    text = re.sub(r"\s*\((?:refer|note).*?\)", "", text, flags=re.I)
    text = re.split(r"\s+\(?-?\d", text, maxsplit=1)[0]
    text = re.sub(r"\s+\(?-?\d[\d,]*(?:\.\d+)?\)?(?:\s+\(?-?\d[\d,]*(?:\.\d+)?\)?)*\s*$", "", text)
    text = re.sub(r"^[a-z]\)\s*", "", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip(" :")
    lower = text.lower()

    if any(lower.startswith(prefix) for prefix in NOISE_LABEL_PREFIXES):
        return None

    for label, patterns in LABEL_ALIASES:
        if any(re.match(pattern, lower, flags=re.I) for pattern in patterns):
            return label
    return None


def parse_number(value: str) -> float | None:
    raw = normalize_text(value)
    raw = raw.replace(",", "")
    raw = raw.replace("(", "-").replace(")", "")
    raw = raw.replace("`", "").replace("₹", "").replace("'", "")
    if raw in {"", "-", "\u2013", "\u2014"}:
        return None
    if not re.fullmatch(r"-?\d+(?:\.\d+)?", raw):
        return None
    number = round(float(raw), 2)
    return number if math.isfinite(number) else None


def numbers_from_line(line: str) -> list[float]:
    values: list[float] = []
    for token in re.findall(r"\(?-?\d[\d,]*(?:\.\d+)?\)?", line):
        value = parse_number(token)
        if value is not None:
            values.append(value)
    return values


def text_lines(page: fitz.Page) -> list[str]:
    lines: list[str] = []
    for raw in page.get_text().splitlines():
        line = normalize_text(raw)
        if line:
            lines.append(line)
    return lines


def is_standalone_segment_page(text: str) -> bool:
    lower = text.lower()
    if "notes to the consolidated financial statements" in lower:
        return False
    has_revenue = "segment revenue - gross" in lower or "1. segment revenue" in lower
    has_names = all(name in lower for name in ["fmcg", "agri business", "paperboards"])
    has_results = re.search(r"segment\s+results", lower) is not None
    return has_revenue and has_results and has_names


def find_segment_note_page(doc: fitz.Document) -> int | None:
    candidates: list[tuple[int, int]] = []
    for index in range(len(doc)):
        text = doc[index].get_text()
        lower = text.lower()
        if not is_standalone_segment_page(text):
            continue
        score = 0
        if "notes to the standalone financial statements" in lower:
            score += 5
        if "notes to the financial statements" in lower:
            score += 3
        if "other information" in lower:
            score += 2
        if "segment assets" in lower and "segment liabilities" in lower:
            score += 2
        if "notes to the consolidated financial statements" in lower:
            score -= 20
        candidates.append((score, index))

    if not candidates:
        return None
    candidates.sort(reverse=True)
    return candidates[0][1]


def collect_row_numbers(lines: list[str], start: int) -> tuple[list[float], int]:
    label_line = re.sub(r"\s*\[.*?\]", "", lines[start])
    label_line = re.sub(r"\s*\((?:refer|note).*?\)", "", label_line, flags=re.I)
    values: list[float] = numbers_from_line(label_line)
    index = start + 1
    while index < len(lines):
        line = lines[index]
        lower = line.lower()
        if detect_section(line) is not None:
            break
        if normalize_label(line) is not None:
            break
        nums = numbers_from_line(line)
        if nums:
            values.extend(nums)
        elif line in {"-", "\u2013", "\u2014"}:
            pass
        elif values:
            break
        index += 1
    return values, index


def detect_section(line: str) -> str | None:
    lower = line.lower()
    if "segment revenue - gross" in lower or re.search(r"\b1\.\s*segment revenue\b", lower):
        return "revenue"
    if "segment revenue - net" in lower:
        return "skip"
    if re.search(r"segment\s+results", lower):
        return "results"
    if "other information" in lower:
        return "other"
    return None


def map_revenue_values(values: list[float], fy_current: int, fy_prior: int) -> dict[str, float]:
    if len(values) >= 6:
        return {f"FY{fy_current}": values[2], f"FY{fy_prior}": values[5]}
    if len(values) >= 4:
        return {f"FY{fy_current}": values[1], f"FY{fy_prior}": values[3]}
    if len(values) >= 2:
        return {f"FY{fy_current}": values[0], f"FY{fy_prior}": values[1]}
    return {}


def map_two_year_values(values: list[float], fy_current: int, fy_prior: int) -> dict[str, float]:
    if len(values) < 2:
        return {}
    return {f"FY{fy_current}": values[0], f"FY{fy_prior}": values[1]}


def map_other_values(values: list[float], fy_current: int, fy_prior: int) -> tuple[dict[str, float], dict[str, float]]:
    if len(values) < 4:
        return {}, {}
    assets = {f"FY{fy_current}": values[0], f"FY{fy_prior}": values[2]}
    liabilities = {f"FY{fy_current}": values[1], f"FY{fy_prior}": values[3]}
    return assets, liabilities


def update_series(target: dict[str, dict[str, float]], section: str, label: str, values: dict[str, float]) -> None:
    if not values:
        return
    key = f"{section}|{label}"
    target.setdefault(key, {}).update(values)


def parse_segment_page(page: fitz.Page, fy_current: int, fy_prior: int) -> tuple[dict[str, dict[str, float]], list[str]]:
    lines = text_lines(page)
    series: dict[str, dict[str, float]] = {}
    warnings: list[str] = []
    section: str | None = None
    pending_numeric_labels: list[str] = []
    last_label_by_section: dict[str, str] = {}

    index = 0
    while index < len(lines):
        line = lines[index]
        detected = detect_section(line)
        if detected == "skip":
            section = None
            index += 1
            continue
        if detected:
            section = detected
            pending_numeric_labels = []
            index += 1
            continue

        label = normalize_label(line)
        if label is None and line.lower() in {"3.", "3"}:
            section = "other"
            index += 1
            continue

        if label is not None and section:
            values, next_index = collect_row_numbers(lines, index)
            if not values:
                if label != "Total":
                    warnings.append(f"FY{fy_current}: no values for {section} row {label}")
                index = max(next_index, index + 1)
                continue

            if section == "revenue":
                update_series(series, "revenue", label, map_revenue_values(values, fy_current, fy_prior))
                if label == "Segment Total":
                    pending_numeric_labels = ["Eliminations", "Total"]
            elif section == "results":
                update_series(series, "results", label, map_two_year_values(values, fy_current, fy_prior))
                if label == "Segment Total":
                    pending_numeric_labels = ["Eliminations", "Total"]
            elif section == "other":
                assets, liabilities = map_other_values(values, fy_current, fy_prior)
                update_series(series, "assets", label, assets)
                update_series(series, "liabilities", label, liabilities)

            last_label_by_section[section] = label
            index = max(next_index, index + 1)
            continue

        values = numbers_from_line(line)
        if values and section in {"revenue", "results"} and pending_numeric_labels:
            label = pending_numeric_labels.pop(0)
            mapper = map_revenue_values if section == "revenue" else map_two_year_values
            update_series(series, section, label, mapper(values, fy_current, fy_prior))
        elif values and section == "other" and last_label_by_section.get("other") == "Segment Total":
            if len(values) >= 4:
                update_series(series, "assets", "Unallocated Corporate Assets/Liabilities", {f"FY{fy_current}": values[0], f"FY{fy_prior}": values[2]})
                update_series(series, "liabilities", "Unallocated Corporate Assets/Liabilities", {f"FY{fy_current}": values[1], f"FY{fy_prior}": values[3]})
                last_label_by_section["other"] = "Unallocated Corporate Assets/Liabilities"

        index += 1

    return series, warnings


def merge_series(target: dict[str, dict[str, float]], extracted: dict[str, dict[str, float]]) -> None:
    for key, values in extracted.items():
        target.setdefault(key, {}).update(values)


def coverage_by_section(series: dict[str, dict[str, float]]) -> dict[str, dict[str, Any]]:
    coverage: dict[str, dict[str, Any]] = {}
    for section in SECTIONS:
        items = {k: v for k, v in series.items() if k.startswith(f"{section}|")}
        years = sorted({fy for values in items.values() for fy in values})
        coverage[section] = {"items": len(items), "years": years}
    return coverage


def validate_output(series: dict[str, dict[str, float]]) -> list[str]:
    warnings: list[str] = []
    for key, values in series.items():
        if key.startswith(("assets|Gross Revenue", "liabilities|Gross Revenue", "revenue|Gross Revenue")):
            warnings.append(f"Bad gross-revenue key: {key}")
        for fy, value in values.items():
            if not isinstance(value, (int, float)) or not math.isfinite(value):
                warnings.append(f"Non-finite value at {key} {fy}: {value}")

    required = [
        "revenue|FMCG - Cigarettes",
        "revenue|FMCG - Others",
        "revenue|Agri Business",
        "revenue|Paperboards, Paper and Packaging",
        "results|FMCG - Cigarettes",
        "assets|FMCG - Cigarettes",
        "liabilities|FMCG - Cigarettes",
    ]
    for key in required:
        if len(series.get(key, {})) < 8:
            warnings.append(f"Low coverage for {key}: {len(series.get(key, {}))} years")
    return warnings


def main() -> None:
    all_series: dict[str, dict[str, float]] = {}
    source_pages_by_year: dict[str, int] = {}
    warnings: list[str] = []

    for year in YEARS:
        path = os.path.join(PDF_DIR, f"ITC_AR_{year}.pdf")
        if not os.path.exists(path):
            warnings.append(f"FY{year}: missing PDF {path}")
            continue

        print(f"FY{year}...", end=" ", flush=True)
        doc = fitz.open(path)
        try:
            note_page = find_segment_note_page(doc)
            if note_page is None:
                print("no standalone segment note found", flush=True)
                warnings.append(f"FY{year}: no standalone segment note found")
                continue

            extracted, year_warnings = parse_segment_page(doc[note_page], year, year - 1)
            merge_series(all_series, extracted)
            warnings.extend(year_warnings)
            source_pages_by_year[f"FY{year}"] = note_page + 1
            counts = {section: len([k for k in extracted if k.startswith(f"{section}|")]) for section in SECTIONS}
            print(f"page {note_page + 1} {counts}", flush=True)
        finally:
            doc.close()

    warnings.extend(validate_output(all_series))
    all_series = {key: dict(sorted(values.items(), key=lambda item: int(item[0][2:]))) for key, values in sorted(all_series.items())}

    output = {
        "symbol": "ITC",
        "basis": "standalone",
        "source": "ITC Annual Reports (itcportal.com), Segment Reporting notes",
        "method": "PyMuPDF line-sequence extraction anchored on standalone segment labels",
        "notes": "Values in Rs. Crores. FY2015 values are prior-year comparatives from FY2016 where provided.",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sourcePagesByYear": source_pages_by_year,
        "coverageBySection": coverage_by_section(all_series),
        "warnings": warnings,
        "segment_time_series": all_series,
    }

    with open(OUTPUT, "w", encoding="utf-8") as handle:
        json.dump(output, handle, indent=2)

    print(f"\nSaved to {OUTPUT}", flush=True)
    if warnings:
        print("\nWarnings:", flush=True)
        for warning in warnings:
            print(f"  - {warning}", flush=True)


if __name__ == "__main__":
    main()
