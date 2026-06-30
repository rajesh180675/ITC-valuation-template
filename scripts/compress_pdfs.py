"""
Strip images from PDFs — keeps text layer intact, removes visual images.
Reduces typical annual report size by 50-80%.

Run: py -3.14 scripts/compress_pdfs.py [--dir COMPANY_DIR] [--all]
"""

import fitz
import os
import sys
import argparse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AR_BASE = os.path.join(BASE_DIR, "public", "data", "annual_reports")


def strip_images(pdf_path, dry_run=False):
    """Strip image streams from a PDF. Returns (size_before, size_after, images_stripped)."""
    size_before = os.path.getsize(pdf_path)

    # Minimal valid 1x1 white JPEG (~600 bytes) to replace images
    # PDF needs a valid image xobject, not an empty stream
    WHITE_JPEG = (
        b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
        b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
        b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),\x01\x02\x03\x04'
        b'\x05\x06\x07\x08\t\n\x0b\xff\xc0\x00\x0b\x08\x00\x01\x00\x01'
        b'\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01'
        b'\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04'
        b'\x05\x06\x07\x08\t\n\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03'
        b'\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01}\x01\x02\x03\x00'
        b'\x04\x11\x05\x12!1A\x06\x13Qa\x07"q\x142\x81\x91\xa1\x08#B'
        b'\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16\x17\x18\x19\x1a%&\'()*'
        b'456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x83\x84\x85\x86\x87'
        b'\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4'
        b'\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba'
        b'\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7'
        b'\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2'
        b'\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x08\x01\x01\x00'
        b'\x00?\x00\xfb\xd4P\x00\x00\x00\x1f\xff\xd9'
    )

    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"  Cannot open: {e}")
        return size_before, size_before, 0

    images_stripped = 0
    seen_xrefs = set()

    for page in doc:
        for img_info in page.get_images(full=True):
            xref = img_info[0]
            if xref in seen_xrefs:
                continue
            seen_xrefs.add(xref)
            try:
                doc.update_stream(xref, WHITE_JPEG)
                images_stripped += 1
            except Exception:
                pass

    if dry_run:
        doc.close()
        return size_before, size_before, images_stripped

    tmp_path = pdf_path + ".tmp"
    doc.save(
        tmp_path,
        garbage=4,
        deflate=True,
        clean=True,
    )
    doc.close()

    size_after = os.path.getsize(tmp_path)

    if size_after < size_before:
        os.replace(tmp_path, pdf_path)
    else:
        os.remove(tmp_path)
        size_after = size_before

    return size_before, size_after, images_stripped


def compress_dir(company_dir, verbose=True):
    """Compress all PDFs in a company directory."""
    if not os.path.isdir(company_dir):
        print(f"  Not found: {company_dir}")
        return 0, 0

    pdfs = sorted(f for f in os.listdir(company_dir) if f.endswith(".pdf"))
    if not pdfs:
        print(f"  No PDFs in {company_dir}")
        return 0, 0

    total_before = 0
    total_after = 0

    for fname in pdfs:
        path = os.path.join(company_dir, fname)
        result = strip_images(path)
        before, after, stripped = result
        total_before += before
        total_after += after
        saved_pct = 100 * (before - after) // max(before, 1)
        if verbose:
            print(f"  {fname}: {before//1024}KB -> {after//1024}KB ({saved_pct}% saved, {stripped} images stripped)")

    return total_before, total_after


def main():
    parser = argparse.ArgumentParser(description="Strip images from AR PDFs")
    parser.add_argument("--dir", help="Single company dir name (e.g. HDFCBANK)")
    parser.add_argument("--all", action="store_true", help="Process all company dirs")
    args = parser.parse_args()

    if args.dir:
        company_dir = os.path.join(AR_BASE, args.dir)
        print(f"\n=== {args.dir} ===")
        before, after = compress_dir(company_dir)
        print(f"  Total: {before//1024//1024}MB -> {after//1024//1024}MB ({100*(before-after)//max(before,1)}% saved)")

    elif args.all:
        grand_before = 0
        grand_after = 0
        for company in sorted(os.listdir(AR_BASE)):
            company_dir = os.path.join(AR_BASE, company)
            if not os.path.isdir(company_dir):
                continue
            print(f"\n=== {company} ===")
            before, after = compress_dir(company_dir)
            saved_pct = 100 * (before - after) // max(before, 1)
            print(f"  Subtotal: {before//1024//1024}MB -> {after//1024//1024}MB ({saved_pct}% saved)")
            grand_before += before
            grand_after += after

        print(f"\n=== GRAND TOTAL ===")
        saved = grand_before - grand_after
        print(f"  {grand_before//1024//1024}MB -> {grand_after//1024//1024}MB ({saved//1024//1024}MB freed, {100*saved//max(grand_before,1)}% saved)")

    else:
        # Default: compress everything
        print("Compressing all company PDFs (strip images, keep text)...\n")
        grand_before = 0
        grand_after = 0
        for company in sorted(os.listdir(AR_BASE)):
            company_dir = os.path.join(AR_BASE, company)
            if not os.path.isdir(company_dir):
                continue
            pdfs = [f for f in os.listdir(company_dir) if f.endswith(".pdf")]
            if not pdfs:
                continue
            print(f"=== {company} ({len(pdfs)} PDFs) ===")
            before, after = compress_dir(company_dir)
            saved_pct = 100 * (before - after) // max(before, 1)
            print(f"  {before//1024//1024}MB -> {after//1024//1024}MB ({saved_pct}% saved)\n")
            grand_before += before
            grand_after += after

        saved = grand_before - grand_after
        print(f"=== TOTAL: {grand_before//1024//1024}MB -> {grand_after//1024//1024}MB ({saved//1024//1024}MB freed) ===")


if __name__ == "__main__":
    main()
