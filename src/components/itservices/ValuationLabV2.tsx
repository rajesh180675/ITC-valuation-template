/* ─────────────────────────────────────────────────────────────────────────────
   Valuation Lab V2 — State-of-the-art IT services valuation workbench
   ───────────────────────────────────────────────────────────────────────────── */
import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart,
} from 'recharts';
import { ChartTooltip, fmt } from '@/components/itc/shared';
import {
  IT_COMPANIES, IT_COMPANIES_BY_TICKER, type ITCompanyData,
} from '@/data/itCompanyBaselines';
import {
  threeStageDCF, reverseDCF, ddm, monteCarlo, tornado, runScenarios,
  applyAIOverlay, impliedIRR, decisionFromMoS, triangulate,
  type ThreeStageDCFParams, type DDMParams, type MonteCarloInputs,
  type AIOverlayInputs, type ScenarioCase,
} from '@/valuation/itEngine';

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
  n >= 1_00_000 ? `₹${(n / 1_00_000).toFixed(2)} L Cr` :
  n >= 1_000 ? `₹${(n / 1_000).toFixed(1)} K Cr` :
  `₹${n.toFixed(0)} Cr`;
const fmtSh = (n: number) => `₹${n.toFixed(0)}`;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/* ─────────────────────────────────────────────────────────────────────────────
   Slider primitive
   ───────────────────────────────────────────────────────────────────────────── */
function Slider({
  label, value, min, max, step, onChange, suffix, hint, accent = PAL.blue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 11.5, color: PAL.slate, fontWeight: 600, letterSpacing: 0.2 }}>{label}</span>
        <span style={{ fontSize: 13, color: PAL.ink, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {value.toFixed(step < 1 ? 2 : 1)}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: accent }}
      />
      {hint && <div style={{ fontSize: 10.5, color: PAL.slate, marginTop: 2, fontStyle: 'italic' }}>{hint}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   KPI Tile
   ───────────────────────────────────────────────────────────────────────────── */
function KPI({
  label, value, sub, tone = 'neutral',
}: { label: string; value: string; sub?: string; tone?: 'pos' | 'neg' | 'neutral' | 'gold' }) {
  const color = tone === 'pos' ? PAL.green : tone === 'neg' ? PAL.red : tone === 'gold' ? PAL.gold : PAL.ink;
  return (
    <div className="premium-card" style={{ padding: '14px 16px' }}>
      <div className="kpi-eyebrow" style={{ fontSize: 10.5, color: PAL.slate, fontWeight: 700, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: PAL.slate, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ValuationLabV2 — main entry
   ───────────────────────────────────────────────────────────────────────────── */
export function ValuationLabV2({
  activeTicker, onSelect,
}: { activeTicker: string; onSelect: (t: string) => void }) {
  const co = IT_COMPANIES_BY_TICKER[activeTicker] || IT_COMPANIES[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Header />
      <CompanySwitcher active={activeTicker} onSelect={onSelect} />
      <ValuationCore co={co} key={co.ticker} />
    </div>
  );
}

function Header() {
  return (
    <div className="premium-card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 11, color: PAL.gold, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>Valuation Lab V2</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: PAL.ink, marginTop: 2 }}>State-of-the-Art IT Services Valuation Workbench</div>
        <div style={{ fontSize: 12, color: PAL.slate, marginTop: 4 }}>
          3-stage DCF · Reverse DCF · DDM triangulation · 5-scenario tree · Monte Carlo (2,000 paths) · AI-disruption overlay · Tornado sensitivity · Margin-of-safety + implied IRR
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 10.5, color: PAL.slate, fontWeight: 600, letterSpacing: 0.6 }}>DATA VINTAGE</div>
        <div style={{ fontSize: 13, color: PAL.ink, fontWeight: 700, marginTop: 2 }}>FY25 actuals · 9M FY26 print</div>
        <div style={{ fontSize: 11, color: PAL.slate, marginTop: 2 }}>As of Q3 FY26 (Jan 2026)</div>
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
            <div style={{ fontSize: 9.5, color: PAL.slate, marginTop: 2, fontWeight: 600 }}>{c.tier}</div>
            <div style={{ fontSize: 11, color: PAL.ink, fontWeight: 700, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{fmtSh(c.cmp)}</div>
            <div style={{ fontSize: 9.5, color: PAL.slate, marginTop: 1 }}>FwdPE {c.cmpMultiples.fwdPE.toFixed(1)}x</div>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Core — sliders drive engine; engine outputs feed every panel
   ───────────────────────────────────────────────────────────────────────────── */
function ValuationCore({ co }: { co: ITCompanyData }) {
  // ── 3-stage DCF state ──────────────────────────────────────────────────────
  const [g1, setG1] = useState(co.baseCase.stage1Growth);   // explicit growth
  const [g2, setG2] = useState(co.baseCase.stage2Growth);   // fade growth
  const [gT, setGT] = useState(co.baseCase.terminalGrowth); // terminal
  const [margin, setMargin] = useState(co.baseCase.ebitMargin);
  const [reinv, setReinv] = useState(co.baseCase.reinvestmentRate);
  const [wacc, setWacc] = useState(co.baseCase.wacc);
  const [taxRate, setTaxRate] = useState(co.taxRate);
  const [exitMultiple, setExitMultiple] = useState(co.baseCase.exitEvEbitda);
  const [tvBlend, setTvBlend] = useState(0.5); // 0 = gordon, 1 = exit multiple

  // ── DDM state ──────────────────────────────────────────────────────────────
  const [payout, setPayout] = useState(co.payoutRatio);
  const [costEquity, setCostEquity] = useState(co.baseCase.wacc + 0.5);

  // ── AI overlay state ───────────────────────────────────────────────────────
  const [aiProductivity, setAiProductivity] = useState(15);  // % productivity uplift
  const [aiPassThrough, setAiPassThrough] = useState(60);    // % passed through to clients
  const [aiServicesGrowth, setAiServicesGrowth] = useState(40); // AI services rev growth
  const [aiRevenueShare, setAiRevenueShare] = useState(co.aiRevShare); // current AI rev as %
  const [aiCrossover, setAiCrossover] = useState(2028);

  // ── Monte Carlo state ──────────────────────────────────────────────────────
  const [mcRuns, setMcRuns] = useState(2000);
  const [mcSeed, setMcSeed] = useState(42);
  const [mcGrowthVol, setMcGrowthVol] = useState(2.5);
  const [mcMarginVol, setMcMarginVol] = useState(1.5);
  const [mcWaccVol, setMcWaccVol] = useState(0.7);

  // ── Inner tabs ─────────────────────────────────────────────────────────────
  const [innerTab, setInnerTab] = useState<'core' | 'reverse' | 'ddm' | 'scenarios' | 'mc' | 'ai' | 'tornado' | 'decision'>('core');

  // ── Derived: AI overlay applied to base inputs ─────────────────────────────
  const aiOverlay: AIOverlayInputs = {
    productivityUplift: aiProductivity,
    passThrough: aiPassThrough,
    aiServicesGrowth: aiServicesGrowth,
    aiRevenueShare: aiRevenueShare,
    crossoverYear: aiCrossover,
    currentYear: 2026,
  };

  const overlaid = applyAIOverlay({
    baseGrowth: g1,
    baseMargin: margin,
    baseTerminalGrowth: gT,
  }, aiOverlay);

  // ── DCF inputs (pre-overlay for "raw" view; overlaid for "AI-adjusted") ────
  const dcfBase: ThreeStageDCFParams = {
    baseRevenue: co.fy25Revenue,
    baseFcf: co.fy25FCF,
    stage1Years: 3,
    stage2Years: 5,
    stage1Growth: g1,
    stage2Growth: g2,
    terminalGrowth: gT,
    ebitMargin: margin,
    taxRate: taxRate,
    reinvestmentRate: reinv,
    wacc: wacc,
    exitEvEbitda: exitMultiple,
    tvBlend: tvBlend,
    netDebt: co.netDebt,
    sharesOutstanding: co.sharesOutstanding,
    cmp: co.cmp,
  };

  const dcfRaw = useMemo(() => threeStageDCF(dcfBase), [
    co.ticker, g1, g2, gT, margin, reinv, wacc, taxRate, exitMultiple, tvBlend,
  ]);

  const dcfAI = useMemo(() => threeStageDCF({
    ...dcfBase,
    stage1Growth: overlaid.adjGrowth,
    ebitMargin: overlaid.adjMargin,
    terminalGrowth: overlaid.adjTerminalGrowth,
  }), [co.ticker, dcfBase, overlaid.adjGrowth, overlaid.adjMargin, overlaid.adjTerminalGrowth]);

  // ── Reverse DCF ────────────────────────────────────────────────────────────
  const rev = useMemo(() => reverseDCF({
    cmp: co.cmp,
    sharesOutstanding: co.sharesOutstanding,
    netDebt: co.netDebt,
    baseFcf: co.fy25FCF,
    wacc, terminalGrowth: gT, stage1Years: 3, stage2Years: 5, stage2Growth: g2,
  }), [co.ticker, wacc, gT, g2]);

  // ── DDM ───────────────────────────────────────────────────────────────────
  const ddmParams: DDMParams = {
    baseEPS: co.fy25EPS,
    payoutRatio: payout,
    epsGrowthExplicit: g1,
    epsGrowthFade: g2,
    terminalGrowth: gT,
    costEquity: costEquity,
    explicitYears: 3,
    fadeYears: 5,
  };
  const ddmRes = useMemo(() => ddm(ddmParams), [
    co.ticker, payout, g1, g2, gT, costEquity, co.fy25EPS,
  ]);

  // ── 5-scenario tree ────────────────────────────────────────────────────────
  const scenarios = useMemo(() => runScenarios(co, taxRate), [co.ticker, taxRate]);

  // ── Tornado ────────────────────────────────────────────────────────────────
  const tornadoData = useMemo(() => tornado(dcfBase), [
    co.ticker, g1, g2, gT, margin, reinv, wacc, taxRate, exitMultiple, tvBlend,
  ]);

  // ── Monte Carlo ────────────────────────────────────────────────────────────
  const mcInputs: MonteCarloInputs = {
    base: dcfBase,
    runs: mcRuns,
    seed: mcSeed,
    growthVol: mcGrowthVol,
    marginVol: mcMarginVol,
    waccVol: mcWaccVol,
    terminalGrowthVol: 0.3,
  };
  const mc = useMemo(() => monteCarlo(mcInputs), [
    co.ticker, mcRuns, mcSeed, mcGrowthVol, mcMarginVol, mcWaccVol,
    g1, g2, gT, margin, reinv, wacc, taxRate, exitMultiple, tvBlend,
  ]);

  // ── Triangulation ──────────────────────────────────────────────────────────
  const triangle = useMemo(() => triangulate({
    dcf: dcfRaw.fairValue,
    reverse: rev.impliedFairValue,
    ddm: ddmRes.fairValue,
    weights: { dcf: 0.5, reverse: 0.2, ddm: 0.3 },
  }), [dcfRaw.fairValue, rev.impliedFairValue, ddmRes.fairValue]);

  // ── Decision metrics ───────────────────────────────────────────────────────
  const mos = ((triangle.blended - co.cmp) / triangle.blended) * 100;
  const irr5 = impliedIRR(co.cmp, triangle.blended, 5);
  const irr10 = impliedIRR(co.cmp, triangle.blended, 10);
  const decision = decisionFromMoS(mos);

  return (
    <>
      <TriangulationCard
        co={co} triangle={triangle} dcfRaw={dcfRaw} rev={rev} ddmRes={ddmRes}
        mos={mos} irr5={irr5} irr10={irr10} decision={decision}
      />

      <InnerTabs tab={innerTab} setTab={setInnerTab} />

      {innerTab === 'core' && (
        <CoreDCFPanel
          co={co}
          g1={g1} setG1={setG1} g2={g2} setG2={setG2} gT={gT} setGT={setGT}
          margin={margin} setMargin={setMargin} reinv={reinv} setReinv={setReinv}
          wacc={wacc} setWacc={setWacc} taxRate={taxRate} setTaxRate={setTaxRate}
          exitMultiple={exitMultiple} setExitMultiple={setExitMultiple}
          tvBlend={tvBlend} setTvBlend={setTvBlend}
          dcfRaw={dcfRaw} dcfAI={dcfAI}
        />
      )}

      {innerTab === 'reverse' && <ReverseDCFPanel co={co} rev={rev} g2={g2} setG2={setG2} gT={gT} setGT={setGT} wacc={wacc} setWacc={setWacc} />}

      {innerTab === 'ddm' && (
        <DDMPanel
          co={co} payout={payout} setPayout={setPayout}
          costEquity={costEquity} setCostEquity={setCostEquity}
          g1={g1} g2={g2} gT={gT} ddmRes={ddmRes}
        />
      )}

      {innerTab === 'scenarios' && <ScenariosPanel co={co} scenarios={scenarios} />}

      {innerTab === 'mc' && (
        <MonteCarloPanel
          mc={mc} cmp={co.cmp}
          mcRuns={mcRuns} setMcRuns={setMcRuns}
          mcSeed={mcSeed} setMcSeed={setMcSeed}
          mcGrowthVol={mcGrowthVol} setMcGrowthVol={setMcGrowthVol}
          mcMarginVol={mcMarginVol} setMcMarginVol={setMcMarginVol}
          mcWaccVol={mcWaccVol} setMcWaccVol={setMcWaccVol}
        />
      )}

      {innerTab === 'ai' && (
        <AIOverlayPanel
          co={co} dcfRaw={dcfRaw} dcfAI={dcfAI} overlaid={overlaid}
          aiProductivity={aiProductivity} setAiProductivity={setAiProductivity}
          aiPassThrough={aiPassThrough} setAiPassThrough={setAiPassThrough}
          aiServicesGrowth={aiServicesGrowth} setAiServicesGrowth={setAiServicesGrowth}
          aiRevenueShare={aiRevenueShare} setAiRevenueShare={setAiRevenueShare}
          aiCrossover={aiCrossover} setAiCrossover={setAiCrossover}
        />
      )}

      {innerTab === 'tornado' && <TornadoPanel co={co} data={tornadoData} dcfRaw={dcfRaw} />}

      {innerTab === 'decision' && (
        <DecisionPanel
          co={co} triangle={triangle} mos={mos} irr5={irr5} irr10={irr10}
          decision={decision} mc={mc}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Triangulation Card — top-of-page summary
   ───────────────────────────────────────────────────────────────────────────── */
function TriangulationCard({
  co, triangle, dcfRaw, rev, ddmRes, mos, irr5, irr10, decision,
}: any) {
  const tone: 'pos' | 'neg' | 'gold' | 'neutral' =
    mos >= 25 ? 'pos' : mos >= 10 ? 'gold' : mos >= -10 ? 'neutral' : 'neg';
  return (
    <div className="premium-card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: PAL.gold, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Method Triangulation</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: PAL.ink, marginTop: 2 }}>
            {co.name} <span style={{ color: PAL.slate, fontWeight: 500 }}>· {co.ticker}</span>
          </div>
          <div style={{ fontSize: 11.5, color: PAL.slate, marginTop: 4 }}>{co.investmentThesis}</div>
        </div>
        <div className="kpi-eyebrow" style={{
          padding: '6px 14px', background: tone === 'pos' ? '#E8F5EE' : tone === 'gold' ? '#FAF1DA' : tone === 'neg' ? '#FBEEF1' : '#F2F2F0',
          color: tone === 'pos' ? PAL.green : tone === 'gold' ? PAL.gold : tone === 'neg' ? PAL.red : PAL.slate,
          borderRadius: 4, fontWeight: 800, fontSize: 12, letterSpacing: 0.6,
        }}>
          {decision}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        <KPI label="3-STAGE DCF" value={fmtSh(dcfRaw.fairValue)} sub={`Stage-1 → Stage-3 fade`} tone="neutral" />
        <KPI label="REVERSE DCF" value={fmtSh(rev.impliedFairValue)} sub={`Implied g: ${rev.impliedStage1Growth.toFixed(1)}%`} tone="neutral" />
        <KPI label="DDM" value={fmtSh(ddmRes.fairValue)} sub={`PV of dividends + buybacks`} tone="neutral" />
        <KPI label="BLENDED FAIR VALUE" value={fmtSh(triangle.blended)} sub={`50/20/30 weighting`} tone="gold" />
        <KPI label="MARGIN OF SAFETY" value={`${mos >= 0 ? '+' : ''}${mos.toFixed(1)}%`} sub={`vs CMP ${fmtSh(co.cmp)}`} tone={tone} />
        <KPI label="IMPLIED IRR" value={`${irr5.toFixed(1)}% / ${irr10.toFixed(1)}%`} sub="5Y / 10Y holding" tone={tone} />
      </div>
    </div>
  );
}

function InnerTabs({ tab, setTab }: { tab: string; setTab: (v: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['core', '3-Stage DCF'],
    ['reverse', 'Reverse DCF'],
    ['ddm', 'DDM'],
    ['scenarios', '5-Scenario Tree'],
    ['mc', 'Monte Carlo'],
    ['ai', 'AI Overlay'],
    ['tornado', 'Tornado'],
    ['decision', 'Decision'],
  ];
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: `1px solid ${PAL.hairline}`, paddingBottom: 8 }}>
      {tabs.map(([k, l]) => (
        <button
          key={k}
          onClick={() => setTab(k)}
          style={{
            padding: '8px 14px',
            background: tab === k ? PAL.ink : 'transparent',
            color: tab === k ? '#FFF' : PAL.slate,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.4,
            border: tab === k ? `1px solid ${PAL.ink}` : `1px solid ${PAL.hairline}`,
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 120ms',
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Core DCF Panel
   ───────────────────────────────────────────────────────────────────────────── */
function CoreDCFPanel({
  co, g1, setG1, g2, setG2, gT, setGT, margin, setMargin, reinv, setReinv,
  wacc, setWacc, taxRate, setTaxRate, exitMultiple, setExitMultiple,
  tvBlend, setTvBlend, dcfRaw, dcfAI,
}: any) {
  const fcfChart = dcfRaw.projectedFcfPath.map((x: any) => ({
    year: x.year,
    fcf: x.fcf,
    pv: x.pvFcf,
    growth: x.growth * 100,
    stage: x.stage,
  }));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      <div className="premium-card" style={{ padding: 18 }}>
        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, marginBottom: 12, letterSpacing: 0.7 }}>STAGE-1 EXPLICIT (FY26-FY28)</div>
        <Slider label="Revenue Growth" value={g1} onChange={setG1} min={-5} max={25} step={0.1} suffix="%" hint={`Base: ${co.baseCase.stage1Growth.toFixed(1)}%`} />
        <Slider label="EBIT Margin" value={margin} onChange={setMargin} min={5} max={35} step={0.1} suffix="%" hint={`FY25: ${co.fy25EbitMargin.toFixed(1)}%`} />

        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, margin: '14px 0 12px', letterSpacing: 0.7 }}>STAGE-2 FADE (FY29-FY33)</div>
        <Slider label="Fade Growth" value={g2} onChange={setG2} min={1} max={15} step={0.1} suffix="%" hint="Convergence to terminal" />

        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, margin: '14px 0 12px', letterSpacing: 0.7 }}>STAGE-3 TERMINAL</div>
        <Slider label="Terminal Growth" value={gT} onChange={setGT} min={1} max={6} step={0.1} suffix="%" hint="Long-run real GDP + inflation" />
        <Slider label="Reinvestment Rate" value={reinv} onChange={setReinv} min={5} max={50} step={0.5} suffix="%" hint="% of EBIT(1-t) reinvested" />

        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, margin: '14px 0 12px', letterSpacing: 0.7 }}>DISCOUNTING & EXIT</div>
        <Slider label="WACC" value={wacc} onChange={setWacc} min={6} max={16} step={0.1} suffix="%" hint="Cost of capital" />
        <Slider label="Tax Rate" value={taxRate} onChange={setTaxRate} min={15} max={35} step={0.5} suffix="%" />
        <Slider label="Exit EV/EBITDA" value={exitMultiple} onChange={setExitMultiple} min={8} max={30} step={0.5} suffix="x" />
        <Slider label="TV Blend (Gordon ↔ Exit)" value={tvBlend} onChange={setTvBlend} min={0} max={1} step={0.05} suffix="" hint={`${(tvBlend * 100).toFixed(0)}% exit multiple`} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <KPI label="ENTERPRISE VALUE" value={fmtINR(dcfRaw.enterpriseValue)} sub="Sum of PVs" />
          <KPI label="EQUITY VALUE" value={fmtINR(dcfRaw.equityValue)} sub={`Less net debt ${fmtINR(co.netDebt)}`} />
          <KPI label="FAIR VALUE / SHARE" value={fmtSh(dcfRaw.fairValue)} sub={`vs CMP ${fmtSh(co.cmp)}`} tone="gold" />
          <KPI label="AI-OVERLAY FAIR VALUE" value={fmtSh(dcfAI.fairValue)} sub={`Δ ${(((dcfAI.fairValue - dcfRaw.fairValue) / dcfRaw.fairValue) * 100).toFixed(1)}%`} tone={dcfAI.fairValue > dcfRaw.fairValue ? 'pos' : 'neg'} />
        </div>

        <div className="premium-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>Projected FCF Path · Stage-1 → Stage-3</div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={fcfChart} margin={{ top: 10, right: 12, bottom: 8, left: 4 }}>
              <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: PAL.slate }} />
              <YAxis yAxisId="L" tick={{ fontSize: 11, fill: PAL.slate }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <YAxis yAxisId="R" orientation="right" tick={{ fontSize: 11, fill: PAL.slate }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar yAxisId="L" dataKey="fcf" name="FCF (Cr)" radius={[4, 4, 0, 0]}>
                {fcfChart.map((d: any, i: number) => (
                  <Cell key={i} fill={d.stage === 1 ? PAL.gold : d.stage === 2 ? PAL.amber : PAL.blue} />
                ))}
              </Bar>
              <Bar yAxisId="L" dataKey="pv" name="PV of FCF (Cr)" fill={PAL.green} radius={[4, 4, 0, 0]} fillOpacity={0.4} />
              <Line yAxisId="R" dataKey="growth" name="Growth %" stroke={PAL.red} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 10.5, color: PAL.slate }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: PAL.gold, marginRight: 4, verticalAlign: 'middle' }} />Stage-1 explicit</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: PAL.amber, marginRight: 4, verticalAlign: 'middle' }} />Stage-2 fade</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: PAL.blue, marginRight: 4, verticalAlign: 'middle' }} />Stage-3 terminal</span>
          </div>
        </div>

        <div className="premium-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>EV Bridge — Component Decomposition</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart
              data={[
                { name: 'Stage-1 PV', v: dcfRaw.pvStage1, c: PAL.gold },
                { name: 'Stage-2 PV', v: dcfRaw.pvStage2, c: PAL.amber },
                { name: 'TV (Gordon)', v: dcfRaw.tvGordon, c: PAL.blue },
                { name: 'TV (Exit Mult)', v: dcfRaw.tvExitMultiple, c: PAL.green },
                { name: 'Blended TV PV', v: dcfRaw.pvTerminal, c: PAL.red },
                { name: 'Enterprise Value', v: dcfRaw.enterpriseValue, c: PAL.ink },
              ]}
              margin={{ top: 8, right: 8, bottom: 8, left: 4 }}
            >
              <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: PAL.slate }} />
              <YAxis tick={{ fontSize: 10.5, fill: PAL.slate }} tickFormatter={(v) => `₹${(v / 1_00_000).toFixed(1)}L`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                {[PAL.gold, PAL.amber, PAL.blue, PAL.green, PAL.red, PAL.ink].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Reverse DCF Panel
   ───────────────────────────────────────────────────────────────────────────── */
function ReverseDCFPanel({ co, rev, g2, setG2, gT, setGT, wacc, setWacc }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      <div className="premium-card" style={{ padding: 18 }}>
        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, marginBottom: 10, letterSpacing: 0.7 }}>FIXED INPUTS</div>
        <Slider label="WACC" value={wacc} onChange={setWacc} min={6} max={16} step={0.1} suffix="%" />
        <Slider label="Stage-2 Fade Growth" value={g2} onChange={setG2} min={1} max={15} step={0.1} suffix="%" />
        <Slider label="Terminal Growth" value={gT} onChange={setGT} min={1} max={6} step={0.1} suffix="%" />
        <div style={{ marginTop: 14, padding: 12, background: '#FAF6E8', borderLeft: `3px solid ${PAL.gold}`, borderRadius: 2 }}>
          <div style={{ fontSize: 10.5, color: PAL.slate, fontWeight: 700, letterSpacing: 0.5 }}>WHAT IS REVERSE DCF?</div>
          <div style={{ fontSize: 11.5, color: PAL.ink, marginTop: 6, lineHeight: 1.5 }}>
            Holds today's price, WACC and terminal assumptions fixed. Solves for the Stage-1 FCF growth the market is implicitly demanding. If implied growth &gt; reasonable, expectations are aggressive.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <KPI label="MARKET CAP" value={fmtINR(co.cmp * co.sharesOutstanding / 100)} sub={`${(co.sharesOutstanding / 1_00_000_00_000).toFixed(2)}B sh × ${fmtSh(co.cmp)}`} />
          <KPI label="EV (CMP)" value={fmtINR(rev.evAtCmp)} sub={`Net debt ${fmtINR(co.netDebt)}`} />
          <KPI label="IMPLIED STAGE-1 GROWTH" value={`${rev.impliedStage1Growth.toFixed(2)}%`} sub="To justify CMP" tone="gold" />
          <KPI
            label="EXPECTATIONS GAP"
            value={`${(rev.impliedStage1Growth - co.baseCase.stage1Growth).toFixed(1)} pp`}
            sub={rev.impliedStage1Growth > co.baseCase.stage1Growth ? 'Aggressive' : 'Conservative'}
            tone={rev.impliedStage1Growth > co.baseCase.stage1Growth ? 'neg' : 'pos'}
          />
        </div>

        <div className="premium-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>What's Priced In — Implied Growth Curve</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={rev.impliedFcfPath} margin={{ top: 10, right: 12, bottom: 8, left: 4 }}>
              <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: PAL.slate }} />
              <YAxis tick={{ fontSize: 11, fill: PAL.slate }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="fcf" name="Implied FCF (Cr)" stroke={PAL.gold} fill={PAL.gold} fillOpacity={0.25} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 10, padding: 10, background: PAL.surface, fontSize: 11.5, color: PAL.ink, lineHeight: 1.55 }}>
            At <b>{fmtSh(co.cmp)}</b>, the market is pricing-in <b>{rev.impliedStage1Growth.toFixed(2)}% FCF growth</b> for the explicit period (FY26-FY28),
            fading to <b>{g2.toFixed(1)}%</b> through FY33 and a terminal <b>{gT.toFixed(1)}%</b>.
            Recent FCF growth has been <b>{co.fcf3yCagr.toFixed(1)}%</b> (3Y CAGR).
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DDM Panel
   ───────────────────────────────────────────────────────────────────────────── */
function DDMPanel({ co, payout, setPayout, costEquity, setCostEquity, g1, g2, gT, ddmRes }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      <div className="premium-card" style={{ padding: 18 }}>
        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, marginBottom: 10, letterSpacing: 0.7 }}>DDM INPUTS</div>
        <Slider label="Payout Ratio" value={payout} onChange={setPayout} min={20} max={120} step={1} suffix="%" hint={`FY25: ${co.payoutRatio.toFixed(0)}% (incl. buyback)`} />
        <Slider label="Cost of Equity" value={costEquity} onChange={setCostEquity} min={7} max={18} step={0.1} suffix="%" hint="Risk-free + β × ERP" />
        <div style={{ marginTop: 14, padding: 12, background: '#FAF6E8', borderLeft: `3px solid ${PAL.gold}`, borderRadius: 2 }}>
          <div style={{ fontSize: 10.5, color: PAL.slate, fontWeight: 700, letterSpacing: 0.5 }}>WHY DDM FOR IT MAJORS?</div>
          <div style={{ fontSize: 11.5, color: PAL.ink, marginTop: 6, lineHeight: 1.5 }}>
            Big-5 IT services return 60-95% of FCF as dividends + buybacks. Capital-light businesses with limited reinvestment needs — DDM captures the actual cash returned to shareholders. Used as a complement, not a substitute, for DCF.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <KPI label="FY25 EPS" value={fmtSh(co.fy25EPS)} sub={`Δ vs FY24 ${fmtPct(co.epsGrowthFy25)}`} />
          <KPI label="FY25 DPS" value={fmtSh(co.fy25EPS * payout / 100)} sub={`Payout ${payout.toFixed(0)}%`} />
          <KPI label="DDM FAIR VALUE" value={fmtSh(ddmRes.fairValue)} sub="PV of div stream" tone="gold" />
          <KPI
            label="MoS vs CMP"
            value={`${(((ddmRes.fairValue - co.cmp) / ddmRes.fairValue) * 100).toFixed(1)}%`}
            tone={ddmRes.fairValue > co.cmp ? 'pos' : 'neg'}
          />
        </div>

        <div className="premium-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>Dividend Stream — Explicit + Fade + Terminal</div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={ddmRes.dividendPath} margin={{ top: 10, right: 12, bottom: 8, left: 4 }}>
              <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: PAL.slate }} />
              <YAxis tick={{ fontSize: 11, fill: PAL.slate }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="dps" name="DPS (₹)" fill={PAL.gold} radius={[4, 4, 0, 0]} />
              <Line dataKey="pvDps" name="PV of DPS (₹)" stroke={PAL.blue} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 10, fontSize: 11, color: PAL.slate }}>
            Sum of PV of explicit + fade dividends: <b style={{ color: PAL.ink }}>{fmtSh(ddmRes.pvExplicitDividends)}</b> · PV of terminal value: <b style={{ color: PAL.ink }}>{fmtSh(ddmRes.pvTerminal)}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   5-Scenario Tree Panel
   ───────────────────────────────────────────────────────────────────────────── */
function ScenariosPanel({ co, scenarios }: { co: ITCompanyData; scenarios: ScenarioCase[] }) {
  const probWeighted = scenarios.reduce((s, x) => s + x.probability * x.fairValue, 0);
  const upsides = scenarios.map((s) => ({ name: s.name, fv: s.fairValue, prob: s.probability, ret: ((s.fairValue / co.cmp) - 1) * 100, color: s.color }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {scenarios.map((s) => (
          <div key={s.name} className="premium-card" style={{ padding: '14px 14px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: s.color, letterSpacing: 0.6, textTransform: 'uppercase' }}>{s.name}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: PAL.ink, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{fmtSh(s.fairValue)}</div>
            <div style={{ fontSize: 10.5, color: PAL.slate, marginTop: 2 }}>{(s.probability * 100).toFixed(0)}% probability</div>
            <div style={{ fontSize: 10.5, color: PAL.slate, marginTop: 8, lineHeight: 1.4 }}>{s.thesis}</div>
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${PAL.hairline}`, fontSize: 10.5, color: PAL.slate, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums' }}>
              <div>Rev g: <b style={{ color: PAL.ink }}>{s.revGrowth.toFixed(1)}%</b></div>
              <div>EBIT m: <b style={{ color: PAL.ink }}>{s.ebitMargin.toFixed(1)}%</b></div>
              <div>WACC: <b style={{ color: PAL.ink }}>{s.wacc.toFixed(1)}%</b></div>
              <div>Exit: <b style={{ color: PAL.ink }}>{s.exitMultiple.toFixed(0)}x</b></div>
            </div>
          </div>
        ))}
      </div>

      <div className="premium-card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink }}>Probability-Weighted Fair Value</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: PAL.gold, fontVariantNumeric: 'tabular-nums' }}>
            {fmtSh(probWeighted)} <span style={{ fontSize: 11, color: PAL.slate, fontWeight: 600 }}>vs CMP {fmtSh(co.cmp)}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={upsides} margin={{ top: 8, right: 8, bottom: 8, left: 4 }}>
            <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: PAL.slate }} />
            <YAxis tick={{ fontSize: 11, fill: PAL.slate }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={0} stroke={PAL.slate} />
            <Bar dataKey="ret" name="Return vs CMP" radius={[4, 4, 0, 0]}>
              {upsides.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Monte Carlo Panel
   ───────────────────────────────────────────────────────────────────────────── */
function MonteCarloPanel({
  mc, cmp, mcRuns, setMcRuns, mcSeed, setMcSeed,
  mcGrowthVol, setMcGrowthVol, mcMarginVol, setMcMarginVol, mcWaccVol, setMcWaccVol,
}: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      <div className="premium-card" style={{ padding: 18 }}>
        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, marginBottom: 10, letterSpacing: 0.7 }}>SIMULATION CONFIG</div>
        <Slider label="Runs" value={mcRuns} onChange={(v) => setMcRuns(Math.round(v))} min={500} max={5000} step={100} suffix="" hint={`${mcRuns.toLocaleString()} paths`} />
        <Slider label="Random Seed" value={mcSeed} onChange={(v) => setMcSeed(Math.round(v))} min={1} max={9999} step={1} suffix="" hint="Mulberry32 PRNG" />

        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, margin: '14px 0 10px', letterSpacing: 0.7 }}>VOLATILITY (σ in pp)</div>
        <Slider label="Revenue Growth σ" value={mcGrowthVol} onChange={setMcGrowthVol} min={0.5} max={6} step={0.1} suffix="pp" />
        <Slider label="EBIT Margin σ" value={mcMarginVol} onChange={setMcMarginVol} min={0.3} max={5} step={0.1} suffix="pp" />
        <Slider label="WACC σ" value={mcWaccVol} onChange={setMcWaccVol} min={0.1} max={2} step={0.05} suffix="pp" />

        <div style={{ marginTop: 14, padding: 12, background: '#FAF6E8', borderLeft: `3px solid ${PAL.gold}`, borderRadius: 2, fontSize: 11, color: PAL.ink, lineHeight: 1.5 }}>
          Each path samples revenue growth, margin and WACC independently from normal distributions, runs the full 3-stage DCF, and records the resulting per-share fair value.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          <KPI label="P10 (DOWNSIDE)" value={fmtSh(mc.p10)} sub="10th percentile" tone="neg" />
          <KPI label="P25" value={fmtSh(mc.p25)} sub="25th percentile" />
          <KPI label="P50 (MEDIAN)" value={fmtSh(mc.p50)} sub="50th percentile" tone="gold" />
          <KPI label="P75" value={fmtSh(mc.p75)} sub="75th percentile" />
          <KPI label="P90 (UPSIDE)" value={fmtSh(mc.p90)} sub="90th percentile" tone="pos" />
        </div>

        <div className="premium-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>Monte Carlo Distribution — {mc.runs.toLocaleString()} paths</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mc.histogram} margin={{ top: 10, right: 12, bottom: 8, left: 4 }}>
              <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: PAL.slate }} />
              <YAxis tick={{ fontSize: 11, fill: PAL.slate }} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine x={mc.cmpBucket} stroke={PAL.red} strokeDasharray="4 4" label={{ value: `CMP ${fmtSh(cmp)}`, position: 'top', fontSize: 10, fill: PAL.red }} />
              <Bar dataKey="count" name="Paths" fill={PAL.gold} radius={[3, 3, 0, 0]}>
                {mc.histogram.map((d: any, i: number) => (
                  <Cell key={i} fill={d.bucketMid < cmp ? PAL.red : d.bucketMid < mc.p50 ? PAL.amber : PAL.green} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <KPI label="MEAN" value={fmtSh(mc.mean)} />
          <KPI label="STD DEV" value={fmtSh(mc.stdDev)} sub={`${(mc.stdDev / mc.mean * 100).toFixed(1)}% CoV`} />
          <KPI label="P(FAIR > CMP)" value={`${(mc.probAboveCmp * 100).toFixed(1)}%`} tone={mc.probAboveCmp > 0.6 ? 'pos' : mc.probAboveCmp < 0.4 ? 'neg' : 'neutral'} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AI Overlay Panel
   ───────────────────────────────────────────────────────────────────────────── */
function AIOverlayPanel({
  co, dcfRaw, dcfAI, overlaid,
  aiProductivity, setAiProductivity, aiPassThrough, setAiPassThrough,
  aiServicesGrowth, setAiServicesGrowth, aiRevenueShare, setAiRevenueShare,
  aiCrossover, setAiCrossover,
}: any) {
  const delta = ((dcfAI.fairValue - dcfRaw.fairValue) / dcfRaw.fairValue) * 100;
  const tone: 'pos' | 'neg' | 'neutral' = delta > 5 ? 'pos' : delta < -5 ? 'neg' : 'neutral';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      <div className="premium-card" style={{ padding: 18 }}>
        <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, marginBottom: 10, letterSpacing: 0.7 }}>AI DISRUPTION DIALS</div>
        <Slider label="Productivity Uplift" value={aiProductivity} onChange={setAiProductivity} min={0} max={50} step={1} suffix="%" hint="Coding output per FTE" />
        <Slider label="Price Pass-Through" value={aiPassThrough} onChange={setAiPassThrough} min={0} max={100} step={5} suffix="%" hint="% of savings clients capture" />
        <Slider label="AI Services Growth" value={aiServicesGrowth} onChange={setAiServicesGrowth} min={0} max={80} step={1} suffix="%" hint="GenAI revenue CAGR" />
        <Slider label="Current AI Rev Share" value={aiRevenueShare} onChange={setAiRevenueShare} min={0} max={30} step={0.5} suffix="%" hint={`Reported: ~${co.aiRevShare.toFixed(1)}%`} />
        <Slider label="Crossover Year" value={aiCrossover} onChange={(v) => setAiCrossover(Math.round(v))} min={2026} max={2032} step={1} suffix="" hint="Year AI rev > legacy rev" />

        <div style={{ marginTop: 14, padding: 12, background: '#FAF6E8', borderLeft: `3px solid ${PAL.gold}`, borderRadius: 2, fontSize: 11, color: PAL.ink, lineHeight: 1.55 }}>
          AI cuts effort hours per ticket but clients capture pass-through — net effect on revenue depends on volume offset. Margin expands from automation, contracts from price compression.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <KPI label="ADJ STAGE-1 GROWTH" value={`${overlaid.adjGrowth.toFixed(2)}%`} sub={`Δ ${(overlaid.adjGrowth - co.baseCase.stage1Growth).toFixed(2)}pp`} tone={overlaid.adjGrowth > co.baseCase.stage1Growth ? 'pos' : 'neg'} />
          <KPI label="ADJ EBIT MARGIN" value={`${overlaid.adjMargin.toFixed(2)}%`} sub={`Δ ${(overlaid.adjMargin - co.fy25EbitMargin).toFixed(2)}pp`} tone={overlaid.adjMargin > co.fy25EbitMargin ? 'pos' : 'neg'} />
          <KPI label="ADJ TERMINAL" value={`${overlaid.adjTerminalGrowth.toFixed(2)}%`} sub="Long-run g" />
          <KPI label="AI-ADJ FAIR VALUE" value={fmtSh(dcfAI.fairValue)} sub={`Δ ${delta.toFixed(1)}% vs raw DCF`} tone={tone} />
        </div>

        <div className="premium-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 8 }}>AI-Adjusted FCF Path vs Raw DCF</div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={dcfRaw.projectedFcfPath.map((x: any, i: number) => ({
                year: x.year,
                raw: x.fcf,
                ai: dcfAI.projectedFcfPath[i].fcf,
              }))}
              margin={{ top: 10, right: 12, bottom: 8, left: 4 }}
            >
              <CartesianGrid stroke={PAL.hairline} strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: PAL.slate }} />
              <YAxis tick={{ fontSize: 11, fill: PAL.slate }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="raw" name="Raw FCF (Cr)" fill={PAL.slate} radius={[3, 3, 0, 0]} fillOpacity={0.5} />
              <Bar dataKey="ai" name="AI-Adj FCF (Cr)" fill={PAL.gold} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tornado Sensitivity Panel
   ───────────────────────────────────────────────────────────────────────────── */
function TornadoPanel({ co, data, dcfRaw }: any) {
  const sorted = [...data].sort((a: any, b: any) => Math.abs(b.deltaUp) + Math.abs(b.deltaDown) - (Math.abs(a.deltaUp) + Math.abs(a.deltaDown)));
  return (
    <div className="premium-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: PAL.ink, marginBottom: 4 }}>Tornado — Sensitivity of Fair Value to ±1σ Shocks</div>
      <div style={{ fontSize: 11, color: PAL.slate, marginBottom: 12 }}>
        Base fair value: <b>{fmtSh(dcfRaw.fairValue)}</b>. Each row holds all other inputs constant and shocks one input by ±1 standard deviation. Bars show the resulting % change in fair value.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((d: any) => {
          const max = Math.max(...sorted.map((s: any) => Math.max(Math.abs(s.deltaUp), Math.abs(s.deltaDown))));
          const upWidth = (Math.abs(d.deltaUp) / max) * 45;
          const downWidth = (Math.abs(d.deltaDown) / max) * 45;
          return (
            <div key={d.input} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 80px', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 11.5, color: PAL.ink, fontWeight: 600 }}>
                {d.input}
                <div style={{ fontSize: 10, color: PAL.slate, fontWeight: 500 }}>{d.shockDescription}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative', height: 22 }}>
                <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ height: 18, width: `${downWidth}%`, background: PAL.red, borderRadius: '2px 0 0 2px' }} />
                  <span style={{ fontSize: 10.5, color: PAL.slate, marginLeft: 4, alignSelf: 'center', fontVariantNumeric: 'tabular-nums' }}>{d.deltaDown.toFixed(1)}%</span>
                </div>
                <div style={{ width: 1, background: PAL.ink, height: 22 }} />
                <div style={{ width: '50%', display: 'flex' }}>
                  <span style={{ fontSize: 10.5, color: PAL.slate, marginRight: 4, alignSelf: 'center', fontVariantNumeric: 'tabular-nums' }}>+{d.deltaUp.toFixed(1)}%</span>
                  <div style={{ height: 18, width: `${upWidth}%`, background: PAL.green, borderRadius: '0 2px 2px 0' }} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: PAL.slate, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                ±{((Math.abs(d.deltaUp) + Math.abs(d.deltaDown)) / 2).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Decision Panel
   ───────────────────────────────────────────────────────────────────────────── */
function DecisionPanel({ co, triangle, mos, irr5, irr10, decision, mc }: any) {
  const tone: 'pos' | 'neg' | 'gold' | 'neutral' = mos >= 25 ? 'pos' : mos >= 10 ? 'gold' : mos >= -10 ? 'neutral' : 'neg';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="premium-card" style={{ padding: 24, textAlign: 'center', background: tone === 'pos' ? '#E8F5EE' : tone === 'gold' ? '#FAF1DA' : tone === 'neg' ? '#FBEEF1' : PAL.surface }}>
        <div style={{ fontSize: 11, color: PAL.slate, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>Investment Decision</div>
        <div style={{ fontSize: 38, fontWeight: 800, color: tone === 'pos' ? PAL.green : tone === 'gold' ? PAL.gold : tone === 'neg' ? PAL.red : PAL.ink, margin: '8px 0', letterSpacing: 0.6 }}>
          {decision}
        </div>
        <div style={{ fontSize: 13, color: PAL.slate, lineHeight: 1.6, maxWidth: 720, margin: '0 auto' }}>
          Triangulated fair value of <b style={{ color: PAL.ink }}>{fmtSh(triangle.blended)}</b> implies a margin-of-safety of <b style={{ color: PAL.ink }}>{mos.toFixed(1)}%</b> at CMP <b style={{ color: PAL.ink }}>{fmtSh(co.cmp)}</b>. Implied 5Y IRR is <b style={{ color: PAL.ink }}>{irr5.toFixed(1)}%</b>, 10Y IRR is <b style={{ color: PAL.ink }}>{irr10.toFixed(1)}%</b>. Monte Carlo P(fair&gt;CMP) = <b style={{ color: PAL.ink }}>{(mc.probAboveCmp * 100).toFixed(1)}%</b>.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className="premium-card" style={{ padding: 16 }}>
          <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.gold, fontWeight: 800, marginBottom: 10, letterSpacing: 0.7 }}>BULL-CASE TRIGGERS</div>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 11.5, color: PAL.ink, lineHeight: 1.7 }}>
            {co.bullTriggers.map((t: string, i: number) => <li key={i}>{t}</li>)}
          </ul>
        </div>
        <div className="premium-card" style={{ padding: 16 }}>
          <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.red, fontWeight: 800, marginBottom: 10, letterSpacing: 0.7 }}>BEAR-CASE RISKS</div>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 11.5, color: PAL.ink, lineHeight: 1.7 }}>
            {co.bearRisks.map((t: string, i: number) => <li key={i}>{t}</li>)}
          </ul>
        </div>
        <div className="premium-card" style={{ padding: 16 }}>
          <div className="kpi-eyebrow" style={{ fontSize: 11, color: PAL.blue, fontWeight: 800, marginBottom: 10, letterSpacing: 0.7 }}>WATCH METRICS</div>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 11.5, color: PAL.ink, lineHeight: 1.7 }}>
            {co.watchMetrics.map((t: string, i: number) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

// silence unused linter for clamp helper if not used elsewhere
void clamp;
