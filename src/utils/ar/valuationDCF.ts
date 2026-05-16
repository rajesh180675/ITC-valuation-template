// src/utils/ar/valuationDCF.ts — Discounted Cash Flow (FCFF DCF)
// Pure functions. No React.

import type { ProjectionResult } from './projection'
import { round } from './safe'

export interface DCFInput {
  projection: ProjectionResult
  midYearConvention: boolean
  terminalMethod: 'gordon' | 'exitMultiple'
  exitMultiple?: number
  netDebtAtValuationDate: number
  sharesOutstandingMn: number
}

export interface DCFOutput {
  pvFcffByYear: number[]
  terminalValue: number
  pvTerminalValue: number
  enterpriseValue: number
  equityValue: number
  perShareValueINR: number
  terminalValueWeight: number
  impliedExitEbitdaMultiple: number
  impliedExitPE: number
  impliedFcffYield: number
  isValid: boolean
  validationErrors: string[]
}

export function calculateDCF(input: DCFInput): DCFOutput {
  const { projection, midYearConvention, terminalMethod, netDebtAtValuationDate, sharesOutstandingMn } = input
  const errors: string[] = []
  const years = projection.years
  const wacc = projection.wacc
  const termG = projection.assumptions.terminalGrowth / 100
  
  if (termG >= wacc / 100) errors.push('TERMINAL_GROWTH_GE_WACC')
  if (wacc <= 0 || wacc >= 25) errors.push('INVALID_WACC')
  if (projection.assumptions.forecastYears < 3 || projection.assumptions.forecastYears > 15) errors.push('INVALID_FORECAST_YEARS')
  
  const isValid = errors.length === 0
  
  let pvFcff: number[] = []
  let sumPV = 0
  let lastEbitda: number | null = null
  let lastNopat: number | null = null
  
  for (let i = 0; i < years.length; i++) {
    const fy = years[i]
    if (!Number.isFinite(fy.fcff)) {
      errors.push(`INVALID_FCFF_YEAR_${i}`)
      continue
    }
    lastEbitda = fy.ebitda
    lastNopat = fy.nopat
    const discountFactor = midYearConvention
      ? 1 / ((1 + wacc / 100) ** (i + 0.5))
      : 1 / ((1 + wacc / 100) ** (i + 1))
    const pv = fy.fcff * discountFactor
    pvFcff.push(pv)
    sumPV += pv
  }
  
  let terminalValue = 0
  if (terminalMethod === 'gordon' && isValid && years.length > 0) {
    const lastYear = years[years.length - 1]
    terminalValue = (lastYear.fcff * (1 + termG)) / ((wacc / 100) - termG)
  } else if (terminalMethod === 'exitMultiple' && input.exitMultiple && years.length > 0 && lastEbitda != null) {
    terminalValue = lastEbitda * input.exitMultiple
  }
  
  const n = years.length
  const pvTerminalValue = terminalValue / ((1 + wacc / 100) ** (n + 0.5))
  const enterpriseValue = sumPV + pvTerminalValue
  const equityValue = enterpriseValue - netDebtAtValuationDate
  const perShare = sharesOutstandingMn > 0 ? equityValue / sharesOutstandingMn : 0
  
  const tvw = enterpriseValue > 0 ? pvTerminalValue / enterpriseValue : 0
  const impliedExitEbitda = lastEbitda != null && lastEbitda !== 0 ? terminalValue / lastEbitda : 0
  const impliedPE = (lastNopat != null && lastNopat !== 0) ? terminalValue / lastNopat : 0
  const impliedFcffYield = terminalValue > 0 ? (years[years.length - 1]?.fcff ?? 0) / terminalValue : 0
  
  return {
    pvFcffByYear: pvFcff,
    terminalValue,
    pvTerminalValue,
    enterpriseValue,
    equityValue,
    perShareValueINR: round(perShare, 2) ?? 0,
    terminalValueWeight: tvw,
    impliedExitEbitdaMultiple: round(impliedExitEbitda, 1) ?? 0,
    impliedExitPE: round(impliedPE, 1) ?? 0,
    impliedFcffYield: round(impliedFcffYield, 3) ?? 0,
    isValid,
    validationErrors: errors,
  }
}
