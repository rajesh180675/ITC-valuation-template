// src/utils/ar/ratiosWorkingCapital.ts — Working capital efficiency metrics
// Pure functions. No React.

import type { DerivedFinancialsRow } from './derivedKPIs'
import { round } from './safe'

export interface WorkingCapitalYear {
  fy: string
  receivablesCr: number | null
  payablesCr: number | null
  inventoryCr: number | null
  dso: number | null       // days sales outstanding
  dpo: number | null       // days payables outstanding
  dio: number | null       // days inventory outstanding
  ccc: number | null       // cash conversion cycle
  nwcCr: number | null
  nwcPctOfRev: number | null
  changeInNwcCr: number | null
}

export function computeWorkingCapital(rows: DerivedFinancialsRow[]): WorkingCapitalYear[] {
  return rows.map((row, i) => {
    const revenue = row.revenue
    const cogs = row.operatingExpenses // approximate
    
    let dso: number | null = null
    if (row.receivables != null && revenue != null && revenue !== 0) {
      dso = round((row.receivables / revenue) * 365, 1)
    }
    
    let dpo: number | null = null
    if (row.payables != null && cogs != null && cogs !== 0) {
      dpo = round((Math.abs(row.payables) / cogs) * 365, 1)
    }
    
    let dio: number | null = null
    if (row.inventory != null && cogs != null && cogs !== 0) {
      dio = round((row.inventory / cogs) * 365, 1)
    }
    
    let ccc: number | null = null
    if (dso != null && dio != null && dpo != null) {
      ccc = round(dso + dio - dpo, 1)
    }
    
    const prevNwc = i > 0 ? rows[i - 1].workingCapital : null
    const nwcChange = row.workingCapital != null && prevNwc != null ? row.workingCapital - prevNwc : null
    
    return {
      fy: row.fy,
      receivablesCr: row.receivables,
      payablesCr: row.payables,
      inventoryCr: row.inventory,
      dso,
      dpo,
      dio,
      ccc,
      nwcCr: row.workingCapital,
      nwcPctOfRev: revenue != null && revenue !== 0 ? round(((row.workingCapital ?? 0) / revenue) * 100, 1) : null,
      changeInNwcCr: nwcChange,
    }
  })
}
