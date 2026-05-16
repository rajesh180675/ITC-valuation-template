// src/utils/ar/valuationMultiples.ts — Relative valuation multiples
// Pure functions. No React.

import type { DerivedFinancialsRow } from './derivedKPIs'

export interface MultiplesOutput {
  trailing: {
    pe: number | null
    evEbitda: number | null
    pb: number | null
    evSales: number | null
    divYield: number | null
  }
  forward: {
    pe: number | null
    evEbitda: number | null
    pb: number | null
  }
}

export function computeMultiples(
  row: DerivedFinancialsRow,
  marketCapCr?: number | null
): MultiplesOutput {
  const { pat, ebitda, revenue, totalDebt, cash, equity, dividendsPaid } = row
  const ev = (marketCapCr ?? 0) + ((totalDebt ?? 0) - (cash ?? 0))

  const pe = marketCapCr != null && pat != null && pat !== 0 ? marketCapCr / pat : null
  const evEb = ev > 0 && ebitda != null && ebitda !== 0 ? ev / ebitda : null
  const pb = (marketCapCr ?? 0) > 0 && equity != null && equity !== 0 ? (marketCapCr ?? 0) / equity : null
  const evSales = ev > 0 && revenue != null && revenue !== 0 ? ev / revenue : null
  const divYield = marketCapCr != null && marketCapCr > 0 && dividendsPaid != null && dividendsPaid < 0
    ? (-dividendsPaid / marketCapCr) * 100
    : null

  return {
    trailing: { pe, evEbitda: evEb, pb, evSales, divYield },
    forward: { pe, evEbitda: evEb, pb }
  }
}
