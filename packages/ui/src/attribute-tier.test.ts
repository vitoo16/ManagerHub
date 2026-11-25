import { describe, expect, it } from 'vitest';
import { getAttributeTier, type AttributeTier } from './attribute-tier';

describe('shared FM attribute tiers', () => {
  it('classifies all 20 observed integer attributes without gaps', () => {
    const expected: AttributeTier[] = [
      ...Array<AttributeTier>(6).fill('very-low'),
      ...Array<AttributeTier>(3).fill('low'),
      ...Array<AttributeTier>(2).fill('average'),
      ...Array<AttributeTier>(3).fill('above-average'),
      ...Array<AttributeTier>(2).fill('good'),
      ...Array<AttributeTier>(3).fill('excellent'),
      'maximum'
    ];
    expect(Array.from({ length: 20 }, (_, i) => getAttributeTier(i + 1))).toEqual(expected);
  });

  it('requires explicit zero semantics and never coerces missing data', () => {
    expect(getAttributeTier(0)).toBeUndefined();
    expect(getAttributeTier(0, true)).toBe('very-low');
    for (const value of [null, undefined, '', '20', NaN, Infinity, -1, 1.5, 21, 158]) {
      expect(getAttributeTier(value)).toBeUndefined();
      expect(getAttributeTier(value, true)).toBeUndefined();
    }
  });
});
