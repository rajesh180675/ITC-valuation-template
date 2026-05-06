# ITC-valuation-template

## Nifty 750 Data Hub JSON feed

The Nifty 750 Data Hub loads its dataset from:

`public/data/nifty_750_10y.json`

The app now supports two dataset contracts:

- **Schema v1**: legacy deterministic synthetic demo feed.
- **Schema v2**: official-source feed for current constituents, with provenance, partial-history support, nullable unavailable values, and quality flags.

Production official datasets should use schema v2 with:

```json
{
  "generatedAt": "ISO-8601 timestamp",
  "asOfDate": "YYYY-MM-DD",
  "source": "real",
  "sourcePolicy": "official-only",
  "schemaVersion": 2,
  "fiscalYears": ["FY2024", "FY2025"],
  "provenance": {
    "universe": {
      "sourceName": "NSE Indices",
      "sourceType": "official_index_constituent_file",
      "asOfDate": "YYYY-MM-DD",
      "licenseBasis": "official/licensed source pack"
    },
    "financials": [],
    "marketData": []
  },
  "batches": [
    {
      "indexSlug": "niftylargemidcap250 | niftysmallcap250 | niftymicrocap250",
      "indexName": "string",
      "asOfDate": "YYYY-MM-DD",
      "constituentCount": 250,
      "constituentSource": {
        "sourceName": "NSE Indices",
        "sourceType": "official_index_constituent_file"
      },
      "companies": [
        {
          "symbol": "string",
          "name": "string",
          "isin": "string",
          "sector": "string",
          "industry": "string",
          "reportingType": "financial | nonFinancial",
          "listingExchange": "NSE | BSE | NSE+BSE",
          "source": "real",
          "officialProfileSource": {
            "sourceName": "NSE Indices"
          },
          "qualityFlags": [],
          "financials": [
            {
              "fiscalYear": "FY2025",
              "periodEndDate": "YYYY-MM-DD",
              "statementType": "consolidated | standalone",
              "revenueCr": 0,
              "netProfitCr": 0,
              "shareholdersEquityCr": 0,
              "totalDebtCr": 0,
              "roePct": 0,
              "debtToEquity": 0,
              "marketCapCr": 0,
              "pe": 0,
              "pb": 0,
              "marketDataAsOfDate": "YYYY-MM-DD",
              "sources": {
                "financial": { "sourceName": "NSE/BSE/company filing" },
                "marketData": { "sourceName": "NSE/BSE official EOD" },
                "computed": { "sourceName": "Internal ratio computation" }
              },
              "qualityFlags": []
            }
          ]
        }
      ]
    }
  ]
}
```

### Official-source policy

Use only official or licensed sources for production data:

- Constituents: NSE Indices / Nifty Indices current constituent files or licensed official files.
- Financials: NSE/BSE corporate filings, company annual reports, or licensed official fundamentals.
- Market data: official NSE/BSE bhavcopy/EOD data or licensed official market-data feeds.

Do not fabricate missing values. If an official value is unavailable, use `null` and add a `qualityFlags` entry such as `financial_row_unavailable`, `market_data_unavailable`, `pe_unavailable`, or `pb_unavailable`.

### Build script

`npm run generate:nifty750` runs `scripts/build_nifty_750_official.mjs`, which expects a local official/licensed source pack under:

`scripts/nifty750/source-pack/`

Expected source-pack files:

- `constituents.json`
- `financials.json`
- `market_data.json`

The legacy synthetic generator is still available as:

`npm run generate:nifty750:synthetic-demo`
