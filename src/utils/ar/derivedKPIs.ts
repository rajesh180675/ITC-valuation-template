// src/utils/ar/derivedKPIs.ts — Derived financial metrics from raw AR data
// Pure functions. No React.

import type { AnnualReportYearData } from '@/utils/annualReportCashFlow'
import { makeKPIResolver } from './kpiResolver'
import * as S from './safe'

export type Cr = number
export type Pct = number

export interface DerivedFinancialsRow {
  fy: string
  // P&L
  revenue: Cr | null
  ebitda: Cr | null
  ebit: Cr | null
  pbt: Cr | null
  pat: Cr | null
  netInterestIncome: Cr | null
  financeCost: Cr | null
  depreciation: Cr | null
  operatingExpenses: Cr | null
  // Balance Sheet
  totalAssets: Cr | null
  equity: Cr | null
  totalDebt: Cr | null
  netDebt: Cr | null
  cash: Cr | null
  workingCapital: Cr | null
  investedCapital: Cr | null
  currentAssets: Cr | null
  currentLiabilities: Cr | null
  inventory: Cr | null
  receivables: Cr | null
  payables: Cr | null
  // Cash Flow
  cfo: Cr | null
  cfi: Cr | null
  cff: Cr | null
  capex: Cr | null
  fcf: Cr | null
  fcfe: Cr | null
  dividendsPaid: Cr | null
  // Derived ratios
  grossMargin: Pct | null
  ebitdaMargin: Pct | null
  patMargin: Pct | null
  roe: Pct | null
  roa: Pct | null
  roce: Pct | null
  assetTurnover: number | null
  equityTurnover: number | null
  debtToEquity: number | null
  debtToAssets: number | null
  cashConversion: Pct | null
  fcfYield: Pct | null
  dividendPayout: Pct | null
  reinvestmentRate: Pct | null
  // Bank-specific
  isFinancial: boolean
  // Flags
  qualityFlags: string[]
}

function resolveOrNull(r: { value: number | null }): number | null {
  return r.value ?? null
}

export function buildDerivedFinancials(
  data: Record<string, AnnualReportYearData>,
  years: string[]
): DerivedFinancialsRow[] {
  const kpi = makeKPIResolver(data)
  const rows: DerivedFinancialsRow[] = []

  for (const fy of years) {
    const r = kpi.revenue(fy)
    const rev = resolveOrNull(r)
    const pbt = resolveOrNull(kpi.pbt(fy))
    const pat = resolveOrNull(kpi.pat(fy))
    const ebitda = resolveOrNull(kpi.ebitda(fy))
    const ebit = resolveOrNull(kpi.ebit(fy))
    const ta = resolveOrNull(kpi.totalAssets(fy))
    const eq = resolveOrNull(kpi.equity(fy))
    const td = resolveOrNull(kpi.totalDebt(fy))
    const cash = resolveOrNull(kpi.cash(fy))
    const wc = resolveOrNull(kpi.workingCapital(fy))
    const cfo = resolveOrNull(kpi.cfo(fy))
    const fcfVal = resolveOrNull(kpi.fcf(fy))
    const capex = resolveOrNull(kpi.capex(fy))
    const divPaid = resolveOrNull(kpi.dividendsPaid(fy))
    const nii = resolveOrNull(kpi.netInterestIncome(fy))
    const finCost = resolveOrNull(kpi.financeCost(fy))
    const depr = resolveOrNull(kpi.depreciation(fy))
    const opex = resolveOrNull(kpi.operatingExpenses(fy))
    const ca = resolveOrNull(kpi.currentAssets(fy))
    const cl = resolveOrNull(kpi.currentLiabilities(fy))
    const inv = resolveOrNull(kpi.inventory(fy))
    const ar = resolveOrNull(kpi.receivables(fy))
    const ap = resolveOrNull(kpi.payables(fy))

    const isBank = kpi.isFinancial(fy)

    let ic: number | null = null
    if (eq !== null && td !== null && cash !== null) {
      ic = eq + td - cash
    } else if (eq !== null) {
      ic = eq
    }

    let fcfe: number | null = null
    if (fcfVal !== null) {
      fcfe = fcfVal
    }

    let reinvest: number | null = null
    if (capex !== null && ebit !== null && ebit !== 0) {
      reinvest = S.round((Math.abs(capex) / ebit) * 100, 1)
    }

    rows.push({
      fy,
      revenue: rev,
      ebitda,
      ebit,
      pbt,
      pat,
      netInterestIncome: nii,
      financeCost: finCost,
      depreciation: depr,
      operatingExpenses: opex,
      totalAssets: ta,
      equity: eq,
      totalDebt: td,
      netDebt: S.safeSub(td ?? null, cash ?? null),
      cash,
      workingCapital: wc,
      investedCapital: ic,
      currentAssets: ca,
      currentLiabilities: cl,
      inventory: inv,
      receivables: ar,
      payables: ap,
      cfo,
      cfi: resolveOrNull(kpi.cfi(fy)),
      cff: resolveOrNull(kpi.cff(fy)),
      capex,
      fcf: fcfVal,
      fcfe,
      dividendsPaid: divPaid,
      grossMargin: null,
      ebitdaMargin: S.safePct(ebitda, rev),
      patMargin: S.safePct(pat, rev),
      roe: S.safePct(pat, eq),
      roa: S.safePct(pat, ta),
      roce: (pbt !== null && ic !== null && ic !== 0) ? S.round((pbt / ic) * 100, 1) : null,
      assetTurnover: S.safeDiv(rev ?? null, ta ?? null),
      equityTurnover: S.safeDiv(rev ?? null, eq ?? null),
      debtToEquity: S.safeDiv(td ?? null, eq ?? null),
      debtToAssets: ta !== null ? S.safeDiv(td ?? null, ta) : null,
      cashConversion: (cfo !== null && pat !== null && pat !== 0) ? S.round((cfo / pat) * 100, 1) : null,
      fcfYield: S.safePct(fcfVal, rev),
      dividendPayout: divPaid !== null && pat !== null && pat !== 0 ? S.round((Math.abs(divPaid) / pat) * 100, 1) : null,
      reinvestmentRate: reinvest,
      isFinancial: isBank,
      qualityFlags: [],
    })
  }

  return rows
}
