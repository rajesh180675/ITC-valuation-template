import { describe, expect, it } from 'vitest';
import { allocate, type AllocationMethod } from '@/utils/ralphAllocator';

const TEST_IDS = ['itc', 'tcs', 'hdfcbank', 'hul'];

describe('allocate', () => {
  it('weights sum to 1 for all methods', () => {
    const methods: AllocationMethod[] = ['equal', 'risk_parity', 'min_variance', 'max_sharpe', 'quality_tilt'];
    for (const method of methods) {
      const result = allocate(TEST_IDS, method);
      const sum = result.allocations.reduce((total, allocation) => total + allocation.weight, 0);
      expect(sum).toBeCloseTo(1, 3);
    }
  });

  it('equal weight produces a uniform distribution', () => {
    const result = allocate(TEST_IDS, 'equal');
    for (const allocation of result.allocations) {
      expect(allocation.weight).toBeCloseTo(0.25, 3);
    }
  });
});
