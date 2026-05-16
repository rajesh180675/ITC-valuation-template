// src/utils/ar/altman.ts — Altman Z, Z', Z'' bankruptcy scores
// Pure functions. No React.

import type { DerivedFinancialsRow } from './derivedKPIs'
import { safeDiv } from './safe'

export interface AltmanYear {
  fy: string
  x1: number | null   // WC / TA
  x2: number | null   // Retained Earnings / TA
  x3: number | null   // EBIT / TA
  x4: number | null   // MV Equity / Total Liab
  x5: number | null   // Sales / TA
  z: number | null
  zPrime: number | null
  zDoublePrime: number | null
  classification: 'safe' | 'grey' | 'distress' | 'unknown'
  marketCapUsed: boolean
}

export function computeAltman(rows: DerivedFinancialsRow[], marketCapCr?: (fy: string) => number | null): AltmanYear[] {
  return rows.map(row => {
    const { totalAssets, equity, workingCapital, revenue, pbt } = row
    if (totalAssets == null || totalAssets === 0) {
      return { fy: row.fy, x1: null, x2: null, x3: null, x4: null, x5: null, z: null, zPrime: null, zDoublePrime: null, classification: 'unknown', marketCapUsed: false }
    }
    
    const x1 = workingCapital != null ? safeDiv(workingCapital, totalAssets) : null
    const x2 = equity != null ? safeDiv(equity, totalAssets) : null // Using equity as proxy for retained earnings; in need of better retained earnings data
    const x3 = pbt != null ? safeDiv(pbt, totalAssets) : null // Using PBT as proxy for EBIT
    let x4: number | null = null
    let marketCapUsed = false
    if (marketCapCr) {
      const mc = marketCapCr(row.fy)
      if (mc != null) {
        x4 = safeDiv(mc, totalAssets)
        marketCapUsed = true
      }
    }
    if (x4 == null && equity != null) {
      x4 = safeDiv(equity, totalAssets)
    }
    const x5 = revenue != null ? safeDiv(revenue, totalAssets) : null
    
    // Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 1.0*X5
    const z = x1 != null && x2 != null && x3 != null && x4 != null && x5 != null
      ? 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5
      : null
    
    // Z' = 0.717*X1 + 0.847*X2 + 3.107*X3 + 0.420*X4 + 0.998*X5
    const zPrime = x1 != null && x2 != null && x3 != null && x4 != null && x5 != null
      ? 0.717 * x1 + 0.847 * x2 + 3.107 * x3 + 0.420 * x4 + 0.998 * x5
      : null
    
    // Z'' = 6.56*X1 + 3.26*X2 + 6.72*X3 + 1.05*X4
    const zDoublePrime = x1 != null && x2 != null && x3 != null && x4 != null
      ? 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4
      : null
    
    let classification: AltmanYear['classification'] = 'unknown'
    if (zDoublePrime != null) {
      if (zDoublePrime > 2.6) classification = 'safe'
      else if (zDoublePrime > 1.1) classification = 'grey'
      else classification = 'distress'
    }
    
    return { fy: row.fy, x1, x2, x3, x4, x5, z, zPrime, zDoublePrime, classification, marketCapUsed }
  })
}
