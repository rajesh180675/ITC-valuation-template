import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';
import { Calculator } from 'lucide-react';
import { historicalData, sotpData, type ProjectionAssumptions } from '@/data/itcData';
import {
  buildDcfSensitivity,
  calculateDCF,
  calculateDynamicSotpSummary,
  generateProjectionDetails,
} from '@/utils/itcModel';
import { ChartTooltip, MetricCard, SectionHeader, fmt, rupee } from './shared';

export function ValuationSection({
  assumptions,
  setAssumptions,
}: {
  assumptions: ProjectionAssumptions;
  setAssumptions: Dispatch<SetStateAction<ProjectionAssumptions>>;
}) {
  const [tab, setTab] = useState<'dcf' | 'sotp' | 'sensitivity'>('dcf');

  const latest = historicalData[historicalData.length - 1];
  const projectionDetails = useMemo(
    () => generateProjectionDetails(assumptions, latest),
    [assumptions, latest],
  );
  const projections = projectionDetails.map(detail => detail.summary);
  const dcfResult = useMemo(
    () => calculateDCF(projections, assumptions.wacc, assumptions.terminalGrowth),
    [projections, assumptions.wacc, assumptions.terminalGrowth],
  );
  const dynamicSotp = useMemo(
    () => calculateDynamicSotpSummary(projectionDetails, sotpData, assumptions.conglomerateDiscount),
    [projectionDetails, assumptions.conglomerateDiscount],
  );
  const sensitivity = useMemo(
    () => buildDcfSensitivity(projections, assumptions.wacc, assumptions.terminalGrowth),
    [projections, assumptions.wacc, assumptions.terminalGrowth],
  );
  const sensitivityRows = [...new Set(sensitivity.map(point => point.terminalGrowth))].sort((a, b) => b - a);
  const sensitivityCols = [...new Set(sensitivity.map(point => point.wacc))].sort((a, b) => a - b);

  const bridgeChartData = projectionDetails.map(detail => ({
    year: detail.year,
    EBIT: detail.ebit,
    NOPAT: detail.nopat,
    FCFF: detail.fcff,
    'PV of FCFF': dcfResult.isValid ? dcfResult.pvCashFlows[projectionDetails.indexOf(detail)] : 0,
  }));

  const update = (key: keyof ProjectionAssumptions, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

  const controls: Array<{ key: keyof ProjectionAssumptions; label: string; min: number; max: number; step: number }> = [
    { key: 'wacc', label: 'WACC %', min: 8, max: 14, step: 0.5 },
    { key: 'terminalGrowth', label: 'Terminal Growth %', min: 3, max: 7, step: 0.5 },
    { key: 'conglomerateDiscount', label: 'Conglomerate Discount %', min: 0, max: 15, step: 1 },
  ];

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader
        title="Projection-Driven Valuation"
        subtitle="DCF, dynamic SOTP, and sensitivity analysis all built from the live forecast model"
        icon={<Calculator size={22} />}
      />

      <div className="glass-card p-4 text-xs text-gray-400">
        <p className="text-gray-200 font-medium mb-1">Methodology</p>
        <p>
          The valuation now runs off projected EBIT, NOPAT, working capital, capex, and FCFF rather than
          a separate static calculator. Dynamic SOTP uses terminal-year projected segment economics and applies
          the selected conglomerate discount before net cash.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Valuation Controls</h3>
          {controls.map(control => (
            <div key={control.key}>
              <label className="text-sm text-gray-400 block mb-2">
                {control.label}: <span className="text-blue-400 font-bold">{assumptions[control.key]}%</span>
              </label>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={assumptions[control.key]}
                onChange={event => update(control.key, Number(event.target.value))}
                className="w-full"
              />
            </div>
          ))}
          {dcfResult.validationErrors.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              {dcfResult.validationErrors.join(' ')}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard title="DCF / Share" value={dcfResult.isValid ? rupee(dcfResult.perShareValue) : '—'} subtitle="Forecast FCFF" color="blue" />
          <MetricCard title="Dynamic SOTP / Share" value={rupee(dynamicSotp.perShareBase)} subtitle="Projected segment EBIT" color="green" />
          <MetricCard title="Terminal Value Weight" value={`${dcfResult.terminalValueWeight.toFixed(1)}%`} subtitle="DCF concentration" color="gold" />
          <MetricCard title="Implied Exit EBITDA" value={`${dcfResult.impliedExitEbitdaMultiple.toFixed(1)}x`} subtitle="Terminal check" color="purple" />
          <MetricCard title="Explicit Forecast Weight" value={`${dcfResult.explicitForecastWeight.toFixed(1)}%`} subtitle="PV from forecast years" color="blue" />
          <MetricCard title="Projected Net Cash" value={fmt(dynamicSotp.netCash)} subtitle="Terminal-year capital structure" color="green" />
          <MetricCard title="Conglomerate Discount" value={`${assumptions.conglomerateDiscount}%`} subtitle="Applied to SOTP EV" color="red" />
          <MetricCard title="Terminal Growth" value={`${assumptions.terminalGrowth}%`} subtitle={`vs WACC ${assumptions.wacc}%`} color="gold" />
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-0">
        <button onClick={() => setTab('dcf')} className={`tab-btn px-4 py-2 text-sm font-medium ${tab === 'dcf' ? 'active' : 'text-gray-400'}`}>DCF Bridge</button>
        <button onClick={() => setTab('sotp')} className={`tab-btn px-4 py-2 text-sm font-medium ${tab === 'sotp' ? 'active' : 'text-gray-400'}`}>Dynamic SOTP</button>
        <button onClick={() => setTab('sensitivity')} className={`tab-btn px-4 py-2 text-sm font-medium ${tab === 'sensitivity' ? 'active' : 'text-gray-400'}`}>Sensitivity</button>
      </div>

      {tab === 'dcf' && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Projected EBIT, NOPAT, FCFF, and PV (₹ Cr)</h3>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={bridgeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="EBIT" fill="#8b5cf6" opacity={0.45} radius={[3, 3, 0, 0]} />
                <Bar dataKey="FCFF" fill="#3b82f6" opacity={0.7} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="NOPAT" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="PV of FCFF" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-gray-400">Year</th>
                  <th className="text-right p-3 text-gray-400">Revenue</th>
                  <th className="text-right p-3 text-gray-400">EBIT</th>
                  <th className="text-right p-3 text-gray-400">NOPAT</th>
                  <th className="text-right p-3 text-gray-400">Capex</th>
                  <th className="text-right p-3 text-gray-400">WC Invest.</th>
                  <th className="text-right p-3 text-gray-400">FCFF</th>
                  <th className="text-right p-3 text-gray-400">PV of FCFF</th>
                </tr>
              </thead>
              <tbody>
                {projectionDetails.map((detail, index) => (
                  <tr key={detail.year} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium">{detail.fy}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(detail.totalRevenue)}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(detail.ebit)}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(detail.nopat)}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(detail.capex)}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(detail.workingCapitalInvestment)}</td>
                    <td className="text-right p-3 text-blue-300 font-medium">{fmt(detail.fcff)}</td>
                    <td className="text-right p-3 text-yellow-300">{dcfResult.isValid ? fmt(dcfResult.pvCashFlows[index]) : '—'}</td>
                  </tr>
                ))}
                <tr className="border-t border-border font-bold">
                  <td className="p-3 text-white">Terminal PV</td>
                  <td /><td /><td /><td /><td />
                  <td className="text-right p-3 text-gray-300">{fmt(dcfResult.terminalValue)}</td>
                  <td className="text-right p-3 text-yellow-300">{fmt(dcfResult.pvTerminalValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'sotp' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard title="Bear Case" value={rupee(dynamicSotp.perShareLow)} subtitle="Low multiples" color="red" />
            <MetricCard title="Base Case" value={rupee(dynamicSotp.perShareBase)} subtitle="Projection-driven SOTP" color="blue" />
            <MetricCard title="Bull Case" value={rupee(dynamicSotp.perShareHigh)} subtitle="High multiple set" color="green" />
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Terminal-Year Segment Valuation (₹'000 Cr)</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={dynamicSotp.lines.map(line => ({
                  segment: line.segment.replace(/ \(.*\)/, ''),
                  Bear: line.valueLow / 1000,
                  Base: line.value / 1000,
                  Bull: line.valueHigh / 1000,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis dataKey="segment" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={110} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Bear" fill="#ef4444" opacity={0.55} />
                <Bar dataKey="Base" fill="#3b82f6" />
                <Bar dataKey="Bull" fill="#10b981" opacity={0.55} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-gray-400">Segment</th>
                  <th className="text-right p-3 text-gray-400">Proj. EBIT</th>
                  <th className="text-right p-3 text-gray-400">Multiple</th>
                  <th className="text-right p-3 text-gray-400">Bear</th>
                  <th className="text-right p-3 text-gray-400">Base</th>
                  <th className="text-right p-3 text-gray-400">Bull</th>
                </tr>
              </thead>
              <tbody>
                {dynamicSotp.lines.map(line => (
                  <tr key={line.segment} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium">{line.segment}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(line.ebit)}</td>
                    <td className="text-right p-3 text-gray-300">{line.multiple}x</td>
                    <td className="text-right p-3 text-red-300">{fmt(line.valueLow)}</td>
                    <td className="text-right p-3 text-blue-300 font-medium">{fmt(line.value)}</td>
                    <td className="text-right p-3 text-emerald-300">{fmt(line.valueHigh)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="p-3 text-gray-300">Conglomerate Discount</td>
                  <td /><td />
                  <td className="text-right p-3 text-red-300">({fmt(dynamicSotp.discountValueLow)})</td>
                  <td className="text-right p-3 text-blue-300">({fmt(dynamicSotp.discountValueBase)})</td>
                  <td className="text-right p-3 text-emerald-300">({fmt(dynamicSotp.discountValueHigh)})</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 text-gray-300">+ Net Cash</td>
                  <td /><td />
                  <td className="text-right p-3 text-gray-300">{fmt(dynamicSotp.netCash)}</td>
                  <td className="text-right p-3 text-gray-300">{fmt(dynamicSotp.netCash)}</td>
                  <td className="text-right p-3 text-gray-300">{fmt(dynamicSotp.netCash)}</td>
                </tr>
                <tr className="border-t border-border font-bold">
                  <td className="p-3 text-white">Per Share</td>
                  <td /><td />
                  <td className="text-right p-3 text-red-300">{rupee(dynamicSotp.perShareLow)}</td>
                  <td className="text-right p-3 text-blue-300">{rupee(dynamicSotp.perShareBase)}</td>
                  <td className="text-right p-3 text-emerald-300">{rupee(dynamicSotp.perShareHigh)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'sensitivity' && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">DCF Sensitivity Matrix (₹ / share)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-gray-400">Terminal / WACC</th>
                    {sensitivityCols.map(wacc => (
                      <th key={wacc} className="text-right p-3 text-gray-400">{wacc.toFixed(1)}%</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sensitivityRows.map(terminalGrowth => (
                    <tr key={terminalGrowth} className="border-b border-border/50">
                      <td className="p-3 text-gray-300 font-medium">{terminalGrowth.toFixed(1)}%</td>
                      {sensitivityCols.map(wacc => {
                        const point = sensitivity.find(item => item.wacc === wacc && item.terminalGrowth === terminalGrowth);
                        return (
                          <td
                            key={`${terminalGrowth}-${wacc}`}
                            className={`text-right p-3 ${point?.isBase ? 'text-blue-300 font-bold' : 'text-gray-300'}`}
                          >
                            {!point || point.perShareValue === null ? '—' : rupee(point.perShareValue)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Terminal Value Check</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={projectionDetails.map(detail => ({ year: detail.year, EBITDA: detail.ebitda, FCFF: detail.fcff }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="EBITDA" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="FCFF" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
