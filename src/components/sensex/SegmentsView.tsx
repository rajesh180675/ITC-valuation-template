import { Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Legend, PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import { fmtN } from '@/components/itc/shared';

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899'];
const SEGMENT_DONUT_ORDER = ['FMCG - Cigarettes', 'FMCG - Others', 'Agri Business', 'Paperboards, Paper and Packaging', 'Others'];

/* ── Segments Tab ─────────────────────────────────────────────────────────── */
export function SegmentsView({ segData, activeTicker }: { segData: any; activeTicker: string }) {
  if (activeTicker !== 'ITC') {
    return <div className="glass-card p-5 text-center text-gray-400">No segment data for this company yet.</div>;
  }

  const series = segData?.segment_time_series;
  if (!series || Object.keys(series).length === 0) {
    return <div className="glass-card p-5 text-center text-gray-400">No segment data.</div>;
  }

  const sectionLabels: Record<string, string> = { revenue: 'Segment Revenue', results: 'Segment Results', assets: 'Segment Assets', liabilities: 'Segment Liabilities' };
  const allFys = [...new Set(Object.values(series as Record<string, Record<string, number>>).flatMap(v => Object.keys(v)))].sort();
  const displayFys = allFys.filter(fy => fy >= 'FY2016');
  const basis = segData?.basis ? String(segData.basis) : 'standalone';
  const coverage = segData?.coverageBySection;
  const latestFy = displayFys[displayFys.length - 1];
  const isExcludedDonutLabel = (name: string) => {
    const lower = name.toLowerCase();
    return lower.includes('total') || lower.includes('elimination') || lower.includes('unallocated') || lower.includes('discontinued');
  };
  const isCoreSegment = (name: string) => {
    const lower = name.toLowerCase();
    return !lower.includes('total') && !lower.includes('elimination') && !lower.includes('unallocated') && !lower.includes('discontinued');
  };

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
    const row: any = { fy: fy.replace('FY', "'") };
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
    const roce = res && ast && ast !== 0 ? (res / ast) * 100 : null;
    return { name: seg, roce: roce !== null ? parseFloat(roce.toFixed(1)) : null };
  }).filter(d => d.roce !== null).sort((a, b) => (b.roce || 0) - (a.roce || 0));

  // Margin scatter: revenue vs results for latest year
  const scatterData = coreSegments.map(seg => {
    const rev = series['revenue|' + seg]?.[latestFy];
    const res = series['results|' + seg]?.[latestFy];
    return {
      name: seg,
      revenue: typeof rev === 'number' && !isNaN(rev) ? rev : null,
      results: typeof res === 'number' && !isNaN(res) ? res : null,
    };
  }).filter(d => d.revenue !== null && d.results !== null);

  return (
    <div className="space-y-6">
      <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
        <span>Basis: <span className="text-emerald-300 capitalize">{basis}</span></span>
        <span>Years: <span className="text-gray-300">{displayFys[0]}-{displayFys[displayFys.length - 1]}</span></span>
        {coverage && (
          <span>
            Coverage: {Object.entries(coverage as Record<string, { items?: number }>).map(([k, v]) => `${k} ${v.items ?? 0}`).join(' / ')}
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
                <Area key={seg} type="monotone" dataKey={seg} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.7} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut + ROCE + Scatter grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Segment Revenue Mix ({latestFy.replace('FY', "'")})</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {(() => {
                  const pieData = Object.entries(series).filter(([k]) => k.startsWith('revenue|'))
                    .map(([k, v]) => ({ name: k.split('|')[1], value: (v as any)[latestFy] || 0 }))
                    .filter(d => !isExcludedDonutLabel(d.name))
                    .filter(d => d.value > 0 && d.value !== Infinity && !Number.isNaN(d.value));
                  if (pieData.length === 0) return <div className="text-center text-gray-400">No data</div>;
                  pieData.sort((a, b) => SEGMENT_DONUT_ORDER.indexOf(a.name) - SEGMENT_DONUT_ORDER.indexOf(b.name));
                  return (
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                      label={({ name, value }: any) => `${name} (${fmtN(value, 0)})`} labelLine
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  );
                })()}
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

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

      {Object.entries(sectionLabels).map(([prefix, title]) => {
        const items = Object.entries(series).filter(([k]) => k.startsWith(prefix + '|')).sort();
        if (items.length === 0) return null;
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
