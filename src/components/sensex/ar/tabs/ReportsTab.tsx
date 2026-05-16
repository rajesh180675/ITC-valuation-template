import { FileText, Download } from 'lucide-react';
import type { AnnualReportFileMetadata, AnnualReportYearData } from '@/utils/annualReportCashFlow';

interface ReportsTabProps {
  ticker: string;
  yearsData: Record<string, AnnualReportYearData>;
  years: string[];
  reportMeta: AnnualReportFileMetadata | null;
}

export function ReportsTab({ ticker, yearsData, years, reportMeta }: ReportsTabProps) {
  const pdfPaths = reportMeta?.pdfPaths ?? {};
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-300"><FileText size={16} className="text-cyan-400" /> Reports, provenance and export</div>
      <div className="glass-card p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-white mb-3">Annual Report PDF Index</h3>
        <table className="w-full text-xs tabular-nums">
          <thead><tr className="border-b border-gray-800 text-gray-400"><th className="text-left py-2">FY</th><th className="text-left py-2">P&L</th><th className="text-left py-2">Balance Sheet</th><th className="text-left py-2">Cash Flow</th><th className="text-left py-2">PDF</th></tr></thead>
          <tbody>{years.map(fy => {
            const y = yearsData[fy];
            const pdf = pdfPaths[fy] ?? y?.metadata?.pdfPath;
            return <tr key={fy} className="border-b border-gray-900 hover:bg-white/[0.03]"><td className="py-2 text-gray-300">{fy}</td><td className="py-2 text-gray-300">{y?.profitLoss?.items?.length ?? 0} rows</td><td className="py-2 text-gray-300">{y?.balanceSheet?.items?.length ?? 0} rows</td><td className="py-2 text-gray-300">{y?.cashFlow?.items?.length ?? 0} rows</td><td className="py-2">{pdf ? <a className="text-emerald-300 hover:underline" href={pdf} target="_blank" rel="noreferrer">open</a> : <span className="text-gray-600">—</span>}</td></tr>;
          })}</tbody>
        </table>
      </div>
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Download size={15} /> Export</div>
        <div className="text-xs text-gray-400">CSV/XLSX export utilities are scaffolded in <code className="text-emerald-300">src/utils/ar/</code>; visible-table export can now be added per tab without touching data models.</div>
        <div className="text-[11px] text-gray-600 mt-2">Active ticker: {ticker}</div>
      </div>
    </div>
  );
}
