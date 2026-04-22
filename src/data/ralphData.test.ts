import { describe, expect, it } from 'vitest';
import { COMPANY_BY_ID, COMPANY_PROFILES } from '@/data/companies';
import { MACRO_SENSITIVITIES } from '@/data/ralphData';

describe('MACRO_SENSITIVITIES integrity', () => {
  it('references only real company ids', () => {
    const unknown = MACRO_SENSITIVITIES
      .map(row => row.companyId)
      .filter(id => !(id in COMPANY_BY_ID));
    expect(unknown).toEqual([]);
  });

  it('has no duplicate company ids', () => {
    const ids = MACRO_SENSITIVITIES.map(row => row.companyId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every company profile so macro overlay has full coverage', () => {
    const sensitivityIds = new Set(MACRO_SENSITIVITIES.map(row => row.companyId));
    const missing = COMPANY_PROFILES.map(c => c.id).filter(id => !sensitivityIds.has(id));
    expect(missing).toEqual([]);
  });
});
