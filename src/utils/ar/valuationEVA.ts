// src/utils/ar/valuationEVA.ts — Economic Value Added
// Pure functions. No React.

import type { ProjectionResult } from './projection'
import { round } from './safe'

export interface EVAInput {
  projection: ProjectionResult
  startingIC: number
  sharesOutstandingMn: number
}

export interface EVAOutput {
  evaByYear: number[]
  pvEva: number[]
  totalMVA: number
  impliedEnterpriseValue: number
  perShareValueINR: number
}

export function calculateEVA(input: EVAInput): EVAOutput {
  const { projection, startingIC } = input
  const years = projection.years
  const waccFrac = projection.wacc / 100
  
  let ic = startingIC
  const evas: number[] = []
  const pvs: number[] = []
  let sumPV = 0
  
  for (let i = 0; i < years.length; i++) {
    const year = years[i]
    ic = year.endingInvestedCapital
    const eva = year.nopat - (waccFrac * ic)
    evas.push(eva)
    const df = 1 / ((1 + waccFrac) ** (i + 1))
    const pv = eva * df
    pvs.push(pv)
    sumPV += pv
  }
  
  const mva = sumPV + startingIC
  
  return {
    evaByYear: evas,
    pvEva: pvs,
    totalMVA: round(mva, 2) ?? 0,
    impliedEnterpriseValue: round(mva, 2) ?? 0,
    perShareValueINR: round(mva / (input.sharesOutstandingMn || 1), 2) ?? 0,
  }
}
