import { COMPANY_PROFILES } from '@/data/companies';
import { MACRO_SENSITIVITIES } from '@/data/ralphData';

export interface MacroShockResult {
  companyId: string;
  companyName: string;
  sector: string;
  epsImpactPct: number;
  direction: 'positive' | 'negative' | 'neutral';
  magnitude: 'high' | 'medium' | 'low';
}

export interface MacroScenario {
  id: string;
  label: string;
  description: string;
  shocks: Record<string, number>;
  color: string;
}

export const MACRO_SCENARIOS: MacroScenario[] = [
  { id: 'soft_landing', label: 'Soft Landing', description: 'RBI cuts, crude moderate, benign budget.', shocks: { repo_rate: -0.5, cpi: -0.3, usdinr: -1, crude_oil: -0.5, nccd_hike: 0, gdp_growth: 0.2 }, color: '#10b981' },
  { id: 'harsh_budget', label: 'Harsh Budget', description: 'NCCD shock, firmer crude, no rate relief.', shocks: { repo_rate: 0, cpi: 0.2, usdinr: 1, crude_oil: 0.5, nccd_hike: 16, gdp_growth: 0 }, color: '#ef4444' },
  { id: 'global_risk_off', label: 'Global Risk-Off', description: 'Oil spike, INR weakness and GDP pressure.', shocks: { repo_rate: 0.25, cpi: 0.5, usdinr: 5, crude_oil: 2, nccd_hike: 0, gdp_growth: -0.5 }, color: '#f59e0b' },
  { id: 'china_slowdown', label: 'China Slowdown', description: 'Metals pressure, softer crude, weaker global demand.', shocks: { repo_rate: -0.25, cpi: -0.5, usdinr: 2, crude_oil: -1.5, nccd_hike: 0, gdp_growth: -0.5 }, color: '#8b5cf6' },
  { id: 'capex_supercycle', label: 'Capex Super-cycle', description: 'Infra push, GDP acceleration, benign budget.', shocks: { repo_rate: -0.25, cpi: -0.2, usdinr: -2, crude_oil: -0.5, nccd_hike: 0, gdp_growth: 1 }, color: '#3b82f6' },
];

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function runMacroScenario(scenario: MacroScenario): MacroShockResult[] {
  return COMPANY_PROFILES.map(profile => {
    const sensitivity = MACRO_SENSITIVITIES.find(s => s.companyId === profile.id);
    let totalImpact = 0;
    if (sensitivity) {
      for (const [factorId, shock] of Object.entries(scenario.shocks)) {
        totalImpact += (Number(sensitivity[factorId as keyof typeof sensitivity]) || 0) * shock;
      }
    }
    const epsImpactPct = round(totalImpact);
    const abs = Math.abs(epsImpactPct);
    return {
      companyId: profile.id,
      companyName: profile.name,
      sector: profile.sector,
      epsImpactPct,
      direction: epsImpactPct > 0.5 ? 'positive' : epsImpactPct < -0.5 ? 'negative' : 'neutral',
      magnitude: abs > 5 ? 'high' : abs > 2 ? 'medium' : 'low',
    };
  }).sort((a, b) => b.epsImpactPct - a.epsImpactPct);
}

export function sectorRotationMatrix(scenario: MacroScenario): Record<string, number> {
  const grouped: Record<string, { total: number; count: number }> = {};
  for (const result of runMacroScenario(scenario)) {
    grouped[result.sector] ??= { total: 0, count: 0 };
    grouped[result.sector].total += result.epsImpactPct;
    grouped[result.sector].count += 1;
  }
  return Object.fromEntries(Object.entries(grouped).map(([sector, item]) => [sector, round(item.total / item.count)]));
}
