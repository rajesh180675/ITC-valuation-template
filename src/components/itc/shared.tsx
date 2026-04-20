import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

export const fmt = (n: number) => {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L Cr`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};

export const fmtN = (n: number, d = 1) => n.toFixed(d);
export const pct = (n: number, d = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`;
export const rupee = (n: number) => `₹${n.toFixed(2)}`;

export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-sm">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmt(p.value) : fmtN(p.value)}
        </p>
      ))}
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
