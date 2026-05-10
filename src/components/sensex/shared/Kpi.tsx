export function Kpi({ label, value, sub, tone, gold, tabular, smallValue }: {
  label: string; value: string; sub: string;
  tone?: 'up' | 'down'; gold?: boolean; tabular?: boolean; smallValue?: boolean;
}) {
  const color = tone === 'up' ? 'text-emerald-300' : tone === 'down' ? 'text-red-300' : gold ? 'text-[color:var(--color-gold-light)]' : 'text-white';
  const valueSize = smallValue ? 'text-base' : 'text-2xl';
  return (
    <div>
      <div className="kpi-eyebrow">{label}</div>
      <div className={`kpi-value ${valueSize} mt-1 ${color} ${tabular ? 'tabular-nums' : ''} truncate`}>{value}</div>
      <div className={`text-[11px] mt-0.5 ${gold ? 'text-[color:var(--color-gold-light)]' : 'text-gray-500'}`}>{sub}</div>
    </div>
  );
}
