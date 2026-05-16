// src/utils/ar/ratiosCapitalStructure.ts — Capital structure & leverage metrics
// Pure functions. No React.

import type { DerivedFinancialsRow } from './derivedKPIs'
import { safeDiv, round } from './safe'

export interface CapitalStructureYear {
  fy: string
  totalDebtCr: number | null
  netDebtCr: number | null
  equityCr: number | null
  debtToEquity: number | null
  debtToEbitda: number | null
  netDebtToEbitda: number | null
  interestCoverage: number | null
  cashInterestCoverage: number | null
  ffoToDebt: number | null
  debtToCapital: number | null
  weightedAvgInterestCost: number | null
}

export function computeCapitalStructure(rows: DerivedFinancialsRow[]): CapitalStructureYear[] {
  return rows.map(row => {
    const ebit = row.ebit
    const ebitda = row.ebitda
    const totalDebt = row.totalDebt
    const netDebt = row.netDebt
    const equity = row.equity
    const ffo = row.pat != null && row.depreciation != null ? row.pat + row.depreciation : null
    
    return {
      fy: row.fy,
      totalDebtCr: totalDebt,
      netDebtCr: netDebt,
      equityCr: equity,
      debtToEquity: safeDiv(totalDebt ?? null, equity ?? null),
      debtToEbitda: ebitda != null && ebitda !== 0 ? round((totalDebt ?? 0) / ebitda, 1) : null,
      netDebtToEbitda: ebitda != null && ebitda !== 0 ? round((netDebt ?? 0) / ebitda, 1) : null,
      interestCoverage: row.financeCost != null && ebit != null && row.financeCost !== 0 ? round(ebit / row.financeCost, 1) : null,
      cashInterestCoverage: row.financeCost != null && row.cfo != null && row.financeCost !== 0 ? round(row.cfo / row.financeCost, 1) : null,
      ffoToDebt: ffo != null && totalDebt != null && totalDebt !== 0 ? round(ffo / totalDebt, 1) : null,
      debtToCapital: (totalDebt != null && equity != null)
        ? safeDiv(totalDebt, totalDebt + equity)
        : null,
      weightedAvgInterestCost: row.financeCost != null && totalDebt != null && totalDebt > 0 ? round((row.financeCost / totalDebt) * 100, 1) : null,
    }
  })
}
