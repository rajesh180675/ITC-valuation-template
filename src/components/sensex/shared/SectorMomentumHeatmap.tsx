import { useState } from 'react';
import { fmtN } from '@/components/itc/shared';
import type { SectorMomentumRow } from '@/utils/sensexAnalytics';
import { heatmapColor } from './utils';

export function SectorMomentumHeatmap({ rows }: { rows: SectorMomentumRow[] }) {
  const [colorBlindSafe, setColorBlindSafe] = useState(false);
  if (rows.length === 0) return null;
  const fyLabels = rows[0].cells.map((c) => c.fy);
  const cap = 60;

  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Sector Momentum Heatmap</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">YoY PAT growth by sector — read rotation across cycles.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            {colorBlindSafe ? (
              <>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(230,159,0,0.7)' }} />−contraction</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(0,114,178,0.7)' }} />+expansion</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(239,68,68,0.7)' }} />−60%+</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34,197,94,0.7)' }} />+60%+</span>
              </>
            )}
          </div>
          <button
            onClick={() => setColorBlindSafe(v => !v)}
            className={`text-[10px] px-2 py-1 rounded border transition ${
              colorBlindSafe
                ? 'border-blue-400 text-blue-300 bg-blue-900/30'
                : 'border-border text-gray-400 bg-black/20'
            }`}
            title="Toggle color-blind-safe palette (blue/orange)"
          >
            {colorBlindSafe ? '🔵 CB-safe' : '🟢 Default'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] tabular-nums">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left py-2 px-2 sticky left-0 bg-[rgba(15,23,41,0.96)] z-10" style={{ minWidth: 180 }}>Sector</th>
              <th className="text-right py-2 px-2">Wt</th>
              <th className="text-right py-2 px-2">10Y CAGR</th>
              {fyLabels.map((fy) => (
                <th key={fy} className="text-center py-2 px-1.5 font-mono">{fy.replace('FY', '')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sector} className="border-t border-border/40">
                <td className="py-1.5 px-2 text-gray-200 font-semibold sticky left-0 bg-[rgba(15,23,41,0.96)] z-10">{row.sector}</td>
                <td className="py-1.5 px-2 text-right text-gray-400">{fmtN(row.weightPct, 1)}%</td>
                <td className={`py-1.5 px-2 text-right font-semibold ${row.fullPeriodCagrPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {fmtN(row.fullPeriodCagrPct, 1)}%
                </td>
                {row.cells.map((cell) => (
                  <td
                    key={cell.fy}
                    className="text-center font-semibold"
                    style={{
                      background: heatmapColor(cell.yoyPatGrowthPct, cap, colorBlindSafe),
                      color: '#f8fafc',
                      padding: '6px 4px',
                      minWidth: 56,
                    }}
                    title={`${row.sector} ${cell.fy}: ${cell.yoyPatGrowthPct.toFixed(1)}% YoY`}
                  >
                    {fmtN(cell.yoyPatGrowthPct, 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
