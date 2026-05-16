import { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, Activity } from 'lucide-react';
import type { AnnualReportYearData } from '@/utils/annualReportCashFlow';
import { buildDerivedFinancials, type DerivedFinancialsRow } from '@/utils/ar/derivedKPIs';
import { computeAltman } from '@/utils/ar/altman';
import { computePiotroski } from '@/utils/ar/piotroski';
import { computeAccruals } from '@/utils/ar/accruals';
import { computeOhlson } from '@/utils/ar/ohlson';
import { computeBeneish } from '@/utils/ar/beneish';

interface QualityTabProps {
  yearsData: Record<string, AnnualReportYearData>;
  years: string[];
}

const fmt = (v: number | null | undefined, d = 1) => v == null || !Number.isFinite(v) ? '—' : v.toFixed(d);

function scoreColor(score: number | null | undefined, goodHigh = true) {
  if (score == null) return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  const good = goodHigh ? score >= 70 : score <= 30;
  const bad = goodHigh ? score < 40 : score > 60;
  if (good) return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';
  if (bad) return 'text-rose-300 bg-rose-500/10 border-rose-500/20';
  return 'text-amber-300 bg-amber-500/10 border-amber-500/20';
}

function Card({ label, value, sub, tone = 'neutral' }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn' | 'neutral' }) {
  const cls = tone === 'good'
    ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10'
    : tone === 'bad'
      ? 'text-rose-300 border-rose-500/20 bg-rose-500/10'
      : tone === 'warn'
        ? 'text-amber-300 border-amber-500/20 bg-amber-500/10'
        : 'text-gray-300 border-gray-700 bg-gray-800/30';
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] mt-1 opacity-70">{sub}</div>}
    </div>
  );
}

function beneishInput(rows: DerivedFinancialsRow[]) {
  return rows.map(r => ({
    ar: r.receivables,
    sales: r.revenue,
    cogs: r.operatingExpenses,
    currentAssets: r.currentAssets,
    ppe: r.investedCapital,
    totalAssets: r.totalAssets,
    sga: r.operatingExpenses,
    depr: r.depreciation,
    totalLiabs: r.totalAssets != null && r.equity != null ? r.totalAssets - r.equity : null,
    wc: r.workingCapital,
  }));
}

export function QualityTab({ yearsData, years }: QualityTabProps) {
  const rows = useMemo(() => buildDerivedFinancials(yearsData, years), [yearsData, years]);
  const altman = useMemo(() => computeAltman(rows), [rows]);
  const piotroski = useMemo(() => computePiotroski(rows), [rows]);
  const accruals = useMemo(() => computeAccruals(rows), [rows]);
  const ohlson = useMemo(() => computeOhlson(rows), [rows]);
  const beneish = useMemo(() => computeBeneish(beneishInput(rows)), [rows]);

  if (rows.length === 0) {
    return <div className="glass-card p-5 text-gray-400">No data for quality analysis.</div>;
  }

  const latestPiotroski = piotroski[piotroski.length - 1];
  const latestAltman = altman[altman.length - 1];
  const latestAccruals = accruals[accruals.length - 1];
  const latestOhlson = ohlson[ohlson.length - 1];
  const latestBeneish = beneish[beneish.length - 1];
  const qualityScore = Math.round([
    latestPiotroski ? (latestPiotroski.score / latestPiotroski.maxScore) * 100 : null,
    latestAltman?.zDoublePrime != null ? Math.min(100, Math.max(0, (latestAltman.zDoublePrime / 2.6) * 100)) : null,
    latestAccruals?.sloanRatio != null ? Math.max(0, 100 - Math.abs(latestAccruals.sloanRatio) * 5) : null,
    latestOhlson?.probability != null ? (1 - latestOhlson.probability) * 100 : null,
  ].filter((v): v is number => v != null).reduce((a, b, _, arr) => a + b / arr.length, 0));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <ShieldCheck size={16} className="text-emerald-400" />
        <span>Quality of Earnings / Distress / Forensic Accounting</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card label="Composite Quality" value={`${qualityScore}/100`} sub="Higher is better" tone={qualityScore >= 70 ? 'good' : qualityScore < 40 ? 'bad' : 'warn'} />
        <Card label="Piotroski F" value={latestPiotroski ? `${latestPiotroski.score}/${latestPiotroski.maxScore}` : '—'} sub="≥7 strong" tone={latestPiotroski && latestPiotroski.score >= 7 ? 'good' : latestPiotroski && latestPiotroski.score <= 3 ? 'bad' : 'warn'} />
        <Card label="Altman Z''" value={fmt(latestAltman?.zDoublePrime)} sub={latestAltman?.classification ?? 'unknown'} tone={latestAltman?.classification === 'safe' ? 'good' : latestAltman?.classification === 'distress' ? 'bad' : 'warn'} />
        <Card label="Sloan Accruals" value={`${fmt(latestAccruals?.sloanRatio)}%`} sub={latestAccruals?.qualityFlag ?? 'unknown'} tone={latestAccruals?.qualityFlag === 'high' ? 'good' : latestAccruals?.qualityFlag === 'low' ? 'bad' : 'warn'} />
        <Card label="Beneish M" value={fmt(latestBeneish?.m, 2)} sub={latestBeneish?.classification ?? 'unknown'} tone={latestBeneish?.classification === 'conservative' ? 'good' : latestBeneish?.classification === 'flagged' ? 'bad' : 'warn'} />
      </div>

      <div className="glass-card p-4 overflow-x-auto">
        <div className="flex items-center gap-2 mb-3 text-white font-semibold"><Activity size={16} /> Yearly Quality Matrix</div>
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left py-2">FY</th><th className="text-right py-2">Piotroski</th><th className="text-right py-2">Altman Z''</th><th className="text-right py-2">Sloan %</th><th className="text-right py-2">Ohlson Prob</th><th className="text-right py-2">ROE</th><th className="text-right py-2">Cash Conv</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const p = piotroski[i];
              const a = altman[i];
              const s = accruals[i];
              const o = ohlson[i];
              return (
                <tr key={r.fy} className="border-b border-gray-900 hover:bg-white/[0.03]">
                  <td className="py-2 text-gray-300">{r.fy}</td>
                  <td className="py-2 text-right text-gray-200">{p ? `${p.score}/${p.maxScore}` : '—'}</td>
                  <td className={`py-2 text-right ${scoreColor(a?.zDoublePrime != null ? (a.zDoublePrime / 2.6) * 100 : null)}`}>{fmt(a?.zDoublePrime)}</td>
                  <td className="py-2 text-right text-gray-200">{fmt(s?.sloanRatio)}%</td>
                  <td className="py-2 text-right text-gray-200">{o?.probability == null ? '—' : `${(o.probability * 100).toFixed(1)}%`}</td>
                  <td className="py-2 text-right text-gray-200">{fmt(r.roe)}%</td>
                  <td className="py-2 text-right text-gray-200">{fmt(r.cashConversion)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="glass-card p-4 text-xs text-gray-400 flex items-start gap-2">
        <AlertTriangle size={15} className="text-amber-400 mt-0.5" />
        <div>
          Forensic ratios are heuristics, not proof. Banks/financials need specialized interpretation; Altman/Beneish are strongest for operating firms.
        </div>
      </div>
    </div>
  );
}
