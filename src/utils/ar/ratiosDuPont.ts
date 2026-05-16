// src/utils/ar/ratiosDuPont.ts — 5-step DuPont decomposition
// Pure functions. No React.

import type { DerivedFinancialsRow } from './derivedKPIs'
import { round } from './safe'

export interface DuPontYear {
  fy: string
  taxBurden: number | null           // NI / PBT
  interestBurden: number | null      // PBT / EBIT
  operatingMargin: number | null      // EBIT / Sales
  assetTurnover: number | null        // Sales / TA
  equityMultiplier: number | null     // TA / Equity
  roe: number | null
}

export function computeDuPont(rows: DerivedFinancialsRow[]): DuPontYear[] {
  return rows.map(row => {
    const { pat, pbt, ebit, revenue, totalAssets, equity } = row
    
    const taxBurden = pbt != null && pat != null && pbt !== 0 ? round(pat / pbt, 3) : null
    const interestBurden = ebit != null && pbt != null && ebit !== 0 ? round(pbt / ebit, 3) : null
    const operatingMargin = ebit != null && revenue != null && revenue !== 0 ? round(ebit / revenue, 3) : null
    const assetTurnover = revenue != null && totalAssets != null && totalAssets !== 0 ? round(revenue / totalAssets, 3) : null
    const equityMultiplier = totalAssets != null && equity != null && equity !== 0 ? round(totalAssets / equity, 3) : null
    
    // Verify: taxBurden * interestBurden * operatingMargin * assetTurnover * equityMultiplier ≈ ROE
    let roe: number | null = row.roe
    if (roe == null && pat != null && equity != null && equity !== 0) {
      roe = round((pat / equity) * 100, 1)
    }
    
    return { fy: row.fy, taxBurden, interestBurden, operatingMargin, assetTurnover, equityMultiplier, roe }
  })
}
