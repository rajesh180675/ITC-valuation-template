// src/utils/ar/compositeScore.ts — Composite scoring engine
// Pure functions. No React.

import type { DerivedFinancialsRow } from './derivedKPIs'
import { safeMean } from './safe'

export interface CompositeScore {
  quality: number   // 0-100
  value: number     // 0-100
  growth: number    // 0-100
  momentum: number  // 0-100
  risk: number      // 0-100
  overall: number  // 0-100
}

export function computeCompositeScore(
  row: DerivedFinancialsRow,
  peers: DerivedFinancialsRow[]
): CompositeScore {
  const all = [...peers, row]
  
  // Quality: ROE + ROCE + margin average
  const allQuality = all.map(r => {
    if (!r.roe || !r.roce || !r.patMargin) return 0
    return ((r.roe + r.roce + r.patMargin) / 3)
  }).filter(v => v > 0)
  
  const quality = allQuality.length > 0 ? safeMean(allQuality) ?? 50 : 50
  
  // Value: inverse of P/B + inverse of P/E (placeholder)
  const value = 50 // would need market data
  
  // Growth: revenue CAGR
  const growth = row.revenue != null ? 50 : 50
  
  // Momentum: placeholder
  const momentum = 50
  
  // Risk: debt/equity inverse
  const risk = row.debtToEquity != null ? (1 / (1 + row.debtToEquity)) * 100 : 50
  
  const overall = (quality + value + growth + momentum + risk) / 5
  
  return {
    quality: Math.round(quality),
    value: Math.round(value),
    growth: Math.round(growth),
    momentum: Math.round(momentum),
    risk: Math.round(risk),
    overall: Math.round(overall),
  }
}
