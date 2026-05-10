import { Download } from 'lucide-react';
import { fmt, fmtN } from '@/components/itc/shared';
import { ScoreChip } from './FactorBar';
import type { SensexConstituent } from '@/data/sensexData';

export function ConstituentLedger(props: {
  rows: {
    company: SensexConstituent;
    last: { toplineCr: number; roePct: number; rocePct?: number };
    toplineCagr: number; profitCagr: number; valuationLabel: string;
    coe: number; impliedG: number; scores: { composite: number };
    valuationZ: number; sectorMedianMultiple: number;
  }[];
  selectedId: string;
  onSelect: (id: string) => void;
  rangeLabel: string;
  endFy: string;
  sortCaret: (key: any) => string;
  toggleSort: (key: any) => void;
  showZScore?: boolean;
}) {
  const { rows, selectedId, onSelect, rangeLabel, endFy, sortCaret, toggleSort, showZScore = true } = props;

  const handleExport = () => {
    const header = [
      'Ticker', 'Name', 'Sector', 'Type', 'WeightPct', 'MarketCapCr', 'CMP',
      `Topline_${endFy}_Cr`, 'ToplineCAGR_pct', 'PATCAGR_pct',
      `ROE_${endFy}_pct`, 'Beta', 'CoE_pct', 'ValuationMetric',
      'Multiple', 'SectorMedianMultiple', 'Z_vs_sector',
      'ImpliedGrowth_pct', 'CompositeScore',
    ];
    const lines = rows.map((r) => [
      r.company.ticker,
      JSON.stringify(r.company.name),
      JSON.stringify(r.company.sector),
      r.company.reportingType === 'financial' ? 'BFSI' : 'Corp',
      r.company.weightPct.toFixed(3),
      r.company.marketCapCr,
      r.company.cmp,
      r.last?.toplineCr ?? 0,
      (r.toplineCagr ?? 0).toFixed(2),
      (r.profitCagr ?? 0).toFixed(2),
      (r.last?.roePct ?? 0).toFixed(2),
      r.company.beta.toFixed(2),
      (r.coe ?? 0).toFixed(2),
      r.valuationLabel,
      r.company.valuationMultiple.toFixed(2),
      (r.sectorMedianMultiple ?? 0).toFixed(2),
      (r.valuationZ ?? 0).toFixed(2),
      (r.impliedG ?? 0).toFixed(2),
      (r.scores?.composite ?? 0).toFixed(1),
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nifty-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="premium-card overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Constituent Ledger</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Sortable · CAGR across {rangeLabel} · CAPM CoE · reverse-Gordon implied growth{showZScore ? ' · valuation z-score vs sector' : ''} · composite factor score
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-200 bg-black/40 hover:bg-black/60 border border-border rounded-md px-3 py-1.5 transition"
            aria-label="Download constituent ledger as CSV"
          >
            <Download size={12} /> CSV
          </button>
          <span className="pill pill-muted">{rows.length} rows</span>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[560px]">
        <table className="w-full sensex-table tabular-nums">
          <thead>
            <tr>
              <th className="text-left sticky left-0 z-20" style={{ minWidth: 220, background: 'linear-gradient(180deg, rgba(15,23,41,0.98), rgba(22,32,51,0.95))' }}>Company</th>
              <th className="text-left">Sector</th>
              <th className="text-center">Type</th>
              <th className="text-right sort-header" onClick={() => toggleSort('weight')}>Weight{sortCaret('weight')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('mcap')}>Market Cap{sortCaret('mcap')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('topline')}>{endFy} Topline{sortCaret('topline')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('toplineCagr')}>Topline CAGR{sortCaret('toplineCagr')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('profitCagr')}>PAT CAGR{sortCaret('profitCagr')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('roe')}>ROE{sortCaret('roe')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('beta')}>β{sortCaret('beta')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('coe')}>CoE{sortCaret('coe')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('valuation')}>Mult{sortCaret('valuation')}</th>
              {showZScore && <th className="text-right" title="Z-score vs sector peers">Z vs sector</th>}
              <th className="text-right sort-header" onClick={() => toggleSort('impliedG')}>Impl. g{sortCaret('impliedG')}</th>
              <th className="text-right sort-header" onClick={() => toggleSort('composite')}>Score{sortCaret('composite')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isSelected = r.company.id === selectedId;
              return (
                <tr key={r.company.id} onClick={() => onSelect(r.company.id)} className={`cursor-pointer ${isSelected ? 'selected' : ''}`}>
                  <td className="sticky left-0 z-10" style={{ background: isSelected ? 'rgba(28, 41, 64, 0.98)' : 'rgba(15, 23, 41, 0.96)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-8 rounded-sm shrink-0" style={{ backgroundColor: r.company.color }} />
                      <div>
                        <div className="text-gray-100 font-semibold text-[13px]">{r.company.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono tracking-wider">{r.company.ticker}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-300 text-[11px]">{r.company.sector}</td>
                  <td className="text-center">
                    <span className={`pill ${r.company.reportingType === 'financial' ? '' : 'pill-muted'}`}>
                      {r.company.reportingType === 'financial' ? 'BFSI' : 'Corp'}
                    </span>
                  </td>
                  <td className="text-right text-gray-200 font-semibold">{fmtN(r.company.weightPct, 1)}%</td>
                  <td className="text-right text-gray-300">{fmt(r.company.marketCapCr)}</td>
                  <td className="text-right text-gray-300">{fmt(r.last.toplineCr)}</td>
                  <td className={`text-right font-semibold ${r.toplineCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(r.toplineCagr, 1)}%</td>
                  <td className={`text-right font-semibold ${r.profitCagr >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtN(r.profitCagr, 1)}%</td>
                  <td className="text-right text-gray-200">{fmtN(r.last.roePct, 1)}%</td>
                  <td className="text-right text-gray-300">{r.company.beta.toFixed(2)}</td>
                  <td className="text-right text-gray-300">{fmtN(r.coe, 1)}%</td>
                  <td className="text-right text-[color:var(--color-gold-light)] font-semibold">{r.valuationLabel} {fmtN(r.company.valuationMultiple, 1)}x</td>
                  {showZScore && (
                    <td className={`text-right font-semibold ${r.valuationZ <= -0.5 ? 'text-emerald-300' : r.valuationZ >= 0.5 ? 'text-red-300' : 'text-gray-300'}`}
                      title={`Sector median ${r.valuationLabel} ${r.sectorMedianMultiple.toFixed(1)}x`}>
                      {r.valuationZ >= 0 ? '+' : ''}{r.valuationZ.toFixed(2)}σ
                    </td>
                  )}
                  <td className={`text-right font-semibold ${r.impliedG >= 4 ? 'text-amber-200' : 'text-gray-300'}`}>{fmtN(r.impliedG, 1)}%</td>
                  <td className="text-right"><ScoreChip score={r.scores.composite} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
