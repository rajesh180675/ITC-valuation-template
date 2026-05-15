#!/usr/bin/env python3
"""
Parse ProQuest Index PDF and Extract URLs/IDs
"""
import fitz
import re
from pathlib import Path

pdf_path = "public/data/annual_reports/ProQuestDocuments-2026-05-15.pdf"
doc = fitz.open(pdf_path)

results = []
current = {}

for page_num in range(len(doc)):
    text = doc[page_num].get_text()
    
    # Look for "Document type: Annual Report" to filter
    if "Document type:" in text and "Annual Report" not in text.split("Document type:")[1].split("\n")[0]:
        continue

    # Extract Year
    year_match = re.search(r"Publication year:\s*(\d{4})", text)
    if year_match:
        current["year"] = year_match.group(1)

    # Extract ProQuest Document ID
    id_match = re.search(r"ProQuest document ID:\s*(\d+)", text)
    if id_match:
        current["doc_id"] = id_match.group(1)

    # Extract URL (sometimes split across lines)
    url_match = re.search(r"Document URL:\s*(https://[^\s]+)", text.replace("\n", " "))
    if url_match:
        current["url"] = url_match.group(1)

    # If we have year and id, save and reset
    if "year" in current and "doc_id" in current:
        results.append(current.copy())
        current = {}

doc.close()

# Clean and print
print(f"Found {len(results)} records.")
for r in results:
    print(f"Year: {r['year']}, ID: {r['doc_id']}")

# Save to JSON
import json
Path("scripts/tcs_proquest_index.json").parent.mkdir(exist_ok=True)
with open("scripts/tcs_proquest_index.json", "w") as f:
    json.dump(results, f, indent=2)
print("Saved to scripts/tcs_proquest_index.json")
