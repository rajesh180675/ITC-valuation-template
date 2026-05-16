"""
Scrape Airtel IR page: interact with year dropdown + accordions to extract all PDF links.
"""
import json, os, re, sys, time
from playwright.sync_api import sync_playwright

BASE_DIR = r"C:\Users\rajesh\WindsurfAPI\ITC-valuation-template"

def scrape_airtel_ar_links(output_file):
    """Navigate to Airtel IR page, click through years, extract PDF links."""
    all_links = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(20000)

        try:
            page.goto(
                "https://www.airtel.in/about-bharti/equity/results/annual-results",
                wait_until="domcontentloaded",
                timeout=30000,
            )
            page.wait_for_timeout(3000)

            # The page has a custom year dropdown implemented via JS.
            # Let's try to understand the select mechanism by inspecting the DOM.

            # First, check if there's a native select or custom dropdown
            has_native = page.locator("select").count()
            print(f"Native selects: {has_native}")

            # Look for the year selector element
            # The label says "SELECT YEAR" and there's a textbox + clickable area
            # Try clicking the text box area (ref=e40 from our snapshot)
            yr_selector = page.locator('[class*="year"], [class*="Year"], .select-selected, .custom-select').first
            if yr_selector.is_visible():
                print("Found year selector, clicking...")
                yr_selector.click()
                page.wait_for_timeout(1000)

                # After click, see if dropdown items appeared
                dropdown_items = page.locator(".select-items li, .select-items div, [class*='option']")
                n_items = dropdown_items.count()
                print(f"Dropdown items: {n_items}")
                for i in range(min(n_items, 30)):
                    txt = dropdown_items.nth(i).text_content().strip()
                    print(f"  [{i}] {txt}")

            # Try alternative: find the text field, click it, type to filter
            tb = page.locator('input[type="text"]').first
            if tb.is_visible():
                print(f"Textbox found: {tb.get_attribute('id')}")
                tb.click()
                page.wait_for_timeout(300)
                tb.fill("2023")
                page.wait_for_timeout(500)
                # Check if suggestions appeared
                suggestions = page.locator("[class*='suggestion'], [class*='dropdown']").first
                if suggestions.is_visible():
                    print(f"Suggestion visible: {suggestions.text_content()[:200]}")

            # Check the page HTML overall
            html = page.content()

            # Look for year data embedded in JS or HTML
            # Some sites embed year data in <script> tags
            scripts = page.locator("script").all()
            print(f"\nScript tags: {len(scripts)}")

            # Check for any <button> with year text
            all_buttons = page.locator("button").all()
            year_buttons = []
            for btn in all_buttons:
                txt = btn.text_content().strip()
                if re.match(r"\d{4}", txt):
                    print(f"  Year button: '{txt[:80]}'")
                    year_buttons.append(txt)

            return {"links": all_links, "buttons": year_buttons}

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            return {"links": all_links, "buttons": []}
        finally:
            browser.close()


def scrape_v2(output_file):
    """
    V2 approach: Directly interact with all accordion panels.
    The page may have all years loaded in the DOM, just hidden.
    """
    all_links = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(30000)

        try:
            page.goto(
                "https://www.airtel.in/about-bharti/equity/results/annual-results",
                wait_until="domcontentloaded",
                timeout=30000,
            )
            page.wait_for_timeout(5000)

            # Full page diagnostics
            print("=== Page Diagnostics ===")

            # Check all buttons
            btns = page.locator("button").all()
            print(f"\nTotal buttons: {len(btns)}")
            for i, btn in enumerate(btns):
                txt = btn.text_content().strip()[:100]
                html = btn.evaluate("el => el.outerHTML")
                visible = btn.is_visible()
                print(f"  [{i}] '{txt}' visible={visible}")

            # Check all <a> tags linking to PDFs
            pdf_links = page.locator('a[href$=".pdf"]')
            print(f"\nPDF links on page: {pdf_links.count()}")
            for i in range(pdf_links.count()):
                try:
                    href = pdf_links.nth(i).get_attribute("href")
                    txt = pdf_links.nth(i).text_content()[:80]
                    print(f"  [{i}] {txt}: {href}")
                    all_links.append({"text": txt, "url": href})
                except:
                    pass

            # Try clicking any and all "Annual Report" accordions
            ar_btns = page.locator("button").filter(has_text="Annual Report")
            n_ar = ar_btns.count()
            print(f"\n'Annual Report' accordions: {n_ar}")
            for i in range(n_ar):
                try:
                    ar_btns.nth(i).click()
                    page.wait_for_timeout(500)
                except:
                    pass

            # After all accordions open, try extracting PDFs again
            pdf_links2 = page.locator('a[href$=".pdf"]')
            print(f"\nPDF links after accordion click: {pdf_links2.count()}")
            for i in range(pdf_links2.count()):
                try:
                    href = pdf_links2.nth(i).get_attribute("href")
                    txt = pdf_links2.nth(i).text_content()[:80]
                    print(f"  [{i}] {txt}: {href}")
                except:
                    pass

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

    return all_links


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "v2"
    if mode == "v1":
        result = scrape_airtel_ar_links("")
    else:
        result = scrape_v2("")

    if result:
        out = os.path.join(BASE_DIR, "scripts", "airtel_scrape_result.json")
        with open(out, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\nSaved: {out}")
