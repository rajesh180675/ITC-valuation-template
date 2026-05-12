import { useState, useCallback, lazy, Suspense } from 'react';
import {
  BarChart3, TrendingUp, PieChart as PieIcon, Shield, Calculator,
  Target, Globe, BookOpen, Activity,
  Menu, X, Layers, Zap, Brain, Building2, Briefcase, Database,
  Cpu, Coins, Scale, Clock, Grid3x3
  } from 'lucide-react';
import {
  defaultAssumptions,
  type ProjectionAssumptions
} from './data/itcData';
import { DashboardSection } from './components/itc/DashboardSection';
import { FinancialsSection } from './components/itc/FinancialsSection';
import { SegmentsSection } from './components/itc/SegmentsSection';
import { TaxAnalyzerSection } from './components/itc/TaxAnalyzerSection';
import { SensexUniverseSection } from './components/sensex/SensexUniverseSection';
import { AnnualReportsSection } from './components/sensex/AnnualReportsSection';
import { Nifty250UniverseSection } from './components/sensex/Nifty250UniverseSection';
import { Nifty750UniverseSection } from './components/sensex/Nifty750UniverseSection';
const NiftyIndexDataSection = lazy(() =>
  import('./components/sensex/NiftyIndexDataSection').then(m => ({ default: m.NiftyIndexDataSection }))
);
import { AdvancedValuationSection } from './components/itc/AdvancedValuationSection';
import { CompanyUniverseSection } from './components/companies/CompanyUniverseSection';
import { RalphSection } from './components/ralph/RalphSection';
import { IdeaLabSection } from './components/itc/IdeaLabSection';
import { DeepDive55YSection } from './components/deepdive/DeepDive55YSection';
import { IndianITDeepDiveSection } from './components/itservices/IndianITDeepDiveSection';
import { DividendSection } from './components/itc/DividendSection';
import { CapitalAllocationSection } from './components/itc/CapitalAllocationSection';
import { WorkingCapitalSection } from './components/itc/WorkingCapitalSection';
import { BusinessModelSection } from './components/itc/BusinessModelSection';
import { StockPerfSection } from './components/itc/StockPerfSection';
import { ValuationSection } from './components/itc/ValuationSection';
import { ProjectionsSection } from './components/itc/ProjectionsSection';
import { PlaybookSection } from './components/itc/PlaybookSection';
import { GlobalCompareSection } from './components/itc/GlobalCompareSection';

// ─── Types ───────────────────────────────────────────────────────────────────
type Section = 'dashboard' | 'financials' | 'segments' | 'tax' | 'valuation' | 'advanced' | 'ideaLab' | 'universe' | 'projections' | 'playbook' | 'global' | 'sensex' | 'nifty250' | 'nifty750data' | 'nifty750' | 'ralph' | 'deepdive55y' | 'itDeepDive' | 'stockPerf' | 'businessModel' | 'dividend' | 'capitalAllocation' | 'workingCapital';

interface NavItem { id: Section; label: string; icon: React.ReactNode; }

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Activity size={18} /> },
  { id: 'stockPerf', label: 'Stock Performance', icon: <TrendingUp size={18} /> },
  { id: 'financials', label: 'Financials', icon: <BarChart3 size={18} /> },
  { id: 'segments', label: 'Segments', icon: <PieIcon size={18} /> },
  { id: 'businessModel', label: 'Business Model', icon: <Grid3x3 size={18} /> },
  { id: 'tax', label: 'Tax Analyzer', icon: <Shield size={18} /> },
  { id: 'dividend', label: 'Dividends', icon: <Coins size={18} /> },
  { id: 'capitalAllocation', label: 'Capital Allocation', icon: <Scale size={18} /> },
  { id: 'workingCapital', label: 'Working Capital', icon: <Clock size={18} /> },
  { id: 'valuation', label: 'Valuation', icon: <Calculator size={18} /> },
  { id: 'advanced', label: 'Advanced Lab', icon: <Brain size={18} /> },
  { id: 'ideaLab', label: 'Idea Lab', icon: <Zap size={18} /> },
  { id: 'universe', label: 'Company Universe', icon: <Building2 size={18} /> },
  { id: 'projections', label: 'Projections', icon: <TrendingUp size={18} /> },
  { id: 'playbook', label: 'Budget Playbook', icon: <Target size={18} /> },
  { id: 'global', label: 'Global Compare', icon: <Globe size={18} /> },
  { id: 'annualReports', label: 'Annual Reports', icon: <BookOpen size={18} /> },
  { id: 'sensex', label: 'Sensex Universe', icon: <Layers size={18} /> },
  { id: 'nifty250', label: 'Nifty 250 Universe', icon: <Layers size={18} /> },
  { id: 'nifty750data', label: 'Nifty 750 Data Hub', icon: <Database size={18} /> },
  { id: 'nifty750', label: 'Nifty 750 Universe', icon: <Layers size={18} /> },
  { id: 'ralph', label: 'Ralph Lab', icon: <Briefcase size={18} /> },
  { id: 'deepdive55y', label: '55Y Deep Dive', icon: <BookOpen size={18} /> },
  { id: 'itDeepDive', label: 'IT Services Lab', icon: <Cpu size={18} /> },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assumptions, setAssumptions] = useState<ProjectionAssumptions>(defaultAssumptions);

  const renderSection = useCallback(() => {
    switch (section) {
      case 'dashboard': return <DashboardSection />;
      case 'stockPerf': return <StockPerfSection />;
      case 'financials': return <FinancialsSection />;
      case 'segments': return <SegmentsSection />;
      case 'businessModel': return <BusinessModelSection />;
      case 'tax': return <TaxAnalyzerSection />;
      case 'dividend': return <DividendSection />;
      case 'capitalAllocation': return <CapitalAllocationSection />;
      case 'workingCapital': return <WorkingCapitalSection />;
      case 'valuation': return <ValuationSection assumptions={assumptions} setAssumptions={setAssumptions} />;
      case 'advanced': return <AdvancedValuationSection assumptions={assumptions} />;
      case 'ideaLab': return <IdeaLabSection assumptions={assumptions} />;
      case 'universe': return <CompanyUniverseSection />;
      case 'projections': return <ProjectionsSection assumptions={assumptions} setAssumptions={setAssumptions} />;
      case 'playbook': return <PlaybookSection />;
      case 'global': return <GlobalCompareSection />;
      case 'annualReports': return <AnnualReportsSection />;
      case 'sensex': return <SensexUniverseSection />;
      case 'nifty250': return <Nifty250UniverseSection />;
      case 'nifty750': return <Nifty750UniverseSection />;
      case 'nifty750data': return <Suspense fallback={<div className="glass-card p-8 text-center text-gray-400 animate-pulse">Loading Nifty 750 data…</div>}><NiftyIndexDataSection /></Suspense>;
      case 'ralph': return <RalphSection />;
      case 'deepdive55y': return <DeepDive55YSection />;
      case 'itDeepDive': return <IndianITDeepDiveSection />;
    }
  }, [section, assumptions]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0f1a]">
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-300 bg-surface border-r border-border flex flex-col shrink-0`}>
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0">
            I
          </div>
          {sidebarOpen && (
            <div className="animate-fadeIn">
              <h1 className="text-sm font-bold text-white leading-tight">ITC Limited</h1>
              <p className="text-[10px] text-gray-400">Data & Valuation Tool</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`sidebar-link w-full flex items-center gap-3 px-4 py-3 text-sm ${section === item.id ? 'active' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {item.icon}
              {sidebarOpen && <span className="animate-fadeIn">{item.label}</span>}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 border-t border-border text-gray-400 hover:text-white transition-colors flex items-center justify-center"
        >
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {renderSection()}
        <div className="glass-card mt-6 p-4 text-xs text-gray-400">
          <p className="text-gray-200 font-medium mb-1">Data Guardrails</p>
          <p>
            Historical figures and valuation assumptions are embedded in the repository for a reproducible,
            offline analytical workbook. Review the source data and methodology before using outputs as an
            investment decision.
          </p>
        </div>
      </main>
    </div>
  );
}
