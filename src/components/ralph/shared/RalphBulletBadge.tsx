export function RalphBulletBadge({ label, tone = 'blue' }: { label: string; tone?: 'blue' | 'green' | 'gold' | 'red' | 'purple' | 'gray' }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    gold: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    gray: 'bg-surface-3 text-gray-300 border-border',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${colors[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
