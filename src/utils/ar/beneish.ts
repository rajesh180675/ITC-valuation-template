// src/utils/ar/beneish.ts — Beneish M-Score for earnings manipulation detection
// Pure functions. No React.

import { safeDiv, round } from './safe'

export interface BeneishYear {
  fy: string
  dsri: number | null
  gmi: number | null
  aqi: number | null
  sgi: number | null
  depi: number | null
  sgai: number | null
  lvgi: number | null
  tata: number | null
  m: number | null
  classification: 'conservative' | 'watch' | 'flagged' | 'unknown'
}

export function computeBeneish(data: { fy?: string; ar: number | null; sales: number | null; cogs: number | null; currentAssets: number | null; ppe: number | null; totalAssets: number | null; sga: number | null; depr: number | null; totalLiabs: number | null; wc: number | null }[]): BeneishYear[] {
  const results: BeneishYear[] = []

  for (let i = 1; i < data.length; i++) {
    const c = data[i]
    const p = data[i - 1]
    const fyCurr = c.fy ?? `FY${i + 2010}` // use actual FY name when available
    if (!p || !c.totalAssets || p.totalAssets === 0) {
      results.push({
        fy: fyCurr, dsri: null, gmi: null, aqi: null, sgi: null,
        depi: null, sgai: null, lvgi: null, tata: null, m: null, classification: 'unknown',
      })
      continue
    }

    let dsri: number | null = null
    const arSalesT = safeDiv(c.ar, c.sales)
    const arSalesTm1 = safeDiv(p.ar, p.sales)
    if (arSalesT != null && arSalesTm1 != null && arSalesTm1 !== 0) {
      dsri = safeDiv(arSalesT, arSalesTm1)
    }

    let gmi: number | null = null
    if (c.cogs != null && p.cogs != null && c.sales != null && p.sales != null && c.sales !== 0 && p.sales !== 0) {
      const gmT = (c.sales - c.cogs) / c.sales
      const gmTm1 = (p.sales - p.cogs) / p.sales
      if (gmT !== 0) {
        gmi = safeDiv(gmTm1, gmT)
      }
    }

    let aqi: number | null = null
    if (c.currentAssets != null && c.ppe != null && c.totalAssets != null && c.totalAssets !== 0) {
      if (p.currentAssets != null && p.ppe != null && p.totalAssets != null && p.totalAssets !== 0) {
        const numeratorT = 1 - ((c.currentAssets + c.ppe) / c.totalAssets)
        const numeratorTm1 = 1 - ((p.currentAssets + p.ppe) / p.totalAssets)
        if (numeratorTm1 !== 0) {
          aqi = safeDiv(numeratorT, numeratorTm1)
        }
      }
    }

    const sgi = (c.sales != null && p.sales != null && p.sales !== 0) ? safeDiv(c.sales, p.sales) : null

    let depi: number | null = null
    if (p.depr != null && p.ppe != null && (p.depr + p.ppe) !== 0 && c.depr != null && c.ppe != null && (c.depr + c.ppe) !== 0) {
      const depRatioTm1 = p.depr / (p.depr + p.ppe)
      const depRatioT = c.depr / (c.depr + c.ppe)
      if (depRatioTm1 !== 0) {
        depi = safeDiv(depRatioTm1, depRatioT)
      }
    }

    let sgai: number | null = null
    if (c.sga != null && c.sales != null && c.sales !== 0 && p.sga != null && p.sales != null && p.sales !== 0) {
      const ratioT = c.sga / c.sales
      const ratioTm1 = p.sga / p.sales
      if (ratioTm1 !== 0) {
        sgai = safeDiv(ratioT, ratioTm1)
      }
    }

    let lvgi: number | null = null
    if (c.totalLiabs != null && c.totalAssets != null && c.totalAssets !== 0 && p.totalLiabs != null && p.totalAssets != null && p.totalAssets !== 0) {
      const levT = c.totalLiabs / c.totalAssets
      const levTm1 = p.totalLiabs / p.totalAssets
      if (levTm1 !== 0) {
        lvgi = safeDiv(levT, levTm1)
      }
    }

    let tata: number | null = null
    if (c.wc != null && p.wc != null && c.depr != null && c.totalAssets != null && c.totalAssets !== 0) {
      const deltaWC = c.wc - p.wc
      tata = (deltaWC - c.depr) / c.totalAssets
    }

    let m: number | null = null
    if (dsri != null && gmi != null && aqi != null && sgi != null && depi != null && sgai != null && lvgi != null && tata != null) {
      m = -4.84 + 0.92 * dsri + 0.528 * gmi + 0.404 * aqi + 0.892 * sgi + 0.115 * depi - 0.172 * sgai + 4.679 * tata - 0.327 * lvgi
      m = round(m, 3)
    }

    let classification: BeneishYear['classification'] = 'unknown'
    if (m != null) {
      if (m <= -2.22) classification = 'conservative'
      else if (m <= -1.78) classification = 'watch'
      else classification = 'flagged'
    }

    results.push({
      fy: fyCurr, dsri, gmi, aqi, sgi, depi, sgai, lvgi, tata, m, classification,
    })
  }
  return results
}
