import { Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Legend, PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import { useMemo } from 'react';
import { fmtN } from '@/components/itc/shared';

const CORE_COLORS = ['#10b981', '#34d399', '#f59e0b', '#f97316', '#8b5cf6', '#ef4444', '#3b82f6', '#06b6d4', '#ec4899', '#a8a29e'];

function isExcludedDonutLabel(name: string) {
  const lower = name.toLowerCase();
  return lower.includes('total') || lower.includes('elimination') || lower.includes('unallocated') || lower.includes('discontinued');
}

function isCoreSegment(name: string) {
  const lower = name.toLowerCase();
  return !lower.includes('total') && !lower.includes('elimination') && !lower.includes('unallocated') && !lower.includes('discontinued');
}

/* ── Segments View (company-agnostic) ──────────────────────────────────────── *
 * Expects segData.segment_time_series = Record<prefix|segment, Record<fy, value>>
 */
export function SegmentsView({ segData }: { segData: any }) {
  const series = segData?.segment_time_series;
  if (!series || Object.keys(series).length === 0) {
    return <div className="glass-card p-5 text-center text-gray-400">No segment data for this company.</div>;
  }

  const allFys = useMemo(() => [...new Set(Object.values(series as Record<string, Record<string, number>>).flatMap(v => Object.keys(v)))].sort(), [series]);
  const displayFys = allFys.filter(fy => fy >= 'FY2010');
  const latestFy = displayFys.length > 0 ? displayFys[displayFys.length - 1] : allFys[allFys.length - 1];
  const basis = segData?.basis ? String(segData.basis) : 'standalone';
  const coverage = segData?.coverageBySection as Record<string, { items?: number }> | undefined;

  if (displayFys.length === 0) {
    return <div className="glass-card p-5 text-center text-gray-400">No segment years available.</div>;
  }

  // Gather core segment names from revenue keys
  const coreSegments = Object.keys(series)
    .filter(k => k.startsWith('revenue|'))
    .map(k => k.split('|').slice(1).join('|'))
    .filter(isCoreSegment);

  // Stacked area chart data
  const areaData = displayFys.map(fy => {
    const row: Record<string, any> = { fy: fy.replace('FY', "'") };
    coreSegments.forEach(seg => {
      const val = series['revenue|' + seg]?.[fy];
      row[seg] = typeof val === 'number' && !isNaN(val) ? val : 0;
    });
    return row;
  });

  // ROCE bar chart: results / assets for latest year
  const roceData = coreSegments.map(seg => {
    const res = series['results|' + seg]?.[latestFy];
    const ast = series['assets|' + seg]?.[latestFy];
    if (res == null || ast == null || ast === 0) return null;
    const roce = (res / ast) * 100;
    return { name: seg, roce: parseFloat(roce.toFixed(1)) };
  }).filter(Boolean).sort((a: any, b: any) => b.roce - a.roce);

  // Margin scatter: revenue vs results for latest year
  const scatterData = coreSegments.map(seg => {
    const rev = series['revenue|' + seg]?.[latestFy];
    const res = series['results|' + seg]?.[latestFy];
    if (typeof rev !== 'number' || isNaN(rev) || typeof res !== 'number' || isNaN(res)) return null;
    return { name: seg, revenue: rev, results: res };
  }).filter(Boolean);

  // Donut chart data (sorted by latest value descending so biggest segment starts first)
  const donutData = Object.entries(series).filter(([k]) => k.startsWith('revenue|'))
    .map(([k, v]: [string, any]) => ({ name: k.split('|').slice(1).join('|'), value: v[latestFy] || 0 }))
    .filter(d => !isExcludedDonutLabel(d.name) && d.value > 0 && !Number.isNaN(d.value))
    .sort((a, b) => b.value - a.value);

  // Derived section labels from keys present in data
  const sectionPrefixes = Array.from(new Set(Object.keys(series).map(k => k.split('|')[0]))).sort();
  const sectionLabels: Record<string, string> = {
    revenue: 'Segment Revenue',
    results: 'Segment Results',
    assets: 'Segment Assets',
    liabilities: 'Segment Liabilities',
  };

  return (
    <div className="space-y-6">
      {/* Meta info */}
      <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
        <span>Basis: <span className="text-emerald-300 capitalize">{basis}</span></span>
        <span>Years: <span className="text-gray-300">{displayFys[0]}-{displayFys[displayFys.length - 1]}</span></span>
        {coverage && (
          <span>
            Coverage: {Object.entries(coverage).map(([k, v]) => `${k} ${v.items ?? 0}`).join(' / ')}
          </span>
        )}
      </div>

      {/* Stacked Area — Revenue Mix Over Time */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Segment Revenue Mix Over Time</h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="fy" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} tickFormatter={(v: number) => fmtN(v, 0)} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} formatter={(value: any, name: any) => [fmtN(value, 0), name]} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {coreSegments.map((seg, i) => (
                <Area key={seg} type="monotone" dataKey={seg} stackId="1" stroke={CORE_COLORS[i % CORE_COLORS.length]} fill={CORE_COLORS[i % CORE_COLORS.length]} fillOpacity={0.7} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut + ROCE + Scatter grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Donut */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Segment Revenue Mix ({latestFy.replace('FY', "'")})</h3>
          <div className="h-[240px]">
            {donutData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                    label={({ name, value }: any) => `${name} (${fmtN(value, 0)})`} labelLine>
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={CORE_COLORS[i % CORE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ROCE */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Segment ROCE ({latestFy.replace('FY', "'")})</h3>
          <div className="h-[240px]">
            {roceData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-xs">No ROCE data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={roceData} layout="vertical" margin={{ top: 5, right: 20, left: 110, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} axisLine={{ stroke: '#374151' }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v}%`, 'ROCE']} />
                  <Bar dataKey="roce" fill="#10b981" radius={[0, 4, 4, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Scatter */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Segment Results vs Revenue ({latestFy.replace('FY', "'")})</h3>
          <div className="h-[240px]">
            {scatterData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={scatterData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="revenue" type="number" name="Revenue" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} tickFormatter={(v: number) => fmtN(v, 0)} />
                  <YAxis dataKey="results" type="number" name="Results" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#374151' }} tickFormatter={(v: number) => fmtN(v, 0)} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} formatter={(v: any, n: any) => [fmtN(v, 0), n]} cursor={{ strokeDasharray: '3 3' }} />
                  <Bar dataKey="results" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tables per section */}
      {sectionPrefixes.map(prefix => {
        const items = Object.entries(series).filter(([k]) => k.startsWith(prefix + '|')).sort();
        if (items.length === 0) return null;
        const title = sectionLabels[prefix] || prefix;
        return (
          <div key={prefix} className="glass-card p-5 overflow-x-auto">
            <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
            <table className="w-full text-xs tabular-nums" style={{ minWidth: 500 }}>
              <thead>
                <tr><th className="text-left py-2 pr-4 text-gray-400 font-medium">Segment</th>
                  {displayFys.map(fy => <th key={fy} className="text-right py-2 px-2 text-gray-400 font-medium">{fy.replace('FY', "'")}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map(([key, vals]) => {
                  const name = key.split('|').slice(1).join('|');
                  const vmap = vals as Record<string, number>;
                  return (
                    <tr key={key} className="hover:bg-white/[0.03]">
                      <td className="py-1.5 pr-4 text-gray-300 text-[11px]">{name}</td>
                      {displayFys.map(fy => (
                        <td key={fy} className={`text-right py-1.5 px-2 text-[11px] ${vmap[fy] ? 'text-white' : 'text-gray-600'}`}>
                          {vmap[fy] ? fmtN(vmap[fy], 0) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
