import { TrendingUp, RefreshCw } from 'lucide-react';
import { useItcLiveQuote } from '@/utils/dataFeeds';

const fmtN = (n: number | null, d = 1) => n !== null ? n.toFixed(d) : '—';
const fmtPrice = (n: number | null) => n !== null ? `₹${n.toFixed(2)}` : '—';

function Stat({ label, value, color = 'text-gray-200' }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

export function LiveQuoteBanner() {
  const quote = useItcLiveQuote();

  // Loading state
  if (quote.status === 'loading') {
    return (
      <div className="glass-card p-3 flex items-center gap-2 text-xs text-gray-400">
        <RefreshCw size={13} className="animate-spin" />
        Loading live market data…
      </div>
    );
  }

  // Missing / error state — silently hidden (hardcoded data on dashboard works fine)
  if (quote.status === 'missing') {
    return null;
  }

  const d = quote.data;

  // Color the current price based on day's direction
  const priceColor =
    d.currentPrice !== null && d.previousClose !== null
      ? d.currentPrice >= d.previousClose
        ? 'text-emerald-400'
        : 'text-red-400'
      : 'text-white';

  const dayChange =
    d.currentPrice !== null && d.previousClose !== null && d.previousClose > 0
      ? ((d.currentPrice - d.previousClose) / d.previousClose) * 100
      : null;

  // TTM data as ₹ Cr
  const revCr = d.revenueTTM !== null ? `₹${(d.revenueTTM / 1000).toFixed(1)}L Cr` : '—';
  const profitCr = d.profitTTM !== null ? `₹${(d.profitTTM / 1000).toFixed(1)}K Cr` : '—';
  const mcapCr = d.marketCap !== null ? `₹${(d.marketCap / 1000).toFixed(1)}L Cr` : '—';

  return (
    <div className="glass-card p-3 border border-blue-500/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Price */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" />
            <span className="text-lg font-bold text-white">ITC</span>
            <span className={`text-lg font-bold ${priceColor}`}>{fmtPrice(d.currentPrice)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {dayChange !== null && (
              <span className={dayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)}%
              </span>
            )}
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">Open: {fmtPrice(d.open)}</span>
            <span className="text-gray-400">High: {fmtPrice(d.dayHigh)}</span>
            <span className="text-gray-400">Low: {fmtPrice(d.dayLow)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <Stat label="MCap" value={mcapCr} />
          <Stat label="P/E" value={fmtN(d.trailingPE, 1) + 'x'} />
          <Stat label="P/B" value={fmtN(d.priceToBook, 2) + 'x'} />
          <Stat label="Div Yield" value={fmtN(d.dividendYield, 2) + '%'} color="text-yellow-400" />
          <Stat label="52W High" value={fmtPrice(d.fiftyTwoWeekHigh)} />
          <Stat label="52W Low" value={fmtPrice(d.fiftyTwoWeekLow)} />
          <Stat label="TTM Rev" value={revCr} />
          <Stat label="TTM Profit" value={profitCr} />
        </div>

        {/* Source badge */}
        <span className="text-[10px] text-gray-600 shrink-0" title={`Fetched: ${d.fetchedAt}\nSource: ${d.source}`}>
          <RefreshCw size={11} className="inline mr-0.5" />
          live
        </span>
      </div>
    </div>
  );
}
