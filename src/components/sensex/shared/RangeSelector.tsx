import { Info } from 'lucide-react';

export function RangeSelector(props: {
  startFy: string; endFy: string; rangePeriods: number;
  rangeStart: number; rangeEnd: number; totalYears: number;
  setRangeStart: (n: number) => void; setRangeEnd: (n: number) => void;
}) {
  const { startFy, endFy, rangePeriods, rangeStart, rangeEnd, totalYears, setRangeStart, setRangeEnd } = props;
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
        <div>
          <div className="kpi-eyebrow">Analysis Window</div>
          <div className="text-lg font-semibold text-white mt-1">
            {startFy} <span className="text-gray-500 mx-2">→</span> {endFy}
            <span className="ml-3 text-sm font-normal text-[color:var(--color-gold-light)]">{rangePeriods}Y lookback</span>
          </div>
        </div>
        <div className="text-[11px] text-gray-400 flex items-center gap-2">
          <Info size={13} /> CAGR, factor scores and implied growth all recompute live with the window.
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        <div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
            <span>Start FY</span>
            <span className="text-[color:var(--color-gold-light)] font-semibold tabular-nums">{startFy}</span>
          </div>
          <input type="range" min={0} max={totalYears - 2} value={rangeStart}
            onChange={e => {
              const v = Number(e.target.value);
              setRangeStart(v);
              if (v >= rangeEnd) setRangeEnd(Math.min(totalYears - 1, v + 1));
            }}
            className="range-slider w-full" />
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
            <span>End FY</span>
            <span className="text-[color:var(--color-gold-light)] font-semibold tabular-nums">{endFy}</span>
          </div>
          <input type="range" min={1} max={totalYears - 1} value={rangeEnd}
            onChange={e => {
              const v = Number(e.target.value);
              setRangeEnd(v);
              if (v <= rangeStart) setRangeStart(Math.max(0, v - 1));
            }}
            className="range-slider w-full" />
        </div>
      </div>
    </div>
  );
}
