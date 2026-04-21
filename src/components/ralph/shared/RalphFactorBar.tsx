export function RalphFactorBar({ label, value, color = '#3b82f6' }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-200 tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
