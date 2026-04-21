import { useMemo } from 'react';
import { Lightbulb, ShieldAlert, CalendarClock, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { defaultAssumptions, historicalData, taxEvents, type ProjectionAssumptions } from '@/data/itcData';
import { buildIdeaLabReport, summarizeFiveYearCagr } from '@/utils/ideaLab';

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-300';
  if (score >= 55) return 'text-yellow-300';
  return 'text-red-300';
}

function recommendationColor(label: string): string {
  if (label === 'Accumulate') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  if (label === 'Hold') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
  return 'bg-red-500/20 text-red-300 border-red-500/40';
}

export function IdeaLabSection({ assumptions = defaultAssumptions }: { assumptions?: ProjectionAssumptions }) {
  const report = useMemo(
    () => buildIdeaLabReport(assumptions, historicalData, taxEvents),
    [assumptions],
  );

  const cagr = useMemo(() => summarizeFiveYearCagr(historicalData), []);

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300"><Lightbulb size={20} /></div>
          <h2 className="text-2xl font-bold text-white">Autonomous Idea Lab</h2>
        </div>
        <p className="text-gray-400 text-sm ml-12">
          Synthesized investment memo: quality scoring, scenario triangulation, risk register and catalyst dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="metric-card p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400">Composite Score</p>
          <p className={`text-2xl font-bold ${scoreColor(report.overallScore)}`}>{report.overallScore}/100</p>
          <p className="text-xs text-gray-400 mt-1">Weighted from five structural pillars</p>
        </div>
        <div className="metric-card p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400">Recommendation</p>
          <span className={`inline-flex mt-2 px-2 py-1 rounded border text-xs font-semibold ${recommendationColor(report.recommendation)}`}>
            {report.recommendation}
          </span>
          <p className="text-xs text-gray-400 mt-2">Decision engine from score and expected return</p>
        </div>
        <div className="metric-card p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400">Expected Return</p>
          <p className="text-2xl font-bold text-white flex items-center gap-1">
            {report.expectedReturnPct.toFixed(1)}%
            {report.expectedReturnPct >= 0 ? <ArrowUpRight size={16} className="text-emerald-300" /> : <ArrowDownRight size={16} className="text-red-300" />}
          </p>
          <p className="text-xs text-gray-400 mt-1">Scenario probability-weighted fair value</p>
        </div>
        <div className="metric-card p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400">5Y CAGR (Rev / PAT)</p>
          <p className="text-2xl font-bold text-white">{cagr.revenueCagr.toFixed(1)}% / {cagr.profitCagr.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">Last five completed fiscal years</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Sparkles size={15} className="text-blue-300" /> Pillar Scorecard
          </h3>
          <div className="space-y-3">
            {report.pillarScores.map((pillar) => (
              <div key={pillar.id} className="p-3 rounded-lg bg-surface-3/50 border border-border/60">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-white font-medium">{pillar.title}</p>
                  <p className={`text-sm font-bold ${scoreColor(pillar.score)}`}>{pillar.score.toFixed(1)}</p>
                </div>
                <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-blue-400" style={{ width: `${pillar.score}%` }} />
                </div>
                <p className="text-xs text-gray-400">Weight {(pillar.weight * 100).toFixed(0)}% · {pillar.rationale}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <ShieldAlert size={15} className="text-yellow-300" /> Risk Register
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70">
                  <th className="text-left p-2 text-gray-400">Risk</th>
                  <th className="text-center p-2 text-gray-400">Prob</th>
                  <th className="text-center p-2 text-gray-400">Severity</th>
                  <th className="text-right p-2 text-gray-400">Score</th>
                </tr>
              </thead>
              <tbody>
                {report.riskRegister.map((row) => (
                  <tr key={row.risk} className="border-b border-border/40 align-top">
                    <td className="p-2 text-gray-300">
                      <p className="font-medium text-white mb-1">{row.risk}</p>
                      <p className="text-gray-500">{row.mitigation}</p>
                    </td>
                    <td className="text-center p-2 text-gray-300">{row.probability}</td>
                    <td className="text-center p-2 text-gray-300">{row.severity}</td>
                    <td className="text-right p-2 text-white font-semibold">{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <CalendarClock size={15} className="text-purple-300" /> Catalyst Timeline
          </h3>
          <div className="space-y-2">
            {report.catalystTimeline.map((c) => (
              <div key={`${c.period}-${c.catalyst}`} className="p-3 rounded-lg bg-surface-3/40 border border-border/50 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400">{c.period}</p>
                  <p className="text-sm text-white">{c.catalyst}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${c.impact === 'Positive' ? 'bg-emerald-500/20 text-emerald-300' : c.impact === 'Negative' ? 'bg-red-500/20 text-red-300' : 'bg-gray-500/20 text-gray-300'}`}>
                    {c.impact}
                  </span>
                  <p className="text-[11px] text-gray-500 mt-1">{c.confidence.toFixed(0)}% confidence</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Scenario Triangulation</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-3 rounded bg-red-500/10 border border-red-500/30">
              <p className="text-[11px] text-red-200 uppercase">Bear</p>
              <p className="text-lg font-bold text-white">₹{report.scenario.bearPerShare.toFixed(0)}</p>
            </div>
            <div className="p-3 rounded bg-blue-500/10 border border-blue-500/30">
              <p className="text-[11px] text-blue-200 uppercase">Base</p>
              <p className="text-lg font-bold text-white">₹{report.scenario.basePerShare.toFixed(0)}</p>
            </div>
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-[11px] text-emerald-200 uppercase">Bull</p>
              <p className="text-lg font-bold text-white">₹{report.scenario.bullPerShare.toFixed(0)}</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-3/50 border border-border/60">
            <p className="text-xs text-gray-400 mb-1">Expected blended fair value</p>
            <p className="text-2xl text-white font-bold">₹{report.scenario.expectedValuePerShare.toFixed(1)}</p>
            <p className="text-xs text-gray-400 mt-2">
              Downside-to-stress case: <span className={report.downsideRiskPct < 0 ? 'text-red-300' : 'text-emerald-300'}>{report.downsideRiskPct.toFixed(1)}%</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Upside vs market: <span className={report.scenario.upsideVsMarket >= 0 ? 'text-emerald-300' : 'text-red-300'}>{report.scenario.upsideVsMarket.toFixed(1)}%</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
