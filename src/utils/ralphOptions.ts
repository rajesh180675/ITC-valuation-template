import { OPTIONS_STRATEGIES, type OptionLeg, type OptionsStrategy } from '@/data/ralphData';

export interface PayoffPoint {
  spotPct: number;
  profitLossPct: number;
  region: 'loss' | 'profit' | 'breakeven';
}

export interface StrategyPayoff {
  strategy: OptionsStrategy;
  payoffCurve: PayoffPoint[];
  netPremiumPct: number;
  maxProfitPct: number;
  maxLossPct: number;
  breakevenLow: number | null;
  breakevenHigh: number | null;
  currentSpot: number;
}

function legPayoff(leg: OptionLeg, spotPct: number): number {
  const sign = leg.position === 'long' ? 1 : -1;
  const intrinsic = leg.type === 'call' ? Math.max(spotPct - leg.strike, 0) : Math.max(leg.strike - spotPct, 0);
  const premium = leg.position === 'long' ? -leg.premium : leg.premium;
  return (sign * intrinsic + premium) * leg.qty;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computePayoff(strategy: OptionsStrategy, currentSpot: number): StrategyPayoff {
  const payoffCurve: PayoffPoint[] = Array.from({ length: 81 }, (_, i) => {
    const spotPct = 70 + i;
    const profitLossPct = round(strategy.legs.reduce((sum, leg) => sum + legPayoff(leg, spotPct), 0));
    return {
      spotPct,
      profitLossPct,
      region: profitLossPct > 0.05 ? 'profit' : profitLossPct < -0.05 ? 'loss' : 'breakeven',
    };
  });

  const netPremiumPct = round(strategy.legs.reduce((sum, leg) => sum + (leg.position === 'long' ? leg.premium : -leg.premium) * leg.qty, 0));
  const values = payoffCurve.map(point => point.profitLossPct);
  let breakevenLow: number | null = null;
  let breakevenHigh: number | null = null;
  for (let i = 1; i < payoffCurve.length; i += 1) {
    const prev = payoffCurve[i - 1]!.profitLossPct;
    const curr = payoffCurve[i]!.profitLossPct;
    if (prev < 0 && curr >= 0 && breakevenLow === null) breakevenLow = payoffCurve[i]!.spotPct;
    if (prev >= 0 && curr < 0) breakevenHigh = payoffCurve[i]!.spotPct;
  }

  return {
    strategy,
    payoffCurve,
    netPremiumPct,
    maxProfitPct: Math.min(Math.max(...values), 50),
    maxLossPct: Math.max(Math.min(...values), -50),
    breakevenLow,
    breakevenHigh,
    currentSpot,
  };
}

export function computeAllPayoffs(currentSpot: number): StrategyPayoff[] {
  return OPTIONS_STRATEGIES.map(strategy => computePayoff(strategy, currentSpot));
}
