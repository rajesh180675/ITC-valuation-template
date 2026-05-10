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
