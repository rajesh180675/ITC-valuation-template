import { lazy, Suspense, useState, type ReactNode } from 'react';
import { BookOpen, Briefcase, Filter, GitCompare, Globe2, Scale, Zap } from 'lucide-react';
import { SectionHeader } from '@/components/itc/shared';

const PortfolioTab = lazy(() => import('./tabs/PortfolioTab').then(m => ({ default: m.PortfolioTab })));
const ScreenerTab = lazy(() => import('./tabs/ScreenerTab').then(m => ({ default: m.ScreenerTab })));
const CompareTab = lazy(() => import('./tabs/CompareTab').then(m => ({ default: m.CompareTab })));
const AlphaEngineTab = lazy(() => import('./tabs/AlphaEngineTab').then(m => ({ default: m.AlphaEngineTab })));
const MacroOverlayTab = lazy(() => import('./tabs/MacroOverlayTab').then(m => ({ default: m.MacroOverlayTab })));
const EventPlaybookTab = lazy(() => import('./tabs/EventPlaybookTab').then(m => ({ default: m.EventPlaybookTab })));
const CapitalAllocatorTab = lazy(() => import('./tabs/CapitalAllocatorTab').then(m => ({ default: m.CapitalAllocatorTab })));

type TabId = 'portfolio' | 'screener' | 'compare' | 'alpha' | 'macro' | 'options' | 'allocator';

const TABS: Array<{ id: TabId; label: string; icon: ReactNode; subtitle: string }> = [
  { id: 'portfolio', label: 'Portfolio Builder', icon: <Briefcase size={14} />, subtitle: 'Build and analyse a custom basket' },
  { id: 'screener', label: 'Factor Screener', icon: <Filter size={14} />, subtitle: 'Rank the universe on factor scores' },
  { id: 'compare', label: 'Comparison Studio', icon: <GitCompare size={14} />, subtitle: 'Side-by-side company deep dive' },
  { id: 'alpha', label: 'Alpha Engine', icon: <Zap size={14} />, subtitle: 'Composite signals and ratings' },
  { id: 'macro', label: 'Macro Overlay', icon: <Globe2 size={14} />, subtitle: 'Scenario stress-testing' },
  { id: 'options', label: 'Event Playbook', icon: <BookOpen size={14} />, subtitle: 'Budget hedges and options payoffs' },
  { id: 'allocator', label: 'Capital Allocator', icon: <Scale size={14} />, subtitle: 'Risk-parity and mean-variance proxies' },
];

export function RalphSection() {
  const [activeTab, setActiveTab] = useState<TabId>('portfolio');

  return (
    <div className="animate-fadeIn space-y-6">
      <SectionHeader
        title="Ralph Lab"
        subtitle="Research Alpha Lab with Portfolio Hub for multi-company screening, comparison, macro stress, event hedging and allocation."
        icon={<Briefcase size={22} />}
      />
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn flex items-center gap-1.5 px-2 py-2 text-xs ${activeTab === tab.id ? 'active' : 'text-gray-400'}`}
            title={tab.subtitle}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <Suspense fallback={<div className="text-sm text-gray-400 animate-pulse">Loading Ralph tab...</div>}>
        {activeTab === 'portfolio' && <PortfolioTab />}
        {activeTab === 'screener' && <ScreenerTab />}
        {activeTab === 'compare' && <CompareTab />}
        {activeTab === 'alpha' && <AlphaEngineTab />}
        {activeTab === 'macro' && <MacroOverlayTab />}
        {activeTab === 'options' && <EventPlaybookTab />}
        {activeTab === 'allocator' && <CapitalAllocatorTab />}
      </Suspense>
    </div>
  );
}
