import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer,
  Legend, ReferenceLine, LabelList,
} from 'recharts';
import { Layers, Database, BookOpen, TrendingUp } from 'lucide-react';
import { historicalData, segmentDataFY25 } from '@/data/itcData';
import { useItcFinancials } from '@/utils/dataFeeds';
import { ChartTooltip, SectionHeader, fmt } from './shared';

type DataSource = 'static' | 'live';

export function SegmentsSection() {
  const [source, setSource] = useState<DataSource>('static');
  const { data: financialsData } = useItcFinancials();

  const staticSegmentMap = new Map<string, {
    cigPct: number; fmcgPct: number; hotelsPct: number; paperPct: number; agriPct: number;
    cigaretteEbitMargin: number; fmcgEbitdaMargin: number;
  }>();

  for (const d of historicalData) {
    const total = d.cigaretteRevenue + d.fmcgRevenue + d.hotelsRevenue + d.paperRevenue + d.agriRevenue;
    staticSegmentMap.set(d.year, {
      cigPct: total > 0 ? d.cigaretteRevenue / total : 0,
      fmcgPct: total > 0 ? d.fmcgRevenue / total : 0,
      hotelsPct: total > 0 ? d.hotelsRevenue / total : 0,
      paperPct: total > 0 ? d.paperRevenue / total : 0,
      agriPct: total > 0 ? d.agriRevenue / total : 0,
      cigaretteEbitMargin: d.cigaretteEbitMargin,
      fmcgEbitdaMargin: d.fmcgEbitdaMargin,
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
          roe: r.roe,
          roce: r.roce,
          freeCashFlow: r.freeCashFlow,
          totalAssets: r.totalAssets,
          netDebt: 0,
          cigaretteEbitMargin: seg?.cigaretteEbitMargin ?? 0,
          fmcgEbitdaMargin: seg?.fmcgEbitdaMargin ?? 0,
          cigaretteVolumeIndex: 0,
          taxHikePct: 0,
          stockPriceHigh: 0,
          stockPriceLow: 0,
          dividendYield: 0,
          peRatio: 0,
        } as typeof historicalData[number];
      });
    }
    return historicalData;
  }, [source, financialsData]);

  const latest = activeData[activeData.length - 1];

  const segRevPie = useMemo(() => {
    if (source === 'live' && latest) {
      return [
        { name: 'Cigarettes', value: latest.cigaretteRevenue ?? 0, color: '#10b981' },
        { name: 'FMCG (Non-Cigarette)', value: latest.fmcgRevenue ?? 0, color: '#3b82f6' },
        { name: 'Hotels', value: latest.hotelsRevenue ?? 0, color: '#f59e0b' },
        { name: 'Paperboards & Packaging', value: latest.paperRevenue ?? 0, color: '#8b5cf6' },
        { name: 'Agri-Business', value: latest.agriRevenue ?? 0, color: '#ef4444' },
      ].filter(s => s.value > 0);
    }
    return segmentDataFY25.map(s => ({ name: s.name, value: s.revenue, color: s.color }));
  }, [source, latest]);

  const segEbitPie = useMemo(() => {
    if (source === 'live' && latest) {
      return segmentDataFY25.map(s => ({ name: s.name, value: s.ebit, color: s.color }));
    }
    return segmentDataFY25.map(s => ({ name: s.name, value: s.ebit, color: s.color }));
  }, [source, latest]);

  const segTrend = activeData.map(d => {
    const total = d.cigaretteRevenue + d.fmcgRevenue + d.hotelsRevenue + d.paperRevenue + d.agriRevenue;
    return {
      year: d.year,
      Cigarettes: total > 0 ? Math.round((d.cigaretteRevenue / total) * 100) : 0,
      FMCG: total > 0 ? Math.round((d.fmcgRevenue / total) * 100) : 0,
      Hotels: total > 0 ? Math.round((d.hotelsRevenue / total) * 100) : 0,
      Paper: total > 0 ? Math.round((d.paperRevenue / total) * 100) : 0,
      Agri: total > 0 ? Math.round((d.agriRevenue / total) * 100) : 0,
    };
  });

  const fmcgMarginTrend = activeData.map(d => ({
    year: d.year,
    'FMCG EBITDA Margin': d.fmcgEbitdaMargin,
    'Cig EBIT Margin': d.cigaretteEbitMargin,
  }));

  const avgCigaretteShare = useMemo(() => segTrend.length > 0 ? segTrend.reduce((sum, d) => sum + d.Cigarettes, 0) / segTrend.length : 0, [segTrend]);
  const avgCigMargin = useMemo(() => activeData.length > 0 ? activeData.reduce((sum, d) => sum + d.cigaretteEbitMargin, 0) / activeData.length : 0, [activeData]);
  const avgFmcgMargin = useMemo(() => activeData.length > 0 ? activeData.reduce((sum, d) => sum + d.fmcgEbitdaMargin, 0) / activeData.length : 0, [activeData]);

  const hasLiveFinancials = source === 'live' && financialsData?.rows && financialsData.rows.length > 0;
  const liveYears = hasLiveFinancials ? financialsData!.rows.length : 0;
  const staticYears = historicalData.length;

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Business Segment Analysis" subtitle={`Deep dive into ITC's business verticals — ${source === 'live' && hasLiveFinancials ? 'Live' : 'FY2025 (post-demerger)'}`} icon={<Layers size={22} />} />

      {/* Data Source Toggle */}
      <div className="glass-card p-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Database size={13} />
            <span>Data source:</span>
          </div>
          <div className="segmented">
            <button onClick={() => setSource('static')} className={source === 'static' ? 'active' : ''}>
              <BookOpen size={13} className="inline mr-1" />
              Static ({staticYears} years, full segments)
            </button>
            <button onClick={() => setSource('live')} className={source === 'live' ? 'active' : ''}>
              <TrendingUp size={13} className="inline mr-1" />
              Live Feed ({liveYears || '—'} years, real prices)
            </button>
          </div>
          {source === 'live' && !financialsData && (
            <span className="text-[10px] text-yellow-400/70">Feed unavailable — showing static fallback</span>
          )}
        </div>
      </div>

      <div className="flex justify-end text-[10px] text-gray-600">
        <span className={`px-2 py-0.5 rounded ${source === 'static' ? 'bg-blue-500/10 text-blue-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
          {source === 'static' ? '📖 Static: Annual Reports' : '📡 Live: Yahoo Finance'}
        </span>
      </div>

      {/* Segment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {segmentDataFY25.map((s) => (
          <div key={s.name} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-sm font-medium text-gray-200">{s.name}</span>
            </div>
            <p className="text-lg font-bold text-white">{fmt(s.revenue)}</p>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div><span className="text-gray-400">EBIT Margin</span><br /><span className="text-white font-medium">{s.ebitMargin}%</span></div>
              <div><span className="text-gray-400">Rev Share</span><br /><span className="text-white font-medium">{s.revenueShare}%</span></div>
              <div><span className="text-gray-400">EBIT</span><br /><span className="text-white font-medium">{fmt(s.ebit)}</span></div>
              <div><span className="text-gray-400">EBIT Share</span><br /><span className="text-white font-medium">{s.ebitShare}%</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenue Share by Segment (Latest Year)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={segRevPie} cx="50%" cy="45%" outerRadius={100} innerRadius={55} dataKey="value" label={({ name, percent }) => (percent ?? 0) > 0.05 ? `${name}: ${((percent ?? 0) * 100).toFixed(0)}%` : ''} labelLine={false} isAnimationActive={true}>
                {segRevPie.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, color: '#d1d5db' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">EBIT Contribution by Segment (Latest Year)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={segEbitPie} cx="50%" cy="45%" outerRadius={100} innerRadius={55} dataKey="value" label={({ name, percent }) => (percent ?? 0) > 0.05 ? `${name}: ${((percent ?? 0) * 100).toFixed(0)}%` : ''} labelLine={false} isAnimationActive={true}>
                {segEbitPie.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, color: '#d1d5db' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenue Mix Evolution Over Time (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={segTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#d1d5db' }} />
              <ReferenceLine y={avgCigaretteShare} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Avg Cig Share', position: 'insideTopLeft', fill: '#10b981', fontSize: 10 }} />
              <Bar dataKey="Cigarettes" stackId="a" fill="#10b981" isAnimationActive={true} />
              <Bar dataKey="FMCG" stackId="a" fill="#3b82f6" isAnimationActive={true} />
              <Bar dataKey="Hotels" stackId="a" fill="#f59e0b" isAnimationActive={true} />
              <Bar dataKey="Paper" stackId="a" fill="#8b5cf6" isAnimationActive={true} />
              <Bar dataKey="Agri" stackId="a" fill="#ef4444" isAnimationActive={true}>
                <LabelList dataKey="Agri" position="top" formatter={() => '100%'} fill="#9ca3af" fontSize={10} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Cigarette vs FMCG Margin Trajectory (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={fmcgMarginTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#d1d5db' }} />
              <ReferenceLine y={avgCigMargin} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Avg Cig Margin', position: 'insideTopLeft', fill: '#10b981', fontSize: 10 }} />
              <ReferenceLine y={avgFmcgMargin} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: 'Avg FMCG Margin', position: 'insideTopRight', fill: '#3b82f6', fontSize: 10 }} />
              <Line type="monotone" dataKey="Cig EBIT Margin" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={true} />
              <Line type="monotone" dataKey="FMCG EBITDA Margin" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
