import { useMemo, useState } from 'react';
import {
  BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
  LineChart, Line, ReferenceLine, ComposedChart, Area, ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';
import { Brain, Dice5, Compass, GitCompare, Coins, TrendingUp, Layers, Info } from 'lucide-react';
import {
  historicalData,
  sotpData,
  valuationScenarios,
  peerMultiples,
  currentMarketPrice,
  sharesOutstanding,
  type ProjectionAssumptions,
} from '../../data/itcData';
import {
  runScenarioAnalysis,
  runMonteCarloSimulation,
  calculateReverseDCF,
  calculateRelativeValuation,
  computePeerPercentileRanks,
  calculateGordonGrowthDDM,
  calculateTwoStageDDM,
  calculateEvaSeries,
  calculateRoicDecomposition,
  buildBlendedValuationBridge,
  generateProjections,
  generateProjectionDetails,
  calculateDCF,
  calculateDynamicSotpSummary,
} from '../../utils/itcModel';
import { ChartTooltip, MetricCard, SectionHeader, fmt, rupee } from './shared';

interface Props {
  assumptions: ProjectionAssumptions;
}

type TabId = 'scenarios' | 'montecarlo' | 'reverse' | 'peers' | 'ddm' | 'eva' | 'blended';

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'scenarios', label: 'Scenarios', icon: <Brain size={14} /> },
  { id: 'montecarlo', label: 'Monte Carlo', icon: <Dice5 size={14} /> },
  { id: 'reverse', label: 'Reverse DCF', icon: <Compass size={14} /> },
  { id: 'peers', label: 'Relative Valuation', icon: <GitCompare size={14} /> },
  { id: 'ddm', label: 'DDM', icon: <Coins size={14} /> },
  { id: 'eva', label: 'EVA / ROIC', icon: <TrendingUp size={14} /> },
  { id: 'blended', label: 'Blended Bridge', icon: <Layers size={14} /> },
];

export function AdvancedValuationSection({ assumptions }: Props) {
  const [tab, setTab] = useState<TabId>('scenarios');
  const latest = historicalData[historicalData.length - 1]!;

  // Pre-compute heavy analyses once per assumption change
  const scenarioResult = useMemo(
    () => runScenarioAnalysis(assumptions, latest, sotpData, valuationScenarios, currentMarketPrice),
    [assumptions, latest],
  );

  const baseProjections = useMemo(() => generateProjections(assumptions, latest), [assumptions, latest]);
  const baseProjectionDetails = useMemo(() => generateProjectionDetails(assumptions, latest), [assumptions, latest]);
  const baseDcf = useMemo(
    () => calculateDCF(baseProjections, assumptions.wacc, assumptions.terminalGrowth),
    [baseProjections, assumptions.wacc, assumptions.terminalGrowth],
  );
  const dynamicSotp = useMemo(
    () => calculateDynamicSotpSummary(baseProjectionDetails, sotpData, assumptions.conglomerateDiscount),
    [baseProjectionDetails, assumptions.conglomerateDiscount],
  );

  return (
    <div>
      <SectionHeader
        title="Advanced Valuation Lab"
        subtitle="Scenario analysis, Monte Carlo, reverse DCF, peer benchmarking, DDM, EVA and blended-bridge views"
        icon={<Brain size={24} />}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-btn text-xs flex items-center gap-2 ${tab === t.id ? 'active' : ''}`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'scenarios' && <ScenariosTab result={scenarioResult} />}
      {tab === 'montecarlo' && <MonteCarloTab assumptions={assumptions} latest={latest} />}
      {tab === 'reverse' && <ReverseDcfTab assumptions={assumptions} latest={latest} />}
      {tab === 'peers' && <PeersTab />}
      {tab === 'ddm' && <DdmTab />}
      {tab === 'eva' && <EvaTab assumptions={assumptions} />}
      {tab === 'blended' && (
        <BlendedBridgeTab
          assumptions={assumptions}
          dcfPerShare={baseDcf.perShareValue}
          sotpPerShare={dynamicSotp.perShareBase}
        />
      )}
    </div>
  );
}

// --------------------------- Scenarios tab ---------------------------

function ScenariosTab({ result }: { result: ReturnType<typeof runScenarioAnalysis> }) {
  const chartData = result.scenarios.map(s => ({
    name: s.label,
    dcf: s.dcfPerShare,
    sotp: s.sotpPerShare,
    blended: s.blendedPerShare,
    prob: Math.round(s.probability * 100),
    color: s.color,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Expected Value / Share"
          value={rupee(result.expectedValuePerShare)}
          subtitle={`${result.upsideVsMarket >= 0 ? '+' : ''}${result.upsideVsMarket.toFixed(1)}% vs market`}
          trend={result.upsideVsMarket}
          color={result.upsideVsMarket >= 0 ? 'green' : 'red'}
        />
        <MetricCard
          title="Bear Case"
          value={rupee(result.bearPerShare)}
          subtitle="Tax-shock + demand reset"
          color="red"
        />
        <MetricCard
          title="Base Case"
          value={rupee(result.basePerShare)}
          subtitle="Budget 2026 normalised"
          color="blue"
        />
        <MetricCard
          title="Bull Case"
          value={rupee(result.bullPerShare)}
          subtitle="Tax stability + FMCG acceleration"
          color="green"
        />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">Per-Share Value by Scenario</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `₹${v}`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={currentMarketPrice} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Market ₹${currentMarketPrice}`, fill: '#f59e0b', fontSize: 10 }} />
            <Bar dataKey="dcf" name="DCF" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sotp" name="SOTP" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="blended" name="Blended" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">Scenario Detail</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-border">
                <th className="px-3 py-2 text-left">Scenario</th>
                <th className="px-3 py-2 text-right">Prob.</th>
                <th className="px-3 py-2 text-right">DCF ₹</th>
                <th className="px-3 py-2 text-right">SOTP ₹</th>
                <th className="px-3 py-2 text-right">Blended ₹</th>
                <th className="px-3 py-2 text-right">TV Weight</th>
                <th className="px-3 py-2 text-right">Impl. TV Mult</th>
                <th className="px-3 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {result.scenarios.map(s => (
                <tr key={s.id} className="border-b border-border hover:bg-surface-hover">
                  <td className="px-3 py-2">
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: s.color }} />
                    <span className="text-white font-medium">{s.label}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-300">{Math.round(s.probability * 100)}%</td>
                  <td className="px-3 py-2 text-right text-blue-300">{rupee(s.dcfPerShare)}</td>
                  <td className="px-3 py-2 text-right text-emerald-300">{rupee(s.sotpPerShare)}</td>
                  <td className="px-3 py-2 text-right text-white font-semibold">{rupee(s.blendedPerShare)}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{(s.terminalValueWeight * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right text-gray-300">{s.implicitTerminalMultiple.toFixed(1)}x</td>
                  <td className="px-3 py-2 text-gray-400">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --------------------------- Monte Carlo tab ---------------------------

function MonteCarloTab({ assumptions, latest }: { assumptions: ProjectionAssumptions; latest: typeof historicalData[number] }) {
  const [draws, setDraws] = useState(1000);
  const [seed, setSeed] = useState(42);

  const mc = useMemo(
    () => runMonteCarloSimulation(assumptions, latest, { draws, seed }),
    [assumptions, latest, draws, seed],
  );

  const histData = mc.histogram.map(b => ({
    name: b.bucket,
    count: b.count,
    low: b.low,
    high: b.high,
    inRange: currentMarketPrice >= b.low && currentMarketPrice <= b.high,
  }));

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <label className="text-xs text-gray-400 flex items-center gap-2">
          Draws
          <select
            value={draws}
            onChange={e => setDraws(Number(e.target.value))}
            className="bg-[#0a0f1a] border border-border rounded px-2 py-1 text-xs text-white"
          >
            {[500, 1000, 2500, 5000].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-400 flex items-center gap-2">
          Seed
          <input
            type="number"
            value={seed}
            onChange={e => setSeed(Number(e.target.value))}
            className="bg-[#0a0f1a] border border-border rounded px-2 py-1 text-xs text-white w-20"
          />
        </label>
        <div className="ml-auto text-xs text-gray-400 flex items-center gap-1">
          <Info size={12} /> Triangular distributions over revenue growth, margins, WACC and terminal growth
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard title="Mean" value={rupee(mc.mean)} subtitle={`σ = ₹${mc.stdDev.toFixed(1)}`} color="blue" />
        <MetricCard title="Median" value={rupee(mc.median)} subtitle={`${draws.toLocaleString()} draws`} color="purple" />
        <MetricCard title="5th %ile" value={rupee(mc.p5)} subtitle="Downside tail" color="red" />
        <MetricCard title="95th %ile" value={rupee(mc.p95)} subtitle="Upside tail" color="green" />
        <MetricCard
          title="P(Fair > Market)"
          value={`${(mc.probUpside * 100).toFixed(1)}%`}
          subtitle={`Market ${rupee(currentMarketPrice)}`}
          color={mc.probUpside > 0.5 ? 'green' : 'red'}
          trend={mc.probUpside - 0.5}
        />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">Probability Distribution of Fair Value (₹ / share)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={histData}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
            <YAxis stroke="#9ca3af" fontSize={10} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine x={findBucketFor(histData, currentMarketPrice)} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Market ₹${currentMarketPrice}`, fill: '#f59e0b', fontSize: 10, position: 'top' }} />
            <ReferenceLine x={findBucketFor(histData, mc.median)} stroke="#a855f7" strokeDasharray="2 2" label={{ value: 'Median', fill: '#a855f7', fontSize: 10, position: 'top' }} />
            <Bar dataKey="count" name="Draws" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-4 text-xs text-gray-400 flex gap-2">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <p>
          The simulation stress-tests the DCF over {draws.toLocaleString()} triangularly-distributed draws of the key value drivers.
          Tail risk (P5 {rupee(mc.p5)}) captures a combination of cigarette volume decline, FMCG margin stall and WACC expansion.
          The probability of fair-value exceeding market is a useful complement to point-estimate valuation.
        </p>
      </div>
    </div>
  );
}

function findBucketFor(histData: Array<{ name: string; low: number; high: number }>, value: number): string | undefined {
  return histData.find(b => value >= b.low && value <= b.high)?.name;
}

// --------------------------- Reverse DCF tab ---------------------------

function ReverseDcfTab({ assumptions, latest }: { assumptions: ProjectionAssumptions; latest: typeof historicalData[number] }) {
  const [price, setPrice] = useState(currentMarketPrice);
  const result = useMemo(
    () => calculateReverseDCF(price, assumptions, latest),
    [price, assumptions, latest],
  );

  // Plot DCF vs assumed cigarette growth to visualise implied growth locus
  const sensitivityData = useMemo(() => {
    const points: Array<{ growth: number; perShare: number }> = [];
    for (let g = -5; g <= 12; g += 0.5) {
      const proj = generateProjections({ ...assumptions, cigaretteRevenueGrowth: g }, latest);
      const dcf = calculateDCF(proj, assumptions.wacc, assumptions.terminalGrowth);
      points.push({ growth: g, perShare: dcf.perShareValue });
    }
    return points;
  }, [assumptions, latest]);

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <label className="text-xs text-gray-400 flex items-center gap-3 flex-1">
          Target Price (₹)
          <input
            type="range"
            min={250}
            max={650}
            step={5}
            value={price}
            onChange={e => setPrice(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-white font-bold w-16 text-right">{rupee(price)}</span>
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Implied Cig. Growth"
          value={`${result.impliedCigaretteGrowth.toFixed(2)}%`}
          subtitle={`Base ${result.baseGrowthUsed.toFixed(1)}%`}
          color={result.impliedCigaretteGrowth > assumptions.cigaretteRevenueGrowth ? 'red' : 'green'}
        />
        <MetricCard
          title="Solver Iterations"
          value={result.iterations.toString()}
          subtitle={result.converged ? 'Converged' : 'Boundary'}
          color={result.converged ? 'green' : 'gold'}
        />
        <MetricCard
          title="DCF at Implied"
          value={rupee(result.dcfAtImplied)}
          subtitle={`Target ${rupee(price)}`}
          color="blue"
        />
        <MetricCard
          title="Gap vs Base"
          value={`${(result.impliedCigaretteGrowth - result.baseGrowthUsed).toFixed(2)} pp`}
          subtitle="Positive = market demands higher growth"
          color="purple"
        />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-2">{result.description}</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={sensitivityData}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="growth" stroke="#9ca3af" fontSize={11} tickFormatter={v => `${v}%`} label={{ value: 'Cigarette Rev Growth CAGR', fill: '#9ca3af', fontSize: 11, position: 'insideBottom', offset: -3 }} />
            <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `₹${v}`} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={price} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Target ${rupee(price)}`, fill: '#f59e0b', fontSize: 10 }} />
            <ReferenceLine x={result.impliedCigaretteGrowth} stroke="#a855f7" strokeDasharray="2 2" label={{ value: `Implied ${result.impliedCigaretteGrowth.toFixed(1)}%`, fill: '#a855f7', fontSize: 10 }} />
            <Line type="monotone" dataKey="perShare" name="DCF / share" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --------------------------- Peers tab ---------------------------

function PeersTab() {
  const latest = historicalData[historicalData.length - 1]!;
  const [method, setMethod] = useState<'EV/EBITDA' | 'P/E'>('EV/EBITDA');

  const peerVal = useMemo(
    () => calculateRelativeValuation(latest, peerMultiples, method),
    [latest, method],
  );

  const percentiles = useMemo(() => computePeerPercentileRanks(peerMultiples), []);

  const scatterData = peerMultiples.map(p => ({
    name: p.name,
    evEbitda: p.evEbitda,
    peForward: p.peForward,
    roic: p.roic,
    isItc: p.ticker === 'ITC',
    category: p.category,
  }));

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <label className="text-xs text-gray-400 flex items-center gap-2">
          Method
          <select
            value={method}
            onChange={e => setMethod(e.target.value as 'EV/EBITDA' | 'P/E')}
            className="bg-[#0a0f1a] border border-border rounded px-2 py-1 text-xs text-white"
          >
            <option value="EV/EBITDA">EV/EBITDA</option>
            <option value="P/E">P/E Forward</option>
          </select>
        </label>
        <div className="ml-auto text-xs text-gray-400">
          Peers filtered: Indian FMCG + global tobacco (ITC excluded from stats)
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          title="Peer Median"
          value={`${peerVal.peerMedian.toFixed(1)}x`}
          subtitle={`Range ${peerVal.peerMin.toFixed(1)}-${peerVal.peerMax.toFixed(1)}x`}
          color="blue"
        />
        <MetricCard
          title="Applied Multiple"
          value={`${peerVal.appliedMultiple.toFixed(1)}x`}
          subtitle="Median weighted"
          color="purple"
        />
        <MetricCard
          title="Implied EV"
          value={fmt(peerVal.impliedEnterpriseValue)}
          subtitle={`Equity ${fmt(peerVal.impliedEquityValue)}`}
          color="green"
        />
        <MetricCard
          title="Per Share"
          value={rupee(peerVal.perShareValue)}
          subtitle={`${sharesOutstanding} Cr shares`}
          color="gold"
        />
        <MetricCard
          title="ITC Premium/Disc"
          value={`${peerVal.discountVsPeers >= 0 ? '+' : ''}${peerVal.discountVsPeers.toFixed(1)}%`}
          subtitle="vs peer set"
          color={peerVal.discountVsPeers < 0 ? 'red' : 'green'}
          trend={peerVal.discountVsPeers}
        />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">Peer Quality vs Valuation</h3>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="evEbitda"
              name="EV/EBITDA"
              stroke="#9ca3af"
              fontSize={11}
              label={{ value: 'EV/EBITDA (x)', fill: '#9ca3af', fontSize: 11, position: 'insideBottom', offset: -3 }}
            />
            <YAxis
              type="number"
              dataKey="peForward"
              name="P/E Fwd"
              stroke="#9ca3af"
              fontSize={11}
              label={{ value: 'P/E Forward (x)', fill: '#9ca3af', fontSize: 11, angle: -90, position: 'insideLeft' }}
            />
            <ZAxis type="number" dataKey="roic" range={[60, 400]} name="ROIC" />
            <Tooltip
              content={({ active, payload }: any) =>
                active && payload?.length ? (
                  <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-sm">
                    <p className="text-white font-bold mb-1">{payload[0].payload.name}</p>
                    <p className="text-gray-300 text-xs">Category: {payload[0].payload.category}</p>
                    <p className="text-blue-300 text-xs">EV/EBITDA: {payload[0].payload.evEbitda.toFixed(1)}x</p>
                    <p className="text-purple-300 text-xs">P/E Fwd: {payload[0].payload.peForward.toFixed(1)}x</p>
                    <p className="text-emerald-300 text-xs">ROIC: {payload[0].payload.roic.toFixed(1)}%</p>
                  </div>
                ) : null
              }
            />
            <Scatter
              name="Peers"
              data={scatterData.filter(p => !p.isItc)}
              fill="#3b82f6"
            />
            <Scatter name="ITC" data={scatterData.filter(p => p.isItc)} fill="#f59e0b" shape="star" />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 mt-2">Bubble size = ROIC. ITC highlighted in gold. Multi-dimensional view: valuation on axes, quality on bubble size.</p>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">Percentile Ranks (higher = more attractive)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-border">
                <th className="px-3 py-2 text-left">Ticker</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-right">EV/EBITDA rank</th>
                <th className="px-3 py-2 text-right">P/E rank</th>
                <th className="px-3 py-2 text-right">Div Yld rank</th>
                <th className="px-3 py-2 text-right">ROIC rank</th>
                <th className="px-3 py-2 text-right">Composite</th>
              </tr>
            </thead>
            <tbody>
              {percentiles.map(p => {
                const isItc = p.ticker === 'ITC';
                return (
                  <tr key={p.ticker} className={`border-b border-border ${isItc ? 'bg-amber-500/5' : 'hover:bg-surface-hover'}`}>
                    <td className={`px-3 py-2 font-medium ${isItc ? 'text-amber-300' : 'text-white'}`}>{p.ticker} {isItc && '★'}</td>
                    <td className="px-3 py-2 text-gray-400">{p.category}</td>
                    <RankCell v={p.evEbitdaRank} />
                    <RankCell v={p.peRank} />
                    <RankCell v={p.dividendYieldRank} />
                    <RankCell v={p.roicRank} />
                    <RankCell v={p.compositeRank} bold />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RankCell({ v, bold }: { v: number; bold?: boolean }) {
  const color = v >= 70 ? 'text-emerald-400' : v >= 40 ? 'text-blue-300' : 'text-red-400';
  return <td className={`px-3 py-2 text-right ${color} ${bold ? 'font-bold' : ''}`}>{v}</td>;
}

// --------------------------- DDM tab ---------------------------

function DdmTab() {
  const latest = historicalData[historicalData.length - 1]!;
  const [requiredReturn, setRequiredReturn] = useState(11);
  const [terminalGrowth, setTerminalGrowth] = useState(4);
  const [nearTermGrowth, setNearTermGrowth] = useState(7);
  const [nearTermYears, setNearTermYears] = useState(5);

  const gordon = useMemo(
    () => calculateGordonGrowthDDM(latest, requiredReturn, terminalGrowth),
    [latest, requiredReturn, terminalGrowth],
  );
  const twoStage = useMemo(
    () => calculateTwoStageDDM(latest, nearTermGrowth, nearTermYears, terminalGrowth, requiredReturn),
    [latest, nearTermGrowth, nearTermYears, terminalGrowth, requiredReturn],
  );

  // Sensitivity grid: required return × terminal growth
  const sensitivity = useMemo(() => {
    const rows: Array<{ g: number; [key: string]: number }> = [];
    for (let g = 2; g <= 6; g += 0.5) {
      const row: { g: number; [key: string]: number } = { g };
      for (let r = 9; r <= 13; r += 0.5) {
        const v = calculateGordonGrowthDDM(latest, r, g).perShareValue;
        row[`r${r.toFixed(1)}`] = v;
      }
      rows.push(row);
    }
    return rows;
  }, [latest]);

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Slider label="Required Return (Ke)" value={requiredReturn} min={8} max={15} step={0.5} suffix="%" onChange={setRequiredReturn} />
        <Slider label="Terminal Growth" value={terminalGrowth} min={1} max={7} step={0.25} suffix="%" onChange={setTerminalGrowth} />
        <Slider label="Near-term Growth" value={nearTermGrowth} min={0} max={15} step={0.5} suffix="%" onChange={setNearTermGrowth} />
        <Slider label="Near-term Years" value={nearTermYears} min={2} max={10} step={1} suffix="" onChange={setNearTermYears} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Current DPS" value={rupee(latest.dps)} subtitle={`Yield ${((latest.dps / currentMarketPrice) * 100).toFixed(2)}%`} color="gold" />
        <MetricCard title="Gordon Value" value={rupee(gordon.perShareValue)} subtitle={`Payout ${gordon.payoutRatio.toFixed(0)}%`} color="blue" />
        <MetricCard title="Two-Stage Value" value={rupee(twoStage.perShareValue)} subtitle={`${nearTermYears}yr @ ${nearTermGrowth}%`} color="green" />
        <MetricCard
          title="Dividend Sustainability"
          value={`${twoStage.sustainabilityScore}/100`}
          subtitle={twoStage.sustainabilityScore > 70 ? 'Safe' : twoStage.sustainabilityScore > 40 ? 'Moderate' : 'Stretched'}
          color={twoStage.sustainabilityScore > 70 ? 'green' : twoStage.sustainabilityScore > 40 ? 'gold' : 'red'}
        />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">Gordon Sensitivity (₹ / share): growth vs required return</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-border">
                <th className="px-2 py-2 text-left sticky left-0 bg-[#0a0f1a]">g \\ Ke</th>
                {Array.from({ length: 9 }, (_, i) => 9 + i * 0.5).map(r => (
                  <th key={r} className="px-2 py-2 text-right">{r.toFixed(1)}%</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.map(row => (
                <tr key={row.g} className="border-b border-border">
                  <td className="px-2 py-2 font-medium text-white sticky left-0 bg-[#0a0f1a]">{row.g.toFixed(1)}%</td>
                  {Array.from({ length: 9 }, (_, i) => 9 + i * 0.5).map(r => {
                    const v = row[`r${r.toFixed(1)}`] ?? 0;
                    const upside = ((v - currentMarketPrice) / currentMarketPrice) * 100;
                    const bg = upside > 20 ? 'bg-emerald-500/25 text-emerald-200' :
                      upside > 0 ? 'bg-emerald-500/10 text-emerald-300' :
                      upside > -20 ? 'bg-red-500/10 text-red-300' :
                      'bg-red-500/25 text-red-200';
                    return (
                      <td key={r} className={`px-2 py-2 text-right ${bg}`}>
                        {v > 0 && isFinite(v) ? `₹${v.toFixed(0)}` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">Green cells are above current market ({rupee(currentMarketPrice)}). Cells with Ke ≤ g are undefined (—).</p>
      </div>

      <div className="glass-card p-4 text-xs text-gray-400">
        <p className="text-gray-200 font-medium mb-1">{twoStage.notes}</p>
        <p>
          ITC has historically returned {'>'}80% of earnings via dividend/buyback. Gordon captures the steady-state,
          while the two-stage model accommodates the transitional period while FMCG/Hotels separation and Budget 2026 cigarette tax normalise.
        </p>
      </div>
    </div>
  );
}

// --------------------------- EVA tab ---------------------------

function EvaTab({ assumptions }: { assumptions: ProjectionAssumptions }) {
  const latest = historicalData[historicalData.length - 1]!;
  const details = useMemo(() => generateProjectionDetails(assumptions, latest), [assumptions, latest]);
  const evaSeries = useMemo(() => calculateEvaSeries(details, assumptions.wacc), [details, assumptions.wacc]);
  const roicDecomp = useMemo(() => calculateRoicDecomposition(details), [details]);

  const avgSpread = evaSeries.length
    ? evaSeries.reduce((s, e) => s + e.roicSpread, 0) / evaSeries.length
    : 0;
  const totalEva = evaSeries.reduce((s, e) => s + e.eva, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Avg ROIC-WACC"
          value={`${avgSpread.toFixed(1)} pp`}
          subtitle="Value-creation spread"
          color={avgSpread > 5 ? 'green' : avgSpread > 0 ? 'blue' : 'red'}
          trend={avgSpread}
        />
        <MetricCard
          title="Cumulative EVA"
          value={fmt(totalEva)}
          subtitle={`Across ${evaSeries.length} years`}
          color="green"
        />
        <MetricCard
          title="Avg ROIC"
          value={`${(evaSeries.reduce((s, e) => s + e.roic, 0) / Math.max(evaSeries.length, 1)).toFixed(1)}%`}
          subtitle={`WACC ${assumptions.wacc}%`}
          color="purple"
        />
        <MetricCard
          title="Terminal EVA"
          value={fmt(evaSeries[evaSeries.length - 1]?.eva ?? 0)}
          subtitle={evaSeries[evaSeries.length - 1]?.fy ?? '—'}
          color="gold"
        />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">Economic Value Added Trajectory</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={evaSeries}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="fy" stroke="#9ca3af" fontSize={11} />
            <YAxis yAxisId="left" stroke="#9ca3af" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} tickFormatter={v => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area yAxisId="left" type="monotone" dataKey="nopat" name="NOPAT (₹ Cr)" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeWidth={2} />
            <Area yAxisId="left" type="monotone" dataKey="capitalCharge" name="Capital Charge (₹ Cr)" fill="#ef4444" fillOpacity={0.2} stroke="#ef4444" strokeWidth={2} />
            <Bar yAxisId="left" dataKey="eva" name="EVA (₹ Cr)" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="roicSpread" name="ROIC-WACC (pp)" stroke="#f59e0b" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">DuPont ROIC Decomposition</h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={roicDecomp}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="year" stroke="#9ca3af" fontSize={11} />
            <YAxis yAxisId="left" stroke="#9ca3af" fontSize={11} tickFormatter={v => `${v}%`} />
            <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} tickFormatter={v => `${v.toFixed(2)}x`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="nopatMargin" name="NOPAT Margin" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="capitalTurnover" name="Capital Turnover" stroke="#f59e0b" strokeWidth={2} />
            <Line yAxisId="left" type="monotone" dataKey="roic" name="ROIC" stroke="#10b981" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --------------------------- Blended Bridge tab ---------------------------

function BlendedBridgeTab({
  assumptions,
  dcfPerShare,
  sotpPerShare,
}: {
  assumptions: ProjectionAssumptions;
  dcfPerShare: number;
  sotpPerShare: number;
}) {
  const latest = historicalData[historicalData.length - 1]!;

  const evEbitdaRel = useMemo(
    () => calculateRelativeValuation(latest, peerMultiples, 'EV/EBITDA'),
    [latest],
  );
  const peRel = useMemo(
    () => calculateRelativeValuation(latest, peerMultiples, 'P/E'),
    [latest],
  );
  const ddm = useMemo(
    () => calculateTwoStageDDM(latest, 7, 5, 4, assumptions.wacc),
    [latest, assumptions.wacc],
  );

  const bridge = useMemo(
    () => buildBlendedValuationBridge(
      dcfPerShare,
      sotpPerShare,
      evEbitdaRel.perShareValue,
      peRel.perShareValue,
      ddm.perShareValue,
      currentMarketPrice,
    ),
    [dcfPerShare, sotpPerShare, evEbitdaRel.perShareValue, peRel.perShareValue, ddm.perShareValue],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Blended Target"
          value={rupee(bridge.blendedPerShare)}
          subtitle={`Market ${rupee(bridge.marketPrice)}`}
          color="purple"
        />
        <MetricCard
          title="Upside / Downside"
          value={`${bridge.upside >= 0 ? '+' : ''}${bridge.upside.toFixed(1)}%`}
          subtitle="vs spot price"
          color={bridge.upside >= 0 ? 'green' : 'red'}
          trend={bridge.upside}
        />
        <MetricCard
          title="Range (min-max)"
          value={`₹${Math.min(...bridge.methods.map(m => m.perShareValue)).toFixed(0)}-${Math.max(...bridge.methods.map(m => m.perShareValue)).toFixed(0)}`}
          subtitle="All 5 methodologies"
          color="blue"
        />
        <MetricCard
          title="Methodology Count"
          value={bridge.methods.length.toString()}
          subtitle="DCF, SOTP, Peers ×2, DDM"
          color="gold"
        />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">Valuation Bridge: Methodology × Per-Share Value</h3>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={bridge.methods.map(m => ({ ...m, weightPct: Math.round(m.weight * 100) }))} layout="vertical">
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis type="number" stroke="#9ca3af" fontSize={11} tickFormatter={v => `₹${v}`} />
            <YAxis type="category" dataKey="label" stroke="#9ca3af" fontSize={11} width={140} />
            <Tooltip
              content={({ active, payload }: any) =>
                active && payload?.length ? (
                  <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-sm">
                    <p className="text-white font-medium">{payload[0].payload.label}</p>
                    <p className="text-blue-300 text-xs">Value: {rupee(payload[0].payload.perShareValue)}</p>
                    <p className="text-purple-300 text-xs">Weight: {payload[0].payload.weightPct}%</p>
                  </div>
                ) : null
              }
            />
            <ReferenceLine x={bridge.blendedPerShare} stroke="#a855f7" strokeDasharray="4 4" label={{ value: `Blended ₹${bridge.blendedPerShare.toFixed(0)}`, fill: '#a855f7', fontSize: 11, position: 'insideTopRight' }} />
            <ReferenceLine x={bridge.marketPrice} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Market ₹${bridge.marketPrice}`, fill: '#f59e0b', fontSize: 11, position: 'insideBottomRight' }} />
            <Bar dataKey="perShareValue" name="Per-share value" radius={[0, 4, 4, 0]}>
              {bridge.methods.map((m, i) => (
                <Cell key={i} fill={m.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">Weighting Rationale</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-border">
                <th className="px-3 py-2 text-left">Methodology</th>
                <th className="px-3 py-2 text-right">Per-share</th>
                <th className="px-3 py-2 text-right">Weight</th>
                <th className="px-3 py-2 text-right">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {bridge.methods.map(m => (
                <tr key={m.label} className="border-b border-border">
                  <td className="px-3 py-2">
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: m.color }} />
                    <span className="text-white">{m.label}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-200">{rupee(m.perShareValue)}</td>
                  <td className="px-3 py-2 text-right text-gray-200">{(m.weight * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2 text-right text-white font-medium">{rupee(m.perShareValue * m.weight)}</td>
                </tr>
              ))}
              <tr className="bg-purple-500/10 font-bold">
                <td className="px-3 py-2 text-purple-200">Blended</td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-right text-purple-200">100%</td>
                <td className="px-3 py-2 text-right text-purple-200">{rupee(bridge.blendedPerShare)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Weights favour DCF (35%) for its forward-looking cash-flow discipline and SOTP (25%) for explicit segment
          valuation. Relative valuation (combined 25%) grounds the analysis to tradeable comps, while DDM (15%) anchors
          to ITC&apos;s dividend-yield identity.
        </p>
      </div>
    </div>
  );
}

// --------------------------- Slider ---------------------------

function Slider({
  label, value, min, max, step, suffix, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="text-white font-medium">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
