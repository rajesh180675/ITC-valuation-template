import { useItcLiveQuote } from '@/utils/dataFeeds';
import { historicalData, currentMarketPrice, sharesOutstanding } from '@/data/itcData';
import { fmtN, rupee } from './shared';
import { Info, AlertTriangle } from 'lucide-react';

/**
 * LiveQuoteBanner — displays ITC live trading data at the top of the Dashboard.
 *
 * Three states:
 *  - Loading: animated skeleton
 *  - Data available: render live quote values
 *  - Error/no JSON: fallback to static historicalData with "(static)" badge
 */
export function LiveQuoteBanner() {
  const { data, loading, error } = useItcLiveQuote();

  // Fallback: derive from the latest static data row
  const latest = historicalData[historicalData.length - 1];
  const fallback = {
    symbol: 'ITC.NS',
    exchange: 'NSE',
    lastPrice: currentMarketPrice || latest.stockPriceLow + (latest.stockPriceHigh - latest.stockPriceLow) * 0.5,
    change: 0,
    changePercent: 0,
    open: latest.stockPriceLow + (latest.stockPriceHigh - latest.stockPriceLow) * 0.5,
    high: latest.stockPriceHigh,
    low: latest.stockPriceLow,
    previousClose: latest.stockPriceLow + (latest.stockPriceHigh - latest.stockPriceLow) * 0.4,
    volume: 0,
    marketCap: sharesOutstanding * (currentMarketPrice || 418),
    pe: latest.peRatio,
    pb: 7.6,
    dividendYield: latest.dividendYield,
    fiftyTwoWeekHigh: latest.stockPriceHigh,
    fiftyTwoWeekLow: latest.stockPriceLow,
    ttmRevenue: latest.revenue,
    ttmNetProfit: latest.netProfit,
    source: 'synthetic' as const,
    fetchedAt: new Date().toISOString(),
  };

  // Loading state: animated skeleton
  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-8 w-32 bg-gray-700/40 rounded" />
          <div className="h-8 w-20 bg-gray-700/40 rounded" />
          <div className="h-6 w-48 bg-gray-700/30 rounded hidden md:block" />
          <div className="h-6 w-64 bg-gray-700/30 rounded hidden lg:block" />
        </div>
      </div>
    );
  }

  // Determine what to render
  const q = data ?? fallback;
  const isLive = data !== null;
  const priceColor = q.change >= 0 ? 'text-emerald-400' : 'text-red-400';
  const changeSign = q.change >= 0 ? '+' : '';
  const sourceLabel = isLive ? q.source : 'static';
  const fetchedLabel = isLive ? new Date(q.fetchedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : `FY${latest.fy} annual`;

  // Error banner for failed fetch (non-blocking — still shows fallback data)
  const errorBanner = error && !isLive ? (
    <div className="flex items-center gap-2 text-xs text-yellow-400/80 mt-2">
      <AlertTriangle size={12} />
      <span>Live data unavailable ({error}). Showing static data.</span>
    </div>
  ) : null;

  // Staleness warning: live data older than 24h
  const staleHours = isLive
    ? (Date.now() - new Date(q.fetchedAt).getTime()) / (1000 * 60 * 60)
    : 0;
  const stalenessBanner = isLive && staleHours > 24 ? (
    <div className="flex items-center gap-2 text-xs text-yellow-400/80 mt-1">
      <AlertTriangle size={12} />
      <span>Live quote is {Math.round(staleHours)}h old — data may be stale.</span>
    </div>
  ) : null;

  return (
    <div className="glass-card p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* Symbol + Price + Change */}
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-gray-400 font-medium">{q.symbol}</span>
          <span className="text-2xl font-bold text-white">{rupee(q.lastPrice)}</span>
          <span className={`text-sm font-semibold ${priceColor}`}>
            {changeSign}{fmtN(q.change)} ({changeSign}{fmtN(q.changePercent)}%)
          </span>
          {!isLive && (
            <span className="text-[10px] bg-gray-600/60 text-gray-300 px-1.5 py-0.5 rounded font-medium">STATIC</span>
          )}
        </div>

        {/* OHLC */}
        <div className="hidden md:flex items-center gap-3 text-xs text-gray-400">
          <span>O <span className="text-white">{rupee(q.open)}</span></span>
          <span>H <span className="text-white">{rupee(q.high)}</span></span>
          <span>L <span className="text-white">{rupee(q.low)}</span></span>
          <span>PC <span className="text-white">{rupee(q.previousClose)}</span></span>
        </div>

        {/* Key metrics */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-gray-400">
          <span>P/E <span className="text-white">{fmtN(q.pe)}</span></span>
          <span>P/B <span className="text-white">{fmtN(q.pb)}</span></span>
          <span>Div <span className="text-emerald-400">{fmtN(q.dividendYield)}%</span></span>
          <span>MktCap <span className="text-white">{fmtMarketCap(q.marketCap)}</span></span>
        </div>

        {/* 52W range */}
        <div className="hidden xl:flex items-center gap-1 text-xs text-gray-400">
          <span>52W</span>
          <span className="text-white">{rupee(q.fiftyTwoWeekLow)}</span>
          <span>—</span>
          <span className="text-white">{rupee(q.fiftyTwoWeekHigh)}</span>
        </div>

        {/* TTM */}
        <div className="hidden 2xl:flex items-center gap-3 text-xs text-gray-400">
          <span>TTM Rev <span className="text-white">₹{fmtN(q.ttmRevenue / 100, 1)}L Cr</span></span>
          <span>PAT <span className="text-white">₹{fmtN(q.ttmNetProfit / 100, 1)}L Cr</span></span>
        </div>

        {/* Source indicator */}
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-500" title={`Source: ${sourceLabel} | ${fetchedLabel}`}>
          <Info size={10} />
          <span>{fetchedLabel}</span>
        </div>
      </div>

      {errorBanner}
      {stalenessBanner}
    </div>
  );
}

function fmtMarketCap(capCr: number): string {
  if (capCr >= 100000) return `₹${(capCr / 100000).toFixed(2)}L Cr`;
  if (capCr >= 1000) return `₹${(capCr / 1000).toFixed(1)}K Cr`;
  return `₹${capCr.toFixed(0)} Cr`;
}