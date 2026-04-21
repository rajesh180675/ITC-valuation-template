# ITC-valuation-template
## Nifty 750 Data Hub JSON feed

The UI now supports loading a 10-year financial panel for all three Nifty cohorts:
- Nifty Smallcap 250
- Nifty LargeMidcap 250
- Nifty Microcap 250

Place your generated dataset at:

`public/data/nifty_750_10y.json`

Expected top-level schema:

```json
{
  "generatedAt": "ISO-8601 timestamp",
  "batches": [
    {
      "indexSlug": "niftysmallcap250 | niftylargemidcap250 | niftymicrocap250",
      "indexName": "string",
      "asOfDate": "YYYY-MM-DD",
      "companies": [
        {
          "symbol": "string",
          "companyName": "string",
          "sector": "string",
          "reportingType": "financial | nonFinancial",
          "financials": [
            {
              "fiscalYear": "FY2017...",
              "revenueCr": 0,
              "netProfitCr": 0,
              "roePct": 0,
              "pe": 0,
              "pb": 0,
              "debtToEquity": 0
            }
          ]
        }
      ]
    }
  ]
}
```
