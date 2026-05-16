// src/utils/ar/projection.ts — Three-statement projection engine
// Pure functions. No React.

import type { DerivedFinancialsRow } from './derivedKPIs'
import { round } from './safe'

export interface ProjectionAssumptions {
  revenueGrowthYears: number[]
  terminalGrowth: number
  forecastYears: number
  ebitdaMargin: number[]
  daPctOfRevenue: number[]
  taxRate: number
  capexPctOfRevenue: number[]
  nwcPctOfRevenue: number[]
  netDebtToEbitdaTarget: number
  payoutRatio: number
  riskFreeRate: number
  equityRiskPremium: number
  beta: number
  costOfDebt: number
  targetDebtWeight: number
}

export interface ProjectedYear {
  fy: string
  revenue: number
  ebitda: number
  da: number
  ebit: number
  taxes: number
  nopat: number
  capex: number
  changeNwc: number
  fcff: number
  netIncome: number
  fcfe: number
  dividend: number
  endingNetDebt: number
  endingEquity: number
  endingTotalAssets: number
  endingInvestedCapital: number
  roic: number
  reinvestmentRate: number
  growthRateImplied: number
}

export interface ProjectionResult {
  startingValues: DerivedFinancialsRow
  years: ProjectedYear[]
  wacc: number
  costOfEquity: number
  assumptions: ProjectionAssumptions
  warnings: string[]
}

export function buildProjection(
  history: DerivedFinancialsRow[],
  assumptions: ProjectionAssumptions
): ProjectionResult {
  const start = history[history.length - 1]
  const warnings: string[] = []
  
  if (!start || !start.revenue) {
    warnings.push('No base year data')
    return { startingValues: start, years: [], wacc: 0, costOfEquity: 0, assumptions, warnings }
  }
  
  // WACC assumptions
  const costOfEquity = assumptions.riskFreeRate + assumptions.beta * assumptions.equityRiskPremium
  const costOfDebtAfterTax = assumptions.costOfDebt * (1 - assumptions.taxRate / 100)
  const wacc = (assumptions.targetDebtWeight * costOfDebtAfterTax) + ((1 - assumptions.targetDebtWeight) * costOfEquity)
  
  const projectedYears: ProjectedYear[] = []
  let prevRevenue = start.revenue
  let prevEquity = start.equity ?? 0
  let prevNetDebt = start.netDebt ?? 0
  
  for (let i = 0; i < assumptions.forecastYears; i++) {
    const yearNum = i + 1
    const fy = yearNum < 10 ? `FY202${yearNum}` : `FY20${yearNum}` // placeholder naming; caller should real years
    const growth = assumptions.revenueGrowthYears[i] ?? assumptions.terminalGrowth
    const revenue = prevRevenue * (1 + growth / 100)
    const ebitda = revenue * ((assumptions.ebitdaMargin[i] ?? 0) / 100)
    const da = revenue * ((assumptions.daPctOfRevenue[i] ?? 0) / 100)
    const ebit = ebitda - da
    const taxes = ebit * (assumptions.taxRate / 100)
    const nopat = ebit - taxes
    const capex = revenue * ((assumptions.capexPctOfRevenue[i] ?? 0) / 100)
    const changeNwc = revenue * ((assumptions.nwcPctOfRevenue[i] ?? 0) / 100)
    const fcff = nopat + da - capex - changeNwc
    const netIncome = nopat
    const fcfe = fcff - (changeNwc * (1 - assumptions.targetDebtWeight))
    const dividend = netIncome * (assumptions.payoutRatio / 100)
    
    // Capital structure evolution
    const endingNetDebt = prevNetDebt - (fcff - dividend) // rough approximation
    const endingEquity = prevEquity + netIncome - dividend
    const endingTA = endingNetDebt + endingEquity
    const endingIC = endingEquity + endingNetDebt
    const roicComputed = endingIC > 0 ? round((nopat / endingIC) * 100, 1) : 0
    const reinvestmentRateComputed = ebit > 0 ? round((capex / ebit) * 100, 1) : 0
    const roic = roicComputed ?? 0
    const reinvestmentRate = reinvestmentRateComputed ?? 0
    const growthRateImplied = round((roic / 100) * (reinvestmentRate / 100) * 100, 1) ?? 0
    
    projectedYears.push({
      fy, revenue: round(revenue, 1) ?? 0, ebitda: round(ebitda, 1) ?? 0, da: round(da, 1) ?? 0, ebit: round(ebit, 1) ?? 0, 
      taxes: round(taxes, 1) ?? 0, nopat: round(nopat, 1) ?? 0, capex: round(capex, 1) ?? 0, 
      changeNwc: round(changeNwc, 1) ?? 0, fcff: round(fcff, 1) ?? 0,
      netIncome: round(netIncome, 1) ?? 0, fcfe: round(fcfe, 1) ?? 0, dividend: round(dividend, 1) ?? 0, 
      endingNetDebt, endingEquity, endingTotalAssets: endingTA,
      endingInvestedCapital: endingIC, roic, reinvestmentRate, growthRateImplied,
    })
    
    prevRevenue = revenue
    prevEquity = endingEquity
    prevNetDebt = endingNetDebt
  }
  
  return { startingValues: start, years: projectedYears, wacc, costOfEquity, assumptions, warnings }
}
