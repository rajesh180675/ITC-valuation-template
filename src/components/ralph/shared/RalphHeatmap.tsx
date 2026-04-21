import { useMemo } from 'react';
import type { ScreenerRow } from '@/utils/ralphScreener';

interface HeatmapProps {
  rows: ScreenerRow[];
  factorKeys: Array<keyof ScreenerRow>;
  factorLabels: string[];
}

export function RalphHeatmap({ rows, factorKeys, factorLabels }: HeatmapProps) {
  const percentiles = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const key of factorKeys) {
      const sorted = rows.map(r => Number(r[key]) || 0).sort((a, b) => a - b);
      out[String(key)] = rows.map(r => {
        const val = Number(r[key]) || 0;
        const idx = sorted.findIndex(v => v >= val);
        return sorted.length > 1 ? ((idx < 0 ? sorted.length - 1 : idx) / (sorted.length - 1)) * 100 : 50;
      });
    }
    return out;
  }, [factorKeys, rows]);

  const cellColor = (pct: number) => {
    if (pct >= 70) return `rgba(16,185,129,${0.22 + pct / 220})`;
    if (pct >= 40) return `rgba(245,158,11,${0.16 + pct / 320})`;
    return `rgba(239,68,68,${0.18 + (100 - pct) / 240})`;
  };

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-surface-2">
            <th className="sticky left-0 z-10 bg-surface-2 p-2 text-left text-gray-300">Company</th>
            {factorLabels.map(label => (
              <th key={label} className="min-w-[74px] p-2 text-center text-gray-400">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.companyId} className="border-t border-border/50">
              <td className="sticky left-0 z-10 bg-surface p-2 font-medium text-gray-200 whitespace-nowrap">{row.ticker}</td>
              {factorKeys.map((key, keyIndex) => {
                const pct = percentiles[String(key)]?.[rowIndex] ?? 50;
                const value = Number(row[key]) || 0;
                return (
                  <td
                    key={String(key)}
                    className="ralph-cell p-2 text-center font-mono text-white"
                    style={{ backgroundColor: cellColor(pct) }}
                    title={`${row.name} ${factorLabels[keyIndex]}: ${value.toFixed(1)}`}
                  >
                    {value.toFixed(1)}
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
