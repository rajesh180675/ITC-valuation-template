#!/usr/bin/env python3
"""
ProQuest Annual Report Downloader
==================================
Automates ProQuest search and PDF download using Playwright.

Usage:
    python scripts/proquest_downloader.py --ticker TCS --years 5
    python scripts/proquest_downloader.py --ticker RELIANCE --all-years
    python scripts/proquest_downloader.py --batch tickers.json

Credentials are read from environment variables or .env file:
    PROQUEST_USERNAME=your_username
    PROQUEST_PASSWORD=your_password

Or pass directly (not recommended for production):
    python scripts/proquest_downloader.py --ticker TCS --username carnmell --password welcome
"""
import argparse
import json
import os
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright


# Configuration
PROQUEST_BASE = 'https://www.proquest.com'
ACCOUNT_ID = '9902'  # Carnegie Mellon University
PDF_DIR = Path('public/data/annual_reports')
SEARCH_DELAY = 3  # seconds between searches
DOWNLOAD_DELAY = 5  # seconds between downloads

# Ticker to company name mapping
COMPANY_NAMES = {
    'TCS': 'Tata Consultancy Services',
    'RELIANCE': 'Reliance Industries',
    'ITC': 'ITC Limited',
    'HDFCBANK': 'HDFC Bank',
    'INFY': 'Infosys',
    'WIPRO': 'Wipro',
    'HCLTECH': 'HCL Technologies',
    'TECHM': 'Tech Mahindra',
    'TATAMOTORS': 'Tata Motors',
    'TATASTEEL': 'Tata Steel',
    'BAJFINANCE': 'Bajaj Finance',
    'BAJAJFINSV': 'Bajaj Finserv',
    'ICICIBANK': 'ICICI Bank',
    'KOTAKBANK': 'Kotak Mahindra Bank',
    'SBIN': 'State Bank of India',
    'AXISBANK': 'Axis Bank',
    'MARUTI': 'Maruti Suzuki',
    'M&M': 'Mahindra & Mahindra',
    'TITAN': 'Titan Company',
    'ASIANPAINT': 'Asian Paints',
    'HINDUNILVR': 'Hindustan Unilever',
    'NESTLEIND': 'Nestle India',
    'BRITANNIA': 'Britannia Industries',
    'DABUR': 'Dabur India',
    'GODREJCP': 'Godrej Consumer Products',
    'PIDILITIND': 'Pidilite Industries',
    'VOLTAS': 'Voltas',
    'CROMPTON': 'Crompton Greaves Consumer',
    'HAVELLS': 'Havells India',
    'BERGEPAINT': 'Berger Paints',
}


def get_credentials(username=None, password=None):
    """Get ProQuest credentials from args, env, or .env file."""
    if username and password:
        return username, password

    # Try environment variables
    if os.environ.get('PROQUEST_USERNAME') and os.environ.get('PROQUEST_PASSWORD'):
        return os.environ['PROQUEST_USERNAME'], os.environ['PROQUEST_PASSWORD']

    # Try .env file
    env_file = Path('.env')
    if env_file.exists():
        env_vars = {}
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()

        if 'PROQUEST_USERNAME' in env_vars and 'PROQUEST_PASSWORD' in env_vars:
            return env_vars['PROQUEST_USERNAME'], env_vars['PROQUEST_PASSWORD']

    raise ValueError(
        'ProQuest credentials not found. '
        'Provide via --username/--password, environment variables, or .env file.'
    )


def login_to_proquest(page, username, password):
    """Login to ProQuest via CMU SSO."""
    print('Navigating to ProQuest...')
    page.goto(f'{PROQUEST_BASE}/?accountid={ACCOUNT_ID}', timeout=30000)
    page.wait_for_timeout(3000)

    # Check if already logged in
    if 'search' in page.url or 'proquest.com/search' in page.url:
        print('Already logged in!')
        return True

    # Try to click login if not redirected to SSO
    if 'login' in page.url.lower() or 'signin' in page.url.lower():
        print('On login page, attempting login...')
        try:
            page.fill('input[name="username"]', username)
            page.fill('input[name="password"]', password)
            page.click('button[type="submit"]')
            page.wait_for_timeout(5000)
        except Exception as e:
            print(f'Login form not found: {e}')

    # If redirected to CMU SSO, fill credentials there
    if 'login.cmu.edu' in page.url or 'shibboleth' in page.url.lower():
        print('CMU SSO detected, filling credentials...')
        try:
            # Wait for the login form to appear
            page.wait_for_selector('input[name="username"], input[name="j_username"], input[id="username"]', timeout=10000)

            # Try different possible username field selectors
            for selector in ['input[name="username"]', 'input[name="j_username"]', 'input[id="username"]']:
                try:
                    page.fill(selector, username)
                    print(f'Filled username using {selector}')
                    break
                except:
                    continue

            for selector in ['input[name="password"]', 'input[name="j_password"]', 'input[id="password"]']:
                try:
                    page.fill(selector, password)
                    print(f'Filled password using {selector}')
                    break
                except:
                    continue

            # Submit the form
            for selector in ['button[type="submit"]', 'input[type="submit"]', 'button.login-button']:
                try:
                    page.click(selector)
                    print(f'Clicked submit using {selector}')
                    break
                except:
                    continue

            page.wait_for_timeout(5000)

        except Exception as e:
            print(f'SSO login failed: {e}')

    # Wait for redirect back to ProQuest
    page.wait_for_timeout(5000)

    # Verify login success
    if 'proquest.com' in page.url and 'login' not in page.url.lower():
        print('Login successful!')
        return True
    else:
        print(f'Login may have failed. Current URL: {page.url}')
        return False


def search_proquest(page, company_name, document_type='Annual Report'):
    """Search ProQuest for annual reports."""
    print(f'Searching for "{company_name}" {document_type}...')

    # Navigate to search page
    page.goto(f'{PROQUEST_BASE}/search', timeout=30000)
    page.wait_for_timeout(3000)

    # Fill search box
    search_query = f'{company_name} {document_type}'
    try:
        page.fill('input[type="search"], input[name="q"]', search_query)
        page.press('input[type="search"], input[name="q"]', 'Enter')
        page.wait_for_timeout(5000)
    except Exception as e:
        print(f'Search form error: {e}')
        return []

    # Apply filters: Document Type = Annual Report
    try:
        # Click on Document Type filter
        page.click('text="Document Type"', timeout=10000)
        page.wait_for_timeout(2000)
        page.click('text="Annual Report"', timeout=10000)
        page.wait_for_timeout(3000)
    except Exception as e:
        print(f'Filter error: {e}')

    # Extract search results
    results = []
    try:
        # Wait for results to load
        page.wait_for_selector('[data-testid="search-result"]', timeout=15000)

        # Get all result items
        results_elements = page.query_selector_all('[data-testid="search-result"]')

        for elem in results_elements[:20]:  # Limit to first 20 results
            try:
                title = elem.query_selector('h3, [data-testid="result-title"]').inner_text()
                link = elem.query_selector('a')
                if link:
                    href = link.get_attribute('href')
                    # Extract document ID from URL
                    doc_id_match = re.search(r'/docview/(\d+)', href)
                    if doc_id_match:
                        doc_id = doc_id_match.group(1)
                        # Extract year from title
                        year_match = re.search(r'(\d{4})', title)
                        year = year_match.group(1) if year_match else None
                        results.append({
                            'title': title,
                            'doc_id': doc_id,
                            'year': year,
                            'url': f'{PROQUEST_BASE}/docview/{doc_id}',
                        })
            except Exception as e:
                print(f'Error parsing result: {e}')
                continue

    except Exception as e:
        print(f'Results extraction error: {e}')

    print(f'Found {len(results)} results')
    return results


def download_pdf(page, doc_id, output_path):
    """Download PDF for a specific document."""
    print(f'Downloading document {doc_id}...')

    pdf_url = f'{PROQUEST_BASE}/docview/{doc_id}/fulltextPDF?accountid={ACCOUNT_ID}'

    # Navigate to PDF URL
    page.goto(pdf_url, timeout=60000)
    page.wait_for_timeout(3000)

    # Check if we got a PDF or an error page
    content_type = page.evaluate('() => document.contentType')
    if 'pdf' in content_type.lower():
        # PDF is displayed, download it
        page.pdf(path=output_path)
        print(f'Saved PDF to {output_path}')
        return True
    else:
        # Try alternative download method
        try:
            with page.expect_download(timeout=30000) as download_info:
                page.goto(pdf_url)
            download = download_info.value
            download.save_as(output_path)
            print(f'Downloaded PDF to {output_path}')
            return True
        except Exception as e:
            print(f'Download failed: {e}')
            return False


def run_pipeline(tickers, years=None, username=None, password=None, headless=True):
    """Main pipeline: search and download annual reports."""
    PDF_DIR.mkdir(parents=True, exist_ok=True)

    username, password = get_credentials(username, password)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            viewport={'width': 1280, 'height': 720},
        )
        page = context.new_page()

        # Login to ProQuest
        if not login_to_proquest(page, username, password):
            print('Login failed. Exiting.')
            browser.close()
            return

        for ticker in tickers:
            company_name = COMPANY_NAMES.get(ticker.upper(), ticker)
            print(f'\n{"="*60}')
            print(f'Processing {ticker} ({company_name})')
            print(f'{"="*60}')

            # Search for annual reports
            results = search_proquest(page, company_name)

            # Filter by year if specified
            if years:
                current_year = 2025
                target_years = [str(y) for y in range(current_year - years + 1, current_year + 1)]
                results = [r for r in results if r['year'] in target_years]

            # Download PDFs
            for result in results:
                year = result['year'] or 'unknown'
                filename = f'{ticker}_AR_{year}.pdf'
                output_path = PDF_DIR / filename

                if output_path.exists():
                    print(f'Skipping {filename} (already exists)')
                    continue

                success = download_pdf(page, result['doc_id'], output_path)
                if success:
                    print(f'  Downloaded: {filename}')
                else:
                    print(f'  Failed to download: {filename}')

                time.sleep(DOWNLOAD_DELAY)

            time.sleep(SEARCH_DELAY)

        browser.close()

    print('\nPipeline complete!')
    print(f'PDFs saved to: {PDF_DIR.absolute()}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='ProQuest Annual Report Downloader')
    parser.add_argument('--ticker', help='Single ticker (e.g., TCS)')
    parser.add_argument('--tickers', nargs='+', help='List of tickers')
    parser.add_argument('--batch', help='JSON file with list of tickers')
    parser.add_argument('--years', type=int, help='Number of recent years to download')
    parser.add_argument('--all-years', action='store_true', help='Download all available years')
    parser.add_argument('--username', help='ProQuest username')
    parser.add_argument('--password', help='ProQuest password')
    parser.add_argument('--headed', action='store_true', help='Run browser in headed mode (for debugging)')

    args = parser.parse_args()

    # Determine tickers to process
    tickers = []
    if args.ticker:
        tickers = [args.ticker]
    elif args.tickers:
        tickers = args.tickers
    elif args.batch:
        with open(args.batch) as f:
            tickers = json.load(f)

    if not tickers:
        parser.error('Provide --ticker, --tickers, or --batch')

    run_pipeline(
        tickers=tickers,
        years=args.years if not args.all_years else None,
        username=args.username,
        password=args.password,
        headless=not args.headed,
    )
