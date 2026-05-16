import { fmt } from '@/components/itc/shared';

export function KpiCard({
  label,
  value,
  trend,
  suffix,
  className = '',
}: {
  label: string;
  value: number | null;
  trend?: number | null;
  suffix?: string;
  className?: string;
}) {
  // If a suffix is given (%, x, etc.) the value is a plain ratio — format as a number, not ₹/Cr
  const valStr = value != null
    ? suffix
      ? `${Math.abs(value) >= 1000 ? value.toLocaleString('en-IN', { maximumFractionDigits: 1 }) : value.toFixed(1)}`
      : fmt(value)
    : '—';
  let trendEl = null;
  if (trend != null && trend !== 0) {
    trendEl = (
      <span className={`text-[10px] font-mono ${trend > 5 ? 'text-emerald-400' : trend < -5 ? 'text-rose-400' : 'text-gray-500'}`}>
        {trend > 0 ? '\u25B2' : '\u25BC'} {Math.abs(trend).toFixed(1)}%
      </span>
    );
  }
  return (
    <div className={`glass-card p-3 flex flex-col gap-0.5 min-w-[130px] ${className}`}>
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-lg font-bold text-white tabular-nums">{valStr}{suffix || ''}</span>
      {trendEl}
    </div>
  );
}

export default KpiCard;
