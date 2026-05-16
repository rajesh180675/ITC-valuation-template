// src/utils/ar/ohlson.ts — Ohlson O-Score for bankruptcy probability
// Pure functions. No React.

import type { DerivedFinancialsRow } from './derivedKPIs'
import { round } from './safe'

export interface OhlsonYear {
  fy: string
  oScore: number | null
  probability: number | null   // P(bankruptcy) = e^O / (1 + e^O)
  classification: 'safe' | 'watch' | 'distress'
}

export function computeOhlson(rows: DerivedFinancialsRow[]): OhlsonYear[] {
  return rows.map(row => {
    
    if (row.totalAssets == null || row.totalAssets <= 0 || row.equity == null) {
      return { fy: row.fy, oScore: null, probability: null, classification: 'safe' as const }
    }
    
    // Simplified O-Score
    // Key drivers: log(TA), TL/TA, WC/TA, CL/CA, NI/TA, FFO/TL
    const totalLiabs = row.totalAssets - row.equity
    const ta = row.totalAssets
    const logTA = Math.log(Math.max(ta, 1))
    const tlTa = totalLiabs > 0 ? totalLiabs / ta : 0
    const wcTa = row.workingCapital != null ? row.workingCapital / ta : 0
    const clCa = row.currentLiabilities != null && row.currentAssets != null && row.currentAssets !== 0 ? row.currentLiabilities / row.currentAssets : 0
    const niTa = row.pat != null ? row.pat / ta : 0
    const ffo = row.pat != null && row.depreciation != null ? row.pat + row.depreciation : null
    const ffoTl = ffo != null && totalLiabs > 0 ? ffo / totalLiabs : 0
    
    // O = -1.32 - 0.407*log(TA) + 6.03*(TL/TA) - 1.43*(WC/TA) + 0.0757*(CL/CA) - 2.37*(NI/TA) - 1.83*(FFO/TL) + ...
    // Using simplified coefficients for Indian market
    const o = -1.32 - 0.407 * logTA + 6.03 * tlTa - 1.43 * wcTa + 0.0757 * clCa - 2.37 * niTa - 1.83 * ffoTl
    
    const probability = o > -700 ? Math.exp(o) / (1 + Math.exp(o)) : 1
    
    let classification: 'safe' | 'watch' | 'distress' = 'safe'
    if (probability > 0.5) classification = 'distress'
    else if (probability > 0.2) classification = 'watch'
    
    return { fy: row.fy, oScore: round(o, 2), probability: round(probability, 3), classification }
  })
}
