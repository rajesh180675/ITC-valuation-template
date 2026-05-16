// src/utils/ar/monteCarlo.ts — Monte Carlo simulation for valuation
// Pure functions. No React.

export interface MonteCarloDraw {
  revenueGrowth: number
  ebitdaMargin: number
  terminalGrowth: number
  wacc: number
  perShareValue: number
}

export interface MonteCarloResult {
  draws: MonteCarloDraw[]
  p5: number
  p25: number
  p50: number
  p75: number
  p95: number
  meanPerShare: number
  stdPerShare: number
  probAbovePrice: number
}

/** mulberry32 seeded random generator */
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function triangular(min: number, max: number, mode: number, rng: () => number) {
  const u = rng()
  const f = (mode - min) / (max - min)
  if (u <= f) {
    return min + Math.sqrt(u * (max - min) * (mode - min))
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode))
}

export function runMonteCarlo(
  computeFn: (growth: number, margin: number, term: number, wacc: number) => number,
  {
    seed = 42,
    n = 500,
  }: { seed?: number; n?: number } = {}
): MonteCarloResult {
  const rng = mulberry32(seed)
  const draws: MonteCarloDraw[] = []
  
  for (let i = 0; i < n; i++) {
    const revenueGrowth = triangular(-5, 30, 10, rng)
    const ebitdaMargin = triangular(5, 50, 20, rng)
    const terminalGrowth = triangular(1, 10, 4, rng)
    const wacc = triangular(8, 15, 11, rng)
    const perShareValue = computeFn(revenueGrowth, ebitdaMargin, terminalGrowth, wacc)
    draws.push({ revenueGrowth, ebitdaMargin, terminalGrowth, wacc, perShareValue: Math.max(perShareValue, 0) })
  }
  
  const values = draws.map(d => d.perShareValue).sort((a, b) => a - b)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
  const p5 = values[Math.floor(n * 0.05)]
  const p25 = values[Math.floor(n * 0.25)]
  const p50 = values[Math.floor(n * 0.5)]
  const p75 = values[Math.floor(n * 0.75)]
  const p95 = values[Math.floor(n * 0.95)]
  
  return { draws, p5, p25, p50, p75, p95, meanPerShare: mean, stdPerShare: std, probAbovePrice: 0 }
}
