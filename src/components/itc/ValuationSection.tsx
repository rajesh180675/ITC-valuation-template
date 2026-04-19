import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';
import { Calculator } from 'lucide-react';
import { historicalData, sharesOutstanding, sotpData, type ProjectionAssumptions } from '@/data/itcData';
import { calculateDCF, calculateSotpSummary, generateProjections } from '@/utils/itcModel';
import { ChartTooltip, MetricCard, SectionHeader, fmt, rupee } from './shared';

export function ValuationSection({ assumptions }: { assumptions: ProjectionAssumptions }) {
  const [tab, setTab] = useState<'sotp' | 'dcf'>('sotp');
  const [dcfWacc, setDcfWacc] = useState(10.5);
  const [dcfTerminal, setDcfTerminal] = useState(5.5);

  const latest = historicalData[historicalData.length - 1];
  const projections = useMemo(() => generateProjections(assumptions, latest), [assumptions, latest]);
  const dcfResult = useMemo(() => calculateDCF(projections, dcfWacc, dcfTerminal), [projections, dcfWacc, dcfTerminal]);
  const sotpSummary = useMemo(() => calculateSotpSummary(sotpData, latest), [latest]);
  const {
    totalBase: totalSotpBase,
    totalLow: totalSotpLow,
    totalHigh: totalSotpHigh,
    netCash,
    perShareBase: sotpPerShareBase,
    perShareLow: sotpPerShareLow,
    perShareHigh: sotpPerShareHigh,
  } = sotpSummary;

  const dcfError = dcfResult.validationErrors.length > 0 ? dcfResult.validationErrors.join(' ') : null;

  const sotpBarData = sotpData.map(s => ({
    name: s.segment.replace(/ \(.*\)/, ''),
    'Low': s.valueLow / 1000,
    'Base': s.value / 1000,
    'High': s.valueHigh / 1000,
  }));

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader title="Valuation Tools" subtitle="Sum-of-the-Parts (SOTP) and Discounted Cash Flow (DCF) analysis" icon={<Calculator size={22} />} />

      <div className="flex gap-2 border-b border-border pb-0">
        <button onClick={() => setTab('sotp')} className={`tab-btn px-4 py-2 text-sm font-medium ${tab === 'sotp' ? 'active' : 'text-gray-400'}`}>SOTP Valuation</button>
        <button onClick={() => setTab('dcf')} className={`tab-btn px-4 py-2 text-sm font-medium ${tab === 'dcf' ? 'active' : 'text-gray-400'}`}>DCF Model</button>
      </div>

      <div className="glass-card p-4 text-xs text-gray-400">
        <p className="text-gray-200 font-medium mb-1">Methodology</p>
        <p>
          SOTP uses segment EBIT and peer-style multiples from the current dataset. DCF discounts projected
          consolidated free cash flow and suppresses invalid outputs when terminal growth is greater than or
          equal to WACC.
        </p>
      </div>

      {tab === 'sotp' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard title="Bear Case" value={rupee(sotpPerShareLow)} subtitle="₹3 L Cr off mcap" color="red" />
            <MetricCard title="Base Case" value={rupee(sotpPerShareBase)} subtitle={`${totalSotpBase + netCash > 550000 ? 'Upside' : 'Downside'}`} color="blue" />
            <MetricCard title="Bull Case" value={rupee(sotpPerShareHigh)} subtitle="Premium valuations" color="green" />
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Segment Valuation Range (₹'000 Cr)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sotpBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Low" fill="#ef4444" opacity={0.6} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Base" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                <Bar dataKey="High" fill="#10b981" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-gray-400">Segment</th>
                  <th className="text-right p-3 text-gray-400">EBIT (₹ Cr)</th>
                  <th className="text-right p-3 text-gray-400">Multiple (x)</th>
                  <th className="text-right p-3 text-gray-400">Bear (₹ Cr)</th>
                  <th className="text-right p-3 text-gray-400">Base (₹ Cr)</th>
                  <th className="text-right p-3 text-gray-400">Bull (₹ Cr)</th>
                  <th className="text-left p-3 text-gray-400">Basis</th>
                </tr>
              </thead>
              <tbody>
                {sotpData.map(s => (
                  <tr key={s.segment} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium">{s.segment}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(s.ebit)}</td>
                    <td className="text-right p-3 text-gray-300">{s.multiple}x</td>
                    <td className="text-right p-3 text-red-300">{fmt(s.valueLow)}</td>
                    <td className="text-right p-3 text-blue-300 font-medium">{fmt(s.value)}</td>
                    <td className="text-right p-3 text-emerald-300">{fmt(s.valueHigh)}</td>
                    <td className="p-3 text-gray-400 text-xs">{s.basis}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold">
                  <td className="p-3 text-white">Total Enterprise</td>
                  <td className="p-3" /><td className="p-3" />
                  <td className="text-right p-3 text-red-300">{fmt(totalSotpLow)}</td>
                  <td className="text-right p-3 text-blue-300">{fmt(totalSotpBase)}</td>
                  <td className="text-right p-3 text-emerald-300">{fmt(totalSotpHigh)}</td>
                  <td className="p-3" />
                </tr>
                <tr>
                  <td className="p-3 text-gray-300">+ Net Cash</td>
                  <td /><td />
                  <td className="text-right p-3 text-gray-300">{fmt(netCash)}</td>
                  <td className="text-right p-3 text-gray-300">{fmt(netCash)}</td>
                  <td className="text-right p-3 text-gray-300">{fmt(netCash)}</td>
                  <td />
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 text-white font-bold">Per Share</td>
                  <td /><td />
                  <td className="text-right p-3 text-red-300 font-bold">{rupee(sotpPerShareLow)}</td>
                  <td className="text-right p-3 text-blue-300 font-bold">{rupee(sotpPerShareBase)}</td>
                  <td className="text-right p-3 text-emerald-300 font-bold">{rupee(sotpPerShareHigh)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'dcf' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-300">DCF Assumptions</h3>
              <div>
                <label className="text-sm text-gray-400 block mb-2">WACC: <span className="text-blue-400 font-bold">{dcfWacc}%</span></label>
                <input type="range" min={7} max={14} step={0.5} value={dcfWacc} onChange={e => setDcfWacc(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">Terminal Growth: <span className="text-blue-400 font-bold">{dcfTerminal}%</span></label>
                <input type="range" min={3} max={8} step={0.5} value={dcfTerminal} onChange={e => setDcfTerminal(Number(e.target.value))} className="w-full" />
              </div>
              {dcfError && <p className="text-xs text-red-400">{dcfError}</p>}
            </div>

            <div className="lg:col-span-2 grid grid-cols-3 gap-3">
              <MetricCard title="Enterprise Value" value={dcfResult.isValid ? fmt(dcfResult.enterpriseValue) : '—'} subtitle="PV of all cash flows" color="blue" />
              <MetricCard title="Equity Value" value={dcfResult.isValid ? fmt(dcfResult.equityValue) : '—'} subtitle="+ Net cash" color="green" />
              <MetricCard title="Fair Value / Share" value={dcfResult.isValid ? rupee(dcfResult.perShareValue) : '—'} subtitle={`${sharesOutstanding} Cr shares`} color="gold" />
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Projected Free Cash Flow & PV (₹ Cr)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={projections.map((p, i) => ({ year: p.year, FCF: p.freeCashFlow, 'PV of FCF': dcfResult.pvCashFlows[i] }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2940" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="FCF" fill="#3b82f6" opacity={0.7} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="PV of FCF" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-gray-400">Year</th>
                  <th className="text-right p-3 text-gray-400">Revenue</th>
                  <th className="text-right p-3 text-gray-400">EBITDA</th>
                  <th className="text-right p-3 text-gray-400">Net Profit</th>
                  <th className="text-right p-3 text-gray-400">EPS</th>
                  <th className="text-right p-3 text-gray-400">FCF</th>
                  <th className="text-right p-3 text-gray-400">PV of FCF</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p, i) => (
                  <tr key={p.year} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="p-3 text-gray-300 font-medium">{p.fy}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(p.revenue)}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(p.ebitda)}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(p.netProfit)}</td>
                    <td className="text-right p-3 text-gray-300">{rupee(p.eps)}</td>
                    <td className="text-right p-3 text-gray-300">{fmt(p.freeCashFlow)}</td>
                    <td className="text-right p-3 text-yellow-300">{dcfResult.isValid ? fmt(dcfResult.pvCashFlows[i]) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
