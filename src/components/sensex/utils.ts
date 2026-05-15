/** Pure financial/math helpers for the annual-report UI.
 *  Kept separate from components so they can be used by extracted sub-components. */

/** Find a KPI item by partial label match (case-insensitive). */
export function findItem(
  items: { label: string; current?: number | null }[],
  key: string,
): number | null {
  const m = items.find(
    (i) =>
      i.label.toLowerCase().includes(key.toLowerCase()) &&
      i.current !== null,
  );
  return m?.current ?? null;
}

/** Safe percentage helper — never returns 0 caused by null/0 division. */
export function safePct(num: number | null, den: number | null): number | null {
  if (num == null || den == null || den === 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

/** Safe subtraction — returns null if either operand is null. */
export function safeSub(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return a - b;
}
