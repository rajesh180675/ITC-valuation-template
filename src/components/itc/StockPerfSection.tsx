import { ComposedChart, Area, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { historicalData } from '@/data/itcData';
import { calculateStockPerformance } from '@/utils/itcModel';
import { SectionHeader, MetricCard, ChartTooltip, fmtN, pct } from './shared';

export function StockPerfSection() {
  const perf = calculateStockPerformance(historicalData);

  const priceRangeData = historicalData.map(d => ({
    year: d.year,
    'Price High': d.stockPriceHigh,
    'Price Low': d.stockPriceLow,
    'P/E': d.peRatio,
  }));

  const annualReturnData = perf.annualReturns.map(r => ({
    year: r.year,
    returnPct: r.returnPct,
  }));

  const returnByYearData = perf.annualReturns.map(r => ({
    year: r.year,
    Return: r.returnPct,
  }));

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Stock Performance" subtitle="Historical price range, annual returns, and volatility analysis" icon={<TrendingUp size={22} />} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="CAGR Since Inception" value={pct(perf.cagrSinceInception)} subtitle={`${historicalData.length - 1} years`} trend={perf.cagrSinceInception >= 0 ? perf.cagrSinceInception : undefined} color="blue" />
        <MetricCard title="Best Year" value={pct(perf.bestYear.returnPct)} subtitle={perf.bestYear.year} trend={perf.bestYear.returnPct} color="green" />
        <MetricCard title="Worst Year" value={pct(perf.worstYear.returnPct)} subtitle={perf.worstYear.year} trend={perf.worstYear.returnPct >= 0 ? perf.worstYear.returnPct : undefined} color="red" />
        <MetricCard title="Max Drawdown" value={pct(-perf.maxDrawdown)} subtitle="From peak" color="red" />
        <MetricCard title="Volatility" value={fmtN(perf.volatility) + '%'} subtitle="Std dev of returns" color="purple" />
        <MetricCard title="5Y Rolling Return" value={pct(perf.rollingReturns.fiveY)} subtitle="Annualized" trend={perf.rollingReturns.fiveY >= 0 ? perf.rollingReturns.fiveY : undefined} color="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel 1: Price Range with P/E Overlay */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Price Range with P/E Overlay</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={priceRangeData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <defs>
                <linearGradient id="gPriceHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPriceLow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 'auto']} />
              <Tooltip content={<ChartTooltip />} />
              <Area yAxisId="left" type="monotone" dataKey="Price High" stroke="#3b82f6" fill="url(#gPriceHigh)" strokeWidth={1.5} />
              <Area yAxisId="left" type="monotone" dataKey="Price Low" stroke="#10b981" fill="url(#gPriceLow)" strokeWidth={1.5} />
              <Line yAxisId="right" type="monotone" dataKey="P/E" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Panel 2: Annual Returns */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Annual Returns</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={annualReturnData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="returnPct" radius={[4, 4, 0, 0]}>
                {annualReturnData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.returnPct >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Panel 3: Annual Return by Year (Horizontal) */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Return by Year</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={returnByYearData} layout="vertical" margin={{ left: 30, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis type="category" dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Return" radius={[0, 4, 4, 0]} barSize={12}>
                {returnByYearData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.Return >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}