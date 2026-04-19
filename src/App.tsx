import { useCallback, useState, type ReactNode } from 'react';
import { BarChart3, TrendingUp, PieChart as PieIcon, Shield, Calculator, Target, Globe, Activity, Menu, X } from 'lucide-react';
import { defaultAssumptions, type ProjectionAssumptions } from './data/itcData';
import { DashboardSection } from '@/components/itc/DashboardSection';
import { FinancialsSection } from '@/components/itc/FinancialsSection';
import { GlobalCompareSection } from '@/components/itc/GlobalCompareSection';
import { PlaybookSection } from '@/components/itc/PlaybookSection';
import { ProjectionsSection } from '@/components/itc/ProjectionsSection';
import { SegmentsSection } from '@/components/itc/SegmentsSection';
import { TaxAnalyzerSection } from '@/components/itc/TaxAnalyzerSection';
import { ValuationSection } from '@/components/itc/ValuationSection';

type Section = 'dashboard' | 'financials' | 'segments' | 'tax' | 'valuation' | 'projections' | 'playbook' | 'global';

interface NavItem {
  id: Section;
  label: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Activity size={18} /> },
  { id: 'financials', label: 'Financials', icon: <BarChart3 size={18} /> },
  { id: 'segments', label: 'Segments', icon: <PieIcon size={18} /> },
  { id: 'tax', label: 'Tax Analyzer', icon: <Shield size={18} /> },
  { id: 'valuation', label: 'Valuation', icon: <Calculator size={18} /> },
  { id: 'projections', label: 'Projections', icon: <TrendingUp size={18} /> },
  { id: 'playbook', label: 'Budget Playbook', icon: <Target size={18} /> },
  { id: 'global', label: 'Global Compare', icon: <Globe size={18} /> },
];

export default function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assumptions, setAssumptions] = useState<ProjectionAssumptions>(defaultAssumptions);

  const renderSection = useCallback(() => {
    switch (section) {
      case 'dashboard':
        return <DashboardSection />;
      case 'financials':
        return <FinancialsSection />;
      case 'segments':
        return <SegmentsSection />;
      case 'tax':
        return <TaxAnalyzerSection />;
      case 'valuation':
        return <ValuationSection assumptions={assumptions} setAssumptions={setAssumptions} />;
      case 'projections':
        return <ProjectionsSection assumptions={assumptions} setAssumptions={setAssumptions} />;
      case 'playbook':
        return <PlaybookSection />;
      case 'global':
        return <GlobalCompareSection />;
      default:
        return null;
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
