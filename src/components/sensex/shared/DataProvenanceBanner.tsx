import { ShieldCheck } from 'lucide-react';
import type { SensexConstituent } from '@/data/sensexData';

interface ProvenanceInfo {
  source: string;
  asOf: string;
  methodology: string[];
  disclaimer: string;
  lastUpdated?: string;
}

export function DataProvenanceBanner({
  rows, dataSource, provenance,
}: {
  rows: { company: SensexConstituent }[];
  dataSource?: string;
  provenance?: ProvenanceInfo;
}) {
  const uniqueSectors = new Set(rows.map((r) => r.company.sector)).size;
  const corp = rows.filter((r) => r.company.reportingType === 'nonFinancial').length;
  const bfsi = rows.length - corp;

  return (
    <div className="glass-card p-5 border-l-2 border-[color:var(--color-gold-light)]">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <ShieldCheck size={18} className="text-[color:var(--color-gold-light)]" />
          <span className="text-sm font-semibold text-white">Data Provenance</span>
        </div>
        <div className="flex-1 min-w-[260px] space-y-2">
          {dataSource === 'screener-in' ? (
            <>
              <p className="text-[12px] text-gray-300 leading-relaxed">
                <span className="text-white font-semibold">Source:</span> Screener.in — real annual financial data
                <span className="ml-2 pill pill-muted text-[10px]">No estimates</span>
              </p>
              <p className="text-[12px] text-gray-400 leading-relaxed">
                <span className="text-gray-200 font-semibold">Universe:</span> {rows.length} NSE-listed names · {uniqueSectors} sectors · {corp} corporates / {bfsi} BFSI
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Data collected from publicly available screener.in pages. Only years with real reported
                data are included — no backfilling, no CAGR extrapolation, no synthetic values.
              </p>
            </>
          ) : provenance ? (
            <>
              <p className="text-[12px] text-gray-300 leading-relaxed">
                <span className="text-white font-semibold">Source:</span> {provenance.source}
              </p>
              <p className="text-[12px] text-gray-400 leading-relaxed">
                <span className="text-gray-200 font-semibold">As-of:</span> {provenance.asOf}
                <span className="mx-2 text-gray-600">·</span>
                {provenance.lastUpdated && (
                  <>
                    <span className="text-gray-200 font-semibold">Last updated:</span> {provenance.lastUpdated}
                    <span className="mx-2 text-gray-600">·</span>
                  </>
                )}
                <span className="text-gray-200 font-semibold">Universe:</span> {rows.length} NSE-listed names · {uniqueSectors} sectors · {corp} corporates / {bfsi} BFSI
              </p>
              <ul className="text-[11px] text-gray-400 leading-relaxed list-disc pl-4 space-y-0.5">
                {provenance.methodology.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-200/80 leading-relaxed pt-1">
                <span className="font-semibold">Disclaimer:</span> {provenance.disclaimer}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
