/**
 * React hooks for fetching ITC data at runtime from JSON files in public/data/.
 *
 * Each hook follows the pattern from NiftyIndexDataSection:
 *   - useEffect + fetch + schema validation
 *   - Returns { data, loading, error }
 *   - Financials and Dividend hooks also return fallbackData
 *     (static imports from itcData.ts) when JSON fetch fails
 */

import { useState, useEffect } from 'react';
import {
  validateItcLiveQuote,
  validateItcPriceHistory,
  validateItcFinancials,
  validateItcDividendHistory,
  type ItcLiveQuote,
  type ItcPriceHistory,
  type ItcFinancials,
  type ItcDividendHistory,
} from './itcDataSchemas';
import { historicalData, dividendHistory as staticDividendHistory } from '@/data/itcData';
import type { YearlyData, DividendEntry } from '@/data/itcData';

// ─── URL Constants ──────────────────────────────────────────────────────────

const URL_LIVE_QUOTE = '/data/itc_live_quote.json';
const URL_PRICE_HISTORY = '/data/itc_price_history.json';
const URL_FINANCIALS = '/data/itc_financials.json';
const URL_DIVIDEND_HISTORY = '/data/itc_dividend_history.json';

// ─── useItcLiveQuote ───────────────────────────────────────────────────────

export interface UseItcLiveQuoteReturn {
  data: ItcLiveQuote | null;
  loading: boolean;
  error: string | null;
}

export function useItcLiveQuote(): UseItcLiveQuoteReturn {
  const [data, setData] = useState<ItcLiveQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetch(URL_LIVE_QUOTE)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${URL_LIVE_QUOTE}`);
        const json: unknown = await res.json();
        return validateItcLiveQuote(json);
      })
      .then((validated) => {
        if (!mounted) return;
        setData(validated);
        setError(null);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  return { data, loading, error };
}

// ─── useItcPriceHistory ────────────────────────────────────────────────────

export interface UseItcPriceHistoryReturn {
  data: ItcPriceHistory | null;
  loading: boolean;
  error: string | null;
}

export function useItcPriceHistory(): UseItcPriceHistoryReturn {
  const [data, setData] = useState<ItcPriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetch(URL_PRICE_HISTORY)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${URL_PRICE_HISTORY}`);
        const json: unknown = await res.json();
        return validateItcPriceHistory(json);
      })
      .then((validated) => {
        if (!mounted) return;
        setData(validated);
        setError(null);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  return { data, loading, error };
}

// ─── useItcFinancials ───────────────────────────────────────────────────────

export interface UseItcFinancialsReturn {
  data: ItcFinancials | null;
  loading: boolean;
  error: string | null;
  /** Fallback to static itcData.ts historicalData when JSON is unavailable */
  fallbackData: YearlyData[] | null;
}

export function useItcFinancials(): UseItcFinancialsReturn {
  const [data, setData] = useState<ItcFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetch(URL_FINANCIALS)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${URL_FINANCIALS}`);
        const json: unknown = await res.json();
        return validateItcFinancials(json);
      })
      .then((validated) => {
        if (!mounted) return;
        setData(validated);
        setError(null);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const fallbackData = data === null && !loading ? historicalData : null;

  return { data, loading, error, fallbackData };
}

// ─── useItcDividendHistory ─────────────────────────────────────────────────

export interface UseItcDividendHistoryReturn {
  data: ItcDividendHistory | null;
  loading: boolean;
  error: string | null;
  /** Fallback to static itcData.ts dividendHistory when JSON is unavailable */
  fallbackData: DividendEntry[] | null;
}

export function useItcDividendHistory(): UseItcDividendHistoryReturn {
  const [data, setData] = useState<ItcDividendHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetch(URL_DIVIDEND_HISTORY)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${URL_DIVIDEND_HISTORY}`);
        const json: unknown = await res.json();
        return validateItcDividendHistory(json);
      })
      .then((validated) => {
        if (!mounted) return;
        setData(validated);
        setError(null);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const fallbackData = data === null && !loading ? staticDividendHistory : null;

  return { data, loading, error, fallbackData };
}