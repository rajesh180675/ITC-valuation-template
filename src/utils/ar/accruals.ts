// src/utils/ar/accruals.ts — Sloan accruals, accrual quality
// Pure functions. No React.

import type { DerivedFinancialsRow } from './derivedKPIs'
import { round } from './safe'

export interface AccrualsYear {
  fy: string
  accrualsBS: number | null
  accrualsCF: number | null
  sloanRatio: number | null     // as %
  decile: number | null
  qualityFlag: 'high' | 'medium' | 'low'
}

export function computeAccruals(rows: DerivedFinancialsRow[]): AccrualsYear[] {
  return rows.map((row, i) => {
    const prev = i > 0 ? rows[i - 1] : null
    
    // Cash flow method preferred: Accruals = NI - CFO
    let accrualsCF: number | null = null
    if (row.pat != null && row.cfo != null) {
      accrualsCF = row.pat - row.cfo
    }
    
    // Balance sheet method fallback
    let accrualsBS: number | null = null
    if (prev != null && row.workingCapital != null && prev.workingCapital != null && row.depreciation != null) {
      const deltaWC = row.workingCapital - prev.workingCapital
      accrualsBS = deltaWC - row.depreciation
    }
    
    // Sloan ratio = Accruals / Avg(TA)
    let sloan: number | null = null
    const accruals = accrualsCF ?? accrualsBS
    const avgTA = prev != null && row.totalAssets != null && prev.totalAssets != null ? (row.totalAssets + prev.totalAssets) / 2 : row.totalAssets
    if (accruals != null && avgTA != null && avgTA !== 0) {
      sloan = round((accruals / avgTA) * 100, 2) // as percentage
    }
    
    let quality: 'high' | 'medium' | 'low' = 'medium'
    if (sloan != null) {
      const abs = Math.abs(sloan)
      if (abs < 5) quality = 'high'
      else if (abs > 10) quality = 'low'
    }
    
    return { fy: row.fy, accrualsBS, accrualsCF, sloanRatio: sloan, decile: null, qualityFlag: quality }
  })
}
