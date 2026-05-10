import { CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { fmtN } from '@/components/itc/shared';

export function GrowthValuationScatter(props: {
  data: any[]; medianPatCagr: number; rangePeriods: number;
}) {
  const avgMultiple = props.data.length
    ? props.data.reduce((s, d) => s + d.y, 0) / props.data.length
    : 0;
  return (
    <div className="glass-card p-5 lg:col-span-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">Growth × Valuation Map</h3>
        <span className="text-[10px] text-gray-500">Bubble = log(market cap)</span>
      </div>
      <p className="text-[11px] text-gray-500 mb-4">X: {props.rangePeriods}Y PAT CAGR · Y: P/E or P/B multiple</p>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
          <XAxis type="number" dataKey="x" name="PAT CAGR" unit="%" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'PAT CAGR (%)', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name="Multiple" unit="x" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'Valuation Multiple (x)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <ReferenceLine x={props.medianPatCagr} stroke="#d4a843" strokeDasharray="3 3" opacity={0.5}
            label={{ value: 'Median CAGR', fill: '#d4a843', fontSize: 9, position: 'insideTopRight' }} />
          <ReferenceLine y={avgMultiple} stroke="#3b82f6" strokeDasharray="3 3" opacity={0.5}
            label={{ value: 'Avg Multiple', fill: '#3b82f6', fontSize: 9, position: 'insideTopLeft' }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-xs">
                <p className="text-white font-semibold">{d.name}</p>
                <p className="text-gray-400">{d.sector}</p>
                <p className="text-gray-300 mt-1">CAGR: <span className="tabular-nums text-emerald-300">{fmtN(d.x, 1)}%</span></p>
                <p className="text-gray-300">{d.metric}: <span className="tabular-nums text-[color:var(--color-gold-light)]">{fmtN(d.y, 1)}x</span></p>
              </div>
            );
          }} />
          <Scatter data={props.data} isAnimationActive={true}>
            {props.data.map((e: any) => <Cell key={e.name} fill={e.color} fillOpacity={0.75} stroke={e.color} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ImpliedVsRealizedScatter({ data, rangePeriods }: { data: any[]; rangePeriods: number }) {
  const xMin = Math.min(...data.map(d => Math.min(d.x, d.y)), -2);
  const xMax = Math.max(...data.map(d => Math.max(d.x, d.y)), 20);

  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Market-Implied vs Delivered Growth</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            X: perpetual growth implied by today&apos;s valuation (reverse Gordon, CAPM CoE) &middot; Y: {rangePeriods}Y realized PAT CAGR
          </p>
        </div>
        <div className="text-[10px] text-gray-500 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[color:var(--color-gold-light)] rounded" />y = x (fair)</span>
          <span>Above = market under-pricing</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1c2940" />
          <XAxis type="number" dataKey="x" name="Implied g" unit="%" domain={[Math.floor(xMin), Math.ceil(xMax)]} tickFormatter={(v: number) => Math.round(v).toString()} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'Implied Perpetual Growth (%)', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name="Delivered CAGR" unit="%" domain={[Math.floor(xMin), Math.ceil(xMax)]} tickFormatter={(v: number) => Math.round(v).toString()} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2a3a52' }}
            label={{ value: 'Realized PAT CAGR (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <ReferenceLine segment={[{ x: xMin, y: xMin }, { x: xMax, y: xMax }]} stroke="#d4a843" strokeDasharray="4 4" opacity={0.7} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            const verdict = d.gap > 3 ? 'Historically outran implied growth' : d.gap < -3 ? 'Expectation above track record' : 'Priced near historical pace';
            const verdictColor = d.gap > 3 ? 'text-emerald-300' : d.gap < -3 ? 'text-red-300' : 'text-gray-300';
            return (
              <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-xs">
                <p className="text-white font-semibold">{d.name}</p>
                <p className="text-gray-400">{d.sector}</p>
                <div className="h-px bg-border my-1.5" />
                <p className="text-gray-300">Implied g: <span className="tabular-nums text-[color:var(--color-gold-light)]">{fmtN(d.x, 1)}%</span></p>
                <p className="text-gray-300">Delivered: <span className="tabular-nums text-emerald-300">{fmtN(d.y, 1)}%</span></p>
                <p className="text-gray-300">CoE: <span className="tabular-nums text-white">{fmtN(d.coe, 1)}%</span></p>
                <p className={`mt-1 ${verdictColor}`}>{verdict}</p>
              </div>
            );
          }} />
          <Scatter data={data} isAnimationActive={true}>
            {data.map((e: any) => <Cell key={e.name} fill={e.color} fillOpacity={0.78} stroke={e.color} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
