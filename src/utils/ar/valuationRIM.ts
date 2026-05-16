// src/utils/ar/valuationRIM.ts — Residual Income Model
// Pure functions. No React.

import type { ProjectionResult } from './projection'
import { round } from './safe'

export interface RIMInput {
  projection: ProjectionResult
  costOfEquity: number
  terminalGrowth: number
  startingBookValue: number
  sharesOutstandingMn: number
}

export interface RIMOutput {
  residualIncomeByYear: number[]
  pvResidualIncome: number[]
  pvTerminal: number
  equityValue: number
  perShareValueINR: number
  isValid: boolean
  validationErrors: string[]
}

export function calculateRIM(input: RIMInput): RIMOutput {
  const { projection, costOfEquity, terminalGrowth, startingBookValue, sharesOutstandingMn } = input
  const years = projection.years
  const errors: string[] = []
  
  if (costOfEquity <= 0) errors.push('COE_INVALID')
  if (terminalGrowth >= costOfEquity) errors.push('TERM_GROWTH_GE_COE')
  
  const isValid = errors.length === 0
  const coeFrac = costOfEquity / 100
  const termGFrac = terminalGrowth / 100
  
  let bv = startingBookValue
  const ris: number[] = []
  const pvRis: number[] = []
  let sumPV = 0
  
  for (let i = 0; i < years.length; i++) {
    const year = years[i]
    const ri = year.netIncome - (coeFrac * bv)
    ris.push(ri)
    const df = 1 / ((1 + coeFrac) ** (i + 1))
    const pvRi = ri * df
    pvRis.push(pvRi)
    sumPV += pvRi
    bv = year.endingEquity
  }
  
  const lastRI = ris[ris.length - 1] ?? 0
  const terminalRI = coeFrac > termGFrac ? lastRI / (coeFrac - termGFrac) : 0
  const pvTerminal = terminalRI / ((1 + coeFrac) ** years.length)
  const equityValue = startingBookValue + sumPV + pvTerminal
  
  return {
    residualIncomeByYear: ris,
    pvResidualIncome: pvRis,
    pvTerminal,
    equityValue,
    perShareValueINR: round(equityValue / (sharesOutstandingMn || 1), 2) ?? 0,
    isValid,
    validationErrors: errors,
  }
}
