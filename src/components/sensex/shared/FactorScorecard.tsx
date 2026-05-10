import { fmtN } from '@/components/itc/shared';
import { FactorBar, InlineLegend } from './FactorBar';
import type { SensexConstituent } from '@/data/sensexData';

export function FactorScorecard({ rows, selectedId, onSelect }: {
  rows: { company: SensexConstituent; scores: { quality: number; value: number; growth: number; momentum: number; composite: number } }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const top = [...rows].sort((a, b) => b.scores.composite - a.scores.composite).slice(0, 12);
  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Factor Scorecard</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Percentile-ranked across the filtered universe &middot; Quality / Value / Growth / Momentum
          </p>
        </div>
        <div className="text-[10px] text-gray-500 flex items-center gap-3">
          <InlineLegend color="#60a5fa" label="Quality" />
          <InlineLegend color="#22c55e" label="Value" />
          <InlineLegend color="#d4a843" label="Growth" />
          <InlineLegend color="#a855f7" label="Momentum" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {top.map(r => {
          const s = r.scores;
          const isSelected = r.company.id === selectedId;
          return (
            <button
              key={r.company.id}
              onClick={() => onSelect(r.company.id)}
              className={`sector-chip text-left w-full ${isSelected ? 'ring-1 ring-[color:var(--color-gold-light)]/50' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-6 rounded-sm" style={{ backgroundColor: r.company.color }} />
                  <div>
                    <div className="text-[13px] font-semibold text-gray-100">{r.company.ticker}</div>
                    <div className="text-[10px] text-gray-500">{r.company.sector}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-widest text-gray-500">Composite</div>
                  <div className="text-base font-bold text-[color:var(--color-gold-light)] tabular-nums">{fmtN(s.composite, 0)}</div>
                </div>
              </div>
              <FactorBar label="Quality" value={s.quality} color="#60a5fa" />
              <FactorBar label="Value" value={s.value} color="#22c55e" />
              <FactorBar label="Growth" value={s.growth} color="#d4a843" />
              <FactorBar label="Momentum" value={s.momentum} color="#a855f7" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
