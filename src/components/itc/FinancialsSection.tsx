import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { historicalData } from '@/data/itcData';
import { SectionHeader, fmt } from './shared';

export function FinancialsSection() {
  const [view, setView] = useState<'income' | 'balance' | 'returns'>('income');

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Financial Statements" subtitle="Historical financial data across 13 years (FY2012–FY2024)" icon={<BarChart3 size={22} />} />

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
              {historicalData.map(d => (
                <th key={d.year} className="text-right p-3 text-gray-400 font-medium min-w-[80px]">{d.fy}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view === 'income' && (
              <>
                {[
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
                ].map(row => (
                  <tr key={row.key} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium sticky left-0 bg-surface-2 z-10">{row.label}</td>
                    {historicalData.map(d => (
                      <td key={d.year} className="text-right p-3 text-gray-300">
                        {row.fmt(d[row.key as keyof typeof d] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
            {view === 'balance' && (
              <>
                {[
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
                ].map(row => (
                  <tr key={row.key} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium sticky left-0 bg-surface-2 z-10">{row.label}</td>
                    {historicalData.map(d => (
                      <td key={d.year} className="text-right p-3 text-gray-300">
                        {row.fmt(d[row.key as keyof typeof d] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
            {view === 'returns' && (
              <>
                {[
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
                ].map(row => (
                  <tr key={row.key} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium sticky left-0 bg-surface-2 z-10">{row.label}</td>
                    {historicalData.map(d => (
                      <td key={d.year} className="text-right p-3 text-gray-300">
                        {row.fmt(d[row.key as keyof typeof d] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
