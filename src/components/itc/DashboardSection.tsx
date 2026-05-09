import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';
import { Activity, TrendingUp, Calendar, Database, BookOpen } from 'lucide-react';
import { historicalData } from '@/data/itcData';
import { useItcFinancials, useItcPriceHistory } from '@/utils/dataFeeds';
import { ChartTooltip, MetricCard, SectionHeader, fmt, fmtN, pct, rupee } from './shared';
import { LiveQuoteBanner } from './LiveQuoteBanner';

type DataSource = 'static' | 'live';

export function DashboardSection() {
  const [source, setSource] = useState<DataSource>('static');
  const { data: financialsData } = useItcFinancials();
  const priceHistory = useItcPriceHistory();

  // Build chart data from the selected source
  const activeData = source === 'live' && financialsData?.rows
    ? financialsData.rows.map(r => ({
        year: r.fiscalYear.replace('FY', ''),
        fy: r.fiscalYear,
        revenue: r.revenue,
        cigaretteRevenue: r.cigaretteRevenue,
        fmcgRevenue: r.fmcgRevenue,
        hotelsRevenue: r.hotelsRevenue,
        paperRevenue: r.paperRevenue,
        agriRevenue: r.agriRevenue,
        ebitda: r.ebitda,
        ebitdaMargin: r.ebitdaMargin,
        netProfit: r.netProfit,
        netMargin: r.netMargin,
        eps: r.eps,
        dps: r.dps,
        roe: r.roe,
        roce: r.roce,
        freeCashFlow: r.freeCashFlow,
        totalAssets: r.totalAssets,
        grossDebt: r.grossDebt,
      }))
    : historicalData;

  const latest = activeData[activeData.length - 1];
  const prev = activeData.length > 1 ? activeData[activeData.length - 2] : activeData[0];
  const revGrowth = prev?.revenue ? ((latest.revenue - prev.revenue) / prev.revenue) * 100 : 0;
  const profitGrowth = prev?.netProfit ? ((latest.netProfit - prev.netProfit) / prev.netProfit) * 100 : 0;
  const epsGrowth = prev?.eps ? ((latest.eps - prev.eps) / prev.eps) * 100 : 0;

  // Chart data derived from active source
  const revenueData = activeData.map(d => ({
    year: d.year,
    Revenue: d.revenue,
    Cigarettes: d.cigaretteRevenue ?? 0,
    'FMCG-Others': d.fmcgRevenue ?? 0,
  }));

  const profitData = activeData.map(d => ({
    year: d.year,
    EBITDA: d.ebitda,
    'Net Profit': d.netProfit,
    'FCF': d.freeCashFlow,
  }));

  const marginData = activeData.map(d => ({
    year: d.year,
    'EBITDA Margin': d.ebitdaMargin,
    'Net Margin': d.netMargin,
    'ROE': d.roe,
  }));

  const epsData = activeData.map(d => ({
    year: d.year,
    EPS: d.eps,
    DPS: d.dps ?? 0,
  }));

  const hasLiveFinancials = source === 'live' && financialsData?.rows && financialsData.rows.length > 0;
  const liveYears = hasLiveFinancials ? financialsData!.rows.length : 0;
  const staticYears = historicalData.length;

  return (
    <div className="animate-fadeIn space-y-6">
      <LiveQuoteBanner />

      {/* Data Source Toggle */}
      <div className="glass-card p-3">
        <div className="flex items-center justify-between">
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

      <SectionHeader
        title="ITC Limited — Dashboard"
        subtitle={`${source === 'static' ? 'Curated annual report data (FY2012–FY2025)' : 'Real-time yfinance data with 30-year price history'}`}
        icon={<Activity size={22} />}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Market Cap" value="~₹5.5L Cr" subtitle="Large Cap" color="blue" />
        <MetricCard title="Revenue" value={fmt(latest.revenue)} subtitle={pct(revGrowth) + ' YoY'} trend={revGrowth} color="green" />
        <MetricCard title="Net Profit" value={fmt(latest.netProfit)} subtitle={pct(profitGrowth) + ' YoY'} trend={profitGrowth} color="gold" />
        <MetricCard title="EPS" value={rupee(latest.eps)} subtitle={pct(epsGrowth) + ' YoY'} trend={epsGrowth} color="purple" />
        <MetricCard title="Dividend Yield" value={fmtN(latest.dps ? (latest.dps / latest.eps * 100) : 0) + '%'} subtitle={`DPS: ₹${latest.dps || '—'}`} color="blue" />
        <MetricCard title="P/E Ratio" value={fmtN('peRatio' in latest ? latest.peRatio : latest.eps > 0 ? latest.revenue / (latest.netProfit || 1) * 0.3 : 25) + 'x'} subtitle="TTM" color="green" />
      </div>

      {/* Source badge */}
      <div className="flex justify-end text-[10px] text-gray-600">
        <span className={`px-2 py-0.5 rounded ${source === 'static' ? 'bg-blue-500/10 text-blue-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
          {source === 'static' ? '📖 Static: Annual Reports' : '📡 Live: Yahoo Finance'}
        </span>
      </div>

      {/* Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenue Trajectory (₹ Cr)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" fill="url(#gRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Segment Revenue Split</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Cigarettes" stackId="a" fill="#10b981" />
              <Bar dataKey="FMCG-Others" stackId="a" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profitability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Profitability Metrics (₹ Cr)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="EBITDA" fill="#8b5cf6" opacity={0.7} />
              <Line type="monotone" dataKey="Net Profit" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="FCF" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Margins & Returns (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 70]} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="EBITDA Margin" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Net Margin" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ROE" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EPS & DPS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">EPS & DPS Trend (₹)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={epsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="EPS" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="DPS" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Index — only available in static mode */}
        {source === 'static' && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Cigarette Volume Index vs Tax Hike %</h3>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart
                data={historicalData.map(d => ({
                  year: d.year,
                  'Volume Index': d.cigaretteVolumeIndex,
                  'Tax Hike %': d.taxHikePct,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} domain={[60, 120]} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 30]} />
                <Tooltip content={<ChartTooltip />} />
                <Area yAxisId="left" type="monotone" dataKey="Volume Index" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                <Bar yAxisId="right" dataKey="Tax Hike %" fill="#ef4444" opacity={0.6} radius={[3, 3, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-gray-500 mt-2">Volume index and tax hike data only available from curated annual report sources.</p>
          </div>
        )}
        {source === 'live' && (
          <div className="glass-card p-5 flex items-center justify-center text-xs text-gray-500">
            <Database size={14} className="mr-2 text-gray-600" />
            Volume & tax data is segment-specific and not available from yfinance feeds. Switch to <strong className="mx-1 text-blue-400 cursor-pointer" onClick={() => setSource('static')}>Static</strong> to view.
          </div>
        )}
      </div>

      {/* 30-Year Price History — always shown when available */}
      {priceHistory.data && priceHistory.data.days.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <TrendingUp size={15} className="text-blue-400" />
              ITC Stock Price — {priceHistory.data.startDate} to {priceHistory.data.endDate}
            </h3>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Calendar size={10} />
              {priceHistory.data.totalDays.toLocaleString()} trading days · {priceHistory.data.source}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={priceHistory.data.days.filter((_, i) => i % 22 === 0)}
              margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
            >
              <defs>
                <linearGradient id="gPriceDash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }}
                tickFormatter={(v: string) => v.slice(0, 4)}
                interval={Math.floor(priceHistory.data.days.length / 22 / 15)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="close" stroke="#3b82f6" fill="url(#gPriceDash)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-[10px] text-gray-500 mt-2">
            <span>₹{priceHistory.data.days[0].close.toFixed(2)} ({priceHistory.data.startDate})</span>
            <span>₹{priceHistory.data.days[priceHistory.data.days.length - 1].close.toFixed(2)} (current)</span>
          </div>
        </div>
      )}
    </div>
  );
}
