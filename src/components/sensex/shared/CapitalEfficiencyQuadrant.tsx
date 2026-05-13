/**
 * Capital Efficiency Quadrant — bubble chart plotting ROCE vs Revenue Growth.
 * Helps spot companies that compound efficiently: high ROCE AND high growth.
 * Bubble size = market cap.
 */
import { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, Label } from 'recharts';
import { Target } from 'lucide-react';
import type { SensexConstituent } from '@/data/sensexData';
import { ChartTooltip } from '@/components/itc/shared';

interface CapitalEfficiencyPoint {
  name: string;
  x: number; // ROCE %
  y: number; // Revenue CAGR %
  z: number; // bubble size (log mcap)
  color: string;
  sector: string;
}

interface CapitalEfficiencyQuadrantProps {
  companies: SensexConstituent[];
  rangeStart: number;
  rangeEnd: number;
  height?: number;
}

export function CapitalEfficiencyQuadrant({ companies, rangeStart, rangeEnd, height: _height }: CapitalEfficiencyQuadrantProps) {
  const data: CapitalEfficiencyPoint[] = useMemo(() => {
    const periods = Math.max(1, rangeEnd - rangeStart);
    return companies
      .map(c => {
        const latest = c.history[c.history.length - 1];
        const earliest = c.history[rangeStart];
        const roce = latest?.rocePct ?? (latest?.roePct ? latest.roePct * 0.85 : 0);
        const earlyTopline = earliest?.toplineCr ?? 0;
        const lateTopline = latest?.toplineCr ?? 0;
        const revenueCagr = earlyTopline > 0 && lateTopline > 0
          ? (Math.pow(lateTopline / earlyTopline, 1 / periods) - 1) * 100
          : 0;
        return {
          name: c.ticker,
          x: Math.round(roce * 10) / 10,
          y: Math.round(revenueCagr * 10) / 10,
          z: Math.log(Math.max(1, c.marketCapCr)) * 10,
          color: c.color,
          sector: c.sector,
        };
      })
      .filter(d => isFinite(d.x) && isFinite(d.y));
  }, [companies, rangeStart, rangeEnd]);

  const medianROCE = useMemo(() => {
    if (data.length === 0) return 15;
    const sorted = [...data].map(d => d.x).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }, [data]);

  const medianCAGR = useMemo(() => {
    if (data.length === 0) return 10;
    const sorted = [...data].map(d => d.y).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }, [data]);

  // Quadrant counts
  const quadCounts = useMemo(() => {
    let topRight = 0, topLeft = 0, bottomRight = 0, bottomLeft = 0;
    for (const d of data) {
      if (d.x >= medianROCE && d.y >= medianCAGR) topRight++;
      else if (d.x < medianROCE && d.y >= medianCAGR) topLeft++;
      else if (d.x >= medianROCE && d.y < medianCAGR) bottomRight++;
      else bottomLeft++;
    }
    return { topRight, topLeft, bottomRight, bottomLeft };
  }, [data, medianROCE, medianCAGR]);

  if (data.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-white">Capital Efficiency</span>
        </div>
        <p className="text-gray-500 text-xs">Insufficient ROCE data</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-white">Capital Efficiency Quadrant</span>
        </div>
        <div className="text-[10px] text-gray-400">
          <span className="text-emerald-400">★ Stars</span> {quadCounts.topRight} ·
          <span className="text-amber-400"> Cash Cows</span> {quadCounts.bottomRight} ·
          <span className="text-blue-400"> Growing</span> {quadCounts.topLeft} ·
          <span className="text-rose-400"> Laggards</span> {quadCounts.bottomLeft}
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis type="number" dataKey="x" name="ROCE" domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} axisLine={{ stroke: '#374151' }}>
              <Label value="ROCE %" offset={-5} position="insideBottom" fill="#9ca3af" fontSize={11} />
            </XAxis>
            <YAxis type="number" dataKey="y" name="Revenue CAGR" domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} axisLine={{ stroke: '#374151' }}>
              <Label value="Revenue CAGR" angle={-90} offset={-5} position="insideLeft" fill="#9ca3af" fontSize={11} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[40, 400]} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine x={medianROCE} stroke="#f59e0b" strokeDasharray="4 4" />
            <ReferenceLine y={medianCAGR} stroke="#f59e0b" strokeDasharray="4 4" />
            <Scatter name="Companies" data={data} fill="#3b82f6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
