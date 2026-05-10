import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const fmt = (n: number) => {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L Cr`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};

export const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n.toFixed(0)}`;
};

export const fmtN = (n: number, d = 1) => {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(d);
};
export const pct = (n: number, d = 1) => {
  if (!Number.isFinite(n)) return '—%';
  return `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`;
};
export const rupee = (n: number) => {
  if (!Number.isFinite(n)) return '₹—';
  return `₹${n.toFixed(2)}`;
};

/* ─── Smart Chart Tooltip ────────────────────────────────────────────────────
 * Detects value type from dataKey name and formats accordingly.
 * Adds color swatches, proper separators, and context.
 */

function inferFormat(name: string, value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value ?? '—');
  const n = name.toLowerCase();
  const absVal = Math.abs(value);

  // Percentage detection
  if (n.includes('margin') || n.includes('yield') || n.includes('cagr') || n.includes('roe')
      || n.includes('return') || n.includes('pct') || n.includes('%') || n.includes('volatility')
      || n.includes('drawdown') || n.includes('tax') || n.includes('growth')) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  // Price / currency detection
  if (n.includes('price') || n.includes('eps') || n.includes('dps') || n.includes('close')
      || n.includes('high') || n.includes('low') || n.includes('open') || n.includes('cmp')) {
    return `₹${absVal >= 1000 ? value.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : value.toFixed(2)}`;
  }

  // Revenue / profit / large currency
  if (n.includes('revenue') || n.includes('profit') || n.includes('ebitda') || n.includes('fcf')
      || n.includes('cash') || n.includes('asset') || n.includes('debt') || n.includes('cap')
      || n.includes('topline') || n.includes('sales') || n.includes('income')) {
    return fmt(value);
  }

  // Volume / index
  if (n.includes('volume') || n.includes('index')) {
    return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  // Generic large numbers
  if (absVal >= 1000) {
    return value.toLocaleString('en-IN', { maximumFractionDigits: 1 });
  }
  return value.toFixed(1);
}

export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl p-3 shadow-2xl text-sm min-w-[180px]">
      <p className="text-gray-200 font-semibold mb-2 text-xs uppercase tracking-wider border-b border-border/50 pb-1.5">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: p.color || p.fill || '#64748b' }}
              />
              <span className="text-gray-400">{p.name || p.dataKey}</span>
            </div>
            <span className="font-mono font-medium text-gray-100 tabular-nums">
              {inferFormat(p.name || p.dataKey, p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MetricCard({ title, value, subtitle, trend, color = 'blue' }: {
  title: string;
  value: string;
  subtitle: string;
  trend?: number;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
    green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
    gold: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30',
    red: 'from-red-500/20 to-red-600/5 border-red-500/30',
  };

  return (
    <div className={`metric-card p-4 bg-gradient-to-br ${colorMap[color] || colorMap.blue}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {trend !== undefined && (
          trend >= 0 ? <ArrowUpRight size={14} className="text-emerald-400" /> :
            <ArrowDownRight size={14} className="text-red-400" />
        )}
        <span className={`text-xs ${trend !== undefined ? (trend >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-400'}`}>
          {subtitle}
        </span>
      </div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">{icon}</div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <p className="text-gray-400 text-sm ml-12">{subtitle}</p>
    </div>
  );
}

// ─── Waterfall Chart ──────────────────────────────────────────────────────────

export interface WaterfallBar {
  label: string;
  value: number;
  isTotal: boolean;
  color: string;
}

export function WaterfallChart({ data, title }: { data: WaterfallBar[]; title?: string }) {
  // Build stacked bar data: invisible baseline + visible bar
  let running = 0;
  const chartData = data.map((bar) => {
    if (bar.isTotal) {
      const d = { label: bar.label, invisible: 0, visible: bar.value, total: bar.value };
      running = bar.value;
      return d;
    }
    const invisible = bar.value >= 0 ? running : running + bar.value;
    const d = { label: bar.label, invisible, visible: Math.abs(bar.value), total: running + bar.value };
    running = running + bar.value;
    return d;
  });

  return (
    <div className="glass-card p-4">
      {title && <h3 className="text-sm font-medium text-gray-300 mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="invisible" stackId="stack" fill="transparent" />
          <Bar dataKey="visible" stackId="stack" radius={[4, 4, 0, 0]}>
            {data.map((bar, i) => (
              <Cell key={i} fill={bar.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Financial Heatmap ────────────────────────────────────────────────────────

export interface HeatmapCell {
  metric: string;
  year: string;
  value: number;
  colorBand: 'green' | 'yellow' | 'red' | 'neutral';
}

export function FinancialHeatmap({ cells, years }: { cells: HeatmapCell[]; years: string[] }) {
  const metrics = [...new Set(cells.map(c => c.metric))];
  const bandColor: Record<string, string> = {
    green: 'bg-emerald-500/30 text-emerald-300',
    yellow: 'bg-yellow-500/30 text-yellow-300',
    red: 'bg-red-500/30 text-red-300',
    neutral: 'bg-gray-500/20 text-gray-300',
  };

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-2 text-gray-400 font-medium sticky left-0 bg-surface-2 z-10 min-w-[100px]">Metric</th>
            {years.map(y => (
              <th key={y} className="text-right p-2 text-gray-400 font-medium min-w-[60px]">{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(m => (
            <tr key={m} className="border-b border-border/50 hover:bg-white/5">
              <td className="text-left p-2 text-gray-300 sticky left-0 bg-surface-2 z-10">{m}</td>
              {years.map(y => {
                const cell = cells.find(c => c.metric === m && c.year === y);
                return (
                  <td key={y} className={`text-right p-2 font-mono ${cell ? bandColor[cell.colorBand] : ''}`}>
                    {cell ? (Math.abs(cell.value) >= 1000 ? `${(cell.value / 1000).toFixed(1)}K` : cell.value.toFixed(1)) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
