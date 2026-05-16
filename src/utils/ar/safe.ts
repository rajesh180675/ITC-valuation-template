// src/utils/ar/safe.ts — Safe arithmetic and financial helpers
// Pure functions for null-safe numeric operations. No React, no DOM.

export type Cr = number
export type Pct = number
export type Ratio = number
export type Years = number

/** Safe division. Returns null on null/zero/NaN/∞/∞. */
export function safeDiv(
  a: number | null | undefined,
  b: number | null | undefined
): number | null {
  if (a == null || b == null || b === 0 || !Number.isFinite(a) || !Number.isFinite(b)) return null
  const r = a / b
  if (!Number.isFinite(r)) return null
  return r
}

/** Safe percentage = safeDiv * 100, rounded to 2dp. */
export function safePct(
  a: number | null | undefined,
  b: number | null | undefined
): Pct | null {
  const d = safeDiv(a, b)
  return d == null ? null : Math.round(d * 100 * 100) / 100
}

/** Safe subtraction. Returns null if either input is null. */
export function safeSub(
  a: number | null | undefined,
  b: number | null | undefined
): number | null {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return null
  return a - b
}

/** Safe sum. Skips nulls. Returns null if all inputs are null. */
export function safeSum(...xs: (number | null | undefined)[]): number | null {
  let s = 0
  let hasAny = false
  for (const x of xs) {
    if (x != null && Number.isFinite(x)) {
      s += x
      hasAny = true
    }
  }
  return hasAny ? s : null
}

/** Safe arithmetic mean. */
export function safeMean(xs: (number | null | undefined)[]): number | null {
  let s = 0
  let c = 0
  for (const x of xs) {
    if (x != null && Number.isFinite(x)) {
      s += x
      c++
    }
  }
  return c > 0 ? s / c : null
}

/** Safe geometric mean (only over positive values). */
export function safeGeomean(xs: (number | null | undefined)[]): number | null {
  let p = 1
  let c = 0
  for (const x of xs) {
    if (x != null && Number.isFinite(x) && x > 0) {
      p *= x
      c++
    }
  }
  if (c === 0) return null
  return p ** (1 / c)
}

/** CAGR = (last/first)^(1/(n-1)) - 1, in %. */
export function cagrPct(
  first: number | null | undefined,
  last: number | null | undefined,
  periods: Years
): Pct | null {
  if (first == null || last == null || !Number.isFinite(first) || !Number.isFinite(last) || first <= 0 || periods <= 1) return null
  const r = (last / first) ** (1 / (periods - 1)) - 1
  return Math.round(r * 100 * 100) / 100
}

/** YoY % change. */
export function yoyPct(curr: number | null, prev: number | null): Pct | null {
  if (curr == null || prev == null || !Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0) return null
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10
}

/** Round to N decimals, preserving null. */
export function round(p: number | null | undefined, dp = 2): number | null {
  if (p == null || !Number.isFinite(p)) return null
  const f = 10 ** dp
  return Math.round(p * f) / f
}

/** Clamp x to [lo, hi]. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

/** Linear interpolate between a and b at t in [0,1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Z-score against a series. Returns null if series empty. */
export function zscore(x: number, series: number[]): number | null {
  if (series.length === 0) return null
  const s = series.filter(Number.isFinite)
  const mean = safeMean(s)
  if (mean == null) return null
  const variance = safeMean(s.map(v => (v - mean) ** 2)) ?? 0
  const sd = Math.sqrt(variance)
  if (sd === 0) return null
  return (x - mean) / sd
}

/** Min-max normalize a value against a series, returns 0..1. */
export function rankPct(x: number, series: number[]): number | null {
  const s = series.filter(Number.isFinite)
  if (s.length === 0) return null
  const min = Math.min(...s)
  const max = Math.max(...s)
  if (max === min) return null
  return (x - min) / (max - min)
}

/** Safe mul: num * factor, null-safe. */
export function safeMul(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return null
  return a * b
}
