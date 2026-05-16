// src/utils/ar/piotroski.ts — Piotroski F-Score (9-point system)
// Pure functions. No React.

import type { DerivedFinancialsRow } from './derivedKPIs'

export interface PiotroskiYear {
  fy: string
  score: number
  maxScore: number
  components: {
    profitThisYear: boolean
    cfoPositive: boolean
    roaImproved: boolean
    cfoExceedsNi: boolean
    leverageDecreased: boolean
    currentRatioImproved: boolean
    noNewShares: boolean
    grossMarginImproved: boolean
    assetTurnoverImproved: boolean
  }
  partial: boolean
}

export function computePiotroski(rows: DerivedFinancialsRow[]): PiotroskiYear[] {
  const results: PiotroskiYear[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const prev = i > 0 ? rows[i - 1] : null
    
    const c = {
      profitThisYear: row.pat != null && row.pat > 0,
      cfoPositive: row.cfo != null && row.cfo > 0,
      roaImproved: prev != null && row.roa != null && prev.roa != null ? row.roa > prev.roa : false,
      cfoExceedsNi: row.cfo != null && row.pat != null ? row.cfo > row.pat : false,
      leverageDecreased: prev != null && row.debtToEquity != null && prev.debtToEquity != null ? row.debtToEquity < prev.debtToEquity : false,
      currentRatioImproved: prev != null && row.currentAssets != null && row.currentLiabilities != null && prev.currentAssets != null && prev.currentLiabilities != null ?
        (row.currentAssets / row.currentLiabilities) > (prev.currentAssets / prev.currentLiabilities) : false,
      noNewShares: prev == null || (row.equity != null && prev.equity != null ? row.equity <= prev.equity : true),
      grossMarginImproved: prev != null && row.grossMargin != null && prev.grossMargin != null ? row.grossMargin > prev.grossMargin : false,
      assetTurnoverImproved: prev != null && row.assetTurnover != null && prev.assetTurnover != null ? row.assetTurnover > prev.assetTurnover : false,
    }
    
    const present = Object.values(c).filter(v => v !== null).length
    const score = Object.values(c).filter(v => v === true).length
    
    results.push({
      fy: row.fy,
      score,
      maxScore: 9,
      components: c,
      partial: present < 9,
    })
  }
  return results
}
