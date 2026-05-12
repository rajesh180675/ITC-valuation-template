import { useEffect, useState } from 'react';
import { fmtN } from '@/components/itc/shared';

interface PeerRow {
  name: string;
  cmp: string;
  pe: string;
  mcapCr: string;
  divYield: string;
  npQtr: string;
  salesQtr: string;
  roce: string;
}

interface PeerCompanyData {
  warehouseId: string;
  sector: string;
  peers: PeerRow[];
}

interface PeersDB {
  generatedAt: string;
  companies: Record<string, PeerCompanyData>;
}

export function PeerComparison({ ticker, currentPe }: { ticker: string; currentPe: number }) {
  const [data, setData] = useState<PeerCompanyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/peers_data.json')
      .then(r => r.json())
      .then((db: PeersDB) => {
        const company = db.companies[ticker];
        if (company) {
          // Re-order: put the current company first, then sort peers by P/E
          const sorted = [...company.peers].sort((a, b) => {
            const pa = parseFloat(a.pe) || 999;
            const pb = parseFloat(b.pe) || 999;
            return pa - pb;
          });
          setData({ ...company, peers: sorted });
        } else {
          setData(null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ticker]);

  if (loading) return <div className="text-[11px] text-gray-500 animate-pulse py-4">Loading peers…</div>;
  if (!data) return null;

  const peers = data.peers;
  const peVals = peers.map(p => parseFloat(p.pe) || 0).filter(v => v > 0);
  const mcapVals = peers.map(p => parseFloat(p.mcapCr.replace(/,/g, '')) || 0).filter(v => v > 0);
  const roceVals = peers.map(p => parseFloat(p.roce) || 0).filter(v => v > 0);
  const divVals = peers.map(p => parseFloat(p.divYield) || 0).filter(v => v > 0);

  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
  };

  const medPe = median(peVals);
  const medMcap = median(mcapVals);
  const medRoce = median(roceVals);
  const medDiv = median(divVals);

  const rankPct = (val: number, arr: number[]) => {
    if (arr.length === 0) return 50;
    const below = arr.filter(v => v <= val).length;
    return Math.round((below / arr.length) * 100);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Peer Comparison</h3>
        <span className="text-[10px] text-gray-500">{peers.length} companies • screener.in</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] sensex-table tabular-nums">
          <thead>
            <tr>
              <th className="text-left">Company</th>
              <th className="text-right">CMP</th>
              <th className="text-right">P/E</th>
              <th className="text-right">Mkt Cap (Cr)</th>
              <th className="text-right">Div %</th>
              <th className="text-right">NP Qtr</th>
              <th className="text-right">Sales Qtr</th>
              <th className="text-right">ROCE %</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p, i) => {
              const pe = parseFloat(p.pe) || 0;
              const mcap = parseFloat(p.mcapCr.replace(/,/g, '')) || 0;
              const roce = parseFloat(p.roce) || 0;
              const isSelf = p.name.toUpperCase().includes(ticker.toUpperCase().replace('-', ' ')) ||
                           ticker.toUpperCase().includes(p.name.replace(/[^A-Z]/g, '').slice(0, 4));
              return (
                <tr key={i} className={isSelf ? 'ring-1 ring-emerald-500/30 bg-emerald-500/5' : ''}>
                  <td className={`text-left font-medium ${isSelf ? 'text-emerald-300' : 'text-gray-200'}`}>
                    {isSelf ? `★ ${p.name}` : p.name}
                  </td>
                  <td className="text-right">{p.cmp}</td>
                  <td className={`text-right ${pe > 0 && pe < medPe * 0.7 ? 'text-emerald-400' : pe > medPe * 1.3 ? 'text-rose-400' : ''}`}>
                    {p.pe}
                  </td>
                  <td className="text-right">{fmtN(mcap / 100, 1)}L</td>
                  <td className="text-right">{p.divYield}</td>
                  <td className="text-right">{fmtN(parseFloat(p.npQtr) || 0, 0)}</td>
                  <td className="text-right">{fmtN(parseFloat(p.salesQtr) || 0, 0)}</td>
                  <td className={`text-right ${roce > medRoce * 1.3 ? 'text-emerald-400' : roce < medRoce * 0.7 && roce > 0 ? 'text-rose-400' : ''}`}>
                    {p.roce}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <PeerStat label="P/E" val={currentPe} median={medPe} rank={rankPct(currentPe, peVals)} unit="x" />
        <PeerStat label="ROCE" val={roceVals[0] || 0} median={medRoce} rank={50} unit="%" />
        <PeerStat label="Mkt Cap" val={mcapVals[0] || 0} median={medMcap} rank={rankPct(mcapVals[0] || 0, mcapVals)} unit=" Cr" />
        <PeerStat label="Div Yield" val={divVals[0] || 0} median={medDiv} rank={rankPct(divVals[0] || 0, divVals)} unit="%" />
      </div>
    </div>
  );
}

function PeerStat({ label, val, median: med, rank, unit }: {
  label: string; val: number; median: number; rank: number; unit: string;
}) {
  const barW = Math.min(rank, 100);
  const barColor = rank >= 70 ? 'bg-emerald-500' : rank >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="glass-card p-3 space-y-1.5">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold text-white tabular-nums">{val.toFixed(1)}{unit}</div>
      <div className="flex items-center gap-2 text-[10px] text-gray-400">
        <span>Median {med.toFixed(1)}{unit}</span>
        <span className="ml-auto">P{rank}</span>
      </div>
      <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barW}%` }} />
      </div>
    </div>
  );
}
