import { fmt, fmtN } from '@/components/itc/shared';
import type { SensexConstituent } from '@/data/sensexData';

export function SectorComposition({ sectorSummary, filteredCompanies }: {
  sectorSummary: { sector: string; weightPct: number; count: number; marketCapCr: number }[];
  filteredCompanies: SensexConstituent[];
}) {
  return (
    <div className="premium-card p-5">
      <h3 className="text-sm font-semibold text-white mb-1">Sector Composition</h3>
      <p className="text-[11px] text-gray-500 mb-4">Weight distribution across the filtered set</p>
      <div className="space-y-2">
        {sectorSummary.map((sector, i) => {
          const topCompany = filteredCompanies
            .filter(c => c.sector === sector.sector)
            .sort((a, b) => b.weightPct - a.weightPct)[0];
          const pct = sector.weightPct;
          return (
            <div key={sector.sector} className="sector-chip">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500 w-4">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm font-semibold text-gray-100">{sector.sector}</span>
                </div>
                <span className="text-sm font-bold text-[color:var(--color-gold-light)] tabular-nums">{fmtN(pct, 1)}%</span>
              </div>
              <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(100, pct * 2.5)}%`,
                  background: `linear-gradient(90deg, ${topCompany?.color ?? '#3b82f6'}, ${topCompany?.color ?? '#3b82f6'}aa)`,
                }} />
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {sector.count} {sector.count === 1 ? 'company' : 'companies'} · {fmt(sector.marketCapCr)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
