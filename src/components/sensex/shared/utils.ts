/* ── GordonWarning flag ─────────────────────────────────────────────────── */
// P1.4 — marks companies where the Gordon model is unreliable (near-zero payout,
// pre-dividend growth firms). Used in ImpliedVsRealizedScatter tooltips.

export function isGordonUnreliable(dividendYieldPct: number, valuationMultiple: number, reportingType: string): boolean {
  if (reportingType === 'financial') return false; // P/B route is well-defined
  const estimatedPayout = (dividendYieldPct / 100) * valuationMultiple;
  return estimatedPayout < 0.05; // payout ratio < 5% → Gordon inapplicable
}

/* ── NegativePat flag ───────────────────────────────────────────────────── */
// P1.2 — detects whether a company has negative PAT at window endpoints,
// meaning CAGR is unreliable (returns 0 in the current model).

export function hasNegativePat(netProfitStart: number, netProfitEnd: number): boolean {
  return netProfitStart <= 0 || netProfitEnd <= 0;
}

/* ── Colour-blind-safe palette toggle ───────────────────────────────────── */
// P4.4 — alternative blue/orange heatmap palette for accessibility.

export function heatmapColor(value: number, cap: number, colorBlindSafe: boolean): string {
  const clamped = Math.max(-cap, Math.min(cap, value));
  if (colorBlindSafe) {
    // Blue (positive) / Orange (negative) — Okabe-Ito safe palette
    if (clamped >= 0) {
      const t = clamped / cap;
      const alpha = 0.18 + 0.62 * t;
      return `rgba(0, 114, 178, ${alpha.toFixed(2)})`;
    }
    const t = -clamped / cap;
    const alpha = 0.18 + 0.62 * t;
    return `rgba(230, 159, 0, ${alpha.toFixed(2)})`;
  }
  // Default red/green
  if (clamped >= 0) {
    const t = clamped / cap;
    const alpha = 0.18 + 0.62 * t;
    return `rgba(34, 197, 94, ${alpha.toFixed(2)})`;
  }
  const t = -clamped / cap;
  const alpha = 0.18 + 0.62 * t;
  return `rgba(239, 68, 68, ${alpha.toFixed(2)})`;
}
