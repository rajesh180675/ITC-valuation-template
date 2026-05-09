import { useMemo } from 'react';
import {
  ComposedChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp, RefreshCw, Calendar } from 'lucide-react';
import { historicalData } from '@/data/itcData';
import { calculateStockPerformance } from '@/utils/itcModel';
import { useItcPriceHistory } from '@/utils/dataFeeds';
import { SectionHeader, MetricCard, ChartTooltip, fmtN, pct } from './shared';

export function StockPerfSection() {
  const perf = calculateStockPerformance(historicalData);
  const priceHistory = useItcPriceHistory();

  // Build yearly & monthly data from real price history
  const realData = useMemo(() => {
    if (!priceHistory.data || priceHistory.data.days.length === 0) return null;
    const records = priceHistory.data.days;

    // Group by calendar year
    const byYear = new Map<string, {
      high: number; low: number; open: number; close: number;
      returns: number[]; volume: number; count: number;
    }>();

    // Group by year-month for the detail chart
    const byMonth = new Map<string, {
      high: number; low: number; open: number; close: number; date: string;
    }>();

    let prevClose: number | null = null;

    for (const r of records) {
      const year = r.date.slice(0, 4);
      const month = r.date.slice(0, 7);

      // Year grouping
      if (!byYear.has(year)) {
        byYear.set(year, { high: -Infinity, low: Infinity, open: r.open, close: r.close, returns: [], volume: 0, count: 0 });
      }
      const y = byYear.get(year)!;
      y.high = Math.max(y.high, r.high);
      y.low = Math.min(y.low, r.low);
      y.close = r.close;
      y.volume += r.volume;
      y.count++;

      // Daily return
      if (prevClose !== null) {
        y.returns.push((r.close - prevClose) / prevClose);
      }
      prevClose = r.close;

      // Month grouping
      if (!byMonth.has(month)) {
        byMonth.set(month, { high: -Infinity, low: Infinity, open: r.open, close: r.close, date: r.date });
      }
      const m = byMonth.get(month)!;
      m.high = Math.max(m.high, r.high);
      m.low = Math.min(m.low, r.low);
      m.close = r.close;
    }

    // Calculate annual return
    const yearlyReturns = Array.from(byYear.entries())
      .filter(([_, v]) => v.count > 50) // full trading years only
      .map(([year, v]) => {
        const annualReturn = v.open > 0 ? ((v.close - v.open) / v.open) * 100 : 0;
        const annualHighLow = v.low > 0 ? ((v.high - v.low) / v.low) * 100 : 0;
        return { year, high: v.high, low: v.low, open: v.open, close: v.close, annualReturn, annualHighLow, volume: v.volume, count: v.count };
      })
      .sort((a, b) => a.year.localeCompare(b.year));

    const yearsList = yearlyReturns.map(y => y.year);
    const firstYear = yearsList[0];
    const lastYear = yearsList[yearsList.length - 1];
    const totalYears = yearsList.length;

    // 30-year CAGR
    const firstClose = yearlyReturns[0]?.open ?? 0;
    const lastClose = yearlyReturns[yearlyReturns.length - 1]?.close ?? 0;
    const cagr30 = firstClose > 0 && totalYears > 0
      ? ((Math.pow(lastClose / firstClose, 1 / totalYears) - 1) * 100) : null;

    // Best/worst year from real data
    const bestYear = yearlyReturns.reduce((best, y) => y.annualReturn > best.annualReturn ? y : best, yearlyReturns[0]);
    const worstYear = yearlyReturns.reduce((worst, y) => y.annualReturn < worst.annualReturn ? y : worst, yearlyReturns[0]);

    // Monthly close data (subsample for chart performance)
    const monthlyData = Array.from(byMonth.entries())
      .map(([month, v]) => ({ month, close: v.close, high: v.high, low: v.low, date: v.date }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      yearlyReturns,
      monthlyData,
      cagr30,
      cagrPct: cagr30 !== null ? cagr30 : perf.cagrSinceInception,
      bestYearReal: bestYear,
      worstYearReal: worstYear,
      firstYear,
      lastYear,
      totalYears,
    };
  }, [priceHistory, perf]);

  // Price range data (unified type for both real and fallback)
  type PriceRangePoint = { year: string; 'Price High': number; 'Price Low': number; ref?: number };
  let priceRangeData: PriceRangePoint[];
  if (realData) {
    priceRangeData = realData.yearlyReturns.map(d => ({
      year: d.year,
      'Price High': d.high,
      'Price Low': d.low,
      ref: d.close,
    }));
  } else {
    priceRangeData = historicalData.map(d => ({
      year: d.year,
      'Price High': d.stockPriceHigh,
      'Price Low': d.stockPriceLow,
      ref: d.peRatio,
    }));
  }

  // Monthly close chart (when real data is available)
  const monthlyCloseData = realData
    ? realData.monthlyData.map(d => ({
        month: d.month,
        Close: d.close,
        Low: d.low,
        High: d.high,
      }))
    : [];

  const annualReturnData = realData
    ? realData.yearlyReturns.map(d => ({
        year: d.year,
        returnPct: d.annualReturn,
      }))
    : perf.annualReturns.map(r => ({
        year: r.year,
        returnPct: r.returnPct,
      }));

  const hasRealData = priceHistory.data !== null && priceHistory.data.days.length > 0;

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader
        title="Stock Performance"
        subtitle={`Complete price history spanning ${realData ? realData.totalYears : historicalData.length - 1} years`}
        icon={<TrendingUp size={22} />}
      />

      {hasRealData && realData && (
        <div className="flex items-center gap-4 text-[10px] text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <RefreshCw size={10} className="text-emerald-400" />
            {priceHistory.data?.days.length.toLocaleString()} trading days
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={10} className="text-blue-400" />
            {realData.firstYear} → {realData.lastYear} ({realData.totalYears} years)
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">{priceHistory.data?.source ?? 'synthetic'}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {realData !== null && realData.cagr30 !== null ? (
          <MetricCard title={`${realData.totalYears}Y CAGR`} value={pct(realData.cagrPct)} subtitle={`${realData.firstYear}–${realData.lastYear}`} trend={realData.cagrPct >= 0 ? realData.cagrPct : undefined} color="blue" />
        ) : (
          <MetricCard title="CAGR Since Inception" value={pct(perf.cagrSinceInception)} subtitle={`${historicalData.length - 1} years`} trend={perf.cagrSinceInception >= 0 ? perf.cagrSinceInception : undefined} color="blue" />
        )}
        {realData ? (
          <>
            <MetricCard title="Best Year" value={pct(realData.bestYearReal.annualReturn)} subtitle={realData.bestYearReal.year} trend={realData.bestYearReal.annualReturn >= 0 ? realData.bestYearReal.annualReturn : undefined} color="green" />
            <MetricCard title="Worst Year" value={pct(realData.worstYearReal.annualReturn)} subtitle={realData.worstYearReal.year} trend={realData.worstYearReal.annualReturn >= 0 ? realData.worstYearReal.annualReturn : undefined} color="red" />
          </>
        ) : (
          <>
            <MetricCard title="Best Year" value={pct(perf.bestYear.returnPct)} subtitle={perf.bestYear.year} trend={perf.bestYear.returnPct} color="green" />
            <MetricCard title="Worst Year" value={pct(perf.worstYear.returnPct)} subtitle={perf.worstYear.year} trend={perf.worstYear.returnPct >= 0 ? perf.worstYear.returnPct : undefined} color="red" />
          </>
        )}
        <MetricCard title="Max Drawdown" value={pct(-perf.maxDrawdown)} subtitle="From peak" color="red" />
        <MetricCard title="Volatility" value={fmtN(perf.volatility) + '%'} subtitle="Std dev of returns" color="purple" />
        <MetricCard title="5Y Rolling Return" value={pct(perf.rollingReturns.fiveY)} subtitle="Annualized" trend={perf.rollingReturns.fiveY >= 0 ? perf.rollingReturns.fiveY : undefined} color="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Full Price Range — 30 years */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            Annual Price Range {hasRealData ? `(${realData?.firstYear}–${realData?.lastYear})` : ''}
          </h3>
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
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 9 }} interval={Math.max(1, Math.floor(priceRangeData.length / 15))} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="Price High" stroke="#3b82f6" fill="url(#gPriceHigh)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="Price Low" stroke="#10b981" fill="url(#gPriceLow)" strokeWidth={1.5} />
              <ReferenceLine y={307} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={{ value: '₹307 (CMP)', fill: '#f59e0b', fontSize: 9, position: 'right' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Close Chart — full history */}
        {hasRealData && monthlyCloseData.length > 0 ? (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Monthly Close Price — Full History</h3>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={monthlyCloseData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <defs>
                  <linearGradient id="gClose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 8 }}
                  tickFormatter={(v: string) => v.slice(0, 4)}
                  interval={Math.max(1, Math.floor(monthlyCloseData.length / 15))} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Close" stroke="#3b82f6" fill="url(#gClose)" strokeWidth={1.5} />
                <ReferenceLine y={307} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'CMP', fill: '#f59e0b', fontSize: 9, position: 'right' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
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
        )}

        {/* Annual Returns Bars */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Annual Returns — {hasRealData ? `${realData?.firstYear}–${realData?.lastYear}` : 'All Years'}</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={annualReturnData} layout="vertical" margin={{ left: 40, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis type="category" dataKey="year" tick={{ fill: '#94a3b8', fontSize: 10 }} width={40} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="returnPct" radius={[0, 4, 4, 0]} barSize={10}>
                {annualReturnData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.returnPct >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
              <ReferenceLine x={0} stroke="#64748b" strokeWidth={1} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
