import { useMemo, type Dispatch, type SetStateAction } from 'react';
import {
  AreaChart, Area, Bar, LineChart, Line, ComposedChart,
  CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp, Zap } from 'lucide-react';
import { defaultAssumptions, historicalData, sotpData, type ProjectionAssumptions } from '@/data/itcData';
import {
  calculateDCF,
  calculateDynamicSotpSummary,
  generateProjectionDetails,
} from '@/utils/itcModel';
import { ChartTooltip, MetricCard, SectionHeader, fmt, rupee } from './shared';

const SCENARIOS: Array<{
  label: string;
  description: string;
  assumptions: Partial<ProjectionAssumptions>;
}> = [
  {
    label: 'Base',
    description: 'Balanced tax and FMCG margin ramp',
    assumptions: defaultAssumptions,
  },
  {
    label: 'No Hike',
    description: 'Policy relief with stronger cigarette volume',
    assumptions: {
      annualNccdHike: 0,
      cigaretteVolumeGrowth: 2.2,
      illicitTradeDrag: 0.3,
      wacc: 10,
    },
  },
  {
    label: 'Tax Shock',
    description: 'Higher excise, weaker volume, tighter margins',
    assumptions: {
      annualNccdHike: 20,
      cigarettePassThroughRate: 90,
      cigaretteTaxElasticity: -0.55,
      illicitTradeDrag: 1.2,
      cigaretteEbitMargin: 64,
      wacc: 11.5,
      conglomerateDiscount: 8,
    },
  },
  {
    label: 'FMCG Re-rate',
    description: 'Faster scale and margin expansion in non-cig FMCG',
    assumptions: {
      fmcgRevenueGrowth: 15,
      fmcgEbitdaMargin: 15,
      fmcgMarginTarget: 20,
      conglomerateDiscount: 3,
    },
  },
];

export function ProjectionsSection({
  assumptions,
  setAssumptions,
}: {
  assumptions: ProjectionAssumptions;
  setAssumptions: Dispatch<SetStateAction<ProjectionAssumptions>>;
}) {
  const latest = historicalData[historicalData.length - 1];
  const projectionDetails = useMemo(
    () => generateProjectionDetails(assumptions, latest),
    [assumptions, latest],
  );
  const projections = projectionDetails.map(detail => detail.summary);

  const allData = [...historicalData, ...projections];
  const projectStartYear = historicalData[historicalData.length - 1].year;
  const dcfSnapshot = useMemo(
    () => calculateDCF(projections, assumptions.wacc, assumptions.terminalGrowth),
    [projections, assumptions.wacc, assumptions.terminalGrowth],
  );
  const dynamicSotp = useMemo(
    () => calculateDynamicSotpSummary(projectionDetails, sotpData, assumptions.conglomerateDiscount),
    [projectionDetails, assumptions.conglomerateDiscount],
  );

  const revProjData = allData.map(d => ({
    year: d.year,
    Revenue: d.revenue,
    Cigarettes: d.cigaretteRevenue,
    FMCG: d.fmcgRevenue,
  }));

  const bridgeData = projectionDetails.map(detail => ({
    year: detail.year,
    EBIT: detail.ebit,
    NOPAT: detail.nopat,
    FCFF: detail.fcff,
  }));

  const mixProjData = allData.map(d => {
    const total = d.cigaretteRevenue + d.fmcgRevenue + d.hotelsRevenue + d.paperRevenue + d.agriRevenue;
    return {
      year: d.year,
      'Cig Rev %': Math.round((d.cigaretteRevenue / total) * 100),
      'FMCG Rev %': Math.round((d.fmcgRevenue / total) * 100),
    };
  });

  const update = (key: keyof ProjectionAssumptions, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

  const applyScenario = (scenario: Partial<ProjectionAssumptions>) => {
    setAssumptions(prev => ({
      ...prev,
      ...scenario,
    }));
  };

  const sliders: Array<{
    key: keyof ProjectionAssumptions;
    label: string;
    min: number;
    max: number;
    step: number;
    color: string;
  }> = [
    { key: 'cigaretteRevenueGrowth', label: 'Cigarette Price/Mix Growth %', min: 2, max: 10, step: 0.5, color: 'text-emerald-400' },
    { key: 'cigaretteVolumeGrowth', label: 'Cigarette Volume Growth %', min: -2, max: 4, step: 0.5, color: 'text-emerald-300' },
    { key: 'annualNccdHike', label: 'Annual NCCD Hike %', min: 0, max: 25, step: 1, color: 'text-red-400' },
    { key: 'cigarettePassThroughRate', label: 'Pass-through %', min: 50, max: 100, step: 1, color: 'text-red-300' },
    { key: 'cigaretteTaxElasticity', label: 'Tax Elasticity', min: -0.8, max: -0.1, step: 0.05, color: 'text-yellow-400' },
    { key: 'illicitTradeDrag', label: 'Illicit Trade Drag %', min: 0, max: 2, step: 0.1, color: 'text-orange-400' },
    { key: 'fmcgRevenueGrowth', label: 'FMCG Revenue Growth %', min: 8, max: 20, step: 0.5, color: 'text-blue-400' },
    { key: 'fmcgEbitdaMargin', label: 'FMCG Starting Margin %', min: 10, max: 18, step: 0.5, color: 'text-purple-400' },
    { key: 'fmcgMarginTarget', label: 'FMCG Terminal Margin %', min: 14, max: 24, step: 0.5, color: 'text-purple-300' },
    { key: 'capexPercent', label: 'Capex % of Revenue', min: 5, max: 12, step: 0.5, color: 'text-cyan-400' },
    { key: 'workingCapitalPercent', label: 'Working Capital % of Incremental Revenue', min: 0, max: 5, step: 0.25, color: 'text-cyan-300' },
  ];

  const lastDetail = projectionDetails[projectionDetails.length - 1];
  const lastHist = historicalData[historicalData.length - 1];
  const cigRevShareFinal = Math.round((lastDetail.cigaretteRevenue / lastDetail.totalRevenue) * 100);
  const fmcgRevShareFinal = Math.round((lastDetail.fmcgRevenue / lastDetail.totalRevenue) * 100);

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader
        title="Projection Engine"
        subtitle="Scenario-driven forecast model feeding DCF and dynamic SOTP valuation"
        icon={<TrendingUp size={22} />}
      />

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Zap size={16} className="text-yellow-400" /> Scenario Presets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {SCENARIOS.map(scenario => (
            <button
              key={scenario.label}
              onClick={() => applyScenario(scenario.assumptions)}
              className="text-left rounded-xl border border-border bg-surface-3/40 p-4 hover:border-blue-500/40 transition-colors"
            >
              <p className="text-white font-medium">{scenario.label}</p>
              <p className="text-xs text-gray-400 mt-1">{scenario.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Zap size={16} className="text-yellow-400" /> Forecast Drivers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {sliders.map(slider => (
            <div key={slider.key}>
              <label className="text-xs text-gray-400 block mb-1">
                {slider.label}: <span className={`${slider.color} font-bold`}>{assumptions[slider.key]}</span>
              </label>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={assumptions[slider.key]}
                onChange={event => update(slider.key, Number(event.target.value))}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="FY2031E Revenue" value={fmt(lastDetail.totalRevenue)} subtitle="Projected topline" color="blue" />
        <MetricCard title="FY2031E FCFF" value={fmt(lastDetail.fcff)} subtitle="Valuation cash flow" color="green" />
        <MetricCard title="DCF / Share" value={dcfSnapshot.isValid ? rupee(dcfSnapshot.perShareValue) : '—'} subtitle={`WACC ${assumptions.wacc}%`} color="gold" />
        <MetricCard title="Dynamic SOTP / Share" value={rupee(dynamicSotp.perShareBase)} subtitle={`Discount ${assumptions.conglomerateDiscount}%`} color="purple" />
        <MetricCard title="Cig Rev Share (FY31E)" value={`${cigRevShareFinal}%`} subtitle={`vs ${Math.round((lastHist.cigaretteRevenue / lastHist.revenue) * 100)}% FY24`} color="green" />
        <MetricCard title="FMCG Rev Share (FY31E)" value={`${fmcgRevShareFinal}%`} subtitle={`vs ${Math.round((lastHist.fmcgRevenue / lastHist.revenue) * 100)}% FY24`} color="blue" />
        <MetricCard title="Terminal TV Weight" value={`${dcfSnapshot.terminalValueWeight.toFixed(1)}%`} subtitle="DCF diagnostic" color="red" />
        <MetricCard title="Projected Net Cash" value={fmt(dynamicSotp.netCash)} subtitle="Terminal-year balance sheet" color="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenue Trajectory — Historical + Projected</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revProjData}>
              <defs>
                <linearGradient id="gRevP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" fill="url(#gRevP)" strokeWidth={2} />
              <ReferenceLine x={projectStartYear} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '→ Projected', fill: '#f59e0b', fontSize: 10, position: 'top' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">EBIT, NOPAT, and FCFF</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={bridgeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="EBIT" fill="#8b5cf6" opacity={0.45} radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="NOPAT" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="FCFF" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenue Mix Shift — Cigarette vs FMCG (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={mixProjData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="Cig Rev %" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              <Area type="monotone" dataKey="FMCG Rev %" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Cigarette Tax Transmission</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={projectionDetails.map(detail => ({
                year: detail.year,
                'Price Increase %': detail.cigarettePriceIncrease,
                'Volume Growth %': detail.cigaretteVolumeGrowth,
                'Revenue Growth %': detail.cigaretteRevenueGrowth,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="Price Increase %" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Volume Growth %" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Revenue Growth %" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-300 p-4 pb-0 mb-2">Projection-to-Valuation Bridge (₹ Crore)</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-gray-400">Year</th>
              <th className="text-right p-3 text-gray-400">Revenue</th>
              <th className="text-right p-3 text-gray-400">Cig Rev Growth %</th>
              <th className="text-right p-3 text-gray-400">EBIT</th>
              <th className="text-right p-3 text-gray-400">NOPAT</th>
              <th className="text-right p-3 text-gray-400">Capex</th>
              <th className="text-right p-3 text-gray-400">WC Invest.</th>
              <th className="text-right p-3 text-gray-400">FCFF</th>
              <th className="text-right p-3 text-gray-400">DCF / Share</th>
            </tr>
          </thead>
          <tbody>
            {projectionDetails.map(detail => (
              <tr key={detail.year} className="border-b border-border/50 hover:bg-surface-3/50">
                <td className="p-3 text-gray-300 font-medium">{detail.fy}</td>
                <td className="text-right p-3 text-gray-300">{fmt(detail.totalRevenue)}</td>
                <td className="text-right p-3 text-gray-300">{detail.cigaretteRevenueGrowth.toFixed(1)}%</td>
                <td className="text-right p-3 text-gray-300">{fmt(detail.ebit)}</td>
                <td className="text-right p-3 text-gray-300">{fmt(detail.nopat)}</td>
                <td className="text-right p-3 text-gray-300">{fmt(detail.capex)}</td>
                <td className="text-right p-3 text-gray-300">{fmt(detail.workingCapitalInvestment)}</td>
                <td className="text-right p-3 text-blue-300 font-medium">{fmt(detail.fcff)}</td>
                <td className="text-right p-3 text-yellow-300">{dcfSnapshot.isValid ? rupee(dcfSnapshot.perShareValue) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
