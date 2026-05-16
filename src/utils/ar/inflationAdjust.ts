// src/utils/ar/inflationAdjust.ts — India CPI deflator for real terms
// Pure functions. No React.

export const CPI_INDIA: Record<string, number> = {
  'FY2010': 48.2, 'FY2011': 53.1, 'FY2012': 58.8, 'FY2013': 63.0, 'FY2014': 66.5,
  'FY2015': 67.5, 'FY2017': 70.7, 'FY2018': 73.2, 'FY2019': 75.8, 'FY2020': 81.0,
  'FY2021': 85.1, 'FY2022': 89.6, 'FY2023': 95.5, 'FY2024': 100.0, 'FY2025': 104.2,
}

export function getCPI(fy: string): number | null {
  if (fy in CPI_INDIA) return CPI_INDIA[fy]
  // Fallback: try FY prefix variations
  if (/^FY\d{4}$/.test(fy)) {
    return CPI_INDIA[fy] ?? null
  }
  return null
}

export function toRealTerms(nominal: number | null, fy: string, baseFy = 'FY2024'): number | null {
  if (nominal == null) return null
  const cpiThis = getCPI(fy)
  const cpiBase = getCPI(baseFy)
  if (cpiThis == null || cpiBase == null || cpiThis === 0) return null
  return nominal * (cpiBase / cpiThis)
}
