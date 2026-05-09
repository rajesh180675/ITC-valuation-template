import { TrendingUp, RefreshCw, Database } from 'lucide-react';
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
      <div className="glass-card p-3 border border-blue-500/20 flex items-center gap-3 text-xs text-gray-400">
        <RefreshCw size={13} className="animate-spin text-blue-400" />
        <span>Loading live market data…</span>
      </div>
    );
  }

  // Missing / error state — show a compact placeholder so the slot is visible
  if (quote.status === 'missing') {
    return (
      <div className="glass-card p-3 border border-gray-700/40">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <Database size={14} className="text-gray-600" />
          <span>Live market feed not available.</span>
          <span className="text-gray-600">Run <code className="px-1 bg-surface-3 rounded text-[10px]">npm run data:refresh</code> to generate.</span>
        </div>
      </div>
    );
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

  // Format large numbers to Cr
  const mcapCr = d.marketCap !== null ? `₹${(d.marketCap / 1000).toFixed(1)}L Cr` : '—';
  const revCr = d.revenueTTM !== null ? `₹${(d.revenueTTM / 1000).toFixed(1)}L Cr` : '—';

  return (
    <div className="glass-card p-3 border border-blue-500/20">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
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
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">O {fmtPrice(d.open)}</span>
            <span className="text-gray-400">H {fmtPrice(d.dayHigh)}</span>
            <span className="text-gray-400">L {fmtPrice(d.dayLow)}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Vol: {(d as any).volume ? (d as any).volume.toLocaleString() : '—'}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <Stat label="MCap" value={mcapCr} />
          <Stat label="P/E" value={fmtN(d.trailingPE, 1) + 'x'} />
          <Stat label="P/B" value={fmtN(d.priceToBook, 2) + 'x'} />
          <Stat label="Div Yield" value={fmtN(d.dividendYield, 2) + '%'} color="text-yellow-400" />
          <Stat label="52W H" value={fmtPrice(d.fiftyTwoWeekHigh)} />
          <Stat label="52W L" value={fmtPrice(d.fiftyTwoWeekLow)} />
          <Stat label="TTM Rev" value={revCr} />
        </div>

        {/* Source badge */}
        <span className="text-[10px] text-gray-600 shrink-0" title={`Fetched: ${d.fetchedAt}\nSource: ${d.source}`}>
          <RefreshCw size={11} className="inline mr-0.5" />
          NSE live
        </span>
      </div>
    </div>
  );
}
