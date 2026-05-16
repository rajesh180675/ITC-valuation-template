// src/utils/ar/kpiResolver.ts — Centralized KPI resolution with fallback chains
// Pure functions. No React.

import type { AnnualReportYearData, AnnualReportItem } from '@/utils/annualReportCashFlow'

export interface ResolvedKPI {
  value: number | null
  source: 'kpis' | 'item' | 'derived' | 'missing'
  itemLabel?: string
  derivation?: string
  fy: string
  qualityFlag?: string
}

export interface KPIResolver {
  revenue(fy: string): ResolvedKPI
  pat(fy: string): ResolvedKPI
  pbt(fy: string): ResolvedKPI
  ebitda(fy: string): ResolvedKPI
  ebit(fy: string): ResolvedKPI
  totalAssets(fy: string): ResolvedKPI
  equity(fy: string): ResolvedKPI
  totalDebt(fy: string): ResolvedKPI
  netDebt(fy: string): ResolvedKPI
  cash(fy: string): ResolvedKPI
  workingCapital(fy: string): ResolvedKPI
  cfo(fy: string): ResolvedKPI
  cfi(fy: string): ResolvedKPI
  cff(fy: string): ResolvedKPI
  capex(fy: string): ResolvedKPI
  fcf(fy: string): ResolvedKPI
  dividendsPaid(fy: string): ResolvedKPI
  netInterestIncome(fy: string): ResolvedKPI
  provisions(fy: string): ResolvedKPI
  totalLiabilities(fy: string): ResolvedKPI
  currentAssets(fy: string): ResolvedKPI
  currentLiabilities(fy: string): ResolvedKPI
  inventory(fy: string): ResolvedKPI
  receivables(fy: string): ResolvedKPI
  payables(fy: string): ResolvedKPI
  depreciation(fy: string): ResolvedKPI
  financeCost(fy: string): ResolvedKPI
  operatingExpenses(fy: string): ResolvedKPI
  totalIncome(fy: string): ResolvedKPI
  isFinancial(fy: string): boolean
  segmentRevenue(fy: string, segment: string): ResolvedKPI
}

/* ── Alias dictionaries ── */
const REVENUE_ALIASES = ['revenue from operations', 'sales', 'total income', 'gross income', 'total revenue', 'revenue from sale of products']
const PAT_ALIASES = ['profit for the year', 'net profit after tax', 'profit/(loss) for the year', 'net profit', 'profit for the year', 'net income']
const PBT_ALIASES = ['profit before tax', 'profit before taxation', 'profit before taxes', 'pbelt']
const TOT_assets_ALIASES = ['total assets', 'total of assets', 'total assets (including']
const EQUITY_ALIASES = ['total equity', "shareholders' equity", 'shareholders funds', 'total shareholders funds']
const DEBT_ALIASES = ['borrowings', 'total borrowings', 'loans and advances', 'long term borrowings', 'short term borrowings']
const CASH_ALIASES = ['cash and cash equivalents', 'cash and bank balances', 'bank balances']
const CA_ALIASES = ['total current assets', 'current assets']
const CL_ALIASES = ['total current liabilities', 'current liabilities']
const INV_ALIASES = ['inventories', 'inventory', 'stocks']
const AR_ALIASES = ['trade receivables', 'sundry debtors', 'accounts receivable', 'trade receivables (net)', 'debtors']
const AP_ALIASES = ['trade payables', 'sundry creditors', 'accounts payable', 'creditors', 'trade payables (net)']
const DEPR_ALIASES = ['depreciation', 'depreciation and amortisation', 'depreciation & amortisation', 'd&a']
const FIN_ALIASES = ['finance costs', 'finance cost', 'interest expense', 'interest']
const OPEX_ALIASES = ['operating expenses', 'other expenses', 'selling and distribution', 'administrative expenses', 'total expenses']
const CASH_FLOW_ALIASES: Record<string, string[]> = {
  cfoCr: ['net cash from operating activities', 'cash flows from operating'],
  cfiCr: ['net cash from investing activities', 'cash flows from investing'],
  cffCr: ['net cash from financing activities', 'cash flows from financing'],
  capexCr: ['purchase of property, plant and equipment', 'purchase of fixed assets', 'capital expenditure'],
  fcfCr: ['free cash flow'],
  dividendCr: ['dividends paid', 'dividend paid'],
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function findItemByAliases(items: AnnualReportItem[], aliases: string[]): { item: AnnualReportItem; label: string } | null {
  for (const alias of aliases) {
    const found = items.find(i => i.label.toLowerCase().includes(alias) && i.current !== null && i.current !== undefined)
    if (found) return { item: found, label: found.label }
  }
  return null
}

function findByKey(kpis: Record<string, number | null>, ...keys: string[]): number | null {
  for (const k of keys) {
    if (kpis[k] !== null && kpis[k] !== undefined && !Number.isNaN(kpis[k])) return kpis[k]
  }
  return null
}

function resolve(
  fy: string,
  kpis: Record<string, number | null>,
  items: AnnualReportItem[],
  kpiKeys: string[],
  aliases: string[],
  label: string,
  derivedCalc?: () => number | null
): ResolvedKPI {
  const fromKpi = findByKey(kpis, ...kpiKeys)
  if (fromKpi !== null) {
    return { value: fromKpi, source: 'kpis', fy }
  }
  const fromItem = findItemByAliases(items, aliases)
  if (fromItem) {
    return { value: fromItem.item.current ?? null, source: 'item', itemLabel: fromItem.label, fy }
  }
  if (derivedCalc) {
    const v = derivedCalc()
    if (v !== null && v !== undefined && !Number.isNaN(v)) {
      return { value: v, source: 'derived', derivation: label, fy }
    }
  }
  return { value: null, source: 'missing', fy, qualityFlag: `${label.toUpperCase().replace(/ /g, '_')}_MISSING` }
}

/* ── Factory ──────────────────────────────────────────────────────────────── */
export function makeKPIResolver(data: Record<string, AnnualReportYearData>): KPIResolver {
  const get = (fy: string) => {
    const y = data[fy]
    return {
      pnl: y?.profitLoss,
      bs: y?.balanceSheet,
      cf: y?.cashFlow,
    }
  }

  const r: KPIResolver = {
    revenue(fy) {
      const { pnl } = get(fy)
      const resp = resolve(fy, pnl?.kpIs ?? {}, pnl?.items ?? [],
        ['revenueCr', 'totalIncomeCr', 'grossRevenueCr'],
        REVENUE_ALIASES, 'revenue')
      return resp
    },
    pat(fy) {
      const { pnl } = get(fy)
      return resolve(fy, pnl?.kpIs ?? {}, pnl?.items ?? [],
        ['patCr', 'netProfitCr', 'profitForYearCr'],
        PAT_ALIASES, 'pat')
    },
    pbt(fy) {
      const { pnl } = get(fy)
      return resolve(fy, pnl?.kpIs ?? {}, pnl?.items ?? [],
        ['pbtCr', 'profitBeforeTaxCr'],
        PBT_ALIASES, 'pbt')
    },
    ebitda(fy) {
      const { pnl } = get(fy)
      const fromKpis = findByKey(pnl?.kpIs ?? {}, 'ebitdaCr')
      if (fromKpis !== null) return { value: fromKpis, source: 'kpis', fy }
      // Derive: pbt + finCost + depr
      const pbtVal = r.pbt(fy).value
      const fin = r.financeCost(fy).value
      const depr = r.depreciation(fy).value
      if (pbtVal !== null && fin !== null && depr !== null) {
        return { value: pbtVal + fin + depr, source: 'derived', derivation: 'pbt + finCost + depr', fy }
      }
      return { value: null, source: 'missing', fy, qualityFlag: 'EBITDA_MISSING' }
    },
    ebit(fy) {
      const fromKpis = findByKey(get(fy).pnl?.kpIs ?? {}, 'ebitCr')
      if (fromKpis !== null) return { value: fromKpis, source: 'kpis', fy }
      // Derive: pbt + finCost
      const pbtVal = r.pbt(fy).value
      const fin = r.financeCost(fy).value
      if (pbtVal !== null && fin !== null) {
        return { value: pbtVal + fin, source: 'derived', derivation: 'pbt + finCost', fy }
      }
      return { value: null, source: 'missing', fy }
    },
    totalAssets(fy) {
      const { bs } = get(fy)
      return resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['totalAssetsCr', 'assetsCr'],
        TOT_assets_ALIASES, 'totalAssets')
    },
    equity(fy) {
      const { bs } = get(fy)
      return resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['equityCr', 'shareholdersFundsCr'],
        EQUITY_ALIASES, 'equity')
    },
    totalDebt(fy) {
      const { bs } = get(fy)
      return resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['totalBorrowingsCr', 'borrowingsCr', 'longTermBorrowingsCr', 'shortTermBorrowingsCr'],
        DEBT_ALIASES, 'totalDebt')
    },
    cash(fy) {
      const { bs } = get(fy)
      return resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['cashCr', 'cashAndCashEquivalentsCr'],
        CASH_ALIASES, 'cash')
    },
    netDebt(fy) {
      const debt = r.totalDebt(fy).value
      const cash = r.cash(fy).value
      if (debt !== null && cash !== null) {
        return { value: debt - cash, source: 'derived', derivation: 'totalDebt - cash', fy }
      }
      return { value: null, source: 'missing', fy, qualityFlag: 'NET_DEBT_MISSING' }
    },
    workingCapital(fy) {
      const { bs } = get(fy)
      const ca = resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['totalCurrentAssetsCr'], CA_ALIASES, 'currentAssets').value
      const cl = resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['totalCurrentLiabilitiesCr'], CL_ALIASES, 'currentLiabilities').value
      if (ca !== null && cl !== null) {
        return { value: ca - cl, source: 'derived', derivation: 'currentAssets - currentLiabilities', fy }
      }
      return { value: null, source: 'missing', fy, qualityFlag: 'WORKING_CAPITAL_MISSING' }
    },
    cfo(fy) {
      const { cf } = get(fy)
      return resolve(fy, cf?.kpIs ?? {}, cf?.items ?? [],
        ['cfoCr'], CASH_FLOW_ALIASES.cfoCr, 'cfo')
    },
    cfi(fy) {
      const { cf } = get(fy)
      return resolve(fy, cf?.kpIs ?? {}, cf?.items ?? [],
        ['cfiCr'], CASH_FLOW_ALIASES.cfiCr, 'cfi')
    },
    cff(fy) {
      const { cf } = get(fy)
      return resolve(fy, cf?.kpIs ?? {}, cf?.items ?? [],
        ['cffCr'], CASH_FLOW_ALIASES.cffCr, 'cff')
    },
    capex(fy) {
      const { cf } = get(fy)
      return resolve(fy, cf?.kpIs ?? {}, cf?.items ?? [],
        ['capexCr'], CASH_FLOW_ALIASES.capexCr, 'capex')
    },
    fcf(fy) {
      const cfoVal = r.cfo(fy).value
      const capex = r.capex(fy).value
      if (cfoVal !== null && capex !== null) {
        return { value: cfoVal - Math.abs(capex), source: 'derived', derivation: 'cfo - |capex|', fy }
      }
      const fromKpis = findByKey(get(fy).cf?.kpIs ?? {}, 'fcfCr')
      if (fromKpis !== null) return { value: fromKpis, source: 'kpis', fy }
      return { value: null, source: 'missing', fy, qualityFlag: 'FCF_MISSING' }
    },
    dividendsPaid(fy) {
      const { cf } = get(fy)
      return resolve(fy, cf?.kpIs ?? {}, cf?.items ?? [],
        ['dividendCr'], CASH_FLOW_ALIASES.dividendCr, 'dividendsPaid')
    },
    netInterestIncome(fy) {
      const { pnl } = get(fy)
      return resolve(fy, pnl?.kpIs ?? {}, pnl?.items ?? [],
        ['netInterestIncomeCr'], ['net interest income'], 'netInterestIncome')
    },
    provisions(fy) {
      const { pnl } = get(fy)
      return resolve(fy, pnl?.kpIs ?? {}, pnl?.items ?? [],
        ['provisionsCr'], ['provisions', 'provisions and contingencies'], 'provisions')
    },
    totalLiabilities(fy) {
      const { bs } = get(fy)
      return resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['totalLiabilitiesCr'], ['total liabilities', 'total of liabilities'], 'totalLiabilities')
    },
    currentAssets(fy) {
      const { bs } = get(fy)
      return resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['totalCurrentAssetsCr'], CA_ALIASES, 'currentAssets')
    },
    currentLiabilities(fy) {
      const { bs } = get(fy)
      return resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['totalCurrentLiabilitiesCr'], CL_ALIASES, 'currentLiabilities')
    },
    inventory(fy) {
      const { bs } = get(fy)
      return resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['inventoriesCr'], INV_ALIASES, 'inventory')
    },
    receivables(fy) {
      const { bs } = get(fy)
      return resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['tradeReceivablesCr'], AR_ALIASES, 'receivables')
    },
    payables(fy) {
      const { bs } = get(fy)
      return resolve(fy, bs?.kpIs ?? {}, bs?.items ?? [],
        ['tradePayablesCr'], AP_ALIASES, 'payables')
    },
    depreciation(fy) {
      const { pnl } = get(fy)
      return resolve(fy, pnl?.kpIs ?? {}, pnl?.items ?? [],
        ['depreciationCr', 'depreciationAmortisationCr'], DEPR_ALIASES, 'depreciation')
    },
    financeCost(fy) {
      const { pnl } = get(fy)
      return resolve(fy, pnl?.kpIs ?? {}, pnl?.items ?? [],
        ['financeCostCr'], FIN_ALIASES, 'financeCost')
    },
    operatingExpenses(fy) {
      const { pnl } = get(fy)
      return resolve(fy, pnl?.kpIs ?? {}, pnl?.items ?? [],
        ['operatingExpensesCr'], OPEX_ALIASES, 'operatingExpenses')
    },
    totalIncome(fy) {
      const rev = r.revenue(fy).value
      const pnl = get(fy).pnl
      const other = findByKey(pnl?.kpIs ?? {}, 'otherIncomeCr')
      if (rev !== null && other !== null) return { value: rev + other, source: 'derived', derivation: 'revenue + otherIncome', fy }
      if (rev !== null) return { value: rev, source: 'kpis', fy }
      return { value: null, source: 'missing', fy, qualityFlag: 'TOTAL_INCOME_MISSING' }
    },
    isFinancial(fy) {
      const pnl = get(fy).pnl?.kpIs ?? {}
      return 'netInterestIncomeCr' in pnl && pnl.netInterestIncomeCr !== null
    },
    segmentRevenue(fy, _segment) {
      // Stub for segment-specific revenue — populated by external segment data
      // This is a placeholder that can be overridden
      return { value: null, source: 'missing', fy, qualityFlag: 'SEGMENT_REVENUE_NOT_AVAILABLE' }
    },
  }

  return r
}
