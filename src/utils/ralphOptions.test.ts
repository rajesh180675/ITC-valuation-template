import { describe, expect, it } from 'vitest';
import { OPTIONS_STRATEGIES } from '@/data/ralphData';
import { computePayoff } from '@/utils/ralphOptions';

describe('computePayoff', () => {
  it('builds an 81-point curve for every strategy', () => {
    for (const strategy of OPTIONS_STRATEGIES) {
      expect(computePayoff(strategy, 450).payoffCurve).toHaveLength(81);
    }
  });

  it('long straddle has two breakeven points', () => {
    const straddle = OPTIONS_STRATEGIES.find(strategy => strategy.id === 'long_straddle')!;
    const result = computePayoff(straddle, 450);
    expect(result.breakevenLow).not.toBeNull();
    expect(result.breakevenHigh).not.toBeNull();
  });
});
