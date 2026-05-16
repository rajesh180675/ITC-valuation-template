import { describe, it, expect } from 'vitest'
import * as S from '../safe'

describe('safe.ts', () => {
  // ── safeDiv ───────────────────────────────────────────────────────────────
  it('divides normally', () => {
    expect(S.safeDiv(10, 2)).toBe(5)
  })
  it('returns null on null/zero denom', () => {
    expect(S.safeDiv(10, 0)).toBeNull()
    expect(S.safeDiv(null, 2)).toBeNull()
    expect(S.safeDiv(10, null)).toBeNull()
    expect(S.safeDiv(undefined, 2)).toBeNull()
  })
  it('returns null on NaN/∞', () => {
    expect(S.safeDiv(NaN, 2)).toBeNull()
    expect(S.safeDiv(10, NaN)).toBeNull()
    expect(S.safeDiv(Infinity, 2)).toBeNull()
    expect(S.safeDiv(10, Infinity)).toBeNull()
  })

  // ── safePct ────────────────────────────────────────────────────────────────
  it('computes percentages correctly', () => {
    expect(S.safePct(5, 10)).toBe(50) // 50%
    expect(S.safePct(0, 10)).toBe(0)
  })
  it('returns null on invalid', () => {
    expect(S.safePct(5, 0)).toBeNull()
    expect(S.safePct(null, 10)).toBeNull()
  })

  // ── safeSub ───────────────────────────────────────────────────────────────
  it('subtracts correctly', () => {
    expect(S.safeSub(10, 3)).toBe(7)
  })
  it('returns null on null', () => {
    expect(S.safeSub(null, 3)).toBeNull()
    expect(S.safeSub(10, NaN)).toBeNull()
  })

  // ── safeSum ───────────────────────────────────────────────────────────────
  it('sums correctly', () => {
    expect(S.safeSum(1, 2, 3)).toBe(6)
    expect(S.safeSum(1, null, 3)).toBe(4)
    expect(S.safeSum(null, undefined)).toBeNull()
    expect(S.safeSum()).toBeNull()
  })

  // ── safeMean ──────────────────────────────────────────────────────────────
  it('computes mean', () => {
    expect(S.safeMean([1, 2, 3])).toBe(2)
    expect(S.safeMean([null, 5, null])).toBe(5)
    expect(S.safeMean([])).toBeNull()
  })

  // ── safeGeomean ───────────────────────────────────────────────────────────
  it('computes geometric mean of positive values', () => {
    expect(S.safeGeomean([1, 4, 9])).toBeCloseTo(3.302, 2)
    expect(S.safeGeomean([-1, 2, 4])).toBeCloseTo(2.828, 2) // skips -1
    expect(S.safeGeomean([0, 2, 4])).toBeCloseTo(2.828, 2) // skips non-positive values
    expect(S.safeGeomean([])).toBeNull()
  })

  // ── cagrPct ───────────────────────────────────────────────────────────────
  it('computes CAGR in percent', () => {
    expect(S.cagrPct(100, 121, 3)).toBe(10) // 2-year CAGR over 3 annual observations
  })
  it('returns null for invalid CAGR', () => {
    expect(S.cagrPct(0, 100, 2)).toBeNull() // non-positive first
    expect(S.cagrPct(100, 100, 2)).toBe(0) // 0% growth
    expect(S.cagrPct(null, 100, 2)).toBeNull()
    expect(S.cagrPct(100, null, 2)).toBeNull()
    expect(S.cagrPct(100, 200, 1)).toBeNull() // n<=1
  })

  // ── yoyPct ────────────────────────────────────────────────────────────────
  it('computes YoY', () => {
    expect(S.yoyPct(110, 100)).toBe(10)
    expect(S.yoyPct(90, 100)).toBe(-10)
    expect(S.yoyPct(0, 0)).toBeNull()
    expect(S.yoyPct(null, 100)).toBeNull()
  })

  // ── round ─────────────────────────────────────────────────────────────────
  it('rounds correctly', () => {
    expect(S.round(3.14159)).toBe(3.14)
    expect(S.round(null)).toBeNull()
    expect(S.round(3.14159, 0)).toBe(3)
  })

  // ── clamp ─────────────────────────────────────────────────────────────────
  it('clamps correctly', () => {
    expect(S.clamp(5, 0, 10)).toBe(5)
    expect(S.clamp(-1, 0, 10)).toBe(0)
    expect(S.clamp(15, 0, 10)).toBe(10)
  })

  // ── lerp ──────────────────────────────────────────────────────────────────
  it('interpolates correctly', () => {
    expect(S.lerp(0, 10, 0.5)).toBe(5)
    expect(S.lerp(0, 10, 0)).toBe(0)
    expect(S.lerp(0, 10, 1)).toBe(10)
  })

  // ── zscore ──────────────────────────────────────────────────────────────────
  it('computes z-score', () => {
    expect(S.zscore(15, [10, 20, 30])).toBeCloseTo(-0.61, 2)
    expect(S.zscore(15, [])).toBeNull()
  })

  // ── rankPct ───────────────────────────────────────────────────────────────
  it('ranks correctly', () => {
    expect(S.rankPct(15, [10, 20, 30])).toBeCloseTo(0.25, 2)
    expect(S.rankPct(15, [])).toBeNull()
    expect(S.rankPct(15, [15, 15])).toBeNull() // all same
  })

  // ── safeMul ───────────────────────────────────────────────────────────────
  it('multiplies correctly', () => {
    expect(S.safeMul(3, 4)).toBe(12)
    expect(S.safeMul(null, 4)).toBeNull()
    expect(S.safeMul(Infinity, 2)).toBeNull()
  })
})
