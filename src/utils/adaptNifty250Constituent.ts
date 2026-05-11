import type { SensexConstituent, SensexYearFinancial } from '@/data/sensexData';

/* ────────────────────────────────────────────────────────────────────────── */

function validateField<T>(
  raw: Record<string, unknown>,
  key: string,
  defaultVal: T,
  warnings: string[],
  label: string,
): T {
  const val = raw[key];
  if (val === undefined || val === null) {
    warnings.push(
      `${label}: missing field '${key}', using default ${JSON.stringify(defaultVal)}`,
    );
    return defaultVal;
  }
  return val as T;
}

/**
 * Adapt a raw JSON object from the Screener.in live feed into a
 * SensexConstituent.  Populates `warnings[]` for any missing or invalid
 * fields so the UI can surface data-quality issues.
 *
 * P1.1: Runtime shape validation — falls back to safe defaults so the UI
 * never crashes.
 */
export function adaptNifty250Constituent(
  rawUnknown: unknown,
  warnings: string[],
): SensexConstituent | null {
  const raw = (rawUnknown && typeof rawUnknown === 'object'
    ? rawUnknown
    : {}) as Record<string, unknown>;
  const label = String((raw as Record<string, unknown>)['ticker'] ?? (raw as Record<string, unknown>)['id'] ?? '?');

  if (!(raw as Record<string, unknown>)['id'] || !(raw as Record<string, unknown>)['ticker']) {
    warnings.push(`Entry missing id/ticker: ${JSON.stringify(rawUnknown ?? null).slice(0, 80)}`);
    return null;
  }

  const historyRaw = (raw as Record<string, unknown>)['history'];
  const history: SensexYearFinancial[] = (Array.isArray(historyRaw) ? historyRaw : []).map((h: unknown) => {
    const hObj = (h && typeof h === 'object' ? h : {}) as Record<string, unknown>;
    if (!hObj['fy'])
      warnings.push(`${label}: history entry missing 'fy' field`);
    return {
      fy: String(hObj['fy'] ?? ''),
      toplineCr: Number(hObj['toplineCr'] ?? 0),
      netProfitCr: Number(hObj['netProfitCr'] ?? 0),
      roePct: Number(hObj['roePct'] ?? 0),
      operatingMarginPct:
        hObj['operatingMarginPct'] !== undefined
          ? Number(hObj['operatingMarginPct'])
          : hObj['opmPct'] !== undefined
            ? Number(hObj['opmPct'])
            : undefined,
      rocePct:
        hObj['rocePct'] !== undefined ? Number(hObj['rocePct']) : undefined,
    };
  });

  if (history.length === 0)
    warnings.push(`${label}: no history rows in feed`);

  const reportingType = validateField<string>(
    raw as Record<string, unknown>,
    'reportingType',
    'nonFinancial',
    warnings,
    label,
  );

  let valuationMultiple = Number(
    validateField(
      raw as Record<string, unknown>,
      'valuationMultiple',
      0,
      warnings,
      label,
    ),
  );
  if (valuationMultiple <= 0) {
    warnings.push(
      `${label}: valuationMultiple is ${valuationMultiple} (≤ 0) — Gordon model will be unreliable`,
    );
    valuationMultiple = 0;
  }

  const marketCapCr = Number(
    (raw as Record<string, unknown>)['marketCapCr'] ?? 0,
  );
  if (marketCapCr <= 0)
    warnings.push(`${label}: marketCapCr is ${marketCapCr} (≤ 0)`);

  return {
    id: String((raw as Record<string, unknown>)['id'] ?? (raw as Record<string, unknown>)['ticker'] ?? 'unknown'),
    name: String(
      (raw as Record<string, unknown>)['name'] ?? (raw as Record<string, unknown>)['ticker'] ?? 'Unknown',
    ),
    ticker: String((raw as Record<string, unknown>)['ticker'] ?? ''),
    sector: String((raw as Record<string, unknown>)['sector'] ?? 'Unknown'),
    reportingType:
      reportingType === 'financial' ? 'financial' : 'nonFinancial',
    weightPct: Number((raw as Record<string, unknown>)['weightPct'] ?? 0),
    marketCapCr,
    cmp: Number((raw as Record<string, unknown>)['cmp'] ?? 0),
    valuationMetric:
      (raw as Record<string, unknown>)['valuationMetric'] === 'pb' ? 'pb' : 'pe',
    valuationMultiple: Math.max(0, valuationMultiple),
    dividendYieldPct: Number(
      (raw as Record<string, unknown>)['dividendYieldPct'] ?? 0,
    ),
    color: String((raw as Record<string, unknown>)['color'] ?? '#60a5fa'),
    beta: Math.max(
      0.1,
      Number((raw as Record<string, unknown>)['beta'] ?? 1.0),
    ),
    netDebtToEbitda:
      (raw as Record<string, unknown>)['netDebtToEbitda'] !== undefined
        ? Number((raw as Record<string, unknown>)['netDebtToEbitda'])
        : undefined,
    history,
  };
}