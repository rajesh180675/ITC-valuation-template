/* ─────────────────────────────────────────────────────────────────────────────
   Valuation Lab V2 — State-of-the-Art Indian IT Services Workbench
   3-stage DCF · Reverse DCF · DDM · Monte Carlo (2,000 paths) · 5-Scenario Tree
   AI-Disruption Overlay · Tornado Sensitivity · Margin-of-Safety + Implied IRR
   Universe: TCS · Infosys · HCL Tech · Wipro · LTIMindtree · Persistent · Coforge
   Data vintage: FY25 actuals + 9M FY26 + Q3 FY26 (reported Jan 2026)
   ───────────────────────────────────────────────────────────────────────────── */
import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
  ReferenceArea,
} from 'recharts';
import { ChartTooltip } from '@/components/itc/shared';
import {
  IT_COMPANIES, IT_COMPANIES_BY_TICKER, type ITCompanyData,
} from '@/data/itCompanyBaselines';
import {
  threeStageDCF, reverseDCF, ddm, monteCarlo, tornado, runScenarios,
  applyAIOverlay, impliedIRR, decisionFromMoS, triangulate,
  type ThreeStageDCFParams, type DDMParams, type MonteCarloInputs,
  type AIOverlayInputs,
} from '@/valuation/itEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Palette + formatters (BSE / Bombay Stock Exchange-inspired premium)
// ─────────────────────────────────────────────────────────────────────────────
const PAL = {
  ink: '#0F1F3D',
  gold: '#C9A961',
  blue: '#1F4FA8',
  green: '#2E7D5B',
  red: '#B5475C',
  amber: '#D89B3F',
  slate: '#6B7280',
  surface: '#FBFAF7',
  hairline: '#E8E4D8',
} as const;

const fmtPct = (n: number, d = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`;
const fmtINR = (n: number) =>
  Math.abs(n) >= 1_00_000 ? `₹${(n / 1_00_000).toFixed(2)} L Cr` :
  Math.abs(n) >= 1_000 ? `₹${(n / 1_000).toFixed(1)} K Cr` :
  `₹${n.toFixed(0)} Cr`;
const fmtSh = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const fmtX = (n: number) => `${n.toFixed(1)}x`;

// ─────────────────────────────────────────────────────────────────────────────
// Slider primitive
// ─────────────────────────────────────────────────────────────────────────────
function Slider({
  label, value, min, max, step, onChange, suffix = '', hint, accent = PAL.blue,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string; hint?: string; accent?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: PAL.slate, fontWeight: 600, letterSpacing: 0.2 }}>{label}</span>
        <span style={{ fontSize: 12.5, color: PAL.ink, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {value.toFixed(step < 1 ? 2 : 1)}{suffix}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: accent }}
      />
      {hint && <div style={{ fontSize: 10, color: PAL.slate, marginTop: 1, fontStyle: 'italic' }}>{hint}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI tile
// ─────────────────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, tone = 'neutral' }: {
  label: string; value: string; sub?: string; tone?: 'pos' | 'neg' | 'neutral' | 'gold';
}) {
  const color = tone === 'pos' ? PAL.green : tone === 'neg' ? PAL.red : tone === 'gold' ? PAL.gold : PAL.ink;
  return (
    <div className="premium-card" style={{ padding: '12px 14px' }}>
      <div className="kpi-eyebrow" style={{ fontSize: 10, color: PAL.slate, fontWeight: 700, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: PAL.slate, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level component
// ─────────────────────────────────────────────────────────────────────────────
export function ValuationLabV2({
  activeTicker, onSelect,
}: { activeTicker: string; onSelect: (t: string) => void }) {
  const co = IT_COMPANIES_BY_TICKER[activeTicker] || IT_COMPANIES[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Header />
      <CompanySwitcher active={activeTicker} onSelect={onSelect} />
      <ValuationCore co={co} key={co.ticker} />
    </div>
  );
}

function Header() {
  return (
    <div className="premium-card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: PAL.gold, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>Valuation Lab V2</div>
        <div style={{ fontSize: 21, fontWeight: 800, color: PAL.ink, marginTop: 2 }}>State-of-the-Art Indian IT Valuation Workbench</div>
        <div style={{ fontSize: 12, color: PAL.slate, marginTop: 4, lineHeight: 1.5 }}>
          3-stage DCF · Reverse DCF · DDM triangulation · 5-scenario tree · Monte Carlo (2,000 paths) · AI-disruption overlay · Tornado sensitivity · Margin-of-safety + implied IRR
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 10, color: PAL.slate, fontWeight: 600, letterSpacing: 0.6 }}>DATA VINTAGE</div>
        <div style={{ fontSize: 13, color: PAL.ink, fontWeight: 700, marginTop: 2 }}>FY25 actuals · 9M FY26 print</div>
        <div style={{ fontSize: 10.5, color: PAL.slate, marginTop: 2 }}>As of Q3 FY26 results (Jan 2026)</div>
      </div>
    </div>
  );
}

function CompanySwitcher({ active, onSelect }: { active: string; onSelect: (t: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
      {IT_COMPANIES.map((c) => {
        const isActive = c.ticker === active;
        return (
          <button
            key={c.ticker}
            onClick={() => onSelect(c.ticker)}
            className="premium-card"
            style={{
              padding: '10px 8px',
              cursor: 'pointer',
              border: isActive ? `2px solid ${PAL.gold}` : `1px solid ${PAL.hairline}`,
              background: isActive ? '#FAF6E8' : '#FFF',
              textAlign: 'center',
              transition: 'all 120ms',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: isActive ? PAL.gold : PAL.ink, letterSpacing: 0.4 }}>{c.ticker}</div>
            <div style={{ fontSize: 9.5, color: PAL.slate, marginTop: 2, fontWeight: 600 }}>{c.segment}</div>
            <div style={{ fontSize: 11.5, color: PAL.ink, fontWeight: 700, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{fmtSh(c.baseline.cmp)}</div>
            <div style={{ fontSize: 9.5, color: PAL.slate, marginTop: 1 }}>EPS ₹{c.baseline.trailingEPS.toFixed(0)}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: state + memos + tab routing
// ─────────────────────────────────────────────────────────────────────────────
function ValuationCore({ co }: { co: ITCompanyData }) {
  const b = co.baseline;
  const d0 = co.defaultDCF;

  // 3-stage DCF state ────────────────────────────────────────────────────────
  const [g1, setG1] = useState(d0.g1);
  const [n1, setN1] = useState(d0.n1);
  const [g2, setG2] = useState(d0.g2);
  const [n2, setN2] = useState(d0.n2);
  const [gT, setGT] = useState(d0.gT);
  const [marginEnd, setMarginEnd] = useState(d0.marginEnd);
  const [marginTerminal, setMarginTerminal] = useState(d0.marginTerminal);
  const [wacc, setWacc] = useState(d0.wacc);

  // DDM state ────────────────────────────────────────────────────────────────
  const dd = co.defaultDDM;
  const [ke, setKe] = useState(dd.ke);
  const [ddmG1, setDdmG1] = useState(dd.g1);
  const [ddmG2, setDdmG2] = useState(dd.g2);
  const [ddmGt, setDdmGt] = useState(dd.gT);
  const [ddmBuyback, setDdmBuyback] = useState(dd.buybackYield);

  // AI overlay state ─────────────────────────────────────────────────────────
  const ai0 = co.defaultAI;
  const [aiUplift, setAiUplift] = useState(ai0.productivityUplift);
  const [aiPass, setAiPass] = useState(ai0.passThrough);
  const [aiCross, setAiCross] = useState(ai0.crossoverYear);
  const [aiSvcGrowth, setAiSvcGrowth] = useState(ai0.aiServicesGrowth);
  const [aiShare, setAiShare] = useState(ai0.aiSharePct);
  const [aiMarginBps, setAiMarginBps] = useState(ai0.marginUpliftBps);

  // Monte Carlo state ────────────────────────────────────────────────────────
  const mc0 = co.defaultMC;
  const [mcRuns, setMcRuns] = useState(mc0.trials);
  const [mcSeed, setMcSeed] = useState(mc0.seed);

  // Tab state ────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'dcf' | 'reverse' | 'ddm' | 'scenarios' | 'mc' | 'ai' | 'tornado' | 'decision'>('dcf');

  // Engine outputs (memoized) ────────────────────────────────────────────────
  const dcfParams: ThreeStageDCFParams = { g1, n1, g2, n2, gT, marginEnd, marginTerminal, wacc };
  const dcf = useMemo(() => threeStageDCF(b, dcfParams), [b, g1, n1, g2, n2, gT, marginEnd, marginTerminal, wacc]);

  const revG1 = useMemo(() => reverseDCF(b, {
    cmp: b.cmp, solveFor: 'g1', fixedParams: dcfParams,
  }), [b, n1, n2, g2, gT, marginEnd, marginTerminal, wacc]);
  const revMargin = useMemo(() => reverseDCF(b, {
    cmp: b.cmp, solveFor: 'marginTerminal', fixedParams: dcfParams,
  }), [b, g1, n1, n2, g2, gT, marginEnd, wacc]);

  const ddmParams: DDMParams = { ke, g1: ddmG1, n1: dd.n1, g2: ddmG2, n2: dd.n2, gT: ddmGt, buybackYield: ddmBuyback };
  const ddmRes = useMemo(() => ddm(b, ddmParams), [b, ke, ddmG1, ddmG2, ddmGt, ddmBuyback]);

  const aiParams: AIOverlayInputs = {
    productivityUplift: aiUplift, passThrough: aiPass, crossoverYear: aiCross,
    aiServicesGrowth: aiSvcGrowth, aiSharePct: aiShare, marginUpliftBps: aiMarginBps,
  };
  const aiOverlay = useMemo(() => applyAIOverlay(b, dcfParams, aiParams), [b, dcfParams, aiUplift, aiPass, aiCross, aiSvcGrowth, aiShare, aiMarginBps]);

  const scenarios = useMemo(() => runScenarios(b, dcfParams, co.scenarios), [b, dcfParams, co.scenarios]);

  const tornadoVars = useMemo(() => tornado(b, dcfParams, [
    { name: 'g1', pct: 25 },
    { name: 'marginTerminal', pct: 10 },
    { name: 'marginEnd', pct: 10 },
    { name: 'wacc', pct: 15 },
    { name: 'gT', pct: 25 },
    { name: 'g2', pct: 25 },
    { name: 'n1', pct: 20 },
  ]), [b, dcfParams]);

  const mcInputs: MonteCarloInputs = { ...mc0, trials: mcRuns, seed: mcSeed };
  const mcRes = useMemo(() => monteCarlo(b, mcInputs), [b, mcRuns, mcSeed]);

  // Method triangulation ─────────────────────────────────────────────────────
  const tri = {
    dcf: dcf.fairValue,
    ddm: ddmRes.fairValue,
    scenario: scenarios.weightedFV,
    mc: mcRes.median,
  };
  const blended = triangulate({ dcf: 0.4, ddm: 0.2, scenario: 0.25, mc: 0.15 }, tri);
  const mos = ((blended - b.cmp) / b.cmp) * 100;
  const decision = decisionFromMoS(mos);
  const annualPayout = b.trailingDPS + (b.cmp * b.buybackYield) / 100;
  const irr5 = impliedIRR(b.cmp, blended, 5, annualPayout);
  const irr10 = impliedIRR(b.cmp, blended, 10, annualPayout);

  return (
    <>
      <TriangulationCard co={co} dcf={dcf} ddmRes={ddmRes} scenarios={scenarios} mcRes={mcRes}
        blended={blended} mos={mos} decision={decision} irr5={irr5} irr10={irr10} />

      <InnerTabs tab={tab} setTab={setTab} />

      {tab === 'dcf' && (
        <DCFPanel co={co} dcf={dcf} aiOverlay={aiOverlay}
          g1={g1} setG1={setG1} n1={n1} setN1={setN1}
          g2={g2} setG2={setG2} n2={n2} setN2={setN2} gT={gT} setGT={setGT}
          marginEnd={marginEnd} setMarginEnd={setMarginEnd}
          marginTerminal={marginTerminal} setMarginTerminal={setMarginTerminal}
          wacc={wacc} setWacc={setWacc} />
      )}

      {tab === 'reverse' && (
        <ReversePanel co={co} revG1={revG1} revMargin={revMargin} dcfParams={dcfParams} />
      )}

      {tab === 'ddm' && (
        <DDMPanel co={co} ddmRes={ddmRes}
          ke={ke} setKe={setKe} g1={ddmG1} setG1={setDdmG1}
          g2={ddmG2} setG2={setDdmG2} gT={ddmGt} setGT={setDdmGt}
          buybackYield={ddmBuyback} setBuybackYield={setDdmBuyback} />
      )}

      {tab === 'scenarios' && <ScenariosPanel co={co} scenarios={scenarios} />}

      {tab === 'mc' && (
        <MCPanel co={co} mc={mcRes}
          mcRuns={mcRuns} setMcRuns={setMcRuns} mcSeed={mcSeed} setMcSeed={setMcSeed} />
      )}

      {tab === 'ai' && (
        <AIPanel co={co} overlay={aiOverlay}
          aiUplift={aiUplift} setAiUplift={setAiUplift}
          aiPass={aiPass} setAiPass={setAiPass}
          aiCross={aiCross} setAiCross={setAiCross}
          aiSvcGrowth={aiSvcGrowth} setAiSvcGrowth={setAiSvcGrowth}
          aiShare={aiShare} setAiShare={setAiShare}
          aiMarginBps={aiMarginBps} setAiMarginBps={setAiMarginBps} />
      )}

      {tab === 'tornado' && <TornadoPanel co={co} vars={tornadoVars} dcf={dcf} />}

      {tab === 'decision' && (
        <DecisionPanel co={co} blended={blended} mos={mos} decision={decision}
          irr5={irr5} irr10={irr10} mcRes={mcRes} dcf={dcf} ddmRes={ddmRes}
          scenarios={scenarios} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Triangulation card (always-on summary)
// ─────────────────────────────────────────────────────────────────────────────
function TriangulationCard({
  co, dcf, ddmRes, scenarios, mcRes, blended, mos, decision, irr5, irr10,
}: any) {
  const b = co.baseline;
  const tone: 'pos' | 'neg' | 'gold' | 'neutral' =
    mos >= 25 ? 'pos' : mos >= 10 ? 'gold' : mos >= -10 ? 'neutral' : 'neg';
  return (
    <div className="premium-card" style={{ padding: '18px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: PAL.gold, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Method Triangulation</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: PAL.ink, marginTop: 2 }}>
            {co.longName} <span style={{ color: PAL.slate, fontWeight: 500 }}>· {co.ticker}</span>
          </div>
          <div style={{ fontSize: 11.5, color: PAL.slate, marginTop: 4 }}>
            {co.segment} · CMP {fmtSh(b.cmp)} · EPS ₹{b.trailingEPS.toFixed(1)} · DPS ₹{b.trailingDPS.toFixed(0)} · Buyback yield {b.buybackYield.toFixed(1)}%
          </div>
        </div>
        <div style={{
          padding: '8px 18px',
          background: decision.color + '22',
          color: decision.color,
          borderRadius: 4, fontWeight: 800, fontSize: 14, letterSpacing: 0.6,
          border: `1px solid ${decision.color}66`,
        }}>
          {decision.status}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
        <KPI label="3-STAGE DCF" value={fmtSh(dcf.fairValue)} sub={`MoS ${fmtPct(dcf.marginOfSafety)}`} />
        <KPI label="DDM" value={fmtSh(ddmRes.fairValue)} sub={`Yield + buyback`} />
        <KPI label="SCENARIOS" value={fmtSh(scenarios.weightedFV)} sub={`Prob-weighted`} />
        <KPI label="MONTE CARLO" value={fmtSh(mcRes.median)} sub={`P50 of 2,000 paths`} />
        <KPI label="BLENDED FAIR VALUE" value={fmtSh(blended)} sub={`40/20/25/15 weighting`} tone="gold" />
        <KPI label="MARGIN OF SAFETY" value={fmtPct(mos)} sub={`vs CMP ${fmtSh(b.cmp)}`} tone={tone} />
        <KPI label="IMPLIED IRR" value={`${irr5.toFixed(1)}% / ${irr10.toFixed(1)}%`} sub="5Y / 10Y holding" tone={tone} />
      </div>
    </div>
  );
}

function InnerTabs({ tab, setTab }: { tab: string; setTab: (v: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['dcf', '3-Stage DCF'],
    ['reverse', 'Reverse DCF'],
    ['ddm', 'Dividend Discount'],
    ['scenarios', '5-Scenario Tree'],
    ['mc', 'Monte Carlo'],
    ['ai', 'AI Overlay'],
    ['tornado', 'Tornado'],
    ['decision', 'Decision'],
  ];
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: `1px solid ${PAL.hairline}`, paddingBottom: 6 }}>
      {tabs.map(([k, l]) => (
        <button
          key={k}
          onClick={() => setTab(k)}
          style={{
            padding: '7px 14px',
            background: tab === k ? PAL.ink : 'transparent',
            color: tab === k ? '#FFF' : PAL.slate,
            fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4,
            border: tab === k ? `1px solid ${PAL.ink}` : `1px solid ${PAL.hairline}`,
            borderRadius: 4, cursor: 'pointer', transition: 'all 120ms',
          }}
        >{l}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — 3-Stage DCF
// ─────────────────────────────────────────────────────────────────────────────
function DCFPanel({
  co, dcf, aiOverlay,
  g1, setG1, n1, setN1, g2, setG2, n2, setN2, gT, setGT,
  marginEnd, setMarginEnd, marginTerminal, setMarginTerminal,
  wacc, setWacc,
}: any) {
  const b = co.baseline;
  const fcfChart = dcf.fcfPath.map((x: any) => ({
    year: `FY${26 + x.year - 1}`,
    revenue: x.revenue,
    fcf: x.fcf,
    pvFcf: x.pvFCF,
    margin: x.ebitMargin,
  }));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14 }}>
      <div className="premium-card" style={{ padding: 16 }}>
        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, marginBottom: 10, letterSpacing: 0.7 }}>STAGE-1 EXPLICIT</div>
        <Slider label="Revenue Growth (g1)" value={g1} onChange={setG1} min={-5} max={20} step={0.1} suffix="%" hint={`Default ${co.defaultDCF.g1.toFixed(1)}%`} accent={PAL.gold} />
        <Slider label="Stage-1 Length" value={n1} onChange={setN1} min={3} max={7} step={1} suffix="yr" />
        <Slider label="Margin at end of S-1" value={marginEnd} onChange={setMarginEnd} min={10} max={32} step={0.1} suffix="%" hint={`Base ${b.baseEBITMargin.toFixed(1)}%`} accent={PAL.gold} />

        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, margin: '12px 0 10px', letterSpacing: 0.7 }}>STAGE-2 FADE</div>
        <Slider label="Fade Growth (g2)" value={g2} onChange={setG2} min={1} max={12} step={0.1} suffix="%" />
        <Slider label="Stage-2 Length" value={n2} onChange={setN2} min={3} max={8} step={1} suffix="yr" />
        <Slider label="Terminal Margin" value={marginTerminal} onChange={setMarginTerminal} min={10} max={30} step={0.1} suffix="%" />

        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, margin: '12px 0 10px', letterSpacing: 0.7 }}>STAGE-3 TERMINAL</div>
        <Slider label="Terminal Growth (gT)" value={gT} onChange={setGT} min={1} max={6} step={0.1} suffix="%" hint="Long-run real GDP + inflation" />
        <Slider label="WACC" value={wacc} onChange={setWacc} min={8} max={16} step={0.1} suffix="%" accent={PAL.red} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <KPI label="ENTERPRISE VALUE" value={fmtINR(dcf.ev)} sub="Sum of PVs" />
          <KPI label="EQUITY VALUE" value={fmtINR(dcf.equityValue)} sub={`Net cash ${fmtINR(b.netCash)}`} />
          <KPI label="FAIR VALUE / SHARE" value={fmtSh(dcf.fairValue)} sub={`vs CMP ${fmtSh(b.cmp)}`} tone="gold" />
          <KPI label="AI-OVERLAY FV" value={fmtSh(aiOverlay.adjustedFairValue)}
               sub={`Δ ${fmtPct(aiOverlay.netImpactPct)}`}
               tone={aiOverlay.adjustedFairValue >= dcf.fairValue ? 'pos' : 'neg'} />
        </div>

        <div className="premium-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>Projected FCF Path · Revenue × Margin × Discount</div>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={fcfChart} margin={{ top: 10, right: 12, bottom: 8, left: 4 }}>
              <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 10.5, fill: PAL.slate }} />
              <YAxis yAxisId="L" tick={{ fontSize: 10.5, fill: PAL.slate }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <YAxis yAxisId="R" orientation="right" domain={[0, 35]} tick={{ fontSize: 10.5, fill: PAL.slate }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar yAxisId="L" dataKey="fcf" name="FCF (Cr)" fill={PAL.gold} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="L" dataKey="pvFcf" name="PV of FCF (Cr)" fill={PAL.green} fillOpacity={0.6} radius={[4, 4, 0, 0]} />
              <Line yAxisId="R" dataKey="margin" name="EBIT %" stroke={PAL.red} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10, color: PAL.slate, flexWrap: 'wrap' }}>
            <span><b style={{ color: PAL.ink }}>Stage-1 PV:</b> {fmtINR(dcf.pvExplicit * (n1 / (n1 + n2)))}</span>
            <span><b style={{ color: PAL.ink }}>Stage-2 PV:</b> {fmtINR(dcf.pvExplicit * (n2 / (n1 + n2)))}</span>
            <span><b style={{ color: PAL.ink }}>Terminal PV:</b> {fmtINR(dcf.pvTerminal)} ({((dcf.pvTerminal / dcf.ev) * 100).toFixed(0)}% of EV)</span>
            <span><b style={{ color: PAL.ink }}>Implied EV/EBIT:</b> {fmtX(dcf.impliedEVEBIT)}</span>
          </div>
        </div>

        <div className="premium-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>EV Decomposition Bridge</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={[
              { name: 'Explicit PV (S1+S2)', v: dcf.pvExplicit },
              { name: 'Terminal PV', v: dcf.pvTerminal },
              { name: 'Enterprise Value', v: dcf.ev },
              { name: 'Net Cash', v: b.netCash },
              { name: 'Equity Value', v: dcf.equityValue },
            ]} margin={{ top: 8, right: 8, bottom: 8, left: 4 }}>
              <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: PAL.slate }} />
              <YAxis tick={{ fontSize: 10, fill: PAL.slate }} tickFormatter={(v) => `₹${(v / 1_00_000).toFixed(1)}L`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                {[PAL.amber, PAL.blue, PAL.gold, PAL.green, PAL.ink].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 — Reverse DCF
// ─────────────────────────────────────────────────────────────────────────────
function ReversePanel({ co, revG1, revMargin }: any) {
  const b = co.baseline;
  const baseG1 = co.defaultDCF.g1;
  const baseM = co.defaultDCF.marginTerminal;
  const gapG1 = revG1.implied - baseG1;
  const gapM = revMargin.implied - baseM;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div className="premium-card" style={{ padding: 18 }}>
        <div style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, letterSpacing: 0.6 }}>SOLVE FOR · STAGE-1 GROWTH</div>
        <div style={{ fontSize: 12, color: PAL.slate, marginTop: 2, marginBottom: 14 }}>What revenue growth must persist to justify the current price, holding all else equal?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <KPI label="IMPLIED g1" value={`${revG1.implied.toFixed(2)}%`} sub={`Default ${baseG1.toFixed(1)}%`} tone="gold" />
          <KPI label="GAP" value={fmtPct(gapG1)} sub={gapG1 > 0 ? 'Market priced for upside' : 'Already de-rated'} tone={gapG1 > 0 ? 'neg' : 'pos'} />
        </div>
        <div style={{ marginTop: 16, fontSize: 11.5, color: PAL.slate, lineHeight: 1.55 }}>
          <b style={{ color: PAL.ink }}>Reading:</b> {gapG1 > 1.5
            ? `The market is implying revenue growth ~${gapG1.toFixed(1)}pp above your base case. Stretch case — modest disappointment punishes valuation.`
            : gapG1 < -1.5
            ? `The market is implying growth ~${Math.abs(gapG1).toFixed(1)}pp below your base case. Pessimism is in the price; even a base-case outcome re-rates the stock.`
            : `Market expectation is in line with your base case. Outcomes are roughly fair.`}
        </div>
        <div style={{ fontSize: 10.5, color: PAL.slate, marginTop: 10, fontStyle: 'italic' }}>
          Bisection solver · {revG1.iterations} iterations · residual {revG1.residual.toFixed(2)}
        </div>
      </div>

      <div className="premium-card" style={{ padding: 18 }}>
        <div style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, letterSpacing: 0.6 }}>SOLVE FOR · TERMINAL EBIT MARGIN</div>
        <div style={{ fontSize: 12, color: PAL.slate, marginTop: 2, marginBottom: 14 }}>What perpetual margin is the market underwriting?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <KPI label="IMPLIED MARGIN" value={`${revMargin.implied.toFixed(2)}%`} sub={`Default ${baseM.toFixed(1)}%`} tone="gold" />
          <KPI label="GAP" value={fmtPct(gapM)} sub={gapM > 0 ? 'Above your view' : 'Below your view'} tone={gapM > 0 ? 'neg' : 'pos'} />
        </div>
        <div style={{ marginTop: 16, fontSize: 11.5, color: PAL.slate, lineHeight: 1.55 }}>
          <b style={{ color: PAL.ink }}>Reading:</b> {gapM > 0.8
            ? `Market needs ~${gapM.toFixed(1)}pp of margin expansion that may or may not materialize given AI repricing. Watch operating leverage closely.`
            : gapM < -0.8
            ? `Market is conservative on margins. Any margin recovery beyond ~${revMargin.implied.toFixed(1)}% is incremental upside.`
            : `Market embeds your terminal margin. Outcomes neutral on this lever.`}
        </div>
      </div>

      <div className="premium-card" style={{ gridColumn: '1 / -1', padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 6 }}>What's Priced In — Composite Read</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, fontSize: 11.5, color: PAL.slate, lineHeight: 1.55 }}>
          <div>
            <div style={{ color: PAL.ink, fontWeight: 700, marginBottom: 4 }}>Growth view</div>
            Implied {revG1.implied.toFixed(1)}% vs. consensus FY27E ~{(baseG1 + 0.5).toFixed(1)}%. Difference compounds over the explicit-growth window.
          </div>
          <div>
            <div style={{ color: PAL.ink, fontWeight: 700, marginBottom: 4 }}>Margin view</div>
            Implied terminal {revMargin.implied.toFixed(1)}% vs. trailing {b.baseEBITMargin.toFixed(1)}%. Captures the AI-pricing tug-of-war debate.
          </div>
          <div>
            <div style={{ color: PAL.ink, fontWeight: 700, marginBottom: 4 }}>Combined</div>
            CMP {fmtSh(b.cmp)} → embeds growth × margin combination broadly {(gapG1 + gapM) > 0.5 ? 'optimistic' : (gapG1 + gapM) < -0.5 ? 'cautious' : 'fair'}.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 — DDM
// ─────────────────────────────────────────────────────────────────────────────
function DDMPanel({
  co, ddmRes, ke, setKe, g1, setG1, g2, setG2, gT, setGT, buybackYield, setBuybackYield,
}: any) {
  const b = co.baseline;
  const upside = ddmRes.upside;
  // Build dividend trajectory for chart
  const path: { year: string; div: number; pv: number }[] = [];
  let div = b.trailingDPS;
  for (let i = 1; i <= co.defaultDDM.n1; i++) {
    div = div * (1 + g1 / 100);
    path.push({ year: `FY${26 + i - 1}`, div, pv: div / Math.pow(1 + ke / 100, i) });
  }
  for (let i = 1; i <= co.defaultDDM.n2; i++) {
    div = div * (1 + g2 / 100);
    const yr = co.defaultDDM.n1 + i;
    path.push({ year: `FY${26 + yr - 1}`, div, pv: div / Math.pow(1 + ke / 100, yr) });
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14 }}>
      <div className="premium-card" style={{ padding: 16 }}>
        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, marginBottom: 10, letterSpacing: 0.7 }}>DIVIDEND ASSUMPTIONS</div>
        <Slider label="Cost of Equity (ke)" value={ke} onChange={setKe} min={8} max={16} step={0.1} suffix="%" accent={PAL.red} />
        <Slider label="Stage-1 Dividend Growth" value={g1} onChange={setG1} min={0} max={20} step={0.5} suffix="%" hint="Explicit window growth" />
        <Slider label="Stage-2 Dividend Growth" value={g2} onChange={setG2} min={0} max={15} step={0.5} suffix="%" />
        <Slider label="Terminal Growth" value={gT} onChange={setGT} min={1} max={6} step={0.1} suffix="%" />
        <Slider label="Buyback Yield" value={buybackYield} onChange={setBuybackYield} min={0} max={4} step={0.1} suffix="%" hint="Supplemental return-of-capital" accent={PAL.gold} />
        <div style={{ fontSize: 10.5, color: PAL.slate, marginTop: 10, fontStyle: 'italic' }}>
          DDM applies for IT majors because payout + buyback regularly exceeds 80% of FCF — earnings effectively flow back to shareholders.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <KPI label="DDM FAIR VALUE" value={fmtSh(ddmRes.fairValue)} sub={`vs CMP ${fmtSh(b.cmp)}`} tone="gold" />
          <KPI label="UPSIDE" value={fmtPct(upside)} sub={upside > 10 ? 'Comfortable' : upside > -10 ? 'Fair' : 'Stretched'} tone={upside > 0 ? 'pos' : 'neg'} />
          <KPI label="PV OF DIVIDENDS" value={fmtSh(ddmRes.pvDividends)} sub="Stage-1 + Stage-2 + buyback" />
          <KPI label="PV OF TERMINAL" value={fmtSh(ddmRes.pvTerminal)} sub="Gordon perpetuity" />
        </div>

        <div className="premium-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>Projected Dividend Stream · Nominal vs Discounted</div>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={path} margin={{ top: 10, right: 12, bottom: 8, left: 4 }}>
              <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 10.5, fill: PAL.slate }} />
              <YAxis tick={{ fontSize: 10.5, fill: PAL.slate }} tickFormatter={(v) => `₹${v.toFixed(0)}`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="div" name="Nominal Dividend" fill={PAL.gold} radius={[4, 4, 0, 0]} />
              <Bar dataKey="pv" name="PV of Dividend" fill={PAL.green} fillOpacity={0.7} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4 — 5-Scenario tree
// ─────────────────────────────────────────────────────────────────────────────
function ScenariosPanel({ co, scenarios }: any) {
  const b = co.baseline;
  const rows = scenarios.results;
  const colors: Record<string, string> = {
    'Bull': PAL.green, 'Base': PAL.blue, 'Bear': PAL.amber, 'Stress': PAL.red, 'Black Swan': PAL.ink,
  };
  const totalProb = rows.reduce((s: number, r: any) => s + r.probability, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <KPI label="PROB-WEIGHTED FV" value={fmtSh(scenarios.weightedFV)} sub="Sum(prob × FV)" tone="gold" />
        <KPI label="PROB-WEIGHTED UPSIDE" value={fmtPct(scenarios.weightedUpside)} sub={`vs CMP ${fmtSh(b.cmp)}`} tone={scenarios.weightedUpside > 0 ? 'pos' : 'neg'} />
        <KPI label="PROBABILITY SUM" value={`${totalProb}%`} sub="Conditional outcomes" />
      </div>

      <div className="premium-card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>Per-Scenario Fair Value vs CMP</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 10, right: 12, bottom: 8, left: 4 }}>
            <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: PAL.slate }} />
            <YAxis tick={{ fontSize: 10.5, fill: PAL.slate }} tickFormatter={(v) => `₹${(v).toFixed(0)}`} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={b.cmp} stroke={PAL.red} strokeDasharray="4 4" label={{ value: `CMP ${fmtSh(b.cmp)}`, position: 'right', fill: PAL.red, fontSize: 11 }} />
            <Bar dataKey="fairValue" name="Fair Value (per share)" radius={[4, 4, 0, 0]}>
              {rows.map((r: any) => <Cell key={r.name} fill={colors[r.name]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="premium-card" style={{ padding: 14, overflowX: 'auto' }}>
        <table className="sensex-table" style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: PAL.surface, borderBottom: `2px solid ${PAL.hairline}` }}>
              <th style={th}>Scenario</th>
              <th style={th}>P(%)</th>
              <th style={th}>g1 (%)</th>
              <th style={th}>gT (%)</th>
              <th style={th}>Term Margin</th>
              <th style={th}>WACC</th>
              <th style={th}>Exit EV/EBIT</th>
              <th style={th}>Fair Value</th>
              <th style={th}>Upside</th>
              <th style={th}>Weighted FV</th>
              <th style={{ ...th, minWidth: 200 }}>Narrative</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.name} style={{ borderBottom: `1px solid ${PAL.hairline}` }}>
                <td style={{ ...td, color: colors[r.name], fontWeight: 800 }}>{r.name}</td>
                <td style={td}>{r.probability}</td>
                <td style={td}>{r.g1.toFixed(1)}</td>
                <td style={td}>{r.gT.toFixed(1)}</td>
                <td style={td}>{r.marginTerminal.toFixed(1)}%</td>
                <td style={td}>{r.wacc.toFixed(1)}%</td>
                <td style={td}>{r.exitMultiple.toFixed(1)}x</td>
                <td style={{ ...td, fontWeight: 700, color: PAL.ink }}>{fmtSh(r.fairValue)}</td>
                <td style={{ ...td, color: r.upside > 0 ? PAL.green : PAL.red, fontWeight: 700 }}>{fmtPct(r.upside)}</td>
                <td style={td}>{fmtSh(r.weightedFV)}</td>
                <td style={{ ...td, color: PAL.slate, fontSize: 10.5, fontStyle: 'italic' }}>{r.narrative}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: 10.5, color: PAL.slate, fontWeight: 700, letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: '7px 10px', fontSize: 11, color: PAL.ink, fontVariantNumeric: 'tabular-nums' };

// ─────────────────────────────────────────────────────────────────────────────
// Tab 5 — Monte Carlo
// ─────────────────────────────────────────────────────────────────────────────
function MCPanel({ co, mc, mcRuns, setMcRuns, mcSeed, setMcSeed }: any) {
  const b = co.baseline;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14 }}>
      <div className="premium-card" style={{ padding: 16 }}>
        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, marginBottom: 10, letterSpacing: 0.7 }}>MONTE CARLO CONTROLS</div>
        <Slider label="Trials" value={mcRuns} onChange={setMcRuns} min={500} max={5000} step={250} suffix="" hint={`${mcRuns} simulations`} />
        <Slider label="RNG Seed" value={mcSeed} onChange={setMcSeed} min={1} max={1000} step={1} suffix="" hint="Deterministic re-runs" />
        <div style={{ fontSize: 10.5, color: PAL.slate, marginTop: 10, fontStyle: 'italic', lineHeight: 1.5 }}>
          Mulberry32-seeded triangular draws over g1, marginEnd, marginTerminal, gT, WACC. Distributions and ranges are pre-calibrated per company in <code>defaultMC</code>.
        </div>
        <div style={{ fontSize: 10.5, color: PAL.ink, marginTop: 12, fontWeight: 700 }}>
          Pre-calibrated triangular ranges:
        </div>
        <ul style={{ fontSize: 10.5, color: PAL.slate, marginTop: 6, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>g1: {co.defaultMC.g1.low.toFixed(1)} / {co.defaultMC.g1.mode.toFixed(1)} / {co.defaultMC.g1.high.toFixed(1)}%</li>
          <li>Margin (end): {co.defaultMC.marginEnd.low.toFixed(1)}–{co.defaultMC.marginEnd.high.toFixed(1)}%</li>
          <li>Margin (term): {co.defaultMC.marginTerminal.low.toFixed(1)}–{co.defaultMC.marginTerminal.high.toFixed(1)}%</li>
          <li>WACC: {co.defaultMC.wacc.low.toFixed(1)}–{co.defaultMC.wacc.high.toFixed(1)}%</li>
          <li>gT: {co.defaultMC.gT.low.toFixed(1)}–{co.defaultMC.gT.high.toFixed(1)}%</li>
        </ul>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          <KPI label="P10" value={fmtSh(mc.p10)} sub="Pessimistic" tone="neg" />
          <KPI label="P25" value={fmtSh(mc.p25)} />
          <KPI label="MEDIAN" value={fmtSh(mc.median)} sub="P50" tone="gold" />
          <KPI label="MEAN" value={fmtSh(mc.mean)} />
          <KPI label="P75" value={fmtSh(mc.p75)} />
          <KPI label="P90" value={fmtSh(mc.p90)} sub="Optimistic" tone="pos" />
        </div>

        <div className="premium-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>
            Distribution of Fair Values · {mc.values.length.toLocaleString()} simulations · σ = ₹{mc.stdev.toFixed(0)} · P(FV &gt; CMP) = {mc.probAboveCMP.toFixed(0)}%
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mc.bins} margin={{ top: 10, right: 12, bottom: 8, left: 4 }}>
              <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
              <XAxis dataKey="x" tick={{ fontSize: 10, fill: PAL.slate }} tickFormatter={(v) => `₹${v.toFixed(0)}`} />
              <YAxis tick={{ fontSize: 10, fill: PAL.slate }} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceArea x1={mc.p25} x2={mc.p75} fill={PAL.gold} fillOpacity={0.08} />
              <ReferenceLine x={b.cmp} stroke={PAL.red} strokeDasharray="4 4" label={{ value: 'CMP', position: 'top', fill: PAL.red, fontSize: 10 }} />
              <ReferenceLine x={mc.median} stroke={PAL.blue} strokeDasharray="2 2" label={{ value: 'P50', position: 'top', fill: PAL.blue, fontSize: 10 }} />
              <Bar dataKey="count" fill={PAL.blue} fillOpacity={0.75} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: PAL.slate, marginTop: 8, lineHeight: 1.5 }}>
            <b style={{ color: PAL.ink }}>Reading:</b> The P10–P90 fan spans {fmtSh(mc.p10)} to {fmtSh(mc.p90)}; the inter-quartile band (gold) captures 50% of mass. Probability of fair value exceeding CMP is <b style={{ color: mc.probAboveCMP > 50 ? PAL.green : PAL.red }}>{mc.probAboveCMP.toFixed(0)}%</b>.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 6 — AI Overlay
// ─────────────────────────────────────────────────────────────────────────────
function AIPanel({
  co, overlay,
  aiUplift, setAiUplift, aiPass, setAiPass, aiCross, setAiCross,
  aiSvcGrowth, setAiSvcGrowth, aiShare, setAiShare,
  aiMarginBps, setAiMarginBps,
}: any) {
  const impact = overlay.netImpactPct;
  const tone = impact > 5 ? 'pos' : impact < -5 ? 'neg' : 'neutral';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
      <div className="premium-card" style={{ padding: 16 }}>
        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, marginBottom: 10, letterSpacing: 0.7 }}>PRICING TUG-OF-WAR</div>
        <Slider label="Productivity Uplift / Drag" value={aiUplift} onChange={setAiUplift} min={-10} max={8} step={0.5} suffix="%" hint="Negative = cost savings clients capture" accent={PAL.red} />
        <Slider label="Pass-Through to Clients" value={aiPass} onChange={setAiPass} min={0} max={100} step={5} suffix="%" hint="0 = vendor keeps gains" />
        <Slider label="Crossover Year" value={aiCross} onChange={setAiCross} min={1} max={5} step={1} suffix="" hint="Year AI repricing fully bites" />

        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, margin: '12px 0 10px', letterSpacing: 0.7 }}>AI-LED REVENUE</div>
        <Slider label="AI Services Growth" value={aiSvcGrowth} onChange={setAiSvcGrowth} min={0} max={80} step={2.5} suffix="%" hint="Replaces traditional rev" accent={PAL.gold} />
        <Slider label="AI Share of Revenue" value={aiShare} onChange={setAiShare} min={0} max={40} step={0.5} suffix="%" hint={`Now ${co.aiMetrics.aiAnnualizedUSDb.toFixed(1)}B annualized`} />
        <Slider label="Margin Uplift (bps)" value={aiMarginBps} onChange={setAiMarginBps} min={-100} max={300} step={10} suffix="bps" hint="Net structural impact" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <KPI label="BASE FAIR VALUE" value={fmtSh(overlay.baseFairValue)} sub="No AI overlay" />
          <KPI label="AI-ADJUSTED FV" value={fmtSh(overlay.adjustedFairValue)} sub={`Δ ${fmtPct(overlay.netImpactPct)}`} tone={tone} />
          <KPI label="REV @ Y5 (BASE)" value={fmtINR(overlay.baseRevenue5Y)} sub="Pre-AI projection" />
          <KPI label="REV @ Y5 (ADJ)" value={fmtINR(overlay.adjustedRevenue5Y)} sub="Post-AI overlay" />
        </div>

        <div className="premium-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>Net AI Impact Decomposition</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={[
                { metric: 'Revenue Y5', base: overlay.baseRevenue5Y, adj: overlay.adjustedRevenue5Y },
                { metric: 'Margin Y5 (%)', base: overlay.baseMarginExit, adj: overlay.adjustedMarginExit },
                { metric: 'Fair Value', base: overlay.baseFairValue, adj: overlay.adjustedFairValue },
              ]} margin={{ top: 10, right: 8, bottom: 8, left: 4 }}>
                <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
                <XAxis dataKey="metric" tick={{ fontSize: 10.5, fill: PAL.slate }} />
                <YAxis tick={{ fontSize: 10.5, fill: PAL.slate }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="base" name="Base" fill={PAL.slate} radius={[4, 4, 0, 0]} />
                <Bar dataKey="adj" name="AI-adjusted" fill={PAL.gold} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 11, color: PAL.slate, lineHeight: 1.55 }}>
              <div style={{ color: PAL.ink, fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Structural reading</div>
              <p>The overlay separates <b>repricing drag</b> (productivity × pass-through) from <b>AI-services revenue</b> (share × growth) and adds a structural <b>margin uplift</b>.</p>
              <p style={{ marginTop: 8 }}><b>Pricing pressure</b> is dominant when {aiPass}% of {Math.abs(aiUplift)}% productivity is passed through — that's a {((aiUplift * aiPass) / 100).toFixed(2)}% drag on Stage-1 growth.</p>
              <p style={{ marginTop: 8 }}><b>Net effect</b>: <span style={{ color: tone === 'pos' ? PAL.green : tone === 'neg' ? PAL.red : PAL.ink, fontWeight: 800 }}>{fmtPct(impact)}</span> change in fair value vs. base.</p>
              <p style={{ marginTop: 8, fontSize: 10.5, fontStyle: 'italic' }}>{co.ticker}'s AI bookings are ${co.aiMetrics.aiBookingsUSDb.toFixed(1)}B (annualized ${co.aiMetrics.aiAnnualizedUSDb.toFixed(1)}B); {co.aiMetrics.productionized} engagements in production.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 7 — Tornado
// ─────────────────────────────────────────────────────────────────────────────
function TornadoPanel({ vars, dcf }: any) {
  const baseFV = dcf.fairValue;
  const data = vars.map((v: any) => ({
    name: v.name,
    delta: v.delta,
    high: v.high - baseFV,
    low: v.low - baseFV,
  }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="premium-card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>Tornado · Top sensitivity drivers (±25% perturbation)</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, bottom: 8, left: 60 }}>
            <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 10.5, fill: PAL.slate }} tickFormatter={(v) => `₹${v.toFixed(0)}`} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11.5, fill: PAL.ink, fontWeight: 600 }} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine x={0} stroke={PAL.ink} />
            <Bar dataKey="low" name="-25%" fill={PAL.red} radius={[0, 0, 0, 0]} />
            <Bar dataKey="high" name="+25%" fill={PAL.green} radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: PAL.slate, marginTop: 6, lineHeight: 1.5 }}>
          Bars centered on base fair value of <b style={{ color: PAL.ink }}>{fmtSh(baseFV)}</b>. Inputs ranked by impact magnitude. Top driver: <b style={{ color: PAL.gold }}>{vars[0].name}</b> (Δ {vars[0].delta.toFixed(1)}% of FV).
        </div>
      </div>

      <div className="premium-card" style={{ padding: 14, overflowX: 'auto' }}>
        <table className="sensex-table" style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: PAL.surface, borderBottom: `2px solid ${PAL.hairline}` }}>
              <th style={th}>Driver</th>
              <th style={th}>Base FV</th>
              <th style={th}>+25% FV</th>
              <th style={th}>-25% FV</th>
              <th style={th}>Spread</th>
              <th style={th}>Impact (% of FV)</th>
            </tr>
          </thead>
          <tbody>
            {vars.map((v: any) => (
              <tr key={v.name} style={{ borderBottom: `1px solid ${PAL.hairline}` }}>
                <td style={{ ...td, fontWeight: 700 }}>{v.name}</td>
                <td style={td}>{fmtSh(v.base)}</td>
                <td style={{ ...td, color: PAL.green }}>{fmtSh(v.high)}</td>
                <td style={{ ...td, color: PAL.red }}>{fmtSh(v.low)}</td>
                <td style={td}>{fmtSh(v.high - v.low)}</td>
                <td style={{ ...td, color: PAL.gold, fontWeight: 700 }}>{v.delta.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 8 — Decision
// ─────────────────────────────────────────────────────────────────────────────
function DecisionPanel({ co, blended, mos, decision, irr5, irr10, mcRes, dcf, ddmRes, scenarios }: any) {
  const b = co.baseline;
  const upsides = [
    { method: '3-Stage DCF', fv: dcf.fairValue, weight: '40%' },
    { method: 'DDM', fv: ddmRes.fairValue, weight: '20%' },
    { method: 'Scenario-weighted', fv: scenarios.weightedFV, weight: '25%' },
    { method: 'Monte Carlo P50', fv: mcRes.median, weight: '15%' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="premium-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: PAL.gold, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Investment Decision</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: decision.color, marginTop: 4, letterSpacing: 0.5 }}>{decision.status}</div>
            <div style={{ fontSize: 13, color: PAL.slate, marginTop: 6, lineHeight: 1.55 }}>{decision.reasoning}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, minWidth: 380 }}>
            <KPI label="BLENDED FAIR VALUE" value={fmtSh(blended)} sub={`Triangulated · vs CMP ${fmtSh(b.cmp)}`} tone="gold" />
            <KPI label="MARGIN OF SAFETY" value={fmtPct(mos)} sub={mos > 0 ? 'Discount' : 'Premium'} tone={mos > 0 ? 'pos' : 'neg'} />
            <KPI label="IMPLIED IRR · 5Y" value={`${irr5.toFixed(1)}%`} sub="Forward holding period" />
            <KPI label="IMPLIED IRR · 10Y" value={`${irr10.toFixed(1)}%`} sub="Long compounding window" />
          </div>
        </div>
      </div>

      <div className="premium-card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 10 }}>Triangulation Breakdown</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
          {upsides.map(u => (
            <div key={u.method} className="premium-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: PAL.slate, fontWeight: 700, letterSpacing: 0.4 }}>{u.method.toUpperCase()}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: PAL.ink, marginTop: 2 }}>{fmtSh(u.fv)}</div>
              <div style={{ fontSize: 10.5, color: PAL.slate, marginTop: 2 }}>Weight: {u.weight}</div>
              <div style={{ fontSize: 10.5, color: u.fv > b.cmp ? PAL.green : PAL.red, marginTop: 2, fontWeight: 700 }}>
                {fmtPct(((u.fv - b.cmp) / b.cmp) * 100)} vs CMP
              </div>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={upsides.concat([{ method: 'Blended', fv: blended, weight: 'Σ' }])} margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
            <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
            <XAxis dataKey="method" tick={{ fontSize: 10.5, fill: PAL.slate }} />
            <YAxis tick={{ fontSize: 10.5, fill: PAL.slate }} tickFormatter={(v) => `₹${v.toFixed(0)}`} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={b.cmp} stroke={PAL.red} strokeDasharray="4 4" label={{ value: `CMP ${fmtSh(b.cmp)}`, position: 'right', fill: PAL.red, fontSize: 10 }} />
            <Bar dataKey="fv" radius={[4, 4, 0, 0]}>
              {upsides.concat([{ method: 'Blended', fv: blended, weight: 'Σ' }]).map((u, i) => (
                <Cell key={i} fill={u.method === 'Blended' ? PAL.gold : PAL.blue} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="premium-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.green, marginBottom: 8, letterSpacing: 0.5 }}>BULL THESIS</div>
          <ul style={{ fontSize: 11.5, color: PAL.ink, lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
            {co.bullThesis.map((t: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}
          </ul>
        </div>
        <div className="premium-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.red, marginBottom: 8, letterSpacing: 0.5 }}>BEAR THESIS</div>
          <ul style={{ fontSize: 11.5, color: PAL.ink, lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
            {co.bearThesis.map((t: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}
          </ul>
        </div>
      </div>

      <div className="premium-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: PAL.amber, marginBottom: 8, letterSpacing: 0.5 }}>KEY RISKS TO MONITOR</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {co.keyRisks.map((r: string, i: number) => (
            <div key={i} style={{ fontSize: 11.5, color: PAL.ink, padding: '6px 10px', background: PAL.surface, borderLeft: `3px solid ${PAL.amber}` }}>
              {r}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
