import { describe, expect, it } from 'vitest';
import { clampInt } from './editor-number';

describe('editor numeric input boundaries', () => {
  it('retains the prior value when input is empty or invalid', () => {
    expect(clampInt('', 12, 1, 20)).toBe(12);
    expect(clampInt('invalid', 12, 1, 20)).toBe(12);
  });

  it('clamps numbers to the caller-provided native range', () => {
    expect(clampInt('999', 12, 1, 20)).toBe(20);
    expect(clampInt('-20', 12, 1, 20)).toBe(1);
    expect(clampInt('190', 168, 1, 200)).toBe(190);
    expect(clampInt('-2000000000', 0, -1_000_000_000, 1_500_000_000)).toBe(-1_000_000_000);
  });
});
