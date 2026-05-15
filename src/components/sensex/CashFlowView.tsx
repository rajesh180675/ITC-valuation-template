import React from 'react';
import { DollarSign, LineChart } from 'lucide-react';
import {
  Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Legend, Cell,
} from 'recharts';
import { fmtN } from '@/components/itc/shared';
import {
  type AnnualReportFileMetadata,
  type AnnualReportYearData,
  type CashFlowPreset,
  type CashFlowTableGroup,
  type CashFlowYearSummary,
  formatCashFlowValue,
} from '@/utils/annualReportCashFlow';
import { KpiCard } from './KpiCard';
import { ChartPanel } from './ChartPanel';

/* ── Cash Flow Waterfall Bridge ──────────────────────────────────────────── */
interface WaterfallItem {
  label: string;
  value: number;
  color: string;
  isNet?: boolean;
}

function buildWaterfallData(summary: CashFlowYearSummary | null): WaterfallItem[] {
  if (!summary) return [];
  const items: WaterfallItem[] = [];
  if (summary.cfo != null) items.push({ label: 'CFO', value: summary.cfo, color: '#10b981' });
  if (summary.capex != null) items.push({ label: 'Capex', value: summary.capex, color: '#ef4444' });
  if (summary.cfi != null && summary.capex != null) {
    // Net investing excluding capex
    const nonCapexInvesting = summary.cfi - summary.capex;
    if (Math.abs(nonCapexInvesting) > 0.1) {
      items.push({ label: 'Other CFI', value: nonCapexInvesting, color: '#f97316' });
    }
  }
  if (summary.dividend != null) items.push({ label: 'Dividend', value: -Math.abs(summary.dividend), color: '#8b5cf6' });
  if (summary.cff != null) {
    const otherCff = summary.cff;
    if (Math.abs(otherCff) > 0.1) {
      items.push({ label: 'Other CFF', value: otherCff, color: '#ec4899' });
    }
  }
  if (summary.netChange != null) {
    items.push({ label: 'Net Change', value: summary.netChange, color: '#3b82f6', isNet: true });
  }
  if (summary.closingCash != null) {
    items.push({ label: 'Closing Cash', value: summary.closingCash, color: '#06b6d4', isNet: true });
  }
  return items;
}

function CashFlowWaterfall({ summary, summaries: _summaries }: { summary: CashFlowYearSummary | null; summaries: CashFlowYearSummary[] }) {
  if (!summary) return <div className="text-center text-gray-400 text-xs">No cash flow data</div>;

  // Build waterfall from the summary for the latest year
  const waterfallItems = buildWaterfallData(summary);
  if (waterfallItems.length === 0) return <div className="text-center text-gray-400 text-xs">No waterfall data</div>;

  // Compute running totals for proper waterfall rendering
  let runningTotal = 0;
  const chartData = waterfallItems.map((item, _index) => {
    const prevTotal = runningTotal;
    if (item.isNet) {
      // Net items start from 0 and grow to their value
      runningTotal = item.value;
      return {
        label: item.label,
        value: item.value,
        base: 0,
        color: item.color,
        isNet: true,
      };
    }
    // Regular items: show from current running total to running total + value
    const newTotal = prevTotal + item.value;
    const barBase = Math.min(prevTotal, newTotal);
    const barValue = Math.abs(item.value);
    runningTotal = newTotal;
    return {
      label: item.label,
      value: barValue,
      base: barBase,
      color: item.color,
      isNet: false,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} tickFormatter={(v: number) => fmtN(v, 0)} />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }}
          formatter={(v: any, n: any, props: any) => {
            const item = chartData[props?.payload?.index ?? 0];
            if (!item) return [fmtN(v, 0), n];
            if (item.isNet) return [fmtN(item.value, 0), 'Value'];
            const actualValue = props?.payload?.value;
            return [fmtN(actualValue, 0), 'Value'];
          }}
        />
        {/* Invisible base bars */}
        <Bar dataKey="base" fill="transparent" stackId="waterfall" barSize={50} />
        {/* Visible value bars */}
        <Bar dataKey="value" stackId="waterfall" barSize={50} radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function CashFlowView({
  data,
  years,
  allYears,
  reportMeta,
  tableModel,
  summaries,
  selectedYears,
  onPresetSelect,
}: {
  data: Record<string, AnnualReportYearData> | null;
  years: string[];
  allYears: string[];
  reportMeta: AnnualReportFileMetadata | null;
  tableModel: { groups: CashFlowTableGroup[]; warnings: string[] };
  summaries: CashFlowYearSummary[];
  selectedYears: string[];
  onPresetSelect: (preset: CashFlowPreset) => void;
}) {
  if (!data) return <div className="glass-card p-5 text-gray-400">No cash flow data for selected years.</div>;
  if (tableModel.groups.length === 0) return <div className="glass-card p-5 text-gray-400">No cash flow data for selected years.</div>;

  const latest = summaries[summaries.length - 1];
  const yearsCovered = allYears.length > 0 ? `${allYears[0]} to ${allYears[allYears.length - 1]}` : 'N/A';
  const generatedAt = reportMeta?.generatedAt ? new Date(reportMeta.generatedAt).toLocaleString() : 'N/A';
  const warningsCount = (reportMeta?.warnings?.length ?? 0) + tableModel.warnings.length;

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button className={`px-3 py-1.5 text-[11px] rounded-md border ${selectedYears.length === 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-gray-800/60 text-gray-300 border-gray-700'}`} onClick={() => onPresetSelect('reset')}>Reset</button>
          <button className={`px-3 py-1.5 text-[11px] rounded-md border ${selectedYears.length === allYears.length ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-gray-800/60 text-gray-300 border-gray-700'}`} onClick={() => onPresetSelect('all')}>All</button>
          <button className="px-3 py-1.5 text-[11px] rounded-md border bg-gray-800/60 text-gray-300 border-gray-700" onClick={() => onPresetSelect('5y')}>5Y</button>
          <button className="px-3 py-1.5 text-[11px] rounded-md border bg-gray-800/60 text-gray-300 border-gray-700" onClick={() => onPresetSelect('3y')}>3Y</button>
        </div>
        <div className="text-[11px] text-gray-400 flex flex-wrap gap-3">
          <span>Years: <span className="text-gray-200">{yearsCovered}</span></span>
          <span>Source: <span className="text-gray-200">Standalone annual reports</span></span>
          <span>Generated: <span className="text-gray-200">{generatedAt}</span></span>
          <span>Warnings: <span className="text-gray-200">{warningsCount}</span></span>
        </div>
      </div>

      <div className="glass-card p-4 overflow-x-auto">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 mb-4">
          <KpiCard label="CFO" value={latest?.cfo ?? null} />
          <KpiCard label="FCF" value={latest?.fcf ?? null} />
          <KpiCard label="Capex" value={latest?.capex == null ? null : Math.abs(latest.capex)} />
          <KpiCard label="Cash Conv" value={latest?.cashConversion ?? null} suffix="%" />
          <KpiCard label="Dividend / FCF" value={latest?.dividendPayout ?? null} suffix="%" />
          <KpiCard label="Closing Cash" value={latest?.closingCash ?? null} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ChartPanel title="Cash Conversion Trend" icon={<LineChart size={14} className="text-emerald-400" />}>
            <ComposedChart data={summaries}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="cashConversion" name="Cash Conversion %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line dataKey="dividendPayout" name="Dividend / FCF %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ChartPanel>

          <ChartPanel title="CFO vs FCF" icon={<DollarSign size={14} className="text-emerald-400" />}>
            <ComposedChart data={summaries}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="fy" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cfo" name="CFO" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fcf" name="FCF" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ChartPanel>
        </div>

        {/* Cash Flow Waterfall Chart — latest year bridge */}
        <div className="glass-card p-4 mb-4">
          <h3 className="text-sm font-semibold text-white mb-3">Cash Flow Bridge ({latest?.fy ?? ''} — Cr)</h3>
          <div className="h-[280px]">
            <CashFlowWaterfall summary={latest} summaries={summaries} />
          </div>
        </div>

        <table className="w-full text-xs tabular-nums" style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 text-gray-400 font-medium">Cash Flow Statement</th>
              {years.map(fy => (
                <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "FY '")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableModel.groups.map(group => (
              <React.Fragment key={group.header}>
                <tr>
                  <td className="text-[11px] font-bold text-emerald-300 pt-4 pb-1 border-b border-emerald-500/20" colSpan={years.length + 1}>
                    {group.header}
                  </td>
                </tr>
                {group.rows.map(row => (
                  <tr key={`${group.header}-${row.key}`} className={`hover:bg-white/[0.03] ${row.isTotal ? 'border-t border-gray-800/80' : ''}`}>
                    <td className={`py-1.5 pr-4 text-[11px] max-w-[280px] ${row.isTotal ? 'text-white font-semibold' : 'text-gray-300'}`}>{row.label}</td>
                    {row.values.map((value, idx) => (
                      <td key={idx} className={`text-right py-1.5 px-2 text-[11px] ${
                        value == null || value === 0 ? 'text-gray-600' : value < 0 ? 'text-rose-300' : 'text-white'
                      }`}>
                        {formatCashFlowValue(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
