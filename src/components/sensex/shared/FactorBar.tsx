export function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="text-[10px] text-gray-400 w-16 shrink-0">{label}</div>
      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, value)}%`, background: color, opacity: 0.85 }} />
      </div>
      <div className="text-[10px] text-gray-200 tabular-nums w-8 text-right">{Math.round(value)}</div>
    </div>
  );
}

export function ScoreChip({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#d4a843' : score >= 30 ? '#94a3b8' : '#ef4444';
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums font-semibold" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {Math.round(score)}
    </span>
  );
}

export function InlineLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
