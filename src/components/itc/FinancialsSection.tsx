import { useState, useMemo } from 'react';
import { BarChart3, Database, BookOpen, TrendingUp } from 'lucide-react';
import { historicalData } from '@/data/itcData';
import { useItcFinancials } from '@/utils/dataFeeds';
import { SectionHeader, fmt } from './shared';

type DataSource = 'static' | 'live';
type View = 'income' | 'balance' | 'returns';

interface TableRow {
  label: string;
  key: string;
  fmt: (n: number) => string;
}

export function FinancialsSection() {
  const [source, setSource] = useState<DataSource>('static');
  const [view, setView] = useState<View>('income');
  const { data: financialsData } = useItcFinancials();

  // ── Data Source Blending ─────────────────────────────────────────────────
  // Build a lookup map: hardcoded year (e.g. "2025") → segment proportions & static metrics
  const staticSegmentMap = new Map<string, {
    cigPct: number; fmcgPct: number; hotelsPct: number; paperPct: number; agriPct: number;
    netDebt: number;
    cigaretteEbitMargin: number; fmcgEbitdaMargin: number;
    volumeIndex: number; taxHikePct: number;
    dividendYield: number; peRatio: number;
    stockPriceHigh: number; stockPriceLow: number;
  }>();

  for (const d of historicalData) {
    const total = d.cigaretteRevenue + d.fmcgRevenue + d.hotelsRevenue + d.paperRevenue + d.agriRevenue;
    staticSegmentMap.set(d.year, {
      cigPct: total > 0 ? d.cigaretteRevenue / total : 0,
      fmcgPct: total > 0 ? d.fmcgRevenue / total : 0,
      hotelsPct: total > 0 ? d.hotelsRevenue / total : 0,
      paperPct: total > 0 ? d.paperRevenue / total : 0,
      agriPct: total > 0 ? d.agriRevenue / total : 0,
      netDebt: d.netDebt,
      cigaretteEbitMargin: d.cigaretteEbitMargin,
      fmcgEbitdaMargin: d.fmcgEbitdaMargin,
      volumeIndex: d.cigaretteVolumeIndex,
      taxHikePct: d.taxHikePct,
      dividendYield: d.dividendYield,
      peRatio: d.peRatio,
      stockPriceHigh: d.stockPriceHigh,
      stockPriceLow: d.stockPriceLow,
    });
  }

  const activeData = useMemo(() => {
    if (source === 'live' && financialsData?.rows && financialsData.rows.length > 0) {
      return financialsData.rows.map(r => {
        const rev = r.revenue;
        const fyYear = r.fiscalYear.replace('FY', '');
        const seg = staticSegmentMap.get(fyYear) ?? staticSegmentMap.get(String(Number(fyYear) - 1));
        return {
          year: fyYear,
          fy: r.fiscalYear,
          revenue: rev,
          cigaretteRevenue: seg ? Math.round(rev * seg.cigPct) : r.cigaretteRevenue,
          fmcgRevenue: seg ? Math.round(rev * seg.fmcgPct) : r.fmcgRevenue,
          hotelsRevenue: seg ? Math.round(rev * seg.hotelsPct) : r.hotelsRevenue,
          paperRevenue: seg ? Math.round(rev * seg.paperPct) : r.paperRevenue,
          agriRevenue: seg ? Math.round(rev * seg.agriPct) : r.agriRevenue,
          ebitda: r.ebitda,
          ebitdaMargin: r.ebitdaMargin,
          netProfit: r.netProfit,
          netMargin: r.netMargin,
          eps: r.eps,
          dps: r.dps,
          freeCashFlow: r.freeCashFlow,
          totalAssets: r.totalAssets,
          netDebt: seg?.netDebt ?? 0,
          cigaretteEbitMargin: seg?.cigaretteEbitMargin ?? 0,
          fmcgEbitdaMargin: seg?.fmcgEbitdaMargin ?? 0,
          peRatio: seg?.peRatio ?? 0,
          dividendYield: seg?.dividendYield ?? 0,
          stockPriceHigh: seg?.stockPriceHigh ?? 0,
          stockPriceLow: seg?.stockPriceLow ?? 0,
          roe: r.roe,
          roce: r.roce,
          cigaretteVolumeIndex: seg?.volumeIndex ?? 0,
          taxHikePct: seg?.taxHikePct ?? 0,
        };
      });
    }
    return historicalData;
  }, [source, financialsData]);

  const hasLiveFinancials = source === 'live' && financialsData?.rows && financialsData.rows.length > 0;
  const liveYears = hasLiveFinancials ? financialsData!.rows.length : 0;
  const staticYears = historicalData.length;

  const incomeRows: TableRow[] = [
    { label: 'Total Revenue', key: 'revenue', fmt: fmt },
    { label: 'Cigarette Revenue', key: 'cigaretteRevenue', fmt: fmt },
    { label: 'FMCG Revenue', key: 'fmcgRevenue', fmt: fmt },
    { label: 'Hotels Revenue', key: 'hotelsRevenue', fmt: fmt },
    { label: 'Paper & Packaging', key: 'paperRevenue', fmt: fmt },
    { label: 'Agri-Business', key: 'agriRevenue', fmt: fmt },
    { label: 'EBITDA', key: 'ebitda', fmt: fmt },
    { label: 'Net Profit', key: 'netProfit', fmt: fmt },
    { label: 'EPS (₹)', key: 'eps', fmt: (n: number) => `₹${n.toFixed(2)}` },
    { label: 'DPS (₹)', key: 'dps', fmt: (n: number) => `₹${n.toFixed(2)}` },
    { label: 'Free Cash Flow', key: 'freeCashFlow', fmt: fmt },
  ];

  const balanceRows: TableRow[] = [
    { label: 'Total Assets', key: 'totalAssets', fmt: fmt },
    { label: 'Net Debt (Cash)', key: 'netDebt', fmt: (n: number) => n < 0 ? `${fmt(Math.abs(n))} (Cash)` : fmt(n) },
    { label: 'EBITDA Margin (%)', key: 'ebitdaMargin', fmt: (n: number) => `${n.toFixed(1)}%` },
    { label: 'Net Margin (%)', key: 'netMargin', fmt: (n: number) => `${n.toFixed(1)}%` },
    { label: 'Cig EBIT Margin (%)', key: 'cigaretteEbitMargin', fmt: (n: number) => `${n.toFixed(0)}%` },
    { label: 'FMCG EBITDA Margin (%)', key: 'fmcgEbitdaMargin', fmt: (n: number) => `${n.toFixed(0)}%` },
    { label: 'P/E Ratio (x)', key: 'peRatio', fmt: (n: number) => `${n.toFixed(0)}x` },
    { label: 'Dividend Yield (%)', key: 'dividendYield', fmt: (n: number) => `${n.toFixed(1)}%` },
    { label: 'Price High (₹)', key: 'stockPriceHigh', fmt: (n: number) => `₹${n}` },
    { label: 'Price Low (₹)', key: 'stockPriceLow', fmt: (n: number) => `₹${n}` },
  ];

  const returnsRows: TableRow[] = [
    { label: 'ROE (%)', key: 'roe', fmt: (n: number) => `${n.toFixed(1)}%` },
    { label: 'ROCE (%)', key: 'roce', fmt: (n: number) => `${n.toFixed(1)}%` },
    { label: 'EBITDA Margin (%)', key: 'ebitdaMargin', fmt: (n: number) => `${n.toFixed(1)}%` },
    { label: 'Net Margin (%)', key: 'netMargin', fmt: (n: number) => `${n.toFixed(1)}%` },
    { label: 'Volume Index', key: 'cigaretteVolumeIndex', fmt: (n: number) => n.toFixed(0) },
    { label: 'Tax Hike (%)', key: 'taxHikePct', fmt: (n: number) => `${n}%` },
    { label: 'EPS (₹)', key: 'eps', fmt: (n: number) => `₹${n.toFixed(2)}` },
    { label: 'DPS (₹)', key: 'dps', fmt: (n: number) => `₹${n.toFixed(2)}` },
    { label: 'P/E Ratio', key: 'peRatio', fmt: (n: number) => `${n}x` },
    { label: 'Div Yield (%)', key: 'dividendYield', fmt: (n: number) => `${n.toFixed(1)}%` },
  ];

  const currentRows = view === 'income' ? incomeRows : view === 'balance' ? balanceRows : returnsRows;

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader
        title="Financial Statements"
        subtitle={`Historical financial data across ${activeData.length} years (${activeData[0]?.fy || ''}–${activeData[activeData.length - 1]?.fy || ''})`}
        icon={<BarChart3 size={22} />}
      />

      {/* Data Source Toggle */}
      <div className="glass-card p-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Database size={13} />
            <span>Data source:</span>
          </div>
          <div className="segmented">
            <button
              onClick={() => setSource('static')}
              className={source === 'static' ? 'active' : ''}
            >
              <BookOpen size={13} className="inline mr-1" />
              Static ({staticYears} years, full segments)
            </button>
            <button
              onClick={() => setSource('live')}
              className={source === 'live' ? 'active' : ''}
            >
              <TrendingUp size={13} className="inline mr-1" />
              Live Feed ({liveYears || '—'} years, real prices)
            </button>
          </div>
          {source === 'live' && !financialsData && (
            <span className="text-[10px] text-yellow-400/70">Feed unavailable — showing static fallback</span>
          )}
        </div>
      </div>

      {/* Source badge */}
      <div className="flex justify-end text-[10px] text-gray-600">
        <span className={`px-2 py-0.5 rounded ${source === 'static' ? 'bg-blue-500/10 text-blue-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
          {source === 'static' ? '📖 Static: Annual Reports' : '📡 Live: Yahoo Finance'}
        </span>
      </div>

      <div className="flex gap-2 border-b border-border pb-0">
        {(['income', 'balance', 'returns'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} className={`tab-btn px-4 py-2 text-sm font-medium ${view === v ? 'active' : 'text-gray-400'}`}>
            {v === 'income' ? 'Income Statement' : v === 'balance' ? 'Balance Sheet' : 'Returns & Ratios'}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-gray-400 font-medium sticky left-0 bg-surface-2 z-10 min-w-[100px]">Metric</th>
              {activeData.map(d => (
                <th key={d.year} className="text-right p-3 text-gray-400 font-medium min-w-[80px]">{d.fy}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map(row => (
              <tr key={row.key} className="border-b border-border/50 hover:bg-surface-3/50">
                <td className="p-3 text-gray-300 font-medium sticky left-0 bg-surface-2 z-10">{row.label}</td>
                {activeData.map(d => (
                  <td key={d.year} className="text-right p-3 text-gray-300">
                    {row.fmt((d as any)[row.key] as number)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-500">
        {source === 'static'
          ? 'All data curated from ITC annual reports and investor presentations.'
          : 'Segment revenue blended from annual report proportions × yfinance total revenue. Volume, tax, and market data matched from same fiscal year in annual reports.'}
      </p>
    </div>
  );
}
